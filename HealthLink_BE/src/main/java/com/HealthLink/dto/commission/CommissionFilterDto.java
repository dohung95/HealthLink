package com.HealthLink.dto.commission;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommissionFilterDto {
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
