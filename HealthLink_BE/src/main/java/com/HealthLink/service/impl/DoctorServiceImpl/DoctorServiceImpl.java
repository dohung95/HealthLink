package com.HealthLink.service.impl.DoctorServiceImpl;

import com.HealthLink.dto.doctor.DoctorUpdateRequest;
import com.HealthLink.dto.auth.ChangeEmailRequest;
import com.HealthLink.dto.auth.VerifyEmailChangeRequest;
import com.HealthLink.dto.response.DoctorProfileResponse;
import com.HealthLink.dto.response.DoctorResponse;
import com.HealthLink.dto.response.DoctorScheduleResponse;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.entity.User;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.auth.EmailVerificationTokenRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.service.doctor.DoctorService;
import com.HealthLink.service.email.EmailService;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.HealthLink.entity.EmailVerificationToken;
import com.HealthLink.exception.BadRequestException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import com.HealthLink.dto.response.PagedResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DoctorServiceImpl implements DoctorService {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${app.base-url:http://localhost:8096}")
    private String baseUrl;

    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final UserRepository userRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    private static final String[] DAY_NAMES
            = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};

    // Lấy danh sách bác sĩ, lọc theo tên hoặc chuyên khoa (param có thể null để bỏ qua lọc)
    @Override
    public List<DoctorResponse> getAllDoctors(String specialty, String name) {
        String specialtyFilter = (specialty != null && specialty.isBlank()) ? null : specialty;
        String nameFilter = (name != null && name.isBlank()) ? null : name;

        return doctorRepository.findByFilters(specialtyFilter, nameFilter)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Lấy danh sách lịch làm việc của bác sĩ
    @Override
    public List<DoctorScheduleResponse> getDoctorSchedules(String doctorId) {
        doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                "Not found doctor with ID: " + doctorId));

        return scheduleRepository.findByDoctor_DoctorId(doctorId)
                .stream()
                .map(this::toScheduleResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy hồ sơ đầy đủ của bác sĩ bao gồm thông tin thu nhập/chiết khấu. Chỉ
     * dành cho chính bác sĩ đó hoặc Admin.
     */
    @Override
    public DoctorProfileResponse getDoctorProfile(String doctorId) {
        Doctor d = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                "Not found doctor with ID: " + doctorId));

        return buildDoctorProfileResponse(d);
    }

    @Override
    @Transactional
    public DoctorProfileResponse updateDoctorProfile(String doctorId, DoctorUpdateRequest updateRequest) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                "Not found doctor with ID: " + doctorId));

        User user = doctor.getUser();
        if (user == null) {
            throw new ResourceNotFoundException("User", "id", doctorId);
        }

        if (updateRequest.getAvatarUrl() != null) {
            doctor.setAvatarUrl(updateRequest.getAvatarUrl());
        }
        if (updateRequest.getBio() != null) {
            doctor.setBio(updateRequest.getBio());
        }
        if (updateRequest.getPhoneNumber() != null && !updateRequest.getPhoneNumber().trim().isEmpty()) {
            user.setPhoneNumber(updateRequest.getPhoneNumber());
        }

        userRepository.save(user);
        Doctor updated = doctorRepository.save(doctor);
        return buildDoctorProfileResponse(updated);
    }

    private DoctorProfileResponse buildDoctorProfileResponse(Doctor d) {
        List<String> availableTypes = new ArrayList<>();
        if (d.isAvailableForVideo()) {
            availableTypes.add("Video");
        }
        if (d.isAvailableForAudio()) {
            availableTypes.add("Audio");
        }
        if (d.isAvailableForChat()) {
            availableTypes.add("Chat");
        }
        if (d.isAvailableForOffline()) {
            availableTypes.add("Offline");
        }

        String specialtyName = (d.getSpecialtyEntity() != null)
                ? d.getSpecialtyEntity().getName()
                : d.getSpecialty();

        return DoctorProfileResponse.builder()
                .doctorId(d.getDoctorId())
                .email(d.getUser() != null ? d.getUser().getEmail() : null)
                .phoneNumber(d.getUser() != null ? d.getUser().getPhoneNumber() : null)
                .fullName(d.getFullName())
                .specialty(specialtyName)
                .qualifications(d.getQualifications())
                .yearsOfExperience(d.getYearsOfExperience())
                .languageSpoken(d.getLanguageSpoken())
                .location(d.getLocation())
                .avatarUrl(d.getAvatarUrl())
                .bio(d.getBio())
                .clinicName(d.getClinicName())
                .clinicAddress(d.getClinicAddress())
                .consultationFee(d.getConsultationFee())
                .averageRating(d.getAverageRating())
                .totalReviews(d.getTotalReviews())
                .verified(d.isVerified())
                .availableTypes(availableTypes)
                // --- Trường tài chính chiết khấu ---
                .totalEarnings(d.getTotalEarnings())
                .pendingSettlement(d.getPendingSettlement())
                .paypalEmail(d.getPaypalEmail())
                .commissionTier(d.getCommissionTier())
                .build();
    }

    @Override
    @Transactional
    public String requestEmailChange(String doctorId, ChangeEmailRequest request) {
        User user = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", doctorId));

        // Xác minh mật khẩu
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid password");
        }

        // Kiểm tra email mới chưa được dùng
        if (userRepository.findByEmail(request.getNewEmail()).isPresent()) {
            throw new BadRequestException("Email already in use");
        }

        // Xóa token cũ nếu có
        emailVerificationTokenRepository.findByUserAndUsedFalse(user)
                .ifPresent(emailVerificationTokenRepository::delete);

        // Tạo mã xác nhận (6 chữ số)
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

        // Gửi email xác nhận
        emailService.sendVerificationEmail(request.getNewEmail(), user.getUsername(), verificationCode);

        log.info("Email change requested for doctorId: {} to email: {}", doctorId, request.getNewEmail());
        return "Verification code sent to " + request.getNewEmail() + ". Please check your email.";
    }

    @Override
    @Transactional
    public DoctorProfileResponse verifyEmailChange(String doctorId, VerifyEmailChangeRequest request) {
        User user = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", doctorId));

        EmailVerificationToken token = emailVerificationTokenRepository.findByToken(request.getVerificationCode())
                .orElseThrow(() -> new BadRequestException("Invalid verification code"));

        // Xác minh token
        if (token.isExpired()) {
            throw new BadRequestException("Verification code has expired");
        }

        if (token.isUsed()) {
            throw new BadRequestException("Verification code has already been used");
        }

        if (!token.getUser().getId().equals(doctorId)) {
            throw new BadRequestException("Verification code does not belong to this user");
        }

        if (!token.getNewEmail().equals(request.getNewEmail())) {
            throw new BadRequestException("Email does not match verification token");
        }

        // Cập nhật email của user
        user.setEmail(request.getNewEmail());
        user.setEmailConfirmed(true);
        userRepository.save(user);

        // Đánh dấu token đã sử dụng
        token.setUsed(true);
        emailVerificationTokenRepository.save(token);

        log.info("Email changed for doctorId: {} to: {}", doctorId, request.getNewEmail());

        // Lấy hồ sơ bác sĩ đã cập nhật
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "doctorId", doctorId));
        return buildDoctorProfileResponse(doctor);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------
    private String generateVerificationCode() {
        return String.format("%06d", (int) (Math.random() * 1000000));
    }

    private DoctorResponse toResponse(Doctor d) {
        List<String> availableTypes = new ArrayList<>();
        if (d.isAvailableForVideo()) {
            availableTypes.add("Video");
        }
        if (d.isAvailableForAudio()) {
            availableTypes.add("Audio");
        }
        if (d.isAvailableForChat()) {
            availableTypes.add("Chat");
        }
        if (d.isAvailableForOffline()) {
            availableTypes.add("Offline");
        }

        String specialtyName = (d.getSpecialtyEntity() != null)
                ? d.getSpecialtyEntity().getName()
                : d.getSpecialty();

        return DoctorResponse.builder()
                .doctorId(d.getDoctorId())
                .fullName(d.getFullName())
                .specialtyName(specialtyName)
                .qualifications(d.getQualifications())
                .yearsOfExperience(d.getYearsOfExperience())
                .languageSpoken(d.getLanguageSpoken())
                .location(d.getLocation())
                .avatarUrl(d.getAvatarUrl())
                .bio(d.getBio())
                .consultationFee(d.getConsultationFee())
                .averageRating(d.getAverageRating())
                .totalReviews(d.getTotalReviews())
                .availableTypes(availableTypes)
                .build();
    }

    /**
     * Chuyển đổi DoctorSchedule entity thành DoctorScheduleResponse DTO.
     */
    private DoctorScheduleResponse toScheduleResponse(DoctorSchedule s) {
        int day = s.getDayOfWeek() != null ? s.getDayOfWeek() : 0;
        return DoctorScheduleResponse.builder()
                .scheduleId(s.getScheduleId())
                .dayOfWeek(day)
                .dayName(DAY_NAMES[day])
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .slotDuration(s.getSlotDuration())
                .consultationType(s.getConsultationType())
                .available(s.isAvailable())
                .build();
    }

    @Override
    @Transactional
    public String uploadAvatar(String doctorId, MultipartFile file) throws IOException {
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
        Path avatarDir = Paths.get(uploadDir, "avatars", "doctors");
        Files.createDirectories(avatarDir);

        // Tên file độc nhất
        String original = file.getOriginalFilename();
        String ext = (original != null && original.contains("."))
                ? original.substring(original.lastIndexOf(".")) : ".jpg";
        String filename = UUID.randomUUID() + ext;

        // Ghi file
        Files.write(avatarDir.resolve(filename), file.getBytes());

        // URL công khai
        String avatarUrl = baseUrl + "/uploads/avatars/doctors/" + filename;

        // Cập nhật DB
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "doctorId", doctorId));
        doctor.setAvatarUrl(avatarUrl);
        doctorRepository.save(doctor);

        log.info("Avatar uploaded for doctor {}: {}", doctorId, avatarUrl);
        return avatarUrl;
    }

    @Override
    public PagedResponse<DoctorResponse> searchDoctors(
            String specialty,
            String name,
            String location,
            int page,
            int pageSize
    ) {
        String specialtyFilter = (specialty != null && specialty.isBlank()) ? null : specialty;
        String nameFilter = (name != null && name.isBlank()) ? null : name;
        String locationFilter = (location != null && location.isBlank()) ? null : location;

        int safePage = Math.max(page, 1);
        int safePageSize = Math.max(pageSize, 1);

        Pageable pageable = PageRequest.of(safePage - 1, safePageSize);

        Page<Doctor> doctorPage = doctorRepository.findByFiltersPaged(
                specialtyFilter,
                nameFilter,
                locationFilter,
                pageable
        );

        List<DoctorResponse> items = doctorPage.getContent()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return PagedResponse.<DoctorResponse>builder()
                .items(items)
                .page(safePage)
                .pageSize(safePageSize)
                .totalItems(doctorPage.getTotalElements())
                .totalPages(doctorPage.getTotalPages())
                .build();
    }

    @Override
    public List<String> getSpecialties() {
        return doctorRepository.findAllSpecialtyNames();
    }
}
