package com.HealthLink.service.admin;

import com.HealthLink.dto.admin.*;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.User;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.admin.AdminDoctorRepository;
import jakarta.transaction.Transactional;
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
public class AdminDoctorService {

    private final AdminDoctorRepository doctorRepository;

    public AdminDoctorService(AdminDoctorRepository doctorRepository) {
        this.doctorRepository = doctorRepository;
    }

    public AdminDoctorPageResponse getDoctors(int pageNumber, int pageSize, String searchTerm,
                                               String status, String specialty, String sortBy) {
        Pageable pageable = PageRequest.of(Math.max(pageNumber - 1, 0), Math.max(pageSize, 1), resolveSort(sortBy));
        Specification<Doctor> specification = buildSpecification(searchTerm, status, specialty);
        Page<Doctor> page = doctorRepository.findAll(specification, pageable);

        List<AdminDoctorDto> doctors = page.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());

        return new AdminDoctorPageResponse(
            doctors,
            page.getNumber() + 1,
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
    }

    public AdminDoctorDto getDoctorById(String doctorId) {
        Doctor doctor = doctorRepository.findById(doctorId)
            .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", doctorId));
        return mapToDto(doctor);
    }

    public AdminDoctorDto updateDoctor(String doctorId, AdminDoctorUpdateDto updateDto) {
        Doctor doctor = doctorRepository.findById(doctorId)
            .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", doctorId));

        // Update doctor fields
        if (StringUtils.hasText(updateDto.getFullName())) {
            doctor.setFullName(updateDto.getFullName());
        }
        if (StringUtils.hasText(updateDto.getSpecialty())) {
            doctor.setSpecialty(updateDto.getSpecialty());
        }
        if (StringUtils.hasText(updateDto.getQualifications())) {
            doctor.setQualifications(updateDto.getQualifications());
        }
        if (updateDto.getYearsOfExperience() != null) {
            doctor.setYearsOfExperience(updateDto.getYearsOfExperience());
        }
        if (StringUtils.hasText(updateDto.getLanguageSpoken())) {
            doctor.setLanguageSpoken(updateDto.getLanguageSpoken());
        }
        if (StringUtils.hasText(updateDto.getLocation())) {
            doctor.setLocation(updateDto.getLocation());
        }
        if (updateDto.getBio() != null) {
            doctor.setBio(updateDto.getBio());
        }
        if (updateDto.getConsultationFee() != null) {
            doctor.setConsultationFee(updateDto.getConsultationFee());
        }
        if (updateDto.getClinicName() != null) {
            doctor.setClinicName(updateDto.getClinicName());
        }
        if (updateDto.getClinicAddress() != null) {
            doctor.setClinicAddress(updateDto.getClinicAddress());
        }

        // Update user fields
        if (doctor.getUser() != null) {
            if (StringUtils.hasText(updateDto.getPhoneNumber())) {
                doctor.getUser().setPhoneNumber(updateDto.getPhoneNumber());
            }
            if (StringUtils.hasText(updateDto.getStatus())) {
                doctor.getUser().setStatus(updateDto.getStatus());
            }
        }

        Doctor savedDoctor = doctorRepository.save(doctor);
        return mapToDto(savedDoctor);
    }

    public AdminDoctorDto updateDoctorStatus(String doctorId, String status) {
        Doctor doctor = doctorRepository.findById(doctorId)
            .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", doctorId));

        if (doctor.getUser() != null) {
            doctor.getUser().setStatus(status);
            Doctor savedDoctor = doctorRepository.save(doctor);
            return mapToDto(savedDoctor);
        } else {
            throw new BadRequestException("Doctor has no associated user");
        }
    }

    public void deleteDoctor(String doctorId) {
        Doctor doctor = doctorRepository.findById(doctorId)
            .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", doctorId));

        // Soft delete by setting status to "Deleted"
        if (doctor.getUser() != null) {
            doctor.getUser().setStatus("Deleted");
            doctorRepository.save(doctor);
        } else {
            throw new BadRequestException("Doctor has no associated user");
        }
    }

    private Sort resolveSort(String sortBy) {
        if (StringUtils.hasText(sortBy)) {
            switch (sortBy.toLowerCase()) {
                case "oldest":
                    return Sort.by(Sort.Direction.ASC, "fullName");
                case "name-asc":
                    return Sort.by(Sort.Direction.ASC, "fullName");
                case "name-desc":
                    return Sort.by(Sort.Direction.DESC, "fullName");
                case "newest":
                default:
                    return Sort.by(Sort.Direction.DESC, "fullName");
            }
        }
        return Sort.by(Sort.Direction.DESC, "fullName");
    }

    private Specification<Doctor> buildSpecification(String searchTerm, String status, String specialty) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            var userJoin = root.join("user", jakarta.persistence.criteria.JoinType.LEFT);

            if (StringUtils.hasText(searchTerm)) {
                String term = "%" + searchTerm.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("fullName")), term),
                    cb.like(cb.lower(userJoin.get("email")), term),
                    cb.like(cb.lower(root.get("specialty")), term)
                ));
            }

            if (StringUtils.hasText(status)) {
                // Handle case-insensitive status comparison and ensure user is not null
                predicates.add(cb.and(
                    cb.isNotNull(userJoin.get("status")),
                    cb.equal(cb.lower(userJoin.get("status")), status.trim().toLowerCase())
                ));
            }

            if (StringUtils.hasText(specialty)) {
                // Use LIKE for more flexible matching (e.g., "Cardiology" matches "General Cardiology")
                predicates.add(cb.like(cb.lower(root.get("specialty")), "%" + specialty.trim().toLowerCase() + "%"));
            }

            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }

    private AdminDoctorDto mapToDto(Doctor doctor) {
        User user = doctor.getUser();
        String email = user != null ? user.getEmail() : null;
        String phone = user != null ? user.getPhoneNumber() : null;
        String status = user != null ? user.getStatus() : null;
        LocalDateTime createdAt = user != null ? user.getCreatedDate() : null;

        // Count consultations from appointments
        int totalConsultations = 0;
        if (doctor.getAppointments() != null) {
            totalConsultations = (int) doctor.getAppointments().stream()
                .filter(Objects::nonNull)
                .filter(apt -> "Completed".equalsIgnoreCase(apt.getStatus()))
                .count();
        }

        return AdminDoctorDto.builder()
            .doctorID(doctor.getDoctorId())
            .fullName(doctor.getFullName())
            .email(email)
            .phone(phone)
            .status(status)
            .specialty(doctor.getSpecialty())
            .qualifications(doctor.getQualifications())
            .yearsOfExperience(doctor.getYearsOfExperience())
            .languageSpoken(doctor.getLanguageSpoken())
            .location(doctor.getLocation())
            .bio(doctor.getBio())
            .consultationFee(doctor.getConsultationFee())
            .clinicName(doctor.getClinicName())
            .clinicAddress(doctor.getClinicAddress())
            .rating(doctor.getAverageRating())
            .totalReviews(doctor.getTotalReviews())
            .totalConsultations(totalConsultations)
            .avatarUrl(doctor.getAvatarUrl())
            .verified(doctor.isVerified())
            .availableForVideo(doctor.isAvailableForVideo())
            .availableForAudio(doctor.isAvailableForAudio())
            .availableForChat(doctor.isAvailableForChat())
            .availableForOffline(doctor.isAvailableForOffline())
            .createdAt(createdAt)
            .build();
    }
}
