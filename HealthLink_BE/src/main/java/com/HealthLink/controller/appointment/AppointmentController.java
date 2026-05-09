package com.HealthLink.controller.appointment;

import com.HealthLink.dto.request.AppointmentRequest;
import com.HealthLink.dto.request.CancelAppointmentRequest;
import com.HealthLink.dto.request.RescheduleAppointmentRequest;
import com.HealthLink.dto.response.AppointmentResponse;
import com.HealthLink.service.appointment.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Xử lý lịch hẹn
@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    // Đặt lịch khám mới
    @PostMapping
    public ResponseEntity<AppointmentResponse> createAppointment(
            @RequestBody AppointmentRequest request) {
        AppointmentResponse response = appointmentService.createAppointment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Xem chi tiết một lịch hẹn theo ID
    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponse> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(appointmentService.getAppointmentById(id));
    }

    // Lấy toàn bộ lịch hẹn của một bệnh nhân. Kết quả sắp xếp theo thời gian mới nhất trước
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<AppointmentResponse>> getByPatient(
            @PathVariable String patientId) {
        return ResponseEntity.ok(appointmentService.getPatientAppointments(patientId));
    }

    // Hủy một lịch hẹn
    @PutMapping("/{id}/cancel")
    public ResponseEntity<AppointmentResponse> cancel(
            @PathVariable Integer id,
            @RequestBody CancelAppointmentRequest request) {
        return ResponseEntity.ok(appointmentService.cancelAppointment(id, request));
    }

    // Dời lịch hẹn sang thời gian mới
    @PutMapping("/{id}/reschedule")
    public ResponseEntity<AppointmentResponse> reschedule(
            @PathVariable Integer id,
            @RequestBody RescheduleAppointmentRequest request) {
        return ResponseEntity.ok(appointmentService.rescheduleAppointment(id, request));
    }

}
