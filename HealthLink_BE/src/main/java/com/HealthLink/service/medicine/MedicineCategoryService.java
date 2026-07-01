package com.HealthLink.service.medicine;

import com.HealthLink.dto.medicine.MedicineCategoryResponse;
import com.HealthLink.entity.MedicineCategory;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface MedicineCategoryService {
    List<MedicineCategoryResponse> getActiveCategoryTree();

    Set<Integer> getActiveCategoryAndDescendantIds(Integer categoryId);

    Optional<MedicineCategory> getActiveCategory(Integer categoryId);

    String buildCategoryPath(MedicineCategory category);
}
