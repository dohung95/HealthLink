package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.*;
import com.HealthLink.entity.Medicine;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.PharmacyInventory;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ForbiddenException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.medicine.MedicineRepository;
import com.HealthLink.repository.pharmacy.PharmacyInventoryRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.service.medicine.MedicineCategoryService;
import com.HealthLink.service.pharmacy.PharmacyInventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.util.Set;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PharmacyInventoryServiceImpl implements PharmacyInventoryService {

    private static final int MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
    private static final int MAX_ROWS = 5000;
    private static final int LOW_STOCK_THRESHOLD = 10;

    private static final String[] TEMPLATE_CSV_HEADERS = {
            "medicineId", "medicineName", "strength", "dosageForm", "unit",
            "quantity", "reservedQuantity", "availableQuantity", "expiryDate", "active"
    };

    private final PharmacyInventoryRepository inventoryRepository;
    private final PharmacyRepository pharmacyRepository;
    private final MedicineRepository medicineRepository;
    private final MedicineCategoryService categoryService;

@Override
    @Transactional(readOnly = true)
    public Page<PharmacyInventoryResponse> getInventory(String pharmacyId, String query,
                                                           String dosageForm,
                                                           Boolean lowStock, Boolean active,
                                                           Boolean expiringSoon,
                                                           Integer categoryId,
                                                           int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        String normalizedQuery = normalizeFilter(query);
        String normalizedDosageForm = normalizeFilter(dosageForm);
        boolean lowStockFilter = Boolean.TRUE.equals(lowStock);
        boolean expiringSoonFilter = Boolean.TRUE.equals(expiringSoon);
        LocalDate today = LocalDate.now();
        LocalDate expiryLimit = today.plusDays(30);

        Page<PharmacyInventory> inventoryPage;
        if (categoryId != null) {
            Set<Integer> categoryIds = categoryService.getActiveCategoryAndDescendantIds(categoryId);
            if (categoryIds.isEmpty()) {
                return Page.empty(pageRequest);
            }
            inventoryPage = inventoryRepository.findInventoryByFiltersAndCategoryIds(
                    pharmacyId,
                    normalizedQuery,
                    normalizedDosageForm,
                    active,
                    lowStockFilter,
                    expiringSoonFilter,
                    categoryIds,
                    today,
                    expiryLimit,
                    LOW_STOCK_THRESHOLD,
                    pageRequest);
        } else {
            inventoryPage = inventoryRepository.findInventoryByFilters(
                    pharmacyId,
                    normalizedQuery,
                    normalizedDosageForm,
                    active,
                    lowStockFilter,
                    expiringSoonFilter,
                    today,
                    expiryLimit,
                    LOW_STOCK_THRESHOLD,
                    pageRequest);
        }

        return inventoryPage.map(this::toResponse);
    }

    private String normalizeFilter(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @Override
    @Transactional
    public PharmacyInventoryResponse updateInventory(String pharmacyId, Integer inventoryId,
                                                      PharmacyInventoryUpdateRequest request) {
        PharmacyInventory inventory = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new ResourceNotFoundException("PharmacyInventory", "id", inventoryId));

        if (!inventory.getPharmacy().getPharmacyId().equals(pharmacyId)) {
            throw new ForbiddenException("You do not own this inventory item");
        }

        if (request.getQuantity() != null) {
            if (request.getQuantity() < 0) {
                throw new BadRequestException("Quantity must be >= 0");
            }
            inventory.setQuantity(request.getQuantity());
        }
        if (request.getReservedQuantity() != null) {
            if (request.getReservedQuantity() < 0) {
                throw new BadRequestException("Reserved quantity must be >= 0");
            }
            inventory.setReservedQuantity(request.getReservedQuantity());
        }
        if (request.getUnit() != null) {
            inventory.setUnit(request.getUnit());
        }
        if (request.getExpiryDate() != null) {
            inventory.setExpiryDate(request.getExpiryDate());
        }
        if (request.getActive() != null) {
            inventory.setActive(request.getActive());
        }
        if (request.getMinStockLevel() != null) {
            inventory.setMinStockLevel(request.getMinStockLevel());
        }

        inventory.setUpdatedAt(LocalDateTime.now());
        PharmacyInventory saved = inventoryRepository.save(inventory);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public PharmacyInventoryImportResult importCsv(String pharmacyId, MultipartFile file) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new ResourceNotFoundException("Pharmacy", "id", pharmacyId));

        validateCsvFile(file);

        List<CSVRecord> records = parseCsv(file);

        List<PharmacyInventoryRowError> rowErrors = new ArrayList<>();
        Map<String, ImportRowResult> mergedRows = new LinkedHashMap<>();

        for (int i = 0; i < records.size(); i++) {
            CSVRecord record = records.get(i);
            int rowIndex = i + 1;

            ImportRowResult row = validateAndPrepareRow(record, rowIndex, pharmacy, rowErrors);
            if (row == null) continue;

            String key = pharmacyId + ":" + row.getMedicine().getMedicineId();
            mergedRows.put(key, row);
        }

        return persistAll(mergedRows, rowErrors, pharmacy);
    }

    private void validateCsvFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("CSV file is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("CSV file exceeds maximum size of 5 MB");
        }
    }

    private List<CSVRecord> parseCsv(MultipartFile file) {
        try (InputStreamReader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setTrim(true)
                     .build()
                     .parse(reader)) {
            List<CSVRecord> records = parser.getRecords();
            if (records.size() > MAX_ROWS) {
                throw new BadRequestException("CSV file exceeds maximum of " + MAX_ROWS + " rows");
            }
            return records;
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Failed to parse CSV: " + e.getMessage(), e);
        }
    }

    private ImportRowResult validateAndPrepareRow(CSVRecord record, int rowIndex,
                                                   Pharmacy pharmacy, List<PharmacyInventoryRowError> rowErrors) {
        String medicineIdStr = getCsvValue(record, "medicineId");
        String medicineName = getCsvValue(record, "medicineName");

        Integer medicineId = null;
        if (medicineIdStr != null && !medicineIdStr.isBlank()) {
            try {
                medicineId = Integer.parseInt(medicineIdStr);
            } catch (NumberFormatException e) {
                rowErrors.add(PharmacyInventoryRowError.builder()
                        .rowNumber(rowIndex)
                        .medicineId(null)
                        .medicineName(medicineName)
                        .message("Invalid medicineId: " + medicineIdStr)
                        .build());
                return null;
            }
        }

        String quantityStr = getCsvValue(record, "quantity");
        if (quantityStr == null || quantityStr.isBlank()) {
            rowErrors.add(PharmacyInventoryRowError.builder()
                    .rowNumber(rowIndex)
                    .medicineId(medicineId)
                    .medicineName(medicineName)
                    .message("Quantity is required")
                    .build());
            return null;
        }
        int quantity;
        try {
            quantity = Integer.parseInt(quantityStr);
            if (quantity < 0) {
                throw new NumberFormatException("Negative");
            }
        } catch (NumberFormatException e) {
            rowErrors.add(PharmacyInventoryRowError.builder()
                    .rowNumber(rowIndex)
                    .medicineId(medicineId)
                    .medicineName(medicineName)
                    .message("Invalid quantity: " + quantityStr)
                    .build());
            return null;
        }

        Integer reservedQuantity = null;
        String reservedQuantityStr = getCsvValue(record, "reservedQuantity");
        if (reservedQuantityStr != null && !reservedQuantityStr.isBlank()) {
            try {
                reservedQuantity = Integer.parseInt(reservedQuantityStr);
                if (reservedQuantity < 0) {
                    throw new NumberFormatException("Negative");
                }
            } catch (NumberFormatException e) {
                rowErrors.add(PharmacyInventoryRowError.builder()
                        .rowNumber(rowIndex)
                        .medicineId(medicineId)
                        .medicineName(medicineName)
                        .message("Invalid reservedQuantity: " + reservedQuantityStr)
                        .build());
                return null;
            }
        }

        LocalDate expiryDate = null;
        String expiryDateStr = getCsvValue(record, "expiryDate");
        if (expiryDateStr != null && !expiryDateStr.isBlank()) {
            try {
                expiryDate = LocalDate.parse(expiryDateStr, DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (DateTimeParseException e) {
                rowErrors.add(PharmacyInventoryRowError.builder()
                        .rowNumber(rowIndex)
                        .medicineId(medicineId)
                        .medicineName(medicineName)
                        .message("Invalid expiryDate format (expected yyyy-MM-dd): " + expiryDateStr)
                        .build());
                return null;
            }
        }

        String activeStr = getCsvValue(record, "active");
        boolean active = activeStr == null || activeStr.isBlank() || Boolean.parseBoolean(activeStr);

        String unit = getCsvValue(record, "unit");
        if (unit != null && unit.isBlank()) {
            unit = null;
        }

        Medicine medicine;
        if (medicineId != null) {
            medicine = medicineRepository.findById(medicineId).orElse(null);
            if (medicine == null) {
                rowErrors.add(PharmacyInventoryRowError.builder()
                        .rowNumber(rowIndex)
                        .medicineId(medicineId)
                        .medicineName(medicineName)
                        .message("Medicine not found with id: " + medicineId)
                        .build());
                return null;
            }
        } else if (medicineName != null && !medicineName.isBlank()) {
            List<Medicine> matches = medicineRepository.findByNameContainingIgnoreCase(medicineName);
            if (matches.isEmpty()) {
                rowErrors.add(PharmacyInventoryRowError.builder()
                        .rowNumber(rowIndex)
                        .medicineName(medicineName)
                        .message("No active medicine found with name: " + medicineName)
                        .build());
                return null;
            }
            if (matches.size() > 1) {
                rowErrors.add(PharmacyInventoryRowError.builder()
                        .rowNumber(rowIndex)
                        .medicineName(medicineName)
                        .message("Multiple medicines match name '" + medicineName
                                + "'. Please use medicineId.")
                        .build());
                return null;
            }
            medicine = matches.get(0);
        } else {
            rowErrors.add(PharmacyInventoryRowError.builder()
                    .rowNumber(rowIndex)
                    .message("Either medicineId or medicineName is required")
                    .build());
            return null;
        }

        if (!medicine.isActive()) {
            rowErrors.add(PharmacyInventoryRowError.builder()
                    .rowNumber(rowIndex)
                    .medicineId(medicine.getMedicineId())
                    .medicineName(medicine.getName())
                    .message("Medicine is inactive: " + medicine.getName())
                    .build());
            return null;
        }

        return ImportRowResult.builder()
                .medicine(medicine)
                .quantity(quantity)
                .reservedQuantity(reservedQuantity)
                .unit(unit)
                .expiryDate(expiryDate)
                .active(active)
                .build();
    }

    private PharmacyInventoryImportResult persistAll(Map<String, ImportRowResult> mergedRows,
                                                      List<PharmacyInventoryRowError> rowErrors,
                                                      Pharmacy pharmacy) {
        int importedCount = 0;
        int updatedCount = 0;

        LocalDateTime now = LocalDateTime.now();
        for (ImportRowResult row : mergedRows.values()) {
            Medicine medicine = row.getMedicine();

            java.util.Optional<PharmacyInventory> existingOpt = inventoryRepository
                    .findByPharmacy_PharmacyIdAndMedicine_MedicineId(pharmacy.getPharmacyId(), medicine.getMedicineId());

            if (existingOpt.isPresent()) {
                PharmacyInventory existing = existingOpt.get();
                existing.setQuantity(row.getQuantity());
                if (row.getReservedQuantity() != null) {
                    existing.setReservedQuantity(row.getReservedQuantity());
                }
                if (row.getUnit() != null) {
                    existing.setUnit(row.getUnit());
                }
                existing.setExpiryDate(row.getExpiryDate());
                existing.setActive(row.isActive());
                existing.setLastImportedAt(now);
                existing.setUpdatedAt(now);
                inventoryRepository.save(existing);
                updatedCount++;
            } else {
                PharmacyInventory newInv = PharmacyInventory.builder()
                        .pharmacy(pharmacy)
                        .medicine(medicine)
                        .quantity(row.getQuantity())
                        .reservedQuantity(row.getReservedQuantity() != null ? row.getReservedQuantity() : 0)
                        .unit(row.getUnit() != null ? row.getUnit() : medicine.getUnit())
                        .expiryDate(row.getExpiryDate())
                        .active(row.isActive())
                        .lastImportedAt(now)
                        .build();
                inventoryRepository.save(newInv);
                importedCount++;
            }
        }

        return PharmacyInventoryImportResult.builder()
                .importedCount(importedCount)
                .updatedCount(updatedCount)
                .skippedCount(rowErrors.size())
                .rowErrors(rowErrors)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateCsvTemplate(String pharmacyId) {
        List<Medicine> medicines = medicineRepository.findByActiveTrueOrderByMedicineIdAsc();
        Map<Integer, PharmacyInventory> inventoryByMedicineId = inventoryRepository.findByPharmacy_PharmacyId(pharmacyId)
                .stream()
                .filter(inv -> inv.getMedicine() != null && inv.getMedicine().getMedicineId() != null)
                .collect(Collectors.toMap(
                        inv -> inv.getMedicine().getMedicineId(),
                        inv -> inv,
                        (existing, replacement) -> existing,
                        LinkedHashMap::new));

        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             OutputStreamWriter writer = new OutputStreamWriter(out, StandardCharsets.UTF_8);
             CSVPrinter printer = new CSVPrinter(writer, CSVFormat.DEFAULT.builder()
                     .setHeader(TEMPLATE_CSV_HEADERS)
                     .build())) {

            for (Medicine medicine : medicines) {
                PharmacyInventory inventory = inventoryByMedicineId.get(medicine.getMedicineId());
                if (inventory == null) {
                    printer.printRecord(
                            medicine.getMedicineId(),
                            medicine.getName(),
                            medicine.getStrength(),
                            medicine.getDosageForm(),
                            medicine.getUnit() != null ? medicine.getUnit() : "",
                            0,
                            0,
                            0,
                            "",
                            "false");
                    continue;
                }

                int quantity = inventory.getQuantity() != null ? inventory.getQuantity() : 0;
                int reservedQuantity = inventory.getReservedQuantity() != null ? inventory.getReservedQuantity() : 0;
                printer.printRecord(
                        medicine.getMedicineId(),
                        medicine.getName(),
                        medicine.getStrength(),
                        medicine.getDosageForm(),
                        medicine.getUnit() != null ? medicine.getUnit() : "",
                        quantity,
                        reservedQuantity,
                        quantity - reservedQuantity,
                        formatDate(inventory.getExpiryDate()),
                        String.valueOf(Boolean.TRUE.equals(inventory.getActive())));
            }

            printer.flush();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate CSV template", e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PharmacyInventoryResponse getInventoryItem(String pharmacyId, Integer inventoryId) {
        PharmacyInventory inventory = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new ResourceNotFoundException("PharmacyInventory", "id", inventoryId));
        if (!inventory.getPharmacy().getPharmacyId().equals(pharmacyId)) {
            throw new ForbiddenException("You do not own this inventory item");
        }
        return toResponse(inventory);
    }

    private String getCsvValue(CSVRecord record, String header) {
        return record.isMapped(header) ? record.get(header) : null;
    }

    private String formatDecimal(BigDecimal value) {
        return value == null ? "" : value.toPlainString();
    }

    private String formatDate(LocalDate value) {
        return value == null ? "" : value.toString();
    }

    private PharmacyInventoryResponse toResponse(PharmacyInventory inv) {
        return PharmacyInventoryResponse.builder()
                .inventoryId(inv.getInventoryId())
                .pharmacyId(inv.getPharmacy().getPharmacyId())
                .pharmacyName(inv.getPharmacy().getName())
                .medicineId(inv.getMedicine().getMedicineId())
                .medicineName(inv.getMedicine().getName())
                .genericName(inv.getMedicine().getGenericName())
                .dosageForm(inv.getMedicine().getDosageForm())
                .strength(inv.getMedicine().getStrength())
                .unit(inv.getUnit())
                .quantity(inv.getQuantity())
                .reservedQuantity(inv.getReservedQuantity())
                .availableQuantity(inv.getAvailableQuantity())
                .expiryDate(inv.getExpiryDate())
                .active(inv.getActive())
                .minStockLevel(inv.getMinStockLevel())
                .expiringSoon(computeExpiringSoon(inv))
                .lastImportedAt(inv.getLastImportedAt())
                .createdAt(inv.getCreatedAt())
                .updatedAt(inv.getUpdatedAt())
                .build();
    }

    private boolean computeExpiringSoon(PharmacyInventory inv) {
        if (inv.getExpiryDate() == null) return false;
        LocalDate today = LocalDate.now();
        return !inv.getExpiryDate().isBefore(today) && inv.getExpiryDate().isBefore(today.plusDays(30));
    }

    @lombok.Builder
    @lombok.Data
    private static class ImportRowResult {
        private Medicine medicine;
        private int quantity;
        private Integer reservedQuantity;
        private String unit;
        private LocalDate expiryDate;
        private boolean active;
    }
}
