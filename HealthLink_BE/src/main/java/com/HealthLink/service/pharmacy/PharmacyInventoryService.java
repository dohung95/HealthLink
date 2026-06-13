package com.HealthLink.service.pharmacy;

import com.HealthLink.dto.pharmacy.*;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

public interface PharmacyInventoryService {

    Page<PharmacyInventoryResponse> getInventory(String pharmacyId, String query, Boolean lowStock,
                                                  Boolean active, int page, int size);

    PharmacyInventoryResponse updateInventory(String pharmacyId, Integer inventoryId,
                                               PharmacyInventoryUpdateRequest request);

    PharmacyInventoryImportResult importCsv(String pharmacyId, MultipartFile file);

    byte[] generateCsvTemplate(String pharmacyId);

    PharmacyInventoryResponse getInventoryItem(String pharmacyId, Integer inventoryId);
}
