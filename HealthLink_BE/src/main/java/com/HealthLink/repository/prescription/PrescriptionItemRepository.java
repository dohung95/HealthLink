package com.HealthLink.repository.prescription;

import com.HealthLink.entity.PrescriptionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrescriptionItemRepository extends JpaRepository<PrescriptionItem, Integer> {

    List<PrescriptionItem> findByPrescriptionHeader_PrescriptionHeaderId(Integer prescriptionHeaderId);
}
