package com.HealthLink.dto.pharmacy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyInventoryImportResult {
    private int importedCount;
    private int updatedCount;
    private int skippedCount;
    private List<PharmacyInventoryRowError> rowErrors;
}
