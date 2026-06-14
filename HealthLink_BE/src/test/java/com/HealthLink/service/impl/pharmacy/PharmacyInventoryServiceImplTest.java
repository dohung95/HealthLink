package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyInventoryImportResult;
import com.HealthLink.dto.pharmacy.PharmacyInventoryRowError;
import com.HealthLink.dto.pharmacy.PharmacyInventoryUpdateRequest;
import com.HealthLink.entity.Medicine;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.PharmacyInventory;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ForbiddenException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.medicine.MedicineRepository;
import com.HealthLink.repository.pharmacy.PharmacyInventoryRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.StringReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PharmacyInventoryServiceImplTest {

    @Mock
    private PharmacyInventoryRepository inventoryRepository;

    @Mock
    private PharmacyRepository pharmacyRepository;

    @Mock
    private MedicineRepository medicineRepository;

    @InjectMocks
    private PharmacyInventoryServiceImpl inventoryService;

    @Test
    void getInventory_listAll() {
        when(inventoryRepository.findByPharmacy_PharmacyId(eq("pharmacy-1"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(createInventory(1, "Paracetamol 500mg", 100))));

        Page<com.HealthLink.dto.pharmacy.PharmacyInventoryResponse> result =
                inventoryService.getInventory("pharmacy-1", null, null, null, 0, 10);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getMedicineName()).isEqualTo("Paracetamol 500mg");
    }

    @Test
    void getInventory_searchByQuery() {
        when(inventoryRepository.searchByPharmacyId(eq("pharmacy-1"), eq("paracetamol"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        Page<com.HealthLink.dto.pharmacy.PharmacyInventoryResponse> result =
                inventoryService.getInventory("pharmacy-1", "paracetamol", null, null, 0, 10);

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void getInventory_filterLowStock() {
        when(inventoryRepository.findLowStockByPharmacyId(eq("pharmacy-1"), eq(10), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(createInventory(1, "Low Stock Med", 3))));

        Page<com.HealthLink.dto.pharmacy.PharmacyInventoryResponse> result =
                inventoryService.getInventory("pharmacy-1", null, true, null, 0, 10);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getQuantity()).isEqualTo(3);
    }

    @Test
    void getInventory_filterActiveTrue() {
        when(inventoryRepository.findByPharmacyIdAndActive(eq("pharmacy-1"), eq(true), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        inventoryService.getInventory("pharmacy-1", null, null, true, 0, 10);
    }

    @Test
    void getInventory_filterActiveFalse() {
        when(inventoryRepository.findByPharmacyIdAndActive(eq("pharmacy-1"), eq(false), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        inventoryService.getInventory("pharmacy-1", null, null, false, 0, 10);
    }

    @Test
    void getInventoryItem_foundAndOwned() {
        PharmacyInventory inv = createInventory(1, "Test Med", 50);
        when(inventoryRepository.findById(1)).thenReturn(Optional.of(inv));

        var response = inventoryService.getInventoryItem("pharmacy-1", 1);

        assertThat(response.getMedicineName()).isEqualTo("Test Med");
        assertThat(response.getQuantity()).isEqualTo(50);
    }

    @Test
    void getInventoryItem_foundNotOwned() {
        PharmacyInventory inv = createInventory(1, "Test Med", 50);
        when(inventoryRepository.findById(1)).thenReturn(Optional.of(inv));

        assertThatThrownBy(() -> inventoryService.getInventoryItem("pharmacy-2", 1))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void getInventoryItem_notFound() {
        when(inventoryRepository.findById(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inventoryService.getInventoryItem("pharmacy-1", 99))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateInventory_success() {
        PharmacyInventory inv = createInventory(1, "Test Med", 100);
        when(inventoryRepository.findById(1)).thenReturn(Optional.of(inv));
        when(inventoryRepository.save(any(PharmacyInventory.class))).thenAnswer(a -> a.getArgument(0));

        PharmacyInventoryUpdateRequest request = new PharmacyInventoryUpdateRequest();
        request.setQuantity(80);
        request.setReservedQuantity(5);
        request.setUnitPrice(new BigDecimal("1.50"));
        request.setUnit("bottle");
        request.setExpiryDate(LocalDate.of(2027, 12, 31));
        request.setActive(false);

        var response = inventoryService.updateInventory("pharmacy-1", 1, request);

        assertThat(response.getQuantity()).isEqualTo(80);
        assertThat(response.getReservedQuantity()).isEqualTo(5);
        assertThat(response.getUnitPrice()).isEqualByComparingTo("1.50");
        assertThat(response.getUnit()).isEqualTo("bottle");
        assertThat(response.getActive()).isFalse();
    }

    @Test
    void updateInventory_negativeQuantity() {
        PharmacyInventory inv = createInventory(1, "Test Med", 100);
        when(inventoryRepository.findById(1)).thenReturn(Optional.of(inv));

        PharmacyInventoryUpdateRequest request = new PharmacyInventoryUpdateRequest();
        request.setQuantity(-1);

        assertThatThrownBy(() -> inventoryService.updateInventory("pharmacy-1", 1, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Quantity must be >= 0");
    }

    @Test
    void updateInventory_negativeReservedQuantity() {
        PharmacyInventory inv = createInventory(1, "Test Med", 100);
        when(inventoryRepository.findById(1)).thenReturn(Optional.of(inv));

        PharmacyInventoryUpdateRequest request = new PharmacyInventoryUpdateRequest();
        request.setReservedQuantity(-1);

        assertThatThrownBy(() -> inventoryService.updateInventory("pharmacy-1", 1, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Reserved quantity must be >= 0");
    }

    @Test
    void updateInventory_notOwned() {
        PharmacyInventory inv = createInventory(1, "Test Med", 100);
        when(inventoryRepository.findById(1)).thenReturn(Optional.of(inv));

        PharmacyInventoryUpdateRequest request = new PharmacyInventoryUpdateRequest();

        assertThatThrownBy(() -> inventoryService.updateInventory("pharmacy-2", 1, request))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void updateInventory_notFound() {
        when(inventoryRepository.findById(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inventoryService.updateInventory("pharmacy-1", 99, new PharmacyInventoryUpdateRequest()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void importCsv_newItems() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,unitPrice,unit,expiryDate,active\n" +
                     "1,Paracetamol 500mg,500mg,Tablet,120,0.50,tablet,2027-12-31,true\n" +
                     "2,Amoxicillin 250mg,250mg,Capsule,80,0.75,capsule,2026-06-30,true\n";

        Pharmacy pharmacy = Pharmacy.builder().pharmacyId("pharmacy-1").name("Central Pharmacy").build();
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));

        Medicine med1 = Medicine.builder().medicineId(1).name("Paracetamol 500mg").price(new BigDecimal("0.50")).unit("tablet").active(true).build();
        Medicine med2 = Medicine.builder().medicineId(2).name("Amoxicillin 250mg").price(new BigDecimal("0.75")).unit("capsule").active(true).build();
        when(medicineRepository.findById(1)).thenReturn(Optional.of(med1));
        when(medicineRepository.findById(2)).thenReturn(Optional.of(med2));
        when(inventoryRepository.findByPharmacy_PharmacyIdAndMedicine_MedicineId(anyString(), anyInt()))
                .thenReturn(Optional.empty());

        MultipartFile file = mockCsvFile(csv);
        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", file);

        assertThat(result.getImportedCount()).isEqualTo(2);
        assertThat(result.getUpdatedCount()).isEqualTo(0);
        assertThat(result.getSkippedCount()).isEqualTo(0);
    }

    @Test
    void importCsv_existingItems() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,unitPrice,unit,expiryDate,active\n" +
                     "1,Paracetamol 500mg,500mg,Tablet,200,0.60,tablet,2028-01-01,true\n";

        Pharmacy pharmacy = Pharmacy.builder().pharmacyId("pharmacy-1").name("Central Pharmacy").build();
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));

        Medicine med1 = Medicine.builder().medicineId(1).name("Paracetamol 500mg").price(new BigDecimal("0.50")).unit("tablet").active(true).build();
        when(medicineRepository.findById(1)).thenReturn(Optional.of(med1));

        PharmacyInventory existing = createInventory(1, "Paracetamol 500mg", 100);
        when(inventoryRepository.findByPharmacy_PharmacyIdAndMedicine_MedicineId("pharmacy-1", 1))
                .thenReturn(Optional.of(existing));

        MultipartFile file = mockCsvFile(csv);
        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", file);

        assertThat(result.getImportedCount()).isEqualTo(0);
        assertThat(result.getUpdatedCount()).isEqualTo(1);
        assertThat(result.getSkippedCount()).isEqualTo(0);
    }

    @Test
    void importCsv_duplicateMedicineRowsMerged() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,unitPrice,unit,expiryDate,active\n" +
                     "1,Paracetamol 500mg,500mg,Tablet,100,0.50,tablet,2027-12-31,true\n" +
                     "1,Paracetamol 500mg,500mg,Tablet,250,0.55,tablet,2028-06-30,true\n";

        Pharmacy pharmacy = Pharmacy.builder().pharmacyId("pharmacy-1").name("Central Pharmacy").build();
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));

        Medicine med1 = Medicine.builder().medicineId(1).name("Paracetamol 500mg").price(new BigDecimal("0.50")).unit("tablet").active(true).build();
        when(medicineRepository.findById(1)).thenReturn(Optional.of(med1));
        when(inventoryRepository.findByPharmacy_PharmacyIdAndMedicine_MedicineId(anyString(), anyInt()))
                .thenReturn(Optional.empty());

        MultipartFile file = mockCsvFile(csv);
        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", file);

        assertThat(result.getImportedCount()).isEqualTo(1);
        assertThat(result.getSkippedCount()).isEqualTo(0);
    }

    @Test
    void importCsv_invalidMedicineId() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,unitPrice,unit,expiryDate,active\n" +
                     "abc,Test Med,500mg,Tablet,100,0.50,tablet,2027-12-31,true\n";

        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(Pharmacy.builder().pharmacyId("pharmacy-1").build()));

        MultipartFile file = mockCsvFile(csv);
        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", file);

        assertThat(result.getSkippedCount()).isEqualTo(1);
        assertThat(result.getRowErrors()).anyMatch(e -> e.getMessage().contains("Invalid medicineId"));
    }

    @Test
    void importCsv_medicineIdNotFound() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,unitPrice,unit,expiryDate,active\n" +
                     "999,Unknown Med,500mg,Tablet,100,0.50,tablet,2027-12-31,true\n";

        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(Pharmacy.builder().pharmacyId("pharmacy-1").build()));
        when(medicineRepository.findById(999)).thenReturn(Optional.empty());

        MultipartFile file = mockCsvFile(csv);
        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", file);

        assertThat(result.getSkippedCount()).isEqualTo(1);
        assertThat(result.getRowErrors()).anyMatch(e -> e.getMessage().contains("Medicine not found"));
    }

    @Test
    void importCsv_medicineNameMultipleMatches() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,unitPrice,unit,expiryDate,active\n" +
                     ",Para,500mg,Tablet,100,0.50,tablet,2027-12-31,true\n";

        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(Pharmacy.builder().pharmacyId("pharmacy-1").build()));
        Medicine med1 = Medicine.builder().medicineId(1).name("Paracetamol 500mg").active(true).build();
        Medicine med2 = Medicine.builder().medicineId(2).name("Paracetamol 250mg").active(true).build();
        when(medicineRepository.findByNameContainingIgnoreCase("Para")).thenReturn(List.of(med1, med2));

        MultipartFile file = mockCsvFile(csv);
        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", file);

        assertThat(result.getSkippedCount()).isEqualTo(1);
        assertThat(result.getRowErrors()).anyMatch(e -> e.getMessage().contains("Multiple medicines match"));
    }

    @Test
    void importCsv_noMedicineIdOrName() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,unitPrice,unit,expiryDate,active\n" +
                     ",,500mg,Tablet,100,0.50,tablet,2027-12-31,true\n";

        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(Pharmacy.builder().pharmacyId("pharmacy-1").build()));

        MultipartFile file = mockCsvFile(csv);
        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", file);

        assertThat(result.getSkippedCount()).isEqualTo(1);
        assertThat(result.getRowErrors()).anyMatch(e -> e.getMessage().contains("Either medicineId or medicineName is required"));
    }

    @Test
    void importCsv_invalidQuantity() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,unitPrice,unit,expiryDate,active\n" +
                     "1,Paracetamol 500mg,500mg,Tablet,abc,0.50,tablet,2027-12-31,true\n";

        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(Pharmacy.builder().pharmacyId("pharmacy-1").build()));

        MultipartFile file = mockCsvFile(csv);
        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", file);

        assertThat(result.getSkippedCount()).isEqualTo(1);
        assertThat(result.getRowErrors()).anyMatch(e -> e.getMessage().contains("Invalid quantity"));
    }

    @Test
    void importCsv_negativeQuantity() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,unitPrice,unit,expiryDate,active\n" +
                     "1,Paracetamol 500mg,500mg,Tablet,-5,0.50,tablet,2027-12-31,true\n";

        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(Pharmacy.builder().pharmacyId("pharmacy-1").build()));

        MultipartFile file = mockCsvFile(csv);
        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", file);

        assertThat(result.getSkippedCount()).isEqualTo(1);
        assertThat(result.getRowErrors()).anyMatch(e -> e.getMessage().contains("Invalid quantity"));
    }

    @Test
    void importCsv_missingQuantity() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,unitPrice,unit,expiryDate,active\n" +
                     "1,Paracetamol 500mg,500mg,Tablet,,0.50,tablet,2027-12-31,true\n";

        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(Pharmacy.builder().pharmacyId("pharmacy-1").build()));

        MultipartFile file = mockCsvFile(csv);
        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", file);

        assertThat(result.getSkippedCount()).isEqualTo(1);
        assertThat(result.getRowErrors()).anyMatch(e -> e.getMessage().contains("Quantity is required"));
    }

    @Test
    void importCsv_invalidUnitPrice() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,unitPrice,unit,expiryDate,active\n" +
                     "1,Paracetamol 500mg,500mg,Tablet,100,abc,tablet,2027-12-31,true\n";

        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(Pharmacy.builder().pharmacyId("pharmacy-1").build()));

        MultipartFile file = mockCsvFile(csv);
        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", file);

        assertThat(result.getSkippedCount()).isEqualTo(1);
        assertThat(result.getRowErrors()).anyMatch(e -> e.getMessage().contains("Invalid unitPrice"));
    }

    @Test
    void importCsv_negativeUnitPrice() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,unitPrice,unit,expiryDate,active\n" +
                     "1,Paracetamol 500mg,500mg,Tablet,100,-0.50,tablet,2027-12-31,true\n";

        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(Pharmacy.builder().pharmacyId("pharmacy-1").build()));

        MultipartFile file = mockCsvFile(csv);
        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", file);

        assertThat(result.getSkippedCount()).isEqualTo(1);
        assertThat(result.getRowErrors()).anyMatch(e -> e.getMessage().contains("Invalid unitPrice"));
    }

    @Test
    void importCsv_invalidExpiryDate() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,unitPrice,unit,expiryDate,active\n" +
                     "1,Paracetamol 500mg,500mg,Tablet,100,0.50,tablet,not-a-date,true\n";

        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(Pharmacy.builder().pharmacyId("pharmacy-1").build()));

        MultipartFile file = mockCsvFile(csv);
        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", file);

        assertThat(result.getSkippedCount()).isEqualTo(1);
        assertThat(result.getRowErrors()).anyMatch(e -> e.getMessage().contains("Invalid expiryDate format"));
    }

    @Test
    void importCsv_emptyFile() throws Exception {
        Pharmacy pharmacy = Pharmacy.builder().pharmacyId("pharmacy-1").name("Central Pharmacy").build();
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));

        MultipartFile file = org.mockito.Mockito.mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(true);

        assertThatThrownBy(() -> inventoryService.importCsv("pharmacy-1", file))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("CSV file is empty");
    }

    @Test
    void importCsv_fileExceedsMaxSize() throws Exception {
        Pharmacy pharmacy = Pharmacy.builder().pharmacyId("pharmacy-1").name("Central Pharmacy").build();
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));

        MultipartFile file = org.mockito.Mockito.mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(6L * 1024 * 1024);

        assertThatThrownBy(() -> inventoryService.importCsv("pharmacy-1", file))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("CSV file exceeds maximum size of 5 MB");
    }

    @Test
    void importCsv_inactiveMedicine() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,unitPrice,unit,expiryDate,active\n" +
                     "1,Archived Med,500mg,Tablet,100,0.50,tablet,2027-12-31,true\n";

        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(Pharmacy.builder().pharmacyId("pharmacy-1").build()));
        Medicine med = Medicine.builder().medicineId(1).name("Archived Med").active(false).build();
        when(medicineRepository.findById(1)).thenReturn(Optional.of(med));

        MultipartFile file = mockCsvFile(csv);
        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", file);

        assertThat(result.getSkippedCount()).isEqualTo(1);
        assertThat(result.getRowErrors()).anyMatch(e -> e.getMessage().contains("Medicine is inactive"));
    }

    @Test
    void importCsv_usesMedicinePriceWhenUnitPriceEmpty() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,unitPrice,unit,expiryDate,active\n" +
                     "1,Paracetamol 500mg,500mg,Tablet,100,,tablet,2027-12-31,true\n";

        Pharmacy pharmacy = Pharmacy.builder().pharmacyId("pharmacy-1").name("Central Pharmacy").build();
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));

        Medicine med = Medicine.builder().medicineId(1).name("Paracetamol 500mg").price(new BigDecimal("1.25")).unit("tablet").active(true).build();
        when(medicineRepository.findById(1)).thenReturn(Optional.of(med));
        when(inventoryRepository.findByPharmacy_PharmacyIdAndMedicine_MedicineId(anyString(), anyInt()))
                .thenReturn(Optional.empty());

        MultipartFile file = mockCsvFile(csv);
        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", file);

        assertThat(result.getImportedCount()).isEqualTo(1);
        assertThat(result.getSkippedCount()).isEqualTo(0);

        ArgumentCaptor<PharmacyInventory> captor = ArgumentCaptor.forClass(PharmacyInventory.class);
        verify(inventoryRepository).save(captor.capture());
        assertThat(captor.getValue().getUnitPrice()).isEqualByComparingTo("1.25");
    }

    @Test
    void importCsv_usesMedicineUnitWhenUnitEmpty() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,unitPrice,unit,expiryDate,active\n" +
                     "1,Paracetamol 500mg,500mg,Tablet,100,0.50,,2027-12-31,true\n";

        Pharmacy pharmacy = Pharmacy.builder().pharmacyId("pharmacy-1").name("Central Pharmacy").build();
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));

        Medicine med = Medicine.builder().medicineId(1).name("Paracetamol 500mg").price(new BigDecimal("0.50")).unit("tablet").active(true).build();
        when(medicineRepository.findById(1)).thenReturn(Optional.of(med));
        when(inventoryRepository.findByPharmacy_PharmacyIdAndMedicine_MedicineId(anyString(), anyInt()))
                .thenReturn(Optional.empty());

        MultipartFile file = mockCsvFile(csv);
        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", file);

        assertThat(result.getImportedCount()).isEqualTo(1);
        assertThat(result.getSkippedCount()).isEqualTo(0);

        ArgumentCaptor<PharmacyInventory> captor = ArgumentCaptor.forClass(PharmacyInventory.class);
        verify(inventoryRepository).save(captor.capture());
        assertThat(captor.getValue().getUnit()).isEqualTo("tablet");
    }

    @Test
    void generateCsvTemplate_returnsNonEmpty() {
        when(medicineRepository.findByActiveTrueOrderByMedicineIdAsc()).thenReturn(List.of());
        when(inventoryRepository.findByPharmacy_PharmacyId("pharmacy-1")).thenReturn(List.of());

        byte[] template = inventoryService.generateCsvTemplate("pharmacy-1");

        assertThat(template).isNotEmpty();
    }

    @Test
    void generateCsvTemplate_containsHeaders() {
        when(medicineRepository.findByActiveTrueOrderByMedicineIdAsc()).thenReturn(List.of());
        when(inventoryRepository.findByPharmacy_PharmacyId("pharmacy-1")).thenReturn(List.of());

        byte[] template = inventoryService.generateCsvTemplate("pharmacy-1");
        String content = new String(template, StandardCharsets.UTF_8);
        assertThat(content).startsWith("medicineId,medicineName,strength,dosageForm,unit,quantity,reservedQuantity,availableQuantity,unitPrice,expiryDate,active");
    }

    @Test
    void generateCsvTemplate_mergesActiveMedicinesWithCurrentInventory() throws Exception {
        Medicine existingMedicine = Medicine.builder()
                .medicineId(1)
                .name("Paracetamol 500mg")
                .strength("500mg")
                .dosageForm("Tablet")
                .unit("Tablet")
                .active(true)
                .build();
        Medicine newMedicine = Medicine.builder()
                .medicineId(2)
                .name("Amoxicillin 500mg")
                .strength("500mg")
                .dosageForm("Capsule")
                .unit("Capsule")
                .active(true)
                .build();

        PharmacyInventory inventory = createInventory(1, "Paracetamol 500mg", 25);
        inventory.setMedicine(existingMedicine);
        inventory.setReservedQuantity(5);
        inventory.setUnitPrice(new BigDecimal("1.20"));
        inventory.setExpiryDate(LocalDate.of(2027, 1, 31));
        inventory.setActive(true);

        when(medicineRepository.findByActiveTrueOrderByMedicineIdAsc()).thenReturn(List.of(existingMedicine, newMedicine));
        when(inventoryRepository.findByPharmacy_PharmacyId("pharmacy-1")).thenReturn(List.of(inventory));

        List<CSVRecord> records = parseCsv(inventoryService.generateCsvTemplate("pharmacy-1"));

        assertThat(records).hasSize(2);
        CSVRecord existingRow = records.get(0);
        assertThat(existingRow.get("medicineId")).isEqualTo("1");
        assertThat(existingRow.get("unit")).isEqualTo("Tablet");
        assertThat(existingRow.get("quantity")).isEqualTo("25");
        assertThat(existingRow.get("reservedQuantity")).isEqualTo("5");
        assertThat(existingRow.get("availableQuantity")).isEqualTo("20");
        assertThat(existingRow.get("unitPrice")).isEqualTo("1.20");
        assertThat(existingRow.get("expiryDate")).isEqualTo("2027-01-31");
        assertThat(existingRow.get("active")).isEqualTo("true");

        CSVRecord defaultRow = records.get(1);
        assertThat(defaultRow.get("medicineId")).isEqualTo("2");
        assertThat(defaultRow.get("medicineName")).isEqualTo("Amoxicillin 500mg");
        assertThat(defaultRow.get("strength")).isEqualTo("500mg");
        assertThat(defaultRow.get("dosageForm")).isEqualTo("Capsule");
        assertThat(defaultRow.get("unit")).isEqualTo("Capsule");
        assertThat(defaultRow.get("quantity")).isEqualTo("0");
        assertThat(defaultRow.get("reservedQuantity")).isEqualTo("0");
        assertThat(defaultRow.get("availableQuantity")).isEqualTo("0");
        assertThat(defaultRow.get("unitPrice")).isEqualTo("0");
        assertThat(defaultRow.get("expiryDate")).isBlank();
        assertThat(defaultRow.get("active")).isEqualTo("false");
    }

    @Test
    void importCsv_newTemplateCreatesInactiveZeroStockItem() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,reservedQuantity,availableQuantity,unitPrice,expiryDate,active\n" +
                     "1,Paracetamol 500mg,500mg,Tablet,0,0,0,0,,false\n";

        Pharmacy pharmacy = Pharmacy.builder().pharmacyId("pharmacy-1").name("Central Pharmacy").build();
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));

        Medicine med = Medicine.builder()
                .medicineId(1)
                .name("Paracetamol 500mg")
                .unit("Tablet")
                .active(true)
                .build();
        when(medicineRepository.findById(1)).thenReturn(Optional.of(med));
        when(inventoryRepository.findByPharmacy_PharmacyIdAndMedicine_MedicineId("pharmacy-1", 1))
                .thenReturn(Optional.empty());

        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", mockCsvFile(csv));

        assertThat(result.getImportedCount()).isEqualTo(1);
        assertThat(result.getSkippedCount()).isEqualTo(0);

        ArgumentCaptor<PharmacyInventory> captor = ArgumentCaptor.forClass(PharmacyInventory.class);
        verify(inventoryRepository).save(captor.capture());
        PharmacyInventory saved = captor.getValue();
        assertThat(saved.getQuantity()).isZero();
        assertThat(saved.getReservedQuantity()).isZero();
        assertThat(saved.getAvailableQuantity()).isZero();
        assertThat(saved.getUnitPrice()).isEqualByComparingTo("0");
        assertThat(saved.getExpiryDate()).isNull();
        assertThat(saved.getActive()).isFalse();
        assertThat(saved.getUnit()).isEqualTo("Tablet");
    }

    @Test
    void importCsv_newTemplateUpdatesReservedQuantityAndIgnoresAvailableQuantity() throws Exception {
        String csv = "medicineId,medicineName,strength,dosageForm,quantity,reservedQuantity,availableQuantity,unitPrice,expiryDate,active\n" +
                     "1,Paracetamol 500mg,500mg,Tablet,12,3,999,0.70,2028-02-02,true\n";

        Pharmacy pharmacy = Pharmacy.builder().pharmacyId("pharmacy-1").name("Central Pharmacy").build();
        when(pharmacyRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacy));

        Medicine med = Medicine.builder()
                .medicineId(1)
                .name("Paracetamol 500mg")
                .unit("Tablet")
                .active(true)
                .build();
        when(medicineRepository.findById(1)).thenReturn(Optional.of(med));

        PharmacyInventory existing = createInventory(1, "Paracetamol 500mg", 100);
        existing.setReservedQuantity(1);
        existing.setUnit("Existing Unit");
        when(inventoryRepository.findByPharmacy_PharmacyIdAndMedicine_MedicineId("pharmacy-1", 1))
                .thenReturn(Optional.of(existing));

        PharmacyInventoryImportResult result = inventoryService.importCsv("pharmacy-1", mockCsvFile(csv));

        assertThat(result.getUpdatedCount()).isEqualTo(1);
        assertThat(result.getSkippedCount()).isEqualTo(0);
        assertThat(existing.getQuantity()).isEqualTo(12);
        assertThat(existing.getReservedQuantity()).isEqualTo(3);
        assertThat(existing.getAvailableQuantity()).isEqualTo(9);
        assertThat(existing.getUnitPrice()).isEqualByComparingTo("0.70");
        assertThat(existing.getExpiryDate()).isEqualTo(LocalDate.of(2028, 2, 2));
        assertThat(existing.getUnit()).isEqualTo("Existing Unit");
    }

    private List<CSVRecord> parseCsv(byte[] bytes) throws Exception {
        try (CSVParser parser = CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .setTrim(true)
                .build()
                .parse(new StringReader(new String(bytes, StandardCharsets.UTF_8)))) {
            return parser.getRecords();
        }
    }

    // --- Helpers ---

    private PharmacyInventory createInventory(Integer id, String medName, Integer quantity) {
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .build();
        Medicine medicine = Medicine.builder()
                .medicineId(id)
                .name(medName)
                .active(true)
                .build();
        return PharmacyInventory.builder()
                .inventoryId(id)
                .pharmacy(pharmacy)
                .medicine(medicine)
                .quantity(quantity)
                .reservedQuantity(0)
                .unitPrice(new BigDecimal("1.00"))
                .unit("tablet")
                .active(true)
                .build();
    }

    private MultipartFile mockCsvFile(String csvContent) throws Exception {
        byte[] bytes = csvContent.getBytes(StandardCharsets.UTF_8);
        MultipartFile file = org.mockito.Mockito.mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn((long) bytes.length);
        when(file.getInputStream()).thenAnswer(invocation -> new ByteArrayInputStream(bytes));
        return file;
    }
}
