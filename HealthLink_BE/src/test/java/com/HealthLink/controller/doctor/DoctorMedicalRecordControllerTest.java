package com.HealthLink.controller.doctor;

import com.HealthLink.dto.admin.AdminPatientMedicalHistoryDto;
import com.HealthLink.dto.admin.AdminPrescriptionDto;
import com.HealthLink.service.admin.AdminMedicalRecordService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DoctorMedicalRecordControllerTest {

    @Mock
    private AdminMedicalRecordService medicalRecordService;

    @InjectMocks
    private DoctorMedicalRecordController controller;

    @Test
    void getPatientMedicalHistory_ShouldReturnDto() {
        String patientId = "patient-123";
        AdminPatientMedicalHistoryDto expected = AdminPatientMedicalHistoryDto.builder()
                .patientID(patientId)
                .fullName("John Doe")
                .build();

        when(medicalRecordService.getPatientMedicalHistory(patientId)).thenReturn(expected);

        ResponseEntity<AdminPatientMedicalHistoryDto> response = controller.getPatientMedicalHistory(patientId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatusCode.valueOf(200));
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getPatientID()).isEqualTo(patientId);
        assertThat(response.getBody().getFullName()).isEqualTo("John Doe");
    }

    @Test
    void getPatientPrescriptions_ShouldReturnList() {
        String patientId = "patient-456";
        AdminPrescriptionDto prescription = AdminPrescriptionDto.builder()
                .prescriptionHeaderID(1)
                .diagnosis("Hypertension")
                .build();
        List<AdminPrescriptionDto> expected = List.of(prescription);

        when(medicalRecordService.getPatientPrescriptions(patientId)).thenReturn(expected);

        ResponseEntity<List<AdminPrescriptionDto>> response = controller.getPatientPrescriptions(patientId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatusCode.valueOf(200));
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().getFirst().getDiagnosis()).isEqualTo("Hypertension");
    }
}
