package com.HealthLink.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiPrivateStorageConfiguration {
    @Bean
    MinioClient aiPrivateMinioClient(@Value("${ai.storage.endpoint}") String endpoint,
                                    @Value("${ai.storage.access-key}") String accessKey,
                                    @Value("${ai.storage.secret-key}") String secretKey) {
        return MinioClient.builder().endpoint(endpoint).credentials(accessKey, secretKey).build();
    }
}
