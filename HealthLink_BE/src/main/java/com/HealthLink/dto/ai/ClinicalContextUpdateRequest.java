package com.HealthLink.dto.ai;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClinicalContextUpdateRequest(
        @NotBlank @Size(max = 4000) String symptoms,
        @Size(max = 2000) String workingDiagnosis,
        @Size(max = 32) String fastingStatus,
        @Size(max = 32) String pregnancyStatus,
        @Min(0) Long expectedContextVersion) {
    public ClinicalContextUpdateRequest(String symptoms, String workingDiagnosis, Long expectedContextVersion) {
        this(symptoms, workingDiagnosis, null, null, expectedContextVersion);
    }
}
