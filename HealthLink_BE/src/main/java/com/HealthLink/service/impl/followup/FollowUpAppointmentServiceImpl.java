package com.HealthLink.service.impl.followup;

import com.HealthLink.dto.consultation.FollowUpHomeVisitDetailsDto;
import com.HealthLink.dto.consultation.FollowUpRequest;
import com.HealthLink.dto.consultation.FollowUpResponse;
import com.HealthLink.dto.consultation.FollowUpStatusResponse;
import com.HealthLink.dto.response.AppointmentResponse;
import com.HealthLink.dto.response.CompleteAppointmentResponse;
import com.HealthLink.dto.response.FollowUpCalendarDayResponse;
import com.HealthLink.dto.response.FollowUpCalendarResponse;
import com.HealthLink.dto.response.FollowUpSlotResponse;
import com.HealthLink.dto.response.FollowUpSlotsResponse;
import com.HealthLink.dto.chat.MessageDTO;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.HomeVisitDetails;
import com.HealthLink.entity.User;
import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.entity.DoctorScheduleException;
import com.HealthLink.entity.Invoice;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.PrescriptionItem;
import com.HealthLink.entity.enums.FollowUpStatus;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.entity.enums.ScheduleExceptionType;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.admin.DoctorScheduleExceptionRepository;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.repository.payment.InvoiceRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.repository.chat.ChatRoomRepository;
import com.HealthLink.repository.chat.MessageRepository;
import com.HealthLink.repository.vitalsign.VitalSignRepository;
import com.HealthLink.entity.ChatRoom;
import com.HealthLink.entity.Message;
import com.HealthLink.entity.VitalSign;
import com.HealthLink.entity.HomeVisitBooking;
import com.HealthLink.entity.AppointmentSlotHold;
import com.HealthLink.repository.appointment.HomeVisitBookingRepository;
import com.HealthLink.repository.appointment.AppointmentSlotHoldRepository;
import com.HealthLink.service.followup.FollowUpAppointmentService;
import com.HealthLink.service.notification.NotificationService;
import com.HealthLink.service.payment.CommissionService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class FollowUpAppointmentServiceImpl implements FollowUpAppointmentService {

    private static final DateTimeFormatter SLOT_TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final String TYPE_HOME_VISIT = "HomeVisit";
    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final String STATUS_PROPOSED = "FOLLOW_UP_PROPOSED";
    private static final String STATUS_AWAITING_PAYMENT = "AWAITING_PAYMENT";
    private static final String STATUS_CONFIRMED = "CONFIRMED";
    private static final String STATUS_AVAILABLE = "AVAILABLE";
    private static final String STATUS_BOOKED = "BOOKED";
    private static final int DEFAULT_SLOT_MINUTES = 30;

    private final AppointmentRepository appointmentRepository;
    private final ConsultationRepository consultationRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final DoctorScheduleExceptionRepository exceptionRepository;
    private final InvoiceRepository invoiceRepository;
    private final PrescriptionHeaderRepository prescriptionHeaderRepository;
    private final CommissionService commissionService;
    private final ChatRoomRepository chatRoomRepository;
    private final MessageRepository messageRepository;
    private final VitalSignRepository vitalSignRepository;
    private final HomeVisitBookingRepository homeVisitBookingRepository;
    private final AppointmentSlotHoldRepository appointmentSlotHoldRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public FollowUpSlotsResponse getSlots(String doctorId, LocalDate date, String consultationType) {
        if (doctorId == null || doctorId.isBlank()) {
            throw new BadRequestException("Doctor ID is required");
        }
        if (date == null) {
            throw new BadRequestException("Date is required");
        }

        doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", doctorId));

        return FollowUpSlotsResponse.builder()
                .doctorId(doctorId)
                .date(date)
                .slots(generateFollowUpSlotsForDay(doctorId, date, LocalDateTime.now(), consultationType, null))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public FollowUpCalendarResponse getCalendar(String doctorId, String month, String consultationType) {
        if (doctorId == null || doctorId.isBlank()) {
            throw new BadRequestException("Doctor ID is required");
        }

        doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", doctorId));

        YearMonth yearMonth = parseMonth(month);
        LocalDateTime now = LocalDateTime.now();

        List<FollowUpCalendarDayResponse> days = new ArrayList<>();
        for (int day = 1; day <= yearMonth.lengthOfMonth(); day++) {
            LocalDate date = yearMonth.atDay(day);
            FollowUpDayAvailability availability =
                    buildFollowUpDayAvailability(doctorId, date, now, consultationType, null);
            List<FollowUpSlotResponse> slots = availability.slots();
            int totalSlots = slots.size();
            int bookedSlots = (int) slots.stream()
                    .filter(slot -> "BOOKED".equals(slot.getStatus()))
                    .count();
            int availableSlots = (int) slots.stream()
                    .filter(slot -> "AVAILABLE".equals(slot.getStatus()))
                    .count();

            days.add(FollowUpCalendarDayResponse.builder()
                    .date(date)
                    .totalSlots(totalSlots)
                    .bookedSlots(bookedSlots)
                    .availableSlots(availableSlots)
                    .hasAppointments(bookedSlots > 0)
                    .status(resolveDayStatus(
                            date,
                            availability.exceptionType(),
                            availability.hasTargetSchedules(),
                            availableSlots))
                    .build());
        }

        return FollowUpCalendarResponse.builder()
                .doctorId(doctorId)
                .month(yearMonth.toString())
                .days(days)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public void validateFollowUpSlot(Appointment appointment, LocalDateTime followUpDate, String consultationType) {
        validateFollowUpSlot(appointment, followUpDate, consultationType, null);
    }

    private void validateFollowUpSlot(Appointment appointment, LocalDateTime followUpDate, String consultationType, Integer ignoredAppointmentId) {
        if (appointment == null || appointment.getDoctor() == null) {
            throw new BadRequestException("Consultation appointment is required");
        }

        if (followUpDate == null) {
            throw new BadRequestException("Follow-up date is required");
        }
        if (!followUpDate.isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Follow-up date must be in the future");
        }

        String doctorId = appointment.getDoctor().getDoctorId();
        List<FollowUpSlotResponse> slots = generateFollowUpSlotsForDay(
                doctorId, followUpDate.toLocalDate(), LocalDateTime.now(), consultationType, ignoredAppointmentId);

        boolean isAvailable = slots.stream()
                .anyMatch(slot -> "AVAILABLE".equals(slot.getStatus())
                        && slot.getStartTime().equals(followUpDate.format(SLOT_TIME_FORMATTER)));

        if (!isAvailable) {
            String detail = slots.stream()
                    .filter(slot -> slot.getStartTime().equals(followUpDate.format(SLOT_TIME_FORMATTER)))
                    .findFirst()
                    .map(slot -> "Slot is " + slot.getStatus().toLowerCase())
                    .orElse("Slot is outside doctor's working hours");
            throw new BadRequestException("The selected follow-up slot is not available. " + detail);
        }
    }

    @Override
    @Transactional
    public FollowUpResponse scheduleFollowUpAppointment(Appointment sourceAppointment, FollowUpRequest request) {
        Consultation consultation = consultationRepository
                .findByAppointment_AppointmentId(sourceAppointment.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Consultation not found for appointment: " + sourceAppointment.getAppointmentId()));

        String requestedType = request.getConsultationType() != null
                ? request.getConsultationType()
                : sourceAppointment.getConsultationType();

        if (consultation.getFollowUpAppointmentId() != null) {
            Appointment existingFollowUp = appointmentRepository
                    .findById(consultation.getFollowUpAppointmentId()).orElse(null);

            if (existingFollowUp != null && !STATUS_CANCELLED.equalsIgnoreCase(existingFollowUp.getStatus())) {
                if (request.getFollowUpDate().equals(existingFollowUp.getAppointmentTime())
                        && sameConsultationType(requestedType, existingFollowUp.getConsultationType())) {
                    consultation.setFollowUpDate(request.getFollowUpDate());
                    consultation.setFollowUpNotes(request.getFollowUpNotes());
                    if (request.getConsultationType() != null) {
                        consultation.setConsultationType(request.getConsultationType());
                    }
                    return toFollowUpResponse(consultationRepository.save(consultation));
                }
                return rescheduleExistingFollowUp(sourceAppointment, consultation, existingFollowUp, request);
            }
        }

        validateFollowUpSlot(sourceAppointment, request.getFollowUpDate(), requestedType);

        consultation.setFollowUpDate(request.getFollowUpDate());
        consultation.setFollowUpNotes(request.getFollowUpNotes());
        if (request.getConsultationType() != null) {
            consultation.setConsultationType(request.getConsultationType());
        }
        consultationRepository.save(consultation);
        ensureFollowUpProposal(sourceAppointment, consultation);

        return toFollowUpResponse(consultationRepository.save(consultation));
    }

    private boolean sameConsultationType(String left, String right) {
        String l = left == null ? "" : left.trim().replaceAll("[\\s_-]", "").toLowerCase();
        String r = right == null ? "" : right.trim().replaceAll("[\\s_-]", "").toLowerCase();
        return l.equals(r);
    }

    private FollowUpResponse rescheduleExistingFollowUp(
            Appointment sourceAppointment,
            Consultation consultation,
            Appointment existingFollowUp,
            FollowUpRequest request) {

        LocalDateTime newDate = request.getFollowUpDate();
        String requestedType = request.getConsultationType() != null
                ? request.getConsultationType()
                : existingFollowUp.getConsultationType();

        validateFollowUpSlot(
                sourceAppointment,
                newDate,
                requestedType,
                existingFollowUp.getAppointmentId());

        int slotMinutes = resolveFollowUpSlotDuration(
                sourceAppointment.getDoctor().getDoctorId(), newDate, requestedType);

        existingFollowUp.setAppointmentTime(newDate);
        existingFollowUp.setEndTime(newDate.plusMinutes(slotMinutes));
        existingFollowUp.setNotes(request.getFollowUpNotes() != null
                ? request.getFollowUpNotes() : existingFollowUp.getNotes());
        if (request.getConsultationType() != null) {
            existingFollowUp.setConsultationType(request.getConsultationType());
        }
        appointmentRepository.save(existingFollowUp);

        consultation.setFollowUpDate(newDate);
        consultation.setFollowUpNotes(request.getFollowUpNotes());
        Consultation saved = consultationRepository.save(consultation);

        return toFollowUpResponse(saved);
    }

    @Override
    @Transactional
    public void cancelPendingFollowUp(Appointment sourceAppointment) {
        if (sourceAppointment == null) {
            throw new BadRequestException("Source appointment is required");
        }
        if ("COMPLETED".equalsIgnoreCase(sourceAppointment.getStatus())) {
            throw new BadRequestException("Completed appointments cannot cancel follow-up. The follow-up appointment is active.");
        }

        Consultation consultation = sourceAppointment.getConsultation();
        if (consultation == null) {
            consultation = consultationRepository.findByAppointment_AppointmentId(
                    sourceAppointment.getAppointmentId()).orElse(null);
            if (consultation == null) {
                return;
            }
        }

        if (consultation.getFollowUpAppointmentId() != null) {
            Appointment followUp = appointmentRepository
                    .findById(consultation.getFollowUpAppointmentId()).orElse(null);
            if (followUp != null && !"CANCELLED".equalsIgnoreCase(followUp.getStatus())) {
                followUp.setStatus("CANCELLED");
                followUp.setCancelReason("Follow-up selection cancelled by doctor");
                followUp.setCancelledAt(LocalDateTime.now());
                appointmentRepository.save(followUp);
            }
        }

        consultation.setFollowUpDate(null);
        consultation.setFollowUpNotes(null);
        consultation.setFollowUpAppointmentId(null);
        consultation.setFollowUpStatus(FollowUpStatus.NONE);
        consultationRepository.save(consultation);
    }

    @Override
    @Transactional
    public FollowUpResponse sendPaymentRequest(Appointment sourceAppointment) {
        Consultation consultation = consultationRepository
                .findByAppointment_AppointmentId(sourceAppointment.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Consultation not found for appointment: " + sourceAppointment.getAppointmentId()));

        if (consultation.getFollowUpDate() == null) {
            throw new BadRequestException("Save follow-up data first via PUT /api/appointments/{id}/follow-up");
        }

        Appointment proposal = ensureFollowUpProposal(sourceAppointment, consultation);
        proposal.setStatus(STATUS_AWAITING_PAYMENT);
        appointmentRepository.save(proposal);
        consultation.setFollowUpStatus(FollowUpStatus.PENDING_PAYMENT);
        consultationRepository.save(consultation);

        User patientUser = sourceAppointment.getPatient().getUser();
        if (patientUser != null && patientUser.getId() != null) {
            notificationService.sendWebSocketNotification(
                    patientUser,
                    NotificationType.FOLLOW_UP_PAYMENT_REQUEST,
                    "Follow-up Payment Required",
                    "Your doctor has scheduled a follow-up and a payment is required. Please review and pay.",
                    sourceAppointment.getAppointmentId(),
                    "/appointments/" + sourceAppointment.getAppointmentId()
            );
        }

        return toFollowUpResponse(consultation);
    }

    @Override
    @Transactional(readOnly = true)
    public FollowUpStatusResponse getFollowUpStatus(Integer appointmentId) {
        Consultation consultation = consultationRepository
                .findByAppointment_AppointmentId(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Consultation not found for appointment: " + appointmentId));

        Appointment source = consultation.getAppointment();
        HomeVisitDetails sourceDetails = source != null ? source.getHomeVisitDetails() : null;

        return FollowUpStatusResponse.builder()
                .status(consultation.getFollowUpStatus() != null
                        ? consultation.getFollowUpStatus().name()
                        : FollowUpStatus.NONE.name())
                .consultationId(consultation.getConsultationId())
                .sourceAppointmentId(source != null ? source.getAppointmentId() : null)
                .sourceAppointmentType(source != null ? source.getConsultationType() : null)
                .followUpDate(consultation.getFollowUpDate())
                .followUpNotes(consultation.getFollowUpNotes())
                .consultationType(consultation.getConsultationType())
                .followUpAppointmentId(consultation.getFollowUpAppointmentId())
                .homeVisitLatitude(consultation.getHomeVisitLatitude())
                .homeVisitLongitude(consultation.getHomeVisitLongitude())
                .doctorId(source != null && source.getDoctor() != null
                        ? source.getDoctor().getDoctorId() : null)
                .patientId(source != null && source.getPatient() != null
                        ? source.getPatient().getPatientId() : null)
                .hasSourceHomeVisitDetails(sourceDetails != null
                        && sourceDetails.getVisitLatitude() != null
                        && sourceDetails.getVisitLongitude() != null)
                .sourceHomeVisitDetails(toFollowUpHomeVisitDetailsDto(sourceDetails))
                .build();
    }

    @Override
    @Transactional
    public void confirmFollowUp(Integer appointmentId) {
        Consultation consultation = consultationRepository
                .findByAppointment_AppointmentId(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Consultation not found for appointment: " + appointmentId));

        if (consultation.getFollowUpStatus() != FollowUpStatus.PAID) {
            throw new BadRequestException("Follow-up must be PAID before confirming");
        }

        consultation.setFollowUpStatus(FollowUpStatus.CONFIRMED);
        Appointment followUpAppointment = findExistingFollowUpAppointment(consultation);
        if (followUpAppointment != null && !STATUS_CANCELLED.equalsIgnoreCase(followUpAppointment.getStatus())) {
            followUpAppointment.setStatus(STATUS_CONFIRMED);
            followUpAppointment.setConfirmedAt(LocalDateTime.now());
            appointmentRepository.save(followUpAppointment);
        }
        consultationRepository.save(consultation);

        User doctorUser = consultation.getAppointment().getDoctor().getUser();
        if (doctorUser != null && doctorUser.getId() != null) {
            notificationService.sendWebSocketNotification(
                    doctorUser,
                    NotificationType.FOLLOW_UP_CONFIRMED,
                    "Follow-up Confirmed",
                    "Your patient has confirmed the follow-up appointment. You can now complete the consultation.",
                    appointmentId,
                    "/appointments/" + appointmentId
            );
        }
    }

    @Override
    @Transactional
    public void denyFollowUp(Integer appointmentId) {
        Consultation consultation = consultationRepository
                .findByAppointment_AppointmentId(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Consultation not found for appointment: " + appointmentId));

        if (consultation.getFollowUpStatus() != FollowUpStatus.PENDING_PAYMENT) {
            throw new BadRequestException("Follow-up must be PENDING_PAYMENT to deny");
        }

        consultation.setFollowUpStatus(FollowUpStatus.NONE);
        Appointment followUpAppointment = findExistingFollowUpAppointment(consultation);
        if (followUpAppointment != null && !STATUS_CANCELLED.equalsIgnoreCase(followUpAppointment.getStatus())) {
            followUpAppointment.setStatus(STATUS_CANCELLED);
            followUpAppointment.setCancelReason("Follow-up request declined by patient");
            followUpAppointment.setCancelledAt(LocalDateTime.now());
            appointmentRepository.save(followUpAppointment);
        }
        consultation.setFollowUpDate(null);
        consultation.setFollowUpNotes(null);
        consultation.setConsultationType(null);
        consultation.setFollowUpAppointmentId(null);
        consultationRepository.save(consultation);

        User doctorUser = consultation.getAppointment().getDoctor().getUser();
        if (doctorUser != null && doctorUser.getId() != null) {
            notificationService.sendWebSocketNotification(
                    doctorUser,
                    NotificationType.FOLLOW_UP_DENIED,
                    "Follow-up Denied",
                    "Your patient has denied the follow-up request.",
                    appointmentId,
                    "/appointments/" + appointmentId
            );
        }
    }

    @Override
    @Transactional
    public CompleteAppointmentResponse completeAppointment(Integer appointmentId, boolean copyPrescription) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", appointmentId));

        Consultation consultation = appointment.getConsultation();
        if (consultation == null) {
            consultation = consultationRepository.findByAppointment_AppointmentId(appointmentId).orElse(null);
        }

        if (consultation != null
                && consultation.getFollowUpStatus() == FollowUpStatus.PENDING_PAYMENT) {
            throw new BadRequestException(
                    "Cannot complete: follow-up payment is " + consultation.getFollowUpStatus()
                    + ". Wait for patient to pay.");
        }

        if ("COMPLETED".equalsIgnoreCase(appointment.getStatus())) {
            Appointment existingFollowUp = findExistingFollowUpAppointment(consultation);
            return CompleteAppointmentResponse.builder()
                    .completedAppointment(toAppointmentResponse(appointment))
                    .followUpAppointment(existingFollowUp != null ? toAppointmentResponse(existingFollowUp) : null)
                    .createdFollowUp(false)
                    .build();
        }

        if ("CANCELLED".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Cancelled appointments cannot be completed");
        }
        if (!"IN_CONSULTATION".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Only in-consultation appointments can be completed");
        }
        if (consultation == null || consultation.getStartTime() == null) {
            throw new BadRequestException("Consultation must be started before appointment can be completed");
        }

        // Kiem tra rule: Patient phai nhap thong tin y te (VitalSigns) - ngoai tru HomeVisit
        boolean isHomeVisit = appointment.getConsultationType() != null &&
                appointment.getConsultationType().toLowerCase().contains("home");

        if (!isHomeVisit) {
            List<VitalSign> vitals = vitalSignRepository.findByAppointment_AppointmentIdOrderByMeasuredAtDesc(appointmentId);
            if (vitals == null || vitals.isEmpty()) {
                throw new BadRequestException("Cannot complete appointment: Patient has not submitted medical information (vitals)");
            }
        }

        // Kiem tra rule: Neu la cuoc hen truc tuyen (VIDEO, AUDIO, CHAT, ONLINE) thi phai co trao doi
        // Logic: tim phong chat cua cuoc hen, kiem tra co tin nhan nao duoc gui sau thoi diem bat dau buoi kham khong
        // Neu khong co → bac si chua trao doi voi benh nhan → chan ket thuc buoi hen
        String consType = appointment.getConsultationType();
        if ("VIDEO".equalsIgnoreCase(consType) || "AUDIO".equalsIgnoreCase(consType)
                || "CHAT".equalsIgnoreCase(consType) || "ONLINE".equalsIgnoreCase(consType)) {

            // Moc thoi gian de so sanh: uu tien lay thoi gian bat dau consultation,
            // neu khong co thi lay thoi gian hen ban dau
            LocalDateTime consultationStartTime = (consultation != null && consultation.getStartTime() != null)
                    ? consultation.getStartTime()
                    : appointment.getAppointmentTime();

            ChatRoom chatRoom = chatRoomRepository.findFirstByAppointment_AppointmentId(appointmentId).orElse(null);

            // Neu khong co phong chat hoac khong co tin nhan nao sau thoi diem bat dau → chan
            long messagesAfterStart = (chatRoom != null)
                    ? messageRepository.countByChatRoom_ChatRoomIdAndTimestampAfter(
                            chatRoom.getChatRoomId(), consultationStartTime)
                    : 0L;

            if (messagesAfterStart == 0) {
                throw new BadRequestException(
                        "Cannot complete appointment: No communication has taken place during this consultation session");
            }
        }

        Invoice invoice = appointment.getInvoice();
        if (invoice == null) {
            invoice = invoiceRepository.findByAppointment_AppointmentId(appointmentId)
                    .orElseThrow(() -> new BadRequestException(
                            "Appointment must be paid before it can be completed"));
        }
        if (!"PAID".equalsIgnoreCase(invoice.getStatus())) {
            throw new BadRequestException("Appointment must be paid before it can be completed");
        }

        appointment.setStatus("COMPLETED");
        if (consultation.getEndTime() == null) {
            consultation.setEndTime(LocalDateTime.now());
            consultationRepository.save(consultation);
        }
        Appointment completedAppointment = appointmentRepository.save(appointment);
        commissionService.vestConsultationCommission(appointmentId);

        try {
            chatRoomRepository.findFirstByAppointment_AppointmentId(completedAppointment.getAppointmentId())
                .ifPresent(room -> {
                    MessageDTO sysMsg = MessageDTO.builder()
                            .messageId("sys_" + java.util.UUID.randomUUID().toString())
                            .chatRoomId(room.getChatRoomId())
                            .content("[SYSTEM_BLOCK_UPDATE]")
                            .senderId("SYSTEM")
                            .timestamp(java.time.LocalDateTime.now())
                            .build();
                    messagingTemplate.convertAndSendToUser(room.getUser1Id(), "/queue/chat", sysMsg);
                    messagingTemplate.convertAndSendToUser(room.getUser2Id(), "/queue/chat", sysMsg);
                });
        } catch (Exception e) {
            e.printStackTrace();
        }

        Appointment followUpAppointment = null;
        Integer followUpPrescriptionHeaderId = null;
        boolean createdFollowUp = false;

        if (consultation != null && consultation.getFollowUpAppointmentId() != null) {
            followUpAppointment = findExistingFollowUpAppointment(consultation);
        }

        if (followUpAppointment == null && consultation != null && consultation.getFollowUpDate() != null) {
            followUpAppointment = ensureFollowUpProposal(completedAppointment, consultation);
            consultationRepository.save(consultation);
            if (copyPrescription) {
                followUpPrescriptionHeaderId = copyLatestPrescription(completedAppointment, followUpAppointment);
            }
            createdFollowUp = true;
        }

        return CompleteAppointmentResponse.builder()
                .completedAppointment(toAppointmentResponse(completedAppointment))
                .followUpAppointment(followUpAppointment != null ? toAppointmentResponse(followUpAppointment) : null)
                .createdFollowUp(createdFollowUp)
                .followUpPrescriptionHeaderId(followUpPrescriptionHeaderId)
                .build();
    }

    // =========================================================================
    // Slot generation based on doctor's actual schedule
    // =========================================================================

    private boolean isHomeVisitType(String value) {
        return value != null
                && TYPE_HOME_VISIT.equalsIgnoreCase(value.trim().replaceAll("[\\s_-]", ""));
    }

    private boolean isRequestedHomeVisit(String consultationType) {
        return isHomeVisitType(consultationType);
    }

    private List<FollowUpSlotResponse> generateFollowUpSlotsForDay(
            String doctorId, LocalDate date, LocalDateTime now,
            String consultationType, Integer ignoredAppointmentId) {
        return buildFollowUpDayAvailability(doctorId, date, now, consultationType, ignoredAppointmentId).slots();
    }

    private record FollowUpDayAvailability(
            List<FollowUpSlotResponse> slots,
            ScheduleExceptionType exceptionType,
            boolean hasTargetSchedules) {
    }

    private FollowUpDayAvailability buildFollowUpDayAvailability(
            String doctorId, LocalDate date, LocalDateTime now,
            String consultationType, Integer ignoredAppointmentId) {

        DoctorScheduleException exception = exceptionRepository
                .findByDoctor_DoctorIdAndExceptionDate(doctorId, date).orElse(null);

        if (exception != null && exception.getExceptionType() == ScheduleExceptionType.DAY_OFF) {
            return new FollowUpDayAvailability(List.of(), ScheduleExceptionType.DAY_OFF, false);
        }

        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        List<DoctorSchedule> allSchedules = scheduleRepository
                .findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue(doctorId, dayOfWeek);

        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.plusDays(1).atStartOfDay().minusNanos(1);
        List<Appointment> bookedAppointments = appointmentRepository
                .findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                        doctorId, STATUS_CANCELLED, dayStart, dayEnd)
                .stream()
                .filter(appointment -> ignoredAppointmentId == null
                        || !ignoredAppointmentId.equals(appointment.getAppointmentId()))
                .toList();

        List<AppointmentSlotHold> activeHolds = appointmentSlotHoldRepository
                .findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                        doctorId, dayStart, dayEnd, now);

        List<HomeVisitBooking> homeVisitBookings = homeVisitBookingRepository
                .findByDoctorIdAndBookingDate(doctorId, date);

        java.util.Map<Integer, DoctorSchedule> homeVisitScheduleMap = allSchedules.stream()
                .filter(s -> isHomeVisitType(s.getConsultationType()))
                .collect(java.util.stream.Collectors.toMap(
                        DoctorSchedule::getScheduleId, s -> s, (a, b) -> a));

        List<DoctorSchedule> targetSchedules = filterSchedulesForConsultationType(allSchedules, consultationType);
        List<BlockedRange> homeVisitBlockedRanges = buildHomeVisitBookingRanges(homeVisitBookings, homeVisitScheduleMap);

        List<FollowUpSlotResponse> slots = new ArrayList<>();

        if (exception != null && exception.getExceptionType() == ScheduleExceptionType.MODIFIED) {
            int slotMinutes = resolveSlotDuration(targetSchedules);
            if (!targetSchedules.isEmpty()) {
                generateFollowUpSlotsForTimeRange(
                        slots, date, exception.getStartTime(), exception.getEndTime(),
                        slotMinutes, bookedAppointments, activeHolds, homeVisitBlockedRanges, now);
            }
        } else {
            for (DoctorSchedule schedule : targetSchedules) {
                int slotMinutes = schedule.getSlotDuration() != null ? schedule.getSlotDuration() : DEFAULT_SLOT_MINUTES;
                generateFollowUpSlotsForTimeRange(
                        slots, date, schedule.getStartTime(), schedule.getEndTime(),
                        slotMinutes, bookedAppointments, activeHolds, homeVisitBlockedRanges, now);
            }

            if (exception != null && exception.getExceptionType() == ScheduleExceptionType.ADD_SLOT) {
                int slotMinutes = resolveSlotDuration(targetSchedules);
                generateFollowUpSlotsForTimeRange(
                        slots, date, exception.getStartTime(), exception.getEndTime(),
                        slotMinutes, bookedAppointments, activeHolds, homeVisitBlockedRanges, now);
            }
        }

        slots.sort((a, b) -> a.getStartTime().compareTo(b.getStartTime()));
        return new FollowUpDayAvailability(slots, null, !targetSchedules.isEmpty());
    }

    private void generateFollowUpSlotsForTimeRange(
            List<FollowUpSlotResponse> slots,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime,
            int slotMinutes,
            List<Appointment> bookedAppointments,
            List<AppointmentSlotHold> activeHolds,
            List<BlockedRange> blockedRanges,
            LocalDateTime now) {

        LocalDateTime slotStart = LocalDateTime.of(date, startTime);
        LocalDateTime rangeEnd = LocalDateTime.of(date, endTime);

        while (!slotStart.plusMinutes(slotMinutes).isAfter(rangeEnd)) {
            LocalDateTime currentSlotStart = slotStart;
            LocalDateTime currentSlotEnd = slotStart.plusMinutes(slotMinutes);

            if (currentSlotStart.isBefore(now)) {
                slotStart = currentSlotEnd;
                continue;
            }

            Appointment bookedAppointment = bookedAppointments.stream()
                    .filter(a -> overlaps(a, currentSlotStart, currentSlotEnd))
                    .findFirst()
                    .orElse(null);

            boolean hasHold = activeHolds.stream()
                    .anyMatch(h -> holdOverlaps(h, currentSlotStart, currentSlotEnd));

            BlockedRange blockedRange = blockedRanges.stream()
                    .filter(range -> range.overlaps(currentSlotStart.toLocalTime(), currentSlotEnd.toLocalTime()))
                    .findFirst()
                    .orElse(null);

            String status = (bookedAppointment != null || hasHold || blockedRange != null) ? "BOOKED" : "AVAILABLE";
            boolean selectable = bookedAppointment == null && !hasHold && blockedRange == null;
            String disabledReason = bookedAppointment != null
                    ? "Slot already booked"
                    : hasHold
                            ? "Slot is being booked by another patient"
                            : blockedRange != null ? blockedRange.reason() : null;

            String startLabel = currentSlotStart.toLocalTime().format(SLOT_TIME_FORMATTER);
            String endLabel = currentSlotEnd.toLocalTime().format(SLOT_TIME_FORMATTER);

            slots.add(FollowUpSlotResponse.builder()
                    .startTime(startLabel)
                    .endTime(endLabel)
                    .status(status)
                    .selectable(selectable)
                    .appointmentId(bookedAppointment != null ? bookedAppointment.getAppointmentId() : null)
                    .consultationId(bookedAppointment != null && bookedAppointment.getConsultation() != null
                            ? bookedAppointment.getConsultation().getConsultationId() : null)
                    .label(startLabel + " - " + endLabel)
                    .disabledReason(disabledReason)
                    .build());

            slotStart = currentSlotEnd;
        }
    }

    private int resolveSlotDuration(List<DoctorSchedule> schedules) {
        return schedules.stream()
                .filter(s -> s.getSlotDuration() != null)
                .findFirst()
                .map(DoctorSchedule::getSlotDuration)
                .orElse(30);
    }

    private boolean overlaps(Appointment appointment, LocalDateTime slotStart, LocalDateTime slotEnd) {
        if (appointment == null || appointment.getAppointmentTime() == null) {
            return false;
        }
        LocalDateTime appointmentStart = appointment.getAppointmentTime();
        LocalDateTime appointmentEnd = appointment.getEndTime() != null
                ? appointment.getEndTime()
                : appointmentStart.plusMinutes(30);
        return appointmentStart.isBefore(slotEnd) && appointmentEnd.isAfter(slotStart);
    }

    private boolean holdOverlaps(AppointmentSlotHold hold, LocalDateTime slotStart, LocalDateTime slotEnd) {
        if (hold == null || hold.getAppointmentTime() == null) {
            return false;
        }
        LocalDateTime holdStart = hold.getAppointmentTime();
        LocalDateTime holdEnd = hold.getEndTime() != null
                ? hold.getEndTime()
                : holdStart.plusMinutes(30);
        return holdStart.isBefore(slotEnd) && holdEnd.isAfter(slotStart);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private record BlockedRange(LocalTime startTime, LocalTime endTime, String reason) {
        boolean overlaps(LocalTime start, LocalTime end) {
            return start.isBefore(endTime) && startTime.isBefore(end);
        }
    }

    private List<DoctorSchedule> filterSchedulesForConsultationType(
            List<DoctorSchedule> schedules, String consultationType) {
        boolean homeVisitRequested = isRequestedHomeVisit(consultationType);
        return schedules.stream()
                .filter(schedule -> homeVisitRequested
                        ? isHomeVisitType(schedule.getConsultationType())
                        : !isHomeVisitType(schedule.getConsultationType()))
                .toList();
    }

    private List<BlockedRange> buildHomeVisitBookingRanges(
            List<HomeVisitBooking> bookings,
            java.util.Map<Integer, DoctorSchedule> homeVisitScheduleMap) {
        return bookings.stream()
                .map(booking -> {
                    LocalTime start = booking.getStartTime();
                    LocalTime end = booking.getEndTime();
                    if ((start == null || end == null) && booking.getScheduleId() != null) {
                        DoctorSchedule schedule = homeVisitScheduleMap.get(booking.getScheduleId());
                        if (schedule != null) {
                            start = schedule.getStartTime();
                            end = schedule.getEndTime();
                        }
                    }
                    if (start == null || end == null || !start.isBefore(end)) {
                        return null;
                    }
                    return new BlockedRange(start, end, "Slot blocked by home visit booking");
                })
                .filter(Objects::nonNull)
                .toList();
    }

    private YearMonth parseMonth(String month) {
        if (month == null || month.isBlank()) {
            throw new BadRequestException("Month is required");
        }
        try {
            return YearMonth.parse(month);
        } catch (DateTimeParseException ex) {
            throw new BadRequestException("Month must use YYYY-MM format");
        }
    }

    private String resolveDayStatus(
            LocalDate date,
            ScheduleExceptionType exceptionType,
            boolean hasTargetSchedules,
            int availableSlots) {
        if (date.isBefore(LocalDate.now())) {
            return "DISABLED";
        }
        if (exceptionType == ScheduleExceptionType.DAY_OFF) {
            return "DAY_OFF";
        }
        if (!hasTargetSchedules) {
            return "NO_SCHEDULE";
        }
        return availableSlots > 0 ? "AVAILABLE" : "FULL";
    }

    private Appointment createFollowUpAppointment(Appointment sourceAppointment, Consultation consultation) {
        LocalDateTime followUpDate = consultation.getFollowUpDate();
        String followUpType = consultation.getConsultationType() != null
                ? consultation.getConsultationType()
                : sourceAppointment.getConsultationType();
        int slotMinutes = resolveFollowUpSlotDuration(
                sourceAppointment.getDoctor().getDoctorId(), followUpDate, followUpType);

        Appointment followUpAppointment = Appointment.builder()
                .patient(sourceAppointment.getPatient())
                .doctor(sourceAppointment.getDoctor())
                .appointmentTime(followUpDate)
                .endTime(followUpDate.plusMinutes(slotMinutes))
                .consultationType(
                        consultation.getConsultationType() != null
                                ? consultation.getConsultationType()
                                : sourceAppointment.getConsultationType())
                .status(STATUS_PROPOSED)
                .symptoms(sourceAppointment.getSymptoms())
                .notes(firstNonBlank(consultation.getFollowUpNotes(), sourceAppointment.getNotes()))
                .fee(sourceAppointment.getDoctor() != null ? sourceAppointment.getDoctor().getConsultationFee() : sourceAppointment.getFee())
                .followUpSourceAppointmentId(sourceAppointment.getAppointmentId())
                .build();

        return appointmentRepository.save(followUpAppointment);
    }

    private Appointment ensureFollowUpProposal(Appointment sourceAppointment, Consultation consultation) {
        Appointment existing = findExistingFollowUpAppointment(consultation);
        if (existing != null && !STATUS_CANCELLED.equalsIgnoreCase(existing.getStatus())) {
            return existing;
        }
        validateFollowUpSlot(sourceAppointment, consultation.getFollowUpDate(), consultation.getConsultationType());
        Appointment proposal = createFollowUpAppointment(sourceAppointment, consultation);
        consultation.setFollowUpAppointmentId(proposal.getAppointmentId());
        consultation.setFollowUpStatus(FollowUpStatus.PROPOSED);
        return proposal;
    }

    private int resolveFollowUpSlotDuration(
            String doctorId,
            LocalDateTime dateTime,
            String consultationType) {
        int dayOfWeek = dateTime.getDayOfWeek().getValue() % 7;
        LocalTime requestedTime = dateTime.toLocalTime();

        return scheduleRepository
                .findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue(doctorId, dayOfWeek)
                .stream()
                .filter(schedule -> sameConsultationType(schedule.getConsultationType(), consultationType))
                .filter(schedule -> !requestedTime.isBefore(schedule.getStartTime())
                        && requestedTime.isBefore(schedule.getEndTime()))
                .findFirst()
                .map(schedule -> schedule.getSlotDuration() != null ? schedule.getSlotDuration() : 30)
                .orElse(30);
    }

    private Appointment findExistingFollowUpAppointment(Consultation consultation) {
        if (consultation == null || consultation.getFollowUpAppointmentId() == null) {
            return null;
        }
        return appointmentRepository.findById(consultation.getFollowUpAppointmentId()).orElse(null);
    }

    private Integer copyLatestPrescription(Appointment sourceAppointment, Appointment followUpAppointment) {
        List<PrescriptionHeader> sourcePrescriptions = prescriptionHeaderRepository
                .findByAppointment_AppointmentIdOrderByIssueDateDescPrescriptionHeaderIdDesc(
                        sourceAppointment.getAppointmentId());

        if (sourcePrescriptions.isEmpty()) {
            return null;
        }

        PrescriptionHeader source = sourcePrescriptions.getFirst();
        PrescriptionHeader copy = PrescriptionHeader.builder()
                .appointment(followUpAppointment)
                .patient(followUpAppointment.getPatient())
                .doctor(followUpAppointment.getDoctor())
                .issueDate(LocalDateTime.now())
                .diagnosis(source.getDiagnosis())
                .notes(source.getNotes())
                .validUntil(source.getValidUntil())
                .status(firstNonBlank(source.getStatus(), "ISSUED").toUpperCase())
                .sourceAppointmentId(sourceAppointment.getAppointmentId())
                .sourcePrescriptionHeaderId(source.getPrescriptionHeaderId())
                .totalAmount(source.getTotalAmount())
                .prescriptionItems(new ArrayList<>())
                .build();

        if (source.getPrescriptionItems() != null) {
            for (PrescriptionItem sourceItem : source.getPrescriptionItems()) {
                copy.getPrescriptionItems().add(PrescriptionItem.builder()
                        .prescriptionHeader(copy)
                        .medicine(sourceItem.getMedicine())
                        .medicationName(sourceItem.getMedicationName())
                        .dosage(sourceItem.getDosage())
                        .instructions(sourceItem.getInstructions())
                        .totalSupplyDays(sourceItem.getTotalSupplyDays())
                        .quantity(sourceItem.getQuantity())
                        .unit(sourceItem.getUnit())
                        .frequency(sourceItem.getFrequency())
                        .timing(sourceItem.getTiming())
                        .route(sourceItem.getRoute())
                        .notes(sourceItem.getNotes())
                        .build());
            }
        }

        PrescriptionHeader saved = prescriptionHeaderRepository.save(copy);
        return saved.getPrescriptionHeaderId();
    }

    private FollowUpHomeVisitDetailsDto toFollowUpHomeVisitDetailsDto(HomeVisitDetails details) {
        if (details == null) {
            return null;
        }
        return FollowUpHomeVisitDetailsDto.builder()
                .visitAddress(details.getVisitAddress())
                .visitCity(details.getVisitCity())
                .contactPhone(details.getContactPhone())
                .reasonForHomeVisit(details.getReasonForHomeVisit())
                .specialNotes(details.getSpecialNotes())
                .isForSelf(details.getIsForSelf())
                .receiverName(details.getReceiverName())
                .receiverAge(details.getReceiverAge())
                .receiverGender(details.getReceiverGender())
                .receiverRelationship(details.getReceiverRelationship())
                .receiverPhone(details.getReceiverPhone())
                .visitLatitude(details.getVisitLatitude())
                .visitLongitude(details.getVisitLongitude())
                .build();
    }

    private FollowUpResponse toFollowUpResponse(Consultation c) {
        return FollowUpResponse.builder()
                .consultationId(c.getConsultationId())
                .appointmentId(c.getAppointment() != null
                        ? c.getAppointment().getAppointmentId() : null)
                .followUpAppointmentId(c.getFollowUpAppointmentId())
                .followUpDate(c.getFollowUpDate())
                .followUpNotes(c.getFollowUpNotes())
                .diagnosis(c.getDiagnosis())
                .doctorNotes(c.getDoctorNotes())
                .treatmentPlan(c.getTreatmentPlan())
                .consultationType(c.getConsultationType())
                .followUpStatus(c.getFollowUpStatus() != null
                        ? c.getFollowUpStatus().name() : null)
                .homeVisitLatitude(c.getHomeVisitLatitude())
                .homeVisitLongitude(c.getHomeVisitLongitude())
                .homeVisitServiceIds(c.getHomeVisitServiceIds())
                .build();
    }

    private AppointmentResponse toAppointmentResponse(Appointment appointment) {
        Consultation consultation = appointment.getConsultation();
        return AppointmentResponse.builder()
                .appointmentId(appointment.getAppointmentId())
                .patientId(appointment.getPatient() != null ? appointment.getPatient().getPatientId() : null)
                .patientName(appointment.getPatient() != null ? appointment.getPatient().getFullName() : null)
                .doctorId(appointment.getDoctor() != null ? appointment.getDoctor().getDoctorId() : null)
                .doctorName(appointment.getDoctor() != null ? appointment.getDoctor().getFullName() : null)
                .doctorAvatar(appointment.getDoctor() != null ? appointment.getDoctor().getAvatarUrl() : null)
                .appointmentTime(appointment.getAppointmentTime())
                .consultationType(appointment.getConsultationType())
                .status(appointment.getStatus())
                .fee(appointment.getFee())
                .symptoms(appointment.getSymptoms())
                .notes(appointment.getNotes())
                .consultationStartTime(consultation != null ? consultation.getStartTime() : null)
                .consultationEndTime(consultation != null ? consultation.getEndTime() : null)
                .cancelledAt(appointment.getCancelledAt())
                .cancelReason(appointment.getCancelReason())
                .cancelledBy(appointment.getCancelledBy())
                .confirmedAt(appointment.getConfirmedAt())
                .specialtyName(resolveSpecialtyName(appointment.getDoctor()))
                .followUpDate(consultation != null ? consultation.getFollowUpDate() : null)
                .followUpAppointmentId(consultation != null ? consultation.getFollowUpAppointmentId() : null)
                .followUpNotes(consultation != null ? consultation.getFollowUpNotes() : null)
                .build();
    }

    private String resolveSpecialtyName(Doctor doctor) {
        if (doctor == null) {
            return null;
        }
        return doctor.getSpecialtyEntity() != null
                ? doctor.getSpecialtyEntity().getName()
                : doctor.getSpecialty();
    }

    private String firstNonBlank(String first, String fallback) {
        return first != null && !first.isBlank() ? first : fallback;
    }
}
