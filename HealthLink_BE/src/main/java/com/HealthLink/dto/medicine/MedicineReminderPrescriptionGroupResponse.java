package com.HealthLink.dto.medicine;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class MedicineReminderPrescriptionGroupResponse {
    private Integer prescriptionHeaderId;
    private String doctorName;
    private LocalDateTime validUntil;
    private List<MedicineReminderItemResponse> items;
}
