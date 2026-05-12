package com.HealthLink.service.commission;

import com.HealthLink.dto.commission.*;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.PharmacyOrder;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.util.List;

public interface CommissionService {

    List<CommissionConfigDto> getAllConfigs();
    CommissionConfigDto getConfigById(Integer id);
    CommissionConfigDto getActiveConfig(String serviceType);
    CommissionConfigDto updateConfig(Integer id, CommissionConfigUpdateDto dto);

    CommissionTransactionDto calculateAndRecordAppointment(Appointment appointment);
    CommissionTransactionDto calculateAndRecordPharmacyOrder(PharmacyOrder order);

    Page<CommissionTransactionDto> getTransactions(CommissionFilterDto filter);
    CommissionTransactionDto getTransactionById(Integer id);
    List<CommissionTransactionDto> getPendingTransactionsByRecipient(String type, String id);

    Page<SettlementDto> getSettlements(CommissionFilterDto filter);
    SettlementDto getSettlementById(Integer id);
    SettlementDto createSettlement(SettlementCreateDto dto);
    SettlementDto processSettlement(SettlementProcessDto dto);
    List<SettlementDto> getSettlementsByRecipient(String type, String id);

    CommissionDashboardDto getDashboard();
    List<RecipientSummaryDto> getRecipientSummaries(String type, int limit);

    BigDecimal getCommissionRate(String serviceType, String recipientId, String recipientType);
}
