package com.HealthLink.service.impl.medicine;

import com.HealthLink.dto.medicine.MedicineCategoryResponse;
import com.HealthLink.entity.MedicineCategory;
import com.HealthLink.repository.medicine.MedicineCategoryRepository;
import com.HealthLink.service.medicine.MedicineCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MedicineCategoryServiceImpl implements MedicineCategoryService {

    private final MedicineCategoryRepository categoryRepository;

    @Override
    public List<MedicineCategoryResponse> getActiveCategoryTree() {
        List<MedicineCategory> categories = categoryRepository.findByActiveTrueOrderBySortOrderAscNameAsc();
        Map<Integer, MedicineCategoryResponse> byId = new LinkedHashMap<>();
        List<MedicineCategoryResponse> roots = new ArrayList<>();

        categories.forEach(category -> byId.put(category.getCategoryId(), toResponse(category)));

        categories.forEach(category -> {
            MedicineCategoryResponse node = byId.get(category.getCategoryId());
            MedicineCategory parent = category.getParent();
            Integer parentId = parent != null ? parent.getCategoryId() : null;
            MedicineCategoryResponse parentNode = parentId != null ? byId.get(parentId) : null;
            if (parentNode == null) {
                roots.add(node);
            } else {
                parentNode.getChildren().add(node);
            }
        });

        return roots;
    }

    @Override
    public Set<Integer> getActiveCategoryAndDescendantIds(Integer categoryId) {
        if (categoryId == null) return Set.of();

        List<MedicineCategory> categories = categoryRepository.findByActiveTrueOrderBySortOrderAscNameAsc();
        Map<Integer, List<Integer>> childrenByParent = new HashMap<>();
        boolean categoryExists = false;

        for (MedicineCategory category : categories) {
            if (Objects.equals(category.getCategoryId(), categoryId)) {
                categoryExists = true;
            }
            MedicineCategory parent = category.getParent();
            if (parent != null && parent.getCategoryId() != null) {
                childrenByParent
                        .computeIfAbsent(parent.getCategoryId(), ignored -> new ArrayList<>())
                        .add(category.getCategoryId());
            }
        }

        if (!categoryExists) return Set.of();

        Set<Integer> result = new LinkedHashSet<>();
        Deque<Integer> queue = new ArrayDeque<>();
        queue.add(categoryId);

        while (!queue.isEmpty()) {
            Integer current = queue.removeFirst();
            if (result.add(current)) {
                queue.addAll(childrenByParent.getOrDefault(current, List.of()));
            }
        }

        return result;
    }

    @Override
    public Optional<MedicineCategory> getActiveCategory(Integer categoryId) {
        if (categoryId == null) return Optional.empty();
        return categoryRepository.findByCategoryIdAndActiveTrue(categoryId);
    }

    @Override
    public String buildCategoryPath(MedicineCategory category) {
        if (category == null) return null;

        Deque<String> names = new ArrayDeque<>();
        MedicineCategory cursor = category;
        while (cursor != null) {
            if (cursor.getName() != null && !cursor.getName().isBlank()) {
                names.addFirst(cursor.getName());
            }
            cursor = cursor.getParent();
        }
        return String.join(" > ", names);
    }

    private MedicineCategoryResponse toResponse(MedicineCategory category) {
        MedicineCategory parent = category.getParent();
        return MedicineCategoryResponse.builder()
                .categoryId(category.getCategoryId())
                .parentId(parent != null ? parent.getCategoryId() : null)
                .code(category.getCode())
                .name(category.getName())
                .slug(category.getSlug())
                .icon(category.getIcon())
                .sortOrder(category.getSortOrder())
                .active(category.getActive())
                .children(new ArrayList<>())
                .build();
    }
}
