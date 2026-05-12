package com.HealthLink.repository.admin;

import com.HealthLink.entity.Pharmacy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AdminPharmacyRepository extends JpaRepository<Pharmacy, String>, JpaSpecificationExecutor<Pharmacy> {
}
