package com.HealthLink.service.impl.healthrecord;

import com.HealthLink.dto.response.PagedResponse;
import com.HealthLink.dto.response.healthrecord.HealthRecordResponse;
import com.HealthLink.entity.HealthRecord;
import com.HealthLink.entity.MedicalDocument;
import com.HealthLink.entity.Patient;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.healthrecord.HealthRecordRepository;
import com.HealthLink.repository.healthrecord.HealthRecordShareRepository;
import com.HealthLink.repository.healthrecord.MedicalDocumentRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.service.healthrecord.FileStorageService;
import com.HealthLink.service.moderation.ImageModerationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HealthRecordServiceImplTest {
    @Mock private HealthRecordRepository healthRecordRepository;
    @Mock private MedicalDocumentRepository medicalDocumentRepository;
    @Mock private HealthRecordShareRepository healthRecordShareRepository;
    @Mock private PatientRepository patientRepository;
    @Mock private DoctorRepository doctorRepository;
    @Mock private FileStorageService fileStorageService;
    @Mock private ImageModerationService imageModerationService;

    @InjectMocks
    private HealthRecordServiceImpl service;

    @Test
    void getMyRecords_shouldHideDraftDoctorClinicalResults() {
        HealthRecord record = recordWith(document("DRAFT"));
        when(healthRecordRepository.findMyRecordsByDateRange(eq("patient-1"), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(record)));

        PagedResponse<HealthRecordResponse> response =
                service.getMyRecords("patient-1", 1, 5, null, null, "newest");

        assertThat(response.getItems()).isEmpty();
    }

    @Test
    void getMyRecords_shouldShowPublishedDoctorClinicalResults() {
        HealthRecord record = recordWith(document("PUBLISHED"));
        when(healthRecordRepository.findMyRecordsByDateRange(eq("patient-1"), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(record)));

        PagedResponse<HealthRecordResponse> response =
                service.getMyRecords("patient-1", 1, 5, null, null, "newest");

        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getItems().getFirst().getDocuments()).hasSize(1);
        assertThat(response.getItems().getFirst().getDocuments().getFirst().getVisibilityStatus())
                .isEqualTo("PUBLISHED");
    }

    private static HealthRecord recordWith(MedicalDocument doc) {
        Patient patient = Patient.builder()
                .patientId("patient-1")
                .fullName("Test Patient")
                .build();
        HealthRecord record = HealthRecord.builder()
                .healthRecordId(1)
                .patient(patient)
                .title("Test Record")
                .recordType("Lab Result")
                .recordDate(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .lastUpdated(LocalDateTime.now())
                .medicalDocuments(List.of(doc))
                .build();
        doc.setHealthRecord(record);
        return record;
    }

    private static MedicalDocument document(String visibilityStatus) {
        return MedicalDocument.builder()
                .documentId(1)
                .documentName("Test Doc")
                .documentType("CLINICAL_RESULT")
                .sourceType("DOCTOR")
                .visibilityStatus(visibilityStatus)
                .uploadedAt(LocalDateTime.now())
                .build();
    }
}
