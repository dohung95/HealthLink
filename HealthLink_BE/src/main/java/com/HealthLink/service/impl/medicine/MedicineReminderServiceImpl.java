package com.HealthLink.service.impl.medicine;

import com.HealthLink.dto.medicine.MedicineIntakeCheckRequest;
import com.HealthLink.dto.medicine.MedicineReminderChecklistResponse;
import com.HealthLink.dto.medicine.MedicineReminderItemResponse;
import com.HealthLink.dto.medicine.MedicineReminderPrescriptionGroupResponse;
import com.HealthLink.dto.medicine.MedicineReminderSettingRequest;
import com.HealthLink.dto.medicine.MedicineReminderSettingResponse;
import com.HealthLink.entity.MedicineIntakeCheck;
import com.HealthLink.entity.MedicineReminderDispatchLog;
import com.HealthLink.entity.MedicineReminderSetting;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.PrescriptionItem;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.entity.enums.PrescriptionTiming;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.medicine.MedicineIntakeCheckRepository;
import com.HealthLink.repository.medicine.MedicineReminderDispatchLogRepository;
import com.HealthLink.repository.medicine.MedicineReminderSettingRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.medicine.MedicineReminderService;
import com.HealthLink.service.notification.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class MedicineReminderServiceImpl implements MedicineReminderService {

    public static final LocalTime DEFAULT_MORNING_TIME = LocalTime.of(8, 0);
    public static final LocalTime DEFAULT_AFTERNOON_TIME = LocalTime.of(12, 0);
    public static final LocalTime DEFAULT_EVENING_TIME = LocalTime.of(18, 0);
    public static final java.time.Duration DISPATCH_WINDOW = java.time.Duration.ofMinutes(7);

    private final PatientRepository patientRepository;
    private final PrescriptionHeaderRepository prescriptionHeaderRepository;
    private final MedicineReminderSettingRepository settingRepository;
    private final MedicineIntakeCheckRepository intakeCheckRepository;
    private final MedicineReminderDispatchLogRepository dispatchLogRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public MedicineReminderSettingResponse getSettings(String patientId) {
        return settingRepository.findByPatient_PatientId(patientId)
                .map(this::toSettingsResponse)
                .orElseGet(this::defaultSettingsResponse);
    }

    @Override
    @Transactional
    public MedicineReminderSettingResponse updateSettings(String patientId, MedicineReminderSettingRequest request) {
        validateDistinctTimes(request.getMorningTime(), request.getAfternoonTime(), request.getEveningTime());

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "id", patientId));

        MedicineReminderSetting setting = settingRepository.findByPatient_PatientId(patientId)
                .orElseGet(() -> MedicineReminderSetting.builder()
                        .patient(patient)
                        .createdAt(LocalDateTime.now())
                        .build());

        setting.setMorningTime(request.getMorningTime());
        setting.setAfternoonTime(request.getAfternoonTime());
        setting.setEveningTime(request.getEveningTime());
        setting.setEnabled(request.getEnabled());
        setting.setUpdatedAt(LocalDateTime.now());

        return toSettingsResponse(settingRepository.save(setting));
    }

    @Override
    @Transactional(readOnly = true)
    public MedicineReminderChecklistResponse getChecklist(String patientId, String timing, LocalDate date, LocalDateTime now) {
        String normalizedTiming = PrescriptionTiming.normalize(timing);
        List<PrescriptionHeader> activePrescriptions = prescriptionHeaderRepository.findActiveByPatientWithItems(patientId, now);
        List<MedicineIntakeCheck> checks = intakeCheckRepository.findByPatient_PatientIdAndIntakeDateAndTiming(
                patientId,
                date,
                normalizedTiming
        );
        return buildChecklist(patientId, normalizedTiming, date, now, activePrescriptions, checks);
    }

    @Override
    @Transactional
    public MedicineReminderChecklistResponse updateIntakeCheck(String patientId, MedicineIntakeCheckRequest request, LocalDateTime now) {
        String normalizedTiming = PrescriptionTiming.normalize(request.getTiming());
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "id", patientId));

        PrescriptionItem item = findOwnedActiveItem(patientId, request.getPrescriptionItemId(), normalizedTiming, now);
        PrescriptionHeader prescription = item.getPrescriptionHeader();

        MedicineIntakeCheck check = intakeCheckRepository
                .findByPatient_PatientIdAndPrescriptionItem_PrescriptionItemIdAndIntakeDateAndTiming(
                        patientId,
                        request.getPrescriptionItemId(),
                        request.getIntakeDate(),
                        normalizedTiming
                )
                .orElseGet(() -> MedicineIntakeCheck.builder()
                        .patient(patient)
                        .prescriptionHeader(prescription)
                        .prescriptionItem(item)
                        .intakeDate(request.getIntakeDate())
                        .timing(normalizedTiming)
                        .createdAt(now)
                        .build());

        check.setChecked(request.getChecked());
        check.setCheckedAt(Boolean.TRUE.equals(request.getChecked()) ? now : null);
        check.setUpdatedAt(now);
        intakeCheckRepository.save(check);

        return getChecklist(patientId, normalizedTiming, request.getIntakeDate(), now);
    }

    @Override
    @Transactional
    public MedicineReminderChecklistResponse completeTiming(String patientId, String timing, LocalDate date, LocalDateTime now) {
        String normalizedTiming = PrescriptionTiming.normalize(timing);
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "id", patientId));
        List<PrescriptionHeader> activePrescriptions = prescriptionHeaderRepository.findActiveByPatientWithItems(patientId, now);

        Map<Integer, MedicineIntakeCheck> existing = intakeCheckRepository
                .findByPatient_PatientIdAndIntakeDateAndTiming(patientId, date, normalizedTiming)
                .stream()
                .filter(check -> check.getPrescriptionItem() != null)
                .collect(Collectors.toMap(
                        check -> check.getPrescriptionItem().getPrescriptionItemId(),
                        Function.identity(),
                        (first, second) -> first
                ));

        for (PrescriptionHeader prescription : activePrescriptions) {
            List<PrescriptionItem> items = prescription.getPrescriptionItems() == null
                    ? List.of()
                    : prescription.getPrescriptionItems();
            for (PrescriptionItem item : items) {
                if (!supportsTiming(item, normalizedTiming)) {
                    continue;
                }
                MedicineIntakeCheck check = existing.getOrDefault(
                        item.getPrescriptionItemId(),
                        MedicineIntakeCheck.builder()
                                .patient(patient)
                                .prescriptionHeader(prescription)
                                .prescriptionItem(item)
                                .intakeDate(date)
                                .timing(normalizedTiming)
                                .createdAt(now)
                                .build()
                );
                check.setChecked(true);
                check.setCheckedAt(now);
                check.setUpdatedAt(now);
                intakeCheckRepository.save(check);
            }
        }

        return getChecklist(patientId, normalizedTiming, date, now);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicineReminderSetting> getEnabledSettingsForDispatch() {
        return settingRepository.findEnabledSettingsWithPatientAndUser();
    }

    @Override
    @Transactional
    public boolean dispatchReminderIfDue(MedicineReminderSetting setting, PrescriptionTiming timing, LocalDateTime now) {
        Patient patient = setting.getPatient();
        if (patient == null || patient.getPatientId() == null) {
            return false;
        }

        LocalTime scheduledTime = scheduledTimeFor(setting, timing);
        LocalTime currentTime = now.toLocalTime();
        if (currentTime.isBefore(scheduledTime) || !currentTime.isBefore(scheduledTime.plus(DISPATCH_WINDOW))) {
            return false;
        }

        LocalDate reminderDate = now.toLocalDate();
        String timingName = timing.name();
        if (dispatchLogRepository.existsByPatient_PatientIdAndReminderDateAndTiming(
                patient.getPatientId(),
                reminderDate,
                timingName
        )) {
            return false;
        }

        MedicineReminderChecklistResponse checklist = getChecklist(patient.getPatientId(), timingName, reminderDate, now);
        if (checklist.getTotalCount() == 0 || checklist.isComplete()) {
            return false;
        }

        User user = patient.getUser();
        if (user == null) {
            log.warn("Skipping medicine reminder because patient {} has no user", patient.getPatientId());
            return false;
        }

        String metadata = buildReminderMetadata(checklist);
        notificationService.sendWebSocketNotification(
                user,
                NotificationType.NEW_PRESCRIPTION,
                titleFor(timing),
                messageFor(timing, checklist),
                null,
                "/patient-dashboard/reminders?timing=" + timingName,
                metadata
        );

        dispatchLogRepository.save(MedicineReminderDispatchLog.builder()
                .patient(patient)
                .reminderDate(reminderDate)
                .timing(timingName)
                .scheduledTime(scheduledTime)
                .sentAt(now)
                .build());
        return true;
    }

    private MedicineReminderChecklistResponse buildChecklist(
            String patientId,
            String timing,
            LocalDate date,
            LocalDateTime now,
            List<PrescriptionHeader> activePrescriptions,
            List<MedicineIntakeCheck> checks
    ) {
        Map<Integer, MedicineIntakeCheck> checksByItemId = checks.stream()
                .filter(check -> check.getPrescriptionItem() != null)
                .collect(Collectors.toMap(
                        check -> check.getPrescriptionItem().getPrescriptionItemId(),
                        Function.identity(),
                        (first, second) -> first
                ));

        List<MedicineReminderPrescriptionGroupResponse> groups = new ArrayList<>();
        int totalCount = 0;
        int checkedCount = 0;

        for (PrescriptionHeader prescription : activePrescriptions) {
            List<PrescriptionItem> items = prescription.getPrescriptionItems() == null
                    ? List.of()
                    : prescription.getPrescriptionItems();

            List<MedicineReminderItemResponse> itemResponses = new ArrayList<>();
            for (PrescriptionItem item : items) {
                if (!supportsTiming(item, timing)) {
                    continue;
                }

                MedicineIntakeCheck check = checksByItemId.get(item.getPrescriptionItemId());
                boolean checked = check != null && Boolean.TRUE.equals(check.getChecked());
                if (checked) {
                    checkedCount++;
                }
                totalCount++;

                itemResponses.add(MedicineReminderItemResponse.builder()
                        .prescriptionItemId(item.getPrescriptionItemId())
                        .medicationName(item.getMedicationName())
                        .dosage(item.getDosage())
                        .quantity(item.getQuantity())
                        .unit(item.getUnit())
                        .instructions(item.getInstructions())
                        .notes(item.getNotes())
                        .checked(checked)
                        .checkedAt(check != null ? check.getCheckedAt() : null)
                        .build());
            }

            if (!itemResponses.isEmpty()) {
                groups.add(MedicineReminderPrescriptionGroupResponse.builder()
                        .prescriptionHeaderId(prescription.getPrescriptionHeaderId())
                        .doctorName(prescription.getDoctor() != null ? prescription.getDoctor().getFullName() : null)
                        .validUntil(prescription.getValidUntil())
                        .items(itemResponses)
                        .build());
            }
        }

        return MedicineReminderChecklistResponse.builder()
                .date(date)
                .timing(timing)
                .scheduledTime(scheduledTimeFor(patientId, timing))
                .checkedCount(checkedCount)
                .totalCount(totalCount)
                .complete(totalCount > 0 && checkedCount == totalCount)
                .prescriptions(groups)
                .build();
    }

    private boolean supportsTiming(PrescriptionItem item, String timing) {
        if (item.getTiming() == null || item.getTiming().isBlank()) {
            return false;
        }
        try {
            return PrescriptionTiming.containsTiming(item.getTiming(), timing);
        } catch (IllegalArgumentException ex) {
            log.warn("Skipping prescription item {} with invalid timing '{}'",
                    item.getPrescriptionItemId(), item.getTiming());
            return false;
        }
    }

    private PrescriptionItem findOwnedActiveItem(String patientId, Integer prescriptionItemId, String timing, LocalDateTime now) {
        return prescriptionHeaderRepository.findActiveByPatientWithItems(patientId, now)
                .stream()
                .flatMap(header -> header.getPrescriptionItems() == null
                        ? List.<PrescriptionItem>of().stream()
                        : header.getPrescriptionItems().stream())
                .filter(item -> Objects.equals(item.getPrescriptionItemId(), prescriptionItemId))
                .filter(item -> supportsTiming(item, timing))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("PrescriptionItem", "id", prescriptionItemId));
    }

    private LocalTime scheduledTimeFor(String patientId, String timing) {
        MedicineReminderSettingResponse settings = getSettings(patientId);
        return switch (PrescriptionTiming.from(timing)) {
            case MORNING -> settings.getMorningTime();
            case AFTERNOON -> settings.getAfternoonTime();
            case EVENING -> settings.getEveningTime();
        };
    }

    private LocalTime scheduledTimeFor(MedicineReminderSetting setting, PrescriptionTiming timing) {
        return switch (timing) {
            case MORNING -> setting.getMorningTime();
            case AFTERNOON -> setting.getAfternoonTime();
            case EVENING -> setting.getEveningTime();
        };
    }

    private String titleFor(PrescriptionTiming timing) {
        return switch (timing) {
            case MORNING -> "Morning medication reminder";
            case AFTERNOON -> "Afternoon medication reminder";
            case EVENING -> "Evening medication reminder";
        };
    }

    private String messageFor(PrescriptionTiming timing, MedicineReminderChecklistResponse checklist) {
        String label = timing.name().toLowerCase();
        int prescriptionCount = checklist.getPrescriptions() == null ? 0 : checklist.getPrescriptions().size();
        return "You have " + checklist.getTotalCount()
                + " medicine(s) to take this " + label
                + " from " + prescriptionCount + " active prescription(s).";
    }

    private String buildReminderMetadata(MedicineReminderChecklistResponse checklist) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("timing", checklist.getTiming());
        metadata.put("reminderDate", checklist.getDate());
        metadata.put("scheduledTime", checklist.getScheduledTime());
        metadata.put("prescriptionCount", checklist.getPrescriptions() == null ? 0 : checklist.getPrescriptions().size());
        metadata.put("medicationCount", checklist.getTotalCount());
        metadata.put("action", "OPEN_MEDICINE_REMINDER");
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (Exception ex) {
            log.warn("Failed to serialize medicine reminder metadata: {}", ex.getMessage());
            return null;
        }
    }

    private void validateDistinctTimes(LocalTime morningTime, LocalTime afternoonTime, LocalTime eveningTime) {
        if (morningTime.equals(afternoonTime)
                || morningTime.equals(eveningTime)
                || afternoonTime.equals(eveningTime)) {
            throw new BadRequestException("Reminder times must be distinct");
        }
    }

    private MedicineReminderSettingResponse defaultSettingsResponse() {
        return MedicineReminderSettingResponse.builder()
                .morningTime(DEFAULT_MORNING_TIME)
                .afternoonTime(DEFAULT_AFTERNOON_TIME)
                .eveningTime(DEFAULT_EVENING_TIME)
                .enabled(true)
                .build();
    }

    private MedicineReminderSettingResponse toSettingsResponse(MedicineReminderSetting setting) {
        return MedicineReminderSettingResponse.builder()
                .morningTime(setting.getMorningTime())
                .afternoonTime(setting.getAfternoonTime())
                .eveningTime(setting.getEveningTime())
                .enabled(Boolean.TRUE.equals(setting.getEnabled()))
                .build();
    }
}
