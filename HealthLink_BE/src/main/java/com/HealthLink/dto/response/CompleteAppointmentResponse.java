package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CompleteAppointmentResponse {
    private AppointmentResponse completedAppointment;
    private AppointmentResponse followUpAppointment;
    private boolean createdFollowUp;
    private Integer followUpPrescriptionHeaderId;
}
