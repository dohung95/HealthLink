package com.HealthLink.dto.consultation;

import lombok.Data;

@Data
public class ConsultationNotesRequest {

    private String diagnosis;
    private String doctorNotes;
    private String treatmentPlan;
}
