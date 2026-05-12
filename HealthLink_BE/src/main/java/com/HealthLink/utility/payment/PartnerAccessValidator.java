package com.HealthLink.utility.payment;

import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.User;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Kiểm tra partner đang đăng nhập có đúng role và đúng id với dữ liệu đang truy cập hay không.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PartnerAccessValidator {

    private static final String PARTNER_TYPE_DOCTOR   = "DOCTOR";
    private static final String PARTNER_TYPE_PHARMACY = "PHARMACY";

    private final UserRepository     userRepository;
    private final DoctorRepository   doctorRepository;
    private final PharmacyRepository pharmacyRepository;

    /**
     * Chỉ cho phép partner có đúng role và đúng id truy cập dữ liệu của chính mình.
     */
    @Transactional(readOnly = true)
    public void assertPartnerAccess(String partnerId, String requestedType) {
        // 1. Load user hiện tại từ JWT
        User currentUser  = getCurrentAuthenticatedUser();
        String userId     = currentUser.getId();
        String roleStr    = currentUser.getRole() != null ? currentUser.getRole().getName() : null;
        String normalizedRole = roleStr != null ? roleStr.toUpperCase() : null;

        log.debug("[AccessValidator] partnerId={}, requestedType={}, userId={}, role={}",
                partnerId, requestedType, userId, normalizedRole);

        // 2. Phải có role
        if (normalizedRole == null) {
            throw new AccessDeniedException("Current user does not have a partner role.");
        }

        // 3. Nếu truyền type, phải khớp với role
        if (requestedType != null && !requestedType.equalsIgnoreCase(normalizedRole)) {
            log.warn("[AccessValidator] Role mismatch: requested={}, actual={}", requestedType, normalizedRole);
            throw new AccessDeniedException("Role mismatch: endpoint type " + requestedType
                    + " does not match authenticated role " + normalizedRole + ".");
        }

        // 4a. DOCTOR
        if (PARTNER_TYPE_DOCTOR.equalsIgnoreCase(normalizedRole)) {
            // JOIN FETCH để load doctor.user trong cùng query — tránh @OneToOne @MapsId lazy issue
            Doctor doctor = doctorRepository.findByIdWithUser(partnerId)
                    .orElseThrow(() -> {
                        log.warn("[AccessValidator] Doctor not found: {}", partnerId);
                        return new AccessDeniedException(
                                "Access denied: doctor account not found for partnerId " + partnerId + ".");
                    });

            String doctorEmail = (doctor.getUser() != null) ? doctor.getUser().getEmail() : null;
            boolean ownerByEmail = doctorEmail != null && doctorEmail.equalsIgnoreCase(currentUser.getEmail());
            boolean ownerById    = partnerId.equalsIgnoreCase(userId);   // @MapsId: doctorId == userId

            log.debug("[AccessValidator] DOCTOR ownerByEmail={}, ownerById={}", ownerByEmail, ownerById);

            if (!ownerByEmail && !ownerById) {
                log.warn("[AccessValidator] DOCTOR access DENIED: partnerId={}, userId={}", partnerId, userId);
                throw new AccessDeniedException(
                        "Access denied: authenticated user cannot access doctor partnerId " + partnerId + ".");
            }
            return;
        }

        // 4b. PHARMACY
        if (PARTNER_TYPE_PHARMACY.equalsIgnoreCase(normalizedRole)) {
            if (!pharmacyRepository.existsById(partnerId)) {
                log.warn("[AccessValidator] Pharmacy not found: {}", partnerId);
                throw new AccessDeniedException(
                        "Access denied: pharmacy account not found for partnerId " + partnerId + ".");
            }
            if (!partnerId.equalsIgnoreCase(userId)) {
                log.warn("[AccessValidator] PHARMACY access DENIED: partnerId={}, userId={}", partnerId, userId);
                throw new AccessDeniedException(
                        "Access denied: authenticated user cannot access pharmacy partnerId " + partnerId + ".");
            }
            return;
        }

        log.warn("[AccessValidator] Unsupported role: {}", normalizedRole);
        throw new AccessDeniedException("Access denied: unsupported role " + normalizedRole + ".");
    }

    private User getCurrentAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null) {
            throw new AccessDeniedException("Unauthenticated request.");
        }
        String email = auth.getName();
        log.debug("[AccessValidator] Loading user by email={}", email);
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AccessDeniedException(
                        "Authenticated user not found for email: " + email));
    }
}