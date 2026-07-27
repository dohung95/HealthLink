package com.HealthLink.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "clinical-ai")
public class AiCdsFeatureProperties {
    private boolean enabled;
    private boolean cloudFallbackEnabled;
    private boolean patientVisibility;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public boolean isCloudFallbackEnabled() { return cloudFallbackEnabled; }
    public void setCloudFallbackEnabled(boolean cloudFallbackEnabled) { this.cloudFallbackEnabled = cloudFallbackEnabled; }
    public boolean isPatientVisibility() { return patientVisibility; }
    public void setPatientVisibility(boolean patientVisibility) { this.patientVisibility = patientVisibility; }
}
