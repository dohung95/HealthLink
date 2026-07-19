package com.HealthLink.service.impl.ai;

import com.HealthLink.service.ai.PrivateObjectStorageService;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import io.minio.UploadObjectArgs;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.file.Path;

@Service
@RequiredArgsConstructor
public class MinioPrivateObjectStorageService implements PrivateObjectStorageService {
    private final MinioClient minioClient;
    @Value("${ai.storage.bucket:clinical-private}")
    private String bucket;

    @Override
    public void store(String objectKey, Path sourceFile, long size, String mimeType) {
        try {
            minioClient.uploadObject(UploadObjectArgs.builder().bucket(bucket).object(objectKey)
                    .filename(sourceFile.toString()).contentType(mimeType).build());
        } catch (Exception exception) {
            throw new IllegalStateException("Private object storage upload failed", exception);
        }
    }

    @Override
    public InputStream open(String objectKey) {
        try {
            return minioClient.getObject(GetObjectArgs.builder().bucket(bucket).object(objectKey).build());
        } catch (Exception exception) {
            throw new IllegalStateException("Private object storage read failed", exception);
        }
    }

    @Override
    public void delete(String objectKey) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(objectKey).build());
        } catch (Exception exception) {
            throw new IllegalStateException("Private object storage cleanup failed", exception);
        }
    }
}
