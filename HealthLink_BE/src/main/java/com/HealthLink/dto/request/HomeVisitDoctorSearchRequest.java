package com.HealthLink.dto.request;

import lombok.Data;

@Data
public class HomeVisitDoctorSearchRequest {
    private Double visitLatitude;
    private Double visitLongitude;
    private String specialtyName;
}