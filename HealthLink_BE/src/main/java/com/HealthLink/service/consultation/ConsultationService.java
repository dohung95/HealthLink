package com.HealthLink.service.consultation;

import com.HealthLink.dto.consultation.ConsultationNotesRequest;
import com.HealthLink.dto.consultation.ConsultationResponse;
import com.HealthLink.dto.consultation.FollowUpRequest;
import com.HealthLink.dto.consultation.FollowUpResponse;

public interface ConsultationService {

    /**
     * Cập nhật ngày và ghi chú tái khám vào buổi tư vấn.
     */
    FollowUpResponse updateFollowUp(Integer consultationId, FollowUpRequest request);

    FollowUpResponse updateFollowUpByAppointment(Integer appointmentId, FollowUpRequest request);

    ConsultationResponse startByAppointment(Integer appointmentId);

    ConsultationResponse updateNotesByAppointment(Integer appointmentId, ConsultationNotesRequest request);

    /**
     * Lấy thông tin tái khám theo consultationId.
     */
    FollowUpResponse getFollowUp(Integer consultationId);
}
