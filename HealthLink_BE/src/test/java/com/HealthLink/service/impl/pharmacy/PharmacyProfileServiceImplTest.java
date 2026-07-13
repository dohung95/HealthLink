package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyProfileResponse;
import com.HealthLink.dto.auth.PharmacyPasswordOtpChangeRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.HealthLink.entity.EmailVerificationToken;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.TokenType;
import com.HealthLink.entity.User;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.auth.EmailVerificationTokenRepository;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.service.email.EmailService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PharmacyProfileServiceImplTest {

    @Mock
    private PharmacyRepository pharmacyRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private PharmacyProfileServiceImpl pharmacyProfileService;

    private Pharmacy pharmacy(String id, boolean active, boolean verified, boolean deliveryAvailable) {
        return Pharmacy.builder()
                .pharmacyId(id)
                .name("Pharmacy " + id)
                .active(active)
                .verified(verified)
                .isOnline(true)
                .deliveryAvailable(deliveryAvailable)
                .user(User.builder().id(id).email(id + "@test.com").build())
                .build();
    }

    @Test
    void getActiveVerifiedPharmacies_shouldReturnOnlyActiveAndVerified() {
        Pharmacy activeVerified = pharmacy("p1", true, true, false);
        Pharmacy inactive = pharmacy("p2", false, true, false);
        Pharmacy unverified = pharmacy("p3", true, false, false);
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrueAndIsOnlineTrue())
                .thenReturn(List.of(activeVerified));

        List<PharmacyProfileResponse> result = pharmacyProfileService.getActiveVerifiedPharmacies(false);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getPharmacyId()).isEqualTo("p1");
    }

    @Test
    void getActiveVerifiedPharmacies_withDeliveryOnly_shouldFilterByDelivery() {
        Pharmacy withDelivery = pharmacy("p1", true, true, true);
        Pharmacy noDelivery = pharmacy("p2", true, true, false);
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrueAndIsOnlineTrueAndDeliveryAvailableTrue())
                .thenReturn(List.of(withDelivery));

        List<PharmacyProfileResponse> result = pharmacyProfileService.getActiveVerifiedPharmacies(true);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getPharmacyId()).isEqualTo("p1");
        assertThat(result.get(0).isDeliveryAvailable()).isTrue();
    }

    @Test
    void getActiveVerifiedPharmacies_whenNone_shouldReturnEmpty() {
        List<PharmacyProfileResponse> result = pharmacyProfileService.getActiveVerifiedPharmacies(false);

        assertThat(result).isEmpty();
    }

    @Test
    void pharmacyProfileResponse_shouldSerializeOnlineStatusAsIsOnlineOnly() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        PharmacyProfileResponse response = PharmacyProfileResponse.builder()
                .pharmacyId("pharmacy-1")
                .name("Pharmacy pharmacy-1")
                .isOnline(true)
                .build();

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsString(response));

        assertThat(json.path("isOnline").asBoolean()).isTrue();
        assertThat(json.has("online")).isFalse();
    }

    @Test
    void requestPasswordChangeOtp_replacesActiveTokenAndEmailsRegisteredAddress() {
        User user = User.builder().id("p1").email("pharmacy@test.com").username("Pharmacy Owner").build();
        EmailVerificationToken previous = EmailVerificationToken.builder().user(user).token("111111")
                .newEmail(user.getEmail()).type(TokenType.PASSWORD_RESET).expiryDate(LocalDateTime.now().plusMinutes(1)).build();
        when(userRepository.findById("p1")).thenReturn(Optional.of(user));
        when(emailVerificationTokenRepository.findByUserAndType(user, TokenType.PASSWORD_RESET)).thenReturn(Optional.of(previous));

        String message = pharmacyProfileService.requestPasswordChangeOtp("p1");

        verify(emailVerificationTokenRepository).delete(previous);
        verify(emailVerificationTokenRepository).save(argThat(token -> token.getType() == TokenType.PASSWORD_RESET
                && token.getNewEmail().equals(user.getEmail())
                && token.getExpiryDate().isAfter(LocalDateTime.now().plusMinutes(4))));
        verify(emailService).sendSimpleMessage(eq(user.getEmail()), eq("Password Change OTP"), contains("expires in 5 minutes"));
        assertThat(message).isEqualTo("OTP sent to your registered email");
    }

    @Test
    void requestPasswordChangeOtp_propagatesEmailFailureForTransactionRollback() {
        User user = User.builder().id("p1").email("pharmacy@test.com").username("Pharmacy Owner").build();
        when(userRepository.findById("p1")).thenReturn(Optional.of(user));
        doThrow(new IllegalStateException("mail unavailable")).when(emailService)
                .sendSimpleMessage(eq(user.getEmail()), anyString(), anyString());

        assertThatThrownBy(() -> pharmacyProfileService.requestPasswordChangeOtp("p1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("mail unavailable");
        verify(emailVerificationTokenRepository).save(any(EmailVerificationToken.class));
    }

    @Test
    void changePasswordWithOtp_updatesPasswordDeletesTokenAndSendsSuccessEmail() {
        User user = User.builder().id("p1").email("pharmacy@test.com").username("Pharmacy Owner").password("old-hash").build();
        EmailVerificationToken token = passwordToken(user, "123456", LocalDateTime.now().plusMinutes(5), false);
        PharmacyPasswordOtpChangeRequest request = new PharmacyPasswordOtpChangeRequest("123456", "new-secret", "new-secret");
        when(userRepository.findById("p1")).thenReturn(Optional.of(user));
        when(emailVerificationTokenRepository.findByTokenAndUserAndType("123456", user, TokenType.PASSWORD_RESET))
                .thenReturn(Optional.of(token));
        when(passwordEncoder.encode("new-secret")).thenReturn("new-hash");
        when(pharmacyRepository.findById("p1")).thenReturn(Optional.of(pharmacy("p1", true, true, true)));

        pharmacyProfileService.changePasswordWithOtp("p1", request);

        assertThat(user.getPassword()).isEqualTo("new-hash");
        verify(userRepository).save(user);
        verify(emailVerificationTokenRepository).delete(token);
        verify(emailService).sendPasswordResetSuccessEmail(user.getEmail(), "Pharmacy p1");
    }

    @Test
    void changePasswordWithOtp_rejectsConfirmationMismatch() {
        PharmacyPasswordOtpChangeRequest request = new PharmacyPasswordOtpChangeRequest("123456", "new-secret", "different");

        assertThatThrownBy(() -> pharmacyProfileService.changePasswordWithOtp("p1", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("confirmation");
        verifyNoInteractions(userRepository, passwordEncoder);
    }

    @Test
    void changePasswordWithOtp_rejectsInvalidExpiredAndUsedTokens() {
        User user = User.builder().id("p1").email("pharmacy@test.com").build();
        PharmacyPasswordOtpChangeRequest request = new PharmacyPasswordOtpChangeRequest("123456", "new-secret", "new-secret");
        when(userRepository.findById("p1")).thenReturn(Optional.of(user));
        when(emailVerificationTokenRepository.findByTokenAndUserAndType("123456", user, TokenType.PASSWORD_RESET))
                .thenReturn(Optional.empty());
        assertThatThrownBy(() -> pharmacyProfileService.changePasswordWithOtp("p1", request))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("Invalid");

        EmailVerificationToken expired = passwordToken(user, "123456", LocalDateTime.now().minusSeconds(1), false);
        when(emailVerificationTokenRepository.findByTokenAndUserAndType("123456", user, TokenType.PASSWORD_RESET))
                .thenReturn(Optional.of(expired));
        assertThatThrownBy(() -> pharmacyProfileService.changePasswordWithOtp("p1", request))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("expired");

        EmailVerificationToken used = passwordToken(user, "123456", LocalDateTime.now().plusMinutes(5), true);
        when(emailVerificationTokenRepository.findByTokenAndUserAndType("123456", user, TokenType.PASSWORD_RESET))
                .thenReturn(Optional.of(used));
        assertThatThrownBy(() -> pharmacyProfileService.changePasswordWithOtp("p1", request))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("used");
    }

    private EmailVerificationToken passwordToken(User user, String value, LocalDateTime expiry, boolean used) {
        return EmailVerificationToken.builder().user(user).token(value).newEmail(user.getEmail())
                .type(TokenType.PASSWORD_RESET).expiryDate(expiry).used(used).build();
    }
}
