package com.HealthLink.service.admin;

import com.HealthLink.dto.admin.AdminAuditLogDto;
import com.HealthLink.dto.admin.AdminAuditLogFilterRequest;
import com.HealthLink.dto.admin.AdminAuditLogPageResponse;
import com.HealthLink.entity.AdminAuditLog;
import com.HealthLink.entity.User;
import com.HealthLink.repository.admin.AdminAuditLogRepository;
import com.HealthLink.repository.auth.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AdminAuditLogService {

    private final AdminAuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    /**
     * Log user status change (Patient, Doctor, Pharmacy)
     * @param adminUserIdentifier - Can be userId or email (from authentication.getName())
     */
    public void logUserStatusChange(
            String adminUserIdentifier,
            String targetType,
            String targetId,
            String targetName,
            String oldStatus,
            String newStatus,
            String reason
    ) {
        User adminUser = findAdminUser(adminUserIdentifier);
        if (adminUser == null) {
            log.warn("Admin user not found: {}", adminUserIdentifier);
            return;
        }

        Map<String, Object> oldValue = new HashMap<>();
        oldValue.put("status", oldStatus);

        Map<String, Object> newValue = new HashMap<>();
        newValue.put("status", newStatus);

        String description = String.format("Changed %s status from '%s' to '%s'",
                targetType.toLowerCase(), oldStatus, newStatus);

        AdminAuditLog auditLog = AdminAuditLog.builder()
                .category(AdminAuditLog.CATEGORY_USER)
                .actionType(AdminAuditLog.ACTION_USER_STATUS_CHANGED)
                .targetType(targetType)
                .targetId(targetId)
                .targetName(targetName)
                .adminUser(adminUser)
                .description(description)
                .oldValue(toJson(oldValue))
                .newValue(toJson(newValue))
                .reason(reason)
                .ipAddress(getClientIpAddress())
                .createdAt(LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);
        log.info("Audit log created: {} - {} - {}", adminUserIdentifier, AdminAuditLog.ACTION_USER_STATUS_CHANGED, targetId);
    }

    /**
     * Log registration approval
     * @param adminUserIdentifier - Can be userId or email (from authentication.getName())
     */
    public void logRegistrationApproved(
            String adminUserIdentifier,
            String registrationType,
            Long requestId,
            String applicantName,
            String applicantEmail,
            String createdEntityId
    ) {
        User adminUser = findAdminUser(adminUserIdentifier);
        if (adminUser == null) {
            log.warn("Admin user not found: {}", adminUserIdentifier);
            return;
        }

        String targetType = "DOCTOR".equalsIgnoreCase(registrationType)
                ? AdminAuditLog.TARGET_DOCTOR
                : AdminAuditLog.TARGET_PHARMACY;

        Map<String, Object> details = new HashMap<>();
        details.put("requestId", requestId);
        details.put("registrationType", registrationType);
        details.put("email", applicantEmail);

        String description = String.format("Approved %s registration for '%s'",
                registrationType.toLowerCase(), applicantName);

        // Use the newly created Doctor/Pharmacy id (shares its PK with the User created
        // during approval) as targetId so this log can later be found by "filter by doctor".
        // requestId alone isn't enough — the entity doesn't exist yet when the request is
        // pending, so a requestId can never match a real doctorId/pharmacyId.
        String targetId = createdEntityId != null ? createdEntityId : String.valueOf(requestId);

        AdminAuditLog auditLog = AdminAuditLog.builder()
                .category(AdminAuditLog.CATEGORY_REGISTRATION)
                .actionType(AdminAuditLog.ACTION_REGISTRATION_APPROVED)
                .targetType(targetType)
                .targetId(targetId)
                .targetName(applicantName)
                .adminUser(adminUser)
                .description(description)
                .newValue(toJson(details))
                .ipAddress(getClientIpAddress())
                .createdAt(LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);
        log.info("Audit log created: {} - {} - requestId:{} - targetId:{}", adminUserIdentifier, AdminAuditLog.ACTION_REGISTRATION_APPROVED, requestId, targetId);
    }

    /**
     * Log registration rejection
     * @param adminUserIdentifier - Can be userId or email (from authentication.getName())
     */
    public void logRegistrationRejected(
            String adminUserIdentifier,
            String registrationType,
            Long requestId,
            String applicantName,
            String applicantEmail,
            String rejectionReason
    ) {
        User adminUser = findAdminUser(adminUserIdentifier);
        if (adminUser == null) {
            log.warn("Admin user not found: {}", adminUserIdentifier);
            return;
        }

        String targetType = "DOCTOR".equalsIgnoreCase(registrationType)
                ? AdminAuditLog.TARGET_DOCTOR
                : AdminAuditLog.TARGET_PHARMACY;

        Map<String, Object> details = new HashMap<>();
        details.put("requestId", requestId);
        details.put("registrationType", registrationType);
        details.put("email", applicantEmail);

        String description = String.format("Rejected %s registration for '%s'",
                registrationType.toLowerCase(), applicantName);

        AdminAuditLog auditLog = AdminAuditLog.builder()
                .category(AdminAuditLog.CATEGORY_REGISTRATION)
                .actionType(AdminAuditLog.ACTION_REGISTRATION_REJECTED)
                .targetType(targetType)
                .targetId(String.valueOf(requestId))
                .targetName(applicantName)
                .adminUser(adminUser)
                .description(description)
                .newValue(toJson(details))
                .reason(rejectionReason)
                .ipAddress(getClientIpAddress())
                .createdAt(LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);
        log.info("Audit log created: {} - {} - requestId:{}", adminUserIdentifier, AdminAuditLog.ACTION_REGISTRATION_REJECTED, requestId);
    }

    /**
     * Log AI auto-rejection of registration
     * This is called when AI screening automatically rejects a registration
     */
    public void logAIRejection(
            String registrationType,
            Long requestId,
            String applicantName,
            String applicantEmail,
            String rejectionDetails
    ) {
        // Get AI System user for audit logging
        User systemUser = getAISystemUser();
        if (systemUser == null) {
            log.error("AI System user not found. Cannot create audit log for AI rejection. RequestId: {}", requestId);
            return;
        }

        String targetType = "DOCTOR".equalsIgnoreCase(registrationType)
                ? AdminAuditLog.TARGET_DOCTOR
                : AdminAuditLog.TARGET_PHARMACY;

        Map<String, Object> details = new HashMap<>();
        details.put("requestId", requestId);
        details.put("registrationType", registrationType);
        details.put("email", applicantEmail);
        details.put("aiScreening", true);

        String description = String.format("AI auto-rejected %s registration for '%s'",
                registrationType.toLowerCase(), applicantName);

        AdminAuditLog auditLog = AdminAuditLog.builder()
                .category(AdminAuditLog.CATEGORY_REGISTRATION)
                .actionType(AdminAuditLog.ACTION_AI_REJECTED)
                .targetType(targetType)
                .targetId(String.valueOf(requestId))
                .targetName(applicantName)
                .adminUser(systemUser)  // Use AI System user instead of null
                .description(description)
                .newValue(toJson(details))
                .reason(rejectionDetails)
                .ipAddress("AI_SYSTEM")
                .createdAt(LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);
        log.info("AI rejection audit log created for requestId:{} - {}", requestId, applicantName);
    }

    /**
     * Get AI System user for audit logging
     * This user is created by SystemUserInitializer on startup
     */
    private User getAISystemUser() {
        return userRepository.findById(com.HealthLink.config.SystemUserInitializer.SYSTEM_USER_ID)
                .orElse(null);
    }

    /**
     * Log commission config change (global rate) - backward compatible
     */
    public void logCommissionConfigChange(
            String adminUserIdentifier,
            Integer configId,
            String serviceType,
            BigDecimal oldRate,
            BigDecimal newRate,
            BigDecimal oldMin,
            BigDecimal newMin,
            BigDecimal oldMax,
            BigDecimal newMax
    ) {
        logCommissionConfigChange(adminUserIdentifier, configId, serviceType, oldRate, newRate, oldMin, newMin, oldMax, newMax, null);
    }

    /**
     * Log commission config change (global rate) with reason
     * @param adminUserIdentifier - Can be userId or email (from authentication.getName())
     */
    public void logCommissionConfigChange(
            String adminUserIdentifier,
            Integer configId,
            String serviceType,
            BigDecimal oldRate,
            BigDecimal newRate,
            BigDecimal oldMin,
            BigDecimal newMin,
            BigDecimal oldMax,
            BigDecimal newMax,
            String reason
    ) {
        User adminUser = findAdminUser(adminUserIdentifier);
        if (adminUser == null) {
            log.warn("Admin user not found: {}", adminUserIdentifier);
            return;
        }

        Map<String, Object> oldValue = new HashMap<>();
        oldValue.put("commissionRate", oldRate);
        oldValue.put("minCommission", oldMin);
        oldValue.put("maxCommission", oldMax);

        Map<String, Object> newValue = new HashMap<>();
        newValue.put("commissionRate", newRate);
        newValue.put("minCommission", newMin);
        newValue.put("maxCommission", newMax);

        String description = String.format("Changed commission config for '%s': rate %.2f%% -> %.2f%%",
                serviceType, oldRate.multiply(new BigDecimal("100")), newRate.multiply(new BigDecimal("100")));

        AdminAuditLog auditLog = AdminAuditLog.builder()
                .category(AdminAuditLog.CATEGORY_COMMISSION)
                .actionType(AdminAuditLog.ACTION_COMMISSION_CONFIG_CHANGED)
                .targetType(AdminAuditLog.TARGET_CONFIG)
                .targetId(String.valueOf(configId))
                .targetName(serviceType)
                .adminUser(adminUser)
                .description(description)
                .oldValue(toJson(oldValue))
                .newValue(toJson(newValue))
                .reason(reason)
                .ipAddress(getClientIpAddress())
                .createdAt(LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);
        log.info("Audit log created: {} - {} - configId:{}", adminUserIdentifier, AdminAuditLog.ACTION_COMMISSION_CONFIG_CHANGED, configId);
    }

    /**
     * Log partner commission change (custom rate) - backward compatible
     */
    public void logPartnerCommissionChange(
            String adminUserIdentifier,
            String partnerType,
            String partnerId,
            String partnerName,
            Map<String, Object> oldRates,
            Map<String, Object> newRates
    ) {
        logPartnerCommissionChange(adminUserIdentifier, partnerType, partnerId, partnerName, oldRates, newRates, null);
    }

    /**
     * Log partner commission change (custom rate) with reason
     * @param adminUserIdentifier - Can be userId or email (from authentication.getName())
     */
    public void logPartnerCommissionChange(
            String adminUserIdentifier,
            String partnerType,
            String partnerId,
            String partnerName,
            Map<String, Object> oldRates,
            Map<String, Object> newRates,
            String reason
    ) {
        User adminUser = findAdminUser(adminUserIdentifier);
        if (adminUser == null) {
            log.warn("Admin user not found: {}", adminUserIdentifier);
            return;
        }

        String targetType = "DOCTOR".equalsIgnoreCase(partnerType)
                ? AdminAuditLog.TARGET_DOCTOR
                : AdminAuditLog.TARGET_PHARMACY;

        String description = String.format("Changed custom commission rate for %s '%s'",
                partnerType.toLowerCase(), partnerName);

        AdminAuditLog auditLog = AdminAuditLog.builder()
                .category(AdminAuditLog.CATEGORY_COMMISSION)
                .actionType(AdminAuditLog.ACTION_COMMISSION_PARTNER_CHANGED)
                .targetType(targetType)
                .targetId(partnerId)
                .targetName(partnerName)
                .adminUser(adminUser)
                .description(description)
                .oldValue(toJson(oldRates))
                .newValue(toJson(newRates))
                .reason(reason)
                .ipAddress(getClientIpAddress())
                .createdAt(LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);
        log.info("Audit log created: {} - {} - {}:{}", adminUserIdentifier, AdminAuditLog.ACTION_COMMISSION_PARTNER_CHANGED, partnerType, partnerId);
    }

    /**
     * Log admin-initiated PayPal payout email change for a doctor or pharmacy.
     * @param adminUserIdentifier - Can be userId or email (from authentication.getName())
     */
    public void logPaypalEmailChanged(
            String adminUserIdentifier,
            String partnerType,
            String targetId,
            String targetName,
            String oldEmail,
            String newEmail,
            String reason
    ) {
        User adminUser = findAdminUser(adminUserIdentifier);
        if (adminUser == null) {
            log.warn("Admin user not found: {}", adminUserIdentifier);
            return;
        }

        String targetType = "DOCTOR".equalsIgnoreCase(partnerType)
                ? AdminAuditLog.TARGET_DOCTOR
                : AdminAuditLog.TARGET_PHARMACY;

        String description = String.format("Changed PayPal payout email for %s '%s'",
                partnerType.toLowerCase(), targetName);

        AdminAuditLog auditLog = AdminAuditLog.builder()
                .category(AdminAuditLog.CATEGORY_USER)
                .actionType(AdminAuditLog.ACTION_PAYPAL_EMAIL_CHANGED)
                .targetType(targetType)
                .targetId(targetId)
                .targetName(targetName)
                .adminUser(adminUser)
                .description(description)
                .oldValue(toJson(Map.of("paypalEmail", oldEmail != null ? oldEmail : "")))
                .newValue(toJson(Map.of("paypalEmail", newEmail)))
                .reason(reason)
                .ipAddress(getClientIpAddress())
                .createdAt(LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);
        log.info("Audit log created: {} - {} - {}:{}", adminUserIdentifier, AdminAuditLog.ACTION_PAYPAL_EMAIL_CHANGED, partnerType, targetId);
    }

    /**
     * Log partner commission reset (remove custom rate)
     * @param adminUserIdentifier - Can be userId or email (from authentication.getName())
     */
    public void logPartnerCommissionReset(
            String adminUserIdentifier,
            String partnerType,
            String partnerId,
            String partnerName,
            Map<String, Object> oldRates
    ) {
        logPartnerCommissionReset(adminUserIdentifier, partnerType, partnerId, partnerName, oldRates, null);
    }

    /**
     * Log partner commission reset (remove custom rate) with reason
     * @param adminUserIdentifier - Can be userId or email (from authentication.getName())
     */
    public void logPartnerCommissionReset(
            String adminUserIdentifier,
            String partnerType,
            String partnerId,
            String partnerName,
            Map<String, Object> oldRates,
            String reason
    ) {
        User adminUser = findAdminUser(adminUserIdentifier);
        if (adminUser == null) {
            log.warn("Admin user not found: {}", adminUserIdentifier);
            return;
        }

        String targetType = "DOCTOR".equalsIgnoreCase(partnerType)
                ? AdminAuditLog.TARGET_DOCTOR
                : AdminAuditLog.TARGET_PHARMACY;

        String description = String.format("Reset custom commission rate for %s '%s' (now uses default rate)",
                partnerType.toLowerCase(), partnerName);

        AdminAuditLog auditLog = AdminAuditLog.builder()
                .category(AdminAuditLog.CATEGORY_COMMISSION)
                .actionType(AdminAuditLog.ACTION_COMMISSION_PARTNER_RESET)
                .targetType(targetType)
                .targetId(partnerId)
                .targetName(partnerName)
                .adminUser(adminUser)
                .description(description)
                .oldValue(toJson(oldRates))
                .reason(reason)
                .ipAddress(getClientIpAddress())
                .createdAt(LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);
        log.info("Audit log created: {} - {} - {}:{}", adminUserIdentifier, AdminAuditLog.ACTION_COMMISSION_PARTNER_RESET, partnerType, partnerId);
    }

    /**
     * Get audit logs with filtering and pagination
     */
    @Transactional(readOnly = true)
    public AdminAuditLogPageResponse getLogs(AdminAuditLogFilterRequest filter) {
        int pageNumber = filter.getPageNumber() != null ? filter.getPageNumber() - 1 : 0;
        int pageSize = filter.getPageSize() != null ? filter.getPageSize() : 20;

        Sort.Direction direction = "asc".equalsIgnoreCase(filter.getSortDir())
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        String sortBy = filter.getSortBy() != null ? filter.getSortBy() : "createdAt";
        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by(direction, sortBy));

        Page<AdminAuditLog> page = auditLogRepository.findWithFilters(
                filter.getCategory(),
                filter.getActionType(),
                filter.getTargetType(),
                filter.getTargetId(),
                filter.getAdminUserId(),
                filter.getStartTime(),
                filter.getEndTime(),
                pageable
        );

        return AdminAuditLogPageResponse.builder()
                .logs(page.getContent().stream().map(this::toDto).collect(Collectors.toList()))
                .pageNumber(page.getNumber() + 1)
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }

    /**
     * Get every admin audit log matching the given filters, unpaginated — used for export.
     */
    @Transactional(readOnly = true)
    public java.util.List<AdminAuditLogDto> getAllLogsForExport(
            String category, String actionType, String targetType, String targetId,
            LocalDateTime startTime, LocalDateTime endTime) {
        Page<AdminAuditLog> page = auditLogRepository.findWithFilters(
                category, actionType, targetType, targetId, null, startTime, endTime, Pageable.unpaged());
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * Get single audit log by ID
     */
    @Transactional(readOnly = true)
    public AdminAuditLogDto getLogById(Long logId) {
        return auditLogRepository.findById(logId)
                .map(this::toDto)
                .orElse(null);
    }

    /**
     * Find admin user by identifier (can be email or userId)
     * authentication.getName() returns email from JWT token
     */
    private User findAdminUser(String identifier) {
        if (identifier == null || identifier.isEmpty()) {
            return null;
        }

        // First try to find by email (most common case from authentication.getName())
        User user = userRepository.findByEmail(identifier).orElse(null);
        if (user != null) {
            return user;
        }

        // Fallback: try to find by ID
        return userRepository.findById(identifier).orElse(null);
    }

    private AdminAuditLogDto toDto(AdminAuditLog log) {
        User admin = log.getAdminUser();
        return AdminAuditLogDto.builder()
                .logId(log.getLogId())
                .category(log.getCategory())
                .categoryDisplay(AdminAuditLogDto.getCategoryDisplay(log.getCategory()))
                .actionType(log.getActionType())
                .actionTypeDisplay(AdminAuditLogDto.getActionTypeDisplay(log.getActionType()))
                .targetType(log.getTargetType())
                .targetId(log.getTargetId())
                .targetName(log.getTargetName())
                .adminUserId(admin != null ? admin.getId() : null)
                .adminUserName(admin != null ? admin.getUsername() : null)
                .adminEmail(admin != null ? admin.getEmail() : null)
                .description(log.getDescription())
                .oldValue(log.getOldValue())
                .newValue(log.getNewValue())
                .reason(log.getReason())
                .ipAddress(log.getIpAddress())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private String toJson(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            log.error("Error serializing object to JSON", e);
            return obj.toString();
        }
    }

    private String getClientIpAddress() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String xForwardedFor = request.getHeader("X-Forwarded-For");
                if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
                    return xForwardedFor.split(",")[0].trim();
                }
                String xRealIp = request.getHeader("X-Real-IP");
                if (xRealIp != null && !xRealIp.isEmpty()) {
                    return xRealIp;
                }
                return request.getRemoteAddr();
            }
        } catch (Exception e) {
            log.warn("Could not get client IP address", e);
        }
        return null;
    }
}
