package com.HealthLink.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "gemini")
@Getter
@Setter
public class GeminiConfig {

    /**
     * Gemini API key from environment variable or properties
     */
    private String apiKey;

    /**
     * Gemini model to use (default: gemini-2.5-flash)
     */
    private String model = "gemini-2.5-flash";

    /**
     * Enable/disable Gemini AI features
     */
    private boolean enabled = true;

    /**
     * Auto-screening configuration
     */
    private AutoScreening autoScreening = new AutoScreening();

    @Getter
    @Setter
    public static class AutoScreening {
        /**
         * Enable/disable auto-screening
         */
        private boolean enabled = true;

        /**
         * Threshold below which applications are auto-rejected (0.0 - 1.0)
         */
        private double rejectThreshold = 0.3;
    }

    /**
     * Check if Gemini is properly configured
     */
    public boolean isConfigured() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }
}
