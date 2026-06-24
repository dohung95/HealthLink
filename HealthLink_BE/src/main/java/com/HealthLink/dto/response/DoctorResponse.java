package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * Response thông tin bác sĩ dùng cho danh sách tìm kiếm.
 */
@Data
@Builder
public class DoctorResponse {

    private String doctorId;
    private String fullName;
    private String specialtyName;
    private String qualifications;
    private Integer yearsOfExperience;
    private String languageSpoken;
    private String location;
    private String avatarUrl;
    private String bio;
    private BigDecimal consultationFee;
    private Double averageRating;
    private Integer totalReviews;

    /** Các loại tư vấn bác sĩ hỗ trợ: ["Video", "Chat", ...] */
    private List<String> availableTypes;
    private Boolean availableForHomeVisit;
    private Double homeVisitRadiusKm;
}
