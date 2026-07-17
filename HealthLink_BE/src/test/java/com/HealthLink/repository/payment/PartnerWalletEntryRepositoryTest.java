package com.HealthLink.repository.payment;

import com.HealthLink.entity.PartnerWalletEntry;
import com.HealthLink.entity.enums.PartnerWalletEntryStatus;
import com.HealthLink.entity.enums.PartnerWalletEntryType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@ActiveProfiles("test")
class PartnerWalletEntryRepositoryTest {

    @Autowired
    private PartnerWalletEntryRepository repository;

    @Test
    void findsSignedEntriesByTheirIdempotencyKeys() {
        PartnerWalletEntry earning = repository.saveAndFlush(entry(
                "EARNING:CTX:1", PartnerWalletEntryType.EARNING, new BigDecimal("42.50"),
                LocalDateTime.of(2026, 7, 1, 10, 0)));
        PartnerWalletEntry withdrawal = repository.saveAndFlush(entry(
                "WITHDRAWAL:STL:1", PartnerWalletEntryType.WITHDRAWAL, new BigDecimal("-20.00"),
                LocalDateTime.of(2026, 7, 2, 10, 0)));

        assertThat(repository.findByIdempotencyKey("EARNING:CTX:1"))
                .contains(earning);
        assertThat(repository.findByIdempotencyKey("WITHDRAWAL:STL:1"))
                .contains(withdrawal);
        assertThat(earning.getAmount()).isPositive();
        assertThat(withdrawal.getAmount()).isNegative();
        assertThat(earning.getCreatedAt()).isNotNull();
        assertThat(earning.getUpdatedAt()).isNotNull();
    }

    @Test
    void rejectsDuplicateIdempotencyKeys() {
        repository.saveAndFlush(entry(
                "EARNING:CTX:1", PartnerWalletEntryType.EARNING, new BigDecimal("42.50"),
                LocalDateTime.of(2026, 7, 1, 10, 0)));

        assertThatThrownBy(() -> repository.saveAndFlush(entry(
                "EARNING:CTX:1", PartnerWalletEntryType.EARNING, new BigDecimal("42.50"),
                LocalDateTime.of(2026, 7, 1, 10, 0))))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void returnsPartnerHistoryByEffectiveAtThenEntryIdDescending() {
        PartnerWalletEntry earlier = repository.saveAndFlush(entry(
                "EARNING:CTX:1", PartnerWalletEntryType.EARNING, new BigDecimal("42.50"),
                LocalDateTime.of(2026, 7, 1, 10, 0)));
        PartnerWalletEntry sameTime = repository.saveAndFlush(entry(
                "WITHDRAWAL:STL:1", PartnerWalletEntryType.WITHDRAWAL, new BigDecimal("-20.00"),
                LocalDateTime.of(2026, 7, 2, 10, 0)));
        PartnerWalletEntry latest = repository.saveAndFlush(entry(
                "RETURN:STL:1", PartnerWalletEntryType.RETURN, new BigDecimal("20.00"),
                LocalDateTime.of(2026, 7, 2, 10, 0)));

        List<PartnerWalletEntry> entries = repository
                .findByPartnerIdOrderByEffectiveAtDescEntryIdDesc("doctor-1", PageRequest.of(0, 10))
                .getContent();

        assertThat(entries).extracting(PartnerWalletEntry::getEntryId)
                .containsExactly(latest.getEntryId(), sameTime.getEntryId(), earlier.getEntryId());
    }

    @Test
    void findsSettlementEntriesByEntryType() {
        PartnerWalletEntry withdrawal = repository.saveAndFlush(entry(
                "WITHDRAWAL:STL:1", PartnerWalletEntryType.WITHDRAWAL, new BigDecimal("-20.00"),
                LocalDateTime.of(2026, 7, 2, 10, 0)));
        withdrawal.setSettlementId(1);
        repository.saveAndFlush(withdrawal);
        repository.saveAndFlush(entry(
                "EARNING:CTX:1", PartnerWalletEntryType.EARNING, new BigDecimal("42.50"),
                LocalDateTime.of(2026, 7, 1, 10, 0)));

        assertThat(repository.findBySettlementIdAndEntryType(1, PartnerWalletEntryType.WITHDRAWAL))
                .containsExactly(withdrawal);
    }

    @Test
    void migrationUsesTheHibernatePhysicalSchemaNames() throws Exception {
        String migration = Files.readString(Path.of(
                "src/main/resources/db/migration-v21-add-partner-wallet-ledger.sql"));

        assertThat(migration)
                .contains("dbo.PartnerWalletEntries", "partnerType", "partnerId", "entryType",
                        "IdempotencyKey", "effectiveAt", "dbo.CommissionTransactions", "dbo.Settlements")
                .doesNotContain("dbo.partner_wallet_entries");
    }

    private PartnerWalletEntry entry(String key, PartnerWalletEntryType type, BigDecimal amount,
                                     LocalDateTime effectiveAt) {
        PartnerWalletEntry entry = new PartnerWalletEntry();
        entry.setPartnerType("DOCTOR");
        entry.setPartnerId("doctor-1");
        entry.setEntryType(type);
        entry.setStatus(type == PartnerWalletEntryType.EARNING
                ? PartnerWalletEntryStatus.VESTED : PartnerWalletEntryStatus.COMPLETED);
        entry.setAmount(amount);
        entry.setIdempotencyKey(key);
        entry.setEffectiveAt(effectiveAt);
        return entry;
    }
}
