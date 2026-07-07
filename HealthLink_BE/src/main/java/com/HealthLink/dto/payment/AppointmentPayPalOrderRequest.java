package com.HealthLink.dto.payment;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AppointmentPayPalOrderRequest {

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

    private Integer sourceConsultationId;

    private String currency = "USD";
    
    private String doctorSelectionMode;
    private BigDecimal manualSelectionFee;

    private List<Integer> homeVisitServiceIds;

    private Integer scheduleId;
    private LocalDate bookingDate;
    private LocalTime homeVisitStartTime;
    private LocalTime homeVisitEndTime;
}
