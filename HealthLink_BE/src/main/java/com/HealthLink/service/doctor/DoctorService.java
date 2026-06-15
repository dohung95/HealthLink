package com.HealthLink.service.doctor;

import com.HealthLink.dto.response.DoctorProfileResponse;
import com.HealthLink.dto.response.DoctorPatientHistoryResponse;
import com.HealthLink.dto.response.DoctorPatientPageResponse;
import com.HealthLink.dto.response.DoctorResponse;
import com.HealthLink.dto.response.DoctorScheduleResponse;
import java.util.List;
import com.HealthLink.dto.response.PagedResponse;

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

    DoctorPatientPageResponse getMyPatients(String doctorId, String searchTerm, String status, int page, int pageSize);

    DoctorPatientHistoryResponse getMyPatientHistory(String doctorId, String patientId);

    /**
     * Lấy hồ sơ đầy đủ của bác sĩ bao gồm thông tin thu nhập và chiết khấu. Chỉ
     * dành cho chính bác sĩ đó hoặc Admin.
     *
     * @param doctorId ID bác sĩ
     * @return DoctorProfileResponse với đầy đủ thông tin tài chính
     */
    DoctorProfileResponse getDoctorProfile(String doctorId);

    /**
     * Cập nhật thông tin do bác sĩ được phép thay đổi. Chỉ cho phép bác sĩ cập
     * nhật các trường hạn chế.
     *
     * @param doctorId ID bác sĩ
     * @param updateRequest dữ liệu cần cập nhật
     * @return DoctorProfileResponse sau khi cập nhật
     */
    DoctorProfileResponse updateDoctorProfile(String doctorId, com.HealthLink.dto.doctor.DoctorUpdateRequest updateRequest);

    /**
     * Yêu cầu đổi email - gửi mã xác nhận về email mới.
     */
    String requestEmailChange(String doctorId, com.HealthLink.dto.auth.ChangeEmailRequest request);

    /**
     * Xác nhận đổi email với mã code.
     */
    DoctorProfileResponse verifyEmailChange(String doctorId, com.HealthLink.dto.auth.VerifyEmailChangeRequest request);

    /**
     * Yêu cầu đổi mật khẩu - gửi OTP về email đã đăng ký.
     */
    String requestPasswordChange(String doctorId);

    /**
     * Xác nhận OTP và đổi mật khẩu.
     */
    void verifyPasswordChange(String doctorId, com.HealthLink.dto.auth.PasswordChangeVerifyRequest request);

    /**
     * Upload ảnh đại diện cho bác sĩ. Lưu file vào uploads/avatars/doctors/ và
     * cập nhật DB. Trả về URL công khai của ảnh vừa upload.
     */
    String uploadAvatar(String doctorId, org.springframework.web.multipart.MultipartFile file)
            throws java.io.IOException;

    PagedResponse<DoctorResponse> searchDoctors(
            String specialty,
            String name,
            String location,
            int page,
            int pageSize
    );

    List<String> getSpecialties();
}
