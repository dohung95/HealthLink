package com.HealthLink.service.impl.admin;

import com.HealthLink.dto.commission.*;
import com.HealthLink.entity.*;
import com.HealthLink.repository.admin.commission.AdminSettlementRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.service.commission.CommissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import com.HealthLink.repository.admin.commission.AdminCommissionConfigRepository;
import com.HealthLink.repository.admin.commission.AdminCommissionTransactionRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminCommissionServiceImpl implements CommissionService {

    private final AdminCommissionConfigRepository configRepo;
    private final AdminCommissionTransactionRepository transactionRepo;
    private final AdminSettlementRepository settlementRepo;
    private final DoctorRepository doctorRepo;
    private final PharmacyRepository pharmacyRepo;

    @Override
    public List<CommissionConfigDto> getAllConfigs() {
        return configRepo.findAllByOrderByServiceTypeAsc().stream()
            .map(this::toConfigDto)
            .toList();
    }

    @Override
    public CommissionConfigDto getConfigById(Integer id) {
        return configRepo.findById(id)
            .map(this::toConfigDto)
            .orElseThrow(() -> new RuntimeException("Commission config not found"));
    }

    @Override
    public CommissionConfigDto getActiveConfig(String serviceType) {
        return configRepo.findActiveConfigByServiceType(serviceType, LocalDateTime.now())
            .map(this::toConfigDto)
            .orElseThrow(() -> new RuntimeException("Active commission config not found"));
    }

    @Override
    public CommissionConfigDto updateConfig(Integer id, CommissionConfigUpdateDto dto) {
        CommissionConfig config = configRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Commission config not found"));

        config.setCommissionRate(dto.getCommissionRate());
        if (dto.getMinCommission() != null) {
            config.setMinCommission(dto.getMinCommission());
        }
        if (dto.getMaxCommission() != null) {
            config.setMaxCommission(dto.getMaxCommission());
        }
        if (dto.getDescription() != null) {
            config.setDescription(dto.getDescription());
        }
        config.setActive(dto.isActive());
        config.setEffectiveFrom(dto.getEffectiveFrom());
        config.setEffectiveTo(dto.getEffectiveTo());
        config.setUpdatedAt(LocalDateTime.now());

        return toConfigDto(configRepo.save(config));
    }

    @Override
    public CommissionTransactionDto calculateAndRecordAppointment(Appointment appointment) {
        String consultationType = appointment.getConsultationType();
        String serviceType = isOnlineConsultation(consultationType)
            ? "CONSULTATION_ONLINE" : "CONSULTATION_OFFLINE";

        Doctor doctor = appointment.getDoctor();
        BigDecimal fee = appointment.getFee() == null ? BigDecimal.ZERO : appointment.getFee();
        BigDecimal rate = getCommissionRate(serviceType, doctor.getDoctorId(), "DOCTOR");

        BigDecimal commission = calculateCommission(fee, rate, serviceType);
        BigDecimal netAmount = fee.subtract(commission);

        CommissionTransaction tx = CommissionTransaction.builder()
            .transactionNumber(generateTransactionNumber())
            .sourceType("APPOINTMENT")
            .appointmentId(appointment.getAppointmentId())
            .recipientType("DOCTOR")
            .recipientId(doctor.getDoctorId())
            .recipientName(doctor.getFullName())
            .serviceType(serviceType)
            .grossAmount(fee)
            .commissionRate(rate)
            .commissionAmount(commission)
            .netAmount(netAmount)
            .status("PENDING")
            .build();

        transactionRepo.save(tx);

        doctor.setPendingSettlement(doctor.getPendingSettlement().add(netAmount));
        doctorRepo.save(doctor);

        return toTransactionDto(tx);
    }

    @Override
    public CommissionTransactionDto calculateAndRecordPharmacyOrder(PharmacyOrder order) {
        String serviceType = "PHARMACY_ORDER";
        Pharmacy pharmacy = order.getPharmacy();
        BigDecimal medicineAmount = order.getMedicineAmount() == null ? BigDecimal.ZERO : order.getMedicineAmount();
        BigDecimal rate = getCommissionRate(serviceType, pharmacy.getPharmacyId(), "PHARMACY");

        BigDecimal commission = calculateCommission(medicineAmount, rate, serviceType);
        BigDecimal grossAmount = order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount();
        BigDecimal netAmount = grossAmount.subtract(commission);

        CommissionTransaction tx = CommissionTransaction.builder()
            .transactionNumber(generateTransactionNumber())
            .sourceType("PHARMACY_ORDER")
            .pharmacyOrderId(order.getOrderId())
            .recipientType("PHARMACY")
            .recipientId(pharmacy.getPharmacyId())
            .recipientName(pharmacy.getName())
            .serviceType(serviceType)
            .grossAmount(grossAmount)
            .commissionRate(rate)
            .commissionAmount(commission)
            .netAmount(netAmount)
            .status("PENDING")
            .build();

        transactionRepo.save(tx);

        pharmacy.setPendingSettlement(pharmacy.getPendingSettlement().add(netAmount));
        pharmacyRepo.save(pharmacy);

        return toTransactionDto(tx);
    }

    @Override
    public Page<CommissionTransactionDto> getTransactions(CommissionFilterDto filter) {
        Pageable pageable = buildPageable(filter);
        Page<CommissionTransaction> page = transactionRepo.findWithFilters(
            filter.getRecipientType(), filter.getRecipientId(), filter.getServiceType(), filter.getStatus(),
            filter.getDateFrom(), filter.getDateTo(), pageable);
        return page.map(this::toTransactionDto);
    }

    @Override
    public CommissionTransactionDto getTransactionById(Integer id) {
        return transactionRepo.findById(id)
            .map(this::toTransactionDto)
            .orElseThrow(() -> new RuntimeException("Commission transaction not found"));
    }

    @Override
    public List<CommissionTransactionDto> getPendingTransactionsByRecipient(String type, String id) {
        return transactionRepo.findByRecipientTypeAndRecipientIdAndStatus(type, id, "PENDING")
            .stream()
            .map(this::toTransactionDto)
            .toList();
    }

    @Override
    public Page<SettlementDto> getSettlements(CommissionFilterDto filter) {
        Pageable pageable = buildPageable(filter);
        Page<Settlement> page = settlementRepo.findWithFilters(
            filter.getRecipientType(), filter.getStatus(), filter.getDateFrom(), filter.getDateTo(), pageable);
        return page.map(this::toSettlementDto);
    }

    @Override
    public SettlementDto getSettlementById(Integer id) {
        return settlementRepo.findById(id)
            .map(this::toSettlementDto)
            .orElseThrow(() -> new RuntimeException("Settlement not found"));
    }

    @Override
    public SettlementDto createSettlement(SettlementCreateDto dto) {
        List<CommissionTransaction> transactions;
        if (dto.getTransactionIds() != null && !dto.getTransactionIds().isEmpty()) {
            transactions = transactionRepo.findAllById(dto.getTransactionIds());
        } else {
            transactions = transactionRepo.findByRecipientTypeAndRecipientIdAndStatus(
                dto.getRecipientType(), dto.getRecipientId(), "PENDING");
        }

        if (transactions.isEmpty()) {
            throw new RuntimeException("No pending transactions found for the selected recipient");
        }

        BigDecimal grossAmount = transactions.stream()
            .map(CommissionTransaction::getGrossAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal commissionAmount = transactions.stream()
            .map(CommissionTransaction::getCommissionAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal netAmount = transactions.stream()
            .map(CommissionTransaction::getNetAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        String recipientName = transactions.get(0).getRecipientName();
        String bankAccount = null;
        String bankName = null;
        String paypalEmail = null;

        if ("DOCTOR".equals(dto.getRecipientType())) {
            Doctor doctor = doctorRepo.findById(dto.getRecipientId()).orElse(null);
            if (doctor != null) {
                bankAccount = doctor.getBankAccount();
                bankName = doctor.getBankName();
                paypalEmail = doctor.getPaypalEmail();
            }
        } else if ("PHARMACY".equals(dto.getRecipientType())) {
            Pharmacy pharmacy = pharmacyRepo.findById(dto.getRecipientId()).orElse(null);
            if (pharmacy != null) {
                bankAccount = pharmacy.getBankAccount();
                bankName = pharmacy.getBankName();
                paypalEmail = pharmacy.getPaypalEmail();
            }
        }

        Settlement settlement = Settlement.builder()
            .settlementNumber(generateSettlementNumber())
            .recipientType(dto.getRecipientType())
            .recipientId(dto.getRecipientId())
            .recipientName(recipientName)
            .grossAmount(grossAmount)
            .commissionAmount(commissionAmount)
            .netAmount(netAmount)
            .transactionCount(transactions.size())
            .status("PENDING")
            .paymentMethod(dto.getPaymentMethod())
            .bankAccount(bankAccount)
            .bankName(bankName)
            .paypalEmail(paypalEmail)
            .periodStart(dto.getPeriodStart())
            .periodEnd(dto.getPeriodEnd())
            .notes(dto.getNotes())
            .build();

        settlementRepo.save(settlement);

        for (CommissionTransaction tx : transactions) {
            tx.setSettlement(settlement);
            tx.setStatus("SETTLED");
        }
        transactionRepo.saveAll(transactions);

        return toSettlementDto(settlement);
    }

    @Override
    public SettlementDto processSettlement(SettlementProcessDto dto) {
        Settlement settlement = settlementRepo.findById(dto.getSettlementId())
            .orElseThrow(() -> new RuntimeException("Settlement not found"));

        switch (dto.getAction()) {
            case "PROCESS" -> {
                settlement.setStatus("PROCESSING");
                settlement.setProcessedAt(LocalDateTime.now());
            }
            case "COMPLETE" -> {
                settlement.setStatus("COMPLETED");
                settlement.setCompletedAt(LocalDateTime.now());
                updateRecipientEarnings(settlement);
            }
            case "FAIL" -> {
                settlement.setStatus("FAILED");
                revertTransactions(settlement);
            }
            case "CANCEL" -> {
                settlement.setStatus("CANCELLED");
                revertTransactions(settlement);
            }
            default -> throw new RuntimeException("Unsupported settlement action: " + dto.getAction());
        }

        if (dto.getNotes() != null) {
            settlement.setNotes(dto.getNotes());
        }

        return toSettlementDto(settlementRepo.save(settlement));
    }

    @Override
    public List<SettlementDto> getSettlementsByRecipient(String type, String id) {
        return settlementRepo.findByRecipientTypeAndRecipientId(type, id).stream()
            .map(this::toSettlementDto)
            .toList();
    }

    @Override
    public CommissionDashboardDto getDashboard() {
        LocalDateTime oneYearAgo = LocalDateTime.now().minusYears(1);
        List<RecipientSummaryDto> topDoctors = transactionRepo.getTopPendingByType("DOCTOR", PageRequest.of(0, 5));
        List<RecipientSummaryDto> topPharmacies = transactionRepo.getTopPendingByType("PHARMACY", PageRequest.of(0, 5));

        return CommissionDashboardDto.builder()
            .totalGrossRevenue(transactionRepo.getTotalGrossRevenue())
            .totalCommission(transactionRepo.getTotalCommission())
            .totalPaidOut(settlementRepo.getTotalPaidOut())
            .totalPending(transactionRepo.getTotalPendingAmount())
            .doctorGross(transactionRepo.getGrossByRecipientType("DOCTOR"))
            .doctorCommission(transactionRepo.getCommissionByRecipientType("DOCTOR"))
            .pharmacyGross(transactionRepo.getGrossByRecipientType("PHARMACY"))
            .pharmacyCommission(transactionRepo.getCommissionByRecipientType("PHARMACY"))
            .totalTransactions((int) transactionRepo.count())
            .pendingTransactions(transactionRepo.countPendingTransactions())
            .pendingSettlements(settlementRepo.countPendingSettlements())
            .topDoctorsPending(topDoctors)
            .topPharmaciesPending(topPharmacies)
            .monthlyData(fillMonthNames(transactionRepo.getMonthlyCommission(oneYearAgo)))
            .build();
    }

    @Override
    public List<RecipientSummaryDto> getRecipientSummaries(String type, int limit) {
        if (limit <= 0) {
            limit = 10;
        }
        return transactionRepo.getTopPendingByType(type, PageRequest.of(0, limit));
    }

    @Override
    public BigDecimal getCommissionRate(String serviceType, String recipientId, String recipientType) {
        BigDecimal customRate = null;
        if ("DOCTOR".equals(recipientType)) {
            Doctor doctor = doctorRepo.findById(recipientId).orElse(null);
            if (doctor != null) {
                customRate = doctor.getCustomCommissionRate();
            }
        } else if ("PHARMACY".equals(recipientType)) {
            Pharmacy pharmacy = pharmacyRepo.findById(recipientId).orElse(null);
            if (pharmacy != null) {
                customRate = pharmacy.getCustomCommissionRate();
            }
        }

        if (customRate != null) {
            return customRate;
        }

        return configRepo.findActiveConfigByServiceType(serviceType, LocalDateTime.now())
            .map(CommissionConfig::getCommissionRate)
            .orElse(new BigDecimal("0.10"));
    }

    private BigDecimal calculateCommission(BigDecimal amount, BigDecimal rate, String serviceType) {
        BigDecimal commission = amount.multiply(rate).setScale(2, RoundingMode.HALF_UP);
        CommissionConfig config = configRepo.findByServiceType(serviceType).orElse(null);
        if (config != null) {
            if (config.getMinCommission() != null && commission.compareTo(config.getMinCommission()) < 0) {
                commission = config.getMinCommission();
            }
            if (config.getMaxCommission() != null && commission.compareTo(config.getMaxCommission()) > 0) {
                commission = config.getMaxCommission();
            }
        }
        return commission;
    }

    private boolean isOnlineConsultation(String type) {
        if (type == null) {
            return false;
        }
        String normalized = type.trim().toUpperCase(Locale.ROOT);
        return normalized.contains("VIDEO") || normalized.contains("AUDIO") || normalized.contains("CHAT") || normalized.contains("ONLINE");
    }

    private String generateTransactionNumber() {
        String prefix = "CTX-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM")) + "-";
        String max = transactionRepo.findMaxTransactionNumber(prefix);
        int next = 1;
        if (max != null && max.length() > prefix.length()) {
            try {
                next = Integer.parseInt(max.substring(prefix.length())) + 1;
            } catch (NumberFormatException ignored) {
            }
        }
        return prefix + String.format("%05d", next);
    }

    private String generateSettlementNumber() {
        String prefix = "STL-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM")) + "-";
        String max = settlementRepo.findMaxSettlementNumber(prefix);
        int next = 1;
        if (max != null && max.length() > prefix.length()) {
            try {
                next = Integer.parseInt(max.substring(prefix.length())) + 1;
            } catch (NumberFormatException ignored) {
            }
        }
        return prefix + String.format("%05d", next);
    }

    private void updateRecipientEarnings(Settlement settlement) {
        if ("DOCTOR".equals(settlement.getRecipientType())) {
            doctorRepo.findById(settlement.getRecipientId()).ifPresent(doctor -> {
                doctor.setTotalEarnings(doctor.getTotalEarnings().add(settlement.getNetAmount()));
                doctor.setPendingSettlement(doctor.getPendingSettlement().subtract(settlement.getNetAmount()));
                doctorRepo.save(doctor);
            });
        } else if ("PHARMACY".equals(settlement.getRecipientType())) {
            pharmacyRepo.findById(settlement.getRecipientId()).ifPresent(pharmacy -> {
                pharmacy.setTotalEarnings(pharmacy.getTotalEarnings().add(settlement.getNetAmount()));
                pharmacy.setPendingSettlement(pharmacy.getPendingSettlement().subtract(settlement.getNetAmount()));
                pharmacyRepo.save(pharmacy);
            });
        }
    }

    private void revertTransactions(Settlement settlement) {
        if (settlement.getTransactions() == null || settlement.getTransactions().isEmpty()) {
            return;
        }
        for (CommissionTransaction tx : settlement.getTransactions()) {
            tx.setStatus("PENDING");
            tx.setSettlement(null);
            transactionRepo.save(tx);
        }
        if ("DOCTOR".equals(settlement.getRecipientType())) {
            doctorRepo.findById(settlement.getRecipientId()).ifPresent(doctor -> {
                doctor.setPendingSettlement(doctor.getPendingSettlement().subtract(settlement.getNetAmount()));
                doctorRepo.save(doctor);
            });
        } else if ("PHARMACY".equals(settlement.getRecipientType())) {
            pharmacyRepo.findById(settlement.getRecipientId()).ifPresent(pharmacy -> {
                pharmacy.setPendingSettlement(pharmacy.getPendingSettlement().subtract(settlement.getNetAmount()));
                pharmacyRepo.save(pharmacy);
            });
        }
    }

    private CommissionConfigDto toConfigDto(CommissionConfig config) {
        return CommissionConfigDto.builder()
            .configId(config.getConfigId())
            .serviceType(config.getServiceType())
            .commissionRate(config.getCommissionRate())
            .minCommission(config.getMinCommission())
            .maxCommission(config.getMaxCommission())
            .description(config.getDescription())
            .active(config.isActive())
            .effectiveFrom(config.getEffectiveFrom())
            .effectiveTo(config.getEffectiveTo())
            .createdAt(config.getCreatedAt())
            .updatedAt(config.getUpdatedAt())
            .build();
    }

    private CommissionTransactionDto toTransactionDto(CommissionTransaction tx) {
        return CommissionTransactionDto.builder()
            .transactionId(tx.getTransactionId())
            .transactionNumber(tx.getTransactionNumber())
            .sourceType(tx.getSourceType())
            .sourceId(tx.getAppointmentId() != null ? tx.getAppointmentId() : tx.getPharmacyOrderId())
            .recipientType(tx.getRecipientType())
            .recipientId(tx.getRecipientId())
            .recipientName(tx.getRecipientName())
            .serviceType(tx.getServiceType())
            .grossAmount(tx.getGrossAmount())
            .commissionRate(tx.getCommissionRate())
            .commissionAmount(tx.getCommissionAmount())
            .netAmount(tx.getNetAmount())
            .status(tx.getStatus())
            .settlementId(tx.getSettlement() != null ? tx.getSettlement().getSettlementId() : null)
            .settlementNumber(tx.getSettlement() != null ? tx.getSettlement().getSettlementNumber() : null)
            .createdAt(tx.getCreatedAt())
            .build();
    }

    private SettlementDto toSettlementDto(Settlement settlement) {
        return SettlementDto.builder()
            .settlementId(settlement.getSettlementId())
            .settlementNumber(settlement.getSettlementNumber())
            .recipientType(settlement.getRecipientType())
            .recipientId(settlement.getRecipientId())
            .recipientName(settlement.getRecipientName())
            .grossAmount(settlement.getGrossAmount())
            .commissionAmount(settlement.getCommissionAmount())
            .netAmount(settlement.getNetAmount())
            .transactionCount(settlement.getTransactionCount())
            .status(settlement.getStatus())
            .paymentMethod(settlement.getPaymentMethod())
            .bankAccount(settlement.getBankAccount())
            .bankName(settlement.getBankName())
            .paypalEmail(settlement.getPaypalEmail())
            .periodStart(settlement.getPeriodStart())
            .periodEnd(settlement.getPeriodEnd())
            .processedAt(settlement.getProcessedAt())
            .processedBy(settlement.getProcessedBy())
            .completedAt(settlement.getCompletedAt())
            .notes(settlement.getNotes())
            .createdAt(settlement.getCreatedAt())
            .transactions(settlement.getTransactions() == null ? List.of() :
                settlement.getTransactions().stream().map(this::toTransactionDto).toList())
            .build();
    }

    private Pageable buildPageable(CommissionFilterDto filter) {
        int page = filter.getPage() == null ? 0 : filter.getPage();
        int size = filter.getSize() == null ? 20 : filter.getSize();
        String sortBy = filter.getSortBy() == null || filter.getSortBy().isBlank() ? "createdAt" : filter.getSortBy();
        Sort.Direction direction = "asc".equalsIgnoreCase(filter.getSortDir()) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return PageRequest.of(page, size, Sort.by(direction, sortBy));
    }

    private List<MonthlyCommissionDto> fillMonthNames(List<MonthlyCommissionDto> rows) {
        for (MonthlyCommissionDto item : rows) {
            item.setMonthName(item.getMonth() == null ? "" : LocalDate.of(item.getYear(), item.getMonth(), 1)
                .getMonth().name().substring(0, 3));
        }
        return rows;
    }
}
