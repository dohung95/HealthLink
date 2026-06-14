package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyRecommendationResponse;
import com.HealthLink.dto.pharmacy.PrescriptionStockMatchItem;
import com.HealthLink.entity.*;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ForbiddenException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.pharmacy.PharmacyInventoryRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.impl.pharmacy.PharmacyServiceHelper;
import com.HealthLink.service.pharmacy.PharmacyRecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PharmacyRecommendationServiceImpl implements PharmacyRecommendationService {

    private final PharmacyRepository pharmacyRepository;
    private final PharmacyInventoryRepository inventoryRepository;
    private final PrescriptionHeaderRepository prescriptionHeaderRepository;

    @Override
    public List<PharmacyRecommendationResponse> getRecommendations(
            Double lat, Double lng, Boolean deliveryOnly,
            Integer prescriptionHeaderId, String patientId) {

        List<Pharmacy> pharmacies;
        if (Boolean.TRUE.equals(deliveryOnly)) {
            pharmacies = pharmacyRepository.findByActiveTrueAndVerifiedTrueAndDeliveryAvailableTrue();
        } else {
            pharmacies = pharmacyRepository.findByActiveTrueAndVerifiedTrue();
        }

        PrescriptionHeader prescription = null;
        if (prescriptionHeaderId != null) {
            prescription = prescriptionHeaderRepository.findById(prescriptionHeaderId)
                    .orElseThrow(() -> new ResourceNotFoundException("PrescriptionHeader", "id", prescriptionHeaderId));
            if (prescription.getPatient() == null
                    || !prescription.getPatient().getPatientId().equals(patientId)) {
                throw new ForbiddenException("Prescription does not belong to current patient");
            }
        }

        final PrescriptionHeader finalPrescription = prescription;

        List<PharmacyRecommendationResponse> results = pharmacies.stream()
                .map(pharmacy -> buildRecommendation(pharmacy, lat, lng, finalPrescription))
                .collect(Collectors.toList());

        results.sort((a, b) -> {
            // 1. Pharmacies with distance come before those without
            boolean aHasDist = a.getDistanceKm() != null;
            boolean bHasDist = b.getDistanceKm() != null;
            if (aHasDist && !bHasDist) return -1;
            if (!aHasDist && bHasDist) return 1;

            // 2. Sort by distance ascending
            if (aHasDist && bHasDist) {
                int distCompare = Double.compare(a.getDistanceKm(), b.getDistanceKm());
                if (distCompare != 0) return distCompare;
            }

            // 3. Stock status: FULL before PARTIAL, UNKNOWN last
            if (finalPrescription != null) {
                String aStock = a.getStockStatus() != null ? a.getStockStatus() : "UNKNOWN";
                String bStock = b.getStockStatus() != null ? b.getStockStatus() : "UNKNOWN";
                int stockCompare = compareStockStatus(aStock, bStock);
                if (stockCompare != 0) return stockCompare;
            }

            // 4. Rating higher first
            double aRating = a.getAverageRating() != null ? a.getAverageRating() : 0;
            double bRating = b.getAverageRating() != null ? b.getAverageRating() : 0;
            return Double.compare(bRating, aRating);
        });

        return results;
    }

    private PharmacyRecommendationResponse buildRecommendation(
            Pharmacy pharmacy, Double patientLat, Double patientLng,
            PrescriptionHeader prescription) {

        Double distanceKm = null;
        if (patientLat != null && patientLng != null
                && pharmacy.getLatitude() != null && pharmacy.getLongitude() != null) {
            distanceKm = PharmacyServiceHelper.calculateDistanceKm(
                    pharmacy.getLatitude(), pharmacy.getLongitude(),
                    patientLat, patientLng
            );
        }

        Boolean withinDeliveryRadius = null;
        if (distanceKm != null && pharmacy.getDeliveryRadius() != null) {
            withinDeliveryRadius = distanceKm <= pharmacy.getDeliveryRadius();
        }

        List<PrescriptionStockMatchItem> availableItems = new ArrayList<>();
        List<PrescriptionStockMatchItem> missingItems = new ArrayList<>();
        String stockStatus = "UNKNOWN";

        if (prescription != null && prescription.getPrescriptionItems() != null
                && !prescription.getPrescriptionItems().isEmpty()) {

            List<PharmacyInventory> inventoryList = inventoryRepository
                    .findByPharmacy_PharmacyId(pharmacy.getPharmacyId());

            Map<Integer, PharmacyInventory> inventoryByMedicineId = new HashMap<>();
            for (PharmacyInventory inv : inventoryList) {
                if (inv.getActive()) {
                    inventoryByMedicineId.put(inv.getMedicine().getMedicineId(), inv);
                }
            }

            boolean allMatched = true;
            boolean anyMatched = false;

            for (PrescriptionItem item : prescription.getPrescriptionItems()) {
                Medicine medicine = item.getMedicine();
                Integer medicineId = medicine != null ? medicine.getMedicineId() : null;
                int requiredQty = item.getQuantity() != null ? item.getQuantity() : 1;

                PharmacyInventory inv = medicineId != null ? inventoryByMedicineId.get(medicineId) : null;
                int availableQty = inv != null ? inv.getAvailableQuantity() : 0;
                boolean matched = inv != null && availableQty >= requiredQty;

                PrescriptionStockMatchItem matchItem = PrescriptionStockMatchItem.builder()
                        .prescriptionItemId(item.getPrescriptionItemId())
                        .medicineId(medicineId)
                        .medicationName(item.getMedicationName())
                        .requiredQuantity(requiredQty)
                        .availableQuantity(availableQty)
                        .matched(matched)
                        .reason(matched ? null : buildUnmatchedReason(inv, availableQty, requiredQty))
                        .build();

                if (matched) {
                    anyMatched = true;
                    availableItems.add(matchItem);
                } else {
                    allMatched = false;
                    missingItems.add(matchItem);
                }
            }

            if (allMatched && !prescription.getPrescriptionItems().isEmpty()) {
                stockStatus = "FULL";
            } else if (anyMatched) {
                stockStatus = "PARTIAL";
            } else {
                stockStatus = "UNKNOWN";
            }
        }

        return PharmacyRecommendationResponse.builder()
                .pharmacyId(pharmacy.getPharmacyId())
                .name(pharmacy.getName())
                .address(pharmacy.getAddress())
                .city(pharmacy.getCity())
                .district(pharmacy.getDistrict())
                .ward(pharmacy.getWard())
                .phoneNumber(pharmacy.getPhoneNumber())
                .email(pharmacy.getEmail())
                .description(pharmacy.getDescription())
                .avatarUrl(pharmacy.getAvatarUrl())
                .latitude(pharmacy.getLatitude())
                .longitude(pharmacy.getLongitude())
                .openTime(pharmacy.getOpenTime())
                .closeTime(pharmacy.getCloseTime())
                .open24Hours(pharmacy.isOpen24Hours())
                .workingDays(pharmacy.getWorkingDays())
                .averageRating(pharmacy.getAverageRating())
                .totalReviews(pharmacy.getTotalReviews())
                .deliveryAvailable(pharmacy.isDeliveryAvailable())
                .deliveryRadius(pharmacy.getDeliveryRadius())
                .deliveryFee(pharmacy.getDeliveryFee())
                .distanceKm(distanceKm)
                .distanceLabel(formatDistance(distanceKm))
                .withinDeliveryRadius(withinDeliveryRadius)
                .stockStatus(stockStatus)
                .availableItems(availableItems)
                .missingItems(missingItems)
                .build();
    }

    private String buildUnmatchedReason(PharmacyInventory inv, int availableQty, int requiredQty) {
        if (inv == null) return "Medicine not in inventory";
        if (availableQty <= 0) return "Out of stock";
        return "Insufficient stock: " + availableQty + " available, " + requiredQty + " required";
    }

    private int compareStockStatus(String a, String b) {
        Map<String, Integer> order = Map.of("FULL", 0, "PARTIAL", 1, "UNKNOWN", 2);
        int aOrder = order.getOrDefault(a, 2);
        int bOrder = order.getOrDefault(b, 2);
        return Integer.compare(aOrder, bOrder);
    }

    public static String formatDistance(Double distanceKm) {
        if (distanceKm == null) {
            return "Khong co khoang cach";
        }
        if (distanceKm < 1.0) {
            int meters = (int) Math.round(distanceKm * 1000);
            return meters + " m";
        }
        if (distanceKm == Math.floor(distanceKm)) {
            return (int) Math.floor(distanceKm) + " km";
        }
        return String.format("%.1f km", distanceKm);
    }

    // calculateDistanceKm moved to PharmacyServiceHelper
}
