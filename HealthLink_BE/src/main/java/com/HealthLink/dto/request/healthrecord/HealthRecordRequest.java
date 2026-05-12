package com.HealthLink.dto.request.healthrecord;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class HealthRecordRequest {
    private String title;
    private String description;
    private String recordType;
    private LocalDateTime recordDate;
}
