package com.HealthLink.service.impl.followup;

import com.HealthLink.dto.response.AppointmentResponse;
import com.HealthLink.dto.response.CompleteAppointmentResponse;
import com.HealthLink.dto.response.FollowUpCalendarDayResponse;
import com.HealthLink.dto.response.FollowUpCalendarResponse;
import com.HealthLink.dto.response.FollowUpSlotResponse;
import com.HealthLink.dto.response.FollowUpSlotsResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Invoice;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.PrescriptionItem;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
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

@Service
@RequiredArgsConstructor
public class FollowUpAppointmentServiceImpl implements FollowUpAppointmentService {

    private static final LocalTime OPEN_TIME = LocalTime.of(9, 0);
    private static final LocalTime CLOSE_TIME = LocalTime.of(21, 0);
    private static final int SLOT_MINUTES = 60;
    private static final int TOTAL_SLOTS = 12;
    private static final DateTimeFormatter SLOT_TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final AppointmentRepository appointmentRepository;
    private final ConsultationRepository consultationRepository;
    private final DoctorRepository doctorRepository;
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

        List<Appointment> appointments = findActiveAppointmentsForDay(doctorId, date);

        return FollowUpSlotsResponse.builder()
                .doctorId(doctorId)
                .date(date)
                .slots(buildSlots(date, appointments))
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
        LocalDateTime monthStart = yearMonth.atDay(1).atStartOfDay();
        LocalDateTime monthEnd = yearMonth.plusMonths(1).atDay(1).atStartOfDay().minusNanos(1);

        List<Appointment> monthAppointments = appointmentRepository
                .findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                        doctorId,
                        "CANCELLED",
                        monthStart,
                        monthEnd
                );

        List<FollowUpCalendarDayResponse> days = new ArrayList<>();
        for (int day = 1; day <= yearMonth.lengthOfMonth(); day++) {
            LocalDate date = yearMonth.atDay(day);
            List<FollowUpSlotResponse> slots = buildSlots(
                    date,
                    monthAppointments.stream()
                            .filter(appointment -> appointment.getAppointmentTime() != null
                                    && appointment.getAppointmentTime().toLocalDate().equals(date))
                            .toList()
            );
            int bookedSlots = (int) slots.stream()
                    .filter(slot -> "BOOKED".equals(slot.getStatus()))
                    .count();
            int availableSlots = (int) slots.stream()
                    .filter(slot -> "AVAILABLE".equals(slot.getStatus()))
                    .count();

            days.add(FollowUpCalendarDayResponse.builder()
                    .date(date)
                    .totalSlots(TOTAL_SLOTS)
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
        validateFollowUpDateTime(followUpDate);

        String doctorId = appointment.getDoctor().getDoctorId();
        Appointment blockingAppointment = findBlockingAppointment(doctorId, followUpDate, followUpDate.plusMinutes(SLOT_MINUTES));
        if (blockingAppointment != null) {
            throw new BadRequestException("The selected follow-up slot is already booked");
        }
    }

    @Override
    @Transactional
    public CompleteAppointmentResponse completeAppointment(Integer appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", appointmentId));

        Consultation consultation = appointment.getConsultation();
        if (consultation == null) {
            consultation = consultationRepository.findByAppointment_AppointmentId(appointmentId).orElse(null);
        }

        if ("Completed".equalsIgnoreCase(appointment.getStatus())) {
            Appointment existingFollowUp = findExistingFollowUpAppointment(consultation);
            return CompleteAppointmentResponse.builder()
                    .completedAppointment(toAppointmentResponse(appointment))
                    .followUpAppointment(existingFollowUp != null ? toAppointmentResponse(existingFollowUp) : null)
                    .createdFollowUp(false)
                    .build();
        }

        if ("Cancelled".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Cancelled appointments cannot be completed");
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
        if (!"Paid".equalsIgnoreCase(invoice.getStatus())) {
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

        if (consultation != null && consultation.getFollowUpDate() != null) {
            followUpAppointment = findExistingFollowUpAppointment(consultation);

            if (followUpAppointment == null) {
                validateFollowUpSlot(completedAppointment, consultation.getFollowUpDate());
                followUpAppointment = createFollowUpAppointment(completedAppointment, consultation);
                consultation.setFollowUpAppointmentId(followUpAppointment.getAppointmentId());
                consultationRepository.save(consultation);
                followUpPrescriptionHeaderId = copyLatestPrescription(completedAppointment, followUpAppointment);
                createdFollowUp = true;
            }
        }

        return CompleteAppointmentResponse.builder()
                .completedAppointment(toAppointmentResponse(completedAppointment))
                .followUpAppointment(followUpAppointment != null ? toAppointmentResponse(followUpAppointment) : null)
                .createdFollowUp(createdFollowUp)
                .followUpPrescriptionHeaderId(followUpPrescriptionHeaderId)
                .build();
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

    private List<Appointment> findActiveAppointmentsForDay(String doctorId, LocalDate date) {
        return appointmentRepository.findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                doctorId,
                "CANCELLED",
                date.atStartOfDay(),
                date.plusDays(1).atStartOfDay().minusNanos(1)
        );
    }

    private List<FollowUpSlotResponse> buildSlots(LocalDate date, List<Appointment> appointments) {
        List<FollowUpSlotResponse> slots = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (LocalTime time = OPEN_TIME; time.isBefore(CLOSE_TIME); time = time.plusMinutes(SLOT_MINUTES)) {
            LocalDateTime slotStart = LocalDateTime.of(date, time);
            LocalDateTime slotEnd = slotStart.plusMinutes(SLOT_MINUTES);
            Appointment bookedAppointment = appointments.stream()
                    .filter(appointment -> overlaps(appointment, slotStart, slotEnd))
                    .findFirst()
                    .orElse(null);

            String status = "AVAILABLE";
            boolean selectable = true;
            String disabledReason = null;

            if (bookedAppointment != null) {
                status = "BOOKED";
                selectable = false;
                disabledReason = "Slot already booked";
            } else if (!slotStart.isAfter(now)) {
                status = "DISABLED";
                selectable = false;
                disabledReason = "Past time";
            }

            String startLabel = slotStart.toLocalTime().format(SLOT_TIME_FORMATTER);
            String endLabel = slotEnd.toLocalTime().format(SLOT_TIME_FORMATTER);

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
        }

        return slots;
    }

    private String resolveDayStatus(LocalDate date, int availableSlots) {
        if (date.isBefore(LocalDate.now())) {
            return "DISABLED";
        }
        return availableSlots > 0 ? "AVAILABLE" : "FULL";
    }

    private void validateFollowUpDateTime(LocalDateTime followUpDate) {
        if (followUpDate == null) {
            throw new BadRequestException("Follow-up date is required");
        }
        if (!followUpDate.isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Follow-up date must be in the future");
        }
        if (followUpDate.getMinute() != 0 || followUpDate.getSecond() != 0 || followUpDate.getNano() != 0) {
            throw new BadRequestException("Follow-up slot must start on the hour");
        }

        LocalTime time = followUpDate.toLocalTime();
        if (time.isBefore(OPEN_TIME) || !time.isBefore(CLOSE_TIME)) {
            throw new BadRequestException("Follow-up slot must be between 09:00 and 20:00");
        }
    }

    private Appointment findBlockingAppointment(String doctorId, LocalDateTime slotStart, LocalDateTime slotEnd) {
        return findActiveAppointmentsForDay(doctorId, slotStart.toLocalDate()).stream()
                .filter(appointment -> overlaps(appointment, slotStart, slotEnd))
                .findFirst()
                .orElse(null);
    }

    private boolean overlaps(Appointment appointment, LocalDateTime slotStart, LocalDateTime slotEnd) {
        if (appointment.getAppointmentTime() == null) {
            return false;
        }

        LocalDateTime appointmentStart = appointment.getAppointmentTime();
        LocalDateTime appointmentEnd = appointment.getEndTime() != null
                ? appointment.getEndTime()
                : appointmentStart.plusMinutes(SLOT_MINUTES);

        return appointmentStart.isBefore(slotEnd) && appointmentEnd.isAfter(slotStart);
    }

    private Appointment createFollowUpAppointment(Appointment sourceAppointment, Consultation consultation) {
        LocalDateTime followUpDate = consultation.getFollowUpDate();
        Appointment followUpAppointment = Appointment.builder()
                .patient(sourceAppointment.getPatient())
                .doctor(sourceAppointment.getDoctor())
                .appointmentTime(followUpDate)
                .endTime(followUpDate.plusMinutes(SLOT_MINUTES))
                .consultationType(sourceAppointment.getConsultationType())
                .status("SCHEDULED")
                .symptoms(firstNonBlank(consultation.getSymptoms(), sourceAppointment.getSymptoms()))
                .notes(firstNonBlank(consultation.getFollowUpNotes(), sourceAppointment.getNotes()))
                .fee(sourceAppointment.getDoctor() != null ? sourceAppointment.getDoctor().getConsultationFee() : sourceAppointment.getFee())
                .followUpSourceAppointmentId(sourceAppointment.getAppointmentId())
                .build();

        return appointmentRepository.save(followUpAppointment);
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

    private AppointmentResponse toAppointmentResponse(Appointment appointment) {
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
                .cancelledAt(appointment.getCancelledAt())
                .cancelReason(appointment.getCancelReason())
                .cancelledBy(appointment.getCancelledBy())
                .confirmedAt(appointment.getConfirmedAt())
                .specialtyName(resolveSpecialtyName(appointment.getDoctor()))
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
