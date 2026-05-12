package com.HealthLink.service.impl.healthrecord;

import com.HealthLink.exception.BusinessException;
import com.HealthLink.service.healthrecord.FileStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageServiceImpl implements FileStorageService {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    private Path fileStorageLocation;

    @PostConstruct
    public void init() {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new BusinessException("Could not create the directory where the uploaded files will be stored.");
        }
    }

    @Override
    public String storeFile(MultipartFile file) {
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
        
        try {
            if(originalFileName.contains("..")) {
                throw new BusinessException("Sorry! Filename contains invalid path sequence " + originalFileName);
            }

            // Generate unique file name
            String fileExtension = "";
            int lastIndex = originalFileName.lastIndexOf('.');
            if (lastIndex > 0) {
                fileExtension = originalFileName.substring(lastIndex);
            }
            String fileName = UUID.randomUUID().toString() + fileExtension;

            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return "/uploads/" + fileName;
        } catch (IOException ex) {
            throw new BusinessException("Could not store file " + originalFileName + ". Please try again!");
        }
    }

    @Override
    public void deleteFile(String fileLocation) {
        if (fileLocation != null && fileLocation.startsWith("/uploads/")) {
            String fileName = fileLocation.substring("/uploads/".length());
            try {
                Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
                Files.deleteIfExists(filePath);
            } catch (IOException ex) {
                // ignore
            }
        }
    }
}
