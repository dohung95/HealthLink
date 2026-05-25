package com.HealthLink.repository.pharmacy;

import com.HealthLink.entity.PharmacyOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PharmacyOrderRepository extends JpaRepository<PharmacyOrder, Integer> {

    // Tìm đơn hàng theo pharmacyId
    List<PharmacyOrder> findByPharmacy_PharmacyId(String pharmacyId);

    // Tìm đơn hàng theo pharmacyId và status
    @Query("""
            SELECT o FROM PharmacyOrder o
            WHERE o.pharmacy.pharmacyId = :pharmacyId
              AND UPPER(o.status) = UPPER(:status)
            """)
    List<PharmacyOrder> findByPharmacy_PharmacyIdAndStatus(
            @Param("pharmacyId") String pharmacyId,
            @Param("status") String status
    );

    // Tìm đơn hàng theo patientId
    List<PharmacyOrder> findByPatient_PatientId(String patientId);

    List<PharmacyOrder> findByPrescriptionHeader_Doctor_DoctorIdOrderByCreatedAtDesc(String doctorId);

    // Tìm đơn hàng theo prescriptionHeaderId
    List<PharmacyOrder> findByPrescriptionHeader_PrescriptionHeaderId(Integer prescriptionHeaderId);

    // Tìm đơn hàng theo status
    @Query("SELECT o FROM PharmacyOrder o WHERE UPPER(o.status) = UPPER(:status)")
    List<PharmacyOrder> findByStatus(@Param("status") String status);

    // Kiểm tra orderNumber đã tồn tại chưa (để sinh mã unique)
    boolean existsByOrderNumber(String orderNumber);

    boolean existsByPrescriptionHeader_PrescriptionHeaderId(Integer prescriptionHeaderId);

    boolean existsByConsultationRequest_RequestId(Integer requestId);
}
