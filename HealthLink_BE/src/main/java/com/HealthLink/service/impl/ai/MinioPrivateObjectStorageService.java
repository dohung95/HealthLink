package com.HealthLink.service.impl.ai;

import com.HealthLink.service.ai.PrivateObjectStorageService;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.http.Method;
import io.minio.RemoveObjectArgs;
import io.minio.UploadObjectArgs;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.file.Path;
import java.time.Duration;

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
    public String presignedGet(String objectKey, Duration expiry) {
        if (expiry == null || expiry.isNegative() || expiry.isZero() || expiry.compareTo(Duration.ofSeconds(60)) > 0) {
            throw new IllegalArgumentException("Private download grant expiry must be between one and sixty seconds");
        }
        try {
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET).bucket(bucket).object(objectKey).expiry((int) expiry.toSeconds()).build());
        } catch (Exception exception) {
            throw new IllegalStateException("Private object storage grant failed", exception);
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
