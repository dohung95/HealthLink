package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminMedicalRecordStatsDto {
    private long totalRecords;
    private long totalDocuments;
    private long totalPatients;
}
