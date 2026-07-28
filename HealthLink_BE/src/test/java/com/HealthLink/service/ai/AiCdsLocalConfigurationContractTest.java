package com.HealthLink.service.ai;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

class AiCdsLocalConfigurationContractTest {

    @Test
    void loadsRepositoryEnvFromEitherWorkingDirectoryAndMapsStudentDemoAiCdsVariables() throws IOException {
        Properties development = load("application-dev.properties");

        assertThat(development.getProperty("spring.config.import"))
                .contains("optional:file:../.env[.properties]", "optional:file:.env[.properties]");
        assertThat(development.getProperty("ai.ocr.worker.base-url"))
                .isEqualTo("${AI_SERVICE_URL:http://127.0.0.1:8097}");
        assertThat(development.getProperty("ai.service.key")).isEqualTo("${AI_SERVICE_KEY:}");
        assertThat(development.getProperty("ai.storage.endpoint")).isEqualTo("${MINIO_ENDPOINT:http://localhost:9000}");
        assertThat(development.getProperty("ai.storage.access-key")).isEqualTo("${MINIO_ROOT_USER}");
        assertThat(development.getProperty("ai.storage.secret-key")).isEqualTo("${MINIO_ROOT_PASSWORD}");
        assertThat(development.getProperty("ai.storage.bucket"))
                .isEqualTo("${MINIO_BUCKET_LABS:healthlink-clinical-private}");
    }

    private Properties load(String resourceName) throws IOException {
        Properties properties = new Properties();
        try (InputStream stream = getClass().getClassLoader().getResourceAsStream(resourceName)) {
            assertThat(stream).as("classpath resource %s", resourceName).isNotNull();
            properties.load(stream);
        }
        return properties;
    }
}
