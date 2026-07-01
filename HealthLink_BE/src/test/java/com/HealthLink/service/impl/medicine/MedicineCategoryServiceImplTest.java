package com.HealthLink.service.impl.medicine;

import com.HealthLink.dto.medicine.MedicineCategoryResponse;
import com.HealthLink.entity.MedicineCategory;
import com.HealthLink.repository.medicine.MedicineCategoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MedicineCategoryServiceImplTest {

    @Mock
    private MedicineCategoryRepository categoryRepository;

    @InjectMocks
    private MedicineCategoryServiceImpl service;

    @Test
    void getActiveCategoryTree_shouldReturnNestedActiveTree() {
        MedicineCategory root = MedicineCategory.builder()
                .categoryId(1)
                .code("MEDICATIONS")
                .name("Medications")
                .slug("medications")
                .icon("medication")
                .sortOrder(10)
                .active(true)
                .build();
        MedicineCategory child = MedicineCategory.builder()
                .categoryId(2)
                .parent(root)
                .code("MED_RX")
                .name("Prescription-Only")
                .slug("prescription-only")
                .icon("prescriptions")
                .sortOrder(10)
                .active(true)
                .build();
        MedicineCategory leaf = MedicineCategory.builder()
                .categoryId(10)
                .parent(child)
                .code("RX_ANTIBIOTICS")
                .name("Antibiotics")
                .slug("antibiotics")
                .icon("pill")
                .sortOrder(10)
                .active(true)
                .build();

        when(categoryRepository.findByActiveTrueOrderBySortOrderAscNameAsc())
                .thenReturn(List.of(root, child, leaf));

        List<MedicineCategoryResponse> result = service.getActiveCategoryTree();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Medications");
        assertThat(result.get(0).getChildren()).hasSize(1);
        assertThat(result.get(0).getChildren().get(0).getChildren())
                .extracting(MedicineCategoryResponse::getName)
                .containsExactly("Antibiotics");
    }

    @Test
    void getActiveCategoryAndDescendantIds_shouldReturnSelectedBranch() {
        MedicineCategory root = MedicineCategory.builder()
                .categoryId(1)
                .code("MEDICATIONS")
                .name("Medications")
                .slug("medications")
                .active(true)
                .build();
        MedicineCategory child = MedicineCategory.builder()
                .categoryId(2)
                .parent(root)
                .code("MED_RX")
                .name("Prescription-Only")
                .slug("prescription-only")
                .active(true)
                .build();
        MedicineCategory leaf = MedicineCategory.builder()
                .categoryId(10)
                .parent(child)
                .code("RX_ANTIBIOTICS")
                .name("Antibiotics")
                .slug("antibiotics")
                .active(true)
                .build();

        when(categoryRepository.findByActiveTrueOrderBySortOrderAscNameAsc())
                .thenReturn(List.of(root, child, leaf));

        Set<Integer> result = service.getActiveCategoryAndDescendantIds(2);

        assertThat(result).containsExactlyInAnyOrder(2, 10);
    }

    @Test
    void buildCategoryPath_shouldJoinAncestors() {
        MedicineCategory root = MedicineCategory.builder()
                .categoryId(1)
                .name("Medications")
                .active(true)
                .build();
        MedicineCategory child = MedicineCategory.builder()
                .categoryId(2)
                .parent(root)
                .name("Prescription-Only")
                .active(true)
                .build();
        MedicineCategory leaf = MedicineCategory.builder()
                .categoryId(10)
                .parent(child)
                .name("Antibiotics")
                .active(true)
                .build();

        assertThat(service.buildCategoryPath(leaf))
                .isEqualTo("Medications > Prescription-Only > Antibiotics");
    }
}
