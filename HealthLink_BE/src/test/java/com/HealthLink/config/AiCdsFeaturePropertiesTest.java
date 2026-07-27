package com.HealthLink.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiCdsFeaturePropertiesTest {

    @Test
    void defaultsToADisabledPrivatePilot() {
        AiCdsFeatureProperties properties = new AiCdsFeatureProperties();

        assertThat(properties.isEnabled()).isFalse();
        assertThat(properties.isCloudFallbackEnabled()).isFalse();
        assertThat(properties.isPatientVisibility()).isFalse();
    }
}
