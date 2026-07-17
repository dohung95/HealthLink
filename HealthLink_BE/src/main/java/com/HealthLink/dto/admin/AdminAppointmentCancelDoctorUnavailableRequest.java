package com.HealthLink.dto.admin;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Admin cancels an appointment because the assigned doctor is unavailable (sudden unavailability /
 * no suitable replacement found). Used for Home Visit appointments or appointments where the patient
 * manually selected their doctor - refunds automatically, with no "process refund" toggle like the
 * regular cancel action since it always refunds 100%.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAppointmentCancelDoctorUnavailableRequest {

    @NotBlank(message = "Reason is required")
    private String reason;
}
