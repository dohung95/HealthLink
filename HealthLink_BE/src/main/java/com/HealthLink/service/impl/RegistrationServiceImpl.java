package com.HealthLink.service.impl;

import com.HealthLink.dto.geocoding.GeocodeResponse;
import com.HealthLink.dto.registration.*;
import com.HealthLink.entity.*;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.SpecialtyRepository;
import com.HealthLink.repository.auth.RoleRepository;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.entity.enums.ServiceType;
import com.HealthLink.repository.registration.RegistrationDocumentRepository;
import com.HealthLink.repository.registration.RegistrationRequestRepository;

import java.util.List;

import com.HealthLink.service.email.EmailService;
import com.HealthLink.service.admin.AdminNotificationHelper;
import com.HealthLink.service.admin.AdminAuditLogService;
import com.HealthLink.service.homevisit.HomeVisitLocationService;
import com.HealthLink.service.registration.RegistrationService;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class RegistrationServiceImpl implements RegistrationService {

    @Value("${app.base-url}")
    private String baseUrl;

    @Value("${app.upload.dir}")
    private String uploadDir;

    private final RegistrationRequestRepository registrationRequestRepository;
    private final RegistrationDocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DoctorRepository doctorRepository;
    private final PharmacyRepository pharmacyRepository;
    private final SpecialtyRepository specialtyRepository;
    private final EmailService emailService;
    private final AdminNotificationHelper adminNotificationHelper;
    private final AdminAuditLogService auditLogService;
    private final HomeVisitLocationService homeVisitLocationService;
    private static final String DEFAULT_PASSWORD = "HealthLink@123";
    private static final String TYPE_DOCTOR = "DOCTOR";
    private static final String TYPE_PHARMACY = "PHARMACY";
    private static final String STATUS_PENDING = "Pending";
    private static final String STATUS_APPROVED = "Approved";
    private static final String STATUS_REJECTED = "Rejected";

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public RegistrationRequestResponse submitDoctorRegistration(DoctorRegistrationRequest request) {
        validateEmailNotRegistered(request.getEmail());

        RegistrationRequest entity = RegistrationRequest.builder()
                .registrationType(TYPE_DOCTOR)
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .status(STATUS_PENDING)
                .fullName(request.getFullName())
                .qualifications(request.getQualifications())
                .specialtyId(request.getSpecialtyId())
                .specialty(request.getSpecialty())
                .yearsOfExperience(request.getYearsOfExperience())
                .languageSpoken(request.getLanguageSpoken())
                .location(request.getLocation())
                .bio(request.getBio())
                .consultationFee(request.getConsultationFee())
                .clinicName(request.getClinicName())
                .clinicAddress(request.getClinicAddress())
                .build();

        entity = registrationRequestRepository.save(entity);

        // Gửi notification cho tất cả Admin
        try {
            adminNotificationHelper.notifyNewRegistration(
                    "Doctor",
                    request.getFullName(),
                    entity.getRequestId().intValue()
            );
        } catch (Exception e) {
            // Log but don't fail the registration
            System.err.println("Failed to send admin notification: " + e.getMessage());
        }

        return mapToResponse(entity);
    }

    @Override
    public RegistrationRequestResponse submitPharmacyRegistration(PharmacyRegistrationRequest request) {
        validateEmailNotRegistered(request.getEmail());

        RegistrationRequest entity = RegistrationRequest.builder()
                .registrationType(TYPE_PHARMACY)
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .status(STATUS_PENDING)
                .pharmacyName(request.getPharmacyName())
                .licenseNumber(request.getLicenseNumber())
                .address(request.getAddress())
                .city(request.getCity())
                .district(request.getDistrict())
                .ward(request.getWard())
                .openTime(request.getOpenTime())
                .closeTime(request.getCloseTime())
                .open24Hours(request.getOpen24Hours())
                .workingDays(request.getWorkingDays())
                .deliveryAvailable(request.isDeliveryAvailable())
                .deliveryRadius(request.getDeliveryRadius())
                .deliveryFee(request.getDeliveryFee())
                .description(request.getDescription())
                .build();

        entity = registrationRequestRepository.save(entity);

        // Gửi notification cho tất cả Admin
        try {
            adminNotificationHelper.notifyNewRegistration(
                    "Pharmacy",
                    request.getPharmacyName(),
                    entity.getRequestId().intValue()
            );
        } catch (Exception e) {
            // Log but don't fail the registration
            System.err.println("Failed to send admin notification: " + e.getMessage());
        }

        return mapToResponse(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public RegistrationPageResponse getRegistrations(int pageNumber, int pageSize, String type, String status, String sortBy) {
        Sort sort = resolveSort(sortBy);
        PageRequest pageRequest = PageRequest.of(pageNumber - 1, pageSize, sort);
        Specification<RegistrationRequest> spec = buildSpecification(type, status);

        Page<RegistrationRequest> page = registrationRequestRepository.findAll(spec, pageRequest);

        List<RegistrationRequestResponse> responses = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return RegistrationPageResponse.builder()
                .requests(responses)
                .pageNumber(pageNumber)
                .pageSize(pageSize)
                .totalCount(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public RegistrationRequestResponse getRegistrationById(Long requestId) {
        RegistrationRequest entity = registrationRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration Request", "id", requestId));
        return mapToResponse(entity);
    }

    @Override
    public RegistrationRequestResponse approveOrReject(Long requestId, ApproveRejectRequest request, String adminUserId) {
        RegistrationRequest entity = registrationRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration Request", "id", requestId));

        if (!STATUS_PENDING.equals(entity.getStatus())) {
            throw new BadRequestException("Request has already been processed");
        }

        String action = request.getAction().toUpperCase();
        if ("APPROVE".equals(action)) {
            approveRequest(entity, adminUserId);
        } else if ("REJECT".equals(action)) {
            if (request.getRejectionReason() == null || request.getRejectionReason().isBlank()) {
                throw new BadRequestException("Rejection reason is required");
            }
            rejectRequest(entity, adminUserId, request.getRejectionReason());
        } else {
            throw new BadRequestException("Invalid action. Must be APPROVE or REJECT");
        }

        return mapToResponse(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Specialty> getActiveSpecialties() {
        // Use findAllAvailable which includes active=true OR active=null
        List<Specialty> specialties = specialtyRepository.findAllAvailable();

        // Fallback to all ordered if still empty
        if (specialties.isEmpty()) {
            specialties = specialtyRepository.findAllOrdered();
        }

        return specialties;
    }

    private void validateEmailNotRegistered(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email is already registered as a user");
        }

        List<String> activeStatuses = Arrays.asList(STATUS_PENDING, STATUS_APPROVED);
        if (registrationRequestRepository.existsByEmailAndStatusIn(email, activeStatuses)) {
            throw new BadRequestException("A registration request with this email already exists");
        }
    }

    private void approveRequest(RegistrationRequest request, String adminUserId) {
        String userId = UUID.randomUUID().toString();
        String encodedPassword = passwordEncoder.encode(DEFAULT_PASSWORD);

        // Get role FIRST before creating User (RoleId is NOT NULL)
        String roleName = TYPE_DOCTOR.equals(request.getRegistrationType()) ? "Doctor" : "Pharmacy";
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "name", roleName));

        User user = User.builder()
                .id(userId)
                .username(request.getEmail())
                .email(request.getEmail())
                .emailConfirmed(true)
                .password(encodedPassword)
                .phoneNumber(request.getPhoneNumber())
                .status("Active")
                .createdDate(LocalDateTime.now())
                .role(role)  // Set role before save
                .build();

        user = userRepository.save(user);

        if (TYPE_DOCTOR.equals(request.getRegistrationType())) {
            createDoctor(user, request);
        } else {
            createPharmacy(user, request);
        }

        request.setStatus(STATUS_APPROVED);
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewedBy(adminUserId);
        registrationRequestRepository.save(request);

        // Log the approval in audit log
        String recipientName = TYPE_DOCTOR.equals(request.getRegistrationType())
                ? request.getFullName()
                : request.getPharmacyName();
        try {
            auditLogService.logRegistrationApproved(
                    adminUserId,
                    request.getRegistrationType(),
                    request.getRequestId(),
                    recipientName,
                    request.getEmail()
            );
        } catch (Exception e) {
            System.err.println("Failed to create audit log: " + e.getMessage());
        }

        // Send approval email with login credentials (don't let email errors rollback the transaction)
        try {
            emailService.sendApprovalEmail(
                    request.getEmail(),
                    recipientName,
                    request.getRegistrationType(),
                    DEFAULT_PASSWORD
            );
        } catch (Exception e) {
            // Log but don't fail the approval
            System.err.println("Failed to send approval email: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void createDoctor(User user, RegistrationRequest request) {
        Specialty specialty = null;
        if (request.getSpecialtyId() != null) {
            specialty = specialtyRepository.findById(request.getSpecialtyId()).orElse(null);
        }

        // Get avatar from registration documents (Profile Photo)
        String avatarUrl = documentRepository
                .findByRegistrationRequest_RequestIdAndDocumentType(request.getRequestId(), "Profile Photo")
                .map(doc -> copyRegistrationAvatarToPublicFolder(doc.getFilePath(), "doctors"))
                .orElse(null);

        Doctor doctor = Doctor.builder()
                .user(user)
                .fullName(request.getFullName())
                .qualifications(request.getQualifications())
                .specialty(request.getSpecialty() != null ? request.getSpecialty() :
                          (specialty != null ? specialty.getName() : "General"))
                .specialtyEntity(specialty)
                .yearsOfExperience(request.getYearsOfExperience())
                .languageSpoken(request.getLanguageSpoken())
                .location(request.getLocation())
                .bio(request.getBio())
                .consultationFee(request.getConsultationFee())
                .clinicName(request.getClinicName())
                .clinicAddress(request.getClinicAddress())
                .avatarUrl(avatarUrl)
                .verified(false)
                .averageRating(0.0)
                .totalReviews(0)
                .build();

        doctor.getServices().add(new DoctorService(doctor, ServiceType.ONLINE, true));
        doctor.getServices().add(new DoctorService(doctor, ServiceType.HOME_VISIT, true));

        try {
            GeocodeResponse geo = homeVisitLocationService.geocodeClinicAddressWithFallback(request.getClinicAddress());
            doctor.setLatitude(geo.getLatitude());
            doctor.setLongitude(geo.getLongitude());
        } catch (Exception e) {
            log.warn("Geocode failed for doctor {}: {}", request.getFullName(), e.getMessage());
        }

        doctor = doctorRepository.save(doctor);
    }

    private void createPharmacy(User user, RegistrationRequest request) {
        // Ensure required fields have values (NOT NULL constraints)
        String pharmacyName = request.getPharmacyName();
        if (pharmacyName == null || pharmacyName.isBlank()) {
            pharmacyName = "Pharmacy " + request.getEmail();
        }

        String licenseNumber = request.getLicenseNumber();
        if (licenseNumber == null || licenseNumber.isBlank()) {
            licenseNumber = "PENDING-" + System.currentTimeMillis();
        }

        String address = request.getAddress();
        if (address == null || address.isBlank()) {
            address = "Address pending update";
        }

        // Get avatar from registration documents (Profile Photo)
        String avatarUrl = documentRepository
                .findByRegistrationRequest_RequestIdAndDocumentType(request.getRequestId(), "Profile Photo")
                .map(doc -> copyRegistrationAvatarToPublicFolder(doc.getFilePath(), "pharmacies"))
                .orElse(null);

        Pharmacy pharmacy = new Pharmacy();
        pharmacy.setUser(user);  // @MapsId sẽ tự động lấy ID từ user
        pharmacy.setName(pharmacyName);
        pharmacy.setLicenseNumber(licenseNumber);
        pharmacy.setAddress(address);
        pharmacy.setCity(request.getCity());
        pharmacy.setDistrict(request.getDistrict());
        pharmacy.setWard(request.getWard());
        pharmacy.setPhoneNumber(request.getPhoneNumber());
        pharmacy.setEmail(request.getEmail());
        pharmacy.setOpenTime(request.getOpenTime());
        pharmacy.setCloseTime(request.getCloseTime());
        pharmacy.setOpen24Hours(Boolean.TRUE.equals(request.getOpen24Hours()));
        pharmacy.setWorkingDays(request.getWorkingDays());
        pharmacy.setDeliveryAvailable(Boolean.TRUE.equals(request.getDeliveryAvailable()));
        pharmacy.setDeliveryRadius(request.getDeliveryRadius());
        pharmacy.setDeliveryFee(request.getDeliveryFee());
        pharmacy.setDescription(request.getDescription());
        pharmacy.setAvatarUrl(avatarUrl);
        pharmacy.setVerified(false);
        pharmacy.setActive(true);
        pharmacy.setAverageRating(0.0);
        pharmacy.setTotalReviews(0);
        pharmacy.setCreatedAt(LocalDateTime.now());

        pharmacyRepository.save(pharmacy);
    }

    private String copyRegistrationAvatarToPublicFolder(String sourceFilePath, String partnerType) {
        try {
            Path sourcePath = Paths.get(sourceFilePath);
            if (!Files.exists(sourcePath) || !Files.isReadable(sourcePath)) {
                return null;
            }

            String originalFileName = sourcePath.getFileName().toString();
            String extension = ".jpg";
            int dotIndex = originalFileName.lastIndexOf('.');
            if (dotIndex >= 0) {
                extension = originalFileName.substring(dotIndex);
            }

            Path destinationDir = Paths.get(uploadDir, "avatars", partnerType);
            Files.createDirectories(destinationDir);
            String filename = UUID.randomUUID() + extension;
            Path destinationPath = destinationDir.resolve(filename);
            Files.copy(sourcePath, destinationPath, StandardCopyOption.REPLACE_EXISTING);

            return baseUrl + "/uploads/avatars/" + partnerType + "/" + filename;
        } catch (IOException ex) {
            throw new BadRequestException("Failed to process registration avatar: " + ex.getMessage());
        }
    }

    private void rejectRequest(RegistrationRequest request, String adminUserId, String reason) {
        request.setStatus(STATUS_REJECTED);
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewedBy(adminUserId);
        request.setRejectionReason(reason);
        registrationRequestRepository.save(request);

        // Log the rejection in audit log
        String recipientName = TYPE_DOCTOR.equals(request.getRegistrationType())
                ? request.getFullName()
                : request.getPharmacyName();
        try {
            auditLogService.logRegistrationRejected(
                    adminUserId,
                    request.getRegistrationType(),
                    request.getRequestId(),
                    recipientName,
                    request.getEmail(),
                    reason
            );
        } catch (Exception e) {
            System.err.println("Failed to create audit log: " + e.getMessage());
        }

        // Send rejection email with reason (don't let email errors rollback the transaction)
        try {
            emailService.sendRejectionEmail(
                    request.getEmail(),
                    recipientName,
                    request.getRegistrationType(),
                    reason
            );
        } catch (Exception e) {
            // Log but don't fail the rejection
            System.err.println("Failed to send rejection email: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private Sort resolveSort(String sortBy) {
        if (sortBy == null) sortBy = "newest";
        return switch (sortBy.toLowerCase()) {
            case "oldest" -> Sort.by(Sort.Direction.ASC, "createdAt");
            case "email" -> Sort.by(Sort.Direction.ASC, "email");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
    }

    private Specification<RegistrationRequest> buildSpecification(String type, String status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (type != null && !type.isBlank()) {
                predicates.add(cb.equal(cb.upper(root.get("registrationType")), type.toUpperCase()));
            }

            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private RegistrationRequestResponse mapToResponse(RegistrationRequest entity) {
        // Get documents for this registration request
        List<RegistrationDocumentDto> documentDtos = documentRepository
            .findByRegistrationRequest_RequestId(entity.getRequestId())
            .stream()
            .map(doc -> RegistrationDocumentDto.builder()
                .documentId(doc.getDocumentId())
                .documentType(doc.getDocumentType())
                .fileName(doc.getFileName())
                .originalFileName(doc.getOriginalFileName())
                .fileSize(doc.getFileSize())
                .mimeType(doc.getMimeType())
                .uploadedAt(doc.getUploadedAt())
                .downloadUrl("/api/registration/documents/" + doc.getDocumentId() + "/download")
                // AI verification fields
                .aiVerificationStatus(doc.getAiVerificationStatus())
                .aiVerificationResult(doc.getAiVerificationResult())
                .documentTypeVerified(doc.getDocumentTypeVerified())
                .aiConfidenceScore(doc.getAiConfidenceScore())
                .build())
            .collect(Collectors.toList());

        return RegistrationRequestResponse.builder()
                .requestId(entity.getRequestId())
                .registrationType(entity.getRegistrationType())
                .email(entity.getEmail())
                .phoneNumber(entity.getPhoneNumber())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .reviewedAt(entity.getReviewedAt())
                .reviewedBy(entity.getReviewedBy())
                .rejectionReason(entity.getRejectionReason())
                .fullName(entity.getFullName())
                .qualifications(entity.getQualifications())
                .specialtyId(entity.getSpecialtyId())
                .specialty(entity.getSpecialty())
                .yearsOfExperience(entity.getYearsOfExperience())
                .languageSpoken(entity.getLanguageSpoken())
                .location(entity.getLocation())
                .bio(entity.getBio())
                .consultationFee(entity.getConsultationFee())
                .clinicName(entity.getClinicName())
                .clinicAddress(entity.getClinicAddress())
                .pharmacyName(entity.getPharmacyName())
                .licenseNumber(entity.getLicenseNumber())
                .address(entity.getAddress())
                .city(entity.getCity())
                .district(entity.getDistrict())
                .ward(entity.getWard())
                .openTime(entity.getOpenTime())
                .closeTime(entity.getCloseTime())
                .open24Hours(entity.getOpen24Hours())
                .workingDays(entity.getWorkingDays())
                .deliveryAvailable(entity.getDeliveryAvailable())
                .deliveryRadius(entity.getDeliveryRadius())
                .deliveryFee(entity.getDeliveryFee())
                .description(entity.getDescription())
                .documents(documentDtos)
                // AI Screening fields
                .aiScreeningStatus(entity.getAiScreeningStatus())
                .aiScreeningResult(entity.getAiScreeningResult())
                .aiRejectionReason(entity.getAiRejectionReason())
                .aiScreenedAt(entity.getAiScreenedAt())
                .build();
    }
}
