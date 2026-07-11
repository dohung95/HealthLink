package com.HealthLink.service.impl.geocoding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.HealthLink.dto.geocoding.GeocodeResponse;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class GeoapifyGeocodingServiceImplTest {

    @Mock
    private RestTemplateBuilder restTemplateBuilder;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private NominatimGeocodingClient nominatimGeocodingClient;

    @Test
    void geocode_usesGeoapifyVietnamQueryWithUnicodeAddress() {
        when(restTemplateBuilder.build()).thenReturn(restTemplate);
        when(restTemplate.exchange(any(String.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(Map.of("results", List.of(Map.of(
                        "formatted", "Chợ Bến Thành, Quận 1, Hồ Chí Minh",
                        "lat", 10.7720,
                        "lon", 106.6983
                )))));
        GeoapifyGeocodingServiceImpl service = new GeoapifyGeocodingServiceImpl(
                restTemplateBuilder, nominatimGeocodingClient);
        ReflectionTestUtils.setField(service, "apiKey", "test-key");

        GeocodeResponse result = service.geocode("chợ bến thành");

        ArgumentCaptor<String> url = ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(restTemplate).exchange(
                url.capture(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class));
        assertThat(java.net.URLDecoder.decode(url.getValue(), java.nio.charset.StandardCharsets.UTF_8))
                .contains("text=chợ bến thành", "filter=countrycode:vn", "lang=vi", "apiKey=test-key");
        assertThat(result).extracting(GeocodeResponse::getProvider, GeocodeResponse::getLatitude)
                .containsExactly("GEOAPIFY", 10.7720);
    }
}
