package com.HealthLink.service.ai;

import java.io.InputStream;
import java.nio.file.Path;
import java.time.Duration;

public interface PrivateObjectStorageService {
    void store(String objectKey, Path sourceFile, long size, String mimeType);
    InputStream open(String objectKey);
    String presignedGet(String objectKey, Duration expiry);
    void delete(String objectKey);
}
