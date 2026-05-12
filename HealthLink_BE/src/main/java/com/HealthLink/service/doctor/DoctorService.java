package com.HealthLink.service.doctor;

import com.HealthLink.dto.response.DoctorProfileResponse;
import com.HealthLink.dto.response.DoctorResponse;
import com.HealthLink.dto.response.DoctorScheduleResponse;
import java.util.List;

/**
 * Service interface cho các tính năng liên quan đến Bác sĩ.
 */
public interface DoctorService {
    /**
     * Lấy danh sách bác sĩ, có thể lọc theo chuyên khoa và/hoặc tên.
     */
    List<DoctorResponse> getAllDoctors(String specialty, String name);

    /**
     * Lấy lịch làm việc của một bác sĩ cụ thể.
     */
    List<DoctorScheduleResponse> getDoctorSchedules(String doctorId);

    /**
     * Lấy hồ sơ đầy đủ của bác sĩ bao gồm thông tin thu nhập và chiết khấu.
     * Chỉ dành cho chính bác sĩ đó hoặc Admin.
     *
     * @param doctorId ID bác sĩ
     * @return DoctorProfileResponse với đầy đủ thông tin tài chính
     */
    DoctorProfileResponse getDoctorProfile(String doctorId);
}
