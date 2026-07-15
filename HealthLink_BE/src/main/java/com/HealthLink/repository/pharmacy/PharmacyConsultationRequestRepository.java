package com.HealthLink.repository.pharmacy;

import com.HealthLink.entity.PharmacyConsultationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PharmacyConsultationRequestRepository extends JpaRepository<PharmacyConsultationRequest, Integer> {

    List<PharmacyConsultationRequest> findByPharmacy_PharmacyIdOrderByCreatedAtDesc(String pharmacyId);

    List<PharmacyConsultationRequest> findByPharmacy_PharmacyIdAndStatusOrderByCreatedAtDesc(
            String pharmacyId,
            String status
    );

    List<PharmacyConsultationRequest> findByPatient_PatientIdOrderByCreatedAtDesc(String patientId);

    Optional<PharmacyConsultationRequest> findByRequestIdAndPharmacy_PharmacyId(Integer requestId, String pharmacyId);

    Optional<PharmacyConsultationRequest> findByRequestIdAndPatient_PatientId(Integer requestId, String patientId);

    List<PharmacyConsultationRequest> findAllByChatRoomId(String chatRoomId);
}
