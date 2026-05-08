package com.HealthLink.service.admin;

import com.HealthLink.dto.admin.AdminPatientDto;
import com.HealthLink.dto.admin.AdminPatientPageResponse;
import com.HealthLink.dto.admin.AdminPatientUpdateDto;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.User;
import com.HealthLink.repository.admin.AdminPatientRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@Transactional
public class AdminPatientService {

    private final AdminPatientRepository patientRepository;

    public AdminPatientService(AdminPatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    public AdminPatientPageResponse getPatients(int pageNumber, int pageSize, String searchTerm, String status, String sortBy) {
        Pageable pageable = PageRequest.of(Math.max(pageNumber - 1, 0), Math.max(pageSize, 1), resolveSort(sortBy));
        Specification<Patient> specification = buildSpecification(searchTerm, status);
        Page<Patient> page = patientRepository.findAll(specification, pageable);

        List<AdminPatientDto> patients = page.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());

        return new AdminPatientPageResponse(
            patients,
            page.getNumber() + 1,
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
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
                default:
                    return Sort.by(Sort.Direction.DESC, "fullName");
            }
        }
        return Sort.by(Sort.Direction.DESC, "fullName");
    }

    private Specification<Patient> buildSpecification(String searchTerm, String status) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            var userJoin = root.join("user", jakarta.persistence.criteria.JoinType.LEFT);

            if (StringUtils.hasText(searchTerm)) {
                String term = "%" + searchTerm.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("fullName")), term),
                    cb.like(cb.lower(userJoin.get("email")), term),
                    cb.like(cb.lower(userJoin.get("phoneNumber")), term)
                ));
            }

            if (StringUtils.hasText(status)) {
                predicates.add(cb.equal(cb.lower(userJoin.get("status")), status.trim().toLowerCase()));
            }

            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }

    private AdminPatientDto mapToDto(Patient patient) {
        User user = patient.getUser();
        String email = user != null ? user.getEmail() : null;
        String phone = user != null ? user.getPhoneNumber() : null;
        String status = user != null ? user.getStatus() : null;

        Integer age = null;
        if (patient.getDateOfBirth() != null) {
            LocalDate birthDate = patient.getDateOfBirth().toLocalDate();
            age = Period.between(birthDate, LocalDate.now()).getYears();
        }

        String lastVisit = null;
        if (patient.getAppointments() != null) {
            lastVisit = patient.getAppointments().stream()
                .filter(Objects::nonNull)
                .map(Appointment::getAppointmentTime)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .map(time -> time.format(DateTimeFormatter.ISO_LOCAL_DATE))
                .orElse(null);
        }

        return AdminPatientDto.builder()
            .patientID(patient.getPatientId())
            .fullName(patient.getFullName())
            .dateOfBirth(patient.getDateOfBirth())
            .age(age)
            .gender(patient.getGender())
            .email(email)
            .phone(phone)
            .status(status)
            .address(patient.getAddress())
            .city(patient.getCity())
            .country(patient.getCountry())
            .bloodType(patient.getBloodType())
            .occupation(patient.getOccupation())
            .preferredLanguage(patient.getPreferredLanguage())
            .preferredContactMethod(patient.getPreferredContactMethod())
            .emergencyContactName(patient.getEmergencyContactName())
            .emergencyContactPhone(patient.getEmergencyContactPhone())
            .emergencyContactRelationship(patient.getEmergencyContactRelationship())
            .medicalHistorySummary(patient.getMedicalHistorySummary())
            .insuranceProvider(patient.getInsuranceProvider())
            .insurancePolicyNumber(patient.getInsurancePolicyNumber())
            .lastVisit(lastVisit)
            // New fields
            .avatarUrl(patient.getAvatarUrl())
            .latitude(patient.getLatitude())
            .longitude(patient.getLongitude())
            .allergies(patient.getAllergies())
            .chronicConditions(patient.getChronicConditions())
            .currentMedications(patient.getCurrentMedications())
            .heightCm(patient.getHeightCm())
            .weightKg(patient.getWeightKg())
            .build();
    }

    public AdminPatientDto updatePatient(String patientId, AdminPatientUpdateDto updateDto) {
        Patient patient = patientRepository.findById(patientId)
            .orElseThrow(() -> new RuntimeException("Patient not found with ID: " + patientId));

        // Update patient fields
        if (updateDto.getFullName() != null) {
            patient.setFullName(updateDto.getFullName());
        }
        if (updateDto.getDateOfBirth() != null) {
            patient.setDateOfBirth(updateDto.getDateOfBirth().atStartOfDay());
        }
        if (updateDto.getGender() != null) {
            patient.setGender(updateDto.getGender());
        }
        if (updateDto.getAddress() != null) {
            patient.setAddress(updateDto.getAddress());
        }
        if (updateDto.getCity() != null) {
            patient.setCity(updateDto.getCity());
        }
        if (updateDto.getCountry() != null) {
            patient.setCountry(updateDto.getCountry());
        }
        if (updateDto.getBloodType() != null) {
            patient.setBloodType(updateDto.getBloodType());
        }
        if (updateDto.getOccupation() != null) {
            patient.setOccupation(updateDto.getOccupation());
        }
        if (updateDto.getPreferredLanguage() != null) {
            patient.setPreferredLanguage(updateDto.getPreferredLanguage());
        }
        if (updateDto.getPreferredContactMethod() != null) {
            patient.setPreferredContactMethod(updateDto.getPreferredContactMethod());
        }
        if (updateDto.getEmergencyContactName() != null) {
            patient.setEmergencyContactName(updateDto.getEmergencyContactName());
        }
        if (updateDto.getEmergencyContactPhone() != null) {
            patient.setEmergencyContactPhone(updateDto.getEmergencyContactPhone());
        }
        if (updateDto.getEmergencyContactRelationship() != null) {
            patient.setEmergencyContactRelationship(updateDto.getEmergencyContactRelationship());
        }
        if (updateDto.getMedicalHistorySummary() != null) {
            patient.setMedicalHistorySummary(updateDto.getMedicalHistorySummary());
        }
        if (updateDto.getInsuranceProvider() != null) {
            patient.setInsuranceProvider(updateDto.getInsuranceProvider());
        }
        if (updateDto.getInsurancePolicyNumber() != null) {
            patient.setInsurancePolicyNumber(updateDto.getInsurancePolicyNumber());
        }

        // New fields
        if (updateDto.getAvatarUrl() != null) {
            patient.setAvatarUrl(updateDto.getAvatarUrl());
        }
        if (updateDto.getLatitude() != null) {
            patient.setLatitude(updateDto.getLatitude());
        }
        if (updateDto.getLongitude() != null) {
            patient.setLongitude(updateDto.getLongitude());
        }
        if (updateDto.getAllergies() != null) {
            patient.setAllergies(updateDto.getAllergies());
        }
        if (updateDto.getChronicConditions() != null) {
            patient.setChronicConditions(updateDto.getChronicConditions());
        }
        if (updateDto.getCurrentMedications() != null) {
            patient.setCurrentMedications(updateDto.getCurrentMedications());
        }
        if (updateDto.getHeightCm() != null) {
            patient.setHeightCm(updateDto.getHeightCm());
        }
        if (updateDto.getWeightKg() != null) {
            patient.setWeightKg(updateDto.getWeightKg());
        }

        // Update user status if provided
        if (updateDto.getStatus() != null && patient.getUser() != null) {
            patient.getUser().setStatus(updateDto.getStatus());
        }

        // Save the updated patient
        Patient savedPatient = patientRepository.save(patient);

        return mapToDto(savedPatient);
    }

    public AdminPatientDto updatePatientStatus(String patientId, String status) {
        Patient patient = patientRepository.findById(patientId)
            .orElseThrow(() -> new RuntimeException("Patient not found with ID: " + patientId));

        if (patient.getUser() != null) {
            patient.getUser().setStatus(status);
            Patient savedPatient = patientRepository.save(patient);
            return mapToDto(savedPatient);
        } else {
            throw new RuntimeException("Patient has no associated user");
        }
    }
}
