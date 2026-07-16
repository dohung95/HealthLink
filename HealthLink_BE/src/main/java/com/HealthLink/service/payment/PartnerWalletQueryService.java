package com.HealthLink.service.payment;

import com.HealthLink.dto.payment.PartnerWalletEntryFilter;
import com.HealthLink.dto.payment.PartnerWalletEntryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PartnerWalletQueryService {

    Page<PartnerWalletEntryResponse> getWalletEntries(
            String partnerId, PartnerWalletEntryFilter filter, Pageable pageable);
}
