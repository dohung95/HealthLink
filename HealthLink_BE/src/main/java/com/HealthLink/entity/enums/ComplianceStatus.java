package com.HealthLink.entity.enums;

public enum ComplianceStatus {
    PENDING,        // Chưa bắt đầu xếp lịch cho tháng
    IN_PROGRESS,    // Đang xếp lịch nhưng chưa đủ giờ
    COMPLIANT,      // Đã đạt đủ số giờ tối thiểu
    NON_COMPLIANT,  // Kết thúc tháng mà không đạt đủ giờ
    EXEMPTED        // Được Admin miễn trừ yêu cầu
}
