package com.HealthLink.service.ai;

import java.io.InputStream;
import java.nio.file.Path;

public interface PrivateObjectStorageService {
    void store(String objectKey, Path sourceFile, long size, String mimeType);
    InputStream open(String objectKey);
    void delete(String objectKey);
}
