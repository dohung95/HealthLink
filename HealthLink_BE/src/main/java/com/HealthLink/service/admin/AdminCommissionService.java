package com.HealthLink.service.admin;

import com.HealthLink.dto.commission.admin.*;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.PharmacyOrder;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.util.List;

public interface AdminCommissionService {

    List<AdminCommissionConfigDto> getAllConfigs();
    AdminCommissionConfigDto getConfigById(Integer id);
    AdminCommissionConfigDto getActiveConfig(String serviceType);
    AdminCommissionConfigDto updateConfig(Integer id, AdminCommissionConfigUpdateDto dto);
    AdminCommissionConfigDto updateConfig(Integer id, AdminCommissionConfigUpdateDto dto, String adminUserId);

    AdminCommissionTransactionDto calculateAndRecordAppointment(Appointment appointment);
    AdminCommissionTransactionDto calculateAndRecordPharmacyOrder(PharmacyOrder order);

    Page<AdminCommissionTransactionDto> getTransactions(AdminCommissionFilterDto filter);
    AdminCommissionTransactionDto getTransactionById(Integer id);
    List<AdminCommissionTransactionDto> getPendingTransactionsByRecipient(String type, String id);

    Page<AdminSettlementDto> getSettlements(AdminCommissionFilterDto filter);
    AdminSettlementDto getSettlementById(Integer id);
    AdminSettlementDto createSettlement(AdminSettlementCreateDto dto);
    AdminSettlementDto processSettlement(AdminSettlementProcessDto dto);
    List<AdminSettlementDto> getSettlementsByRecipient(String type, String id);

    AdminCommissionDashboardDto getDashboard();
    List<AdminMonthlyCommissionDto> getDashboardMonthly(int year);
    List<AdminRecipientSummaryDto> getRecipientSummaries(String type, int limit);

    AdminPartnerCommissionHistoryDto getPartnerCommissionHistory(String partnerType, String partnerId);

    BigDecimal getCommissionRate(String serviceType, String recipientId, String recipientType);

    // Partner commission management
    Page<AdminPartnerCommissionDto> getPartnerCommissions(String partnerType, String searchTerm, int page, int size);
    AdminPartnerCommissionDto getPartnerCommission(String partnerType, String partnerId);
    AdminPartnerCommissionDto updatePartnerCommission(String partnerType, String partnerId, AdminPartnerCommissionUpdateDto dto);
    AdminPartnerCommissionDto updatePartnerCommission(String partnerType, String partnerId, AdminPartnerCommissionUpdateDto dto, String adminUserId);
    void removePartnerCustomCommission(String partnerType, String partnerId);
    void removePartnerCustomCommission(String partnerType, String partnerId, String adminUserId);
    void removePartnerCustomCommission(String partnerType, String partnerId, String adminUserId, String reason);
}
