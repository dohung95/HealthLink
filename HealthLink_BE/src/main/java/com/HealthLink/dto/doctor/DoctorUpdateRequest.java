package com.HealthLink.dto.doctor;

import lombok.*;

/**
 * Request body cho bác sĩ cập nhật hồ sơ cá nhân.
 * Chỉ chứa những trường được phép thay đổi bởi bác sĩ.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorUpdateRequest {

    private String avatarUrl;
    private String bio;
    private String phoneNumber;
}
