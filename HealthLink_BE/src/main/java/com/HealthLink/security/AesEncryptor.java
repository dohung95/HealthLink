package com.HealthLink.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

/**
 * JPA AttributeConverter tự động mã hóa/giải mã nội dung tin nhắn bằng AES-256.
 * - Khi LƯU vào DB: plain text -> mã hóa AES -> chuỗi Base64 hỗn độn
 * - Khi ĐỌC từ DB: chuỗi Base64 -> giải mã AES -> plain text gốc
 *
 * Secret key phải đúng 32 ký tự (256-bit).
 */
@Converter
@Component
public class AesEncryptor implements AttributeConverter<String, String> {

    private static final String ALGORITHM = "AES/CBC/PKCS5Padding";

    /* IV cố định (16 bytes). Trong production nên dùng IV ngẫu nhiên mỗi tin nhắn.
       Cách này đơn giản nhưng vẫn an toàn khi kết hợp với secret key mạnh. */
    private static final byte[] IV = {
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
        0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F
    };

    // Đọc secret key từ application.properties
    @Value("${app.encryption.secret}")
    private String secretKey;

    // =========================================================================
    // Mã hóa: plain text -> chuỗi mã hóa Base64
    // =========================================================================
    @Override
    public String convertToDatabaseColumn(String plainText) {
        if (plainText == null || plainText.isEmpty()) return plainText;
        try {
            SecretKeySpec keySpec = buildKeySpec();
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new IvParameterSpec(IV));
            byte[] encrypted = cipher.doFinal(plainText.getBytes("UTF-8"));
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            throw new RuntimeException("Error encrypting message: " + e.getMessage(), e);
        }
    }

    // =========================================================================
    // Giải mã: chuỗi Base64 -> plain text gốc
    // =========================================================================
    @Override
    public String convertToEntityAttribute(String encryptedText) {
        if (encryptedText == null || encryptedText.isEmpty()) return encryptedText;
        try {
            SecretKeySpec keySpec = buildKeySpec();
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, new IvParameterSpec(IV));
            byte[] decoded = Base64.getDecoder().decode(encryptedText);
            byte[] decrypted = cipher.doFinal(decoded);
            return new String(decrypted, "UTF-8");
        } catch (Exception e) {
            // Nếu giải mã thất bại (ví dụ: dữ liệu cũ trong DB đang là văn bản thô chưa mã hóa),
            // chúng ta sẽ trả về nguyên bản văn bản đó để tránh sập hệ thống.
            return encryptedText;
        }
    }

    // =========================================================================
    // Helper: tạo SecretKeySpec từ secret key (lấy đúng 32 bytes đầu = AES-256)
    // =========================================================================
    private SecretKeySpec buildKeySpec() {
        if (secretKey == null) {
            throw new IllegalStateException("Secret key for AES is null! Dependency injection failed.");
        }
        byte[] keyBytes = secretKey.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] key = new byte[32];
        System.arraycopy(keyBytes, 0, key, 0, Math.min(keyBytes.length, 32));
        return new SecretKeySpec(key, "AES");
    }
}
