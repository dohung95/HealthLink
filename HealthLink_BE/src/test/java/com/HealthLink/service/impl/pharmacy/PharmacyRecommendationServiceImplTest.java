package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyRecommendationResponse;
import com.HealthLink.dto.pharmacy.RetailPharmacyAvailabilityRequest;
import com.HealthLink.dto.pharmacy.RetailPharmacyRecommendationResponse;
import com.HealthLink.dto.pharmacy.RetailCartItemRequest;
import com.HealthLink.entity.*;
import com.HealthLink.exception.ForbiddenException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.medicine.MedicineRepository;
import com.HealthLink.repository.pharmacy.PharmacyInventoryRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PharmacyRecommendationServiceImplTest {

    private static final double DELTA = 0.1;

    @Mock
    private PharmacyRepository pharmacyRepository;

    @Mock
    private PharmacyInventoryRepository inventoryRepository;

    @Mock
    private PrescriptionHeaderRepository prescriptionHeaderRepository;

    @Mock
    private MedicineRepository medicineRepository;

    @InjectMocks
    private PharmacyRecommendationServiceImpl recommendationService;

    @Test
    void getRecommendations_noPrescriptionNoCoords() {
        Pharmacy pharm = pharmacy("pharmacy-1", "Central Pharmacy", true, true);
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(null, null, null, null, "patient-1");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getDistanceKm()).isNull();
        assertThat(results.get(0).getStockStatus()).isEqualTo("UNKNOWN");
    }

    @Test
    void getRecommendations_deliveryOnly() {
        Pharmacy pharm = pharmacy("pharmacy-1", "Central Pharmacy", true, true);
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrueAndDeliveryAvailableTrue())
                .thenReturn(List.of(pharm));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(null, null, true, null, "patient-1");

        assertThat(results).hasSize(1);
    }

    @Test
    void getRecommendations_deliveryOnlyFalse() {
        Pharmacy pharm = pharmacy("pharmacy-1", "Central Pharmacy", true, true);
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(null, null, false, null, "patient-1");

        assertThat(results).hasSize(1);
    }

    @Test
    void getRecommendations_sortedByDistance() {
        Pharmacy pharm1 = pharmacy("pharmacy-1", "Near", 40.7128, -74.0060);
        Pharmacy pharm2 = pharmacy("pharmacy-2", "Medium", 40.7200, -74.0100);
        Pharmacy pharm3 = pharmacy("pharmacy-3", "Far", 40.7500, -74.0200);
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm3, pharm1, pharm2));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(40.7580, -73.9855, null, null, "patient-1");

        assertThat(results).hasSize(3);
        assertThat(results.get(0).getDistanceKm()).isLessThan(results.get(1).getDistanceKm());
        assertThat(results.get(1).getDistanceKm()).isLessThan(results.get(2).getDistanceKm());
    }

    @Test
    void getRecommendations_sameDistanceSortedByStock() {
        // Same distance (same coords), different stock status
        Pharmacy pharm1 = pharmacy("pharmacy-1", "Full Stock", 40.7128, -74.0060);
        Pharmacy pharm2 = pharmacy("pharmacy-2", "Partial Stock", 40.7128, -74.0060);

        Patient patient = Patient.builder().patientId("patient-1").build();
        Medicine med1 = Medicine.builder().medicineId(1).name("Amlodipine 5mg").active(true).build();
        Medicine med2 = Medicine.builder().medicineId(2).name("Metformin 500mg").active(true).build();
        PrescriptionHeader prescription = prescriptionWithItems(patient, List.of(
                item(101, med1, "Amlodipine 5mg", 10),
                item(102, med2, "Metformin 500mg", 10)
        ));
        when(prescriptionHeaderRepository.findById(10)).thenReturn(Optional.of(prescription));
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm2, pharm1));
        // pharm1: both items fully in stock -> FULL
        when(inventoryRepository.findByPharmacy_PharmacyId("pharmacy-1"))
                .thenReturn(List.of(inventory(pharm1, med1, 100, true), inventory(pharm1, med2, 200, true)));
        // pharm2: only med1 in stock -> PARTIAL (med2 missing)
        when(inventoryRepository.findByPharmacy_PharmacyId("pharmacy-2"))
                .thenReturn(List.of(inventory(pharm2, med1, 50, true)));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(40.7580, -73.9855, null, 10, "patient-1");

        assertThat(results).hasSize(2);
        assertThat(results.get(0).getStockStatus()).isEqualTo("FULL");
        assertThat(results.get(1).getStockStatus()).isEqualTo("PARTIAL");
    }

    @Test
    void getRecommendations_sameDistanceAndStockSortedByRating() {
        Pharmacy pharm1 = pharmacy("pharmacy-1", "High Rated", 40.7128, -74.0060, 4.8);
        Pharmacy pharm2 = pharmacy("pharmacy-2", "Low Rated", 40.7128, -74.0060, 3.2);
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm2, pharm1));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(40.7580, -73.9855, null, null, "patient-1");

        assertThat(results).hasSize(2);
        assertThat(results.get(0).getAverageRating()).isGreaterThan(results.get(1).getAverageRating());
    }

    @Test
    void getRecommendations_prescriptionAllItemsMatched() {
        Pharmacy pharm = pharmacy("pharmacy-1", "Well Stocked", 40.7128, -74.0060);
        Patient patient = Patient.builder().patientId("patient-1").build();
        Medicine med = Medicine.builder().medicineId(1).name("Amlodipine 5mg").active(true).build();
        PrescriptionHeader prescription = prescription(patient, med);

        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm));
        when(prescriptionHeaderRepository.findById(10)).thenReturn(Optional.of(prescription));
        when(inventoryRepository.findByPharmacy_PharmacyId("pharmacy-1"))
                .thenReturn(List.of(inventory(pharm, med, 50, true)));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(40.7580, -73.9855, null, 10, "patient-1");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getStockStatus()).isEqualTo("FULL");
        assertThat(results.get(0).getAvailableItems()).hasSize(1);
        assertThat(results.get(0).getAvailableItems().get(0).getMatched()).isTrue();
        assertThat(results.get(0).getMissingItems()).isEmpty();
    }

    @Test
    void getRecommendations_prescriptionPartialMatch() {
        Pharmacy pharm = pharmacy("pharmacy-1", "Partial Stock", 40.7128, -74.0060);
        Patient patient = Patient.builder().patientId("patient-1").build();
        Medicine med1 = Medicine.builder().medicineId(1).name("Amlodipine 5mg").active(true).build();
        Medicine med2 = Medicine.builder().medicineId(2).name("Metformin 500mg").active(true).build();
        PrescriptionHeader prescription = prescriptionWithItems(patient, List.of(
                item(101, med1, "Amlodipine 5mg", 30),
                item(102, med2, "Metformin 500mg", 60)
        ));

        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm));
        when(prescriptionHeaderRepository.findById(10)).thenReturn(Optional.of(prescription));
        when(inventoryRepository.findByPharmacy_PharmacyId("pharmacy-1"))
                .thenReturn(List.of(inventory(pharm, med1, 50, true)));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(40.7580, -73.9855, null, 10, "patient-1");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getStockStatus()).isEqualTo("PARTIAL");
        assertThat(results.get(0).getAvailableItems()).hasSize(1);
        assertThat(results.get(0).getMissingItems()).hasSize(1);
    }

    @Test
    void getRecommendations_prescriptionNoItemsMatched() {
        Pharmacy pharm = pharmacy("pharmacy-1", "No Stock", 40.7128, -74.0060);
        Patient patient = Patient.builder().patientId("patient-1").build();
        Medicine med = Medicine.builder().medicineId(1).name("Amlodipine 5mg").active(true).build();
        PrescriptionHeader prescription = prescription(patient, med);

        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm));
        when(prescriptionHeaderRepository.findById(10)).thenReturn(Optional.of(prescription));
        when(inventoryRepository.findByPharmacy_PharmacyId("pharmacy-1")).thenReturn(List.of());

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(40.7580, -73.9855, null, 10, "patient-1");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getStockStatus()).isEqualTo("UNKNOWN");
    }

    @Test
    void getRecommendations_prescriptionNotOwned() {
        Patient otherPatient = Patient.builder().patientId("patient-2").build();
        PrescriptionHeader prescription = prescription(otherPatient, null);
        when(prescriptionHeaderRepository.findById(10)).thenReturn(Optional.of(prescription));

        assertThatThrownBy(() ->
                recommendationService.getRecommendations(null, null, null, 10, "patient-1"))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void getRecommendations_prescriptionNotFound() {
        when(prescriptionHeaderRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                recommendationService.getRecommendations(null, null, null, 999, "patient-1"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getRecommendations_distanceCalculated() {
        // NYC coordinates: pharmacy near Central Park, patient near Times Square
        Pharmacy pharm = pharmacy("pharmacy-1", "NYC Pharmacy", 40.7829, -73.9654);
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(40.7580, -73.9855, null, null, "patient-1");

        assertThat(results.get(0).getDistanceKm()).isNotNull();
        assertThat(results.get(0).getDistanceKm()).isBetween(2.0, 4.0);
    }

    @Test
    void getRecommendations_distanceLabelUnder1km() {
        // Same location → 0 distance
        Pharmacy pharm = pharmacy("pharmacy-1", "Same Location", 40.7580, -73.9855);
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(40.7580, -73.9855, null, null, "patient-1");

        assertThat(results.get(0).getDistanceLabel()).isEqualTo("0 m");
    }

    @Test
    void getRecommendations_distanceLabelInKm() {
        Pharmacy pharm = pharmacy("pharmacy-1", "Far Pharmacy", 40.8000, -73.9500);
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(40.7580, -73.9855, null, null, "patient-1");

        assertThat(results.get(0).getDistanceLabel()).endsWith("km");
    }

    @Test
    void getRecommendations_withinDeliveryRadius() {
        Pharmacy pharm = pharmacy("pharmacy-1", "Nearby", 40.7600, -73.9800);
        pharm.setDeliveryRadius(10.0);
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(40.7580, -73.9855, null, null, "patient-1");

        assertThat(results.get(0).getWithinDeliveryRadius()).isTrue();
    }

    @Test
    void getRecommendations_outsideDeliveryRadius() {
        Pharmacy pharm = pharmacy("pharmacy-1", "Far Away", 40.9000, -73.9000);
        pharm.setDeliveryRadius(5.0);
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(40.7580, -73.9855, null, null, "patient-1");

        assertThat(results.get(0).getWithinDeliveryRadius()).isFalse();
    }

    @Test
    void getRecommendations_noDeliveryRadius() {
        Pharmacy pharm = pharmacy("pharmacy-1", "No Radius", 40.7600, -73.9800);
        pharm.setDeliveryRadius(null);
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(40.7580, -73.9855, null, null, "patient-1");

        assertThat(results.get(0).getWithinDeliveryRadius()).isNull();
    }

    @Test
    void getRecommendations_inactiveInventoryExcluded() {
        Pharmacy pharm = pharmacy("pharmacy-1", "Some Stock", 40.7128, -74.0060);
        Patient patient = Patient.builder().patientId("patient-1").build();
        Medicine med = Medicine.builder().medicineId(1).name("Amlodipine 5mg").active(true).build();
        PrescriptionHeader prescription = prescription(patient, med);

        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm));
        when(prescriptionHeaderRepository.findById(10)).thenReturn(Optional.of(prescription));
        // Inventory record exists but active = false
        PharmacyInventory inv = inventory(pharm, med, 100, false);
        when(inventoryRepository.findByPharmacy_PharmacyId("pharmacy-1")).thenReturn(List.of(inv));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(40.7580, -73.9855, null, 10, "patient-1");

        assertThat(results.get(0).getStockStatus()).isEqualTo("UNKNOWN");
        assertThat(results.get(0).getMissingItems()).hasSize(1);
        assertThat(results.get(0).getMissingItems().get(0).getReason()).isEqualTo("Medicine not in inventory");
    }

    @Test
    void getRecommendations_insufficientStock() {
        Pharmacy pharm = pharmacy("pharmacy-1", "Low Stock", 40.7128, -74.0060);
        Patient patient = Patient.builder().patientId("patient-1").build();
        Medicine med = Medicine.builder().medicineId(1).name("Amlodipine 5mg").active(true).build();
        PrescriptionHeader prescription = prescription(patient, med);

        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm));
        when(prescriptionHeaderRepository.findById(10)).thenReturn(Optional.of(prescription));
        when(inventoryRepository.findByPharmacy_PharmacyId("pharmacy-1"))
                .thenReturn(List.of(inventory(pharm, med, 2, true)));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(40.7580, -73.9855, null, 10, "patient-1");

        assertThat(results.get(0).getMissingItems()).hasSize(1);
        assertThat(results.get(0).getMissingItems().get(0).getReason())
                .contains("Insufficient stock");
    }

    @Test
    void getRecommendations_noInventoryForMedicine() {
        Pharmacy pharm = pharmacy("pharmacy-1", "No Inventory", 40.7128, -74.0060);
        Patient patient = Patient.builder().patientId("patient-1").build();
        Medicine med = Medicine.builder().medicineId(1).name("Amlodipine 5mg").active(true).build();
        PrescriptionHeader prescription = prescription(patient, med);

        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm));
        when(prescriptionHeaderRepository.findById(10)).thenReturn(Optional.of(prescription));
        when(inventoryRepository.findByPharmacy_PharmacyId("pharmacy-1")).thenReturn(List.of());

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(40.7580, -73.9855, null, 10, "patient-1");

        assertThat(results.get(0).getMissingItems()).hasSize(1);
        assertThat(results.get(0).getMissingItems().get(0).getReason())
                .isEqualTo("Medicine not in inventory");
    }

    @Test
    void getRecommendations_zeroQuantityStock() {
        Pharmacy pharm = pharmacy("pharmacy-1", "Zero Stock", 40.7128, -74.0060);
        Patient patient = Patient.builder().patientId("patient-1").build();
        Medicine med = Medicine.builder().medicineId(1).name("Amlodipine 5mg").active(true).build();
        PrescriptionHeader prescription = prescription(patient, med);

        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm));
        when(prescriptionHeaderRepository.findById(10)).thenReturn(Optional.of(prescription));
        when(inventoryRepository.findByPharmacy_PharmacyId("pharmacy-1"))
                .thenReturn(List.of(inventory(pharm, med, 0, true)));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(40.7580, -73.9855, null, 10, "patient-1");

        assertThat(results.get(0).getMissingItems()).hasSize(1);
        assertThat(results.get(0).getMissingItems().get(0).getReason())
                .isEqualTo("Out of stock");
    }

    @Test
    void getRecommendations_open24HoursFlag() {
        Pharmacy pharm = pharmacy("pharmacy-1", "24hr Pharmacy", 40.7128, -74.0060);
        pharm.setOpen24Hours(true);
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(null, null, null, null, "patient-1");

        assertThat(results.get(0).getOpen24Hours()).isTrue();
    }

    @Test
    void getRecommendations_deliveryAvailableFlag() {
        Pharmacy pharm = pharmacy("pharmacy-1", "Delivery Pharmacy", 40.7128, -74.0060);
        pharm.setDeliveryAvailable(true);
        pharm.setDeliveryFee(new BigDecimal("3.50"));
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharm));

        List<PharmacyRecommendationResponse> results =
                recommendationService.getRecommendations(null, null, null, null, "patient-1");

        assertThat(results.get(0).getDeliveryAvailable()).isTrue();
        assertThat(results.get(0).getDeliveryFee()).isEqualByComparingTo("3.50");
    }

    @Test
    void getRetailRecommendations_shouldReturnFullWhenAllCartItemsAvailable() {
        Pharmacy pharmacy = pharmacy("pharmacy-1", "Retail One", 40.7128, -74.0060);
        Medicine med1 = Medicine.builder()
                .medicineId(1)
                .name("Paracetamol")
                .price(new BigDecimal("2.00"))
                .active(true)
                .build();
        Medicine med2 = Medicine.builder()
                .medicineId(2)
                .name("Vitamin C")
                .price(new BigDecimal("3.00"))
                .active(true)
                .build();
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharmacy));
        when(medicineRepository.findAllById(anyCollection())).thenReturn(List.of(med1, med2));
        when(inventoryRepository.findByPharmacy_PharmacyIdAndMedicine_MedicineIdIn(eq("pharmacy-1"), anyCollection()))
                .thenReturn(List.of(
                        inventory(pharmacy, med1, 10, true),
                        inventory(pharmacy, med2, 5, true)
                ));

        List<RetailPharmacyRecommendationResponse> results = recommendationService.getRetailRecommendations(
                RetailPharmacyAvailabilityRequest.builder()
                        .items(List.of(
                                RetailCartItemRequest.builder().medicineId(1).quantity(2).build(),
                                RetailCartItemRequest.builder().medicineId(2).quantity(1).build()
                        ))
                        .build(),
                "patient-1"
        );

        assertThat(results).hasSize(1);
        RetailPharmacyRecommendationResponse result = results.get(0);
        assertThat(result.getStockStatus()).isEqualTo("FULL");
        assertThat(result.getAvailableItems()).hasSize(2);
        assertThat(result.getMissingItems()).isEmpty();
        assertThat(result.getMedicineSubtotal()).isEqualByComparingTo("7.00");
    }

    @Test
    void getRetailRecommendations_shouldReturnPartialWithMissingReasons() {
        Pharmacy pharmacy = pharmacy("pharmacy-1", "Retail One", 40.7128, -74.0060);
        Medicine med1 = Medicine.builder()
                .medicineId(1)
                .name("Paracetamol")
                .price(new BigDecimal("2.00"))
                .active(true)
                .build();
        Medicine med2 = Medicine.builder()
                .medicineId(2)
                .name("Vitamin C")
                .price(new BigDecimal("3.00"))
                .active(true)
                .build();
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrue()).thenReturn(List.of(pharmacy));
        when(medicineRepository.findAllById(anyCollection())).thenReturn(List.of(med1, med2));
        when(inventoryRepository.findByPharmacy_PharmacyIdAndMedicine_MedicineIdIn(eq("pharmacy-1"), anyCollection()))
                .thenReturn(List.of(
                        inventory(pharmacy, med1, 1, true)
                ));

        List<RetailPharmacyRecommendationResponse> results = recommendationService.getRetailRecommendations(
                RetailPharmacyAvailabilityRequest.builder()
                        .items(List.of(
                                RetailCartItemRequest.builder().medicineId(1).quantity(3).build(),
                                RetailCartItemRequest.builder().medicineId(2).quantity(1).build()
                        ))
                        .build(),
                "patient-1"
        );

        assertThat(results).hasSize(1);
        RetailPharmacyRecommendationResponse result = results.get(0);
        assertThat(result.getStockStatus()).isEqualTo("PARTIAL");
        assertThat(result.getMissingItems()).extracting("reason")
                .contains("Insufficient stock: 1 available, 3 required", "Medicine not in inventory");
    }

    // --- Helpers ---

    private Pharmacy pharmacy(String id, String name, boolean active, boolean verified) {
        return Pharmacy.builder()
                .pharmacyId(id)
                .name(name)
                .active(active)
                .verified(verified)
                .build();
    }

    private Pharmacy pharmacy(String id, String name, double lat, double lng) {
        return Pharmacy.builder()
                .pharmacyId(id)
                .name(name)
                .active(true)
                .verified(true)
                .latitude(lat)
                .longitude(lng)
                .build();
    }

    private Pharmacy pharmacy(String id, String name, double lat, double lng, double rating) {
        Pharmacy p = pharmacy(id, name, lat, lng);
        p.setAverageRating(rating);
        p.setTotalReviews(10);
        return p;
    }

    private PharmacyInventory inventory(Pharmacy pharmacy, Medicine medicine, int quantity, boolean active) {
        return PharmacyInventory.builder()
                .pharmacy(pharmacy)
                .medicine(medicine)
                .quantity(quantity)
                .reservedQuantity(0)
                .active(active)
                .unit("tablet")
                .build();
    }

    private PrescriptionHeader prescription(Patient patient, Medicine med) {
        PrescriptionHeader header = PrescriptionHeader.builder()
                .prescriptionHeaderId(10)
                .patient(patient)
                .build();
        if (med != null) {
            PrescriptionItem item = PrescriptionItem.builder()
                    .prescriptionItemId(101)
                    .prescriptionHeader(header)
                    .medicine(med)
                    .medicationName(med.getName())
                    .quantity(30)
                    .build();
            header.setPrescriptionItems(List.of(item));
        }
        return header;
    }

    private PrescriptionHeader prescriptionWithItems(Patient patient, List<PrescriptionItem> items) {
        PrescriptionHeader header = PrescriptionHeader.builder()
                .prescriptionHeaderId(10)
                .patient(patient)
                .build();
        items.forEach(i -> i.setPrescriptionHeader(header));
        header.setPrescriptionItems(items);
        return header;
    }

    private PrescriptionItem item(Integer id, Medicine med, String name, int quantity) {
        return PrescriptionItem.builder()
                .prescriptionItemId(id)
                .medicine(med)
                .medicationName(name)
                .quantity(quantity)
                .build();
    }
}
