package com.HealthLink.service.impl.medicine;

import com.HealthLink.dto.medicine.MedicineIntakeCheckRequest;
import com.HealthLink.dto.medicine.MedicineReminderChecklistResponse;
import com.HealthLink.dto.medicine.MedicineReminderItemResponse;
import com.HealthLink.dto.medicine.MedicineReminderPrescriptionGroupResponse;
import com.HealthLink.dto.medicine.MedicineReminderSettingRequest;
import com.HealthLink.dto.medicine.MedicineReminderSettingResponse;
import com.HealthLink.entity.MedicineIntakeCheck;
import com.HealthLink.entity.MedicineReminderSetting;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.PrescriptionItem;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.medicine.MedicineIntakeCheckRepository;
import com.HealthLink.repository.medicine.MedicineReminderSettingRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.medicine.MedicineReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class MedicineReminderServiceImpl implements MedicineReminderService {

    private final PatientRepository patientRepository;
    private final PrescriptionHeaderRepository prescriptionHeaderRepository;
    private final MedicineReminderSettingRepository settingRepository;
    private final MedicineIntakeCheckRepository intakeCheckRepository;

    private static final LocalTime DEFAULT_MORNING = LocalTime.of(8, 0);
    private static final LocalTime DEFAULT_AFTERNOON = LocalTime.of(12, 0);
    private static final LocalTime DEFAULT_EVENING = LocalTime.of(18, 0);

    @Override
    @Transactional(readOnly = true)
    public MedicineReminderSettingResponse getSettings(String patientId) {
        return settingRepository.findByPatient_PatientId(patientId)
                .map(setting -> MedicineReminderSettingResponse.builder()
                        .morningTime(setting.getMorningTime())
                        .afternoonTime(setting.getAfternoonTime())
                        .eveningTime(setting.getEveningTime())
                        .enabled(setting.getEnabled())
                        .build())
                .orElse(MedicineReminderSettingResponse.builder()
                        .morningTime(DEFAULT_MORNING)
                        .afternoonTime(DEFAULT_AFTERNOON)
                        .eveningTime(DEFAULT_EVENING)
                        .enabled(true)
                        .build());
    }

    @Override
    public MedicineReminderSettingResponse updateSettings(String patientId, MedicineReminderSettingRequest request) {
        Set<LocalTime> distinctTimes = new HashSet<>();
        distinctTimes.add(request.getMorningTime());
        distinctTimes.add(request.getAfternoonTime());
        distinctTimes.add(request.getEveningTime());
        if (distinctTimes.size() < 3) {
            throw new BadRequestException("Reminder times must be distinct");
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "patientId", patientId));

        MedicineReminderSetting setting = settingRepository.findByPatient_PatientId(patientId)
                .orElse(MedicineReminderSetting.builder()
                        .patient(patient)
                        .build());

        setting.setMorningTime(request.getMorningTime());
        setting.setAfternoonTime(request.getAfternoonTime());
        setting.setEveningTime(request.getEveningTime());
        setting.setEnabled(request.getEnabled());
        setting.setUpdatedAt(LocalDateTime.now());

        settingRepository.save(setting);

        return toSettingResponse(setting);
    }

    @Override
    @Transactional(readOnly = true)
    public MedicineReminderChecklistResponse getChecklist(String patientId, String timing, LocalDate date, LocalDateTime now) {
        MedicineReminderSetting setting = settingRepository.findByPatient_PatientId(patientId)
                .orElse(null);

        LocalTime scheduledTime = resolveScheduledTime(timing, setting);

        List<PrescriptionHeader> prescriptions = prescriptionHeaderRepository
                .findActiveByPatientWithItems(patientId, now);

        List<MedicineIntakeCheck> existingChecks = intakeCheckRepository
                .findByPatient_PatientIdAndIntakeDateAndTiming(patientId, date, timing);

        Set<Integer> checkedItemIds = existingChecks.stream()
                .filter(MedicineIntakeCheck::getChecked)
                .map(check -> check.getPrescriptionItem().getPrescriptionItemId())
                .collect(Collectors.toSet());

        Map<Integer, LocalDateTime> checkedAtMap = existingChecks.stream()
                .filter(c -> c.getChecked() && c.getCheckedAt() != null)
                .collect(Collectors.toMap(
                        c -> c.getPrescriptionItem().getPrescriptionItemId(),
                        MedicineIntakeCheck::getCheckedAt
                ));

        int totalCount = 0;
        int checkedCount = 0;
        List<MedicineReminderPrescriptionGroupResponse> grouped = new ArrayList<>();

        for (PrescriptionHeader header : prescriptions) {
            List<PrescriptionItem> matchedItems = header.getPrescriptionItems().stream()
                    .filter(item -> item.getTiming() != null && item.getTiming().contains(timing))
                    .toList();

            if (matchedItems.isEmpty()) continue;

            List<MedicineReminderItemResponse> itemResponses = new ArrayList<>();
            for (PrescriptionItem item : matchedItems) {
                Integer itemId = item.getPrescriptionItemId();
                boolean isChecked = checkedItemIds.contains(itemId);
                itemResponses.add(MedicineReminderItemResponse.builder()
                        .prescriptionItemId(itemId)
                        .medicationName(item.getMedicationName())
                        .dosage(item.getDosage())
                        .quantity(item.getQuantity())
                        .unit(item.getUnit())
                        .instructions(item.getInstructions())
                        .notes(item.getNotes())
                        .checked(isChecked)
                        .checkedAt(checkedAtMap.get(itemId))
                        .build());
                totalCount++;
                if (isChecked) checkedCount++;
            }

            grouped.add(MedicineReminderPrescriptionGroupResponse.builder()
                    .prescriptionHeaderId(header.getPrescriptionHeaderId())
                    .doctorName(header.getDoctor() != null ? header.getDoctor().getFullName() : null)
                    .validUntil(header.getValidUntil())
                    .items(itemResponses)
                    .build());
        }

        return MedicineReminderChecklistResponse.builder()
                .date(date)
                .timing(timing)
                .scheduledTime(scheduledTime)
                .totalCount(totalCount)
                .checkedCount(checkedCount)
                .complete(totalCount > 0 && checkedCount == totalCount)
                .prescriptions(grouped)
                .build();
    }

    @Override
    public void updateIntakeCheck(String patientId, MedicineIntakeCheckRequest request, LocalDateTime now) {
        List<PrescriptionHeader> activePrescriptions = prescriptionHeaderRepository
                .findActiveByPatientWithItems(patientId, now);

        boolean itemBelongsToPatient = activePrescriptions.stream()
                .flatMap(h -> h.getPrescriptionItems().stream())
                .anyMatch(item -> item.getPrescriptionItemId().equals(request.getPrescriptionItemId()));

        if (!itemBelongsToPatient) {
            throw new ResourceNotFoundException(
                    "Prescription item not found for patient", "prescriptionItemId", request.getPrescriptionItemId()
            );
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "patientId", patientId));

        MedicineIntakeCheck check = intakeCheckRepository
                .findByPatient_PatientIdAndPrescriptionItem_PrescriptionItemIdAndIntakeDateAndTiming(
                        patientId, request.getPrescriptionItemId(), request.getIntakeDate(), request.getTiming())
                .orElse(MedicineIntakeCheck.builder()
                        .patient(patient)
                        .intakeDate(request.getIntakeDate())
                        .timing(request.getTiming())
                        .build());

        if (check.getPrescriptionItem() == null) {
            PrescriptionItem item = activePrescriptions.stream()
                    .flatMap(h -> h.getPrescriptionItems().stream())
                    .filter(i -> i.getPrescriptionItemId().equals(request.getPrescriptionItemId()))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("PrescriptionItem", "id", request.getPrescriptionItemId()));

            check.setPrescriptionItem(item);
            check.setPrescriptionHeader(item.getPrescriptionHeader());
        }

        check.setChecked(request.getChecked());
        check.setCheckedAt(request.getChecked() ? now : null);
        check.setUpdatedAt(LocalDateTime.now());

        intakeCheckRepository.save(check);
    }

    @Override
    public MedicineReminderChecklistResponse completeTiming(String patientId, String timing, LocalDate date, LocalDateTime now) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "patientId", patientId));

        MedicineReminderSetting setting = settingRepository.findByPatient_PatientId(patientId)
                .orElse(null);

        LocalTime scheduledTime = resolveScheduledTime(timing, setting);

        List<PrescriptionHeader> prescriptions = prescriptionHeaderRepository
                .findActiveByPatientWithItems(patientId, now);

        List<MedicineIntakeCheck> existingChecks = intakeCheckRepository
                .findByPatient_PatientIdAndIntakeDateAndTiming(patientId, date, timing);

        Set<Integer> alreadyCheckedItemIds = existingChecks.stream()
                .filter(MedicineIntakeCheck::getChecked)
                .map(check -> check.getPrescriptionItem().getPrescriptionItemId())
                .collect(Collectors.toSet());

        int totalCount = 0;
        int checkedCount = alreadyCheckedItemIds.size();
        List<MedicineReminderPrescriptionGroupResponse> grouped = new ArrayList<>();

        for (PrescriptionHeader header : prescriptions) {
            List<PrescriptionItem> matchedItems = header.getPrescriptionItems().stream()
                    .filter(item -> item.getTiming() != null && item.getTiming().contains(timing))
                    .toList();

            if (matchedItems.isEmpty()) continue;

            List<MedicineReminderItemResponse> itemResponses = new ArrayList<>();
            for (PrescriptionItem item : matchedItems) {
                Integer itemId = item.getPrescriptionItemId();

                if (!alreadyCheckedItemIds.contains(itemId)) {
                    MedicineIntakeCheck check = MedicineIntakeCheck.builder()
                            .patient(patient)
                            .prescriptionHeader(header)
                            .prescriptionItem(item)
                            .intakeDate(date)
                            .timing(timing)
                            .checked(true)
                            .checkedAt(now)
                            .build();
                    intakeCheckRepository.save(check);
                    checkedCount++;
                }

                itemResponses.add(MedicineReminderItemResponse.builder()
                        .prescriptionItemId(itemId)
                        .medicationName(item.getMedicationName())
                        .dosage(item.getDosage())
                        .quantity(item.getQuantity())
                        .unit(item.getUnit())
                        .instructions(item.getInstructions())
                        .notes(item.getNotes())
                        .checked(true)
                        .checkedAt(now)
                        .build());
                totalCount++;
            }

            grouped.add(MedicineReminderPrescriptionGroupResponse.builder()
                    .prescriptionHeaderId(header.getPrescriptionHeaderId())
                    .doctorName(header.getDoctor() != null ? header.getDoctor().getFullName() : null)
                    .validUntil(header.getValidUntil())
                    .items(itemResponses)
                    .build());
        }

        return MedicineReminderChecklistResponse.builder()
                .date(date)
                .timing(timing)
                .scheduledTime(scheduledTime)
                .totalCount(totalCount)
                .checkedCount(checkedCount)
                .complete(true)
                .prescriptions(grouped)
                .build();
    }

    private LocalTime resolveScheduledTime(String timing, MedicineReminderSetting setting) {
        if (setting == null) {
            return switch (timing) {
                case "MORNING" -> DEFAULT_MORNING;
                case "AFTERNOON" -> DEFAULT_AFTERNOON;
                case "EVENING" -> DEFAULT_EVENING;
                default -> LocalTime.NOON;
            };
        }
        return switch (timing) {
            case "MORNING" -> setting.getMorningTime();
            case "AFTERNOON" -> setting.getAfternoonTime();
            case "EVENING" -> setting.getEveningTime();
            default -> LocalTime.NOON;
        };
    }

    private static MedicineReminderSettingResponse toSettingResponse(MedicineReminderSetting setting) {
        return MedicineReminderSettingResponse.builder()
                .morningTime(setting.getMorningTime())
                .afternoonTime(setting.getAfternoonTime())
                .eveningTime(setting.getEveningTime())
                .enabled(setting.getEnabled())
                .build();
    }
}
