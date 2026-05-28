package com.HealthLink.service.admin;

import com.HealthLink.dto.admin.*;
import com.HealthLink.entity.*;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.admin.AdminMedicalRecordRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class AdminMedicalRecordService {

    private final AdminMedicalRecordRepository medicalRecordRepository;
    private final PrescriptionHeaderRepository prescriptionHeaderRepository;

    public AdminMedicalRecordService(AdminMedicalRecordRepository medicalRecordRepository,
                                     PrescriptionHeaderRepository prescriptionHeaderRepository) {
        this.medicalRecordRepository = medicalRecordRepository;
        this.prescriptionHeaderRepository = prescriptionHeaderRepository;
    }

    public AdminMedicalRecordStatsDto getStats() {
        long totalRecords = medicalRecordRepository.countAllHealthRecords();
        long totalDocuments = medicalRecordRepository.countAllDocuments();
        long totalPatients = medicalRecordRepository.count();

        return AdminMedicalRecordStatsDto.builder()
            .totalRecords(totalRecords)
            .totalDocuments(totalDocuments)
            .totalPatients(totalPatients)
            .build();
    }

    public AdminMedicalRecordPatientPageResponse getPatients(int pageNumber, int pageSize, String searchTerm) {
        Pageable pageable = PageRequest.of(Math.max(pageNumber - 1, 0), Math.max(pageSize, 1),
            Sort.by(Sort.Direction.ASC, "fullName"));

        Page<Patient> page;
        if (StringUtils.hasText(searchTerm)) {
            page = medicalRecordRepository.findBySearchTerm(searchTerm.trim(), pageable);
        } else {
            page = medicalRecordRepository.findAll(pageable);
        }

        List<AdminMedicalRecordPatientDto> patients = page.stream()
            .map(this::mapToPatientDto)
            .collect(Collectors.toList());

        return new AdminMedicalRecordPatientPageResponse(
            patients,
            page.getNumber() + 1,
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
    }

    public AdminPatientMedicalHistoryDto getPatientMedicalHistory(String patientId) {
        Patient patient = medicalRecordRepository.findById(patientId)
            .orElseThrow(() -> new ResourceNotFoundException("Patient", "id", patientId));

        return mapToMedicalHistoryDto(patient);
    }

    public List<AdminPrescriptionDto> getPatientPrescriptions(String patientId) {
        List<PrescriptionHeader> prescriptions = prescriptionHeaderRepository.findByPatient_PatientId(patientId);
        return prescriptions.stream()
            .map(this::mapToPrescriptionDto)
            .collect(Collectors.toList());
    }

    private AdminMedicalRecordPatientDto mapToPatientDto(Patient patient) {
        User user = patient.getUser();

        int totalRecords = medicalRecordRepository.countHealthRecordsByPatientId(patient.getPatientId());
        int totalDocuments = medicalRecordRepository.countDocumentsByPatientId(patient.getPatientId());
        java.time.LocalDateTime lastUpdated = medicalRecordRepository.findLastUpdatedByPatientId(patient.getPatientId());

        return AdminMedicalRecordPatientDto.builder()
            .patientID(patient.getPatientId())
            .fullName(patient.getFullName())
            .email(user != null ? user.getEmail() : null)
            .phoneNumber(user != null ? user.getPhoneNumber() : null)
            .gender(patient.getGender())
            .bloodType(patient.getBloodType())
            .dateOfBirth(patient.getDateOfBirth())
            .avatarUrl(patient.getAvatarUrl())
            .totalRecords(totalRecords)
            .totalDocuments(totalDocuments)
            .lastUpdated(lastUpdated)
            .build();
    }

    private AdminPatientMedicalHistoryDto mapToMedicalHistoryDto(Patient patient) {
        User user = patient.getUser();

        // Get appointments
        List<AdminAppointmentSummaryDto> appointments = new ArrayList<>();
        if (patient.getAppointments() != null) {
            appointments = patient.getAppointments().stream()
                .sorted(Comparator.comparing(Appointment::getAppointmentTime,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::mapToAppointmentSummaryDto)
                .collect(Collectors.toList());
        }

        // Get documents grouped by category
        List<AdminDocumentCategoryDto> documentsByCategory = getDocumentsByCategory(patient);

        return AdminPatientMedicalHistoryDto.builder()
            .patientID(patient.getPatientId())
            .fullName(patient.getFullName())
            .email(user != null ? user.getEmail() : null)
            .phoneNumber(user != null ? user.getPhoneNumber() : null)
            .gender(patient.getGender())
            .bloodType(patient.getBloodType())
            .dateOfBirth(patient.getDateOfBirth())
            .avatarUrl(patient.getAvatarUrl())
            .address(patient.getAddress())
            .city(patient.getCity())
            .country(patient.getCountry())
            .medicalHistorySummary(patient.getMedicalHistorySummary())
            .allergies(patient.getAllergies())
            .chronicConditions(patient.getChronicConditions())
            .currentMedications(patient.getCurrentMedications())
            .heightCm(patient.getHeightCm())
            .weightKg(patient.getWeightKg())
            .insuranceProvider(patient.getInsuranceProvider())
            .insurancePolicyNumber(patient.getInsurancePolicyNumber())
            .emergencyContactName(patient.getEmergencyContactName())
            .emergencyContactPhone(patient.getEmergencyContactPhone())
            .emergencyContactRelationship(patient.getEmergencyContactRelationship())
            .appointments(appointments)
            .documentsByCategory(documentsByCategory)
            .build();
    }

    private AdminAppointmentSummaryDto mapToAppointmentSummaryDto(Appointment appointment) {
        Doctor doctor = appointment.getDoctor();
        Consultation consultation = appointment.getConsultation();

        return AdminAppointmentSummaryDto.builder()
            .appointmentID(appointment.getAppointmentId())
            .appointmentTime(appointment.getAppointmentTime())
            .consultationType(appointment.getConsultationType())
            .status(appointment.getStatus())
            .symptoms(appointment.getSymptoms())
            .notes(appointment.getNotes())
            .fee(appointment.getFee())
            .doctorID(doctor != null ? doctor.getDoctorId() : null)
            .doctorName(doctor != null ? doctor.getFullName() : null)
            .doctorSpecialty(doctor != null ? doctor.getSpecialty() : null)
            .diagnosis(consultation != null ? consultation.getDiagnosis() : null)
            .doctorNotes(consultation != null ? consultation.getDoctorNotes() : null)
            .treatmentPlan(consultation != null ? consultation.getTreatmentPlan() : null)
            .followUpDate(consultation != null ? consultation.getFollowUpDate() : null)
            .build();
    }

    private List<AdminDocumentCategoryDto> getDocumentsByCategory(Patient patient) {
        Map<String, List<AdminMedicalDocumentDto>> categoryMap = new LinkedHashMap<>();

        if (patient.getHealthRecords() != null) {
            for (HealthRecord healthRecord : patient.getHealthRecords()) {
                if (healthRecord.getMedicalDocuments() != null) {
                    for (MedicalDocument doc : healthRecord.getMedicalDocuments()) {
                        String category = doc.getCategory() != null ? doc.getCategory() : "Uncategorized";
                        categoryMap.computeIfAbsent(category, k -> new ArrayList<>())
                            .add(mapToDocumentDto(doc));
                    }
                }
            }
        }

        // Sort documents in each category by date (newest first)
        categoryMap.values().forEach(docs ->
            docs.sort((a, b) -> {
                if (a.getDocumentDate() == null && b.getDocumentDate() == null) return 0;
                if (a.getDocumentDate() == null) return 1;
                if (b.getDocumentDate() == null) return -1;
                return b.getDocumentDate().compareTo(a.getDocumentDate());
            })
        );

        return categoryMap.entrySet().stream()
            .map(entry -> AdminDocumentCategoryDto.builder()
                .category(entry.getKey())
                .documentCount(entry.getValue().size())
                .documents(entry.getValue())
                .build())
            .sorted((a, b) -> a.getCategory().compareTo(b.getCategory()))
            .collect(Collectors.toList());
    }

    private AdminMedicalDocumentDto mapToDocumentDto(MedicalDocument doc) {
        return AdminMedicalDocumentDto.builder()
            .documentID(doc.getDocumentId())
            .documentName(doc.getDocumentName())
            .documentType(doc.getDocumentType())
            .category(doc.getCategory())
            .description(doc.getDescription())
            .testResults(doc.getTestResults())
            .referenceRange(doc.getReferenceRange())
            .testStatus(doc.getTestStatus())
            .documentDate(doc.getDocumentDate())
            .performedBy(doc.getPerformedBy())
            .uploadedAt(doc.getUploadedAt())
            .fileSize(doc.getFileSize())
            .mimeType(doc.getMimeType())
            .build();
    }

    private AdminPrescriptionDto mapToPrescriptionDto(PrescriptionHeader prescription) {
        Doctor doctor = prescription.getDoctor();

        List<AdminPrescriptionItemDto> medications = new ArrayList<>();
        if (prescription.getPrescriptionItems() != null) {
            medications = prescription.getPrescriptionItems().stream()
                .map(this::mapToPrescriptionItemDto)
                .collect(Collectors.toList());
        }

        return AdminPrescriptionDto.builder()
            .prescriptionHeaderID(prescription.getPrescriptionHeaderId())
            .appointmentID(prescription.getAppointment() != null ? prescription.getAppointment().getAppointmentId() : null)
            .issueDate(prescription.getIssueDate())
            .doctorName(doctor != null ? doctor.getFullName() : null)
            .specialty(doctor != null ? doctor.getSpecialty() : null)
            .diagnosis(prescription.getDiagnosis())
            .notes(prescription.getNotes())
            .validUntil(prescription.getValidUntil())
            .status(prescription.getStatus())
            .totalAmount(prescription.getTotalAmount())
            .medications(medications)
            .build();
    }

    private AdminPrescriptionItemDto mapToPrescriptionItemDto(PrescriptionItem item) {
        return AdminPrescriptionItemDto.builder()
            .prescriptionItemID(item.getPrescriptionItemId())
            .medicationName(item.getMedicationName())
            .dosage(item.getDosage())
            .instructions(item.getInstructions())
            .totalSupplyDays(item.getTotalSupplyDays())
            .quantity(item.getQuantity())
            .unit(item.getUnit())
            .frequency(item.getFrequency())
            .timing(item.getTiming())
            .route(item.getRoute())
            .unitPrice(item.getUnitPrice())
            .totalPrice(item.getTotalPrice())
            .notes(item.getNotes())
            .build();
    }
}
