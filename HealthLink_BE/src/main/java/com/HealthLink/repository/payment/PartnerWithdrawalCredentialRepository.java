package com.HealthLink.repository.payment;

import com.HealthLink.entity.PartnerWithdrawalCredential;
import com.HealthLink.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PartnerWithdrawalCredentialRepository extends JpaRepository<PartnerWithdrawalCredential, Long> {
    Optional<PartnerWithdrawalCredential> findByUser(User user);
}
