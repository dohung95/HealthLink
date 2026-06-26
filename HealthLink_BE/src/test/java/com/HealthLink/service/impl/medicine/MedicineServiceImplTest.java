package com.HealthLink.service.impl.medicine;

import com.HealthLink.dto.medicine.MedicineResponse;
import com.HealthLink.entity.Medicine;
import com.HealthLink.repository.medicine.MedicineRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MedicineServiceImplTest {

    @Mock
    private MedicineRepository medicineRepository;

    @InjectMocks
    private MedicineServiceImpl service;

    @Test
    void searchMedicines_shouldPassAllCatalogFiltersToRepository() {
        when(medicineRepository.searchCatalog("pain", "Analgesic", "Tablet")).thenReturn(List.of());

        List<MedicineResponse> result = service.searchMedicines(" pain ", " Analgesic ", " Tablet ");

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

        List<MedicineResponse> result = service.searchMedicines(null, null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMedicineId()).isEqualTo(10);
        assertThat(result.get(0).getPrice()).isEqualByComparingTo("2.50");
    }
}
