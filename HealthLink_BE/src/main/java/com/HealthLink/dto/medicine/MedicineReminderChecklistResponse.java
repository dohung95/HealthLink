package com.HealthLink.dto.medicine;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
@Builder
public class MedicineReminderChecklistResponse {
    private LocalDate date;
    private String timing;
    private LocalTime scheduledTime;
    private int checkedCount;
    private int totalCount;
    private boolean complete;
    private List<MedicineReminderPrescriptionGroupResponse> prescriptions;
}
