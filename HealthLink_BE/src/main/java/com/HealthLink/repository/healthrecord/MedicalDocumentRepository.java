package com.HealthLink.repository.healthrecord;

import com.HealthLink.entity.MedicalDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicalDocumentRepository extends JpaRepository<MedicalDocument, Integer> {
    List<MedicalDocument> findByHealthRecord_HealthRecordId(Integer healthRecordId);

    List<MedicalDocument> findByAppointment_AppointmentIdAndSourceTypeOrderByUploadedAtDesc(
            Integer appointmentId,
            String sourceType
    );

    List<MedicalDocument> findByHealthRecord_Patient_PatientIdAndSourceTypeOrderByUploadedAtDesc(
            String patientId,
            String sourceType
    );
}
