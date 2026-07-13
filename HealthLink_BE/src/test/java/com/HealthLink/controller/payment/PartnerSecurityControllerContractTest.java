package com.HealthLink.controller.payment;

import com.HealthLink.dto.payment.PartnerPinOtpVerificationRequest;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

class PartnerSecurityControllerContractTest {

    @Test
    void exposesAuthenticatedPartnerOtpVerificationEndpoint() throws Exception {
        Method method = PartnerSecurityController.class.getDeclaredMethod(
                "verifyOtp", PartnerPinOtpVerificationRequest.class, UserDetails.class);

        PostMapping mapping = method.getAnnotation(PostMapping.class);
        assertThat(mapping).isNotNull();
        assertThat(mapping.value()).containsExactly("/verify-otp");
        assertThat(PartnerSecurityController.class.getAnnotation(PreAuthorize.class).value())
                .contains("DOCTOR", "PHARMACY");
    }
}
