package com.HealthLink.dto.payment;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

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

    // Home Visit fields
    private String visitAddress;
    private String visitCity;
    private String contactPhone;
    private String reasonForHomeVisit;
    private String specialNotes;

    private Boolean isForSelf;

    private String receiverName;
    private Integer receiverAge;
    private String receiverGender;
    private String receiverRelationship;
    private String receiverPhone;

    private Double visitLatitude;
    private Double visitLongitude;

    private Integer draftId;

    private Integer scheduleId;

    private LocalDate bookingDate;

    private Integer sourceConsultationId;

    private String paymentMethod = "EWallet";

    private String currency = "USD";

    private List<Integer> homeVisitServiceIds;

    private LocalTime homeVisitStartTime;
    private LocalTime homeVisitEndTime;
}
