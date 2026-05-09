package com.HealthLink.controller.admin;

import com.HealthLink.dto.admin.AdminAppointmentDto;
import com.HealthLink.dto.admin.AdminAppointmentPageResponse;
import com.HealthLink.dto.admin.AdminAppointmentStatsDto;
import com.HealthLink.dto.admin.AdminAppointmentUpdateDto;
import com.HealthLink.service.admin.AdminAppointmentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/adminappointments")
@CrossOrigin(origins = "http://localhost:5173")
public class AdminAppointmentController {

    private final AdminAppointmentService appointmentService;

    public AdminAppointmentController(AdminAppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @GetMapping("/stats")
    public ResponseEntity<AdminAppointmentStatsDto> getStats() {
        return ResponseEntity.ok(appointmentService.getStats());
    }

    @GetMapping
    public ResponseEntity<AdminAppointmentPageResponse> getAppointments(
            @RequestParam(defaultValue = "1") int pageNumber,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String searchTerm,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String department) {
        return ResponseEntity.ok(appointmentService.getAppointments(pageNumber, pageSize, searchTerm, date, status, department));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminAppointmentDto> getAppointmentById(@PathVariable Integer id) {
        return ResponseEntity.ok(appointmentService.getAppointmentById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdminAppointmentDto> updateAppointment(
            @PathVariable Integer id,
            @RequestBody AdminAppointmentUpdateDto updateDto) {
        return ResponseEntity.ok(appointmentService.updateAppointment(id, updateDto));
    }
}
