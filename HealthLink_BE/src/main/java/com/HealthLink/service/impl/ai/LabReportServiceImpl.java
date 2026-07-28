package com.HealthLink.service.impl.ai;

import com.HealthLink.dto.ai.CreateLabReportResponse;
import com.HealthLink.dto.ai.LabReportDetailResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.ai.AiJob;
import com.HealthLink.entity.ai.AiJobType;
import com.HealthLink.entity.ai.LabReport;
import com.HealthLink.entity.ai.LabReportUploadIdempotency;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.ai.LabReportRepository;
import com.HealthLink.repository.ai.LabReportUploadIdempotencyRepository;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.service.ai.AiJobService;
import com.HealthLink.service.ai.LabReportService;
import com.HealthLink.service.ai.LabReportStatusEvent;
import com.HealthLink.service.ai.LabReportStatusPublisher;
import com.HealthLink.service.ai.PrivateObjectStorageService;
import com.HealthLink.utility.DoctorSecurityUtils;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.DigestInputStream;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class LabReportServiceImpl implements LabReportService {
    private static final long MAX_BYTES = 15L * 1024 * 1024;
    private static final int MAX_PDF_PAGES = 20;

    private final AppointmentRepository appointmentRepository;
    private final LabReportRepository reportRepository;
    private final LabReportUploadIdempotencyRepository idempotencyRepository;
    private final DoctorSecurityUtils doctorSecurity;
    private final PrivateObjectStorageService storage;
    private final AiJobService jobService;
    private final LabReportStatusPublisher statusPublisher;
    private String tempDirectory;

    public LabReportServiceImpl(AppointmentRepository appointmentRepository, LabReportRepository reportRepository,
                                LabReportUploadIdempotencyRepository idempotencyRepository,
                                DoctorSecurityUtils doctorSecurity, PrivateObjectStorageService storage,
                                AiJobService jobService,
                                LabReportStatusPublisher statusPublisher,
                                @Value("${ai.lab.temp-directory:${java.io.tmpdir}}") String tempDirectory) {
        this.appointmentRepository = appointmentRepository;
        this.reportRepository = reportRepository;
        this.idempotencyRepository = idempotencyRepository;
        this.doctorSecurity = doctorSecurity;
        this.storage = storage;
        this.jobService = jobService;
        this.statusPublisher = statusPublisher;
        this.tempDirectory = tempDirectory;
    }

    @Override
    @Transactional
    public CreateLabReportResponse upload(Integer appointmentId, MultipartFile file, LocalDate documentDate,
                                          String labFacilityName, String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank() || idempotencyKey.length() > 200) {
            throw new BadRequestException("Idempotency-Key is required and must be at most 200 characters");
        }
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", appointmentId));
        doctorSecurity.requireAssignedDoctor(appointment);
        Doctor doctor = appointment.getDoctor();
        var existing = idempotencyRepository.findByAppointmentIdAndDoctorIdAndIdempotencyKey(
                appointmentId, doctor.getDoctorId(), idempotencyKey);
        if (existing.isPresent()) {
            return replay(existing.get());
        }
        validateDeclaredSize(file);

        Path temporaryFile = null;
        String objectKey = null;
        try {
            temporaryFile = copyToTemporaryFile(file);
            ValidatedFile validated = validateContent(temporaryFile);
            UUID reportId = UUID.randomUUID();
            objectKey = "clinical/%d/%s/%s.%s".formatted(appointmentId, reportId, UUID.randomUUID(), validated.extension());
            storage.store(objectKey, temporaryFile, Files.size(temporaryFile), validated.mimeType());
            LabReport report = reportRepository.save(LabReport.builder()
                    .reportId(reportId).appointment(appointment).objectKey(objectKey)
                    .originalFileName(safeOriginalFileName(file.getOriginalFilename()))
                    .mimeType(validated.mimeType()).fileSize(Files.size(temporaryFile)).sha256(sha256(temporaryFile))
                    .pageCount(validated.pageCount()).status(LabReport.UPLOADED).uploadedByDoctor(doctor).build());
            AiJob job = jobService.enqueue(AiJobType.OCR_LAB_REPORT, "LabReport", report.getReportId().toString(),
                    UUID.randomUUID(), 3);
            idempotencyRepository.save(LabReportUploadIdempotency.completed(appointmentId, doctor.getDoctorId(),
                    idempotencyKey, report.getReportId(), job.getJobId()));
            CreateLabReportResponse response = response(report, job.getJobId());
            publishUploadStatus(doctor, report, appointmentId);
            return response;
        } catch (IOException exception) {
            if (objectKey != null) {
                storage.delete(objectKey);
            }
            throw new BadRequestException("Unable to read laboratory file", exception);
        } catch (RuntimeException exception) {
            if (objectKey != null) {
                storage.delete(objectKey);
            }
            throw exception;
        } finally {
            if (temporaryFile != null) {
                try {
                    Files.deleteIfExists(temporaryFile);
                } catch (IOException ignored) {
                    // Temporary files contain only the current request and are removed best-effort.
                }
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabReportDetailResponse> list(Integer appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", appointmentId));
        doctorSecurity.requireAssignedDoctor(appointment);
        return reportRepository.findByAppointment_AppointmentIdOrderByUploadedAtDesc(appointmentId).stream()
                .map(this::detailResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public LabReportDetailResponse detail(UUID reportId) {
        return detailResponse(authorizedReport(reportId));
    }

    @Override
    @Transactional(readOnly = true)
    public InputStream openFile(UUID reportId) {
        return storage.open(authorizedReport(reportId).getObjectKey());
    }

    private LabReport authorizedReport(UUID reportId) {
        LabReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Lab report", "id", reportId));
        doctorSecurity.requireAssignedDoctor(report.getAppointment());
        return report;
    }

    private CreateLabReportResponse replay(LabReportUploadIdempotency replay) {
        LabReport report = reportRepository.findById(replay.getReportId())
                .orElseThrow(() -> new ResourceNotFoundException("Lab report", "id", replay.getReportId()));
        return response(report, replay.getJobId());
    }

    private CreateLabReportResponse response(LabReport report, UUID jobId) {
        return new CreateLabReportResponse(report.getReportId(), jobId, report.getStatus(), report.getUploadedAt());
    }

    private void publishUploadStatus(Doctor doctor, LabReport report, Integer appointmentId) {
        if (doctor.getUser() == null || doctor.getUser().getId() == null || doctor.getUser().getId().isBlank()) {
            return;
        }
        try {
            statusPublisher.publish(doctor.getUser().getId(),
                    new LabReportStatusEvent(report.getReportId(), appointmentId, report.getStatus()));
        } catch (RuntimeException ignored) {
            // Persisted uploads remain valid if the broker is unavailable.
        }
    }

    private LabReportDetailResponse detailResponse(LabReport report) {
        return new LabReportDetailResponse(report.getReportId(), report.getAppointment().getAppointmentId(),
                report.getOriginalFileName(), report.getMimeType(), report.getFileSize(), report.getPageCount(),
                report.getStatus(), report.getUploadedAt());
    }

    private void validateDeclaredSize(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() <= 0) {
            throw new BadRequestException("Laboratory file must not be empty");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BadRequestException("Laboratory file must not exceed 15 MiB");
        }
    }

    private Path copyToTemporaryFile(MultipartFile file) throws IOException {
        Path directory = Path.of(tempDirectory);
        Files.createDirectories(directory);
        Path target = Files.createTempFile(directory, "lab-report-", ".upload");
        try (InputStream input = new BufferedInputStream(file.getInputStream())) {
            long copied = Files.copy(input, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            if (copied == 0 || copied > MAX_BYTES) {
                throw new BadRequestException(copied == 0 ? "Laboratory file must not be empty" : "Laboratory file must not exceed 15 MiB");
            }
        }
        return target;
    }

    private ValidatedFile validateContent(Path file) throws IOException {
        byte[] prefix = new byte[8];
        try (InputStream input = Files.newInputStream(file)) {
            int count = input.read(prefix);
            if (count >= 5 && prefix[0] == '%' && prefix[1] == 'P' && prefix[2] == 'D' && prefix[3] == 'F' && prefix[4] == '-') {
                try (PDDocument document = Loader.loadPDF(file.toFile())) {
                    if (document.getNumberOfPages() > MAX_PDF_PAGES) {
                        throw new BadRequestException("PDF must not exceed 20 pages");
                    }
                    return new ValidatedFile("application/pdf", "pdf", document.getNumberOfPages());
                }
            }
            if (count >= 8 && prefix[0] == (byte) 0x89 && prefix[1] == 0x50 && prefix[2] == 0x4e && prefix[3] == 0x47
                    && prefix[4] == 0x0d && prefix[5] == 0x0a && prefix[6] == 0x1a && prefix[7] == 0x0a) {
                return new ValidatedFile("image/png", "png", 1);
            }
            if (count >= 3 && prefix[0] == (byte) 0xff && prefix[1] == (byte) 0xd8 && prefix[2] == (byte) 0xff) {
                return new ValidatedFile("image/jpeg", "jpg", 1);
            }
        }
        throw new BadRequestException("Laboratory file must be a PDF, JPEG, or PNG based on its content");
    }

    private String sha256(Path source) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream raw = Files.newInputStream(source); DigestInputStream input = new DigestInputStream(raw, digest)) {
                input.transferTo(java.io.OutputStream.nullOutputStream());
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 unavailable", impossible);
        }
    }

    private String safeOriginalFileName(String originalFileName) {
        return originalFileName == null || originalFileName.isBlank() ? "lab-report" : Path.of(originalFileName).getFileName().toString();
    }

    private record ValidatedFile(String mimeType, String extension, int pageCount) { }
}
