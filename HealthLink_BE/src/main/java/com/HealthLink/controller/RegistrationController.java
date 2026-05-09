package com.HealthLink.controller;

import com.HealthLink.dto.registration.DoctorRegistrationRequest;
import com.HealthLink.dto.registration.PharmacyRegistrationRequest;
import com.HealthLink.dto.registration.RegistrationDocumentDto;
import com.HealthLink.dto.registration.RegistrationRequestResponse;
import com.HealthLink.entity.RegistrationDocument;
import com.HealthLink.entity.Specialty;
import com.HealthLink.service.RegistrationDocumentService;
import com.HealthLink.service.RegistrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:63527"})
@RestController
@RequestMapping("/api/registration")
@RequiredArgsConstructor
public class RegistrationController {

    private final RegistrationService registrationService;
    private final RegistrationDocumentService documentService;

    @PostMapping("/doctor")
    public ResponseEntity<RegistrationRequestResponse> submitDoctorRegistration(
            @Valid @RequestBody DoctorRegistrationRequest request
    ) {
        RegistrationRequestResponse response = registrationService.submitDoctorRegistration(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/pharmacy")
    public ResponseEntity<RegistrationRequestResponse> submitPharmacyRegistration(
            @Valid @RequestBody PharmacyRegistrationRequest request
    ) {
        RegistrationRequestResponse response = registrationService.submitPharmacyRegistration(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/specialties")
    public ResponseEntity<List<Specialty>> getSpecialties() {
        List<Specialty> specialties = registrationService.getActiveSpecialties();
        return ResponseEntity.ok(specialties);
    }

    // ============ Document Upload Endpoints ============

    @PostMapping("/{requestId}/documents")
    public ResponseEntity<RegistrationDocumentDto> uploadDocument(
            @PathVariable Long requestId,
            @RequestParam("documentType") String documentType,
            @RequestParam("file") MultipartFile file
    ) {
        RegistrationDocumentDto response = documentService.uploadDocument(requestId, documentType, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{requestId}/documents")
    public ResponseEntity<List<RegistrationDocumentDto>> getDocuments(@PathVariable Long requestId) {
        List<RegistrationDocumentDto> documents = documentService.getDocumentsByRequestId(requestId);
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/documents/{documentId}/download")
    public ResponseEntity<Resource> downloadDocument(@PathVariable Long documentId) {
        Resource resource = documentService.downloadDocument(documentId);
        RegistrationDocument document = documentService.getDocumentEntity(documentId);

        String contentType = document.getMimeType() != null ? document.getMimeType() : "application/octet-stream";

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(contentType))
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + document.getOriginalFileName() + "\"")
            .body(resource);
    }

    @GetMapping("/documents/{documentId}/preview")
    public ResponseEntity<Resource> previewDocument(@PathVariable Long documentId) {
        Resource resource = documentService.downloadDocument(documentId);
        RegistrationDocument document = documentService.getDocumentEntity(documentId);

        String contentType = document.getMimeType() != null ? document.getMimeType() : "application/octet-stream";

        // For preview, use inline instead of attachment
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(contentType))
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + document.getOriginalFileName() + "\"")
            .body(resource);
    }

    @DeleteMapping("/documents/{documentId}")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long documentId) {
        documentService.deleteDocument(documentId);
        return ResponseEntity.noContent().build();
    }
}
