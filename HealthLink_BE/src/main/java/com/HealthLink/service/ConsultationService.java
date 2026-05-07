package com.HealthLink.service;

import com.HealthLink.dto.consultation.FollowUpRequest;
import com.HealthLink.dto.consultation.FollowUpResponse;

public interface ConsultationService {

    /**
     * Cập nhật ngày và ghi chú tái khám vào buổi tư vấn.
     */
    FollowUpResponse updateFollowUp(Integer consultationId, FollowUpRequest request);

    /**
     * Lấy thông tin tái khám theo consultationId.
     */
    FollowUpResponse getFollowUp(Integer consultationId);
}
