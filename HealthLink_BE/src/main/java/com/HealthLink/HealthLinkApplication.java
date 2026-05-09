package com.HealthLink;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class HealthLinkApplication {

	public static void main(String[] args) {
		SpringApplication.run(HealthLinkApplication.class, args);
	}

}
