package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response trả về sau khi đặt/xem/hủy lịch hẹn.
 */
@Data
@Builder
public class AppointmentResponse {

    private Integer appointmentId;
    private String patientId;
    private String patientName;
    private String doctorId;
    private String doctorName;
    private String doctorAvatar;
    private LocalDateTime appointmentTime;
    private String consultationType;
    private String status;
    private BigDecimal fee;
    private String symptoms;
    private String notes;
    private LocalDateTime consultationStartTime;
    private LocalDateTime consultationEndTime;
    private LocalDateTime cancelledAt;
    private String cancelReason;
    private String cancelledBy;
    private LocalDateTime confirmedAt;
    private String specialtyName;
    private LocalDateTime followUpDate;
    private Integer followUpAppointmentId;
    private String followUpNotes;

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

    private Double distanceKm;
    private Integer estimatedTravelMinutes;
    private Integer visitDurationMinutes;
    private Integer travelBufferBeforeMinutes;
    private Integer travelBufferAfterMinutes;

    private BigDecimal homeVisitFee;
    private BigDecimal travelFee;
}
