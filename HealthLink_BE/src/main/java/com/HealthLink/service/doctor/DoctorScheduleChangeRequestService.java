package com.HealthLink.service.doctor;

import com.HealthLink.dto.doctor.schedule.DoctorScheduleChangeRequestRequest;
import com.HealthLink.dto.doctor.schedule.DoctorScheduleChangeRequestResolveRequest;
import com.HealthLink.dto.doctor.schedule.DoctorScheduleChangeRequestResponse;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;

public interface DoctorScheduleChangeRequestService {

    DoctorScheduleChangeRequestResponse createChangeRequest(String doctorId,
                                                           DoctorScheduleChangeRequestRequest request);

    List<DoctorScheduleChangeRequestResponse> getMyChangeRequests(String doctorId);

    List<DoctorScheduleChangeRequestResponse> getAllChangeRequests();

    DoctorScheduleChangeRequestResponse approveChangeRequest(Integer requestId,
                                                             String adminId,
                                                             DoctorScheduleChangeRequestResolveRequest resolveRequest,
                                                             HttpServletRequest httpRequest);

    DoctorScheduleChangeRequestResponse rejectChangeRequest(Integer requestId,
                                                            String adminId,
                                                            String adminReason);
}
