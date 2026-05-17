package com.HealthLink.dto.commission.admin;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminCommissionFilterDto {
    private String recipientType;
    private String recipientId;
    private String serviceType;
    private String status;
    private LocalDateTime dateFrom;
    private LocalDateTime dateTo;
    private Integer page;
    private Integer size;
    private String sortBy;
    private String sortDir;
}
