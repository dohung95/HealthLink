package com.HealthLink.service.payment;

import com.HealthLink.dto.payment.PartnerPinStatusResponse;
import com.HealthLink.dto.payment.PartnerPinUpdateRequest;
import com.HealthLink.entity.User;

public interface PartnerWithdrawalSecurityService {
    enum PinPolicy { REQUIRED, REQUIRED_IF_CONFIGURED }

    PartnerPinStatusResponse getStatus(User user);
    String requestOtp(User user);
    void verifyOtp(User user, String otp);
    void setPin(User user, PartnerPinUpdateRequest request);
    void verifyForWithdrawal(User user, String pin, PinPolicy policy);
}
