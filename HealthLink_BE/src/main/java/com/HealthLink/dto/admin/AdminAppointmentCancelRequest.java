package com.HealthLink.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAppointmentCancelRequest {

    @NotNull(message = "Appointment ID is required")
    private Integer appointmentId;

    @NotBlank(message = "Cancel reason is required")
    private String reason;

    // Optional: Notify settings
    private boolean notifyPatient = true;
    private boolean notifyDoctor = true;

    // Optional: Refund nếu đã thanh toán
    private boolean processRefund = false;
}
