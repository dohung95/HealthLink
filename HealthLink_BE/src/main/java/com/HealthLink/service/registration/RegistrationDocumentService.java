package com.HealthLink.service.registration;

import com.HealthLink.dto.registration.RegistrationDocumentDto;
import com.HealthLink.entity.RegistrationDocument;
import com.HealthLink.entity.RegistrationRequest;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.event.RegistrationDocumentsReadyEvent;
import com.HealthLink.repository.registration.RegistrationDocumentRepository;
import com.HealthLink.repository.registration.RegistrationRequestRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class RegistrationDocumentService {

    private final RegistrationDocumentRepository documentRepository;
    private final RegistrationRequestRepository registrationRequestRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${upload.dir:uploads}")
    private String uploadDir;

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
        "pdf", "jpg", "jpeg", "png", "doc", "docx"
    );

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    public RegistrationDocumentDto uploadDocument(Long requestId, String documentType, MultipartFile file) {
        RegistrationRequest request = registrationRequestRepository.findById(requestId)
            .orElseThrow(() -> new ResourceNotFoundException("Registration Request", "id", requestId));

        validateFile(file);

        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
        String extension = getFileExtension(originalFileName);
        String newFileName = UUID.randomUUID().toString() + "." + extension;

        Path uploadPath = Paths.get(uploadDir, "registrations", requestId.toString());

        try {
            Files.createDirectories(uploadPath);
            Path filePath = uploadPath.resolve(newFileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            RegistrationDocument document = RegistrationDocument.builder()
                .registrationRequest(request)
                .documentType(documentType)
                .fileName(newFileName)
                .originalFileName(originalFileName)
                .filePath(filePath.toString())
                .fileSize(file.getSize())
                .mimeType(file.getContentType())
                .uploadedAt(LocalDateTime.now())
                .aiVerificationStatus("PENDING")
                .build();

            document = documentRepository.save(document);

            // Check if all required documents are uploaded, then trigger AI screening
            triggerAIScreeningIfReady(request);

            return mapToDto(document, requestId);

        } catch (IOException e) {
            throw new BadRequestException("Failed to upload file: " + e.getMessage());
        }
    }

    /**
     * Check if registration has all required documents and trigger AI screening
     * Doctor: Profile Photo + Medical Degree + Practice License + ID Card (4 docs)
     * Pharmacy: Profile Photo + Business License + Pharmacy License + Owner ID Card (3-4 docs)
     */
    private void triggerAIScreeningIfReady(RegistrationRequest request) {
        List<RegistrationDocument> documents = documentRepository.findByRegistrationRequest_RequestId(request.getRequestId());

        int requiredDocs = "DOCTOR".equals(request.getRegistrationType()) ? 4 : 3;

        // Only trigger if we have enough documents and screening hasn't started
        if (documents.size() >= requiredDocs &&
            ("PENDING".equals(request.getAiScreeningStatus()) || request.getAiScreeningStatus() == null)) {

            log.info("Queueing AI screening for registration {} ({} documents uploaded)",
                    request.getRequestId(), documents.size());

            // Mark as processing inside this transaction so concurrent/later uploads
            // don't queue screening a second time.
            request.setAiScreeningStatus("PROCESSING");
            registrationRequestRepository.save(request);

            // Run screening only AFTER this upload transaction commits, on a separate
            // thread/transaction (see RegistrationScreeningEventListener). This keeps the
            // slow AI call off the request thread and prevents a screening failure from
            // rolling back the document upload (which previously surfaced as HTTP 500).
            eventPublisher.publishEvent(new RegistrationDocumentsReadyEvent(request.getRequestId()));
        }
    }

    public List<RegistrationDocumentDto> getDocumentsByRequestId(Long requestId) {
        List<RegistrationDocument> documents = documentRepository.findByRegistrationRequest_RequestId(requestId);
        return documents.stream()
            .map(doc -> mapToDto(doc, requestId))
            .collect(Collectors.toList());
    }

    public Resource downloadDocument(Long documentId) {
        RegistrationDocument document = documentRepository.findById(documentId)
            .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        try {
            Path filePath = Paths.get(document.getFilePath());
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("File", "path", document.getFilePath());
            }
        } catch (MalformedURLException e) {
            throw new BadRequestException("Could not read file: " + e.getMessage());
        }
    }

    public RegistrationDocument getDocumentEntity(Long documentId) {
        return documentRepository.findById(documentId)
            .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));
    }

    public void deleteDocument(Long documentId) {
        RegistrationDocument document = documentRepository.findById(documentId)
            .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        try {
            Path filePath = Paths.get(document.getFilePath());
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            // Log but don't fail if file doesn't exist
        }

        documentRepository.delete(document);
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("File size exceeds maximum limit of 10MB");
        }

        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null || originalFileName.isBlank()) {
            throw new BadRequestException("Invalid file name");
        }

        String extension = getFileExtension(originalFileName).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("File type not allowed. Allowed types: " + String.join(", ", ALLOWED_EXTENSIONS));
        }
    }

    private String getFileExtension(String fileName) {
        int lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex == -1) {
            return "";
        }
        return fileName.substring(lastDotIndex + 1);
    }

    private RegistrationDocumentDto mapToDto(RegistrationDocument document, Long requestId) {
        return RegistrationDocumentDto.builder()
            .documentId(document.getDocumentId())
            .documentType(document.getDocumentType())
            .fileName(document.getFileName())
            .originalFileName(document.getOriginalFileName())
            .fileSize(document.getFileSize())
            .mimeType(document.getMimeType())
            .uploadedAt(document.getUploadedAt())
            .downloadUrl("/api/registration/documents/" + document.getDocumentId() + "/download")
            // AI verification fields
            .aiVerificationStatus(document.getAiVerificationStatus())
            .aiVerificationResult(document.getAiVerificationResult())
            .documentTypeVerified(document.getDocumentTypeVerified())
            .aiConfidenceScore(document.getAiConfidenceScore())
            .build();
    }
}
