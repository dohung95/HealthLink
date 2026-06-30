package com.HealthLink.service.homevisit;

import com.HealthLink.dto.response.AvailableSessionResponse;
import com.HealthLink.dto.response.HomeVisitSlotResponse;
import com.HealthLink.entity.HomeVisitBooking;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface HomeVisitSessionService {

    List<AvailableSessionResponse> getAvailableSessions(String doctorId);

    boolean isSessionAvailable(String doctorId, Integer scheduleId, LocalDate date);

    HomeVisitBooking lockSession(String doctorId, Integer scheduleId, LocalDate date, Integer appointmentId);

    void releaseSession(Integer scheduleId, LocalDate date);

    List<HomeVisitSlotResponse> getAvailableSlots(
            String doctorId,
            Double visitLatitude,
            Double visitLongitude,
            List<Integer> homeVisitServiceIds
    );

    boolean isSlotAvailable(
            String doctorId,
            Integer scheduleId,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime
    );
}
