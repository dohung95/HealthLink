package com.HealthLink.service.impl.medicine;

import com.HealthLink.dto.medicine.MedicineResponse;
import com.HealthLink.entity.Medicine;
import com.HealthLink.entity.MedicineCategory;
import com.HealthLink.repository.medicine.MedicineRepository;
import com.HealthLink.service.medicine.MedicineCategoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MedicineServiceImplTest {

    @Mock
    private MedicineRepository medicineRepository;

    @Mock
    private MedicineCategoryService categoryService;

    @InjectMocks
    private MedicineServiceImpl service;

    @Test
    void searchMedicines_shouldPassAllCatalogFiltersToRepository() {
        when(medicineRepository.searchCatalog("pain", "Analgesic", "Tablet")).thenReturn(List.of());

        List<MedicineResponse> result = service.searchMedicines(" pain ", " Analgesic ", " Tablet ", null);

        assertThat(result).isEmpty();
        verify(medicineRepository).searchCatalog("pain", "Analgesic", "Tablet");
    }

    @Test
    void searchMedicines_shouldMapMedicineResponse() {
        Medicine medicine = Medicine.builder()
                .medicineId(10)
                .name("Paracetamol")
                .category("Analgesic")
                .dosageForm("Tablet")
                .price(new BigDecimal("2.50"))
                .active(true)
                .imageUrl("https://example.test/para.png")
                .build();
        when(medicineRepository.searchCatalog(null, null, null)).thenReturn(List.of(medicine));

        List<MedicineResponse> result = service.searchMedicines(null, null, null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMedicineId()).isEqualTo(10);
        assertThat(result.get(0).getPrice()).isEqualByComparingTo("2.50");
    }

    @Test
    void searchMedicines_shouldMapTaxonomyMetadataWhenCategoryNodeExists() {
        MedicineCategory root = MedicineCategory.builder()
                .categoryId(1)
                .name("Medications")
                .code("MEDICATIONS")
                .build();
        MedicineCategory leaf = MedicineCategory.builder()
                .categoryId(20)
                .parent(root)
                .name("Pain & Fever")
                .code("OTC_PAIN_FEVER")
                .build();
        Medicine medicine = Medicine.builder()
                .medicineId(10)
                .name("Paracetamol")
                .category("Pain Relief - Fever")
                .categoryNode(leaf)
                .dosageForm("Tablet")
                .price(new BigDecimal("2.50"))
                .active(true)
                .build();
        when(medicineRepository.searchCatalog(null, null, null)).thenReturn(List.of(medicine));
        when(categoryService.buildCategoryPath(leaf)).thenReturn("Medications > Pain & Fever");

        List<MedicineResponse> result = service.searchMedicines(null, null, null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCategoryId()).isEqualTo(20);
        assertThat(result.get(0).getCategoryCode()).isEqualTo("OTC_PAIN_FEVER");
        assertThat(result.get(0).getCategoryName()).isEqualTo("Pain & Fever");
        assertThat(result.get(0).getCategoryPath()).isEqualTo("Medications > Pain & Fever");
    }

    @Test
    void searchMedicines_shouldUseDescendantCategoryIdsWhenCategoryIdProvided() {
        when(categoryService.getActiveCategoryAndDescendantIds(2)).thenReturn(Set.of(2, 10));
        when(medicineRepository.searchCatalogByCategoryIds("pain", null, null, Set.of(2, 10)))
                .thenReturn(List.of());

        List<MedicineResponse> result = service.searchMedicines(" pain ", null, null, 2);

        assertThat(result).isEmpty();
        verify(medicineRepository).searchCatalogByCategoryIds("pain", null, null, Set.of(2, 10));
    }
}
