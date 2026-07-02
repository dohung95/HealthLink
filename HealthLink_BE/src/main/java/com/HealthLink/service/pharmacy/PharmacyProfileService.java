package com.HealthLink.service.pharmacy;

import com.HealthLink.dto.auth.ChangeEmailRequest;
import com.HealthLink.dto.auth.ChangePasswordRequest;
import com.HealthLink.dto.auth.VerifyEmailChangeRequest;
import com.HealthLink.dto.pharmacy.PharmacyProfileResponse;
import com.HealthLink.dto.pharmacy.PharmacyUpdateRequest;

/**
 * Service interface cho Pharmacy profile management.
 */
public interface PharmacyProfileService {

    /** Lấy thông tin profile của pharmacy theo ID. */
    PharmacyProfileResponse getPharmacyProfile(String pharmacyId);

    /** Cập nhật các trường được phép sửa. */
    PharmacyProfileResponse updatePharmacyProfile(String pharmacyId, PharmacyUpdateRequest request);

    /** Yêu cầu đổi email – gửi mã OTP về email mới. */
    String requestEmailChange(String pharmacyId, ChangeEmailRequest request);

    /** Xác nhận đổi email bằng mã OTP. */
    PharmacyProfileResponse verifyEmailChange(String pharmacyId, VerifyEmailChangeRequest request);

    void changePassword(String pharmacyId, ChangePasswordRequest request);

    /**
     * Upload ảnh đại diện cho nhà thuốc.
     * Lưu file vào uploads/avatars/pharmacies/ và cập nhật DB.
     * Trả về URL công khai của ảnh vừa upload.
     */
    String uploadAvatar(String pharmacyId, org.springframework.web.multipart.MultipartFile file)
            throws java.io.IOException;

    /** Lấy danh sách nhà thuốc đang hoạt động và đã xác minh. */
    java.util.List<PharmacyProfileResponse> getActiveVerifiedPharmacies(Boolean deliveryOnly);

    /** Bật/tắt trạng thái online (nhận đơn) của nhà thuốc. */
    PharmacyProfileResponse toggleOnline(String pharmacyId);
}
