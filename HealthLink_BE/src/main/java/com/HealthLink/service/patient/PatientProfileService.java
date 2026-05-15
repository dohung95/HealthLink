package com.HealthLink.service.patient;

import com.HealthLink.dto.auth.ChangeEmailRequest;
import com.HealthLink.dto.auth.ChangePasswordRequest;
import com.HealthLink.dto.auth.VerifyEmailChangeRequest;
import com.HealthLink.dto.patient.*;

/**
 * Service để quản lý profile của patient
 */
public interface PatientProfileService {
    
    /**
     * Lấy toàn bộ thông tin profile của patient (dựa trên JWT token)
     */
    PatientProfileDTO getPatientProfile(String userId);
    
    /**
     * Lấy thông tin profile patient bằng ID
     */
    PatientProfileDTO getPatientProfileById(String patientId);
    
    /**
     * Cập nhật thông tin patient (ngoài email)
     */
    PatientProfileDTO updatePatientProfile(String userId, UpdatePatientProfileRequest request);
    
    /**
     * Yêu cầu thay đổi email - gửi mail xác nhận với OTP
     * Trả về message yêu cầu confirm
     */
    String requestEmailChange(String userId, ChangeEmailRequest request);
    
    /**
     * Xác nhận thay đổi email bằng OTP
     */
    PatientProfileDTO verifyEmailChange(String userId, VerifyEmailChangeRequest request);

    /**
     * Đổi mật khẩu khi đã đăng nhập.
     * Xác nhận bằng currentPassword trước khi đổi.
     */
    void changePassword(String userId, com.HealthLink.dto.auth.ChangePasswordRequest request);
}
