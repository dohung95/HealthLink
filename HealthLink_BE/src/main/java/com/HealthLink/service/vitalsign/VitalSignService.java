package com.HealthLink.service.vitalsign;

import com.HealthLink.dto.request.VitalSignRequest;
import com.HealthLink.dto.response.VitalSignResponse;

import java.util.List;

public interface VitalSignService {
    VitalSignResponse createVitalSign(VitalSignRequest request);

    List<VitalSignResponse> getByAppointment(Integer appointmentId);

    VitalSignResponse getLatestByAppointment(Integer appointmentId);

    List<VitalSignResponse> getByPatient(String patientId);
}