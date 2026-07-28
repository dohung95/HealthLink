package com.HealthLink.config;

import org.junit.jupiter.api.Test;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class WebConfigCorsTest {

    @Test
    void allowsTheLocalPlaywrightOriginForApiAndPrivateUploads() {
        ExposedCorsRegistry registry = new ExposedCorsRegistry();
        new WebConfig().addCorsMappings(registry);

        assertThat(registry.configurations().get("/api/**").checkOrigin("http://localhost:63528"))
                .isEqualTo("http://localhost:63528");
        assertThat(registry.configurations().get("/uploads/**").checkOrigin("http://localhost:63528"))
                .isEqualTo("http://localhost:63528");
    }

    private static final class ExposedCorsRegistry extends CorsRegistry {
        Map<String, CorsConfiguration> configurations() {
            return getCorsConfigurations();
        }
    }
}
