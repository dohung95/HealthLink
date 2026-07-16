package com.HealthLink.repository.payment;

import com.HealthLink.entity.PartnerWalletEntry;
import com.HealthLink.entity.enums.PartnerWalletEntryType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PartnerWalletEntryRepository extends JpaRepository<PartnerWalletEntry, Long>,
        JpaSpecificationExecutor<PartnerWalletEntry> {

    Optional<PartnerWalletEntry> findByIdempotencyKey(String key);

    List<PartnerWalletEntry> findBySettlementIdAndEntryType(Integer settlementId, PartnerWalletEntryType entryType);

    Page<PartnerWalletEntry> findByPartnerIdOrderByEffectiveAtDescEntryIdDesc(String partnerId, Pageable pageable);
}
