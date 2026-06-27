package com.HealthLink.service.admin;

import com.HealthLink.dto.admin.*;
import com.HealthLink.dto.geocoding.GeocodeResponse;
import com.HealthLink.entity.AdminAuditLog;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.entity.DoctorScheduleException;
import com.HealthLink.entity.Specialty;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.ScheduleExceptionType;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.admin.AdminDoctorRepository;
import com.HealthLink.repository.admin.AdminAuditLogRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.repository.admin.DoctorScheduleExceptionRepository;
import com.HealthLink.repository.doctor.SpecialtyRepository;
import com.HealthLink.service.homevisit.HomeVisitLocationService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class AdminDoctorService {

    private final AdminDoctorRepository doctorRepository;
    private final AdminAuditLogService auditLogService;
    private final DoctorScheduleRepository scheduleRepository;
    private final DoctorScheduleExceptionRepository exceptionRepository;
    private final SpecialtyRepository specialtyRepository;
    private final HomeVisitLocationService homeVisitLocationService;

    public AdminDoctorService(AdminDoctorRepository doctorRepository,
                              AdminAuditLogService auditLogService,
                              DoctorScheduleRepository scheduleRepository,
                              DoctorScheduleExceptionRepository exceptionRepository,
                              SpecialtyRepository specialtyRepository,
                              HomeVisitLocationService homeVisitLocationService) {
        this.doctorRepository = doctorRepository;
        this.auditLogService = auditLogService;
        this.scheduleRepository = scheduleRepository;
        this.exceptionRepository = exceptionRepository;
        this.specialtyRepository = specialtyRepository;
        this.homeVisitLocationService = homeVisitLocationService;
    }

    public AdminDoctorPageResponse getDoctors(int pageNumber, int pageSize, String searchTerm,
                                               String status, String specialty, String sortBy) {
        Pageable pageable = PageRequest.of(Math.max(pageNumber - 1, 0), Math.max(pageSize, 1));
        Specification<Doctor> specification = buildSpecification(searchTerm, status, specialty, sortBy);
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
            String newSpecialtyName = updateDto.getSpecialty();
            doctor.setSpecialty(newSpecialtyName);

            // Also update specialtyEntity to keep both fields in sync
            Optional<Specialty> specialtyOpt = specialtyRepository.findByNameIgnoreCase(newSpecialtyName);
            if (specialtyOpt.isPresent()) {
                doctor.setSpecialtyEntity(specialtyOpt.get());
            } else {
                // If specialty not found in Specialty table, clear the relationship
                // This ensures Patient API will fallback to specialty String field
                doctor.setSpecialtyEntity(null);
            }
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
            try {
                GeocodeResponse geo = homeVisitLocationService.geocodeClinicAddressWithFallback(updateDto.getClinicAddress());
                doctor.setLatitude(geo.getLatitude());
                doctor.setLongitude(geo.getLongitude());
            } catch (Exception e) {
                doctor.setLatitude(null);
                doctor.setLongitude(null);
            }
        }
        if (updateDto.getAvailableForHomeVisit() != null) {
            doctor.setAvailableForHomeVisit(updateDto.getAvailableForHomeVisit());
        }
        if (updateDto.getHomeVisitRadiusKm() != null) {
            doctor.setHomeVisitRadiusKm(updateDto.getHomeVisitRadiusKm());
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
        return updateDoctorStatus(doctorId, status, null, null);
    }

    public AdminDoctorDto updateDoctorStatus(String doctorId, String status, String adminUserId, String reason) {
        Doctor doctor = doctorRepository.findById(doctorId)
            .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", doctorId));

        if (doctor.getUser() != null) {
            String oldStatus = doctor.getUser().getStatus();
            doctor.getUser().setStatus(status);
            Doctor savedDoctor = doctorRepository.save(doctor);

            // Log the status change
            if (adminUserId != null) {
                auditLogService.logUserStatusChange(
                    adminUserId,
                    AdminAuditLog.TARGET_DOCTOR,
                    doctorId,
                    doctor.getFullName(),
                    oldStatus,
                    status,
                    reason
                );
            }

            return mapToDto(savedDoctor);
        } else {
            throw new BadRequestException("Doctor has no associated user");
        }
    }

    public void deleteDoctor(String doctorId) {
        Doctor doctor = doctorRepository.findById(doctorId)
            .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", doctorId));

        boolean hasFutureAppointments = doctor.getAppointments() != null
                && doctor.getAppointments().stream()
                    .filter(a -> a != null && a.getAppointmentTime() != null)
                    .anyMatch(a -> a.getAppointmentTime().toLocalDate().isAfter(LocalDate.now()));
        if (hasFutureAppointments) {
            throw new BadRequestException("Cannot delete doctor with future appointments");
        }

        // Soft delete by setting status to "Deleted"
        if (doctor.getUser() != null) {
            doctor.getUser().setStatus("Deleted");
            doctorRepository.save(doctor);
        } else {
            throw new BadRequestException("Doctor has no associated user");
        }
    }

    /**
     * Lấy danh sách bác sĩ có lịch làm việc vào ngày cụ thể.
     * Logic:
     * 1. Lấy tất cả bác sĩ Active theo specialty (nếu có)
     * 2. Filter những bác sĩ có schedule vào dayOfWeek của ngày đó
     * 3. Loại trừ những bác sĩ có exception DayOff vào ngày đó
     * 4. Bao gồm những bác sĩ có exception AddSlot vào ngày đó (dù không có schedule cố định)
     *
     * @param date Ngày cần kiểm tra
     * @param specialty Chuyên khoa (optional)
     * @param excludeDoctorId ID bác sĩ cần loại trừ (bác sĩ hiện tại)
     * @return Danh sách bác sĩ available
     */
    public List<AdminDoctorDto> getDoctorsAvailableOnDate(LocalDate date, String specialty, String excludeDoctorId) {
        // Tính dayOfWeek: Java DayOfWeek (1=Monday...7=Sunday) -> convert to (0=Sunday, 1=Monday...6=Saturday)
        int javaDayOfWeek = date.getDayOfWeek().getValue(); // 1=Mon, 7=Sun
        int dayOfWeek = javaDayOfWeek == 7 ? 0 : javaDayOfWeek; // Convert: Sun=0, Mon=1...Sat=6

        // Lấy tất cả bác sĩ Active
        Specification<Doctor> spec = buildSpecification(null, "Active", specialty, null);
        List<Doctor> allActiveDoctors = doctorRepository.findAll(spec);

        List<AdminDoctorDto> availableDoctors = new ArrayList<>();

        for (Doctor doctor : allActiveDoctors) {
            // Loại trừ bác sĩ hiện tại
            if (excludeDoctorId != null && doctor.getDoctorId().equals(excludeDoctorId)) {
                continue;
            }

            if (isDoctorWorkingOnDate(doctor.getDoctorId(), date, dayOfWeek)) {
                availableDoctors.add(mapToDto(doctor));
            }
        }

        return availableDoctors;
    }

    /**
     * Kiểm tra bác sĩ có làm việc vào ngày cụ thể không.
     */
    private boolean isDoctorWorkingOnDate(String doctorId, LocalDate date, int dayOfWeek) {
        // Kiểm tra exception trước
        Optional<DoctorScheduleException> exceptionOpt = exceptionRepository
                .findByDoctor_DoctorIdAndExceptionDate(doctorId, date);

        if (exceptionOpt.isPresent()) {
            DoctorScheduleException exception = exceptionOpt.get();
            ScheduleExceptionType exceptionType = exception.getExceptionType();

            if (exceptionType == ScheduleExceptionType.DAY_OFF) {
                return false;
            }

            if (exceptionType == ScheduleExceptionType.ADD_SLOT || exceptionType == ScheduleExceptionType.MODIFIED) {
                return true;
            }
        }

        // Kiểm tra schedule cố định theo dayOfWeek
        List<DoctorSchedule> schedules = scheduleRepository
                .findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue(doctorId, dayOfWeek);

        return !schedules.isEmpty();
    }

    private Specification<Doctor> buildSpecification(String searchTerm, String status, String specialty, String sortBy) {
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

            // Apply sorting - sort by user.createdDate for newest/oldest
            if (query != null && query.getResultType() != Long.class && query.getResultType() != long.class) {
                if (StringUtils.hasText(sortBy)) {
                    switch (sortBy.toLowerCase()) {
                        case "newest":
                            query.orderBy(cb.desc(userJoin.get("createdDate")));
                            break;
                        case "oldest":
                            query.orderBy(cb.asc(userJoin.get("createdDate")));
                            break;
                        case "name_asc":
                        case "name-asc":
                            query.orderBy(cb.asc(root.get("fullName")));
                            break;
                        case "name_desc":
                        case "name-desc":
                            query.orderBy(cb.desc(root.get("fullName")));
                            break;
                        default:
                            query.orderBy(cb.desc(userJoin.get("createdDate")));
                    }
                } else {
                    query.orderBy(cb.desc(userJoin.get("createdDate")));
                }
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
                .filter(apt -> "COMPLETED".equalsIgnoreCase(apt.getStatus()))
                .count();
        }

        return AdminDoctorDto.builder()
            .doctorId(doctor.getDoctorId())
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
            .availableForHomeVisit(doctor.getAvailableForHomeVisit())
            .homeVisitRadiusKm(doctor.getHomeVisitRadiusKm())
            .latitude(doctor.getLatitude())
            .longitude(doctor.getLongitude())
            .services(doctor.getServices() != null
                ? doctor.getServices().stream()
                    .map(ds -> ds.getId().getServiceType().name())
                    .collect(Collectors.toSet())
                : Set.of())
            .createdAt(createdAt)
            .build();
    }
}
