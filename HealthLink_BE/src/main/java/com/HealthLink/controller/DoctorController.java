package com.HealthLink.controller;

import com.HealthLink.dto.response.DoctorResponse;
import com.HealthLink.dto.response.DoctorScheduleResponse;
import com.HealthLink.service.DoctorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller xử lý các endpoint liên quan đến bác sĩ.
 *
 * <pre>
 * GET /api/doctors                          → Danh sách bác sĩ (có filter)
 * GET /api/doctors/{doctorId}/schedules     → Lịch làm việc của bác sĩ
 * </pre>
 */
@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorService doctorService;

    /**
     * Lấy danh sách bác sĩ, hỗ trợ lọc theo chuyên khoa và tên.
     *
     * <p>Ví dụ:
     * <ul>
     *   <li>GET /api/doctors → lấy tất cả</li>
     *   <li>GET /api/doctors?specialty=Tim mạch → lọc theo chuyên khoa</li>
     *   <li>GET /api/doctors?name=Nguyễn → tìm theo tên</li>
     *   <li>GET /api/doctors?specialty=Nhi&name=Trần → kết hợp cả hai</li>
     * </ul>
     *
     * @param specialty tên chuyên khoa (tùy chọn)
     * @param name      tên bác sĩ     (tùy chọn)
     */
    @GetMapping
    public ResponseEntity<List<DoctorResponse>> getAllDoctors(
            @RequestParam(required = false) String specialty,
            @RequestParam(required = false) String name) {
        return ResponseEntity.ok(doctorService.getAllDoctors(specialty, name));
    }

    /**
     * Lấy lịch làm việc của một bác sĩ.
     * Dùng để bệnh nhân xem trước giờ nào bác sĩ còn trống trước khi đặt.
     *
     * @param doctorId ID bác sĩ
     */
    @GetMapping("/{doctorId}/schedules")
    public ResponseEntity<List<DoctorScheduleResponse>> getDoctorSchedules(
            @PathVariable String doctorId) {
        return ResponseEntity.ok(doctorService.getDoctorSchedules(doctorId));
    }
}
