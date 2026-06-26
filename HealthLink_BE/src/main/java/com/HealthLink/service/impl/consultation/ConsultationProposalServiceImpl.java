package com.HealthLink.service.impl.consultation;

import com.HealthLink.dto.response.ConfirmResponse;
import com.HealthLink.dto.response.ProposalResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.HomeVisitProposalStatus;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.exception.UnauthorizedAccessException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.repository.notification.NotificationRepository;
import com.HealthLink.service.consultation.ConsultationProposalService;
import com.HealthLink.service.notification.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConsultationProposalServiceImpl implements ConsultationProposalService {

    private final ConsultationRepository consultationRepository;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public ProposalResponse propose(Integer consultationId, UserDetails userDetails) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new BusinessException("Consultation not found"));

        Appointment original = consultation.getAppointment();
        User currentUser = resolveUser(userDetails);
        validateDoctorOwnership(currentUser, original);

        HomeVisitProposalStatus currentStatus = getProposalStatus(consultation);
        if (currentStatus == HomeVisitProposalStatus.PENDING) {
            throw new BusinessException("A home visit proposal is already pending for this consultation");
        }
        if (currentStatus == HomeVisitProposalStatus.ACCEPTED) {
            throw new BusinessException("This consultation already has an accepted home visit proposal");
        }

        consultation.setHomeVisitProposalStatus(HomeVisitProposalStatus.PENDING);
        consultation.setHomeVisitProposedAt(LocalDateTime.now());
        consultation.setHomeVisitRespondedAt(null);
        consultationRepository.save(consultation);

        Doctor doctor = original.getDoctor();
        notificationService.sendWebSocketNotification(
                original.getPatient().getUser(),
                NotificationType.HOME_VISIT_PROPOSED,
                "Home Visit Proposal",
                "Your doctor has proposed a home visit follow-up.",
                consultationId,
                "/patient-dashboard/appointments",
                buildMetadata(consultation, HomeVisitProposalStatus.PENDING)
        );

        log.info("Doctor {} proposed HomeVisit for patient {} (consultation {})",
                doctor.getDoctorId(), original.getPatient().getPatientId(), consultationId);

        return ProposalResponse.builder()
                .doctorId(doctor.getDoctorId())
                .consultationId(consultationId)
                .appointmentId(original.getAppointmentId())
                .status(HomeVisitProposalStatus.PENDING)
                .message("Proposal sent to patient")
                .build();
    }

    @Override
    @Transactional
    public ConfirmResponse confirm(Integer consultationId, UserDetails userDetails) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new BusinessException("Consultation not found"));

        Appointment originalAppointment = consultation.getAppointment();
        User currentUser = resolveUser(userDetails);
        validatePatientOwnership(currentUser, originalAppointment);
        ensurePendingProposal(consultation);

        consultation.setHomeVisitProposalStatus(HomeVisitProposalStatus.ACCEPTED);
        consultation.setHomeVisitRespondedAt(LocalDateTime.now());
        consultationRepository.save(consultation);

        notificationRepository.markAsReadByUserIdAndTypeAndRelatedId(
                currentUser.getId(),
                NotificationType.HOME_VISIT_PROPOSED,
                consultationId
        );

        Doctor doctor = originalAppointment.getDoctor();
        notificationService.sendWebSocketNotification(
                doctor.getUser(),
                NotificationType.HOME_VISIT_CONFIRMED,
                "Home Visit Confirmed",
                "Patient has accepted the home visit proposal. They will proceed with booking.",
                consultationId,
                "/doctor/appointments/" + originalAppointment.getAppointmentId(),
                buildMetadata(consultation, HomeVisitProposalStatus.ACCEPTED)
        );

        log.info("Patient confirmed HomeVisit proposal (consultation {})", consultationId);

        return ConfirmResponse.builder()
                .consultationId(consultationId)
                .doctorId(doctor.getDoctorId())
                .build();
    }

    @Override
    @Transactional
    public void reject(Integer consultationId, UserDetails userDetails) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new BusinessException("Consultation not found"));

        Appointment originalAppointment = consultation.getAppointment();
        User currentUser = resolveUser(userDetails);
        validatePatientOwnership(currentUser, originalAppointment);
        ensurePendingProposal(consultation);

        consultation.setHomeVisitProposalStatus(HomeVisitProposalStatus.REJECTED);
        consultation.setHomeVisitRespondedAt(LocalDateTime.now());
        consultationRepository.save(consultation);

        notificationRepository.markAsReadByUserIdAndTypeAndRelatedId(
                currentUser.getId(),
                NotificationType.HOME_VISIT_PROPOSED,
                consultationId
        );

        Doctor doctor = originalAppointment.getDoctor();
        notificationService.sendWebSocketNotification(
                doctor.getUser(),
                NotificationType.HOME_VISIT_REJECTED,
                "Home Visit Rejected",
                "Patient has declined the home visit proposal.",
                consultationId,
                "/doctor/appointments/" + originalAppointment.getAppointmentId(),
                buildMetadata(consultation, HomeVisitProposalStatus.REJECTED)
        );

        log.info("Patient rejected HomeVisit proposal (consultation {})", consultationId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ProposalResponse> getPendingProposal(UserDetails userDetails) {
        User currentUser = resolveUser(userDetails);
        if (currentUser.getPatient() == null) {
            throw new UnauthorizedAccessException("Patient profile not found");
        }

        return consultationRepository
                .findFirstByAppointment_Patient_User_IdAndHomeVisitProposalStatusOrderByHomeVisitProposedAtDesc(
                        currentUser.getId(),
                        HomeVisitProposalStatus.PENDING
                )
                .map(this::toProposalResponse);
    }

    private User resolveUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new UnauthorizedAccessException("User not found"));
    }

    private void validateDoctorOwnership(User currentUser, Appointment appointment) {
        Doctor doctor = appointment.getDoctor();
        if (currentUser.getDoctor() == null || doctor == null || doctor.getUser() == null
                || !currentUser.getId().equalsIgnoreCase(doctor.getUser().getId())) {
            throw new UnauthorizedAccessException("Access denied: you do not own this consultation");
        }
    }

    private void validatePatientOwnership(User currentUser, Appointment appointment) {
        Patient patient = appointment.getPatient();
        if (currentUser.getPatient() == null || patient == null || patient.getUser() == null
                || !currentUser.getId().equalsIgnoreCase(patient.getUser().getId())) {
            throw new UnauthorizedAccessException("Access denied: you do not own this consultation");
        }
    }

    private void ensurePendingProposal(Consultation consultation) {
        if (getProposalStatus(consultation) != HomeVisitProposalStatus.PENDING) {
            throw new BusinessException("This home visit proposal is no longer pending");
        }
    }

    private HomeVisitProposalStatus getProposalStatus(Consultation consultation) {
        return consultation.getHomeVisitProposalStatus() != null
                ? consultation.getHomeVisitProposalStatus()
                : HomeVisitProposalStatus.NONE;
    }

    private ProposalResponse toProposalResponse(Consultation consultation) {
        Appointment appointment = consultation.getAppointment();
        return ProposalResponse.builder()
                .doctorId(appointment.getDoctor().getDoctorId())
                .consultationId(consultation.getConsultationId())
                .appointmentId(appointment.getAppointmentId())
                .status(getProposalStatus(consultation))
                .message("Pending home visit proposal")
                .build();
    }

    private String buildMetadata(Consultation consultation, HomeVisitProposalStatus status) {
        Appointment appointment = consultation.getAppointment();
        ObjectNode metadata = objectMapper.createObjectNode()
                .put("consultationId", consultation.getConsultationId())
                .put("appointmentId", appointment.getAppointmentId())
                .put("doctorId", appointment.getDoctor().getDoctorId())
                .put("proposalStatus", status.name());

        Patient patient = appointment.getPatient();
        if (patient != null && patient.getFullName() != null) {
            metadata.put("patientName", patient.getFullName());
        }

        return metadata.toString();
    }
}
