package com.HealthLink.dto.request;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * Request body khi patient đặt lịch khám.
 */
@Data
public class AppointmentRequest {

    /**
     * ID của bệnh nhân đặt lịch
     */
    private String patientId;

    /**
     * ID của bác sĩ muốn đặt
     */
    private String doctorId;

    /**
     * Thời gian khám mong muốn
     */
    private LocalDateTime appointmentTime;

    /**
     * Loại tư vấn: Video, Audio, Chat, Offline. Phải khớp với khả năng của bác
     * sĩ.
     */
    private String consultationType;

    /**
     * Triệu chứng / lý do khám
     */
    private String symptoms;

    /**
     * Ghi chú thêm
     */
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
}
