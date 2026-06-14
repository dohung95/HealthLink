package com.HealthLink.service.impl.geocoding;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.HealthLink.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class GogodukGeocodingServiceImplTest {

    @InjectMocks
    private GogodukGeocodingServiceImpl geocodingService;

    @Test
    void geocode_shouldThrowWhenApiKeyIsBlank() {
        ReflectionTestUtils.setField(geocodingService, "apiKey", "");

        assertThatThrownBy(() -> geocodingService.geocode("12 Nguyen Trai, Hanoi"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Gogoduk API key is not configured");
    }

    @Test
    void reverseGeocode_shouldThrowWhenApiKeyIsBlank() {
        ReflectionTestUtils.setField(geocodingService, "apiKey", "");

        assertThatThrownBy(() -> geocodingService.reverseGeocode(21.0285, 105.8542))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Gogoduk API key is not configured");
    }
}
