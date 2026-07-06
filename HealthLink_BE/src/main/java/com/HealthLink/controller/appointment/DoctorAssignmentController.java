/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.HealthLink.controller.appointment;

import com.HealthLink.dto.appointment.RecommendedDoctorRequest;
import com.HealthLink.dto.appointment.RecommendedDoctorResponse;
import com.HealthLink.service.appointment.DoctorAssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 *
 * @author ASUS
 */
@RestController
@RequestMapping("/api/appointments/doctor-assignment")
@RequiredArgsConstructor
public class DoctorAssignmentController {

    private final DoctorAssignmentService doctorAssignmentService;

    @PostMapping("/recommend")
    public ResponseEntity<RecommendedDoctorResponse> recommend(
        @RequestBody RecommendedDoctorRequest request
    ) {
        return ResponseEntity.ok(doctorAssignmentService.recommendDoctor(request));
    }
}
