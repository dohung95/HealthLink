package com.HealthLink.service.medicine;

import com.HealthLink.dto.medicine.MedicineIntakeCheckRequest;
import com.HealthLink.dto.medicine.MedicineReminderChecklistResponse;
import com.HealthLink.dto.medicine.MedicineReminderSettingRequest;
import com.HealthLink.dto.medicine.MedicineReminderSettingResponse;

import java.time.LocalDate;
import java.time.LocalDateTime;

public interface MedicineReminderService {

    MedicineReminderSettingResponse getSettings(String patientId);

    MedicineReminderSettingResponse updateSettings(String patientId, MedicineReminderSettingRequest request);

    MedicineReminderChecklistResponse getChecklist(String patientId, String timing, LocalDate date, LocalDateTime now);

    void updateIntakeCheck(String patientId, MedicineIntakeCheckRequest request, LocalDateTime now);

    MedicineReminderChecklistResponse completeTiming(String patientId, String timing, LocalDate date, LocalDateTime now);
}
