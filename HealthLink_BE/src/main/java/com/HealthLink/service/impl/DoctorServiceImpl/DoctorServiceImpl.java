package com.HealthLink.service.impl.DoctorServiceImpl;

import com.HealthLink.dto.doctor.DoctorUpdateRequest;
import com.HealthLink.dto.auth.ChangeEmailRequest;
import com.HealthLink.dto.auth.VerifyEmailChangeRequest;
import com.HealthLink.dto.auth.PasswordChangeVerifyRequest;
import com.HealthLink.entity.TokenType;
import com.HealthLink.dto.admin.AdminAppointmentSummaryDto;
import com.HealthLink.dto.admin.AdminDocumentCategoryDto;
import com.HealthLink.dto.admin.AdminMedicalDocumentDto;
import com.HealthLink.dto.prescription.PrescriptionItemResponse;
import com.HealthLink.dto.prescription.PrescriptionResponse;
import com.HealthLink.dto.response.DoctorPatientHistoryResponse;
import com.HealthLink.dto.response.DoctorPatientPageResponse;
import com.HealthLink.dto.response.DoctorPatientSummaryResponse;
import com.HealthLink.dto.response.DoctorProfileResponse;
import com.HealthLink.dto.response.DoctorResponse;
import com.HealthLink.dto.response.DoctorScheduleResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.entity.HealthRecord;
import com.HealthLink.entity.MedicalDocument;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.PrescriptionItem;
import com.HealthLink.entity.User;
import com.HealthLink.exception.ForbiddenException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.auth.EmailVerificationTokenRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.doctor.DoctorService;
import com.HealthLink.service.email.EmailService;
import com.HealthLink.utility.DoctorServiceHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.HealthLink.entity.EmailVerificationToken;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.entity.DoctorServiceId;
import com.HealthLink.entity.enums.ServiceType;
import com.HealthLink.dto.doctor.DoctorServiceToggleRequest;
import com.HealthLink.repository.DoctorServiceRepository;
import java.util.HashMap;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Comparator;
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
import org.springframework.util.StringUtils;
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
    private final AppointmentRepository appointmentRepository;
    private final PrescriptionHeaderRepository prescriptionHeaderRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final DoctorServiceRepository doctorServiceRepository;

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

    @Override
    public DoctorPatientPageResponse getMyPatients(
            String doctorId,
            String searchTerm,
            String status,
            int page,
            int pageSize
    ) {
        doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "doctorId", doctorId));

        int safePage = Math.max(page, 1);
        int safePageSize = Math.max(pageSize, 1);
        String normalizedSearch = StringUtils.hasText(searchTerm) ? searchTerm.trim() : null;
        String normalizedStatus = StringUtils.hasText(status) ? status.trim().toLowerCase() : "all";

        int queryPage = "all".equals(normalizedStatus) ? safePage - 1 : 0;
        int querySize = "all".equals(normalizedStatus) ? safePageSize : 1000;
        Pageable pageable = PageRequest.of(queryPage, querySize);

        Page<String> patientIdPage = appointmentRepository.findDoctorPatientIds(
                doctorId,
                normalizedSearch,
                pageable
        );

        List<String> patientIds = patientIdPage.getContent();
        if (patientIds.isEmpty()) {
            return DoctorPatientPageResponse.builder()
                    .patients(List.of())
                    .pageNumber(safePage)
                    .pageSize(safePageSize)
                    .totalCount(0)
                    .totalPages(1)
                    .build();
        }

        List<Patient> patients = patientRepository.findByIdsWithUser(patientIds);

        Map<String, Patient> patientMap = patients.stream()
                .collect(Collectors.toMap(Patient::getPatientId, p -> p));
        List<Patient> orderedPatients = patientIds.stream()
                .map(patientMap::get)
                .collect(Collectors.toList());

        List<Appointment> allAppointments = appointmentRepository
                .findAppointmentsByDoctorAndPatientIds(doctorId, patientIds);

        Map<String, List<Appointment>> appointmentsByPatient = allAppointments.stream()
                .collect(Collectors.groupingBy(a -> a.getPatient().getPatientId()));

        LocalDateTime now = LocalDateTime.now();
        List<DoctorPatientSummaryResponse> summaries = orderedPatients.stream()
                .map(patient -> {
                    List<Appointment> patientAppts = appointmentsByPatient
                            .getOrDefault(patient.getPatientId(), List.of());
                    return buildPatientSummary(patient, patientAppts, now);
                })
                .filter(summary -> matchesPatientStatus(summary, normalizedStatus))
                .collect(Collectors.toList());

        if (!"all".equals(normalizedStatus)) {
            int fromIndex = Math.min((safePage - 1) * safePageSize, summaries.size());
            int toIndex = Math.min(fromIndex + safePageSize, summaries.size());
            List<DoctorPatientSummaryResponse> pagedSummaries = summaries.subList(fromIndex, toIndex);
            return DoctorPatientPageResponse.builder()
                    .patients(pagedSummaries)
                    .pageNumber(safePage)
                    .pageSize(safePageSize)
                    .totalCount(summaries.size())
                    .totalPages(Math.max(1, (int) Math.ceil((double) summaries.size() / safePageSize)))
                    .build();
        }

        return DoctorPatientPageResponse.builder()
                .patients(summaries)
                .pageNumber(safePage)
                .pageSize(safePageSize)
                .totalCount(patientIdPage.getTotalElements())
                .totalPages(patientIdPage.getTotalPages())
                .build();
    }

    @Override
    public DoctorPatientHistoryResponse getMyPatientHistory(String doctorId, String patientId) {
        doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "doctorId", doctorId));

        Patient patient = userRepository.findById(patientId)
                .map(User::getPatient)
                .orElse(null);
        if (patient == null) {
            throw new ResourceNotFoundException("Patient", "id", patientId);
        }

        if (!appointmentRepository.existsDoctorPatientRelation(doctorId, patientId)) {
            throw new ForbiddenException("You are not allowed to view this patient history");
        }

        List<AdminAppointmentSummaryDto> appointments = appointmentRepository
                .findDoctorPatientAppointments(doctorId, patientId)
                .stream()
                .map(this::toAppointmentSummary)
                .collect(Collectors.toList());

        List<PrescriptionResponse> prescriptions = prescriptionHeaderRepository
                .findByDoctor_DoctorIdAndPatient_PatientIdOrderByIssueDateDesc(doctorId, patientId)
                .stream()
                .map(this::toPrescriptionResponse)
                .collect(Collectors.toList());

        User user = patient.getUser();
        return DoctorPatientHistoryResponse.builder()
                .patientId(patient.getPatientId())
                .fullName(patient.getFullName())
                .email(user != null ? user.getEmail() : null)
                .phoneNumber(user != null ? user.getPhoneNumber() : null)
                .gender(patient.getGender())
                .bloodType(patient.getBloodType())
                .dateOfBirth(patient.getDateOfBirth())
                .avatarUrl(patient.getAvatarUrl())
                .address(patient.getAddress())
                .city(patient.getCity())
                .country(patient.getCountry())
                .medicalHistorySummary(patient.getMedicalHistorySummary())
                .allergies(patient.getAllergies())
                .chronicConditions(patient.getChronicConditions())
                .currentMedications(patient.getCurrentMedications())
                .heightCm(patient.getHeightCm())
                .weightKg(patient.getWeightKg())
                .appointments(appointments)
                .documentsByCategory(getDocumentsByCategory(patient))
                .prescriptions(prescriptions)
                .build();
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
        if (updateRequest.getPaypalEmail() != null) {
            String paypalEmail = updateRequest.getPaypalEmail().trim();
            doctor.setPaypalEmail(paypalEmail.isEmpty() ? null : paypalEmail);
        }

        userRepository.save(user);
        Doctor updated = doctorRepository.save(doctor);
        return buildDoctorProfileResponse(updated);
    }

    private DoctorProfileResponse buildDoctorProfileResponse(Doctor d) {
        List<String> availableTypes = DoctorServiceHelper.buildAvailableTypes(d);

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

        // Gửi email xác nhận về email mới
        emailService.sendVerificationEmail(request.getNewEmail(), user.getUsername(), verificationCode);

        // Cảnh báo bảo mật về email CŨ, để chủ tài khoản biết nếu không phải họ yêu cầu
        emailService.sendSimpleMessage(
                user.getEmail(),
                "Security Alert: Email Change Requested",
                "We received a request to change the email on your HealthLink account from " +
                        user.getEmail() + " to " + request.getNewEmail() + ".\n\n" +
                        "If you did not request this, please change your password immediately and contact support.\n\n" +
                        "This change will only take effect after the new email is verified."
        );

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

    @Override
    @Transactional
    public String requestPasswordChange(String doctorId) {
        User user = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String verificationCode = generateVerificationCode();

        emailVerificationTokenRepository.findByUserAndType(user, TokenType.PASSWORD_RESET)
                .ifPresent(emailVerificationTokenRepository::delete);

        EmailVerificationToken token = EmailVerificationToken.builder()
                .user(user)
                .token(verificationCode)
                .type(TokenType.PASSWORD_RESET)
                .newEmail(user.getEmail())
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .build();
        emailVerificationTokenRepository.save(token);

        emailService.sendSimpleMessage(
                user.getEmail(),
                "Password Change OTP",
                "Your OTP for password change is: " + verificationCode +
                "\n\nThis code expires in 5 minutes.\n\nIf you did not request this, please ignore this email."
        );

        return "OTP sent to your registered email";
    }

    @Override
    @Transactional
    public void verifyPasswordChange(String doctorId, PasswordChangeVerifyRequest request) {
        User user = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }

        EmailVerificationToken token = emailVerificationTokenRepository
                .findByTokenAndUserAndType(request.getVerificationCode(), user, TokenType.PASSWORD_RESET)
                .orElseThrow(() -> new BadRequestException("Invalid or expired OTP"));

        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            emailVerificationTokenRepository.delete(token);
            throw new BadRequestException("OTP has expired. Please request a new one.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        emailVerificationTokenRepository.delete(token);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------
    private DoctorPatientSummaryResponse buildPatientSummary(
            Patient patient,
            List<Appointment> appointments,
            LocalDateTime now
    ) {
        Appointment latestAppointment = appointments.stream()
                .max(Comparator.comparing(Appointment::getAppointmentTime))
                .orElse(null);
        LocalDateTime lastAppointmentTime = appointments.stream()
                .filter(a -> a.getAppointmentTime().isBefore(now))
                .map(Appointment::getAppointmentTime)
                .max(LocalDateTime::compareTo)
                .orElse(null);
        LocalDateTime nextAppointmentTime = appointments.stream()
                .filter(a -> a.getAppointmentTime().isAfter(now))
                .filter(a -> !"CANCELLED".equalsIgnoreCase(a.getStatus()))
                .map(Appointment::getAppointmentTime)
                .min(LocalDateTime::compareTo)
                .orElse(null);

        User user = patient.getUser();
        return DoctorPatientSummaryResponse.builder()
                .patientId(patient.getPatientId())
                .fullName(patient.getFullName())
                .email(user != null ? user.getEmail() : null)
                .phoneNumber(user != null ? user.getPhoneNumber() : null)
                .gender(patient.getGender())
                .dateOfBirth(patient.getDateOfBirth())
                .avatarUrl(patient.getAvatarUrl())
                .lastAppointmentTime(lastAppointmentTime)
                .nextAppointmentTime(nextAppointmentTime)
                .totalAppointments(appointments.size())
                .completedAppointments(appointments.stream()
                        .filter(a -> "COMPLETED".equalsIgnoreCase(a.getStatus()))
                        .count())
                .latestStatus(latestAppointment != null ? latestAppointment.getStatus() : null)
                .build();
    }

    private boolean matchesPatientStatus(DoctorPatientSummaryResponse summary, String status) {
        if (!StringUtils.hasText(status) || "all".equals(status)) {
            return true;
        }
        if ("upcoming".equals(status)) {
            return summary.getNextAppointmentTime() != null;
        }
        if ("recent".equals(status)) {
            return summary.getNextAppointmentTime() == null && summary.getLastAppointmentTime() != null;
        }
        if ("inactive".equals(status)) {
            return summary.getNextAppointmentTime() == null && summary.getLastAppointmentTime() == null;
        }
        return true;
    }

    private AdminAppointmentSummaryDto toAppointmentSummary(Appointment appointment) {
        Doctor doctor = appointment.getDoctor();
        Consultation consultation = appointment.getConsultation();

        return AdminAppointmentSummaryDto.builder()
                .appointmentID(appointment.getAppointmentId())
                .appointmentTime(appointment.getAppointmentTime())
                .consultationType(appointment.getConsultationType())
                .status(appointment.getStatus())
                .symptoms(appointment.getSymptoms())
                .notes(appointment.getNotes())
                .fee(appointment.getFee())
                .doctorId(doctor != null ? doctor.getDoctorId() : null)
                .doctorName(doctor != null ? doctor.getFullName() : null)
                .doctorSpecialty(doctor != null ? doctor.getSpecialty() : null)
                .diagnosis(consultation != null ? consultation.getDiagnosis() : null)
                .doctorNotes(consultation != null ? consultation.getDoctorNotes() : null)
                .treatmentPlan(consultation != null ? consultation.getTreatmentPlan() : null)
                .followUpDate(consultation != null ? consultation.getFollowUpDate() : null)
                .build();
    }

    private List<AdminDocumentCategoryDto> getDocumentsByCategory(Patient patient) {
        Map<String, List<AdminMedicalDocumentDto>> categoryMap = new LinkedHashMap<>();

        if (patient.getHealthRecords() != null) {
            for (HealthRecord healthRecord : patient.getHealthRecords()) {
                if (healthRecord.getMedicalDocuments() == null) {
                    continue;
                }
                for (MedicalDocument document : healthRecord.getMedicalDocuments()) {
                    String category = StringUtils.hasText(document.getCategory())
                            ? document.getCategory()
                            : "Uncategorized";
                    categoryMap.computeIfAbsent(category, key -> new ArrayList<>())
                            .add(toDocumentDto(document));
                }
            }
        }

        categoryMap.values().forEach(documents -> documents.sort((left, right) -> {
            if (left.getDocumentDate() == null && right.getDocumentDate() == null) {
                return 0;
            }
            if (left.getDocumentDate() == null) {
                return 1;
            }
            if (right.getDocumentDate() == null) {
                return -1;
            }
            return right.getDocumentDate().compareTo(left.getDocumentDate());
        }));

        return categoryMap.entrySet().stream()
                .map(entry -> AdminDocumentCategoryDto.builder()
                        .category(entry.getKey())
                        .documentCount(entry.getValue().size())
                        .documents(entry.getValue())
                        .build())
                .sorted(Comparator.comparing(AdminDocumentCategoryDto::getCategory))
                .collect(Collectors.toList());
    }

    private AdminMedicalDocumentDto toDocumentDto(MedicalDocument document) {
        return AdminMedicalDocumentDto.builder()
                .documentID(document.getDocumentId())
                .documentName(document.getDocumentName())
                .documentType(document.getDocumentType())
                .category(document.getCategory())
                .description(document.getDescription())
                .testResults(document.getTestResults())
                .referenceRange(document.getReferenceRange())
                .testStatus(document.getTestStatus())
                .documentDate(document.getDocumentDate())
                .performedBy(document.getPerformedBy())
                .uploadedAt(document.getUploadedAt())
                .fileSize(document.getFileSize())
                .mimeType(document.getMimeType())
                .build();
    }

    private PrescriptionResponse toPrescriptionResponse(PrescriptionHeader header) {
        List<PrescriptionItemResponse> items = header.getPrescriptionItems() == null
                ? List.of()
                : header.getPrescriptionItems().stream()
                        .map(this::toPrescriptionItemResponse)
                        .collect(Collectors.toList());

        return PrescriptionResponse.builder()
                .prescriptionHeaderId(header.getPrescriptionHeaderId())
                .appointmentId(header.getAppointment() != null ? header.getAppointment().getAppointmentId() : null)
                .patientId(header.getPatient() != null ? header.getPatient().getPatientId() : null)
                .patientName(header.getPatient() != null ? header.getPatient().getFullName() : null)
                .doctorId(header.getDoctor() != null ? header.getDoctor().getDoctorId() : null)
                .doctorName(header.getDoctor() != null ? header.getDoctor().getFullName() : null)
                .issueDate(header.getIssueDate())
                .diagnosis(header.getDiagnosis())
                .notes(header.getNotes())
                .validUntil(header.getValidUntil())
                .status(header.getStatus())
                .totalAmount(header.getTotalAmount())
                .items(items)
                .build();
    }

    private PrescriptionItemResponse toPrescriptionItemResponse(PrescriptionItem item) {
        return PrescriptionItemResponse.builder()
                .prescriptionItemId(item.getPrescriptionItemId())
                .medicineId(item.getMedicine() != null ? item.getMedicine().getMedicineId() : null)
                .medicationName(item.getMedicationName())
                .dosage(item.getDosage())
                .instructions(item.getInstructions())
                .totalSupplyDays(item.getTotalSupplyDays())
                .quantity(item.getQuantity())
                .unit(item.getUnit())
                .frequency(item.getFrequency())
                .timing(item.getTiming())
                .route(item.getRoute())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .notes(item.getNotes())
                .build();
    }

    private String generateVerificationCode() {
        return String.format("%06d", (int) (Math.random() * 1000000));
    }

    private DoctorResponse toResponse(Doctor d) {
        List<String> availableTypes = DoctorServiceHelper.buildAvailableTypes(d);

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
                .scheduleStatus(s.getScheduleStatus())
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

    @Override
    @Transactional
    public Map<String, Boolean> updateServiceAvailability(String doctorId, DoctorServiceToggleRequest request) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + doctorId));

        if (request.isAllDisabled()) {
            throw new BusinessException("Phải có ít nhất 1 dịch vụ hoạt động");
        }

        Map<String, Boolean> result = new HashMap<>();

        if (request.getOnline() != null) {
            updateService(doctor, ServiceType.ONLINE, request.getOnline());
            result.put("online", request.getOnline());
        }
        if (request.getHomeVisit() != null) {
            updateService(doctor, ServiceType.HOME_VISIT, request.getHomeVisit());
            result.put("homeVisit", request.getHomeVisit());
        }

        return result;
    }

    private void updateService(Doctor doctor, ServiceType type, boolean available) {
        DoctorServiceId id = new DoctorServiceId(doctor.getDoctorId(), type);
        com.HealthLink.entity.DoctorService ds = doctorServiceRepository.findById(id)
                .orElseGet(() -> new com.HealthLink.entity.DoctorService(doctor, type, true));
        ds.setAvailable(available);
        doctorServiceRepository.save(ds);
    }
}
