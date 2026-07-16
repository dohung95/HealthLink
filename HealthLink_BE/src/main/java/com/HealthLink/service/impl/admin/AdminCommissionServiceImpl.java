package com.HealthLink.service.impl.admin;

import com.HealthLink.dto.commission.admin.*;
import com.HealthLink.entity.*;
import com.HealthLink.repository.admin.AdminAppointmentRepository;
import com.HealthLink.repository.admin.commission.AdminSettlementRepository;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import com.HealthLink.repository.admin.commission.AdminCommissionConfigRepository;
import com.HealthLink.repository.admin.commission.AdminCommissionTransactionRepository;
import com.HealthLink.service.admin.AdminAuditLogService;
import com.HealthLink.service.admin.AdminCommissionService;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminCommissionServiceImpl implements AdminCommissionService {

    private final AdminCommissionConfigRepository configRepo;
    private final AdminCommissionTransactionRepository transactionRepo;
    private final AdminSettlementRepository settlementRepo;
    private final DoctorRepository doctorRepo;
    private final PharmacyRepository pharmacyRepo;
    private final AdminAppointmentRepository adminAppointmentRepo;
    private final AppointmentRepository appointmentRepo;
    private final PharmacyOrderRepository pharmacyOrderRepo;
    private final AdminAuditLogService auditLogService;

    // Status categories
    private static final List<String> PENDING_STATUSES = Arrays.asList("SCHEDULED", "IN_CONSULTATION", "CONFIRMED");
    private static final List<String> COMPLETED_STATUSES = Arrays.asList("COMPLETED");
    private static final List<String> CANCELLED_STATUSES = Arrays.asList("CANCELLED", "NO_SHOW", "REFUNDED");

    // Consultation types — luồng mới chỉ lưu 'Online'/'HomeVisit' (xem DoctorServiceHelper.normalizeConsultationType);
    // các giá trị VIDEO/AUDIO/CHAT/OFFLINE/IN_PERSON/CLINIC là dữ liệu cũ chưa migrate, giữ lại để tương thích ngược.
    private static final List<String> ONLINE_TYPES = Arrays.asList("VIDEO", "AUDIO", "CHAT", "ONLINE");
    private static final List<String> OFFLINE_TYPES = Arrays.asList("HOMEVISIT", "HOME_VISIT", "OFFLINE", "IN_PERSON", "CLINIC");

    // Pharmacy order statuses
    private static final List<String> PHARMACY_PENDING_STATUSES = Arrays.asList("PENDING", "CONFIRMED", "PREPARING", "READY", "SHIPPING");
    private static final List<String> PHARMACY_COMPLETED_STATUSES = Arrays.asList("DELIVERED", "COMPLETED");
    private static final List<String> PHARMACY_CANCELLED_STATUSES = Arrays.asList("CANCELLED", "REFUNDED", "RETURNED");

    @Override
    public List<AdminCommissionConfigDto> getAllConfigs() {
        // CONSULTATION_OFFLINE là serviceType của luồng cũ — appointment giờ chỉ normalize ra Online/HomeVisit
        // (xem resolveAppointmentServiceType, FeeCalculatorServiceImpl) nên config này không còn áp dụng cho ai,
        // ẩn khỏi danh sách để admin không chỉnh nhầm một rate vô tác dụng.
        return configRepo.findAllByOrderByServiceTypeAsc().stream()
            .filter(c -> !"CONSULTATION_OFFLINE".equals(c.getServiceType()))
            .map(this::toConfigDto)
            .toList();
    }

    @Override
    public AdminCommissionConfigDto getConfigById(Integer id) {
        return configRepo.findById(id)
            .map(this::toConfigDto)
            .orElseThrow(() -> new RuntimeException("Commission config not found"));
    }

    @Override
    public AdminCommissionConfigDto getActiveConfig(String serviceType) {
        return configRepo.findActiveConfigByServiceType(serviceType, LocalDateTime.now())
            .map(this::toConfigDto)
            .orElseThrow(() -> new RuntimeException("Active commission config not found"));
    }

    @Override
    public AdminCommissionConfigDto updateConfig(Integer id, AdminCommissionConfigUpdateDto dto) {
        return updateConfig(id, dto, null);
    }

    @Override
    public AdminCommissionConfigDto updateConfig(Integer id, AdminCommissionConfigUpdateDto dto, String adminUserId) {
        CommissionConfig config = configRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Commission config not found"));

        // Capture old values for audit log
        BigDecimal oldRate = config.getCommissionRate();
        BigDecimal oldMin = config.getMinCommission();
        BigDecimal oldMax = config.getMaxCommission();
        String serviceType = config.getServiceType();

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
        config.setEffectiveFrom(dto.getEffectiveFrom());
        config.setEffectiveTo(dto.getEffectiveTo());
        config.setUpdatedAt(LocalDateTime.now());

        CommissionConfig saved = configRepo.save(config);

        // Log the config change
        if (adminUserId != null) {
            auditLogService.logCommissionConfigChange(
                adminUserId,
                id,
                serviceType,
                oldRate,
                dto.getCommissionRate(),
                oldMin,
                dto.getMinCommission() != null ? dto.getMinCommission() : oldMin,
                oldMax,
                dto.getMaxCommission() != null ? dto.getMaxCommission() : oldMax,
                dto.getReason()
            );
        }

        return toConfigDto(saved);
    }

    @Override
    public AdminCommissionTransactionDto calculateAndRecordAppointment(Appointment appointment) {
        String consultationType = appointment.getConsultationType();
        String serviceType = resolveAppointmentServiceType(consultationType);

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
    public AdminCommissionTransactionDto calculateAndRecordPharmacyOrder(PharmacyOrder order) {
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
    public Page<AdminCommissionTransactionDto> getTransactions(AdminCommissionFilterDto filter) {
        Pageable pageable = buildPageable(filter);
        Page<CommissionTransaction> page = transactionRepo.findWithFilters(
            filter.getRecipientType(), filter.getRecipientId(), filter.getServiceType(), filter.getStatus(),
            filter.getDateFrom(), filter.getDateTo(), pageable);
        return page.map(this::toTransactionDto);
    }

    @Override
    public AdminCommissionTransactionDto getTransactionById(Integer id) {
        return transactionRepo.findById(id)
            .map(this::toTransactionDto)
            .orElseThrow(() -> new RuntimeException("Commission transaction not found"));
    }

    @Override
    public List<AdminCommissionTransactionDto> getPendingTransactionsByRecipient(String type, String id) {
        return transactionRepo.findByRecipientTypeAndRecipientIdAndStatus(type, id, "PENDING")
            .stream()
            .map(this::toTransactionDto)
            .toList();
    }

    @Override
    public Page<AdminSettlementDto> getSettlements(AdminCommissionFilterDto filter) {
        Pageable pageable = buildPageable(filter);
        Page<Settlement> page = settlementRepo.findWithFilters(
            filter.getRecipientType(), filter.getStatus(), filter.getDateFrom(), filter.getDateTo(), pageable);
        return page.map(this::toSettlementDto);
    }

    @Override
    public AdminSettlementDto getSettlementById(Integer id) {
        return settlementRepo.findById(id)
            .map(this::toSettlementDto)
            .orElseThrow(() -> new RuntimeException("Settlement not found"));
    }

    @Override
    public AdminSettlementDto createSettlement(AdminSettlementCreateDto dto) {
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
    public AdminSettlementDto processSettlement(AdminSettlementProcessDto dto) {
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
    public List<AdminSettlementDto> getSettlementsByRecipient(String type, String id) {
        return settlementRepo.findByRecipientTypeAndRecipientId(type, id).stream()
            .map(this::toSettlementDto)
            .toList();
    }

    @Override
    public AdminCommissionDashboardDto getDashboard() {
        BigDecimal doctorGross = BigDecimal.ZERO;
        BigDecimal doctorCommission = BigDecimal.ZERO;
        BigDecimal pharmacyGross = BigDecimal.ZERO;
        BigDecimal pharmacyCommission = BigDecimal.ZERO;
        BigDecimal totalPending = BigDecimal.ZERO;
        long totalTransactions = 0;
        Map<Integer, AdminYearlyCommissionDto> yearlyMap = new TreeMap<>();
        List<AdminRecipientSummaryDto> doctorPending = new ArrayList<>();
        List<AdminRecipientSummaryDto> pharmacyPending = new ArrayList<>();

        for (Doctor doctor : doctorRepo.findAll()) {
            String doctorId = doctor.getDoctorId();

            PartnerFinancials fin = computeDoctorFinancials(doctorId);
            doctorGross = doctorGross.add(fin.grossRevenue);
            doctorCommission = doctorCommission.add(fin.commissionAmount);
            totalPending = totalPending.add(fin.pendingSettlement);
            totalTransactions += adminAppointmentRepo.countByDoctorAndStatusAndType(doctorId, COMPLETED_STATUSES, ONLINE_TYPES)
                + adminAppointmentRepo.countByDoctorAndStatusAndType(doctorId, COMPLETED_STATUSES, OFFLINE_TYPES);

            if (fin.pendingSettlement.compareTo(BigDecimal.ZERO) > 0) {
                doctorPending.add(AdminRecipientSummaryDto.builder()
                    .recipientId(doctorId).recipientName(doctor.getFullName()).recipientType("DOCTOR")
                    .totalGross(fin.grossRevenue).totalCommission(fin.commissionAmount).totalNet(fin.netEarnings)
                    .pendingAmount(fin.pendingSettlement).transactionCount(0L)
                    .build());
            }

            accumulateYearlyBuckets(yearlyMap,
                adminAppointmentRepo.sumCompletedFeeAndPlatformFeeByDoctorGroupedByYearMonth(doctorId, ONLINE_TYPES, OFFLINE_TYPES),
                true);
        }

        for (Pharmacy pharmacy : pharmacyRepo.findAll()) {
            String pharmacyId = pharmacy.getPharmacyId();

            PartnerFinancials fin = computePharmacyFinancials(pharmacyId);
            pharmacyGross = pharmacyGross.add(fin.grossRevenue);
            pharmacyCommission = pharmacyCommission.add(fin.commissionAmount);
            totalPending = totalPending.add(fin.pendingSettlement);
            Integer paidCount = pharmacyOrderRepo.countPaidByPharmacy(pharmacyId);
            totalTransactions += paidCount != null ? paidCount : 0;

            if (fin.pendingSettlement.compareTo(BigDecimal.ZERO) > 0) {
                pharmacyPending.add(AdminRecipientSummaryDto.builder()
                    .recipientId(pharmacyId).recipientName(pharmacy.getName()).recipientType("PHARMACY")
                    .totalGross(fin.grossRevenue).totalCommission(fin.commissionAmount).totalNet(fin.netEarnings)
                    .pendingAmount(fin.pendingSettlement).transactionCount(0L)
                    .build());
            }

            accumulateYearlyBuckets(yearlyMap,
                pharmacyOrderRepo.sumCompletedAmountAndPlatformFeeByPharmacyGroupedByYearMonth(pharmacyId),
                false);
        }

        doctorPending.sort((a, b) -> b.getPendingAmount().compareTo(a.getPendingAmount()));
        pharmacyPending.sort((a, b) -> b.getPendingAmount().compareTo(a.getPendingAmount()));

        List<AdminYearlyCommissionDto> yearlyData = new ArrayList<>(yearlyMap.values());

        return AdminCommissionDashboardDto.builder()
            .totalGrossRevenue(doctorGross.add(pharmacyGross))
            .totalCommission(doctorCommission.add(pharmacyCommission))
            .totalPaidOut(settlementRepo.getTotalPaidOut())
            .totalPending(totalPending)
            .doctorGross(doctorGross)
            .doctorCommission(doctorCommission)
            .pharmacyGross(pharmacyGross)
            .pharmacyCommission(pharmacyCommission)
            .totalTransactions((int) totalTransactions)
            .pendingTransactions(doctorPending.size() + pharmacyPending.size())
            .pendingSettlements(settlementRepo.countPendingSettlements())
            .topDoctorsPending(doctorPending.stream().limit(5).toList())
            .topPharmaciesPending(pharmacyPending.stream().limit(5).toList())
            .yearlyData(yearlyData)
            .build();
    }

    @Override
    public List<AdminMonthlyCommissionDto> getDashboardMonthly(int year) {
        if (year <= 0) {
            year = LocalDate.now().getYear();
        }
        Map<Integer, AdminMonthlyCommissionDto> monthMap = new LinkedHashMap<>();
        for (int m = 1; m <= 12; m++) {
            monthMap.put(m, AdminMonthlyCommissionDto.builder()
                .year(year).month(m).grossAmount(BigDecimal.ZERO).commissionAmount(BigDecimal.ZERO)
                .netAmount(BigDecimal.ZERO).transactionCount(0L).build());
        }

        for (Doctor doctor : doctorRepo.findAll()) {
            for (Object[] row : adminAppointmentRepo.sumCompletedFeeAndPlatformFeeByDoctorGroupedByYearMonth(doctor.getDoctorId(), ONLINE_TYPES, OFFLINE_TYPES)) {
                if (((Number) row[0]).intValue() != year) {
                    continue;
                }
                mergeMonthRow(monthMap, row, true);
            }
        }
        for (Pharmacy pharmacy : pharmacyRepo.findAll()) {
            for (Object[] row : pharmacyOrderRepo.sumCompletedAmountAndPlatformFeeByPharmacyGroupedByYearMonth(pharmacy.getPharmacyId())) {
                if (((Number) row[0]).intValue() != year) {
                    continue;
                }
                mergeMonthRow(monthMap, row, false);
            }
        }

        return fillMonthNames(new ArrayList<>(monthMap.values()));
    }

    @Override
    public List<AdminRecipientSummaryDto> getRecipientSummaries(String type, int limit) {
        if (limit <= 0) {
            limit = 10;
        }
        List<AdminRecipientSummaryDto> summaries = new ArrayList<>();
        if ("DOCTOR".equalsIgnoreCase(type)) {
            for (Doctor doctor : doctorRepo.findAll()) {
                PartnerFinancials fin = computeDoctorFinancials(doctor.getDoctorId());
                summaries.add(AdminRecipientSummaryDto.builder()
                    .recipientId(doctor.getDoctorId()).recipientName(doctor.getFullName()).recipientType("DOCTOR")
                    .totalGross(fin.grossRevenue).totalCommission(fin.commissionAmount).totalNet(fin.netEarnings)
                    .pendingAmount(fin.pendingSettlement).transactionCount(0L)
                    .build());
            }
        } else if ("PHARMACY".equalsIgnoreCase(type)) {
            for (Pharmacy pharmacy : pharmacyRepo.findAll()) {
                PartnerFinancials fin = computePharmacyFinancials(pharmacy.getPharmacyId());
                summaries.add(AdminRecipientSummaryDto.builder()
                    .recipientId(pharmacy.getPharmacyId()).recipientName(pharmacy.getName()).recipientType("PHARMACY")
                    .totalGross(fin.grossRevenue).totalCommission(fin.commissionAmount).totalNet(fin.netEarnings)
                    .pendingAmount(fin.pendingSettlement).transactionCount(0L)
                    .build());
            }
        }
        summaries.sort((a, b) -> b.getPendingAmount().compareTo(a.getPendingAmount()));
        return summaries.stream().limit(limit).toList();
    }

    @Override
    public AdminPartnerCommissionHistoryDto getPartnerCommissionHistory(String partnerType, String partnerId) {
        Map<Integer, AdminYearlyCommissionDto> yearlyMap = new TreeMap<>();
        Map<String, AdminMonthlyCommissionDto> monthMap = new LinkedHashMap<>();

        if ("DOCTOR".equalsIgnoreCase(partnerType)) {
            doctorRepo.findById(partnerId)
                .orElseThrow(() -> new RuntimeException("Doctor not found: " + partnerId));
            List<Object[]> rows = adminAppointmentRepo.sumCompletedFeeAndPlatformFeeByDoctorGroupedByYearMonth(partnerId, ONLINE_TYPES, OFFLINE_TYPES);
            accumulateYearlyBuckets(yearlyMap, rows, true);
            for (Object[] row : rows) {
                putMonthRow(monthMap, row, true);
            }
        } else if ("PHARMACY".equalsIgnoreCase(partnerType)) {
            pharmacyRepo.findById(partnerId)
                .orElseThrow(() -> new RuntimeException("Pharmacy not found: " + partnerId));
            List<Object[]> rows = pharmacyOrderRepo.sumCompletedAmountAndPlatformFeeByPharmacyGroupedByYearMonth(partnerId);
            accumulateYearlyBuckets(yearlyMap, rows, false);
            for (Object[] row : rows) {
                putMonthRow(monthMap, row, false);
            }
        } else {
            throw new RuntimeException("Invalid partner type: " + partnerType);
        }

        return AdminPartnerCommissionHistoryDto.builder()
            .partnerId(partnerId)
            .partnerType(partnerType.toUpperCase())
            .yearlyBreakdown(new ArrayList<>(yearlyMap.values()))
            .monthlyBreakdown(fillMonthNames(new ArrayList<>(monthMap.values())))
            .build();
    }

    @Override
    public BigDecimal getCommissionRate(String serviceType, String recipientId, String recipientType) {
        LocalDateTime now = LocalDateTime.now();
        BigDecimal customRate = null;

        if ("DOCTOR".equals(recipientType)) {
            Doctor doctor = doctorRepo.findById(recipientId).orElse(null);
            if (doctor != null) {
                // Kiểm tra theo loại dịch vụ (Online hay Offline)
                if ("CONSULTATION_ONLINE".equals(serviceType)) {
                    if (doctor.getCustomCommissionRateOnline() != null &&
                        isCustomRateValid(
                            doctor.getCustomCommissionRateOnlineEffectiveFrom(),
                            doctor.getCustomCommissionRateOnlineEffectiveTo(),
                            now)) {
                        customRate = doctor.getCustomCommissionRateOnline();
                    }
                } else if ("CONSULTATION_OFFLINE".equals(serviceType)
                        || "CONSULTATION_HOME_VISIT".equals(serviceType)) {
                    if (doctor.getCustomCommissionRateOffline() != null &&
                        isCustomRateValid(
                            doctor.getCustomCommissionRateOfflineEffectiveFrom(),
                            doctor.getCustomCommissionRateOfflineEffectiveTo(),
                            now)) {
                        customRate = doctor.getCustomCommissionRateOffline();
                    }
                }
            }
        } else if ("PHARMACY".equals(recipientType)) {
            Pharmacy pharmacy = pharmacyRepo.findById(recipientId).orElse(null);
            if (pharmacy != null && pharmacy.getCustomCommissionRate() != null) {
                if (isCustomRateValid(
                    pharmacy.getCustomCommissionRateEffectiveFrom(),
                    pharmacy.getCustomCommissionRateEffectiveTo(),
                    now)) {
                    customRate = pharmacy.getCustomCommissionRate();
                }
            }
        }

        if (customRate != null) {
            return customRate;
        }

        return configRepo.findActiveConfigByServiceType(serviceType, now)
            .map(CommissionConfig::getCommissionRate)
            .orElse(new BigDecimal("0.10"));
    }

    private String resolveAppointmentServiceType(String consultationType) {
        String normalized = normalizeConsultationType(consultationType);
        if ("Online".equalsIgnoreCase(normalized)) {
            return "CONSULTATION_ONLINE";
        }
        if ("HomeVisit".equalsIgnoreCase(normalized)) {
            return "CONSULTATION_HOME_VISIT";
        }
        return "CONSULTATION_OFFLINE";
    }

    private String normalizeConsultationType(String type) {
        if (type == null || type.isBlank()) return "Online";
        String t = type.trim().toLowerCase();
        return switch (t) {
            case "video", "video call", "audio", "audio call", "chat", "online", "consultation" -> "Online";
            case "homevisit", "home visit", "home-visit", "home", "offline", "in-person", "in person" -> "HomeVisit";
            default -> "Online";
        };
    }

    /**
     * Kiểm tra xem custom rate có còn hiệu lực không
     */
    private boolean isCustomRateValid(LocalDateTime effectiveFrom, LocalDateTime effectiveTo, LocalDateTime now) {
        if (effectiveFrom != null && now.isBefore(effectiveFrom)) {
            return false; // Chưa đến thời điểm bắt đầu
        }
        if (effectiveTo != null && now.isAfter(effectiveTo)) {
            return false; // Đã hết hạn
        }
        return true;
    }

    // ========================================================================
    // Financial computation — derived live from Appointments/PharmacyOrders.
    // (CommissionTransactions is not used here: nothing in the real appointment/order
    // completion flow ever writes to it outside of seed data, so it can't be trusted
    // as a source for reporting — see calculateAndRecordAppointment/PharmacyOrder.)
    // ========================================================================

    private static class PartnerFinancials {
        final BigDecimal grossRevenue;
        final BigDecimal commissionAmount;
        final BigDecimal netEarnings;
        final BigDecimal pendingSettlement;

        PartnerFinancials(BigDecimal grossRevenue, BigDecimal commissionAmount,
                           BigDecimal netEarnings, BigDecimal pendingSettlement) {
            this.grossRevenue = grossRevenue;
            this.commissionAmount = commissionAmount;
            this.netEarnings = netEarnings;
            this.pendingSettlement = pendingSettlement;
        }
    }

    private BigDecimal resolveEffectiveDoctorRate(Doctor doctor, String serviceType, LocalDateTime now) {
        boolean isOnline = "CONSULTATION_ONLINE".equals(serviceType);
        BigDecimal customRate = isOnline ? doctor.getCustomCommissionRateOnline() : doctor.getCustomCommissionRateOffline();
        LocalDateTime from = isOnline ? doctor.getCustomCommissionRateOnlineEffectiveFrom() : doctor.getCustomCommissionRateOfflineEffectiveFrom();
        LocalDateTime to = isOnline ? doctor.getCustomCommissionRateOnlineEffectiveTo() : doctor.getCustomCommissionRateOfflineEffectiveTo();

        if (customRate != null && isCustomRateValid(from, to, now)) {
            return customRate;
        }
        BigDecimal fallback = isOnline ? new BigDecimal("0.15") : new BigDecimal("0.10");
        return configRepo.findActiveConfigByServiceType(serviceType, now)
            .map(CommissionConfig::getCommissionRate)
            .orElse(fallback);
    }

    private BigDecimal resolveEffectivePharmacyRate(Pharmacy pharmacy, LocalDateTime now) {
        if (pharmacy.getCustomCommissionRate() != null &&
            isCustomRateValid(pharmacy.getCustomCommissionRateEffectiveFrom(), pharmacy.getCustomCommissionRateEffectiveTo(), now)) {
            return pharmacy.getCustomCommissionRate();
        }
        return configRepo.findActiveConfigByServiceType("PHARMACY_ORDER", now)
            .map(CommissionConfig::getCommissionRate)
            .orElse(new BigDecimal("0.10"));
    }

    /**
     * Sums the doctor's actual recorded gross/commission across every month they have activity,
     * using the same real-Invoice-data source as {@link #accumulateYearlyBuckets} /
     * {@link #mergeMonthRow} so the all-time total here always agrees with the monthly/yearly
     * breakdown charts.
     */
    private PartnerFinancials computeDoctorFinancials(String doctorId) {
        BigDecimal gross = BigDecimal.ZERO;
        BigDecimal commission = BigDecimal.ZERO;
        for (Object[] row : adminAppointmentRepo.sumCompletedFeeAndPlatformFeeByDoctorGroupedByYearMonth(doctorId, ONLINE_TYPES, OFFLINE_TYPES)) {
            MonthlyRowValues v = parseMonthlyRow(row, true);
            gross = gross.add(v.gross);
            commission = commission.add(v.commission);
        }
        BigDecimal net = gross.subtract(commission);
        BigDecimal completedSettlements = nz(settlementRepo.getTotalCompletedNetAmountByRecipient("DOCTOR", doctorId));
        BigDecimal pending = net.subtract(completedSettlements);

        return new PartnerFinancials(gross, commission, net, pending);
    }

    private PartnerFinancials computePharmacyFinancials(String pharmacyId) {
        BigDecimal gross = BigDecimal.ZERO;
        BigDecimal commission = BigDecimal.ZERO;
        for (Object[] row : pharmacyOrderRepo.sumCompletedAmountAndPlatformFeeByPharmacyGroupedByYearMonth(pharmacyId)) {
            MonthlyRowValues v = parseMonthlyRow(row, false);
            gross = gross.add(v.gross);
            commission = commission.add(v.commission);
        }
        BigDecimal net = gross.subtract(commission);
        BigDecimal completedSettlements = nz(settlementRepo.getTotalCompletedNetAmountByRecipient("PHARMACY", pharmacyId));
        BigDecimal pending = net.subtract(completedSettlements);

        return new PartnerFinancials(gross, commission, net, pending);
    }

    private BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static class MonthlyRowValues {
        final BigDecimal gross;
        final BigDecimal commission;
        final long count;

        MonthlyRowValues(BigDecimal gross, BigDecimal commission, long count) {
            this.gross = gross;
            this.commission = commission;
            this.count = count;
        }
    }

    /**
     * Parses one grouped-by-year-month row into gross/commission/count. Doctor rows are
     * [year, month, onlineFee, offlineFee, onlinePlatformFee, offlinePlatformFee, count];
     * pharmacy rows are [year, month, totalAmount, platformFee, count]. Commission uses the
     * ACTUAL platformFee recorded on the Invoice/PharmacyOrder at payment time — not gross times
     * today's configured rate — so this agrees with Financial Reports and stays historically
     * accurate even after a partner's commission rate changes later.
     */
    private MonthlyRowValues parseMonthlyRow(Object[] row, boolean isDoctorRows) {
        if (isDoctorRows) {
            BigDecimal onlineFee = toBigDecimal(row[2]);
            BigDecimal offlineFee = toBigDecimal(row[3]);
            BigDecimal onlineCommission = actualOrFallbackCommission(toBigDecimal(row[4]), onlineFee);
            BigDecimal offlineCommission = actualOrFallbackCommission(toBigDecimal(row[5]), offlineFee);
            long count = ((Number) row[6]).longValue();
            return new MonthlyRowValues(onlineFee.add(offlineFee), onlineCommission.add(offlineCommission), count);
        }
        BigDecimal amount = toBigDecimal(row[2]);
        BigDecimal commission = actualOrFallbackCommission(toBigDecimal(row[3]), amount);
        long count = ((Number) row[4]).longValue();
        return new MonthlyRowValues(amount, commission, count);
    }

    /**
     * Mirrors AdminFinancialService's fallback: if no Invoice/PharmacyOrder platformFee was ever
     * recorded for this bucket (sparse demo/test data) but there was revenue, estimate 10% — the
     * same rule Financial Reports uses, so the two screens still agree in that edge case too.
     */
    private BigDecimal actualOrFallbackCommission(BigDecimal actualCommission, BigDecimal gross) {
        if (actualCommission.compareTo(BigDecimal.ZERO) == 0 && gross.compareTo(BigDecimal.ZERO) > 0) {
            return gross.multiply(new BigDecimal("0.10")).setScale(2, RoundingMode.HALF_UP);
        }
        return actualCommission;
    }

    /**
     * Merge grouped-by-year-month rows into a running year-bucket map. Rows are either
     * doctor shape (isDoctorRows=true) or pharmacy shape (isDoctorRows=false) — see
     * {@link #parseMonthlyRow} for the exact column layout of each.
     */
    private void accumulateYearlyBuckets(Map<Integer, AdminYearlyCommissionDto> yearlyMap, List<Object[]> rows,
                                          boolean isDoctorRows) {
        for (Object[] row : rows) {
            int year = ((Number) row[0]).intValue();
            MonthlyRowValues v = parseMonthlyRow(row, isDoctorRows);

            AdminYearlyCommissionDto bucket = yearlyMap.computeIfAbsent(year, y -> AdminYearlyCommissionDto.builder()
                .year(y).grossAmount(BigDecimal.ZERO).commissionAmount(BigDecimal.ZERO)
                .netAmount(BigDecimal.ZERO).transactionCount(0L).build());
            bucket.setGrossAmount(bucket.getGrossAmount().add(v.gross));
            bucket.setCommissionAmount(bucket.getCommissionAmount().add(v.commission));
            bucket.setNetAmount(bucket.getNetAmount().add(v.gross.subtract(v.commission)));
            bucket.setTransactionCount(bucket.getTransactionCount() + v.count);
        }
    }

    /** Same row shapes as accumulateYearlyBuckets, merged into a pre-initialized (1..12) month map for one year. */
    private void mergeMonthRow(Map<Integer, AdminMonthlyCommissionDto> monthMap, Object[] row, boolean isDoctorRows) {
        int month = ((Number) row[1]).intValue();
        MonthlyRowValues v = parseMonthlyRow(row, isDoctorRows);

        AdminMonthlyCommissionDto bucket = monthMap.get(month);
        if (bucket == null) {
            return;
        }
        bucket.setGrossAmount(bucket.getGrossAmount().add(v.gross));
        bucket.setCommissionAmount(bucket.getCommissionAmount().add(v.commission));
        bucket.setNetAmount(bucket.getNetAmount().add(v.gross.subtract(v.commission)));
        bucket.setTransactionCount(bucket.getTransactionCount() + v.count);
    }

    /** Same row shapes, keyed by "year-month" into a growing (not pre-initialized) map spanning all years. */
    private void putMonthRow(Map<String, AdminMonthlyCommissionDto> monthMap, Object[] row, boolean isDoctorRows) {
        int year = ((Number) row[0]).intValue();
        int month = ((Number) row[1]).intValue();
        MonthlyRowValues v = parseMonthlyRow(row, isDoctorRows);

        String key = year + "-" + month;
        AdminMonthlyCommissionDto bucket = monthMap.computeIfAbsent(key, k -> AdminMonthlyCommissionDto.builder()
            .year(year).month(month).grossAmount(BigDecimal.ZERO).commissionAmount(BigDecimal.ZERO)
            .netAmount(BigDecimal.ZERO).transactionCount(0L).build());
        bucket.setGrossAmount(bucket.getGrossAmount().add(v.gross));
        bucket.setCommissionAmount(bucket.getCommissionAmount().add(v.commission));
        bucket.setNetAmount(bucket.getNetAmount().add(v.gross.subtract(v.commission)));
        bucket.setTransactionCount(bucket.getTransactionCount() + v.count);
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bd) {
            return bd;
        }
        return new BigDecimal(value.toString());
    }

    // ========================================================================
    // Partner Commission Management
    // ========================================================================

    @Override
    public Page<AdminPartnerCommissionDto> getPartnerCommissions(String partnerType, String searchTerm, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        LocalDateTime now = LocalDateTime.now();

        if ("DOCTOR".equalsIgnoreCase(partnerType)) {
            Page<Doctor> doctors;
            if (searchTerm != null && !searchTerm.isBlank()) {
                doctors = doctorRepo.findByFullNameContainingIgnoreCase(searchTerm, pageable);
            } else {
                doctors = doctorRepo.findAll(pageable);
            }
            return doctors.map(d -> toDoctorCommissionDto(d, now));
        } else if ("PHARMACY".equalsIgnoreCase(partnerType)) {
            Page<Pharmacy> pharmacies;
            if (searchTerm != null && !searchTerm.isBlank()) {
                pharmacies = pharmacyRepo.findByNameContainingIgnoreCase(searchTerm, pageable);
            } else {
                pharmacies = pharmacyRepo.findAll(pageable);
            }
            return pharmacies.map(p -> toPharmacyCommissionDto(p, now));
        }

        return Page.empty();
    }

    @Override
    public AdminPartnerCommissionDto getPartnerCommission(String partnerType, String partnerId) {
        LocalDateTime now = LocalDateTime.now();

        if ("DOCTOR".equalsIgnoreCase(partnerType)) {
            Doctor doctor = doctorRepo.findById(partnerId)
                .orElseThrow(() -> new RuntimeException("Doctor not found: " + partnerId));
            return toDoctorCommissionDto(doctor, now);
        } else if ("PHARMACY".equalsIgnoreCase(partnerType)) {
            Pharmacy pharmacy = pharmacyRepo.findById(partnerId)
                .orElseThrow(() -> new RuntimeException("Pharmacy not found: " + partnerId));
            return toPharmacyCommissionDto(pharmacy, now);
        }

        throw new RuntimeException("Invalid partner type: " + partnerType);
    }

    @Override
    public AdminPartnerCommissionDto updatePartnerCommission(String partnerType, String partnerId, AdminPartnerCommissionUpdateDto dto) {
        return updatePartnerCommission(partnerType, partnerId, dto, null);
    }

    @Override
    public AdminPartnerCommissionDto updatePartnerCommission(String partnerType, String partnerId, AdminPartnerCommissionUpdateDto dto, String adminUserId) {
        LocalDateTime now = LocalDateTime.now();

        if ("DOCTOR".equalsIgnoreCase(partnerType)) {
            Doctor doctor = doctorRepo.findById(partnerId)
                .orElseThrow(() -> new RuntimeException("Doctor not found: " + partnerId));

            // Capture old values for audit log
            Map<String, Object> oldRates = new HashMap<>();
            oldRates.put("customCommissionRateOnline", doctor.getCustomCommissionRateOnline());
            oldRates.put("customCommissionRateOffline", doctor.getCustomCommissionRateOffline());
            oldRates.put("effectiveFromOnline", doctor.getCustomCommissionRateOnlineEffectiveFrom());
            oldRates.put("effectiveToOnline", doctor.getCustomCommissionRateOnlineEffectiveTo());
            oldRates.put("effectiveFromOffline", doctor.getCustomCommissionRateOfflineEffectiveFrom());
            oldRates.put("effectiveToOffline", doctor.getCustomCommissionRateOfflineEffectiveTo());

            // Update Online rate
            doctor.setCustomCommissionRateOnline(dto.getCustomCommissionRateOnline());
            doctor.setCustomCommissionRateOnlineEffectiveFrom(dto.getEffectiveFromOnline());
            doctor.setCustomCommissionRateOnlineEffectiveTo(dto.getEffectiveToOnline());

            // Update Offline rate
            doctor.setCustomCommissionRateOffline(dto.getCustomCommissionRateOffline());
            doctor.setCustomCommissionRateOfflineEffectiveFrom(dto.getEffectiveFromOffline());
            doctor.setCustomCommissionRateOfflineEffectiveTo(dto.getEffectiveToOffline());

            doctorRepo.save(doctor);

            // Log the change
            if (adminUserId != null) {
                Map<String, Object> newRates = new HashMap<>();
                newRates.put("customCommissionRateOnline", dto.getCustomCommissionRateOnline());
                newRates.put("customCommissionRateOffline", dto.getCustomCommissionRateOffline());
                newRates.put("effectiveFromOnline", dto.getEffectiveFromOnline());
                newRates.put("effectiveToOnline", dto.getEffectiveToOnline());
                newRates.put("effectiveFromOffline", dto.getEffectiveFromOffline());
                newRates.put("effectiveToOffline", dto.getEffectiveToOffline());

                auditLogService.logPartnerCommissionChange(
                    adminUserId,
                    partnerType,
                    partnerId,
                    doctor.getFullName(),
                    oldRates,
                    newRates,
                    dto.getReason()
                );
            }

            return toDoctorCommissionDto(doctor, now);
        } else if ("PHARMACY".equalsIgnoreCase(partnerType)) {
            Pharmacy pharmacy = pharmacyRepo.findById(partnerId)
                .orElseThrow(() -> new RuntimeException("Pharmacy not found: " + partnerId));

            // Capture old values for audit log
            Map<String, Object> oldRates = new HashMap<>();
            oldRates.put("customCommissionRate", pharmacy.getCustomCommissionRate());
            oldRates.put("effectiveFrom", pharmacy.getCustomCommissionRateEffectiveFrom());
            oldRates.put("effectiveTo", pharmacy.getCustomCommissionRateEffectiveTo());

            pharmacy.setCustomCommissionRate(dto.getCustomCommissionRate());
            pharmacy.setCustomCommissionRateEffectiveFrom(dto.getEffectiveFrom());
            pharmacy.setCustomCommissionRateEffectiveTo(dto.getEffectiveTo());
            pharmacyRepo.save(pharmacy);

            // Log the change
            if (adminUserId != null) {
                Map<String, Object> newRates = new HashMap<>();
                newRates.put("customCommissionRate", dto.getCustomCommissionRate());
                newRates.put("effectiveFrom", dto.getEffectiveFrom());
                newRates.put("effectiveTo", dto.getEffectiveTo());

                auditLogService.logPartnerCommissionChange(
                    adminUserId,
                    partnerType,
                    partnerId,
                    pharmacy.getName(),
                    oldRates,
                    newRates,
                    dto.getReason()
                );
            }

            return toPharmacyCommissionDto(pharmacy, now);
        }

        throw new RuntimeException("Invalid partner type: " + partnerType);
    }

    @Override
    public void removePartnerCustomCommission(String partnerType, String partnerId) {
        removePartnerCustomCommission(partnerType, partnerId, null, null);
    }

    @Override
    public void removePartnerCustomCommission(String partnerType, String partnerId, String adminUserId) {
        removePartnerCustomCommission(partnerType, partnerId, adminUserId, null);
    }

    @Override
    public void removePartnerCustomCommission(String partnerType, String partnerId, String adminUserId, String reason) {
        if ("DOCTOR".equalsIgnoreCase(partnerType)) {
            Doctor doctor = doctorRepo.findById(partnerId)
                .orElseThrow(() -> new RuntimeException("Doctor not found: " + partnerId));

            // Capture old values for audit log
            Map<String, Object> oldRates = new HashMap<>();
            oldRates.put("customCommissionRateOnline", doctor.getCustomCommissionRateOnline());
            oldRates.put("customCommissionRateOffline", doctor.getCustomCommissionRateOffline());
            oldRates.put("effectiveFromOnline", doctor.getCustomCommissionRateOnlineEffectiveFrom());
            oldRates.put("effectiveToOnline", doctor.getCustomCommissionRateOnlineEffectiveTo());
            oldRates.put("effectiveFromOffline", doctor.getCustomCommissionRateOfflineEffectiveFrom());
            oldRates.put("effectiveToOffline", doctor.getCustomCommissionRateOfflineEffectiveTo());

            // Remove Online rate
            doctor.setCustomCommissionRateOnline(null);
            doctor.setCustomCommissionRateOnlineEffectiveFrom(null);
            doctor.setCustomCommissionRateOnlineEffectiveTo(null);
            // Remove Offline rate
            doctor.setCustomCommissionRateOffline(null);
            doctor.setCustomCommissionRateOfflineEffectiveFrom(null);
            doctor.setCustomCommissionRateOfflineEffectiveTo(null);
            doctorRepo.save(doctor);

            // Log the reset
            if (adminUserId != null) {
                auditLogService.logPartnerCommissionReset(
                    adminUserId,
                    partnerType,
                    partnerId,
                    doctor.getFullName(),
                    oldRates,
                    reason
                );
            }
        } else if ("PHARMACY".equalsIgnoreCase(partnerType)) {
            Pharmacy pharmacy = pharmacyRepo.findById(partnerId)
                .orElseThrow(() -> new RuntimeException("Pharmacy not found: " + partnerId));

            // Capture old values for audit log
            Map<String, Object> oldRates = new HashMap<>();
            oldRates.put("customCommissionRate", pharmacy.getCustomCommissionRate());
            oldRates.put("effectiveFrom", pharmacy.getCustomCommissionRateEffectiveFrom());
            oldRates.put("effectiveTo", pharmacy.getCustomCommissionRateEffectiveTo());

            pharmacy.setCustomCommissionRate(null);
            pharmacy.setCustomCommissionRateEffectiveFrom(null);
            pharmacy.setCustomCommissionRateEffectiveTo(null);
            pharmacyRepo.save(pharmacy);

            // Log the reset
            if (adminUserId != null) {
                auditLogService.logPartnerCommissionReset(
                    adminUserId,
                    partnerType,
                    partnerId,
                    pharmacy.getName(),
                    oldRates,
                    reason
                );
            }
        } else {
            throw new RuntimeException("Invalid partner type: " + partnerType);
        }
    }

    private AdminPartnerCommissionDto toDoctorCommissionDto(Doctor doctor, LocalDateTime now) {
        // Check Online rate validity
        boolean usingCustomRateOnline = doctor.getCustomCommissionRateOnline() != null &&
            isCustomRateValid(
                doctor.getCustomCommissionRateOnlineEffectiveFrom(),
                doctor.getCustomCommissionRateOnlineEffectiveTo(),
                now
            );

        // Check Offline rate validity
        boolean usingCustomRateOffline = doctor.getCustomCommissionRateOffline() != null &&
            isCustomRateValid(
                doctor.getCustomCommissionRateOfflineEffectiveFrom(),
                doctor.getCustomCommissionRateOfflineEffectiveTo(),
                now
            );

        BigDecimal effectiveOnlineRate = resolveEffectiveDoctorRate(doctor, "CONSULTATION_ONLINE", now);
        BigDecimal effectiveOfflineRate = resolveEffectiveDoctorRate(doctor, "CONSULTATION_HOME_VISIT", now);

        String doctorId = doctor.getDoctorId();

        // Financial summary — computed live from real Appointments (not the CommissionTransactions
        // ledger, which nothing populates outside seed data; see AdminCommissionServiceImpl history).
        PartnerFinancials financials = computeDoctorFinancials(doctorId);

        // Online appointment statistics
        Integer onlinePendingCount = adminAppointmentRepo.countByDoctorAndStatusAndType(doctorId, PENDING_STATUSES, ONLINE_TYPES);
        BigDecimal onlinePendingAmount = adminAppointmentRepo.sumFeeByDoctorAndStatusAndType(doctorId, PENDING_STATUSES, ONLINE_TYPES);
        Integer onlineCompletedCount = adminAppointmentRepo.countByDoctorAndStatusAndType(doctorId, COMPLETED_STATUSES, ONLINE_TYPES);
        BigDecimal onlineCompletedAmount = adminAppointmentRepo.sumFeeByDoctorAndStatusAndType(doctorId, COMPLETED_STATUSES, ONLINE_TYPES);
        Integer onlineCancelledCount = adminAppointmentRepo.countByDoctorAndStatusAndType(doctorId, CANCELLED_STATUSES, ONLINE_TYPES);
        BigDecimal onlineCancelledAmount = adminAppointmentRepo.sumFeeByDoctorAndStatusAndType(doctorId, CANCELLED_STATUSES, ONLINE_TYPES);

        // Offline appointment statistics
        Integer offlinePendingCount = adminAppointmentRepo.countByDoctorAndStatusAndType(doctorId, PENDING_STATUSES, OFFLINE_TYPES);
        BigDecimal offlinePendingAmount = adminAppointmentRepo.sumFeeByDoctorAndStatusAndType(doctorId, PENDING_STATUSES, OFFLINE_TYPES);
        Integer offlineCompletedCount = adminAppointmentRepo.countByDoctorAndStatusAndType(doctorId, COMPLETED_STATUSES, OFFLINE_TYPES);
        BigDecimal offlineCompletedAmount = adminAppointmentRepo.sumFeeByDoctorAndStatusAndType(doctorId, COMPLETED_STATUSES, OFFLINE_TYPES);
        Integer offlineCancelledCount = adminAppointmentRepo.countByDoctorAndStatusAndType(doctorId, CANCELLED_STATUSES, OFFLINE_TYPES);
        BigDecimal offlineCancelledAmount = adminAppointmentRepo.sumFeeByDoctorAndStatusAndType(doctorId, CANCELLED_STATUSES, OFFLINE_TYPES);

        return AdminPartnerCommissionDto.builder()
            .partnerId(doctor.getDoctorId())
            .partnerName(doctor.getFullName())
            .partnerType("DOCTOR")
            .avatarUrl(doctor.getAvatarUrl())
            .specialty(doctor.getSpecialty())
            .location(doctor.getLocation())
            // Online commission
            .customCommissionRateOnline(doctor.getCustomCommissionRateOnline())
            .customCommissionRateOnlineEffectiveFrom(doctor.getCustomCommissionRateOnlineEffectiveFrom())
            .customCommissionRateOnlineEffectiveTo(doctor.getCustomCommissionRateOnlineEffectiveTo())
            .effectiveCommissionRateOnline(effectiveOnlineRate)
            .usingCustomRateOnline(usingCustomRateOnline)
            // Offline commission
            .customCommissionRateOffline(doctor.getCustomCommissionRateOffline())
            .customCommissionRateOfflineEffectiveFrom(doctor.getCustomCommissionRateOfflineEffectiveFrom())
            .customCommissionRateOfflineEffectiveTo(doctor.getCustomCommissionRateOfflineEffectiveTo())
            .effectiveCommissionRateOffline(effectiveOfflineRate)
            .usingCustomRateOffline(usingCustomRateOffline)
            // Financial
            .totalEarnings(financials.netEarnings)
            .pendingSettlement(financials.pendingSettlement)
            .totalCommissionPaid(financials.commissionAmount)
            .totalGrossRevenue(financials.grossRevenue)
            // Online appointment breakdown
            .onlinePendingAmount(onlinePendingAmount)
            .onlinePendingCount(onlinePendingCount != null ? onlinePendingCount : 0)
            .onlineCompletedAmount(onlineCompletedAmount)
            .onlineCompletedCount(onlineCompletedCount != null ? onlineCompletedCount : 0)
            .onlineCancelledAmount(onlineCancelledAmount)
            .onlineCancelledCount(onlineCancelledCount != null ? onlineCancelledCount : 0)
            // Offline appointment breakdown
            .offlinePendingAmount(offlinePendingAmount)
            .offlinePendingCount(offlinePendingCount != null ? offlinePendingCount : 0)
            .offlineCompletedAmount(offlineCompletedAmount)
            .offlineCompletedCount(offlineCompletedCount != null ? offlineCompletedCount : 0)
            .offlineCancelledAmount(offlineCancelledAmount)
            .offlineCancelledCount(offlineCancelledCount != null ? offlineCancelledCount : 0)
            // Status
            .verified(doctor.isVerified())
            .active(doctor.getUser() != null && "Active".equalsIgnoreCase(doctor.getUser().getStatus()))
            .commissionTier(doctor.getCommissionTier())
            .bankAccount(doctor.getBankAccount())
            .bankName(doctor.getBankName())
            .paypalEmail(doctor.getPaypalEmail())
            .build();
    }

    private AdminPartnerCommissionDto toPharmacyCommissionDto(Pharmacy pharmacy, LocalDateTime now) {
        boolean usingCustomRate = pharmacy.getCustomCommissionRate() != null &&
            isCustomRateValid(
                pharmacy.getCustomCommissionRateEffectiveFrom(),
                pharmacy.getCustomCommissionRateEffectiveTo(),
                now
            );

        BigDecimal effectiveRate = resolveEffectivePharmacyRate(pharmacy, now);

        String pharmacyId = pharmacy.getPharmacyId();

        // Financial summary — computed live from real PharmacyOrders (not the CommissionTransactions
        // ledger, which nothing populates outside seed data; see AdminCommissionServiceImpl history).
        PartnerFinancials financials = computePharmacyFinancials(pharmacyId);

        // Pharmacy order statistics
        Integer pharmacyPendingCount = pharmacyOrderRepo.countByPharmacyAndStatuses(pharmacyId, PHARMACY_PENDING_STATUSES);
        BigDecimal pharmacyPendingAmount = pharmacyOrderRepo.sumTotalAmountByPharmacyAndStatuses(pharmacyId, PHARMACY_PENDING_STATUSES);
        Integer pharmacyCompletedCount = pharmacyOrderRepo.countByPharmacyAndStatuses(pharmacyId, PHARMACY_COMPLETED_STATUSES);
        BigDecimal pharmacyCompletedAmount = pharmacyOrderRepo.sumTotalAmountByPharmacyAndStatuses(pharmacyId, PHARMACY_COMPLETED_STATUSES);
        Integer pharmacyCancelledCount = pharmacyOrderRepo.countByPharmacyAndStatuses(pharmacyId, PHARMACY_CANCELLED_STATUSES);
        BigDecimal pharmacyCancelledAmount = pharmacyOrderRepo.sumTotalAmountByPharmacyAndStatuses(pharmacyId, PHARMACY_CANCELLED_STATUSES);

        return AdminPartnerCommissionDto.builder()
            .partnerId(pharmacy.getPharmacyId())
            .partnerName(pharmacy.getName())
            .partnerType("PHARMACY")
            .avatarUrl(pharmacy.getAvatarUrl())
            .specialty(null)
            .location(pharmacy.getCity() != null ? pharmacy.getCity() : pharmacy.getAddress())
            .customCommissionRate(pharmacy.getCustomCommissionRate())
            .customCommissionRateEffectiveFrom(pharmacy.getCustomCommissionRateEffectiveFrom())
            .customCommissionRateEffectiveTo(pharmacy.getCustomCommissionRateEffectiveTo())
            .effectiveCommissionRate(effectiveRate)
            .usingCustomRate(usingCustomRate)
            .totalEarnings(financials.netEarnings)
            .pendingSettlement(financials.pendingSettlement)
            .totalCommissionPaid(financials.commissionAmount)
            .totalGrossRevenue(financials.grossRevenue)
            // Pharmacy order breakdown
            .pharmacyPendingAmount(pharmacyPendingAmount)
            .pharmacyPendingCount(pharmacyPendingCount != null ? pharmacyPendingCount : 0)
            .pharmacyCompletedAmount(pharmacyCompletedAmount)
            .pharmacyCompletedCount(pharmacyCompletedCount != null ? pharmacyCompletedCount : 0)
            .pharmacyCancelledAmount(pharmacyCancelledAmount)
            .pharmacyCancelledCount(pharmacyCancelledCount != null ? pharmacyCancelledCount : 0)
            // Status
            .verified(pharmacy.isVerified())
            .active(pharmacy.isActive())
            .commissionTier(pharmacy.getCommissionTier())
            .bankAccount(pharmacy.getBankAccount())
            .bankName(pharmacy.getBankName())
            .paypalEmail(pharmacy.getPaypalEmail())
            .build();
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
        return "STL-" + LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss-SSSSSS"));
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

    private AdminCommissionConfigDto toConfigDto(CommissionConfig config) {
        return AdminCommissionConfigDto.builder()
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

    private AdminCommissionTransactionDto toTransactionDto(CommissionTransaction tx) {
        String patientId = null;
        String patientName = null;
        String appointmentStatus = null;

        // Get patient info from Appointment or PharmacyOrder
        if ("APPOINTMENT".equals(tx.getSourceType()) && tx.getAppointmentId() != null) {
            appointmentRepo.findById(tx.getAppointmentId()).ifPresent(appointment -> {
                // Can't assign to local variables in lambda, so we use a different approach
            });
            var appointmentOpt = appointmentRepo.findById(tx.getAppointmentId());
            if (appointmentOpt.isPresent()) {
                Appointment appointment = appointmentOpt.get();
                if (appointment.getPatient() != null) {
                    patientId = appointment.getPatient().getPatientId();
                    patientName = appointment.getPatient().getFullName();
                }
                appointmentStatus = appointment.getStatus();
            }
        } else if ("PHARMACY_ORDER".equals(tx.getSourceType()) && tx.getPharmacyOrderId() != null) {
            var orderOpt = pharmacyOrderRepo.findById(tx.getPharmacyOrderId());
            if (orderOpt.isPresent()) {
                PharmacyOrder order = orderOpt.get();
                if (order.getPatient() != null) {
                    patientId = order.getPatient().getPatientId();
                    patientName = order.getPatient().getFullName();
                }
                appointmentStatus = order.getStatus();
            }
        }

        return AdminCommissionTransactionDto.builder()
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
            .patientId(patientId)
            .patientName(patientName)
            .appointmentStatus(appointmentStatus)
            .build();
    }

    private AdminSettlementDto toSettlementDto(Settlement settlement) {
        return AdminSettlementDto.builder()
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

    private Pageable buildPageable(AdminCommissionFilterDto filter) {
        int page = filter.getPage() == null ? 0 : filter.getPage();
        int size = filter.getSize() == null ? 20 : filter.getSize();
        String sortBy = filter.getSortBy() == null || filter.getSortBy().isBlank() ? "createdAt" : filter.getSortBy();
        Sort.Direction direction = "asc".equalsIgnoreCase(filter.getSortDir()) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return PageRequest.of(page, size, Sort.by(direction, sortBy));
    }

    private List<AdminMonthlyCommissionDto> fillMonthNames(List<AdminMonthlyCommissionDto> rows) {
        for (AdminMonthlyCommissionDto item : rows) {
            item.setMonthName(item.getMonth() == null ? "" : LocalDate.of(item.getYear(), item.getMonth(), 1)
                .getMonth().name().substring(0, 3));
        }
        return rows;
    }
}
