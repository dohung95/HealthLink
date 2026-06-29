package com.HealthLink.dto.request;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
public class SelectSessionRequest {

    private String doctorId;
    private Integer scheduleId;
    private LocalDate bookingDate;
    private String visitAddress;
    private Double visitLatitude;
    private Double visitLongitude;
    private String contactPhone;
    private String reasonForHomeVisit;
    private String specialNotes;
    private LocalTime startTime;
    private LocalTime endTime;
    private List<Integer> homeVisitServiceIds;
}
