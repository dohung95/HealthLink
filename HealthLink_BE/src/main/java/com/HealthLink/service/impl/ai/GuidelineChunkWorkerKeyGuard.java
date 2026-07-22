package com.HealthLink.service.impl.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Authenticates only the local worker header; it deliberately does not accept JWT credentials. */
@Component
public class GuidelineChunkWorkerKeyGuard {
    private final String expectedKey;

    public GuidelineChunkWorkerKeyGuard(@Value("${ai.service.key:}") String expectedKey) {
        this.expectedKey = expectedKey == null ? "" : expectedKey;
    }

    public void require(String suppliedKey) {
        if (expectedKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Internal worker authentication is not configured");
        }
        byte[] expected = expectedKey.getBytes(StandardCharsets.UTF_8);
        byte[] supplied = (suppliedKey == null ? "" : suppliedKey).getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, supplied)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal worker credentials");
        }
    }
}
