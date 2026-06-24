package com.HealthLink.service.impl.consultation;

import com.HealthLink.dto.response.ConfirmResponse;
import com.HealthLink.dto.response.ProposalResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.repository.consultation.ConsultationRepository;
import com.HealthLink.service.consultation.ConsultationProposalService;
import com.HealthLink.service.notification.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConsultationProposalServiceImpl implements ConsultationProposalService {

    private final ConsultationRepository consultationRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public ProposalResponse propose(Integer consultationId) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new BusinessException("Consultation not found"));

        Appointment original = consultation.getAppointment();
        Doctor doctor = original.getDoctor();

        // Chỉ gửi notification, KHÔNG tạo appointment
        String metadata = objectMapper.createObjectNode()
                .put("doctorId", doctor.getDoctorId())
                .put("consultationId", consultationId)
                .toString();

        notificationService.sendWebSocketNotification(
                original.getPatient().getUser(),
                NotificationType.HOME_VISIT_PROPOSED,
                "Home Visit Proposal",
                "Your doctor has proposed a home visit follow-up.",
                consultationId,
                null,
                metadata
        );

        log.info("Doctor {} proposed HomeVisit for patient {} (consultation {})",
                doctor.getDoctorId(), original.getPatient().getPatientId(),
                consultationId);

        return ProposalResponse.builder()
                .doctorId(doctor.getDoctorId())
                .consultationId(consultationId)
                .message("Proposal sent to patient")
                .build();
    }

    @Override
    @Transactional
    public ConfirmResponse confirm(Integer consultationId) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new BusinessException("Consultation not found"));

        Doctor doctor = consultation.getAppointment().getDoctor();

        notificationService.sendWebSocketNotification(
                doctor.getUser(),
                NotificationType.HOME_VISIT_CONFIRMED,
                "Home Visit Confirmed",
                "Patient has accepted the home visit proposal. They will proceed with booking.",
                consultationId,
                null,
                null
        );

        log.info("Patient confirmed HomeVisit proposal (consultation {})", consultationId);

        return ConfirmResponse.builder()
                .consultationId(consultationId)
                .doctorId(doctor.getDoctorId())
                .build();
    }

    @Override
    @Transactional
    public void reject(Integer consultationId) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new BusinessException("Consultation not found"));

        Doctor doctor = consultation.getAppointment().getDoctor();

        notificationService.sendWebSocketNotification(
                doctor.getUser(),
                NotificationType.HOME_VISIT_REJECTED,
                "Home Visit Rejected",
                "Patient has declined the home visit proposal.",
                consultationId,
                null,
                null
        );

        log.info("Patient rejected HomeVisit proposal (consultation {})", consultationId);
    }
}
