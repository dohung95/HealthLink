package com.HealthLink.service.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyWorkItemResponse;

import java.util.List;

public interface PharmacyWorkItemService {
    List<PharmacyWorkItemResponse> getWorkItemsByPharmacy(String pharmacyId);
}
