package com.HealthLink.service.payment;

import com.HealthLink.entity.CommissionTransaction;
import com.HealthLink.entity.PartnerWalletEntry;
import com.HealthLink.entity.Settlement;
import com.HealthLink.entity.enums.PartnerWalletEntryStatus;

public interface PartnerWalletLedgerService {

    void recordPendingEarning(CommissionTransaction tx);

    void vestEarning(CommissionTransaction tx);

    void cancelPendingEarning(CommissionTransaction tx);

    void recordPatientRefund(CommissionTransaction tx, String previousStatus);

    PartnerWalletEntry createWithdrawal(Settlement settlement);

    PartnerWalletEntry updateWithdrawalStatus(Integer settlementId, PartnerWalletEntryStatus status);

    PartnerWalletEntry createReturn(Settlement settlement, String reason);
}
