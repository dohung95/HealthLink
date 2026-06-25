package com.HealthLink.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for AI Screening feature
 * Works with the self-hosted Local AI service.
 */
@Configuration
@ConfigurationProperties(prefix = "ai.screening")
@Getter
@Setter
public class AIScreeningConfig {

    /**
     * Enable/disable auto-screening feature
     */
    private boolean enabled = true;

    /**
     * Threshold below which applications are auto-rejected (0.0 - 1.0)
     * Default: 0.3 (30%)
     */
    private double rejectThreshold = 0.3;

    /**
     * Send email when application is auto-rejected
     */
    private boolean sendRejectionEmail = true;

    /**
     * Log AI rejections to audit log
     */
    private boolean logToAudit = true;
}
