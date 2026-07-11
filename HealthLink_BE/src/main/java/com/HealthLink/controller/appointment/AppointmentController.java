package com.HealthLink.controller.appointment;

import com.HealthLink.dto.request.AppointmentRequest;
import com.HealthLink.dto.request.CancelAppointmentRequest;
import com.HealthLink.dto.request.CompleteAppointmentRequest;
import com.HealthLink.dto.request.HoldSlotRequest;
import com.HealthLink.dto.request.RescheduleAppointmentRequest;
import com.HealthLink.dto.consultation.FollowUpRequest;
import com.HealthLink.dto.consultation.FollowUpResponse;
import com.HealthLink.dto.consultation.ConsultationNotesRequest;
import com.HealthLink.dto.consultation.ConsultationResponse;
import com.HealthLink.dto.response.AppointmentResponse;
import com.HealthLink.dto.response.AvailableSlotsResponse;
import com.HealthLink.dto.response.CompleteAppointmentResponse;
import com.HealthLink.dto.response.DoctorDailyAppointmentsResponse;
import com.HealthLink.dto.response.HoldSlotResponse;
import com.HealthLink.dto.response.PagedResponse;
import com.HealthLink.service.followup.FollowUpAppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.HealthLink.service.appointment.AppointmentService;
import com.HealthLink.service.consultation.ConsultationService;
import java.time.LocalDate;

// Xử lý lịch hẹn
@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final ConsultationService consultationService;
    private final FollowUpAppointmentService followUpAppointmentService;

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

    @GetMapping("/patient/{patientId}/page")
    public ResponseEntity<PagedResponse<AppointmentResponse>> getByPatientPaged(
            @PathVariable String patientId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(defaultValue = "ALL") String status
    ) {
        return ResponseEntity.ok(
                appointmentService.getPatientAppointmentsPaged(
                        patientId,
                        page,
                        size,
                        status
                )
        );
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<AppointmentResponse>> getByDoctor(
            @PathVariable String doctorId) {
        return ResponseEntity.ok(appointmentService.getDoctorAppointments(doctorId));
    }

    @GetMapping("/doctor/{doctorId}/daily")
    public ResponseEntity<DoctorDailyAppointmentsResponse> getDoctorDaily(
            @PathVariable String doctorId,
            @RequestParam LocalDate date,
            @RequestParam(required = false, defaultValue = "All") String status) {
        return ResponseEntity.ok(appointmentService.getDoctorDailyAppointments(doctorId, date, status));
    }

    // Hủy một lịch hẹn
    @PutMapping("/{id}/cancel")
    public ResponseEntity<AppointmentResponse> cancel(
            @PathVariable Integer id,
            @RequestBody CancelAppointmentRequest request) {
        return ResponseEntity.ok(appointmentService.cancelAppointment(id, request));
    }

    @GetMapping("/{id}/reschedule-dates")
    public ResponseEntity<List<LocalDate>>
            getOnlineRescheduleDates(
                    @PathVariable Integer id
            ) {
        return ResponseEntity.ok(
                appointmentService
                        .getOnlineRescheduleDates(id)
        );
    }

    // Dời lịch hẹn sang thời gian mới
    @PutMapping("/{id}/reschedule")
    public ResponseEntity<AppointmentResponse> reschedule(
            @PathVariable Integer id,
            @RequestBody RescheduleAppointmentRequest request) {
        return ResponseEntity.ok(appointmentService.rescheduleAppointment(id, request));
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<CompleteAppointmentResponse> complete(
            @PathVariable Integer id,
            @RequestBody(required = false) CompleteAppointmentRequest request) {
        boolean copyPrescription = request != null && request.isCopyPrescription();
        return ResponseEntity.ok(followUpAppointmentService.completeAppointment(id, copyPrescription));
    }

    @PutMapping("/{id}/start")
    public ResponseEntity<ConsultationResponse> start(@PathVariable Integer id) {
        return ResponseEntity.ok(consultationService.startByAppointment(id));
    }

    @PutMapping("/{id}/notes")
    public ResponseEntity<ConsultationResponse> updateNotes(
            @PathVariable Integer id,
            @RequestBody ConsultationNotesRequest request) {
        return ResponseEntity.ok(consultationService.updateNotesByAppointment(id, request));
    }

    @PutMapping("/{id}/follow-up")
    public ResponseEntity<FollowUpResponse> updateFollowUp(
            @PathVariable Integer id,
            @RequestBody FollowUpRequest request) {
        return ResponseEntity.ok(consultationService.updateFollowUpByAppointment(id, request));
    }

    @GetMapping("/available-slots")
    public ResponseEntity<AvailableSlotsResponse> getAvailableSlots(
            @RequestParam String doctorId,
            @RequestParam LocalDate date,
            @RequestParam(required = false) String consultationType
    ) {
        return ResponseEntity.ok(
                appointmentService.getAvailableSlots(doctorId, date, consultationType)
        );
    }

    // Giữ tạm một slot khi patient vừa chọn giờ
    @PostMapping("/hold-slot")
    public ResponseEntity<HoldSlotResponse> holdSlot(
            @RequestBody HoldSlotRequest request
    ) {
        return ResponseEntity.ok(appointmentService.holdSlot(request));
    }

    @DeleteMapping("/hold-slot/{holdId}")
    public ResponseEntity<Void> releaseHold(@PathVariable Integer holdId) {
        appointmentService.releaseHold(holdId);
        return ResponseEntity.noContent().build();
    }

}
