package com.HealthLink.service.appointment;

import com.HealthLink.dto.request.AppointmentRequest;
import com.HealthLink.dto.request.CancelAppointmentRequest;
import com.HealthLink.dto.request.RescheduleAppointmentRequest;
import com.HealthLink.dto.response.AppointmentResponse;

import java.util.List;

/**
 * Contract for appointment business logic.
 */
public interface AppointmentService {

    /**
     * Book a new appointment for a patient.
     * @param request
     * @return 
     */
    AppointmentResponse createAppointment(AppointmentRequest request);

    /**
     * Get all appointments of a specific patient, sorted by latest first.
     * @param patientId
     * @return 
     */
    List<AppointmentResponse> getPatientAppointments(String patientId);

    /**
     * Get appointment details by ID.
     * @param id
     * @return 
     */
    AppointmentResponse getAppointmentById(Integer id);

    /**
     * Cancel an appointment.
     * @param id
     * @param request
     * @return 
     */
    AppointmentResponse cancelAppointment(Integer id, CancelAppointmentRequest request);

    /**
     * Reschedule an appointment to a new time.
     * @param id
     * @param request
     * @return 
     */
    AppointmentResponse rescheduleAppointment(Integer id, RescheduleAppointmentRequest request);
}
