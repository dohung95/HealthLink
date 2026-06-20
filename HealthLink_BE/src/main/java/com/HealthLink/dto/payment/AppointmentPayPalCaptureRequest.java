package com.HealthLink.dto.payment;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AppointmentPayPalCaptureRequest {

    @NotBlank(message = "orderId is required")
    private String orderId;

    @NotBlank(message = "patientId is required")
    private String patientId;

    @NotBlank(message = "doctorId is required")
    private String doctorId;

    @NotNull(message = "appointmentTime is required")
    private LocalDateTime appointmentTime;

    private String consultationType;

    private String symptoms;

    private String notes;

    private String paymentMethod = "EWallet";

    private String currency = "USD";
}
