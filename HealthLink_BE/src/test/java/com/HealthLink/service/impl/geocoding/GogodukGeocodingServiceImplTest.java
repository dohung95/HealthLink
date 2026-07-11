package com.HealthLink.service.impl.geocoding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.HealthLink.dto.geocoding.GeocodeResponse;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.GeocodingProviderUnavailableException;
import com.HealthLink.service.impl.geocoding.NominatimGeocodingClient;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class GogodukGeocodingServiceImplTest {

    @Mock
    private NominatimGeocodingClient nominatimGeocodingClient;

    @InjectMocks
    private GogodukGeocodingServiceImpl geocodingService;

    @Test
    void geocode_shouldUseNominatimWhenApiKeyIsBlank() {
        ReflectionTestUtils.setField(geocodingService, "apiKey", "");

        GeocodeResponse fallback = GeocodeResponse.builder()
                .formattedAddress("12 Nguyen Trai, Hanoi")
                .latitude(21.0285)
                .longitude(105.8542)
                .provider("NOMINATIM")
                .build();
        org.mockito.Mockito.when(nominatimGeocodingClient.forward("12 Nguyen Trai, Hanoi"))
                .thenReturn(Optional.of(fallback));

        assertThat(geocodingService.geocode("12 Nguyen Trai, Hanoi")).isEqualTo(fallback);
    }

    @Test
    void reverseGeocode_shouldUseNominatimWhenApiKeyIsBlank() {
        ReflectionTestUtils.setField(geocodingService, "apiKey", "");

        GeocodeResponse fallback = GeocodeResponse.builder()
                .formattedAddress("Hanoi")
                .latitude(21.0285)
                .longitude(105.8542)
                .provider("NOMINATIM")
                .build();
        org.mockito.Mockito.when(nominatimGeocodingClient.reverse(21.0285, 105.8542))
                .thenReturn(Optional.of(fallback));

        assertThat(geocodingService.reverseGeocode(21.0285, 105.8542)).isEqualTo(fallback);
    }

    @Test
    void geocode_shouldReportProviderUnavailableWhenFallbackFails() {
        ReflectionTestUtils.setField(geocodingService, "apiKey", "");
        org.mockito.Mockito.when(nominatimGeocodingClient.forward("12 Nguyen Trai, Hanoi"))
                .thenThrow(new GeocodingProviderUnavailableException("Address verification is temporarily unavailable"));

        assertThatThrownBy(() -> geocodingService.geocode("12 Nguyen Trai, Hanoi"))
                .isInstanceOf(GeocodingProviderUnavailableException.class);
    }
}
