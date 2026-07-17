package com.HealthLink.dto.doctor.schedule;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Sent by admin when resolving (approving) a DoctorScheduleChangeRequest, choosing 1 of 2 resolutions:
 * - REASSIGN: switch to another doctor (only valid when the appointment is Online + AUTO_ASSIGNED)
 * - CANCEL: cancel the appointment + automatic refund, patient rebooks themselves
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorScheduleChangeRequestResolveRequest {

    @NotBlank(message = "Resolution type is required")
    private String resolutionType; // "REASSIGN" | "CANCEL"

    // Required if resolutionType = REASSIGN
    private String newDoctorId;

    @NotBlank(message = "Admin reason is required")
    private String adminReason;
}
