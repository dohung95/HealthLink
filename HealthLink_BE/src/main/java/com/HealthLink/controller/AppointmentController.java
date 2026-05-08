package com.HealthLink.controller;

import com.HealthLink.dto.request.AppointmentRequest;
import com.HealthLink.dto.request.CancelAppointmentRequest;
import com.HealthLink.dto.response.AppointmentResponse;
import com.HealthLink.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller xử lý các endpoint liên quan đến lịch hẹn khám bệnh.
 *
 * <pre>
 * POST   /api/appointments                     → Đặt lịch khám mới
 * GET    /api/appointments/{id}                → Xem chi tiết lịch hẹn
 * GET    /api/appointments/patient/{patientId} → Danh sách lịch của bệnh nhân
 * PUT    /api/appointments/{id}/cancel         → Hủy lịch hẹn
 * </pre>
 */
@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    /**
     * Đặt lịch khám mới.
     *
     * <p>Request body ví dụ:
     * <pre>
     * {
     *   "patientId": "abc-123",
     *   "doctorId": "doc-456",
     *   "appointmentTime": "2025-06-15T09:00:00",
     *   "consultationType": "Video",
     *   "symptoms": "Đau đầu, sốt nhẹ",
     *   "notes": "Đã dùng paracetamol 2 ngày"
     * }
     * </pre>
     */
    @PostMapping
    public ResponseEntity<AppointmentResponse> createAppointment(
            @RequestBody AppointmentRequest request) {
        AppointmentResponse response = appointmentService.createAppointment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Xem chi tiết một lịch hẹn theo ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponse> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(appointmentService.getAppointmentById(id));
    }

    /**
     * Lấy toàn bộ lịch hẹn của một bệnh nhân.
     * Kết quả sắp xếp theo thời gian mới nhất trước.
     */
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<AppointmentResponse>> getByPatient(
            @PathVariable String patientId) {
        return ResponseEntity.ok(appointmentService.getPatientAppointments(patientId));
    }

    /**
     * Hủy một lịch hẹn.
     *
     * <p>Request body ví dụ:
     * <pre>
     * {
     *   "cancelReason": "Bận đột xuất",
     *   "cancelledBy": "Patient"
     * }
     * </pre>
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<AppointmentResponse> cancel(
            @PathVariable Integer id,
            @RequestBody CancelAppointmentRequest request) {
        return ResponseEntity.ok(appointmentService.cancelAppointment(id, request));
    }
}
