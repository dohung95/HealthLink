package com.HealthLink.service.impl.followup;

import com.HealthLink.dto.consultation.FollowUpRequest;
import com.HealthLink.dto.consultation.FollowUpResponse;
import com.HealthLink.dto.consultation.FollowUpStatusResponse;
import com.HealthLink.dto.response.CompleteAppointmentResponse;
import com.HealthLink.dto.response.FollowUpSlotsResponse;
import com.HealthLink.dto.response.FollowUpSlotResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.entity.enums.FollowUpStatus;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.entity.enums.ScheduleExceptionType;
import com.HealthLink.entity.HomeVisitDetails;
import com.HealthLink.entity.Invoice;
import com.HealthLink.entity.Medicine;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.User;
import com.HealthLink.entity.PrescriptionItem;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.admin.DoctorScheduleExceptionRepository;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.repository.payment.InvoiceRepository;
import com.HealthLink.repository.chat.ChatRoomRepository;
import com.HealthLink.repository.chat.MessageRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.repository.vitalsign.VitalSignRepository;
import com.HealthLink.entity.ChatRoom;
import com.HealthLink.entity.VitalSign;
import com.HealthLink.entity.HomeVisitBooking;
import com.HealthLink.entity.AppointmentSlotHold;
import com.HealthLink.repository.appointment.HomeVisitBookingRepository;
import com.HealthLink.repository.appointment.AppointmentSlotHoldRepository;
import com.HealthLink.service.notification.NotificationService;
import com.HealthLink.service.payment.CommissionService;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;
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

    @Mock
    private VitalSignRepository vitalSignRepository;

    @Mock
    private ChatRoomRepository chatRoomRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private NotificationService notificationService;

    @Mock
    private HomeVisitBookingRepository homeVisitBookingRepository;

    @Mock
    private AppointmentSlotHoldRepository appointmentSlotHoldRepository;

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
        when(homeVisitBookingRepository.findByDoctorIdAndBookingDate(any(), any()))
                .thenReturn(List.of());
        when(appointmentSlotHoldRepository.findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                any(), any(), any(), any()))
                .thenReturn(List.of());

        FollowUpSlotsResponse response = followUpAppointmentService.getSlots("doctor-1", date, null);

        assertThat(response.getSlots()).hasSize(8);
        assertThat(response.getSlots().getFirst().getStartTime()).isEqualTo("09:00");
        assertThat(response.getSlots().getLast().getStartTime()).isEqualTo("16:00");
        assertThat(response.getSlots())
                .noneMatch(slot -> "17:00".equals(slot.getStartTime()));
    }

    @Test
    void getSlots_shouldUseHomeVisitScheduleWhenConsultationTypeIsHomeVisit() {
        LocalDate date = LocalDate.now().plusDays(2);
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        Doctor doctor = doctor();

        DoctorSchedule onlineSchedule = DoctorSchedule.builder()
                .scheduleId(1)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(14, 0))
                .endTime(LocalTime.of(17, 0))
                .slotDuration(30)
                .consultationType("Online")
                .available(true)
                .build();

        DoctorSchedule homeVisitSchedule = DoctorSchedule.builder()
                .scheduleId(2)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(19, 0))
                .endTime(LocalTime.of(21, 0))
                .slotDuration(120)
                .consultationType("HomeVisit")
                .available(true)
                .build();

        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(exceptionRepository.findByDoctor_DoctorIdAndExceptionDate("doctor-1", date))
                .thenReturn(Optional.empty());
        when(scheduleRepository.findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue("doctor-1", dayOfWeek))
                .thenReturn(List.of(onlineSchedule, homeVisitSchedule));
        when(appointmentRepository.findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                eq("doctor-1"), eq("CANCELLED"), any(), any()))
                .thenReturn(List.of());
        when(homeVisitBookingRepository.findByDoctorIdAndBookingDate("doctor-1", date))
                .thenReturn(List.of());
        when(appointmentSlotHoldRepository.findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                any(), any(), any(), any()))
                .thenReturn(List.of());

        FollowUpSlotsResponse response =
                followUpAppointmentService.getSlots("doctor-1", date, "HomeVisit");

        assertThat(response.getSlots()).extracting(FollowUpSlotResponse::getStartTime)
                .containsExactly("19:00");
        assertThat(response.getSlots()).extracting(FollowUpSlotResponse::getEndTime)
                .containsExactly("21:00");
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

        FollowUpSlotsResponse response = followUpAppointmentService.getSlots("doctor-1", date, null);

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
        when(homeVisitBookingRepository.findByDoctorIdAndBookingDate(any(), any()))
                .thenReturn(List.of());
        when(appointmentSlotHoldRepository.findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                any(), any(), any(), any()))
                .thenReturn(List.of());

        FollowUpSlotsResponse response = followUpAppointmentService.getSlots("doctor-1", date, null);

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
        when(homeVisitBookingRepository.findByDoctorIdAndBookingDate(any(), any()))
                .thenReturn(List.of());
        when(appointmentSlotHoldRepository.findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                any(), any(), any(), any()))
                .thenReturn(List.of());

        assertThatCode(() -> followUpAppointmentService.validateFollowUpSlot(appointment, date.atTime(20, 0), null))
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
        when(homeVisitBookingRepository.findByDoctorIdAndBookingDate(any(), any()))
                .thenReturn(List.of());
        when(appointmentSlotHoldRepository.findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                any(), any(), any(), any()))
                .thenReturn(List.of());

        assertThatThrownBy(() -> followUpAppointmentService.validateFollowUpSlot(appointment, date.atTime(21, 0), null))
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
        when(homeVisitBookingRepository.findByDoctorIdAndBookingDate(any(), any()))
                .thenReturn(List.of());
        when(appointmentSlotHoldRepository.findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                any(), any(), any(), any()))
                .thenReturn(List.of());
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment saved = invocation.getArgument(0);
            if (saved.getAppointmentId() == null) {
                saved.setAppointmentId(99);
            }
            return saved;
        });
        when(vitalSignRepository.findByAppointment_AppointmentIdOrderByMeasuredAtDesc(10))
                .thenReturn(List.of(VitalSign.builder().vitalSignId(1).heartRate(72).build()));
        when(chatRoomRepository.findFirstByAppointment_AppointmentId(10))
                .thenReturn(Optional.of(ChatRoom.builder().chatRoomId("room-1").build()));
        when(messageRepository.countByChatRoom_ChatRoomIdAndTimestampAfter(any(), any()))
                .thenReturn(1L);
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
        verify(commissionService).vestConsultationCommission(10);
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
        when(vitalSignRepository.findByAppointment_AppointmentIdOrderByMeasuredAtDesc(10))
                .thenReturn(List.of(VitalSign.builder().vitalSignId(1).heartRate(72).build()));
        when(chatRoomRepository.findFirstByAppointment_AppointmentId(10))
                .thenReturn(Optional.of(ChatRoom.builder().chatRoomId("room-1").build()));
        when(messageRepository.countByChatRoom_ChatRoomIdAndTimestampAfter(any(), any()))
                .thenReturn(1L);
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CompleteAppointmentResponse response = followUpAppointmentService.completeAppointment(10, false);

        assertThat(response.isCreatedFollowUp()).isFalse();
        assertThat(response.getFollowUpAppointment()).isNull();
        assertThat(sourceAppointment.getStatus()).isEqualTo("COMPLETED");
        verify(appointmentRepository).save(sourceAppointment);
        verify(commissionService).vestConsultationCommission(10);
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
        when(vitalSignRepository.findByAppointment_AppointmentIdOrderByMeasuredAtDesc(10))
                .thenReturn(List.of(VitalSign.builder().vitalSignId(1).heartRate(72).build()));
        when(chatRoomRepository.findFirstByAppointment_AppointmentId(10))
                .thenReturn(Optional.of(ChatRoom.builder().chatRoomId("room-1").build()));
        when(messageRepository.countByChatRoom_ChatRoomIdAndTimestampAfter(any(), any()))
                .thenReturn(1L);

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

    @Test
    void getSlots_shouldBlockOnlineSlotsWhenHomeVisitBookingExistsInOverlappingShift() {
        LocalDate date = LocalDate.now().plusDays(2);
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        Doctor doctor = doctor();

        DoctorSchedule onlineSchedule = DoctorSchedule.builder()
                .scheduleId(1)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(13, 0))
                .endTime(LocalTime.of(17, 30))
                .slotDuration(30)
                .consultationType("Consultation")
                .available(true)
                .build();

        DoctorSchedule homeVisitSchedule = DoctorSchedule.builder()
                .scheduleId(2)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(13, 0))
                .endTime(LocalTime.of(17, 30))
                .slotDuration(270)
                .consultationType("HomeVisit")
                .shiftType("AFTERNOON")
                .available(true)
                .build();

        HomeVisitBooking hvBooking = HomeVisitBooking.builder()
                .id(1)
                .doctorId("doctor-1")
                .scheduleId(2)
                .bookingDate(date)
                .appointmentId(100)
                .startTime(LocalTime.of(13, 0))
                .endTime(LocalTime.of(17, 30))
                .build();

        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(exceptionRepository.findByDoctor_DoctorIdAndExceptionDate("doctor-1", date))
                .thenReturn(Optional.empty());
        when(scheduleRepository.findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue("doctor-1", dayOfWeek))
                .thenReturn(List.of(onlineSchedule, homeVisitSchedule));
        when(appointmentRepository.findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                eq("doctor-1"), eq("CANCELLED"), any(), any()))
                .thenReturn(List.of());
        when(homeVisitBookingRepository.findByDoctorIdAndBookingDate("doctor-1", date))
                .thenReturn(List.of(hvBooking));
        when(appointmentSlotHoldRepository.findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                any(), any(), any(), any()))
                .thenReturn(List.of());

        FollowUpSlotsResponse response = followUpAppointmentService.getSlots("doctor-1", date, null);

        assertThat(response.getSlots())
                .allMatch(slot -> "BOOKED".equals(slot.getStatus()) && !slot.isSelectable());
        assertThat(response.getSlots()).hasSize(9);
    }

    @Test
    void getSlots_shouldBlockOnlineSlotsWhenHomeVisitBookingExistsWithoutStartEndTime() {
        LocalDate date = LocalDate.now().plusDays(2);
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        Doctor doctor = doctor();

        DoctorSchedule onlineSchedule = DoctorSchedule.builder()
                .scheduleId(1)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(7, 0))
                .endTime(LocalTime.of(10, 30))
                .slotDuration(30)
                .consultationType("Consultation")
                .available(true)
                .build();

        DoctorSchedule homeVisitSchedule = DoctorSchedule.builder()
                .scheduleId(2)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(7, 0))
                .endTime(LocalTime.of(10, 30))
                .slotDuration(210)
                .consultationType("HomeVisit")
                .shiftType("MORNING")
                .available(true)
                .build();

        HomeVisitBooking hvBooking = HomeVisitBooking.builder()
                .id(2)
                .doctorId("doctor-1")
                .scheduleId(2)
                .bookingDate(date)
                .appointmentId(101)
                .build();

        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(exceptionRepository.findByDoctor_DoctorIdAndExceptionDate("doctor-1", date))
                .thenReturn(Optional.empty());
        when(scheduleRepository.findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue("doctor-1", dayOfWeek))
                .thenReturn(List.of(onlineSchedule, homeVisitSchedule));
        when(appointmentRepository.findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                eq("doctor-1"), eq("CANCELLED"), any(), any()))
                .thenReturn(List.of());
        when(homeVisitBookingRepository.findByDoctorIdAndBookingDate("doctor-1", date))
                .thenReturn(List.of(hvBooking));
        when(appointmentSlotHoldRepository.findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                any(), any(), any(), any()))
                .thenReturn(List.of());

        FollowUpSlotsResponse response = followUpAppointmentService.getSlots("doctor-1", date, null);

        assertThat(response.getSlots())
                .allMatch(slot -> "BOOKED".equals(slot.getStatus()) && !slot.isSelectable());
    }

    @Test
    void getSlots_shouldBlockSlotWhenActiveHoldExists() {
        LocalDate date = LocalDate.now().plusDays(2);
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        Doctor doctor = doctor();

        DoctorSchedule schedule = DoctorSchedule.builder()
                .scheduleId(1)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(12, 0))
                .slotDuration(30)
                .consultationType("Consultation")
                .available(true)
                .build();

        AppointmentSlotHold hold = AppointmentSlotHold.builder()
                .holdId(1)
                .doctor(doctor)
                .appointmentTime(date.atTime(10, 0))
                .endTime(date.atTime(10, 30))
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .consultationType("Video")
                .build();

        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(exceptionRepository.findByDoctor_DoctorIdAndExceptionDate("doctor-1", date))
                .thenReturn(Optional.empty());
        when(scheduleRepository.findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue("doctor-1", dayOfWeek))
                .thenReturn(List.of(schedule));
        when(appointmentRepository.findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                eq("doctor-1"), eq("CANCELLED"), any(), any()))
                .thenReturn(List.of());
        when(homeVisitBookingRepository.findByDoctorIdAndBookingDate("doctor-1", date))
                .thenReturn(List.of());
        when(appointmentSlotHoldRepository.findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                any(), any(), any(), any()))
                .thenReturn(List.of(hold));

        FollowUpSlotsResponse response = followUpAppointmentService.getSlots("doctor-1", date, null);

        assertThat(response.getSlots())
                .filteredOn(slot -> "10:00".equals(slot.getStartTime()))
                .allMatch(slot -> "BOOKED".equals(slot.getStatus()) && !slot.isSelectable());
        assertThat(response.getSlots())
                .filteredOn(slot -> "09:30".equals(slot.getStartTime()) || "10:30".equals(slot.getStartTime()))
                .allMatch(slot -> "AVAILABLE".equals(slot.getStatus()) && slot.isSelectable());
    }

    @Test
    void getSlots_shouldNotBlockOnlineSlotsWhenHomeVisitIsInDifferentShift() {
        LocalDate date = LocalDate.now().plusDays(2);
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        Doctor doctor = doctor();

        DoctorSchedule morningOnline = DoctorSchedule.builder()
                .scheduleId(1)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(7, 0))
                .endTime(LocalTime.of(10, 30))
                .slotDuration(30)
                .consultationType("Consultation")
                .available(true)
                .build();

        DoctorSchedule afternoonOnline = DoctorSchedule.builder()
                .scheduleId(2)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(13, 0))
                .endTime(LocalTime.of(17, 30))
                .slotDuration(30)
                .consultationType("Consultation")
                .available(true)
                .build();

        DoctorSchedule homeVisitSchedule = DoctorSchedule.builder()
                .scheduleId(3)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(13, 0))
                .endTime(LocalTime.of(17, 30))
                .slotDuration(270)
                .consultationType("HomeVisit")
                .shiftType("AFTERNOON")
                .available(true)
                .build();

        HomeVisitBooking hvBooking = HomeVisitBooking.builder()
                .id(3)
                .doctorId("doctor-1")
                .scheduleId(3)
                .bookingDate(date)
                .appointmentId(102)
                .startTime(LocalTime.of(13, 0))
                .endTime(LocalTime.of(17, 30))
                .build();

        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(exceptionRepository.findByDoctor_DoctorIdAndExceptionDate("doctor-1", date))
                .thenReturn(Optional.empty());
        when(scheduleRepository.findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue("doctor-1", dayOfWeek))
                .thenReturn(List.of(morningOnline, afternoonOnline, homeVisitSchedule));
        when(appointmentRepository.findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                eq("doctor-1"), eq("CANCELLED"), any(), any()))
                .thenReturn(List.of());
        when(homeVisitBookingRepository.findByDoctorIdAndBookingDate("doctor-1", date))
                .thenReturn(List.of(hvBooking));
        when(appointmentSlotHoldRepository.findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                any(), any(), any(), any()))
                .thenReturn(List.of());

        FollowUpSlotsResponse response = followUpAppointmentService.getSlots("doctor-1", date, null);

        var morningSlots = response.getSlots().stream()
                .filter(slot -> slot.getStartTime().compareTo("12:59") < 0)
                .toList();
        assertThat(morningSlots).isNotEmpty();
        assertThat(morningSlots)
                .allMatch(slot -> "AVAILABLE".equals(slot.getStatus()) && slot.isSelectable());

        var afternoonSlots = response.getSlots().stream()
                .filter(slot -> slot.getStartTime().compareTo("13:00") >= 0)
                .toList();
        assertThat(afternoonSlots).isNotEmpty();
        assertThat(afternoonSlots)
                .allMatch(slot -> "BOOKED".equals(slot.getStatus()) && !slot.isSelectable());
    }

    @Test
    void sendPaymentRequest_shouldAllowHomeVisitFollowUpFromOnlineSourceWithoutHomeVisitDetails() {
        Patient patient = Patient.builder().patientId("patient-1").build();
        Appointment source = Appointment.builder()
                .appointmentId(1179)
                .consultationType("Online")
                .patient(patient)
                .doctor(doctor())
                .appointmentTime(LocalDateTime.now().minusDays(1))
                .build();
        Consultation consultation = Consultation.builder()
                .consultationId(16)
                .appointment(source)
                .consultationType("HomeVisit")
                .followUpDate(LocalDateTime.now().plusDays(3))
                .followUpAppointmentId(1180)
                .followUpStatus(FollowUpStatus.NONE)
                .build();
        Appointment proposal = Appointment.builder()
                .appointmentId(1180)
                .doctor(source.getDoctor())
                .patient(patient)
                .appointmentTime(consultation.getFollowUpDate())
                .status("FOLLOW_UP_PROPOSED")
                .build();

        when(consultationRepository.findByAppointment_AppointmentId(1179))
                .thenReturn(Optional.of(consultation));
        when(appointmentRepository.findById(1180)).thenReturn(Optional.of(proposal));
        when(consultationRepository.save(any(Consultation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        FollowUpResponse response = followUpAppointmentService.sendPaymentRequest(source);

        assertThat(response.getFollowUpStatus()).isEqualTo("PENDING_PAYMENT");
        assertThat(consultation.getFollowUpStatus()).isEqualTo(FollowUpStatus.PENDING_PAYMENT);
        assertThat(proposal.getStatus()).isEqualTo("AWAITING_PAYMENT");
        assertThat(consultation.getHomeVisitLatitude()).isNull();
        assertThat(consultation.getHomeVisitLongitude()).isNull();
    }

    @Test
    void getFollowUpStatus_shouldExposeOnlineSourceContextForHomeVisitFollowUp() {
        Patient patient = Patient.builder().patientId("user-p01").build();
        Doctor doctor = doctor();
        Appointment source = Appointment.builder()
                .appointmentId(1179)
                .consultationType("Online")
                .patient(patient)
                .doctor(doctor)
                .appointmentTime(LocalDateTime.now().minusDays(1))
                .build();
        Consultation consultation = Consultation.builder()
                .consultationId(16)
                .appointment(source)
                .consultationType("HomeVisit")
                .followUpDate(LocalDateTime.now().plusDays(3))
                .followUpStatus(FollowUpStatus.PENDING_PAYMENT)
                .build();

        when(consultationRepository.findByAppointment_AppointmentId(1179))
                .thenReturn(Optional.of(consultation));

        FollowUpStatusResponse status = followUpAppointmentService.getFollowUpStatus(1179);

        assertThat(status.getSourceAppointmentId()).isEqualTo(1179);
        assertThat(status.getSourceAppointmentType()).isEqualTo("Online");
        assertThat(status.getConsultationId()).isEqualTo(16);
        assertThat(status.getPatientId()).isEqualTo("user-p01");
        assertThat(status.getDoctorId()).isEqualTo("doctor-1");
        assertThat(status.getHasSourceHomeVisitDetails()).isFalse();
        assertThat(status.getSourceHomeVisitDetails()).isNull();
    }

    @Test
    void scheduleFollowUpAppointment_shouldBeIdempotentWhenPaidFollowUpAlreadyExistsAtSameTime() {
        LocalDateTime followUpTime = LocalDate.now().plusDays(2).atTime(14, 0);
        Doctor doctor = doctor();
        Appointment sourceAppointment = appointment(10, LocalDateTime.now().minusHours(1), "IN_CONSULTATION");
        sourceAppointment.setDoctor(doctor);

        Appointment existingFollowUp = appointment(99, followUpTime, "SCHEDULED");
        existingFollowUp.setConsultationType("HomeVisit");
        existingFollowUp.setFollowUpSourceAppointmentId(10);

        Consultation consultation = Consultation.builder()
                .consultationId(20)
                .appointment(sourceAppointment)
                .followUpDate(followUpTime)
                .followUpAppointmentId(99)
                .consultationType("HomeVisit")
                .followUpStatus(FollowUpStatus.PAID)
                .build();
        sourceAppointment.setConsultation(consultation);

        FollowUpRequest request = new FollowUpRequest();
        request.setFollowUpDate(followUpTime);
        request.setFollowUpNotes("Already paid follow-up");
        request.setConsultationType("HomeVisit");

        when(consultationRepository.findByAppointment_AppointmentId(10))
                .thenReturn(Optional.of(consultation));
        when(appointmentRepository.findById(99)).thenReturn(Optional.of(existingFollowUp));
        when(consultationRepository.save(any(Consultation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        FollowUpResponse response =
                followUpAppointmentService.scheduleFollowUpAppointment(sourceAppointment, request);

        assertThat(response.getFollowUpAppointmentId()).isEqualTo(99);
        assertThat(consultation.getFollowUpNotes()).isEqualTo("Already paid follow-up");
        verify(scheduleRepository, never()).findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue(any(), any());
    }

    @Test
    void validateFollowUpSlot_shouldRejectHomeVisitTimeOutsideHomeVisitSchedule() {
        LocalDate date = LocalDate.now().plusDays(2);
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        Doctor doctor = doctor();

        DoctorSchedule onlineSchedule = DoctorSchedule.builder()
                .scheduleId(1)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(14, 0))
                .endTime(LocalTime.of(17, 0))
                .slotDuration(30)
                .consultationType("Online")
                .available(true)
                .build();

        DoctorSchedule homeVisitSchedule = DoctorSchedule.builder()
                .scheduleId(2)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(19, 0))
                .endTime(LocalTime.of(21, 0))
                .slotDuration(120)
                .consultationType("HomeVisit")
                .available(true)
                .build();

        Appointment appointment = appointment(1, LocalDateTime.now().minusHours(1), "SCHEDULED");
        appointment.setDoctor(doctor);

        when(exceptionRepository.findByDoctor_DoctorIdAndExceptionDate("doctor-1", date))
                .thenReturn(Optional.empty());
        when(scheduleRepository.findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue("doctor-1", dayOfWeek))
                .thenReturn(List.of(onlineSchedule, homeVisitSchedule));
        when(appointmentRepository.findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                eq("doctor-1"), eq("CANCELLED"), any(), any()))
                .thenReturn(List.of());
        when(homeVisitBookingRepository.findByDoctorIdAndBookingDate("doctor-1", date))
                .thenReturn(List.of());
        when(appointmentSlotHoldRepository.findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                any(), any(), any(), any()))
                .thenReturn(List.of());

        assertThatThrownBy(() ->
                followUpAppointmentService.validateFollowUpSlot(appointment, date.atTime(14, 0), "HomeVisit"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("outside doctor's working hours");
    }

    @Test
    void getSlots_shouldMarkHomeVisitSlotBookedWhenHomeVisitBookingExists() {
        LocalDate date = LocalDate.now().plusDays(2);
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        Doctor doctor = doctor();

        DoctorSchedule homeVisitSchedule = DoctorSchedule.builder()
                .scheduleId(3)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(19, 0))
                .endTime(LocalTime.of(21, 0))
                .slotDuration(120)
                .consultationType("HomeVisit")
                .available(true)
                .build();

        HomeVisitBooking booking = HomeVisitBooking.builder()
                .id(10)
                .doctorId("doctor-1")
                .scheduleId(3)
                .bookingDate(date)
                .startTime(LocalTime.of(19, 0))
                .endTime(LocalTime.of(21, 0))
                .appointmentId(200)
                .build();

        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(exceptionRepository.findByDoctor_DoctorIdAndExceptionDate("doctor-1", date))
                .thenReturn(Optional.empty());
        when(scheduleRepository.findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue("doctor-1", dayOfWeek))
                .thenReturn(List.of(homeVisitSchedule));
        when(appointmentRepository.findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                eq("doctor-1"), eq("CANCELLED"), any(), any()))
                .thenReturn(List.of());
        when(homeVisitBookingRepository.findByDoctorIdAndBookingDate("doctor-1", date))
                .thenReturn(List.of(booking));
        when(appointmentSlotHoldRepository.findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                any(), any(), any(), any()))
                .thenReturn(List.of());

        FollowUpSlotsResponse response =
                followUpAppointmentService.getSlots("doctor-1", date, "HomeVisit");

        assertThat(response.getSlots()).hasSize(1);
        assertThat(response.getSlots().getFirst().getStartTime()).isEqualTo("19:00");
        assertThat(response.getSlots().getFirst().getStatus()).isEqualTo("BOOKED");
        assertThat(response.getSlots().getFirst().isSelectable()).isFalse();
        assertThat(response.getSlots().getFirst().getDisabledReason())
                .isEqualTo("Slot blocked by home visit booking");
    }

    @Test
    void getSlots_shouldMarkHomeVisitSlotBookedWhenOnlineAppointmentOverlaps() {
        LocalDate date = LocalDate.now().plusDays(2);
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        Doctor doctor = doctor();

        DoctorSchedule homeVisitSchedule = DoctorSchedule.builder()
                .scheduleId(3)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(19, 0))
                .endTime(LocalTime.of(21, 0))
                .slotDuration(120)
                .consultationType("HomeVisit")
                .available(true)
                .build();

        Appointment bookedOnline = appointment(44, date.atTime(19, 30), "SCHEDULED");
        bookedOnline.setConsultationType("Online");
        bookedOnline.setEndTime(date.atTime(20, 0));

        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(exceptionRepository.findByDoctor_DoctorIdAndExceptionDate("doctor-1", date))
                .thenReturn(Optional.empty());
        when(scheduleRepository.findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue("doctor-1", dayOfWeek))
                .thenReturn(List.of(homeVisitSchedule));
        when(appointmentRepository.findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                eq("doctor-1"), eq("CANCELLED"), any(), any()))
                .thenReturn(List.of(bookedOnline));
        when(homeVisitBookingRepository.findByDoctorIdAndBookingDate("doctor-1", date))
                .thenReturn(List.of());
        when(appointmentSlotHoldRepository.findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                any(), any(), any(), any()))
                .thenReturn(List.of());

        FollowUpSlotsResponse response =
                followUpAppointmentService.getSlots("doctor-1", date, "HomeVisit");

        assertThat(response.getSlots()).hasSize(1);
        assertThat(response.getSlots().getFirst().getStatus()).isEqualTo("BOOKED");
        assertThat(response.getSlots().getFirst().isSelectable()).isFalse();
        assertThat(response.getSlots().getFirst().getDisabledReason()).isEqualTo("Slot already booked");
    }

    @Test
    void getCalendar_shouldReturnDayOffStatusForScheduleException() {
        LocalDate date = LocalDate.now().plusDays(3);
        String month = date.withDayOfMonth(1).toString().substring(0, 7);
        Doctor doctor = doctor();

        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(exceptionRepository.findByDoctor_DoctorIdAndExceptionDate(eq("doctor-1"), any()))
                .thenReturn(Optional.empty());
        when(exceptionRepository.findByDoctor_DoctorIdAndExceptionDate("doctor-1", date))
                .thenReturn(Optional.of(com.HealthLink.entity.DoctorScheduleException.builder()
                        .exceptionDate(date)
                        .exceptionType(ScheduleExceptionType.DAY_OFF)
                        .build()));
        when(scheduleRepository.findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue(eq("doctor-1"), any()))
                .thenReturn(List.of());
        when(appointmentRepository.findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                eq("doctor-1"), eq("CANCELLED"), any(), any()))
                .thenReturn(List.of());
        when(homeVisitBookingRepository.findByDoctorIdAndBookingDate(eq("doctor-1"), any()))
                .thenReturn(List.of());
        when(appointmentSlotHoldRepository.findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                any(), any(), any(), any()))
                .thenReturn(List.of());

        var response = followUpAppointmentService.getCalendar("doctor-1", month, "HomeVisit");

        assertThat(response.getDays()).filteredOn(day -> date.equals(day.getDate()))
                .singleElement()
                .extracting("status")
                .isEqualTo("DAY_OFF");
    }

    @Test
    void getCalendar_shouldReturnNoScheduleWhenSelectedTypeHasNoSchedule() {
        LocalDate date = LocalDate.now().plusDays(8);
        String month = date.withDayOfMonth(1).toString().substring(0, 7);
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        Doctor doctor = doctor();

        DoctorSchedule onlineSchedule = DoctorSchedule.builder()
                .scheduleId(1)
                .doctor(doctor)
                .dayOfWeek(dayOfWeek)
                .startTime(LocalTime.of(7, 0))
                .endTime(LocalTime.of(10, 0))
                .slotDuration(30)
                .consultationType("Online")
                .available(true)
                .build();

        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(exceptionRepository.findByDoctor_DoctorIdAndExceptionDate(eq("doctor-1"), any()))
                .thenReturn(Optional.empty());
        when(scheduleRepository.findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue(eq("doctor-1"), any()))
                .thenReturn(List.of());
        when(scheduleRepository.findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue("doctor-1", dayOfWeek))
                .thenReturn(List.of(onlineSchedule));
        when(appointmentRepository.findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                eq("doctor-1"), eq("CANCELLED"), any(), any()))
                .thenReturn(List.of());
        when(homeVisitBookingRepository.findByDoctorIdAndBookingDate(eq("doctor-1"), any()))
                .thenReturn(List.of());
        when(appointmentSlotHoldRepository.findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                any(), any(), any(), any()))
                .thenReturn(List.of());

        var response = followUpAppointmentService.getCalendar("doctor-1", month, "HomeVisit");

        assertThat(response.getDays()).filteredOn(day -> date.equals(day.getDate()))
                .singleElement()
                .extracting("status")
                .isEqualTo("NO_SCHEDULE");
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
