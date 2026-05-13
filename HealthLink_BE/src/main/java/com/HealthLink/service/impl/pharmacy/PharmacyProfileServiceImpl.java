package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.auth.ChangeEmailRequest;
import com.HealthLink.dto.auth.VerifyEmailChangeRequest;
import com.HealthLink.dto.pharmacy.PharmacyProfileResponse;
import com.HealthLink.dto.pharmacy.PharmacyUpdateRequest;
import com.HealthLink.entity.EmailVerificationToken;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.User;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.auth.EmailVerificationTokenRepository;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.service.email.EmailService;
import com.HealthLink.service.pharmacy.PharmacyProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PharmacyProfileServiceImpl implements PharmacyProfileService {

    private final PharmacyRepository pharmacyRepository;
    private final UserRepository userRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    // =========================================================================
    // GET PROFILE
    // =========================================================================

    @Override
    public PharmacyProfileResponse getPharmacyProfile(String pharmacyId) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new ResourceNotFoundException("Pharmacy", "id", pharmacyId));
        return toResponse(pharmacy);
    }

    // =========================================================================
    // UPDATE PROFILE
    // =========================================================================

    @Override
    @Transactional
    public PharmacyProfileResponse updatePharmacyProfile(String pharmacyId, PharmacyUpdateRequest request) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new ResourceNotFoundException("Pharmacy", "id", pharmacyId));

        User user = userRepository.findById(pharmacyId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", pharmacyId));

        // Cập nhật thông tin trong bảng Users
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().trim().isEmpty()) {
            user.setPhoneNumber(request.getPhoneNumber());
        }

        // Cập nhật thông tin trong bảng Pharmacies
        if (request.getDescription() != null) {
            pharmacy.setDescription(request.getDescription());
        }
        if (request.getAvatarUrl() != null) {
            pharmacy.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getOpenTime() != null) {
            pharmacy.setOpenTime(request.getOpenTime());
        }
        if (request.getCloseTime() != null) {
            pharmacy.setCloseTime(request.getCloseTime());
        }
        if (request.getWorkingDays() != null && !request.getWorkingDays().trim().isEmpty()) {
            pharmacy.setWorkingDays(request.getWorkingDays());
        }
        if (request.getDeliveryFee() != null) {
            pharmacy.setDeliveryFee(request.getDeliveryFee());
        }
        if (request.getDeliveryRadius() != null) {
            pharmacy.setDeliveryRadius(request.getDeliveryRadius());
        }
        if (request.getDeliveryAvailable() != null) {
            pharmacy.setDeliveryAvailable(request.getDeliveryAvailable());
        }

        pharmacy.setUpdatedAt(LocalDateTime.now());

        userRepository.save(user);
        Pharmacy updated = pharmacyRepository.save(pharmacy);

        log.info("Pharmacy profile updated for pharmacyId: {}", pharmacyId);
        return toResponse(updated);
    }

    // =========================================================================
    // CHANGE EMAIL – STEP 1: Request (gửi OTP về email mới)
    // =========================================================================

    @Override
    @Transactional
    public String requestEmailChange(String pharmacyId, ChangeEmailRequest request) {
        User user = userRepository.findById(pharmacyId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", pharmacyId));

        // Xác minh mật khẩu hiện tại
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid password");
        }

        // Kiểm tra email mới chưa được dùng
        if (userRepository.findByEmail(request.getNewEmail()).isPresent()) {
            throw new BadRequestException("Email already in use");
        }

        // Xóa token cũ chưa dùng (nếu có)
        emailVerificationTokenRepository.findByUserAndUsedFalse(user)
                .ifPresent(emailVerificationTokenRepository::delete);

        // Tạo mã OTP 6 chữ số
        String verificationCode = generateVerificationCode();
        LocalDateTime expiryDate = LocalDateTime.now().plusHours(24);

        EmailVerificationToken token = EmailVerificationToken.builder()
                .token(verificationCode)
                .user(user)
                .newEmail(request.getNewEmail())
                .expiryDate(expiryDate)
                .used(false)
                .build();

        emailVerificationTokenRepository.save(token);

        // Lấy tên nhà thuốc để hiển thị trong email
        String displayName = pharmacyRepository.findById(pharmacyId)
                .map(Pharmacy::getName)
                .orElse(user.getUsername());

        emailService.sendVerificationEmail(request.getNewEmail(), displayName, verificationCode);

        log.info("Email change requested for pharmacyId: {} to: {}", pharmacyId, request.getNewEmail());
        return "Verification code sent to " + request.getNewEmail() + ". Please check your email.";
    }

    // =========================================================================
    // CHANGE EMAIL – STEP 2: Verify (xác nhận OTP)
    // =========================================================================

    @Override
    @Transactional
    public PharmacyProfileResponse verifyEmailChange(String pharmacyId, VerifyEmailChangeRequest request) {
        User user = userRepository.findById(pharmacyId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", pharmacyId));

        EmailVerificationToken token = emailVerificationTokenRepository
                .findByToken(request.getVerificationCode())
                .orElseThrow(() -> new BadRequestException("Invalid verification code"));

        if (token.isExpired()) {
            throw new BadRequestException("Verification code has expired");
        }
        if (token.isUsed()) {
            throw new BadRequestException("Verification code has already been used");
        }
        if (!token.getUser().getId().equals(pharmacyId)) {
            throw new BadRequestException("Verification code does not belong to this account");
        }
        if (!token.getNewEmail().equals(request.getNewEmail())) {
            throw new BadRequestException("Email does not match verification token");
        }

        // Cập nhật email
        user.setEmail(request.getNewEmail());
        user.setEmailConfirmed(true);
        userRepository.save(user);

        // Đánh dấu token đã dùng
        token.setUsed(true);
        emailVerificationTokenRepository.save(token);

        log.info("Email changed for pharmacyId: {} to: {}", pharmacyId, request.getNewEmail());

        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new ResourceNotFoundException("Pharmacy", "id", pharmacyId));
        return toResponse(pharmacy);
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private PharmacyProfileResponse toResponse(Pharmacy p) {
        User user = p.getUser();
        return PharmacyProfileResponse.builder()
                .pharmacyId(p.getPharmacyId())
                .name(p.getName())
                .email(user != null ? user.getEmail() : null)
                .phoneNumber(user != null ? user.getPhoneNumber() : p.getPhoneNumber())
                .avatarUrl(p.getAvatarUrl())
                .description(p.getDescription())
                .address(p.getAddress())
                .city(p.getCity())
                .district(p.getDistrict())
                .ward(p.getWard())
                .latitude(p.getLatitude())
                .longitude(p.getLongitude())
                .openTime(p.getOpenTime())
                .closeTime(p.getCloseTime())
                .open24Hours(p.isOpen24Hours())
                .workingDays(p.getWorkingDays())
                .deliveryAvailable(p.isDeliveryAvailable())
                .deliveryFee(p.getDeliveryFee())
                .deliveryRadius(p.getDeliveryRadius())
                .verified(p.isVerified())
                .active(p.isActive())
                .averageRating(p.getAverageRating())
                .totalReviews(p.getTotalReviews())
                .totalEarnings(p.getTotalEarnings())
                .pendingSettlement(p.getPendingSettlement())
                .commissionTier(p.getCommissionTier())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    /** Tạo mã OTP ngẫu nhiên 6 chữ số */
    private String generateVerificationCode() {
        return String.format("%06d", (int) (Math.random() * 1000000));
    }
}
