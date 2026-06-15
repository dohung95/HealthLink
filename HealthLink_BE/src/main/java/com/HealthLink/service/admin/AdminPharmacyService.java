package com.HealthLink.service.admin;

import com.HealthLink.dto.admin.AdminPharmacyDto;
import com.HealthLink.dto.admin.AdminPharmacyPageResponse;
import com.HealthLink.dto.admin.AdminPharmacyUpdateDto;
import com.HealthLink.entity.AdminAuditLog;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.User;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.admin.AdminPharmacyRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@Transactional
public class AdminPharmacyService {

    private final AdminPharmacyRepository pharmacyRepository;
    private final AdminAuditLogService auditLogService;

    public AdminPharmacyService(AdminPharmacyRepository pharmacyRepository, AdminAuditLogService auditLogService) {
        this.pharmacyRepository = pharmacyRepository;
        this.auditLogService = auditLogService;
    }

    public AdminPharmacyPageResponse getPharmacies(int pageNumber, int pageSize, String searchTerm,
            String status, String city, String verified, String sortBy) {

        Pageable pageable = PageRequest.of(Math.max(pageNumber - 1, 0), Math.max(pageSize, 1), resolveSort(sortBy));
        Specification<Pharmacy> specification = buildSpecification(searchTerm, status, city, verified);
        Page<Pharmacy> page = pharmacyRepository.findAll(specification, pageable);

        List<AdminPharmacyDto> pharmacies = page.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());

        return new AdminPharmacyPageResponse(
            pharmacies,
            page.getNumber() + 1,
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
    }

    public AdminPharmacyDto getPharmacyById(String pharmacyId) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
            .orElseThrow(() -> new ResourceNotFoundException("Pharmacy", "id", pharmacyId));
        return mapToDto(pharmacy);
    }

    public AdminPharmacyDto updatePharmacy(String pharmacyId, AdminPharmacyUpdateDto updateDto) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
            .orElseThrow(() -> new ResourceNotFoundException("Pharmacy", "id", pharmacyId));

        if (StringUtils.hasText(updateDto.getName())) {
            pharmacy.setName(updateDto.getName());
        }
        if (StringUtils.hasText(updateDto.getLicenseNumber())) {
            pharmacy.setLicenseNumber(updateDto.getLicenseNumber());
        }
        if (StringUtils.hasText(updateDto.getAddress())) {
            pharmacy.setAddress(updateDto.getAddress());
        }
        if (StringUtils.hasText(updateDto.getCity())) {
            pharmacy.setCity(updateDto.getCity());
        }
        if (StringUtils.hasText(updateDto.getDistrict())) {
            pharmacy.setDistrict(updateDto.getDistrict());
        }
        if (StringUtils.hasText(updateDto.getWard())) {
            pharmacy.setWard(updateDto.getWard());
        }
        if (StringUtils.hasText(updateDto.getPhoneNumber())) {
            pharmacy.setPhoneNumber(updateDto.getPhoneNumber());
        }
        if (StringUtils.hasText(updateDto.getEmail())) {
            pharmacy.setEmail(updateDto.getEmail());
        }
        if (updateDto.getDescription() != null) {
            pharmacy.setDescription(updateDto.getDescription());
        }
        if (StringUtils.hasText(updateDto.getAvatarUrl())) {
            pharmacy.setAvatarUrl(updateDto.getAvatarUrl());
        }
        if (updateDto.getOpenTime() != null) {
            pharmacy.setOpenTime(updateDto.getOpenTime());
        }
        if (updateDto.getCloseTime() != null) {
            pharmacy.setCloseTime(updateDto.getCloseTime());
        }
        if (updateDto.getOpen24Hours() != null) {
            pharmacy.setOpen24Hours(updateDto.getOpen24Hours());
        }
        if (StringUtils.hasText(updateDto.getWorkingDays())) {
            pharmacy.setWorkingDays(updateDto.getWorkingDays());
        }
        if (updateDto.getVerified() != null) {
            pharmacy.setVerified(updateDto.getVerified());
        }
        if (updateDto.getActive() != null) {
            pharmacy.setActive(updateDto.getActive());
        }
        if (updateDto.getDeliveryAvailable() != null) {
            pharmacy.setDeliveryAvailable(updateDto.getDeliveryAvailable());
        }
        if (updateDto.getDeliveryRadius() != null) {
            pharmacy.setDeliveryRadius(updateDto.getDeliveryRadius());
        }
        if (updateDto.getDeliveryFee() != null) {
            pharmacy.setDeliveryFee(updateDto.getDeliveryFee());
        }
        if (StringUtils.hasText(updateDto.getBankAccount())) {
            pharmacy.setBankAccount(updateDto.getBankAccount());
        }
        if (StringUtils.hasText(updateDto.getBankName())) {
            pharmacy.setBankName(updateDto.getBankName());
        }
        if (StringUtils.hasText(updateDto.getPaypalEmail())) {
            pharmacy.setPaypalEmail(updateDto.getPaypalEmail());
        }

        if (pharmacy.getUser() != null && StringUtils.hasText(updateDto.getStatus())) {
            pharmacy.getUser().setStatus(updateDto.getStatus());
        }

        pharmacy.setUpdatedAt(LocalDateTime.now());
        Pharmacy saved = pharmacyRepository.save(pharmacy);
        return mapToDto(saved);
    }

    public AdminPharmacyDto updatePharmacyStatus(String pharmacyId, String status) {
        return updatePharmacyStatus(pharmacyId, status, null, null);
    }

    public AdminPharmacyDto updatePharmacyStatus(String pharmacyId, String status, String adminUserId, String reason) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
            .orElseThrow(() -> new ResourceNotFoundException("Pharmacy", "id", pharmacyId));

        if (pharmacy.getUser() == null) {
            throw new BadRequestException("Pharmacy has no associated user");
        }
        String oldStatus = pharmacy.getUser().getStatus();
        pharmacy.getUser().setStatus(status);
        pharmacy.setUpdatedAt(LocalDateTime.now());
        Pharmacy saved = pharmacyRepository.save(pharmacy);

        // Log the status change
        if (adminUserId != null) {
            auditLogService.logUserStatusChange(
                adminUserId,
                AdminAuditLog.TARGET_PHARMACY,
                pharmacyId,
                pharmacy.getName(),
                oldStatus,
                status,
                reason
            );
        }

        return mapToDto(saved);
    }

    public AdminPharmacyDto updateVerification(String pharmacyId, boolean verified) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
            .orElseThrow(() -> new ResourceNotFoundException("Pharmacy", "id", pharmacyId));

        pharmacy.setVerified(verified);
        pharmacy.setUpdatedAt(LocalDateTime.now());
        Pharmacy saved = pharmacyRepository.save(pharmacy);
        return mapToDto(saved);
    }

    public void deletePharmacy(String pharmacyId) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
            .orElseThrow(() -> new ResourceNotFoundException("Pharmacy", "id", pharmacyId));

        if (pharmacy.getUser() != null) {
            pharmacy.getUser().setStatus("Banned");
        }
        pharmacy.setActive(false);
        pharmacy.setUpdatedAt(LocalDateTime.now());
        pharmacyRepository.save(pharmacy);
    }

    private Sort resolveSort(String sortBy) {
        if (StringUtils.hasText(sortBy)) {
            switch (sortBy.toLowerCase()) {
                case "name-asc":
                    return Sort.by(Sort.Direction.ASC, "name");
                case "name-desc":
                    return Sort.by(Sort.Direction.DESC, "name");
                case "oldest":
                    return Sort.by(Sort.Direction.ASC, "createdAt");
                case "newest":
                default:
                    return Sort.by(Sort.Direction.DESC, "createdAt");
            }
        }
        return Sort.by(Sort.Direction.DESC, "createdAt");
    }

    private Specification<Pharmacy> buildSpecification(String searchTerm, String status, String city, String verified) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            var userJoin = root.join("user", jakarta.persistence.criteria.JoinType.LEFT);

            if (StringUtils.hasText(searchTerm)) {
                String term = "%" + searchTerm.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("name")), term),
                    cb.like(cb.lower(root.get("licenseNumber")), term),
                    cb.like(cb.lower(userJoin.get("email")), term),
                    cb.like(cb.lower(root.get("phoneNumber")), term),
                    cb.like(cb.lower(root.get("city")), term)
                ));
            }

            if (StringUtils.hasText(status)) {
                predicates.add(cb.equal(cb.lower(userJoin.get("status")), status.trim().toLowerCase()));
            }

            if (StringUtils.hasText(city)) {
                predicates.add(cb.equal(cb.lower(root.get("city")), city.trim().toLowerCase()));
            }

            if (StringUtils.hasText(verified)) {
                boolean isVerified = Boolean.parseBoolean(verified.trim());
                predicates.add(cb.equal(root.get("verified"), isVerified));
            }

            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }

    private AdminPharmacyDto mapToDto(Pharmacy pharmacy) {
        User user = pharmacy.getUser();
        String email = user != null ? user.getEmail() : null;
        String phone = user != null ? user.getPhoneNumber() : pharmacy.getPhoneNumber();
        String status = user != null ? user.getStatus() : null;
        LocalDateTime createdAt = user != null ? user.getCreatedDate() : pharmacy.getCreatedAt();

        return AdminPharmacyDto.builder()
            .pharmacyId(pharmacy.getPharmacyId())
            .name(pharmacy.getName())
            .licenseNumber(pharmacy.getLicenseNumber())
            .address(pharmacy.getAddress())
            .city(pharmacy.getCity())
            .district(pharmacy.getDistrict())
            .ward(pharmacy.getWard())
            .phoneNumber(phone)
            .email(email)
            .description(pharmacy.getDescription())
            .avatarUrl(pharmacy.getAvatarUrl())
            .openTime(pharmacy.getOpenTime())
            .closeTime(pharmacy.getCloseTime())
            .open24Hours(pharmacy.isOpen24Hours())
            .workingDays(pharmacy.getWorkingDays())
            .verified(pharmacy.isVerified())
            .active(pharmacy.isActive())
            .deliveryAvailable(pharmacy.isDeliveryAvailable())
            .deliveryRadius(pharmacy.getDeliveryRadius())
            .deliveryFee(pharmacy.getDeliveryFee())
            .averageRating(pharmacy.getAverageRating())
            .totalReviews(pharmacy.getTotalReviews())
            .totalEarnings(pharmacy.getTotalEarnings())
            .pendingSettlement(pharmacy.getPendingSettlement())
            .bankAccount(pharmacy.getBankAccount())
            .bankName(pharmacy.getBankName())
            .paypalEmail(pharmacy.getPaypalEmail())
            .status(status)
            .createdAt(createdAt)
            .updatedAt(pharmacy.getUpdatedAt())
            .build();
    }
}
