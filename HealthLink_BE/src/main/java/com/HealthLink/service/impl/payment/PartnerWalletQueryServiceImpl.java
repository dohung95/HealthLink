package com.HealthLink.service.impl.payment;

import com.HealthLink.dto.payment.PartnerWalletEntryFilter;
import com.HealthLink.dto.payment.PartnerWalletEntryResponse;
import com.HealthLink.entity.CommissionTransaction;
import com.HealthLink.entity.PartnerWalletEntry;
import com.HealthLink.entity.Settlement;
import com.HealthLink.entity.enums.PartnerWalletEntryStatus;
import com.HealthLink.entity.enums.PartnerWalletEntryType;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.payment.PartnerWalletEntryRepository;
import com.HealthLink.repository.payment.PaymentCommissionTransactionRepository;
import com.HealthLink.repository.payment.PaymentSettlementRepository;
import com.HealthLink.service.payment.PartnerWalletQueryService;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PartnerWalletQueryServiceImpl implements PartnerWalletQueryService {

    private final PartnerWalletEntryRepository entryRepository;
    private final PaymentCommissionTransactionRepository commissionTransactionRepository;
    private final PaymentSettlementRepository settlementRepository;
    private final com.HealthLink.repository.pharmacy.PharmacyOrderRepository pharmacyOrderRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<PartnerWalletEntryResponse> getWalletEntries(
            String partnerId, PartnerWalletEntryFilter filter, Pageable pageable) {
        PartnerWalletEntryFilter normalized = normalize(filter);
        Pageable sortedPage = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Order.desc("effectiveAt"), Sort.Order.desc("entryId")));
        Page<PartnerWalletEntry> entries = entryRepository.findAll(
                specification(partnerId, normalized), sortedPage);

        Map<Integer, Settlement> settlementsById = settlementsById(entries.getContent());
        Map<Integer, String> orderNumbersByOrderId = orderNumbersByOrderId(entries.getContent());
        return entries.map(entry -> toResponse(entry,
                settlementsById.get(entry.getSettlementId()),
                orderNumbersByOrderId.get(entry.getPharmacyOrderId())));
    }

    private PartnerWalletEntryFilter normalize(PartnerWalletEntryFilter filter) {
        PartnerWalletEntryFilter normalized = filter == null ? new PartnerWalletEntryFilter() : filter;
        normalized.setType(normalizeType(normalized.getType()));
        normalized.setStatus(normalizeStatus(normalized.getStatus()));
        if (normalized.getFrom() != null && normalized.getTo() != null
                && normalized.getFrom().isAfter(normalized.getTo())) {
            throw new BadRequestException("from must be on or before to");
        }
        return normalized;
    }

    private Specification<PartnerWalletEntry> specification(String partnerId, PartnerWalletEntryFilter filter) {
        return (root, query, builder) -> {
            java.util.List<Predicate> predicates = new java.util.ArrayList<>();
            predicates.add(builder.equal(root.get("partnerId"), partnerId));

            Set<PartnerWalletEntryType> entryTypes = entryTypesFor(filter.getType());
            if (entryTypes != null) {
                predicates.add(root.get("entryType").in(entryTypes));
            }
            if (filter.getStatus() != null) {
                predicates.add(builder.equal(root.get("status"), PartnerWalletEntryStatus.valueOf(filter.getStatus())));
            }
            if (filter.getFrom() != null) {
                predicates.add(builder.greaterThanOrEqualTo(root.get("effectiveAt"), filter.getFrom().atStartOfDay()));
            }
            if (filter.getTo() != null) {
                predicates.add(builder.lessThan(root.get("effectiveAt"), filter.getTo().plusDays(1).atStartOfDay()));
            }
            if (hasText(filter.getSearch())) {
                predicates.add(searchPredicate(root, query, builder, filter.getSearch().trim()));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Predicate searchPredicate(Root<PartnerWalletEntry> root, CriteriaQuery<?> query,
                                      CriteriaBuilder builder, String search) {
        Subquery<Integer> settlementQuery = query.subquery(Integer.class);
        Root<Settlement> settlement = settlementQuery.from(Settlement.class);
        settlementQuery.select(settlement.get("settlementId"));
        settlementQuery.where(
                builder.equal(settlement.get("settlementId"), root.get("settlementId")),
                builder.like(builder.lower(settlement.get("settlementNumber")),
                        "%" + search.toLowerCase(Locale.ROOT) + "%"));

        Predicate settlementNumber = builder.exists(settlementQuery);
        Integer id = parseInteger(search);
        if (id == null) {
            return settlementNumber;
        }
        return builder.or(
                builder.equal(root.get("appointmentId"), id),
                builder.equal(root.get("pharmacyOrderId"), id),
                settlementNumber);
    }

    private Map<Integer, Settlement> settlementsById(Collection<PartnerWalletEntry> entries) {
        Set<Integer> settlementIds = entries.stream()
                .map(PartnerWalletEntry::getSettlementId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (settlementIds.isEmpty()) {
            return new HashMap<>();
        }
        Map<Integer, Settlement> settlements = new HashMap<>();
        settlementRepository.findAllById(settlementIds)
                .forEach(settlement -> settlements.put(settlement.getSettlementId(), settlement));
        return settlements;
    }

    private Map<Integer, String> orderNumbersByOrderId(Collection<PartnerWalletEntry> entries) {
        Set<Integer> orderIds = entries.stream()
                .map(PartnerWalletEntry::getPharmacyOrderId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (orderIds.isEmpty()) {
            return new HashMap<>();
        }
        Map<Integer, String> numbers = new HashMap<>();
        pharmacyOrderRepository.findAllById(orderIds)
                .forEach(order -> numbers.put(order.getOrderId(), order.getOrderNumber()));
        return numbers;
    }

    private PartnerWalletEntryResponse toResponse(PartnerWalletEntry entry, Settlement settlement,
                                                   String orderNumber) {
        CommissionTransaction ct = null;
        if (entry.getCommissionTransactionId() != null) {
            ct = commissionTransactionRepository.findById(entry.getCommissionTransactionId()).orElse(null);
        }
        return PartnerWalletEntryResponse.builder()
                .entryId(entry.getEntryId())
                .entryType(entry.getEntryType().name())
                .status(entry.getStatus().name())
                .amount(entry.getAmount())
                .grossAmount(ct != null ? ct.getGrossAmount() : null)
                .commissionAmount(ct != null ? ct.getCommissionAmount() : null)
                .description(entry.getDescription())
                .appointmentId(entry.getAppointmentId())
                .pharmacyOrderId(entry.getPharmacyOrderId())
                .settlementId(entry.getSettlementId())
                .settlementNumber(settlement == null ? null : settlement.getSettlementNumber())
                .paypalEmail(settlement == null ? null : settlement.getPaypalEmail())
                .orderNumber(orderNumber)
                .effectiveAt(entry.getEffectiveAt())
                .updatedAt(entry.getUpdatedAt())
                .build();
    }

    private String normalizeType(String type) {
        String value = hasText(type) ? type.trim().toUpperCase(Locale.ROOT) : "ALL";
        if (!Set.of("ALL", "EARNING", "WITHDRAWAL", "ADJUSTMENT").contains(value)) {
            throw new BadRequestException("Invalid wallet entry type: " + type);
        }
        return value;
    }

    private Set<PartnerWalletEntryType> entryTypesFor(String type) {
        return switch (type) {
            case "ALL" -> null;
            case "EARNING" -> EnumSet.of(PartnerWalletEntryType.EARNING);
            case "WITHDRAWAL" -> EnumSet.of(PartnerWalletEntryType.WITHDRAWAL);
            case "ADJUSTMENT" -> EnumSet.of(PartnerWalletEntryType.RETURN, PartnerWalletEntryType.REFUND);
            default -> throw new IllegalStateException("Unexpected wallet entry type: " + type);
        };
    }

    private String normalizeStatus(String status) {
        if (!hasText(status)) {
            return null;
        }
        String value = status.trim().toUpperCase(Locale.ROOT);
        try {
            PartnerWalletEntryStatus.valueOf(value);
            return value;
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid wallet entry status: " + status);
        }
    }

    private Integer parseInteger(String value) {
        try {
            return Integer.valueOf(value);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
