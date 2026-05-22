package com.HealthLink.service.followup;

import com.HealthLink.dto.response.CompleteAppointmentResponse;
import com.HealthLink.dto.response.FollowUpCalendarResponse;
import com.HealthLink.dto.response.FollowUpSlotsResponse;
import com.HealthLink.entity.Appointment;

import java.time.LocalDate;
import java.time.LocalDateTime;

public interface FollowUpAppointmentService {

    FollowUpSlotsResponse getSlots(String doctorId, LocalDate date);

    FollowUpCalendarResponse getCalendar(String doctorId, String month);

    void validateFollowUpSlot(Appointment appointment, LocalDateTime followUpDate);

    CompleteAppointmentResponse completeAppointment(Integer appointmentId);
}
