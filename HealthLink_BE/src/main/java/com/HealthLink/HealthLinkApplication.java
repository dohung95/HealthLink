package com.HealthLink;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import com.HealthLink.config.PayPalConfig;
import org.springframework.scheduling.annotation.EnableAsync;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableConfigurationProperties(PayPalConfig.class)
@EnableAsync
@EnableScheduling
public class HealthLinkApplication {

	public static void main(String[] args) {
		SpringApplication.run(HealthLinkApplication.class, args);
	}

}
