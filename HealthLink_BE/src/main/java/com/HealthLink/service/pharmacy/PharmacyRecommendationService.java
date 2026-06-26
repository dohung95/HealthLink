package com.HealthLink.service.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyRecommendationResponse;

import java.util.List;

public interface PharmacyRecommendationService {

    List<PharmacyRecommendationResponse> getRecommendations(
            Double lat, Double lng, Boolean deliveryOnly, Integer prescriptionHeaderId, String patientId
    );
}
