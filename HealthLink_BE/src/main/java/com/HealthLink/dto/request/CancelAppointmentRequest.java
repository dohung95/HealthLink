package com.HealthLink.dto.request;

import lombok.Data;

/**
 * Request body khi hủy lịch hẹn.
 */
@Data
public class CancelAppointmentRequest {

    /** Lý do hủy lịch */
    private String cancelReason;

    /** Người hủy: "Patient" hoặc "Doctor" */
    private String cancelledBy;
}
