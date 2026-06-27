package com.HealthLink.service.medicine;

import com.HealthLink.dto.medicine.MedicineIntakeCheckRequest;
import com.HealthLink.dto.medicine.MedicineReminderChecklistResponse;
import com.HealthLink.dto.medicine.MedicineReminderSettingRequest;
import com.HealthLink.dto.medicine.MedicineReminderSettingResponse;
import com.HealthLink.entity.MedicineReminderSetting;
import com.HealthLink.entity.enums.PrescriptionTiming;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface MedicineReminderService {

    MedicineReminderSettingResponse getSettings(String patientId);

    MedicineReminderSettingResponse updateSettings(String patientId, MedicineReminderSettingRequest request);

    MedicineReminderChecklistResponse getChecklist(String patientId, String timing, LocalDate date, LocalDateTime now);

    MedicineReminderChecklistResponse updateIntakeCheck(String patientId, MedicineIntakeCheckRequest request, LocalDateTime now);

    MedicineReminderChecklistResponse completeTiming(String patientId, String timing, LocalDate date, LocalDateTime now);

    List<MedicineReminderSetting> getEnabledSettingsForDispatch();

    boolean dispatchReminderIfDue(MedicineReminderSetting setting, PrescriptionTiming timing, LocalDateTime now);
}
