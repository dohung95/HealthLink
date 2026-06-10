package com.HealthLink.dto.doctor.schedule;

import com.HealthLink.entity.enums.ChangeRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorScheduleChangeRequestResponse {

    private Integer requestId;
    private Integer appointmentId;
    private LocalDateTime appointmentTime;
    private String patientName;
    private String doctorId;
    private String doctorName;
    private ChangeRequestStatus status;
    private String reason;
    private String adminReason;
    private String handledBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
