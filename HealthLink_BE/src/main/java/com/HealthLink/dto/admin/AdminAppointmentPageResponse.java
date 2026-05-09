package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminAppointmentPageResponse {
    private List<AdminAppointmentDto> appointments;
    private int pageNumber;
    private int pageSize;
    private long totalCount;
    private int totalPages;
}
