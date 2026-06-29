package com.HealthLink.service.impl.followup;

import com.HealthLink.dto.response.CompleteAppointmentResponse;
import com.HealthLink.dto.response.FollowUpSlotsResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.entity.enums.ScheduleExceptionType;
import com.HealthLink.entity.Invoice;
import com.HealthLink.entity.Medicine;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.PrescriptionItem;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.admin.DoctorScheduleExceptionRepository;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.repository.payment.InvoiceRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.payment.CommissionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FollowUpAppointmentServiceImplTest {

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private ConsultationRepository consultationRepository;

    @Mock
    private DoctorRepository doctorRepository;

    @Mock
    private DoctorScheduleRepository scheduleRepository;

    @Mock
    private DoctorScheduleExceptionRepository exceptionRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private PrescriptionHeaderRepository prescriptionHeaderRepository;

    @Mock
    private CommissionService commissionService;

    @InjectMocks
    private FollowUpAppointmentServiceImpl followUpAppointmentService;

    @Test
    void getSlots_shouldReturnSlotsBasedOnDoctorSchedule() {
        LocalDate date = LocalDate.now().plusDays(2);
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        Doctor doctor = doctor();
        DoctorSchedule schedule = DoctorSchedule.builder()
                .scheduleId(1)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .slotDuration(60)
                .available(true)
                .build();

        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(exceptionRepository.findByDoctor_DoctorIdAndExceptionDate("doctor-1", date))
                .thenReturn(Optional.empty());
        when(scheduleRepository.findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue("doctor-1", dayOfWeek))
                .thenReturn(List.of(schedule));
        when(appointmentRepository.findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                eq("doctor-1"), eq("CANCELLED"), any(), any()))
                .thenReturn(List.of());

        FollowUpSlotsResponse response = followUpAppointmentService.getSlots("doctor-1", date);

        assertThat(response.getSlots()).hasSize(8);
        assertThat(response.getSlots().getFirst().getStartTime()).isEqualTo("09:00");
        assertThat(response.getSlots().getLast().getStartTime()).isEqualTo("16:00");
        assertThat(response.getSlots())
                .noneMatch(slot -> "17:00".equals(slot.getStartTime()));
    }

    @Test
    void getSlots_shouldReturnEmptyForDayOff() {
        LocalDate date = LocalDate.now().plusDays(2);
        Doctor doctor = doctor();

        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(exceptionRepository.findByDoctor_DoctorIdAndExceptionDate("doctor-1", date))
                .thenReturn(Optional.of(
                        com.HealthLink.entity.DoctorScheduleException.builder()
                                .exceptionType(ScheduleExceptionType.DAY_OFF)
                                .exceptionDate(date)
                                .build()
                ));

        FollowUpSlotsResponse response = followUpAppointmentService.getSlots("doctor-1", date);

        assertThat(response.getSlots()).isEmpty();
    }

    @Test
    void getSlots_shouldMarkOverlappingAppointmentAsBooked() {
        LocalDate date = LocalDate.now().plusDays(2);
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        Doctor doctor = doctor();
        DoctorSchedule schedule = DoctorSchedule.builder()
                .scheduleId(1)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .slotDuration(60)
                .available(true)
                .build();

        Appointment booked = appointment(2, date.atTime(10, 30), "SCHEDULED");
        booked.setEndTime(date.atTime(11, 30));

        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(exceptionRepository.findByDoctor_DoctorIdAndExceptionDate("doctor-1", date))
                .thenReturn(Optional.empty());
        when(scheduleRepository.findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue("doctor-1", dayOfWeek))
                .thenReturn(List.of(schedule));
        when(appointmentRepository.findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                eq("doctor-1"), eq("CANCELLED"), any(), any()))
                .thenReturn(List.of(booked));

        FollowUpSlotsResponse response = followUpAppointmentService.getSlots("doctor-1", date);

        assertThat(response.getSlots())
                .filteredOn(slot -> slot.getStartTime().equals("10:00") || slot.getStartTime().equals("11:00"))
                .allMatch(slot -> "BOOKED".equals(slot.getStatus()) && !slot.isSelectable());
    }

    @Test
    void validateFollowUpSlot_shouldAcceptSlotWithinSchedule() {
        LocalDate date = LocalDate.now().plusDays(2);
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        Doctor doctor = doctor();
        DoctorSchedule schedule = DoctorSchedule.builder()
                .scheduleId(1)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(21, 0))
                .slotDuration(60)
                .available(true)
                .build();

        Appointment appointment = appointment(1, LocalDateTime.now().minusHours(1), "SCHEDULED");
        appointment.setDoctor(doctor);

        when(exceptionRepository.findByDoctor_DoctorIdAndExceptionDate("doctor-1", date))
                .thenReturn(Optional.empty());
        when(scheduleRepository.findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue("doctor-1", dayOfWeek))
                .thenReturn(List.of(schedule));
        when(appointmentRepository.findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                eq("doctor-1"), eq("CANCELLED"), any(), any()))
                .thenReturn(List.of());

        assertThatCode(() -> followUpAppointmentService.validateFollowUpSlot(appointment, date.atTime(20, 0)))
                .doesNotThrowAnyException();
    }

    @Test
    void validateFollowUpSlot_shouldRejectSlotOutsideSchedule() {
        LocalDate date = LocalDate.now().plusDays(2);
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        Doctor doctor = doctor();
        DoctorSchedule schedule = DoctorSchedule.builder()
                .scheduleId(1)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .slotDuration(60)
                .available(true)
                .build();

        Appointment appointment = appointment(1, LocalDateTime.now().minusHours(1), "SCHEDULED");
        appointment.setDoctor(doctor);

        when(exceptionRepository.findByDoctor_DoctorIdAndExceptionDate("doctor-1", date))
                .thenReturn(Optional.empty());
        when(scheduleRepository.findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue("doctor-1", dayOfWeek))
                .thenReturn(List.of(schedule));
        when(appointmentRepository.findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                eq("doctor-1"), eq("CANCELLED"), any(), any()))
                .thenReturn(List.of());

        assertThatThrownBy(() -> followUpAppointmentService.validateFollowUpSlot(appointment, date.atTime(21, 0)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("The selected follow-up slot is not available");
    }

    @Test
    void completeAppointment_shouldCreateFollowUpAndCopyPrescription() {
        LocalDate date = LocalDate.now().plusDays(3);
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        Doctor doctor = doctor();
        DoctorSchedule schedule = DoctorSchedule.builder()
                .scheduleId(1)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(21, 0))
                .slotDuration(60)
                .available(true)
                .build();

        Appointment sourceAppointment = appointment(10, LocalDateTime.now().minusHours(1), "IN_CONSULTATION");
        sourceAppointment.setInvoice(paidInvoice(sourceAppointment));
        Consultation consultation = Consultation.builder()
                .consultationId(20)
                .appointment(sourceAppointment)
                .startTime(LocalDateTime.now().minusMinutes(30))
                .followUpDate(date.atTime(20, 0))
                .followUpNotes("Return for review")
                .build();
        sourceAppointment.setConsultation(consultation);

        PrescriptionHeader sourcePrescription = sourcePrescription(sourceAppointment);

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(sourceAppointment));
        when(exceptionRepository.findByDoctor_DoctorIdAndExceptionDate("doctor-1", date))
                .thenReturn(Optional.empty());
        when(scheduleRepository.findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue("doctor-1", dayOfWeek))
                .thenReturn(List.of(schedule));
        when(appointmentRepository.findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                eq("doctor-1"), eq("CANCELLED"), any(), any()))
                .thenReturn(List.of());
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment saved = invocation.getArgument(0);
            if (saved.getAppointmentId() == null) {
                saved.setAppointmentId(99);
            }
            return saved;
        });
        when(consultationRepository.save(any(Consultation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(prescriptionHeaderRepository.findByAppointment_AppointmentIdOrderByIssueDateDescPrescriptionHeaderIdDesc(10))
                .thenReturn(List.of(sourcePrescription));
        when(prescriptionHeaderRepository.save(any(PrescriptionHeader.class))).thenAnswer(invocation -> {
            PrescriptionHeader saved = invocation.getArgument(0);
            saved.setPrescriptionHeaderId(77);
            return saved;
        });

        CompleteAppointmentResponse response = followUpAppointmentService.completeAppointment(10, true);

        assertThat(response.isCreatedFollowUp()).isTrue();
        assertThat(response.getFollowUpAppointment().getAppointmentId()).isEqualTo(99);
        assertThat(response.getFollowUpPrescriptionHeaderId()).isEqualTo(77);
        assertThat(consultation.getFollowUpAppointmentId()).isEqualTo(99);

        ArgumentCaptor<PrescriptionHeader> prescriptionCaptor = ArgumentCaptor.forClass(PrescriptionHeader.class);
        verify(prescriptionHeaderRepository).save(prescriptionCaptor.capture());
        verify(commissionService).processConsultationCommission(sourceAppointment.getInvoice());
        PrescriptionHeader copiedPrescription = prescriptionCaptor.getValue();

        assertThat(copiedPrescription.getSourceAppointmentId()).isEqualTo(10);
        assertThat(copiedPrescription.getSourcePrescriptionHeaderId()).isEqualTo(55);
        assertThat(copiedPrescription.getAppointment().getAppointmentId()).isEqualTo(99);
        assertThat(copiedPrescription.getPrescriptionItems()).hasSize(1);
        assertThat(copiedPrescription.getPrescriptionItems().getFirst().getMedicationName())
                .isEqualTo("Amlodipine 5mg");
        verify(appointmentRepository, times(2)).save(any(Appointment.class));
    }

    @Test
    void completeAppointment_shouldNotCreateFollowUpWithoutPendingFollowUpDate() {
        Appointment sourceAppointment = appointment(10, LocalDateTime.now().minusHours(1), "IN_CONSULTATION");
        sourceAppointment.setInvoice(paidInvoice(sourceAppointment));
        Consultation consultation = Consultation.builder()
                .consultationId(20)
                .appointment(sourceAppointment)
                .startTime(LocalDateTime.now().minusMinutes(30))
                .build();
        sourceAppointment.setConsultation(consultation);

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(sourceAppointment));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CompleteAppointmentResponse response = followUpAppointmentService.completeAppointment(10, false);

        assertThat(response.isCreatedFollowUp()).isFalse();
        assertThat(response.getFollowUpAppointment()).isNull();
        assertThat(sourceAppointment.getStatus()).isEqualTo("COMPLETED");
        verify(appointmentRepository).save(sourceAppointment);
        verify(commissionService).processConsultationCommission(sourceAppointment.getInvoice());
        verify(consultationRepository).save(consultation);
        verify(prescriptionHeaderRepository, never())
                .findByAppointment_AppointmentIdOrderByIssueDateDescPrescriptionHeaderIdDesc(any());
    }

    @Test
    void completeAppointment_shouldBeIdempotentWhenAlreadyCompleted() {
        Appointment completed = appointment(10, LocalDateTime.now().minusHours(1), "COMPLETED");
        Appointment followUp = appointment(99, LocalDate.now().plusDays(2).atTime(9, 0), "SCHEDULED");
        Consultation consultation = Consultation.builder()
                .consultationId(20)
                .appointment(completed)
                .followUpAppointmentId(99)
                .followUpDate(followUp.getAppointmentTime())
                .build();
        completed.setConsultation(consultation);

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(completed));
        when(appointmentRepository.findById(99)).thenReturn(Optional.of(followUp));

        CompleteAppointmentResponse response = followUpAppointmentService.completeAppointment(10, true);

        assertThat(response.isCreatedFollowUp()).isFalse();
        assertThat(response.getFollowUpAppointment().getAppointmentId()).isEqualTo(99);
        verify(appointmentRepository, never()).save(any(Appointment.class));
    }

    @Test
    void completeAppointment_shouldRejectUnpaidAppointment() {
        Appointment sourceAppointment = appointment(10, LocalDateTime.now().minusHours(1), "IN_CONSULTATION");
        sourceAppointment.setInvoice(Invoice.builder()
                .invoiceId(1)
                .appointment(sourceAppointment)
                .patient(sourceAppointment.getPatient())
                .amount(new BigDecimal("100.00"))
                .status("Pending")
                .build());
        sourceAppointment.setConsultation(Consultation.builder()
                .consultationId(20)
                .appointment(sourceAppointment)
                .startTime(LocalDateTime.now().minusMinutes(30))
                .build());

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(sourceAppointment));

        assertThatThrownBy(() -> followUpAppointmentService.completeAppointment(10, true))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Appointment must be paid before it can be completed");

        verify(appointmentRepository, never()).save(any(Appointment.class));
        verify(commissionService, never()).processConsultationCommission(any(Invoice.class));
    }

    @Test
    void completeAppointment_shouldRejectBeforeConsultationStarts() {
        Appointment sourceAppointment = appointment(10, LocalDateTime.now().minusHours(1), "IN_CONSULTATION");
        sourceAppointment.setInvoice(paidInvoice(sourceAppointment));

        when(appointmentRepository.findById(10)).thenReturn(Optional.of(sourceAppointment));

        assertThatThrownBy(() -> followUpAppointmentService.completeAppointment(10, false))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Consultation must be started before appointment can be completed");
        verify(appointmentRepository, never()).save(any(Appointment.class));
        verify(commissionService, never()).processConsultationCommission(any(Invoice.class));
    }

    private Appointment appointment(Integer id, LocalDateTime appointmentTime, String status) {
        return Appointment.builder()
                .appointmentId(id)
                .appointmentTime(appointmentTime)
                .endTime(appointmentTime.plusHours(1))
                .consultationType("Video")
                .status(status)
                .fee(new BigDecimal("100.00"))
                .patient(patient())
                .doctor(doctor())
                .build();
    }

    private Patient patient() {
        return Patient.builder()
                .patientId("patient-1")
                .fullName("Patient One")
                .build();
    }

    private Doctor doctor() {
        return Doctor.builder()
                .doctorId("doctor-1")
                .fullName("Doctor One")
                .consultationFee(new BigDecimal("100.00"))
                .specialty("Cardiology")
                .build();
    }

    private PrescriptionHeader sourcePrescription(Appointment appointment) {
        Medicine medicine = Medicine.builder()
                .medicineId(5)
                .name("Amlodipine 5mg")
                .build();

        PrescriptionHeader header = PrescriptionHeader.builder()
                .prescriptionHeaderId(55)
                .appointment(appointment)
                .patient(appointment.getPatient())
                .doctor(appointment.getDoctor())
                .issueDate(LocalDateTime.now().minusDays(1))
                .diagnosis("Hypertension")
                .notes("Continue treatment")
                .status("ISSUED")
                .totalAmount(new BigDecimal("20.00"))
                .prescriptionItems(new java.util.ArrayList<>())
                .build();

        header.getPrescriptionItems().add(PrescriptionItem.builder()
                .prescriptionHeader(header)
                .medicine(medicine)
                .medicationName("Amlodipine 5mg")
                .dosage("5mg")
                .instructions("Use as directed")
                .totalSupplyDays(30)
                .quantity(30)
                .unit("Tablet")
                .frequency("Once daily")
                .timing("MORNING")
                .route("Oral")
                .build());

        return header;
    }

    private Invoice paidInvoice(Appointment appointment) {
        return Invoice.builder()
                .invoiceId(1)
                .appointment(appointment)
                .patient(appointment.getPatient())
                .consultationFee(new BigDecimal("100.00"))
                .amount(new BigDecimal("100.00"))
                .status("Paid")
                .build();
    }
}
