/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Interface.java to edit this template
 */
package com.HealthLink.service.doctor;

import com.HealthLink.dto.response.DoctorResponse;
import com.HealthLink.dto.response.DoctorScheduleResponse;
import java.util.List;

/**
 *
 * @author ASUS
 */
public interface DoctorService {
    /**
     * Get all doctors, optionally filtered by specialty and/or name.
     * @param specialty
     * @param name
     * @return 
     */
    List<DoctorResponse> getAllDoctors(String specialty, String name);
    /**
     * Get work schedules for a specific doctor.
     * @param doctorId
     * @return 
     */
    List<DoctorScheduleResponse> getDoctorSchedules(String doctorId);
}
