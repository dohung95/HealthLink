package com.HealthLink.dto.admin.schedule;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAuditLogDto {

    private Long logId;

    // Admin info
    private String adminUserId;
    private String adminUserName;
    private String adminEmail;

    // Action info
    private String actionType;          // BLOCK_SLOT, UNBLOCK_SLOT, CANCEL_APPOINTMENT, REASSIGN_APPOINTMENT
    private String actionTypeDisplay;   // "Block slot", "Hủy lịch hẹn", etc.
    private String description;
    private String reason;

    // Target info
    private String targetDoctorId;
    private String targetDoctorName;
    private Integer targetAppointmentId;
    private String targetPatientId;
    private String targetPatientName;

    // Change details
    private String oldValue;
    private String newValue;

    // Metadata
    private LocalDateTime createdAt;
    private String ipAddress;
}
