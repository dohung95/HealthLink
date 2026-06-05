package com.HealthLink.service.moderation;

import org.springframework.web.multipart.MultipartFile;

public interface ImageModerationService {
    void validateFileIsSafe(MultipartFile file);
}