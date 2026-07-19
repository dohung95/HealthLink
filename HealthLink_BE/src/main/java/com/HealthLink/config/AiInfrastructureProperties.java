package com.HealthLink.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
@ConfigurationProperties(prefix = "ai.infrastructure")
@Getter
@Setter
public class AiInfrastructureProperties {

    private boolean enabled = false;
    private String workerBaseUrl = "http://localhost:8000";
    private int maxAttempts = 3;

    @Bean
    Clock aiJobClock() {
        return Clock.systemUTC();
    }
}
