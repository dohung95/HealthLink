package com.HealthLink.controller.followup;

import com.HealthLink.dto.consultation.FollowUpResponse;
import com.HealthLink.dto.consultation.FollowUpStatusResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.service.followup.FollowUpAppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/follow-up")
@RequiredArgsConstructor
public class FollowUpPaymentController {

    private final FollowUpAppointmentService followUpAppointmentService;
    private final AppointmentRepository appointmentRepository;

    @PostMapping("/{appointmentId}/send-payment-request")
    public ResponseEntity<FollowUpResponse> sendPaymentRequest(
            @PathVariable Integer appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Appointment", "id", appointmentId));
        FollowUpResponse response = followUpAppointmentService.sendPaymentRequest(appointment);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{appointmentId}/status")
    public ResponseEntity<FollowUpStatusResponse> getStatus(@PathVariable Integer appointmentId) {
        FollowUpStatusResponse status = followUpAppointmentService.getFollowUpStatus(appointmentId);
        return ResponseEntity.ok(status);
    }

    @PostMapping("/{appointmentId}/confirm")
    public ResponseEntity<Void> confirm(@PathVariable Integer appointmentId) {
        followUpAppointmentService.confirmFollowUp(appointmentId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{appointmentId}/deny")
    public ResponseEntity<Void> deny(@PathVariable Integer appointmentId) {
        followUpAppointmentService.denyFollowUp(appointmentId);
        return ResponseEntity.ok().build();
    }
}
