package com.HealthLink.service.followup;

import com.HealthLink.dto.consultation.FollowUpRequest;
import com.HealthLink.dto.consultation.FollowUpResponse;
import com.HealthLink.dto.consultation.FollowUpStatusResponse;
import com.HealthLink.dto.response.CompleteAppointmentResponse;
import com.HealthLink.dto.response.FollowUpCalendarResponse;
import com.HealthLink.dto.response.FollowUpSlotsResponse;
import com.HealthLink.entity.Appointment;

import java.time.LocalDate;
import java.time.LocalDateTime;

public interface FollowUpAppointmentService {

    FollowUpSlotsResponse getSlots(String doctorId, LocalDate date, String consultationType);

    FollowUpCalendarResponse getCalendar(String doctorId, String month, String consultationType);

    void validateFollowUpSlot(Appointment appointment, LocalDateTime followUpDate, String consultationType);

    FollowUpResponse scheduleFollowUpAppointment(Appointment sourceAppointment, FollowUpRequest request);

    void cancelPendingFollowUp(Appointment sourceAppointment);

    FollowUpResponse sendPaymentRequest(Appointment sourceAppointment);
    FollowUpStatusResponse getFollowUpStatus(Integer appointmentId);
    void confirmFollowUp(Integer appointmentId);
    void denyFollowUp(Integer appointmentId);

    CompleteAppointmentResponse completeAppointment(Integer appointmentId, boolean copyPrescription);
}
