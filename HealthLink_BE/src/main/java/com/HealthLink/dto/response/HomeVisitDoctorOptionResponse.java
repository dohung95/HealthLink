package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class HomeVisitDoctorOptionResponse {
    private String doctorId;
    private String fullName;
    private String specialtyName;
    private String avatarUrl;
    private BigDecimal consultationFee;
    private BigDecimal homeVisitConsultationFee;

    private Double distanceKm;
    private Integer estimatedTravelMinutes;
    private BigDecimal homeVisitFee;
    private BigDecimal travelFee;
    private BigDecimal homeVisitTotal;
    private BigDecimal temporaryTotal;
}