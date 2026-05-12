package com.HealthLink.dto.request.healthrecord;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ShareHealthRecordRequest {
    private String doctorId;
    private String permissionLevel;
    private LocalDateTime expiryDate;
    private List<Integer> sharedDocumentIds;
}
