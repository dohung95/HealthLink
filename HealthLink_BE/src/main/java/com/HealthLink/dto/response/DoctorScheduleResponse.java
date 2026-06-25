package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalTime;

/**
 * Response lịch làm việc của bác sĩ trong một ca.
 */
@Data
@Builder
public class DoctorScheduleResponse {

    private Integer scheduleId;

    /** 0 = Chủ Nhật, 1 = Thứ 2, ..., 6 = Thứ 7 */
    private Integer dayOfWeek;

    /** Tên ngày dạng tiếng Việt: "Thứ 2", "Chủ Nhật"... */
    private String dayName;

    private LocalTime startTime;
    private LocalTime endTime;

    /** Thời lượng mỗi slot (phút), mặc định 30 */
    private Integer slotDuration;

    /** Loại tư vấn áp dụng cho ca này (null = tất cả) */
    private String consultationType;

    /** Ca làm việc Home visit: MORNING / AFTERNOON / EVENING (null với lịch Online) */
    private String shiftType;

    private boolean available;

    private com.HealthLink.entity.enums.DoctorScheduleStatus scheduleStatus;
}
