package com.HealthLink.service.ai;

import com.HealthLink.service.impl.ai.GuidelineChunkWorkerKeyGuard;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GuidelineChunkWorkerKeyGuardTest {
    @Test
    void rejects_missing_or_wrong_internal_worker_key() {
        GuidelineChunkWorkerKeyGuard guard = new GuidelineChunkWorkerKeyGuard("synthetic-worker-key");

        assertThatThrownBy(() -> guard.require(null)).isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThatThrownBy(() -> guard.require("wrong")).isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        guard.require("synthetic-worker-key");
    }
}
