package com.HealthLink.service.impl.payment;

import com.HealthLink.dto.payment.PartnerWalletEntryFilter;
import com.HealthLink.entity.PartnerWalletEntry;
import com.HealthLink.entity.Settlement;
import com.HealthLink.entity.enums.PartnerWalletEntryStatus;
import com.HealthLink.entity.enums.PartnerWalletEntryType;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.payment.PartnerWalletEntryRepository;
import com.HealthLink.repository.payment.PaymentSettlementRepository;
import com.HealthLink.service.payment.PartnerWalletQueryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@ActiveProfiles("test")
@Import(PartnerWalletQueryServiceImpl.class)
class PartnerWalletQueryServiceImplTest {

    @Autowired
    private PartnerWalletQueryService walletQueryService;

    @Autowired
    private PartnerWalletEntryRepository entryRepository;

    @Autowired
    private PaymentSettlementRepository settlementRepository;

    @Test
    void mapsAdjustmentToReturnAndRefundWithoutLeakingAnotherPartnersEntries() {
        entryRepository.saveAndFlush(entry("RETURN:1", "doctor-1", PartnerWalletEntryType.RETURN,
                PartnerWalletEntryStatus.RETURNED, 1, null, LocalDateTime.of(2026, 7, 16, 8, 0)));
        entryRepository.saveAndFlush(entry("REFUND:2", "doctor-1", PartnerWalletEntryType.REFUND,
                PartnerWalletEntryStatus.REFUNDED, 2, null, LocalDateTime.of(2026, 7, 16, 9, 0)));
        entryRepository.saveAndFlush(entry("EARNING:3", "doctor-1", PartnerWalletEntryType.EARNING,
                PartnerWalletEntryStatus.VESTED, 3, null, LocalDateTime.of(2026, 7, 16, 10, 0)));
        entryRepository.saveAndFlush(entry("RETURN:4", "doctor-2", PartnerWalletEntryType.RETURN,
                PartnerWalletEntryStatus.RETURNED, 4, null, LocalDateTime.of(2026, 7, 16, 11, 0)));

        var result = walletQueryService.getWalletEntries("doctor-1",
                PartnerWalletEntryFilter.builder().type("ADJUSTMENT").build(), PageRequest.of(0, 10));

        assertThat(result.getContent()).extracting(entry -> entry.getEntryType())
                .containsExactly("REFUND", "RETURN");
        assertThat(result.getTotalElements()).isEqualTo(2);
    }

    @Test
    void appliesInclusiveDatesAndSearchesAppointmentOrderAndSettlementNumber() {
        Settlement settlement = settlementRepository.saveAndFlush(Settlement.builder()
                .settlementNumber("STL-SEARCH-1")
                .recipientType("DOCTOR")
                .recipientId("doctor-1")
                .grossAmount(new BigDecimal("20.00"))
                .commissionAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("20.00"))
                .paypalEmail("doctor@example.com")
                .build());
        entryRepository.saveAndFlush(entry("EARNING:10", "doctor-1", PartnerWalletEntryType.EARNING,
                PartnerWalletEntryStatus.VESTED, 15, null, LocalDateTime.of(2026, 7, 10, 0, 0)));
        entryRepository.saveAndFlush(entry("WITHDRAWAL:11", "doctor-1", PartnerWalletEntryType.WITHDRAWAL,
                PartnerWalletEntryStatus.COMPLETED, null, settlement.getSettlementId(),
                LocalDateTime.of(2026, 7, 10, 23, 59, 59, 999_999_000)));
        entryRepository.saveAndFlush(entry("ORDER:12", "doctor-1", PartnerWalletEntryType.EARNING,
                PartnerWalletEntryStatus.VESTED, null, null, LocalDateTime.of(2026, 7, 11, 0, 0), 26));

        PartnerWalletEntryFilter dateFilter = PartnerWalletEntryFilter.builder()
                .from(LocalDate.of(2026, 7, 10))
                .to(LocalDate.of(2026, 7, 10))
                .build();
        assertThat(walletQueryService.getWalletEntries("doctor-1", dateFilter, PageRequest.of(0, 10))
                .getTotalElements()).isEqualTo(2);
        assertThat(walletQueryService.getWalletEntries("doctor-1",
                PartnerWalletEntryFilter.builder().search("15").build(), PageRequest.of(0, 10))
                .getTotalElements()).isEqualTo(1);
        var settlementResult = walletQueryService.getWalletEntries("doctor-1",
                PartnerWalletEntryFilter.builder().search("search-1").build(), PageRequest.of(0, 10));
        assertThat(settlementResult.getContent()).singleElement().satisfies(result -> {
            assertThat(result.getSettlementNumber()).isEqualTo("STL-SEARCH-1");
            assertThat(result.getPaypalEmail()).isEqualTo("doctor@example.com");
        });
        assertThat(walletQueryService.getWalletEntries("doctor-1",
                PartnerWalletEntryFilter.builder().search("26").build(), PageRequest.of(0, 10))
                .getTotalElements()).isEqualTo(1);
    }

    @Test
    void rejectsAnInvalidStatusWithBadRequest() {
        assertThatThrownBy(() -> walletQueryService.getWalletEntries("doctor-1",
                PartnerWalletEntryFilter.builder().status("UNKNOWN").build(), PageRequest.of(0, 10)))
                .isInstanceOf(BadRequestException.class);
    }

    private PartnerWalletEntry entry(String key, String partnerId, PartnerWalletEntryType type,
                                     PartnerWalletEntryStatus status, Integer appointmentId,
                                     Integer settlementId, LocalDateTime effectiveAt) {
        return entry(key, partnerId, type, status, appointmentId, settlementId, effectiveAt, null);
    }

    private PartnerWalletEntry entry(String key, String partnerId, PartnerWalletEntryType type,
                                     PartnerWalletEntryStatus status, Integer appointmentId,
                                     Integer settlementId, LocalDateTime effectiveAt, Integer pharmacyOrderId) {
        return PartnerWalletEntry.builder()
                .partnerType("DOCTOR")
                .partnerId(partnerId)
                .entryType(type)
                .status(status)
                .amount(new BigDecimal("20.00"))
                .idempotencyKey(key)
                .appointmentId(appointmentId)
                .pharmacyOrderId(pharmacyOrderId)
                .settlementId(settlementId)
                .effectiveAt(effectiveAt)
                .build();
    }
}
