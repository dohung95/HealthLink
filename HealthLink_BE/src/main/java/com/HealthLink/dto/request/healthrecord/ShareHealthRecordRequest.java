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
    
    // true: dùng cho booking auto-share để gộp document mới vào share cũ
    // false/null: dùng cho Share Record thủ công, không cho share trùng khi chưa revoke
    private Boolean allowMerge;
}
