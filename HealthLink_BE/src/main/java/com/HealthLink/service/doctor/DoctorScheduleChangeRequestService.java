package com.HealthLink.service.doctor;

import com.HealthLink.dto.doctor.schedule.DoctorScheduleChangeRequestRequest;
import com.HealthLink.dto.doctor.schedule.DoctorScheduleChangeRequestResponse;

import java.util.List;

public interface DoctorScheduleChangeRequestService {

    DoctorScheduleChangeRequestResponse createChangeRequest(String doctorId,
                                                           DoctorScheduleChangeRequestRequest request);

    List<DoctorScheduleChangeRequestResponse> getMyChangeRequests(String doctorId);

    List<DoctorScheduleChangeRequestResponse> getAllChangeRequests();

    DoctorScheduleChangeRequestResponse approveChangeRequest(Integer requestId,
                                                             String adminId,
                                                             String adminReason);

    DoctorScheduleChangeRequestResponse rejectChangeRequest(Integer requestId,
                                                            String adminId,
                                                            String adminReason);
}
