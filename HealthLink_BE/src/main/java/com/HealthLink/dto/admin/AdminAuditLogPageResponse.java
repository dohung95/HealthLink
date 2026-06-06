package com.HealthLink.dto.admin;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAuditLogPageResponse {
    private List<AdminAuditLogDto> logs;
    private int pageNumber;
    private int pageSize;
    private long totalElements;
    private int totalPages;
}
