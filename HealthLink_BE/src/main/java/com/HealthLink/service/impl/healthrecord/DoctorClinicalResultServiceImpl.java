package com.HealthLink.service.impl.healthrecord;

import com.HealthLink.dto.request.healthrecord.ClinicalResultUpsertRequest;
import com.HealthLink.dto.response.healthrecord.MedicalDocumentResponse;
import com.HealthLink.entity.*;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ForbiddenException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.healthrecord.HealthRecordRepository;
import com.HealthLink.repository.healthrecord.MedicalDocumentRepository;
import com.HealthLink.service.healthrecord.DoctorClinicalResultService;
import com.HealthLink.service.healthrecord.FileStorageService;
import com.HealthLink.service.notification.NotificationService;
import com.HealthLink.service.moderation.ImageModerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DoctorClinicalResultServiceImpl implements DoctorClinicalResultService {

    private static final String SOURCE_DOCTOR = "DOCTOR";
    private static final String VISIBILITY_DRAFT = "DRAFT";
    private static final String VISIBILITY_PUBLISHED = "PUBLISHED";
    private static final String RECORD_TYPE = "Clinical Results";

    private static final Set<String> CLINICAL_STATUSES = Set.of(
            "DRAFT",
            "PUBLISHED"
    );

    private final AppointmentRepository appointmentRepository;
    private final HealthRecordRepository healthRecordRepository;
    private final MedicalDocumentRepository medicalDocumentRepository;
    private final FileStorageService fileStorageService;
    private final ImageModerationService imageModerationService;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public List<MedicalDocumentResponse> getAppointmentResults(Integer appointmentId, String doctorId) {
        getOwnedAppointment(appointmentId, doctorId);
        return medicalDocumentRepository
                .findByAppointment_AppointmentIdAndSourceTypeOrderByUploadedAtDesc(appointmentId, SOURCE_DOCTOR)
                .stream()
                .map(this::toDocumentResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public MedicalDocumentResponse createResult(Integer appointmentId, String doctorId, ClinicalResultUpsertRequest request) {
        Appointment appointment = getOwnedAppointment(appointmentId, doctorId);
        Patient patient = appointment.getPatient();

        String fileLocation = null;
        if (request.getFile() != null && !request.getFile().isEmpty()) {
            imageModerationService.validateFileIsSafe(request.getFile());
            fileLocation = fileStorageService.storeFile(request.getFile());
        }

        boolean publishNow = Boolean.TRUE.equals(request.getPublishNow());
        String clinicalStatus = normalizeClinicalStatus(request.getClinicalStatus(), publishNow);
        String visibilityStatus = publishNow ? VISIBILITY_PUBLISHED : VISIBILITY_DRAFT;

        HealthRecord record = findOrCreateClinicalRecord(patient, appointment);

        MedicalDocument document = MedicalDocument.builder()
                .healthRecord(record)
                .appointment(appointment)
                .doctor(appointment.getDoctor())
                .documentName(request.getTestName() != null ? request.getTestName() : "Clinical Result")
                .documentType("CLINICAL_RESULT")
                .fileLocation(fileLocation)
                .category(request.getCategory())
                .description(request.getDescription())
                .testResults(request.getTestResults())
                .referenceRange(request.getReferenceRange())
                .testStatus(request.getTestStatus())
                .clinicalStatus(clinicalStatus)
                .sourceType(SOURCE_DOCTOR)
                .visibilityStatus(visibilityStatus)
                .documentDate(request.documentDateTimeOrNull())
                .performedBy(request.getPerformedBy())
                .labFacilityName(request.getLabFacilityName())
                .sentToLabAt(request.getSentToLabAt())
                .resultReceivedAt(request.getResultReceivedAt())
                .testName(request.getTestName())
                .resultUnit(request.getResultUnit())
                .structuredResultsJson(request.getStructuredResultsJson())
                .doctorAssessment(request.getDoctorAssessment())
                .patientSummary(request.getPatientSummary())
                .aiConfidence(request.getAiConfidence())
                .aiWarningsJson(request.getAiWarningsJson())
                .publishedAt(publishNow ? LocalDateTime.now() : null)
                .uploadedAt(LocalDateTime.now())
                .build();

        document = medicalDocumentRepository.save(document);

        if (publishNow) {
            notifyPatientAboutPublishedResult(document);
        }

        return toDocumentResponse(document);
    }

    @Override
    @Transactional
    public MedicalDocumentResponse updateResult(Integer documentId, String doctorId, ClinicalResultUpsertRequest request) {
        MedicalDocument document = medicalDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Clinical result", "id", documentId));

        if (!SOURCE_DOCTOR.equalsIgnoreCase(document.getSourceType())) {
            throw new BadRequestException("Cannot update a patient-uploaded document as a clinical result");
        }

        if (document.getDoctor() == null || !doctorId.equals(document.getDoctor().getDoctorId())) {
            throw new ForbiddenException("You are not allowed to update this clinical result");
        }

        if (request.getFile() != null && !request.getFile().isEmpty()) {
            imageModerationService.validateFileIsSafe(request.getFile());
            String newFileLocation = fileStorageService.storeFile(request.getFile());
            if (document.getFileLocation() != null) {
                fileStorageService.deleteFile(document.getFileLocation());
            }
            document.setFileLocation(newFileLocation);
        }

        if (request.getCategory() != null) document.setCategory(request.getCategory());
        if (request.getDescription() != null) document.setDescription(request.getDescription());
        if (request.getTestName() != null) document.setTestName(request.getTestName());
        if (request.getTestResults() != null) document.setTestResults(request.getTestResults());
        if (request.getResultUnit() != null) document.setResultUnit(request.getResultUnit());
        if (request.getReferenceRange() != null) document.setReferenceRange(request.getReferenceRange());
        if (request.getTestStatus() != null) document.setTestStatus(request.getTestStatus());
        if (request.getClinicalStatus() != null) {
            document.setClinicalStatus(normalizeClinicalStatus(request.getClinicalStatus(), false));
        }
        if (request.getDocumentDate() != null) document.setDocumentDate(request.documentDateTimeOrNull());
        if (request.getPerformedBy() != null) document.setPerformedBy(request.getPerformedBy());
        if (request.getLabFacilityName() != null) document.setLabFacilityName(request.getLabFacilityName());
        if (request.getSentToLabAt() != null) document.setSentToLabAt(request.getSentToLabAt());
        if (request.getResultReceivedAt() != null) document.setResultReceivedAt(request.getResultReceivedAt());
        if (request.getStructuredResultsJson() != null) document.setStructuredResultsJson(request.getStructuredResultsJson());
        if (request.getDoctorAssessment() != null) document.setDoctorAssessment(request.getDoctorAssessment());
        if (request.getPatientSummary() != null) document.setPatientSummary(request.getPatientSummary());
        if (request.getAiConfidence() != null) document.setAiConfidence(request.getAiConfidence());
        if (request.getAiWarningsJson() != null) document.setAiWarningsJson(request.getAiWarningsJson());

        return toDocumentResponse(medicalDocumentRepository.save(document));
    }

    @Override
    @Transactional
    public MedicalDocumentResponse publishResult(Integer documentId, String doctorId) {
        MedicalDocument document = medicalDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Clinical result", "id", documentId));

        if (document.getDoctor() == null || !doctorId.equals(document.getDoctor().getDoctorId())) {
            throw new ForbiddenException("You are not allowed to publish this clinical result");
        }

        assertPublishable(document);

        document.setVisibilityStatus(VISIBILITY_PUBLISHED);
        document.setPublishedAt(LocalDateTime.now());
        document.setClinicalStatus("PUBLISHED");

        document = medicalDocumentRepository.save(document);

        notifyPatientAboutPublishedResult(document);

        return toDocumentResponse(document);
    }

    private Appointment getOwnedAppointment(Integer appointmentId, String doctorId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", appointmentId));
        String ownerDoctorId = appointment.getDoctor() != null ? appointment.getDoctor().getDoctorId() : null;
        if (!doctorId.equals(ownerDoctorId)) {
            throw new ForbiddenException("You are not allowed to manage clinical results for this appointment");
        }
        if ("CANCELLED".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Cannot manage clinical results for a cancelled appointment");
        }
        return appointment;
    }

    private HealthRecord findOrCreateClinicalRecord(Patient patient, Appointment appointment) {
        LocalDate uploadDate = LocalDate.now();
        LocalDateTime start = uploadDate.atStartOfDay();
        LocalDateTime end = uploadDate.plusDays(1).atStartOfDay().minusSeconds(1);

        List<HealthRecord> records = healthRecordRepository
                .findByPatient_PatientIdAndRecordDateBetweenOrderByCreatedAtDesc(
                        patient.getPatientId(),
                        start,
                        end
                );

        return records.stream()
                .filter(record -> RECORD_TYPE.equalsIgnoreCase(record.getRecordType()))
                .findFirst()
                .orElseGet(() -> healthRecordRepository.save(HealthRecord.builder()
                        .patient(patient)
                        .title("Clinical Results - Appointment #" + appointment.getAppointmentId())
                        .description("Doctor-created clinical results")
                        .recordType(RECORD_TYPE)
                        .recordDate(start)
                        .createdAt(LocalDateTime.now())
                        .lastUpdated(LocalDateTime.now())
                        .build()));
    }

    private String normalizeClinicalStatus(String value, boolean publishing) {
        if (publishing) {
            return "PUBLISHED";
        }
        if (value == null || value.isBlank()) {
            return "DRAFT";
        }
        String normalized = value.trim().toUpperCase();
        if (!CLINICAL_STATUSES.contains(normalized)) {
            throw new BadRequestException("Unsupported clinical result status: " + value);
        }
        return normalized;
    }

    private void assertPublishable(MedicalDocument document) {
        boolean hasLegacyResult = document.getTestResults() != null && !document.getTestResults().isBlank();
        boolean hasStructuredResult = document.getStructuredResultsJson() != null && !document.getStructuredResultsJson().isBlank();
        boolean hasFile = document.getFileLocation() != null && !document.getFileLocation().isBlank();
        boolean hasAssessment = document.getDoctorAssessment() != null && !document.getDoctorAssessment().isBlank();
        if (!hasLegacyResult && !hasStructuredResult && !hasFile && !hasAssessment) {
            throw new BadRequestException("Clinical result needs a structured result or file before publishing");
        }
    }

    private void notifyPatientAboutPublishedResult(MedicalDocument document) {
        try {
            Patient patient = document.getHealthRecord().getPatient();
            User patientUser = patient != null ? patient.getUser() : null;
            if (patientUser == null) {
                return;
            }

            String doctorName = document.getDoctor() != null ? document.getDoctor().getFullName() : "your doctor";
            notificationService.sendWebSocketNotification(
                    patientUser,
                    NotificationType.CLINICAL_RESULT_PUBLISHED,
                    "Clinical result available",
                    "Dr. " + doctorName + " published a clinical result in your health records.",
                    document.getDocumentId(),
                    "/health-records"
            );
        } catch (Exception ex) {
            log.error("Failed to send clinical result notification: {}", ex.getMessage(), ex);
        }
    }

    private MedicalDocumentResponse toDocumentResponse(MedicalDocument doc) {
        Doctor doctor = doc.getDoctor();
        Appointment appointment = doc.getAppointment();
        return MedicalDocumentResponse.builder()
                .documentId(doc.getDocumentId())
                .healthRecordId(doc.getHealthRecord().getHealthRecordId())
                .documentName(doc.getDocumentName())
                .documentType(doc.getDocumentType())
                .fileLocation(doc.getFileLocation())
                .category(doc.getCategory())
                .description(doc.getDescription())
                .testResults(doc.getTestResults())
                .referenceRange(doc.getReferenceRange())
                .testStatus(doc.getTestStatus())
                .documentDate(doc.getDocumentDate())
                .uploadedAt(doc.getUploadedAt())
                .fileSize(doc.getFileSize())
                .mimeType(doc.getMimeType())
                .thumbnailUrl(doc.getThumbnailUrl())
                .appointmentId(appointment != null ? appointment.getAppointmentId() : null)
                .doctorId(doctor != null ? doctor.getDoctorId() : null)
                .doctorName(doctor != null ? doctor.getFullName() : null)
                .sourceType(doc.getSourceType())
                .visibilityStatus(doc.getVisibilityStatus())
                .publishedAt(doc.getPublishedAt())
                .labFacilityName(doc.getLabFacilityName())
                .sentToLabAt(doc.getSentToLabAt())
                .resultReceivedAt(doc.getResultReceivedAt())
                .testName(doc.getTestName())
                .resultUnit(doc.getResultUnit())
                .clinicalStatus(doc.getClinicalStatus())
                .structuredResultsJson(doc.getStructuredResultsJson())
                .doctorAssessment(doc.getDoctorAssessment())
                .patientSummary(doc.getPatientSummary())
                .aiConfidence(doc.getAiConfidence())
                .aiWarningsJson(doc.getAiWarningsJson())
                .aiProcessedAt(doc.getAiProcessedAt())
                .build();
    }
}
