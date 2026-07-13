package com.HealthLink.service.impl.geocoding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class NominatimGeocodingClientTest {

    @Mock
    private RestTemplateBuilder restTemplateBuilder;

    @Mock
    private RestTemplate restTemplate;

    @Test
    void search_sendsVietnameseAddressWithoutDoubleEncoding() throws Exception {
        when(restTemplateBuilder.build()).thenReturn(restTemplate);
        JsonNode response = new ObjectMapper().readTree("""
                [{"display_name":"Chợ Bến Thành","lat":"10.772","lon":"106.6983"}]
                """);
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class)))
                .thenReturn(ResponseEntity.ok(response));
        NominatimGeocodingClient client = new NominatimGeocodingClient(restTemplateBuilder);

        assertThat(client.search("chợ bến thành", 1)).hasSize(1);

        ArgumentCaptor<URI> uri = ArgumentCaptor.forClass(URI.class);
        org.mockito.Mockito.verify(restTemplate).exchange(
                uri.capture(), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class));
        assertThat(uri.getValue().getRawQuery()).doesNotContain("%25E1");
        assertThat(URLDecoder.decode(uri.getValue().getRawQuery(), StandardCharsets.UTF_8))
                .contains("q=chợ bến thành", "countrycodes=vn");
    }
}
