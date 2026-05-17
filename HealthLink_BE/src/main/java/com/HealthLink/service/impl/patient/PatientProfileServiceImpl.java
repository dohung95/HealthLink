package com.HealthLink.service.impl.patient;

import com.HealthLink.dto.auth.ChangeEmailRequest;
import com.HealthLink.dto.auth.ChangePasswordRequest;
import com.HealthLink.dto.auth.VerifyEmailChangeRequest;
import com.HealthLink.dto.patient.*;
import com.HealthLink.entity.EmailVerificationToken;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.User;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.auth.EmailVerificationTokenRepository;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.service.email.EmailService;
import com.HealthLink.service.patient.PatientProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class PatientProfileServiceImpl implements PatientProfileService {

    @org.springframework.beans.factory.annotation.Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @org.springframework.beans.factory.annotation.Value("${app.base-url:http://localhost:8096}")
    private String baseUrl;

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public PatientProfileDTO getPatientProfile(String userId) {
        Patient patient = patientRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "userId", userId));
        return toPatientProfileDTO(patient);
    }

    @Override
    @Transactional(readOnly = true)
    public PatientProfileDTO getPatientProfileById(String patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "id", patientId));
        return toPatientProfileDTO(patient);
    }

    @Override
    @Transactional
    public PatientProfileDTO updatePatientProfile(String userId, UpdatePatientProfileRequest request) {
        Patient patient = patientRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "userId", userId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Update user fields (only if provided)
        if (request.getUsername() != null && !request.getUsername().trim().isEmpty()) {
            user.setUsername(request.getUsername());
        }
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().trim().isEmpty()) {
            user.setPhoneNumber(request.getPhoneNumber());
        }

        // Update patient fields
        patient.setFullName(request.getFullName());
        if (request.getDateOfBirth() != null) {
            patient.setDateOfBirth(request.getDateOfBirth().atStartOfDay());
        }
        patient.setMedicalHistorySummary(request.getMedicalHistorySummary());
        patient.setInsuranceProvider(request.getInsuranceProvider());
        patient.setInsurancePolicyNumber(request.getInsurancePolicyNumber());
        patient.setGender(request.getGender());
        patient.setAddress(request.getAddress());
        patient.setCity(request.getCity());
        patient.setCountry(request.getCountry());
        patient.setBloodType(request.getBloodType());
        patient.setEmergencyContactName(request.getEmergencyContactName());
        patient.setEmergencyContactPhone(request.getEmergencyContactPhone());
        patient.setEmergencyContactRelationship(request.getEmergencyContactRelationship());
        patient.setPreferredLanguage(request.getPreferredLanguage());
        patient.setPreferredContactMethod(request.getPreferredContactMethod());
        patient.setOccupation(request.getOccupation());
        patient.setAvatarUrl(request.getAvatarUrl());
        patient.setAllergies(request.getAllergies());
        patient.setChronicConditions(request.getChronicConditions());
        patient.setCurrentMedications(request.getCurrentMedications());
        patient.setHeightCm(request.getHeightCm());
        patient.setWeightKg(request.getWeightKg());
        patient.setLatitude(request.getLatitude());
        patient.setLongitude(request.getLongitude());

        userRepository.save(user);
        patientRepository.save(patient);
        log.info("Patient profile updated for userId: {}", userId);
        return toPatientProfileDTO(patient);
    }

    @Override
    @Transactional
    public String requestEmailChange(String userId, ChangeEmailRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid password");
        }

        // Check if new email is already in use
        if (userRepository.findByEmail(request.getNewEmail()).isPresent()) {
            throw new BadRequestException("Email already in use");
        }

        // Delete existing unverified token if any
        emailVerificationTokenRepository.findByUserAndUsedFalse(user)
                .ifPresent(emailVerificationTokenRepository::delete);

        // Generate verification token (OTP-like: 6-digit code)
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

        // Send verification email
        emailService.sendVerificationEmail(request.getNewEmail(), user.getUsername(), verificationCode);

        log.info("Email change requested for userId: {} to email: {}", userId, request.getNewEmail());
        return "Verification code sent to " + request.getNewEmail() + ". Please check your email.";
    }

    @Override
    @Transactional
    public PatientProfileDTO verifyEmailChange(String userId, VerifyEmailChangeRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        EmailVerificationToken token = emailVerificationTokenRepository.findByToken(request.getVerificationCode())
                .orElseThrow(() -> new BadRequestException("Invalid verification code"));

        // Validate token
        if (token.isExpired()) {
            throw new BadRequestException("Verification code has expired");
        }

        if (token.isUsed()) {
            throw new BadRequestException("Verification code has already been used");
        }

        if (!token.getUser().getId().equals(userId)) {
            throw new BadRequestException("Verification code does not belong to this user");
        }

        if (!token.getNewEmail().equals(request.getNewEmail())) {
            throw new BadRequestException("Email does not match verification token");
        }

        // Update user email
        user.setEmail(request.getNewEmail());
        user.setEmailConfirmed(true);
        userRepository.save(user);

        // Mark token as used
        token.setUsed(true);
        emailVerificationTokenRepository.save(token);

        log.info("Email changed for userId: {} to: {}", userId, request.getNewEmail());

        // Get updated patient profile
        Patient patient = patientRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "userId", userId));
        return toPatientProfileDTO(patient);
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private PatientProfileDTO toPatientProfileDTO(Patient patient) {
        User user = patient.getUser();
        return PatientProfileDTO.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .createdDate(user.getCreatedDate())
                .fullName(patient.getFullName())
                .dateOfBirth(patient.getDateOfBirth())
                .medicalHistorySummary(patient.getMedicalHistorySummary())
                .insuranceProvider(patient.getInsuranceProvider())
                .insurancePolicyNumber(patient.getInsurancePolicyNumber())
                .gender(patient.getGender())
                .address(patient.getAddress())
                .city(patient.getCity())
                .country(patient.getCountry())
                .bloodType(patient.getBloodType())
                .emergencyContactName(patient.getEmergencyContactName())
                .emergencyContactPhone(patient.getEmergencyContactPhone())
                .emergencyContactRelationship(patient.getEmergencyContactRelationship())
                .preferredLanguage(patient.getPreferredLanguage())
                .preferredContactMethod(patient.getPreferredContactMethod())
                .occupation(patient.getOccupation())
                .avatarUrl(patient.getAvatarUrl())
                .allergies(patient.getAllergies())
                .chronicConditions(patient.getChronicConditions())
                .currentMedications(patient.getCurrentMedications())
                .heightCm(patient.getHeightCm())
                .weightKg(patient.getWeightKg())
                .latitude(patient.getLatitude())
                .longitude(patient.getLongitude())
                .build();
    }

    /**
     * Tạo mã xác nhận 6 chữ số
     */
    private String generateVerificationCode() {
        return String.format("%06d", (int) (Math.random() * 1000000));
    }

    /**
     * Đổi mật khẩu sau khi xác nhận bằng mật khẩu hiện tại.
     */
    @Override
    @Transactional
    public void changePassword(String userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Xác nhận mật khẩu hiện tại
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }

        // Kiểm tra xác nhận mật khẩu mới
        if (!request.getNewPassword().equals(request.getConfirmNewPassword())) {
            throw new BadRequestException("New password and confirmation do not match");
        }

        // Cập nhật mật khẩu
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        log.info("Password changed for userId: {}", userId);
    }

    @Override
    @Transactional
    public String uploadAvatar(String userId, org.springframework.web.multipart.MultipartFile file)
            throws IOException {
        // Validate
        if (file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("Only image files are allowed");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new BadRequestException("File size must be less than 5MB");
        }

        // Tạo thư mục nếu chưa tồn tại
        Path avatarDir = Paths.get(uploadDir, "avatars", "patients");
        Files.createDirectories(avatarDir);

        // Tên file độc nhất để tránh trùng lặp
        String original = file.getOriginalFilename();
        String ext = (original != null && original.contains("."))
                ? original.substring(original.lastIndexOf(".")) : ".jpg";
        String filename = UUID.randomUUID() + ext;

        // Ghi file xuống đĩa
        Files.write(avatarDir.resolve(filename), file.getBytes());

        // Tạo URL công khai
        String avatarUrl = baseUrl + "/uploads/avatars/patients/" + filename;

        // Cập nhật DB
        Patient patient = patientRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "userId", userId));
        patient.setAvatarUrl(avatarUrl);
        patientRepository.save(patient);

        log.info("Avatar uploaded for patient {}: {}", userId, avatarUrl);
        return avatarUrl;
    }

}
