package com.HealthLink.service.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyRecommendationResponse;
import com.HealthLink.dto.pharmacy.RetailPharmacyAvailabilityRequest;
import com.HealthLink.dto.pharmacy.RetailPharmacyRecommendationResponse;

import java.util.List;

public interface PharmacyRecommendationService {

    List<PharmacyRecommendationResponse> getRecommendations(
            Double lat, Double lng, Boolean deliveryOnly, Integer prescriptionHeaderId, String patientId
    );

    List<RetailPharmacyRecommendationResponse> getRetailRecommendations(
            RetailPharmacyAvailabilityRequest request,
            String patientId
    );
}
