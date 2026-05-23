package com.HealthLink.service.impl.consultation;

import com.HealthLink.dto.consultation.FollowUpRequest;
import com.HealthLink.dto.consultation.FollowUpResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.service.consultation.ConsultationService;
import com.HealthLink.service.followup.FollowUpAppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ConsultationServiceImpl implements ConsultationService {

    private final ConsultationRepository consultationRepository;
    private final AppointmentRepository appointmentRepository;
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

        if (consultation.getFollowUpAppointmentId() != null) {
            throw new BadRequestException("Follow-up appointment has already been created");
        }

        if (request.getFollowUpDate() == null) {
            consultation.setFollowUpDate(null);
            consultation.setFollowUpNotes(null);

            Consultation saved = consultationRepository.save(consultation);
            return toResponse(saved);
        }

        followUpAppointmentService.validateFollowUpSlot(
                consultation.getAppointment(),
                request.getFollowUpDate());

        consultation.setFollowUpDate(request.getFollowUpDate());
        consultation.setFollowUpNotes(request.getFollowUpNotes());

        Consultation saved = consultationRepository.save(consultation);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public FollowUpResponse updateFollowUpByAppointment(Integer appointmentId, FollowUpRequest request) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Appointment", "id", appointmentId));

        Consultation consultation = appointment.getConsultation();
        if (consultation == null) {
            consultation = consultationRepository.findByAppointment_AppointmentId(appointmentId)
                    .orElse(null);
        }

        if ("Completed".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Completed appointments cannot update follow-up");
        }

        if (consultation != null && consultation.getFollowUpAppointmentId() != null) {
            throw new BadRequestException("Follow-up appointment has already been created");
        }

        if (request.getFollowUpDate() == null) {
            if (consultation == null) {
                return toResponseForAppointment(appointment);
            }

            consultation.setFollowUpDate(null);
            consultation.setFollowUpNotes(null);
            Consultation saved = consultationRepository.save(consultation);
            appointment.setConsultation(saved);
            return toResponse(saved);
        }

        followUpAppointmentService.validateFollowUpSlot(
                appointment,
                request.getFollowUpDate());

        if (consultation == null) {
            consultation = Consultation.builder()
                    .appointment(appointment)
                    .consultationType(appointment.getConsultationType())
                    .symptoms(appointment.getSymptoms())
                    .build();
        }

        consultation.setFollowUpDate(request.getFollowUpDate());
        consultation.setFollowUpNotes(request.getFollowUpNotes());

        Consultation saved = consultationRepository.save(consultation);
        appointment.setConsultation(saved);
        return toResponse(saved);
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
                .build();
    }

    private FollowUpResponse toResponseForAppointment(Appointment appointment) {
        return FollowUpResponse.builder()
                .appointmentId(appointment.getAppointmentId())
                .build();
    }
}
