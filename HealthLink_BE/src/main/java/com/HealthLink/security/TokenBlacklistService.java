package com.HealthLink.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Blacklist lưu access token đã bị thu hồi (logout).
 *
 * Cơ chế:
 *  - Dùng ConcurrentHashMap để thread-safe.
 *  - Giá trị là thời điểm token hết hạn (Instant).
 *  - Khi kiểm tra, đồng thời dọn dẹp các entry đã hết hạn
 *    để tránh rò rỉ bộ nhớ (lazy eviction).
 */
@Component
@Slf4j
public class TokenBlacklistService {

    // token -> expiryInstant
    private final ConcurrentHashMap<String, Instant> blacklist = new ConcurrentHashMap<>();

    /**
     * Đưa access token vào blacklist cho đến khi nó hết hạn.
     *
     * @param token     chuỗi JWT (access token)
     * @param expiresAt thời điểm token hết hạn
     */
    public void blacklist(String token, Instant expiresAt) {
        blacklist.put(token, expiresAt);
        log.debug("Token blacklisted, expires at: {}", expiresAt);
    }

    /**
     * Kiểm tra token có đang trong blacklist không.
     * Đồng thời xóa các entry đã hết hạn (lazy eviction).
     */
    public boolean isBlacklisted(String token) {
        evictExpired();
        return blacklist.containsKey(token);
    }

    // Xóa các token đã hết hạn để tránh bộ nhớ tăng vô hạn
    private void evictExpired() {
        Instant now = Instant.now();
        blacklist.entrySet().removeIf(entry -> entry.getValue().isBefore(now));
    }
}
