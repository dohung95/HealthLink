package com.HealthLink.service.impl.followup;

import com.HealthLink.dto.consultation.FollowUpRequest;
import com.HealthLink.dto.consultation.FollowUpResponse;
import com.HealthLink.dto.response.AppointmentResponse;
import com.HealthLink.dto.response.CompleteAppointmentResponse;
import com.HealthLink.dto.response.FollowUpCalendarDayResponse;
import com.HealthLink.dto.response.FollowUpCalendarResponse;
import com.HealthLink.dto.response.FollowUpSlotResponse;
import com.HealthLink.dto.response.FollowUpSlotsResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.entity.DoctorScheduleException;
import com.HealthLink.entity.Invoice;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.PrescriptionItem;
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
import com.HealthLink.service.followup.FollowUpAppointmentService;
import com.HealthLink.service.payment.CommissionService;
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

    private final AppointmentRepository appointmentRepository;
    private final ConsultationRepository consultationRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final DoctorScheduleExceptionRepository exceptionRepository;
    private final InvoiceRepository invoiceRepository;
    private final PrescriptionHeaderRepository prescriptionHeaderRepository;
    private final CommissionService commissionService;

    @Override
    @Transactional(readOnly = true)
    public FollowUpSlotsResponse getSlots(String doctorId, LocalDate date) {
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
                .slots(generateFollowUpSlotsForDay(doctorId, date, LocalDateTime.now()))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public FollowUpCalendarResponse getCalendar(String doctorId, String month) {
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
            List<FollowUpSlotResponse> slots = generateFollowUpSlotsForDay(doctorId, date, now);
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
                    .status(resolveDayStatus(date, availableSlots))
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
    public void validateFollowUpSlot(Appointment appointment, LocalDateTime followUpDate) {
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
                doctorId, followUpDate.toLocalDate(), LocalDateTime.now());

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
        if (sourceAppointment == null) {
            throw new BadRequestException("Source appointment is required");
        }
        if ("COMPLETED".equalsIgnoreCase(sourceAppointment.getStatus())) {
            throw new BadRequestException("Completed appointment cannot schedule follow-up");
        }
        if ("CANCELLED".equalsIgnoreCase(sourceAppointment.getStatus())) {
            throw new BadRequestException("Cancelled appointment cannot schedule follow-up");
        }

        LocalDateTime followUpDate = request.getFollowUpDate();
        if (followUpDate == null) {
            throw new BadRequestException("Follow-up date is required to schedule a follow-up appointment");
        }

        Consultation consultation = sourceAppointment.getConsultation();
        if (consultation == null) {
            consultation = consultationRepository.findByAppointment_AppointmentId(
                    sourceAppointment.getAppointmentId()).orElse(null);
        }

        if (consultation != null && consultation.getFollowUpAppointmentId() != null) {
            Appointment existingFollowUp = appointmentRepository
                    .findById(consultation.getFollowUpAppointmentId()).orElse(null);
            if (existingFollowUp != null && !"CANCELLED".equalsIgnoreCase(existingFollowUp.getStatus())) {
                return rescheduleExistingFollowUp(sourceAppointment, consultation, existingFollowUp, request);
            }
        }

        validateFollowUpSlot(sourceAppointment, followUpDate);

        if (consultation == null) {
            consultation = Consultation.builder()
                    .appointment(sourceAppointment)
                    .consultationType(
                            request.getConsultationType() != null
                                    ? request.getConsultationType()
                                    : sourceAppointment.getConsultationType())
                    .symptoms(sourceAppointment.getSymptoms())
                    .build();
        } else if (request.getConsultationType() != null) {
            consultation.setConsultationType(request.getConsultationType());
        }

        int slotMinutes = resolveFollowUpSlotDuration(
                sourceAppointment.getDoctor().getDoctorId(), followUpDate);

        Appointment followUpAppointment = Appointment.builder()
                .patient(sourceAppointment.getPatient())
                .doctor(sourceAppointment.getDoctor())
                .appointmentTime(followUpDate)
                .endTime(followUpDate.plusMinutes(slotMinutes))
                .consultationType(
                        request.getConsultationType() != null
                                ? request.getConsultationType()
                                : sourceAppointment.getConsultationType())
                .status("SCHEDULED")
                .symptoms(sourceAppointment.getSymptoms())
                .notes(request.getFollowUpNotes() != null ? request.getFollowUpNotes() : sourceAppointment.getNotes())
                .fee(sourceAppointment.getDoctor() != null
                        ? sourceAppointment.getDoctor().getConsultationFee()
                        : sourceAppointment.getFee())
                .followUpSourceAppointmentId(sourceAppointment.getAppointmentId())
                .build();

        Appointment savedFollowUp = appointmentRepository.save(followUpAppointment);

        consultation.setFollowUpDate(followUpDate);
        consultation.setFollowUpNotes(request.getFollowUpNotes());
        consultation.setFollowUpAppointmentId(savedFollowUp.getAppointmentId());

        Consultation savedConsultation = consultationRepository.save(consultation);
        sourceAppointment.setConsultation(savedConsultation);

        return toFollowUpResponse(savedConsultation);
    }

    private FollowUpResponse rescheduleExistingFollowUp(
            Appointment sourceAppointment,
            Consultation consultation,
            Appointment existingFollowUp,
            FollowUpRequest request) {

        LocalDateTime newDate = request.getFollowUpDate();

        List<FollowUpSlotResponse> slots = generateFollowUpSlotsForDay(
                sourceAppointment.getDoctor().getDoctorId(),
                newDate.toLocalDate(),
                LocalDateTime.now());

        boolean isAvailable = slots.stream()
                .anyMatch(slot -> "AVAILABLE".equals(slot.getStatus())
                        && slot.getStartTime().equals(newDate.format(SLOT_TIME_FORMATTER)));

        if (!isAvailable) {
            throw new BadRequestException("The selected follow-up slot is not available for rescheduling");
        }

        int slotMinutes = resolveFollowUpSlotDuration(
                sourceAppointment.getDoctor().getDoctorId(), newDate);

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
        consultationRepository.save(consultation);
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
        commissionService.processConsultationCommission(invoice);

        Appointment followUpAppointment = null;
        Integer followUpPrescriptionHeaderId = null;
        boolean createdFollowUp = false;

        if (consultation != null && consultation.getFollowUpAppointmentId() != null) {
            followUpAppointment = findExistingFollowUpAppointment(consultation);
        }

        if (followUpAppointment == null && consultation != null && consultation.getFollowUpDate() != null) {
            validateFollowUpSlot(completedAppointment, consultation.getFollowUpDate());
            followUpAppointment = createFollowUpAppointment(completedAppointment, consultation);
            consultation.setFollowUpAppointmentId(followUpAppointment.getAppointmentId());
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

    private List<FollowUpSlotResponse> generateFollowUpSlotsForDay(
            String doctorId, LocalDate date, LocalDateTime now) {

        DoctorScheduleException exception = exceptionRepository
                .findByDoctor_DoctorIdAndExceptionDate(doctorId, date).orElse(null);

        if (exception != null && exception.getExceptionType() == ScheduleExceptionType.DAY_OFF) {
            return List.of();
        }

        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        List<DoctorSchedule> schedules = scheduleRepository
                .findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue(doctorId, dayOfWeek);

        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.plusDays(1).atStartOfDay().minusNanos(1);
        List<Appointment> bookedAppointments = appointmentRepository
                .findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                        doctorId, "CANCELLED", dayStart, dayEnd);

        List<FollowUpSlotResponse> slots = new ArrayList<>();

        if (exception != null && exception.getExceptionType() == ScheduleExceptionType.MODIFIED) {
            int slotMinutes = resolveSlotDuration(schedules);
            generateFollowUpSlotsForTimeRange(
                    slots, date, exception.getStartTime(), exception.getEndTime(),
                    slotMinutes, bookedAppointments, now);
        } else {
            for (DoctorSchedule schedule : schedules) {
                int slotMinutes = schedule.getSlotDuration() != null ? schedule.getSlotDuration() : 30;
                generateFollowUpSlotsForTimeRange(
                        slots, date, schedule.getStartTime(), schedule.getEndTime(),
                        slotMinutes, bookedAppointments, now);
            }

            if (exception != null && exception.getExceptionType() == ScheduleExceptionType.ADD_SLOT) {
                int slotMinutes = resolveSlotDuration(schedules);
                generateFollowUpSlotsForTimeRange(
                        slots, date, exception.getStartTime(), exception.getEndTime(),
                        slotMinutes, bookedAppointments, now);
            }
        }

        slots.sort((a, b) -> a.getStartTime().compareTo(b.getStartTime()));
        return slots;
    }

    private void generateFollowUpSlotsForTimeRange(
            List<FollowUpSlotResponse> slots,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime,
            int slotMinutes,
            List<Appointment> bookedAppointments,
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

            String status = bookedAppointment != null ? "BOOKED" : "AVAILABLE";
            boolean selectable = bookedAppointment == null;

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
                    .disabledReason(bookedAppointment != null ? "Slot already booked" : null)
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

    // =========================================================================
    // Helpers
    // =========================================================================

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

    private String resolveDayStatus(LocalDate date, int availableSlots) {
        if (date.isBefore(LocalDate.now())) {
            return "DISABLED";
        }
        return availableSlots > 0 ? "AVAILABLE" : "FULL";
    }

    private Appointment createFollowUpAppointment(Appointment sourceAppointment, Consultation consultation) {
        LocalDateTime followUpDate = consultation.getFollowUpDate();
        int slotMinutes = resolveFollowUpSlotDuration(sourceAppointment.getDoctor().getDoctorId(), followUpDate);

        Appointment followUpAppointment = Appointment.builder()
                .patient(sourceAppointment.getPatient())
                .doctor(sourceAppointment.getDoctor())
                .appointmentTime(followUpDate)
                .endTime(followUpDate.plusMinutes(slotMinutes))
                .consultationType(
                        consultation.getConsultationType() != null
                                ? consultation.getConsultationType()
                                : sourceAppointment.getConsultationType())
                .status("SCHEDULED")
                .symptoms(firstNonBlank(consultation.getSymptoms(), sourceAppointment.getSymptoms()))
                .notes(firstNonBlank(consultation.getFollowUpNotes(), sourceAppointment.getNotes()))
                .fee(sourceAppointment.getDoctor() != null ? sourceAppointment.getDoctor().getConsultationFee() : sourceAppointment.getFee())
                .followUpSourceAppointmentId(sourceAppointment.getAppointmentId())
                .build();

        return appointmentRepository.save(followUpAppointment);
    }

    private int resolveFollowUpSlotDuration(String doctorId, LocalDateTime dateTime) {
        int dayOfWeek = dateTime.getDayOfWeek().getValue() % 7;
        LocalTime requestedTime = dateTime.toLocalTime();

        return scheduleRepository
                .findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue(doctorId, dayOfWeek)
                .stream()
                .filter(s -> !requestedTime.isBefore(s.getStartTime()) && requestedTime.isBefore(s.getEndTime()))
                .findFirst()
                .map(s -> s.getSlotDuration() != null ? s.getSlotDuration() : 30)
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
                        .unitPrice(sourceItem.getUnitPrice())
                        .totalPrice(sourceItem.getTotalPrice())
                        .notes(sourceItem.getNotes())
                        .build());
            }
        }

        PrescriptionHeader saved = prescriptionHeaderRepository.save(copy);
        return saved.getPrescriptionHeaderId();
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
