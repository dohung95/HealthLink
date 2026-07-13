package com.HealthLink.service.impl.payment;

import com.HealthLink.dto.payment.PartnerPinStatusResponse;
import com.HealthLink.dto.payment.PartnerPinUpdateRequest;
import com.HealthLink.entity.EmailVerificationToken;
import com.HealthLink.entity.PartnerWithdrawalCredential;
import com.HealthLink.entity.TokenType;
import com.HealthLink.entity.User;
import com.HealthLink.exception.PartnerPinException;
import com.HealthLink.repository.auth.EmailVerificationTokenRepository;
import com.HealthLink.repository.payment.PartnerWithdrawalCredentialRepository;
import com.HealthLink.service.email.EmailService;
import com.HealthLink.service.payment.PartnerWithdrawalSecurityService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PartnerWithdrawalSecurityServiceImpl implements PartnerWithdrawalSecurityService {
    private static final int MAX_ATTEMPTS = 5;
    private static final int OTP_COOLDOWN_SECONDS = 60;
    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final PartnerWithdrawalCredentialRepository credentialRepository;
    private final EmailVerificationTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public PartnerPinStatusResponse getStatus(User user) {
        Optional<PartnerWithdrawalCredential> credential = credentialRepository.findByUser(user);
        LocalDateTime lockedUntil = credential.map(PartnerWithdrawalCredential::getLockedUntil).orElse(null);
        boolean locked = lockedUntil != null && lockedUntil.isAfter(LocalDateTime.now());
        return PartnerPinStatusResponse.builder().configured(credential.isPresent()).locked(locked)
                .lockedUntil(locked ? lockedUntil : null).build();
    }

    @Override
    @Transactional
    public String requestOtp(User user) {
        entityManager.find(User.class, user.getId(), LockModeType.PESSIMISTIC_WRITE);
        Optional<EmailVerificationToken> existingToken = tokenRepository.findByUserAndType(user, TokenType.WITHDRAWAL_PIN);
        LocalDateTime now = LocalDateTime.now();
        if (existingToken.isPresent() && existingToken.get().getCreatedAt() != null) {
            LocalDateTime resendAt = existingToken.get().getCreatedAt().plusSeconds(OTP_COOLDOWN_SECONDS);
            if (resendAt.isAfter(now)) {
                long remainingMillis = Duration.between(now, resendAt).toMillis();
                int retryAfterSeconds = (int) Math.max(1, Math.ceil(remainingMillis / 1000.0));
                throw PartnerPinException.otpCooldown(retryAfterSeconds);
            }
        }
        existingToken.ifPresent(tokenRepository::delete);
        String otp = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        tokenRepository.saveAndFlush(EmailVerificationToken.builder().token(otp).user(user).newEmail(user.getEmail())
                .type(TokenType.WITHDRAWAL_PIN).expiryDate(now.plusMinutes(OTP_EXPIRY_MINUTES)).used(false)
                .failedAttempts(0).build());
        emailService.sendSimpleMessage(user.getEmail(), "Withdrawal PIN OTP",
                "Your OTP for withdrawal PIN security is: " + otp + "\n\nThis code expires in 5 minutes.");
        return "If the account is eligible, an OTP has been sent to the registered email";
    }

    @Override
    @Transactional(noRollbackFor = PartnerPinException.class)
    public void verifyOtp(User user, String otp) {
        entityManager.find(User.class, user.getId(), LockModeType.PESSIMISTIC_WRITE);
        validateOtp(user, otp);
    }

    @Override
    @Transactional(noRollbackFor = PartnerPinException.class)
    public void setPin(User user, PartnerPinUpdateRequest request) {
        entityManager.find(User.class, user.getId(), LockModeType.PESSIMISTIC_WRITE);
        if (request.getPin() == null || !request.getPin().matches("\\d{6}")) {
            throw PartnerPinException.badRequest("PIN must contain exactly 6 digits");
        }
        if (!request.getPin().equals(request.getConfirmPin())) {
            throw PartnerPinException.badRequest("PIN and confirmation do not match");
        }
        EmailVerificationToken token = validateOtp(user, request.getOtp());

        PartnerWithdrawalCredential credential = credentialRepository.findByUser(user)
                .orElseGet(() -> PartnerWithdrawalCredential.builder().user(user).build());
        credential.setPinHash(passwordEncoder.encode(request.getPin()));
        credential.setFailedAttempts(0);
        credential.setLockedUntil(null);
        credentialRepository.save(credential);
        tokenRepository.delete(token);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = PartnerPinException.class)
    public void verifyForWithdrawal(User user, String pin, PinPolicy policy) {
        entityManager.find(User.class, user.getId(), LockModeType.PESSIMISTIC_WRITE);
        Optional<PartnerWithdrawalCredential> optional = credentialRepository.findByUser(user);
        if (optional.isEmpty()) {
            if (policy == PinPolicy.REQUIRED) throw PartnerPinException.required();
            return;
        }
        PartnerWithdrawalCredential credential = optional.get();
        LocalDateTime now = LocalDateTime.now();
        if (credential.getLockedUntil() != null && credential.getLockedUntil().isAfter(now)) {
            throw PartnerPinException.locked(credential.getLockedUntil());
        }
        if (credential.getLockedUntil() != null) {
            credential.setLockedUntil(null);
            credential.setFailedAttempts(0);
        }
        if (pin == null || !pin.matches("\\d{6}")) throw PartnerPinException.required();
        if (!passwordEncoder.matches(pin, credential.getPinHash())) {
            int attempts = credential.getFailedAttempts() + 1;
            credential.setFailedAttempts(attempts);
            if (attempts >= MAX_ATTEMPTS) {
                credential.setLockedUntil(now.plusMinutes(15));
                credentialRepository.save(credential);
                throw PartnerPinException.locked(credential.getLockedUntil());
            }
            credentialRepository.save(credential);
            throw PartnerPinException.invalid(MAX_ATTEMPTS - attempts);
        }
        credential.setFailedAttempts(0);
        credential.setLockedUntil(null);
        credentialRepository.save(credential);
    }

    private EmailVerificationToken validateOtp(User user, String submittedOtp) {
        EmailVerificationToken token = tokenRepository.findByUserAndType(user, TokenType.WITHDRAWAL_PIN)
                .orElseThrow(PartnerPinException::otpInvalid);
        if (token.isExpired()) throw PartnerPinException.otpExpired();
        if (token.isUsed()) throw PartnerPinException.otpInvalid();
        if (token.getToken().equals(submittedOtp)) return token;

        int attempts = token.getFailedAttempts() + 1;
        token.setFailedAttempts(attempts);
        if (attempts >= MAX_ATTEMPTS) {
            token.setUsed(true);
            tokenRepository.save(token);
            throw PartnerPinException.otpAttemptsExceeded();
        }
        tokenRepository.save(token);
        throw PartnerPinException.otpInvalid();
    }
}
