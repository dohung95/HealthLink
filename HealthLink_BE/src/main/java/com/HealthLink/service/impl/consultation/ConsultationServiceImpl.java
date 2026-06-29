package com.HealthLink.service.impl.consultation;

import com.HealthLink.dto.consultation.ConsultationNotesRequest;
import com.HealthLink.dto.consultation.ConsultationResponse;
import com.HealthLink.dto.consultation.FollowUpRequest;
import com.HealthLink.dto.consultation.FollowUpResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Invoice;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.repository.payment.InvoiceRepository;
import com.HealthLink.service.consultation.ConsultationService;
import com.HealthLink.service.followup.FollowUpAppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ConsultationServiceImpl implements ConsultationService {

    private final ConsultationRepository consultationRepository;
    private final AppointmentRepository appointmentRepository;
    private final InvoiceRepository invoiceRepository;
    private final FollowUpAppointmentService followUpAppointmentService;

    // -------------------------------------------------------------------------
    // Cập nhật ngày tái khám
    // -------------------------------------------------------------------------
    @Override
    @Transactional
    public FollowUpResponse updateFollowUp(Integer consultationId, FollowUpRequest request) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Consultation", "id", consultationId));

        Appointment appointment = consultation.getAppointment();
        if (appointment == null) {
            throw new BadRequestException("Consultation has no associated appointment");
        }

        if (request.getFollowUpDate() == null) {
            followUpAppointmentService.cancelPendingFollowUp(appointment);
            return toResponse(consultationRepository.findById(consultationId)
                    .orElse(consultation));
        }

        return followUpAppointmentService.scheduleFollowUpAppointment(appointment, request);
    }

    @Override
    @Transactional
    public FollowUpResponse updateFollowUpByAppointment(Integer appointmentId, FollowUpRequest request) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Appointment", "id", appointmentId));

        if ("COMPLETED".equalsIgnoreCase(appointment.getStatus())) {
            Consultation consultation = appointment.getConsultation();
            if (consultation == null) {
                consultation = consultationRepository.findByAppointment_AppointmentId(appointmentId)
                        .orElse(null);
            }
            if (consultation != null && consultation.getFollowUpAppointmentId() != null) {
                throw new BadRequestException("Completed appointments cannot update follow-up. The follow-up appointment is active.");
            }
            throw new BadRequestException("Completed appointments cannot update follow-up");
        }

        if (request.getFollowUpDate() == null) {
            followUpAppointmentService.cancelPendingFollowUp(appointment);
            return buildEmptyFollowUpResponse(appointmentId);
        }

        return followUpAppointmentService.scheduleFollowUpAppointment(appointment, request);
    }

    @Override
    @Transactional
    public ConsultationResponse startByAppointment(Integer appointmentId) {
        return startByAppointment(appointmentId, false);
    }

    @Override
    @Transactional
    public ConsultationResponse startByAppointmentForTesting(Integer appointmentId) {
        return startByAppointment(appointmentId, true);
    }

    private ConsultationResponse startByAppointment(Integer appointmentId, boolean ignoreAppointmentTime) {
        Appointment appointment = getAppointmentOrThrow(appointmentId);

        assertCanStart(appointment, ignoreAppointmentTime);

        Consultation consultation = resolveConsultation(appointment);
        if (consultation.getStartTime() == null) {
            consultation.setStartTime(LocalDateTime.now());
        }

        appointment.setStatus("IN_CONSULTATION");
        appointmentRepository.save(appointment);

        Consultation saved = consultationRepository.save(consultation);
        appointment.setConsultation(saved);
        return toConsultationResponse(saved);
    }

    @Override
    @Transactional
    public ConsultationResponse updateNotesByAppointment(Integer appointmentId, ConsultationNotesRequest request) {
        Appointment appointment = getAppointmentOrThrow(appointmentId);

        if ("COMPLETED".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Completed appointments cannot update consultation notes");
        }
        if ("CANCELLED".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Cancelled appointments cannot update consultation notes");
        }

        Consultation consultation = appointment.getConsultation();
        if (consultation == null) {
            consultation = consultationRepository.findByAppointment_AppointmentId(appointmentId)
                    .orElseThrow(() -> new BadRequestException(
                            "Consultation must be started before notes can be updated"));
        }
        if (consultation.getStartTime() == null) {
            throw new BadRequestException("Consultation must be started before notes can be updated");
        }

        consultation.setDiagnosis(cleanText(request.getDiagnosis()));
        consultation.setDoctorNotes(cleanText(request.getDoctorNotes()));
        consultation.setTreatmentPlan(cleanText(request.getTreatmentPlan()));

        Consultation saved = consultationRepository.save(consultation);
        appointment.setConsultation(saved);
        return toConsultationResponse(saved);
    }

    // -------------------------------------------------------------------------
    // Lấy thông tin tái khám
    // -------------------------------------------------------------------------
    @Override
    @Transactional(readOnly = true)
    public FollowUpResponse getFollowUp(Integer consultationId) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Consultation", "id", consultationId));
        return toResponse(consultation);
    }

    // -------------------------------------------------------------------------
    // Mapper
    // -------------------------------------------------------------------------
    private FollowUpResponse toResponse(Consultation c) {
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
                .homeVisitLatitude(c.getHomeVisitLatitude())
                .homeVisitLongitude(c.getHomeVisitLongitude())
                .homeVisitServiceIds(c.getHomeVisitServiceIds())
                .build();
    }

    private FollowUpResponse buildEmptyFollowUpResponse(Integer appointmentId) {
        return FollowUpResponse.builder()
                .appointmentId(appointmentId)
                .build();
    }

    private Appointment getAppointmentOrThrow(Integer appointmentId) {
        return appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Appointment", "id", appointmentId));
    }

    private Consultation resolveConsultation(Appointment appointment) {
        Consultation consultation = appointment.getConsultation();
        if (consultation == null) {
            consultation = consultationRepository.findByAppointment_AppointmentId(appointment.getAppointmentId())
                    .orElse(null);
        }
        if (consultation != null) {
            return consultation;
        }
        return Consultation.builder()
                .appointment(appointment)
                .consultationType(appointment.getConsultationType())
                .build();
    }

    private void assertCanStart(Appointment appointment, boolean ignoreAppointmentTime) {
        if (!"SCHEDULED".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Only scheduled appointments can be started");
        }
        if (!ignoreAppointmentTime &&
                (appointment.getAppointmentTime() == null || LocalDateTime.now().isBefore(appointment.getAppointmentTime()))) {
            throw new BadRequestException("Consultation can only be started when the appointment time has arrived");
        }

        Invoice invoice = appointment.getInvoice();
        if (invoice == null) {
            invoice = invoiceRepository.findByAppointment_AppointmentId(appointment.getAppointmentId())
                    .orElse(null);
        }
        if (invoice == null || !"PAID".equalsIgnoreCase(invoice.getStatus())) {
            throw new BadRequestException("Appointment must be paid before consultation can be started");
        }
    }

    private String cleanText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ConsultationResponse toConsultationResponse(Consultation c) {
        return ConsultationResponse.builder()
                .consultationId(c.getConsultationId())
                .appointmentId(c.getAppointment() != null
                        ? c.getAppointment().getAppointmentId() : null)
                .startTime(c.getStartTime())
                .endTime(c.getEndTime())
                .diagnosis(c.getDiagnosis())
                .doctorNotes(c.getDoctorNotes())
                .treatmentPlan(c.getTreatmentPlan())
                .followUpDate(c.getFollowUpDate())
                .followUpNotes(c.getFollowUpNotes())
                .build();
    }
}
