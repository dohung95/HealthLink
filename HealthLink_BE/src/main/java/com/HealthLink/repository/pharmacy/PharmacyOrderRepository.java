package com.HealthLink.repository.pharmacy;

import com.HealthLink.entity.PharmacyOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PharmacyOrderRepository extends JpaRepository<PharmacyOrder, Integer> {

    // Tìm đơn hàng theo pharmacyId
    List<PharmacyOrder> findByPharmacy_PharmacyId(String pharmacyId);

    // Tìm đơn hàng theo pharmacyId và status
    List<PharmacyOrder> findByPharmacy_PharmacyIdAndStatus(String pharmacyId, String status);

    // Tìm đơn hàng theo patientId
    List<PharmacyOrder> findByPatient_PatientId(String patientId);

    // Tìm đơn hàng theo prescriptionHeaderId
    List<PharmacyOrder> findByPrescriptionHeader_PrescriptionHeaderId(Integer prescriptionHeaderId);

    // Tìm đơn hàng theo status
    List<PharmacyOrder> findByStatus(String status);

    // Kiểm tra orderNumber đã tồn tại chưa (để sinh mã unique)
    boolean existsByOrderNumber(String orderNumber);

    boolean existsByPrescriptionHeader_PrescriptionHeaderId(Integer prescriptionHeaderId);
}
