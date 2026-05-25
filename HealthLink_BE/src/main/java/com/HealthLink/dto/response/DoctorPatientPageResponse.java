package com.HealthLink.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorPatientPageResponse {
    private List<DoctorPatientSummaryResponse> patients;
    private int pageNumber;
    private int pageSize;
    private long totalCount;
    private int totalPages;
}
