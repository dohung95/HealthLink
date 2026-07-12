package com.HealthLink.service.impl.payment;

import com.HealthLink.dto.payment.PartnerPinUpdateRequest;
import com.HealthLink.entity.EmailVerificationToken;
import com.HealthLink.entity.PartnerWithdrawalCredential;
import com.HealthLink.entity.TokenType;
import com.HealthLink.entity.User;
import com.HealthLink.exception.PartnerPinException;
import com.HealthLink.repository.auth.EmailVerificationTokenRepository;
import com.HealthLink.repository.payment.PartnerWithdrawalCredentialRepository;
import com.HealthLink.service.email.EmailService;
import com.HealthLink.service.payment.PartnerWithdrawalSecurityService.PinPolicy;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PartnerWithdrawalSecurityServiceImplTest {

    @Mock PartnerWithdrawalCredentialRepository credentialRepository;
    @Mock EmailVerificationTokenRepository tokenRepository;
    @Mock EmailService emailService;
    @Mock PasswordEncoder passwordEncoder;

    private PartnerWithdrawalSecurityServiceImpl service() {
        return new PartnerWithdrawalSecurityServiceImpl(credentialRepository, tokenRepository, emailService, passwordEncoder);
    }

    @Test
    void setPin_requiresExactSixDigitsAndMatchingConfirmation() {
        User user = user();
        assertThatThrownBy(() -> service().setPin(user, new PartnerPinUpdateRequest("123456", "12345", "12345")))
                .isInstanceOf(PartnerPinException.class).hasMessageContaining("6 digits");
        assertThatThrownBy(() -> service().setPin(user, new PartnerPinUpdateRequest("123456", "123456", "654321")))
                .isInstanceOf(PartnerPinException.class).hasMessageContaining("confirmation");
        verifyNoInteractions(credentialRepository);
    }

    @Test
    void requestOtp_replacesActiveTokenAndUsesWithdrawalType() {
        User user = user();
        EmailVerificationToken old = token(user, "111111", LocalDateTime.now().plusMinutes(1), false);
        when(tokenRepository.findByUserAndType(user, TokenType.WITHDRAWAL_PIN)).thenReturn(Optional.of(old));

        service().requestOtp(user);

        InOrder persistenceBeforeEmail = inOrder(tokenRepository, emailService);
        persistenceBeforeEmail.verify(tokenRepository).delete(old);
        persistenceBeforeEmail.verify(tokenRepository).saveAndFlush(argThat(token -> token.getType() == TokenType.WITHDRAWAL_PIN
                && token.getNewEmail().equals(user.getEmail())
                && token.getExpiryDate().isAfter(LocalDateTime.now().plusMinutes(4))));
        persistenceBeforeEmail.verify(emailService).sendSimpleMessage(
                eq(user.getEmail()), contains("Withdrawal PIN"), contains("expires in 5 minutes"));
    }

    @Test
    void requestOtp_doesNotSendEmailWhenTokenPersistenceFails() {
        User user = user();
        when(tokenRepository.findByUserAndType(user, TokenType.WITHDRAWAL_PIN)).thenReturn(Optional.empty());
        when(tokenRepository.saveAndFlush(any(EmailVerificationToken.class)))
                .thenThrow(new org.springframework.dao.DataIntegrityViolationException("token constraint"));

        assertThatThrownBy(() -> service().requestOtp(user))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);

        verifyNoInteractions(emailService);
    }

    @Test
    void setPin_hashesPinAndClearsExistingLockout() {
        User user = user();
        EmailVerificationToken token = token(user, "123456", LocalDateTime.now().plusMinutes(5), false);
        PartnerWithdrawalCredential credential = PartnerWithdrawalCredential.builder()
                .user(user).pinHash("old").failedAttempts(4).lockedUntil(LocalDateTime.now().plusMinutes(10)).build();
        when(tokenRepository.findByTokenAndUserAndType("123456", user, TokenType.WITHDRAWAL_PIN)).thenReturn(Optional.of(token));
        when(credentialRepository.findByUser(user)).thenReturn(Optional.of(credential));
        when(passwordEncoder.encode("654321")).thenReturn("pin-hash");

        service().setPin(user, new PartnerPinUpdateRequest("123456", "654321", "654321"));

        assertThat(credential.getPinHash()).isEqualTo("pin-hash");
        assertThat(credential.getFailedAttempts()).isZero();
        assertThat(credential.getLockedUntil()).isNull();
        verify(credentialRepository).save(credential);
        verify(tokenRepository).delete(token);
    }

    @Test
    void verifyForWithdrawal_locksForFifteenMinutesAfterFiveFailures() {
        User user = user();
        PartnerWithdrawalCredential credential = PartnerWithdrawalCredential.builder()
                .user(user).pinHash("hash").failedAttempts(4).build();
        when(credentialRepository.findByUser(user)).thenReturn(Optional.of(credential));
        when(passwordEncoder.matches("000000", "hash")).thenReturn(false);

        assertThatThrownBy(() -> service().verifyForWithdrawal(user, "000000", PinPolicy.REQUIRED))
                .isInstanceOf(PartnerPinException.class)
                .satisfies(error -> assertThat(((PartnerPinException) error).getLockedUntil()).isNotNull());
        assertThat(credential.getFailedAttempts()).isEqualTo(5);
        assertThat(credential.getLockedUntil()).isAfter(LocalDateTime.now().plusMinutes(14));
        verify(credentialRepository).save(credential);
    }

    @Test
    void verifyForWithdrawal_supportsDoctorRolloutAndResetsCorrectPin() {
        User user = user();
        service().verifyForWithdrawal(user, null, PinPolicy.REQUIRED_IF_CONFIGURED);

        PartnerWithdrawalCredential credential = PartnerWithdrawalCredential.builder()
                .user(user).pinHash("hash").failedAttempts(2).build();
        when(credentialRepository.findByUser(user)).thenReturn(Optional.of(credential));
        when(passwordEncoder.matches("654321", "hash")).thenReturn(true);
        service().verifyForWithdrawal(user, "654321", PinPolicy.REQUIRED_IF_CONFIGURED);

        assertThat(credential.getFailedAttempts()).isZero();
        assertThat(credential.getLockedUntil()).isNull();
        verify(credentialRepository).save(credential);
    }

    private User user() {
        return User.builder().id("partner-1").email("partner@test.com").username("Partner").build();
    }

    private EmailVerificationToken token(User user, String value, LocalDateTime expiry, boolean used) {
        return EmailVerificationToken.builder().user(user).token(value).newEmail(user.getEmail())
                .type(TokenType.WITHDRAWAL_PIN).expiryDate(expiry).used(used).build();
    }
}
