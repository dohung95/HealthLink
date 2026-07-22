package com.HealthLink.controller.ai;

import com.HealthLink.dto.ai.CreateLabReportResponse;
import com.HealthLink.dto.ai.LabReportDetailResponse;
import com.HealthLink.dto.ai.LabObservationUpdateRequest;
import com.HealthLink.dto.ai.LabReportVerificationResponse;
import com.HealthLink.dto.ai.LabReportVerifyRequest;
import com.HealthLink.service.ai.LabReportService;
import com.HealthLink.service.ai.LabReportVerificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/doctor")
public class DoctorLabReportController {
    private final LabReportService labReportService;
    private final LabReportVerificationService verificationService;

    @Autowired
    public DoctorLabReportController(LabReportService labReportService, LabReportVerificationService verificationService) {
        this.labReportService = labReportService;
        this.verificationService = verificationService;
    }

    DoctorLabReportController(LabReportService labReportService) {
        this(labReportService, null);
    }

    @PostMapping(value = "/appointments/{appointmentId}/lab-reports", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CreateLabReportResponse> upload(@PathVariable Integer appointmentId,
                                                           @RequestParam("file") MultipartFile file,
                                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate documentDate,
                                                           @RequestParam(required = false) String labFacilityName,
                                                           @RequestHeader("Idempotency-Key") String idempotencyKey) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(
                labReportService.upload(appointmentId, file, documentDate, labFacilityName, idempotencyKey));
    }

    @GetMapping("/appointments/{appointmentId}/lab-reports")
    public ResponseEntity<List<LabReportDetailResponse>> list(@PathVariable Integer appointmentId) {
        return ResponseEntity.ok(labReportService.list(appointmentId));
    }

    @GetMapping("/lab-reports/{reportId}")
    public ResponseEntity<LabReportDetailResponse> detail(@PathVariable UUID reportId) {
        return ResponseEntity.ok(labReportService.detail(reportId));
    }

    @GetMapping("/lab-reports/{reportId}/file")
    public ResponseEntity<InputStreamResource> file(@PathVariable UUID reportId) {
        LabReportDetailResponse detail = labReportService.detail(reportId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(detail.mimeType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"lab-report\"")
                .contentLength(detail.fileSize()).body(new InputStreamResource(labReportService.openFile(reportId)));
    }

    @GetMapping("/lab-reports/{reportId}/verification")
    public ResponseEntity<LabReportVerificationResponse> verification(@PathVariable UUID reportId) {
        return ResponseEntity.ok(verificationService.verification(reportId));
    }

    @PutMapping("/lab-reports/{reportId}/observations/{observationId}")
    public ResponseEntity<LabReportVerificationResponse> updateObservation(@PathVariable UUID reportId,
                                                                             @PathVariable UUID observationId,
                                                                             @RequestBody LabObservationUpdateRequest request) {
        return ResponseEntity.ok(verificationService.updateObservation(reportId, observationId, request));
    }

    @PostMapping("/lab-reports/{reportId}/verify")
    public ResponseEntity<LabReportVerificationResponse> verify(@PathVariable UUID reportId,
                                                                  @RequestBody LabReportVerifyRequest request) {
        return ResponseEntity.ok(verificationService.verify(reportId, request));
    }

    @PostMapping("/lab-reports/{reportId}/reprocess")
    public ResponseEntity<CreateLabReportResponse> reprocess(@PathVariable UUID reportId) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(verificationService.reprocess(reportId));
    }
}
