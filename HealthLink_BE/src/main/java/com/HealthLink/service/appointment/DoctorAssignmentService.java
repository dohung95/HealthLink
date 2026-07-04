package com.HealthLink.service.appointment;

import com.HealthLink.dto.appointment.RecommendedDoctorRequest;
import com.HealthLink.dto.appointment.RecommendedDoctorResponse;

public interface DoctorAssignmentService {
    RecommendedDoctorResponse recommendDoctor(RecommendedDoctorRequest request);
}