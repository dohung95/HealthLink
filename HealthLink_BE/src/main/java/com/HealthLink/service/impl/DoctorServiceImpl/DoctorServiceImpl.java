package com.HealthLink.service.impl.DoctorServiceImpl;

import com.HealthLink.dto.response.DoctorProfileResponse;
import com.HealthLink.dto.response.DoctorResponse;
import com.HealthLink.dto.response.DoctorScheduleResponse;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.service.doctor.DoctorService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DoctorServiceImpl implements DoctorService {

    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;

    private static final String[] DAY_NAMES =
            {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};

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
     * Lấy hồ sơ đầy đủ của bác sĩ bao gồm thông tin thu nhập/chiết khấu.
     * Chỉ dành cho chính bác sĩ đó hoặc Admin.
     */
    @Override
    public DoctorProfileResponse getDoctorProfile(String doctorId) {
        Doctor d = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Not found doctor with ID: " + doctorId));

        List<String> availableTypes = new ArrayList<>();
        if (d.isAvailableForVideo())   availableTypes.add("Video");
        if (d.isAvailableForAudio())   availableTypes.add("Audio");
        if (d.isAvailableForChat())    availableTypes.add("Chat");
        if (d.isAvailableForOffline()) availableTypes.add("Offline");

        String specialtyName = (d.getSpecialtyEntity() != null)
                ? d.getSpecialtyEntity().getName()
                : d.getSpecialty();

        return DoctorProfileResponse.builder()
                .doctorId(d.getDoctorId())
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

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Chuyển đổi Doctor entity thành DoctorResponse DTO (công khai, dùng cho bệnh nhân tìm kiếm).
     */
    private DoctorResponse toResponse(Doctor d) {
        List<String> availableTypes = new ArrayList<>();
        if (d.isAvailableForVideo())   availableTypes.add("Video");
        if (d.isAvailableForAudio())   availableTypes.add("Audio");
        if (d.isAvailableForChat())    availableTypes.add("Chat");
        if (d.isAvailableForOffline()) availableTypes.add("Offline");

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
                .dayName(DAY_NAMES[Math.min(day, 6)])
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .slotDuration(s.getSlotDuration())
                .consultationType(s.getConsultationType())
                .available(s.isAvailable())
                .build();
    }
}
