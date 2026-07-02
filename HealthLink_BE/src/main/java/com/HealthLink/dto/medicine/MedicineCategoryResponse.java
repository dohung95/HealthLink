package com.HealthLink.dto.medicine;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicineCategoryResponse {
    private Integer categoryId;
    private Integer parentId;
    private String code;
    private String name;
    private String slug;
    private String icon;
    private Integer sortOrder;
    private Boolean active;

    @Builder.Default
    private List<MedicineCategoryResponse> children = new ArrayList<>();
}
