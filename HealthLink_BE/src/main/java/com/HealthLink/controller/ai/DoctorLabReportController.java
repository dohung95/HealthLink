package com.HealthLink.controller.ai;

import com.HealthLink.dto.ai.CreateLabReportResponse;
import com.HealthLink.dto.ai.LabReportDetailResponse;
import com.HealthLink.service.ai.LabReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
@RequiredArgsConstructor
public class DoctorLabReportController {
    private final LabReportService labReportService;

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
}
