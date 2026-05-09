package com.HealthLink.service.doctor;

import com.HealthLink.dto.response.DoctorResponse;
import com.HealthLink.dto.response.DoctorScheduleResponse;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;

    private static final String[] DAY_NAMES =
            {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};

    // get list doctor, filter by name or specialty (param can null to foward filter)
    public List<DoctorResponse> getAllDoctors(String specialty, String name) {
        // Convert empty string to null so JPQL ignores the condition
        String specialtyFilter = (specialty != null && specialty.isBlank()) ? null : specialty;
        String nameFilter = (name != null && name.isBlank()) ? null : name;

        return doctorRepository.findByFilters(specialtyFilter, nameFilter)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // get list work schedule of doctor
    public List<DoctorScheduleResponse> getDoctorSchedules(String doctorId) {
        doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Not found doctor with ID: " + doctorId));

        return scheduleRepository.findByDoctor_DoctorId(doctorId)
                .stream()
                .map(this::toScheduleResponse)
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Convert Doctor entity to DoctorResponse DTO.
     */
    private DoctorResponse toResponse(Doctor d) {
        List<String> availableTypes = new ArrayList<>();
        if (d.isAvailableForVideo())   availableTypes.add("Video");
        if (d.isAvailableForAudio())   availableTypes.add("Audio");
        if (d.isAvailableForChat())    availableTypes.add("Chat");
        if (d.isAvailableForOffline()) availableTypes.add("Offline");

        // Prioritize getting the name from specialtyEntity, fallback to specialty field (String)
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
     * Convert DoctorSchedule entity to DoctorScheduleResponse DTO.
     */
    private DoctorScheduleResponse toScheduleResponse(DoctorSchedule s) {
        int day = s.getDayOfWeek() != null ? s.getDayOfWeek() : 0;
        return DoctorScheduleResponse.builder()
                .scheduleId(s.getScheduleId())
                .dayOfWeek(day)
                .dayName(DAY_NAMES[Math.min(day, 6)])
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .slotDuration(s.getSlotDuration())
                .consultationType(s.getConsultationType())
                .available(s.isAvailable())
                .build();
    }
}
