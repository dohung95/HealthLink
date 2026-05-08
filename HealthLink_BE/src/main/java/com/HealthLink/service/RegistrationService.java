package com.HealthLink.service;

import com.HealthLink.dto.registration.*;
import com.HealthLink.entity.Specialty;

import java.util.List;

public interface RegistrationService {

    RegistrationRequestResponse submitDoctorRegistration(DoctorRegistrationRequest request);

    RegistrationRequestResponse submitPharmacyRegistration(PharmacyRegistrationRequest request);

    RegistrationPageResponse getRegistrations(int pageNumber, int pageSize, String type, String status, String sortBy);

    RegistrationRequestResponse getRegistrationById(Long requestId);

    RegistrationRequestResponse approveOrReject(Long requestId, ApproveRejectRequest request, String adminUserId);

    List<Specialty> getActiveSpecialties();
}
