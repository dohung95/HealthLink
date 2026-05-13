package com.HealthLink.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;

/**
 * Cung cấp các tiện ích tạo, parse và validate JWT token.
 */
@Component
@Slf4j
public class JwtTokenProvider {

    private final SecretKey secretKey;
    private final long      expirationMs;
    private final long      refreshExpirationMs;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String base64Secret,
            @Value("${jwt.expiration-ms}") long expirationMs,
            @Value("${jwt.refresh-expiration-ms}") long refreshExpirationMs) {
        this.secretKey           = Keys.hmacShaKeyFor(Base64.getDecoder().decode(base64Secret));
        this.expirationMs        = expirationMs;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    // -------------------------------------------------------------------------
    // Tạo Access Token
    // -------------------------------------------------------------------------
    public String generateAccessToken(UserDetails userDetails) {
        return buildToken(userDetails.getUsername(), expirationMs);
    }

    // -------------------------------------------------------------------------
    // Tạo Refresh Token
    // -------------------------------------------------------------------------
    public String generateRefreshToken(UserDetails userDetails) {
        return buildToken(userDetails.getUsername(), refreshExpirationMs);
    }

    // -------------------------------------------------------------------------
    // Lấy email (subject) từ token
    // -------------------------------------------------------------------------
    public String getEmailFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    // -------------------------------------------------------------------------
    // Lấy thời điểm hết hạn của token (dùng cho blacklist khi logout)
    // -------------------------------------------------------------------------
    public java.time.Instant getExpirationFromToken(String token) {
        return parseClaims(token).getExpiration().toInstant();
    }

    // -------------------------------------------------------------------------
    // Validate token
    // -------------------------------------------------------------------------
    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("JWT is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.warn("JWT is not supported: {}", e.getMessage());
        } catch (MalformedJwtException e) {
            log.warn("JWT is invalid: {}", e.getMessage());
        } catch (SecurityException e) {
            log.warn("JWT signature is not valid: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.warn("JWT is empty or null: {}", e.getMessage());
        }
        return false;
    }

    // -------------------------------------------------------------------------
    // Kiểm tra token còn hạn không (dùng riêng cho refresh token)
    // -------------------------------------------------------------------------
    public boolean isTokenExpired(String token) {
        try {
            return parseClaims(token).getExpiration().before(new Date());
        } catch (ExpiredJwtException e) {
            return true;
        }
    }

    // =========================================================================
    // Private helpers
    // =========================================================================
    private String buildToken(String subject, long ttlMs) {
        Date now    = new Date();
        Date expiry = new Date(now.getTime() + ttlMs);
        return Jwts.builder()
                .subject(subject)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
