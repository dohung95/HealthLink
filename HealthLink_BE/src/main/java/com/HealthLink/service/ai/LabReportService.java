package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.CreateLabReportResponse;
import com.HealthLink.dto.ai.LabReportDetailResponse;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface LabReportService {
    CreateLabReportResponse upload(Integer appointmentId, MultipartFile file, LocalDate documentDate,
                                   String labFacilityName, String idempotencyKey);
    List<LabReportDetailResponse> list(Integer appointmentId);
    LabReportDetailResponse detail(UUID reportId);
    InputStream openFile(UUID reportId);
}
