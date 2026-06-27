package com.HealthLink.service.impl.medicine;

import com.HealthLink.dto.medicine.MedicineIntakeCheckRequest;
import com.HealthLink.dto.medicine.MedicineReminderChecklistResponse;
import com.HealthLink.dto.medicine.MedicineReminderSettingRequest;
import com.HealthLink.dto.medicine.MedicineReminderSettingResponse;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.MedicineIntakeCheck;
import com.HealthLink.entity.MedicineReminderSetting;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.PrescriptionItem;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.medicine.MedicineIntakeCheckRepository;
import com.HealthLink.repository.medicine.MedicineReminderDispatchLogRepository;
import com.HealthLink.repository.medicine.MedicineReminderSettingRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MedicineReminderServiceImplTest {

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private PrescriptionHeaderRepository prescriptionHeaderRepository;

    @Mock
    private MedicineReminderSettingRepository settingRepository;

    @Mock
    private MedicineIntakeCheckRepository intakeCheckRepository;

    @Mock
    private MedicineReminderDispatchLogRepository dispatchLogRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private MedicineReminderServiceImpl service;

    @Test
    void getSettings_shouldReturnDefaultsWhenPatientHasNoSettings() {
        when(settingRepository.findByPatient_PatientId("patient-1")).thenReturn(Optional.empty());

        MedicineReminderSettingResponse response = service.getSettings("patient-1");

        assertThat(response.getMorningTime()).isEqualTo(LocalTime.of(8, 0));
        assertThat(response.getAfternoonTime()).isEqualTo(LocalTime.of(12, 0));
        assertThat(response.getEveningTime()).isEqualTo(LocalTime.of(18, 0));
        assertThat(response.getEnabled()).isTrue();
    }

    @Test
    void updateSettings_shouldRejectDuplicateTimes() {
        MedicineReminderSettingRequest request = new MedicineReminderSettingRequest();
        request.setMorningTime(LocalTime.of(8, 0));
        request.setAfternoonTime(LocalTime.of(8, 0));
        request.setEveningTime(LocalTime.of(18, 0));
        request.setEnabled(true);

        assertThatThrownBy(() -> service.updateSettings("patient-1", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Reminder times must be distinct");

        verify(settingRepository, never()).save(any());
    }

    @Test
    void updateSettings_shouldCreateSettingsWhenMissing() {
        Patient patient = patient("patient-1");
        when(patientRepository.findById("patient-1")).thenReturn(Optional.of(patient));
        when(settingRepository.findByPatient_PatientId("patient-1")).thenReturn(Optional.empty());
        when(settingRepository.save(any(MedicineReminderSetting.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MedicineReminderSettingRequest request = new MedicineReminderSettingRequest();
        request.setMorningTime(LocalTime.of(7, 30));
        request.setAfternoonTime(LocalTime.of(12, 30));
        request.setEveningTime(LocalTime.of(19, 0));
        request.setEnabled(true);

        MedicineReminderSettingResponse response = service.updateSettings("patient-1", request);

        ArgumentCaptor<MedicineReminderSetting> captor = ArgumentCaptor.forClass(MedicineReminderSetting.class);
        verify(settingRepository).save(captor.capture());
        assertThat(captor.getValue().getPatient()).isEqualTo(patient);
        assertThat(response.getMorningTime()).isEqualTo(LocalTime.of(7, 30));
        assertThat(response.getEnabled()).isTrue();
    }

    @Test
    void getTodayChecklist_shouldGroupActivePrescriptionItemsByTiming() {
        LocalDateTime now = LocalDateTime.of(2026, 6, 25, 7, 0);
        PrescriptionHeader first = prescription(124, "Dr. Nguyen", List.of(
                item(1001, "MORNING", "Amlodipine", "5 mg"),
                item(1002, "MORNING,EVENING", "Vitamin D", "1 capsule")
        ));
        PrescriptionHeader second = prescription(127, "Dr. Tran", List.of(
                item(1003, "AFTERNOON", "Cetirizine", "10 mg")
        ));

        when(settingRepository.findByPatient_PatientId("patient-1")).thenReturn(Optional.empty());
        when(prescriptionHeaderRepository.findActiveByPatientWithItems("patient-1", now))
                .thenReturn(List.of(first, second));
        when(intakeCheckRepository.findByPatient_PatientIdAndIntakeDateAndTiming(
                "patient-1",
                LocalDate.of(2026, 6, 25),
                "MORNING"
        )).thenReturn(List.of(
                MedicineIntakeCheck.builder()
                        .prescriptionItem(item(1002, "MORNING,EVENING", "Vitamin D", "1 capsule"))
                        .checked(true)
                        .checkedAt(LocalDateTime.of(2026, 6, 25, 6, 45))
                        .build()
        ));

        MedicineReminderChecklistResponse response = service.getChecklist(
                "patient-1",
                "MORNING",
                LocalDate.of(2026, 6, 25),
                now
        );

        assertThat(response.getTiming()).isEqualTo("MORNING");
        assertThat(response.getScheduledTime()).isEqualTo(LocalTime.of(8, 0));
        assertThat(response.getTotalCount()).isEqualTo(2);
        assertThat(response.getCheckedCount()).isEqualTo(1);
        assertThat(response.isComplete()).isFalse();
        assertThat(response.getPrescriptions()).hasSize(1);
        assertThat(response.getPrescriptions().getFirst().getPrescriptionHeaderId()).isEqualTo(124);
        assertThat(response.getPrescriptions().getFirst().getItems())
                .extracting("medicationName")
                .containsExactly("Amlodipine", "Vitamin D");
    }

    @Test
    void updateIntakeCheck_shouldRejectItemOutsidePatientPrescriptions() {
        LocalDateTime now = LocalDateTime.of(2026, 6, 25, 8, 0);
        when(patientRepository.findById("patient-1")).thenReturn(Optional.of(patient("patient-1")));
        when(prescriptionHeaderRepository.findActiveByPatientWithItems("patient-1", now)).thenReturn(List.of());

        MedicineIntakeCheckRequest request = new MedicineIntakeCheckRequest();
        request.setPrescriptionItemId(1001);
        request.setTiming("MORNING");
        request.setIntakeDate(LocalDate.of(2026, 6, 25));
        request.setChecked(true);

        assertThatThrownBy(() -> service.updateIntakeCheck("patient-1", request, now))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateIntakeCheck_shouldCreateCheckedRow() {
        LocalDateTime now = LocalDateTime.of(2026, 6, 25, 8, 0);
        Patient patient = patient("patient-1");
        PrescriptionItem item = item(1001, "MORNING", "Amlodipine", "5 mg");
        PrescriptionHeader prescription = prescription(124, "Dr. Nguyen", List.of(item));
        prescription.setPatient(patient);
        item.setPrescriptionHeader(prescription);

        when(patientRepository.findById("patient-1")).thenReturn(Optional.of(patient));
        when(prescriptionHeaderRepository.findActiveByPatientWithItems("patient-1", now)).thenReturn(List.of(prescription));
        when(intakeCheckRepository.findByPatient_PatientIdAndPrescriptionItem_PrescriptionItemIdAndIntakeDateAndTiming(
                "patient-1",
                1001,
                LocalDate.of(2026, 6, 25),
                "MORNING"
        )).thenReturn(Optional.empty());
        when(intakeCheckRepository.save(any(MedicineIntakeCheck.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MedicineIntakeCheckRequest request = new MedicineIntakeCheckRequest();
        request.setPrescriptionItemId(1001);
        request.setTiming("MORNING");
        request.setIntakeDate(LocalDate.of(2026, 6, 25));
        request.setChecked(true);

        service.updateIntakeCheck("patient-1", request, now);

        ArgumentCaptor<MedicineIntakeCheck> captor = ArgumentCaptor.forClass(MedicineIntakeCheck.class);
        verify(intakeCheckRepository).save(captor.capture());
        assertThat(captor.getValue().getChecked()).isTrue();
        assertThat(captor.getValue().getCheckedAt()).isEqualTo(now);
        assertThat(captor.getValue().getTiming()).isEqualTo("MORNING");
    }

    @Test
    void completeTiming_shouldCreateChecksForEveryCurrentItem() {
        LocalDateTime now = LocalDateTime.of(2026, 6, 25, 8, 0);
        Patient patient = patient("patient-1");
        PrescriptionItem first = item(1001, "MORNING", "Amlodipine", "5 mg");
        PrescriptionItem second = item(1002, "MORNING,EVENING", "Vitamin D", "1 capsule");
        PrescriptionHeader prescription = prescription(124, "Dr. Nguyen", List.of(first, second));
        prescription.setPatient(patient);
        first.setPrescriptionHeader(prescription);
        second.setPrescriptionHeader(prescription);

        when(patientRepository.findById("patient-1")).thenReturn(Optional.of(patient));
        when(settingRepository.findByPatient_PatientId("patient-1")).thenReturn(Optional.empty());
        when(prescriptionHeaderRepository.findActiveByPatientWithItems("patient-1", now)).thenReturn(List.of(prescription));
        List<MedicineIntakeCheck> savedChecks = new ArrayList<>();
        when(intakeCheckRepository.findByPatient_PatientIdAndIntakeDateAndTiming(
                "patient-1",
                LocalDate.of(2026, 6, 25),
                "MORNING"
        )).thenAnswer(invocation -> new ArrayList<>(savedChecks));
        when(intakeCheckRepository.save(any(MedicineIntakeCheck.class))).thenAnswer(invocation -> {
            MedicineIntakeCheck check = invocation.getArgument(0);
            savedChecks.add(check);
            return check;
        });

        MedicineReminderChecklistResponse response = service.completeTiming(
                "patient-1",
                "MORNING",
                LocalDate.of(2026, 6, 25),
                now
        );

        verify(intakeCheckRepository, org.mockito.Mockito.times(2)).save(any(MedicineIntakeCheck.class));
        assertThat(response.getTotalCount()).isEqualTo(2);
        assertThat(response.getCheckedCount()).isEqualTo(2);
        assertThat(response.isComplete()).isTrue();
    }

    private Patient patient(String patientId) {
        return Patient.builder()
                .patientId(patientId)
                .fullName("Patient One")
                .build();
    }

    private PrescriptionHeader prescription(Integer id, String doctorName, List<PrescriptionItem> items) {
        PrescriptionHeader header = PrescriptionHeader.builder()
                .prescriptionHeaderId(id)
                .patient(patient("patient-1"))
                .doctor(Doctor.builder().doctorId("doctor-1").fullName(doctorName).build())
                .validUntil(LocalDateTime.of(2026, 6, 30, 23, 59))
                .issueDate(LocalDateTime.of(2026, 6, 20, 9, 0))
                .prescriptionItems(items)
                .build();
        items.forEach(item -> item.setPrescriptionHeader(header));
        return header;
    }

    private PrescriptionItem item(Integer id, String timing, String name, String dosage) {
        return PrescriptionItem.builder()
                .prescriptionItemId(id)
                .timing(timing)
                .medicationName(name)
                .dosage(dosage)
                .quantity(1)
                .unit("tablet")
                .instructions("after food")
                .notes("")
                .build();
    }
}
