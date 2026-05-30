package com.HealthLink.dto.admin.financial;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialTransactionPageDto {
    private List<FinancialTransactionDto> transactions;
    private int pageNumber;
    private int pageSize;
    private long totalCount;
    private int totalPages;
}
