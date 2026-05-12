package com.HealthLink.controller.healthrecord;

import com.HealthLink.dto.request.healthrecord.HealthRecordRequest;
import com.HealthLink.dto.request.healthrecord.RevokeShareRequest;
import com.HealthLink.dto.request.healthrecord.ShareHealthRecordRequest;
import com.HealthLink.dto.response.healthrecord.HealthRecordResponse;
import com.HealthLink.dto.response.healthrecord.HealthRecordShareResponse;
import com.HealthLink.dto.response.healthrecord.MedicalDocumentResponse;
import com.HealthLink.service.healthrecord.HealthRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/health-records")
@RequiredArgsConstructor
public class HealthRecordController {

    private final HealthRecordService healthRecordService;

    @PostMapping
    public ResponseEntity<HealthRecordResponse> createRecord(
            @RequestParam String patientId,
            @RequestBody HealthRecordRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(healthRecordService.createRecord(patientId, request));
    }

    @GetMapping("/my")
    public ResponseEntity<List<HealthRecordResponse>> getMyRecords(@RequestParam String patientId) {
        return ResponseEntity.ok(healthRecordService.getMyRecords(patientId));
    }

    @GetMapping("/{recordId}")
    public ResponseEntity<HealthRecordResponse> getRecordById(
            @PathVariable Integer recordId,
            @RequestParam String patientId) {
        return ResponseEntity.ok(healthRecordService.getRecordById(recordId, patientId));
    }

    @PostMapping("/{recordId}/documents")
    public ResponseEntity<MedicalDocumentResponse> uploadDocument(
            @PathVariable Integer recordId,
            @RequestParam String patientId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String description) {
        return ResponseEntity.ok(healthRecordService.uploadDocument(recordId, patientId, file, category, description));
    }

    @DeleteMapping("/{recordId}/documents/{docId}")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable Integer recordId,
            @PathVariable Integer docId,
            @RequestParam String patientId) {
        healthRecordService.deleteDocument(docId, patientId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{recordId}/share")
    public ResponseEntity<HealthRecordShareResponse> shareRecord(
            @PathVariable Integer recordId,
            @RequestParam String patientId,
            @RequestBody ShareHealthRecordRequest request) {
        return ResponseEntity.ok(healthRecordService.shareRecord(recordId, patientId, request));
    }

    @GetMapping("/shares/my")
    public ResponseEntity<List<HealthRecordShareResponse>> getMyShares(@RequestParam String patientId) {
        return ResponseEntity.ok(healthRecordService.getMyShares(patientId));
    }

    @PutMapping("/shares/{shareId}/revoke")
    public ResponseEntity<HealthRecordShareResponse> revokeShare(
            @PathVariable Integer shareId,
            @RequestParam String patientId,
            @RequestBody RevokeShareRequest request) {
        return ResponseEntity.ok(healthRecordService.revokeShare(shareId, patientId, request));
    }
}
