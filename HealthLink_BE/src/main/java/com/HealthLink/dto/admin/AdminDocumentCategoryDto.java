package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminDocumentCategoryDto {
    private String category;
    private int documentCount;
    private List<AdminMedicalDocumentDto> documents;
}
