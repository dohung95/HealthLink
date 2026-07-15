package com.HealthLink.dto.pharmacy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PharmacyConsultationOrderCreateRequestJsonTest {

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    @Test
    void shouldDeserializeMobileMinutePayload() throws Exception {
        String json = """
                {
                  "items": [{
                    "medicineId": 12,
                    "quantity": 2,
                    "totalSupplyDays": 30,
                    "route": "ORAL",
                    "frequency": "TID",
                    "timing": "MORNING,AFTERNOON,EVENING"
                  }],
                  "deliveryFee": 25000,
                  "estimatedDeliveryMinutes": 45
                }
                """;

        PharmacyConsultationOrderCreateRequest request = objectMapper.readValue(
                json, PharmacyConsultationOrderCreateRequest.class);

        assertThat(request.getEstimatedDeliveryMinutes()).isEqualTo(45);
        assertThat(request.getEstimatedDeliveryTime()).isNull();
        assertThat(request.getItems()).singleElement().satisfies(item -> {
            assertThat(item.getMedicineId()).isEqualTo(12);
            assertThat(item.getQuantity()).isEqualTo(2);
            assertThat(item.getTotalSupplyDays()).isEqualTo(30);
            assertThat(item.getRoute()).isEqualTo("ORAL");
            assertThat(item.getFrequency()).isEqualTo("TID");
            assertThat(item.getTiming())
                    .isEqualTo("MORNING,AFTERNOON,EVENING");
        });
    }

    @Test
    void shouldPreserveLegacyTimestampPayload() throws Exception {
        String json = """
                {
                  "items": [{
                    "medicineId": 12,
                    "quantity": 2,
                    "totalSupplyDays": 30
                  }],
                  "estimatedDeliveryTime": "2026-07-14T18:45:00.000"
                }
                """;

        PharmacyConsultationOrderCreateRequest request = objectMapper.readValue(
                json, PharmacyConsultationOrderCreateRequest.class);

        assertThat(request.getEstimatedDeliveryTime())
                .isEqualTo(LocalDateTime.of(2026, 7, 14, 18, 45));
        assertThat(request.getEstimatedDeliveryMinutes()).isNull();
    }

    @Test
    void shouldRejectClientDisplayNameInCommandItem() {
        String json = """
                {
                  "items": [{
                    "medicineId": 12,
                    "medicationName": "Allopurinol 300mg",
                    "quantity": 2,
                    "totalSupplyDays": 30,
                    "timing": "MORNING"
                  }],
                  "estimatedDeliveryMinutes": 45
                }
                """;

        assertThatThrownBy(() -> objectMapper.readValue(
                json, PharmacyConsultationOrderCreateRequest.class))
                .isInstanceOf(UnrecognizedPropertyException.class)
                .hasMessageContaining("medicationName");
    }
}
