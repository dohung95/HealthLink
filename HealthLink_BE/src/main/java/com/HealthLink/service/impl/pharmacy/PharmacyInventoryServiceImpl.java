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
            "quantity", "reservedQuantity", "availableQuantity", "unitPrice", "expiryDate", "active"
    };

    private final PharmacyInventoryRepository inventoryRepository;
    private final PharmacyRepository pharmacyRepository;
    private final MedicineRepository medicineRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<PharmacyInventoryResponse> getInventory(String pharmacyId, String query,
                                                         Boolean lowStock, Boolean active,
                                                         int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<PharmacyInventory> inventoryPage;

        if (query != null && !query.isBlank()) {
            inventoryPage = inventoryRepository.searchByPharmacyId(pharmacyId, query, pageRequest);
        } else if (Boolean.TRUE.equals(lowStock)) {
            inventoryPage = inventoryRepository.findLowStockByPharmacyId(pharmacyId, LOW_STOCK_THRESHOLD, pageRequest);
        } else if (Boolean.TRUE.equals(active)) {
            inventoryPage = inventoryRepository.findByPharmacyIdAndActive(pharmacyId, true, pageRequest);
        } else if (Boolean.FALSE.equals(active)) {
            inventoryPage = inventoryRepository.findByPharmacyIdAndActive(pharmacyId, false, pageRequest);
        } else {
            inventoryPage = inventoryRepository.findByPharmacy_PharmacyId(pharmacyId, pageRequest);
        }

        return inventoryPage.map(this::toResponse);
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
        if (request.getUnitPrice() != null) {
            inventory.setUnitPrice(request.getUnitPrice());
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

        inventory.setUpdatedAt(LocalDateTime.now());
        PharmacyInventory saved = inventoryRepository.save(inventory);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public PharmacyInventoryImportResult importCsv(String pharmacyId, MultipartFile file) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new ResourceNotFoundException("Pharmacy", "id", pharmacyId));

        if (file.isEmpty()) {
            throw new BadRequestException("CSV file is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("CSV file exceeds maximum size of 5 MB");
        }

        List<PharmacyInventoryRowError> rowErrors = new ArrayList<>();
        Map<String, ProcessedRow> mergedRows = new LinkedHashMap<>();
        int totalRows = 0;

        try (InputStreamReader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setTrim(true)
                     .build()
                     .parse(reader)) {

            for (CSVRecord record : parser) {
                totalRows++;
                if (totalRows > MAX_ROWS) {
                    rowErrors.add(PharmacyInventoryRowError.builder()
                            .rowNumber(totalRows)
                            .message("Row exceeds maximum of " + MAX_ROWS + " rows")
                            .build());
                    break;
                }

                String medicineIdStr = getCsvValue(record, "medicineId");
                String medicineName = getCsvValue(record, "medicineName");

                Integer medicineId = null;
                if (medicineIdStr != null && !medicineIdStr.isBlank()) {
                    try {
                        medicineId = Integer.parseInt(medicineIdStr);
                    } catch (NumberFormatException e) {
                        rowErrors.add(PharmacyInventoryRowError.builder()
                                .rowNumber(totalRows)
                                .medicineId(null)
                                .medicineName(medicineName)
                                .message("Invalid medicineId: " + medicineIdStr)
                                .build());
                        continue;
                    }
                }

                String quantityStr = getCsvValue(record, "quantity");
                if (quantityStr == null || quantityStr.isBlank()) {
                    rowErrors.add(PharmacyInventoryRowError.builder()
                            .rowNumber(totalRows)
                            .medicineId(medicineId)
                            .medicineName(medicineName)
                            .message("Quantity is required")
                            .build());
                    continue;
                }
                int quantity;
                try {
                    quantity = Integer.parseInt(quantityStr);
                    if (quantity < 0) {
                        throw new NumberFormatException("Negative");
                    }
                } catch (NumberFormatException e) {
                    rowErrors.add(PharmacyInventoryRowError.builder()
                            .rowNumber(totalRows)
                            .medicineId(medicineId)
                            .medicineName(medicineName)
                            .message("Invalid quantity: " + quantityStr)
                            .build());
                    continue;
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
                                .rowNumber(totalRows)
                                .medicineId(medicineId)
                                .medicineName(medicineName)
                                .message("Invalid reservedQuantity: " + reservedQuantityStr)
                                .build());
                        continue;
                    }
                }

                String unitPriceStr = getCsvValue(record, "unitPrice");
                BigDecimal unitPrice = null;
                if (unitPriceStr != null && !unitPriceStr.isBlank()) {
                    try {
                        unitPrice = new BigDecimal(unitPriceStr);
                        if (unitPrice.compareTo(BigDecimal.ZERO) < 0) {
                            throw new NumberFormatException("Negative");
                        }
                    } catch (NumberFormatException e) {
                        rowErrors.add(PharmacyInventoryRowError.builder()
                                .rowNumber(totalRows)
                                .medicineId(medicineId)
                                .medicineName(medicineName)
                                .message("Invalid unitPrice: " + unitPriceStr)
                                .build());
                        continue;
                    }
                }

                LocalDate expiryDate = null;
                String expiryDateStr = getCsvValue(record, "expiryDate");
                if (expiryDateStr != null && !expiryDateStr.isBlank()) {
                    try {
                        expiryDate = LocalDate.parse(expiryDateStr, DateTimeFormatter.ISO_LOCAL_DATE);
                    } catch (DateTimeParseException e) {
                        rowErrors.add(PharmacyInventoryRowError.builder()
                                .rowNumber(totalRows)
                                .medicineId(medicineId)
                                .medicineName(medicineName)
                                .message("Invalid expiryDate format (expected yyyy-MM-dd): " + expiryDateStr)
                                .build());
                        continue;
                    }
                }

                String activeStr = getCsvValue(record, "active");
                boolean active = activeStr == null || activeStr.isBlank() || Boolean.parseBoolean(activeStr);

                String unit = getCsvValue(record, "unit");
                if (unit != null && unit.isBlank()) {
                    unit = null;
                }

                // Determine medicine
                Medicine medicine = null;
                if (medicineId != null) {
                    medicine = medicineRepository.findById(medicineId).orElse(null);
                    if (medicine == null) {
                        rowErrors.add(PharmacyInventoryRowError.builder()
                                .rowNumber(totalRows)
                                .medicineId(medicineId)
                                .medicineName(medicineName)
                                .message("Medicine not found with id: " + medicineId)
                                .build());
                        continue;
                    }
                } else if (medicineName != null && !medicineName.isBlank()) {
                    List<Medicine> matches = medicineRepository.findByNameContainingIgnoreCase(medicineName);
                    if (matches.isEmpty()) {
                        rowErrors.add(PharmacyInventoryRowError.builder()
                                .rowNumber(totalRows)
                                .medicineName(medicineName)
                                .message("No active medicine found with name: " + medicineName)
                                .build());
                        continue;
                    }
                    if (matches.size() > 1) {
                        rowErrors.add(PharmacyInventoryRowError.builder()
                                .rowNumber(totalRows)
                                .medicineName(medicineName)
                                .message("Multiple medicines match name '" + medicineName
                                        + "'. Please use medicineId.")
                                .build());
                        continue;
                    }
                    medicine = matches.get(0);
                } else {
                    rowErrors.add(PharmacyInventoryRowError.builder()
                            .rowNumber(totalRows)
                            .message("Either medicineId or medicineName is required")
                            .build());
                    continue;
                }

                if (!medicine.isActive()) {
                    rowErrors.add(PharmacyInventoryRowError.builder()
                            .rowNumber(totalRows)
                            .medicineId(medicine.getMedicineId())
                            .medicineName(medicine.getName())
                            .message("Medicine is inactive: " + medicine.getName())
                            .build());
                    continue;
                }

                if (unitPrice == null) {
                    unitPrice = medicine.getPrice() != null ? medicine.getPrice() : BigDecimal.ZERO;
                }

                // Merge duplicate medicine rows (last wins)
                String key = pharmacyId + ":" + medicine.getMedicineId();
                ProcessedRow processed = ProcessedRow.builder()
                        .medicine(medicine)
                        .quantity(quantity)
                        .reservedQuantity(reservedQuantity)
                        .unitPrice(unitPrice)
                        .unit(unit)
                        .expiryDate(expiryDate)
                        .active(active)
                        .build();

                mergedRows.put(key, processed);
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Failed to parse CSV: " + e.getMessage(), e);
        }

        int importedCount = 0;
        int updatedCount = 0;

        LocalDateTime now = LocalDateTime.now();
        for (Map.Entry<String, ProcessedRow> entry : mergedRows.entrySet()) {
            ProcessedRow row = entry.getValue();
            Medicine medicine = row.getMedicine();

            java.util.Optional<PharmacyInventory> existingOpt = inventoryRepository
                    .findByPharmacy_PharmacyIdAndMedicine_MedicineId(pharmacyId, medicine.getMedicineId());

            if (existingOpt.isPresent()) {
                PharmacyInventory existing = existingOpt.get();
                existing.setQuantity(row.getQuantity());
                if (row.getReservedQuantity() != null) {
                    existing.setReservedQuantity(row.getReservedQuantity());
                }
                existing.setUnitPrice(row.getUnitPrice());
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
                        .unitPrice(row.getUnitPrice())
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
                            "0",
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
                        formatDecimal(inventory.getUnitPrice()),
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
                .unitPrice(inv.getUnitPrice())
                .expiryDate(inv.getExpiryDate())
                .active(inv.getActive())
                .lastImportedAt(inv.getLastImportedAt())
                .createdAt(inv.getCreatedAt())
                .updatedAt(inv.getUpdatedAt())
                .build();
    }

    @lombok.Builder
    @lombok.Data
    private static class ProcessedRow {
        private Medicine medicine;
        private int quantity;
        private Integer reservedQuantity;
        private BigDecimal unitPrice;
        private String unit;
        private LocalDate expiryDate;
        private boolean active;
    }
}
