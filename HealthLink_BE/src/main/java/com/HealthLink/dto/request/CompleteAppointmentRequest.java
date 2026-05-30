package com.HealthLink.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompleteAppointmentRequest {
    @Builder.Default
    private boolean copyPrescription = false;
}
