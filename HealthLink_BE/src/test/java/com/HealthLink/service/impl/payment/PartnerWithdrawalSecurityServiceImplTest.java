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
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.InOrder;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

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
    @Mock EntityManager entityManager;
    @InjectMocks PartnerWithdrawalSecurityServiceImpl service;

    private PartnerWithdrawalSecurityServiceImpl service() {
        return service;
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
    void requestOtp_replacesTokenAfterCooldownAndResetsAttempts() {
        User user = user();
        EmailVerificationToken old = token(user, "111111", LocalDateTime.now().plusMinutes(1), false);
        old.setCreatedAt(LocalDateTime.now().minusSeconds(61));
        when(tokenRepository.findByUserAndType(user, TokenType.WITHDRAWAL_PIN)).thenReturn(Optional.of(old));

        service().requestOtp(user);

        InOrder persistenceBeforeEmail = inOrder(tokenRepository, emailService);
        persistenceBeforeEmail.verify(tokenRepository).delete(old);
        persistenceBeforeEmail.verify(tokenRepository).saveAndFlush(argThat(token -> token.getType() == TokenType.WITHDRAWAL_PIN
                && token.getNewEmail().equals(user.getEmail())
                && token.getExpiryDate().isAfter(LocalDateTime.now().plusMinutes(4))
                && hasZeroFailedAttempts(token)));
        persistenceBeforeEmail.verify(emailService).sendSimpleMessage(
                eq(user.getEmail()), contains("Withdrawal PIN"), contains("expires in 5 minutes"));
    }

    @Test
    void requestOtp_locksUserRowBeforeLookingUpToken() {
        User user = user();
        when(tokenRepository.findByUserAndType(user, TokenType.WITHDRAWAL_PIN)).thenReturn(Optional.empty());

        service().requestOtp(user);

        InOrder lockBeforeTokenLookup = inOrder(entityManager, tokenRepository);
        lockBeforeTokenLookup.verify(entityManager).find(User.class, user.getId(), LockModeType.PESSIMISTIC_WRITE);
        lockBeforeTokenLookup.verify(tokenRepository).findByUserAndType(user, TokenType.WITHDRAWAL_PIN);
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
    void requestOtp_rejectsResendDuringCooldownWithoutDeletingOrEmailing() {
        User user = user();
        EmailVerificationToken active = token(user, "111111", LocalDateTime.now().plusMinutes(5), false);
        active.setCreatedAt(LocalDateTime.now().minusSeconds(30));
        when(tokenRepository.findByUserAndType(user, TokenType.WITHDRAWAL_PIN)).thenReturn(Optional.of(active));

        assertThatThrownBy(() -> service().requestOtp(user))
                .isInstanceOf(PartnerPinException.class)
                .hasFieldOrPropertyWithValue("code", "PIN_OTP_COOLDOWN")
                .hasFieldOrProperty("retryAfterSeconds");

        verify(tokenRepository, never()).delete(any());
        verify(tokenRepository, never()).saveAndFlush(any());
        verifyNoInteractions(emailService);
    }

    @Test
    void verifyOtp_acceptsCurrentTokenWithoutConsumingIt() {
        User user = user();
        EmailVerificationToken token = token(user, "123456", LocalDateTime.now().plusMinutes(5), false);
        when(tokenRepository.findByUserAndType(user, TokenType.WITHDRAWAL_PIN)).thenReturn(Optional.of(token));

        service().verifyOtp(user, "123456");

        assertThat(token.isUsed()).isFalse();
        verify(tokenRepository, never()).save(any());
        verify(tokenRepository, never()).delete(any());
    }

    @Test
    void verifyOtp_locksUserRowBeforeLookingUpToken() {
        User user = user();
        EmailVerificationToken token = token(user, "123456", LocalDateTime.now().plusMinutes(5), false);
        when(tokenRepository.findByUserAndType(user, TokenType.WITHDRAWAL_PIN)).thenReturn(Optional.of(token));

        service().verifyOtp(user, "123456");

        InOrder lockBeforeTokenLookup = inOrder(entityManager, tokenRepository);
        lockBeforeTokenLookup.verify(entityManager).find(User.class, user.getId(), LockModeType.PESSIMISTIC_WRITE);
        lockBeforeTokenLookup.verify(tokenRepository).findByUserAndType(user, TokenType.WITHDRAWAL_PIN);
    }

    @Test
    void verifyOtp_invalidValueIncrementsAndPersistsAttempts() {
        User user = user();
        EmailVerificationToken token = token(user, "123456", LocalDateTime.now().plusMinutes(5), false);
        token.setFailedAttempts(2);
        when(tokenRepository.findByUserAndType(user, TokenType.WITHDRAWAL_PIN)).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service().verifyOtp(user, "999999"))
                .isInstanceOf(PartnerPinException.class)
                .hasFieldOrPropertyWithValue("code", "PIN_OTP_INVALID");

        assertThat(token.getFailedAttempts()).isEqualTo(3);
        verify(tokenRepository).save(token);
    }

    @Test
    void verifyOtp_fifthInvalidValueInvalidatesTokenAndReturnsAttemptsExceeded() {
        User user = user();
        EmailVerificationToken token = token(user, "123456", LocalDateTime.now().plusMinutes(5), false);
        token.setFailedAttempts(4);
        when(tokenRepository.findByUserAndType(user, TokenType.WITHDRAWAL_PIN)).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service().verifyOtp(user, "999999"))
                .isInstanceOf(PartnerPinException.class)
                .hasFieldOrPropertyWithValue("code", "PIN_OTP_ATTEMPTS_EXCEEDED");

        assertThat(token.getFailedAttempts()).isEqualTo(5);
        assertThat(token.isUsed()).isTrue();
        verify(tokenRepository).save(token);
    }

    @Test
    void verifyOtp_returnsExpiredCodeWithoutConsumingTheToken() {
        User user = user();
        EmailVerificationToken token = token(user, "123456", LocalDateTime.now().minusSeconds(1), false);
        when(tokenRepository.findByUserAndType(user, TokenType.WITHDRAWAL_PIN)).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service().verifyOtp(user, "123456"))
                .isInstanceOf(PartnerPinException.class)
                .hasFieldOrPropertyWithValue("code", "PIN_OTP_EXPIRED");

        assertThat(token.isUsed()).isFalse();
        verify(tokenRepository, never()).save(any());
    }

    @Test
    void setPin_independentlyRejectsAnUnknownOtpWithStableCode() {
        User user = user();

        assertThatThrownBy(() -> service().setPin(user, new PartnerPinUpdateRequest("123456", "654321", "654321")))
                .isInstanceOf(PartnerPinException.class)
                .hasFieldOrPropertyWithValue("code", "PIN_OTP_INVALID");

        verifyNoInteractions(credentialRepository);
    }

    @Test
    void setPin_locksUserRowBeforeLookingUpToken() {
        User user = user();
        EmailVerificationToken token = token(user, "123456", LocalDateTime.now().plusMinutes(5), false);
        lenient().when(tokenRepository.findByUserAndType(user, TokenType.WITHDRAWAL_PIN)).thenReturn(Optional.of(token));
        lenient().when(tokenRepository.findByTokenAndUserAndType("123456", user, TokenType.WITHDRAWAL_PIN))
                .thenReturn(Optional.of(token));
        when(credentialRepository.findByUser(user)).thenReturn(Optional.empty());
        when(passwordEncoder.encode("654321")).thenReturn("pin-hash");

        service().setPin(user, new PartnerPinUpdateRequest("123456", "654321", "654321"));

        InOrder lockBeforeTokenLookup = inOrder(entityManager, tokenRepository);
        lockBeforeTokenLookup.verify(entityManager).find(User.class, user.getId(), LockModeType.PESSIMISTIC_WRITE);
        lockBeforeTokenLookup.verify(tokenRepository).findByUserAndType(user, TokenType.WITHDRAWAL_PIN);
    }

    @Test
    void setPin_wrongOtpIncrementsAndPersistsAttempts() {
        User user = user();
        EmailVerificationToken token = token(user, "123456", LocalDateTime.now().plusMinutes(5), false);
        token.setFailedAttempts(2);
        lenient().when(tokenRepository.findByUserAndType(user, TokenType.WITHDRAWAL_PIN)).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service().setPin(
                user, new PartnerPinUpdateRequest("999999", "654321", "654321")))
                .isInstanceOf(PartnerPinException.class)
                .hasFieldOrPropertyWithValue("code", "PIN_OTP_INVALID");

        assertThat(token.getFailedAttempts()).isEqualTo(3);
        verify(tokenRepository).save(token);
        verifyNoInteractions(credentialRepository);
    }

    @Test
    void setPin_fifthWrongOtpInvalidatesToken() {
        User user = user();
        EmailVerificationToken token = token(user, "123456", LocalDateTime.now().plusMinutes(5), false);
        token.setFailedAttempts(4);
        lenient().when(tokenRepository.findByUserAndType(user, TokenType.WITHDRAWAL_PIN)).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service().setPin(
                user, new PartnerPinUpdateRequest("999999", "654321", "654321")))
                .isInstanceOf(PartnerPinException.class)
                .hasFieldOrPropertyWithValue("code", "PIN_OTP_ATTEMPTS_EXCEEDED");

        assertThat(token.getFailedAttempts()).isEqualTo(5);
        assertThat(token.isUsed()).isTrue();
        verify(tokenRepository).save(token);
        verifyNoInteractions(credentialRepository);
    }

    @Test
    void setPin_persistsOtpAttemptErrorsDespiteBusinessException() throws Exception {
        Transactional transaction = PartnerWithdrawalSecurityServiceImpl.class
                .getMethod("setPin", User.class, PartnerPinUpdateRequest.class)
                .getAnnotation(Transactional.class);

        assertThat(transaction).isNotNull();
        assertThat(transaction.noRollbackFor()).contains(PartnerPinException.class);
    }

    @Test
    void setPin_hashesPinAndClearsExistingLockout() {
        User user = user();
        EmailVerificationToken token = token(user, "123456", LocalDateTime.now().plusMinutes(5), false);
        PartnerWithdrawalCredential credential = PartnerWithdrawalCredential.builder()
                .user(user).pinHash("old").failedAttempts(4).lockedUntil(LocalDateTime.now().plusMinutes(10)).build();
        lenient().when(tokenRepository.findByUserAndType(user, TokenType.WITHDRAWAL_PIN)).thenReturn(Optional.of(token));
        lenient().when(tokenRepository.findByTokenAndUserAndType("123456", user, TokenType.WITHDRAWAL_PIN))
                .thenReturn(Optional.of(token));
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
    void verifyForWithdrawal_requiresNewTransactionAndPersistsPinErrors() throws Exception {
        Transactional transaction = PartnerWithdrawalSecurityServiceImpl.class
                .getMethod("verifyForWithdrawal", User.class, String.class, PinPolicy.class)
                .getAnnotation(Transactional.class);

        assertThat(transaction).isNotNull();
        assertThat(transaction.propagation()).isEqualTo(Propagation.REQUIRES_NEW);
        assertThat(transaction.noRollbackFor()).contains(PartnerPinException.class);
    }

    @Test
    void verifyForWithdrawal_locksUserRowBeforeCredentialLookup() {
        User user = user();
        PartnerWithdrawalCredential credential = PartnerWithdrawalCredential.builder()
                .user(user).pinHash("hash").build();
        when(credentialRepository.findByUser(user)).thenReturn(Optional.of(credential));
        when(passwordEncoder.matches("654321", "hash")).thenReturn(true);

        service().verifyForWithdrawal(user, "654321", PinPolicy.REQUIRED);

        InOrder lockBeforeCredentialLookup = inOrder(entityManager, credentialRepository);
        lockBeforeCredentialLookup.verify(entityManager)
                .find(User.class, user.getId(), LockModeType.PESSIMISTIC_WRITE);
        lockBeforeCredentialLookup.verify(credentialRepository).findByUser(user);
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

    private boolean hasZeroFailedAttempts(EmailVerificationToken token) {
        return token.getFailedAttempts() == 0;
    }
}
