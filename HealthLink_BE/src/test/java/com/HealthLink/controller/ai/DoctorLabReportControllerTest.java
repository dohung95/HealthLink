package com.HealthLink.controller.ai;

import com.HealthLink.dto.ai.CreateLabReportResponse;
import com.HealthLink.dto.ai.LabReportVerificationResponse;
import com.HealthLink.service.ai.LabReportService;
import com.HealthLink.service.ai.LabReportVerificationService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DoctorLabReportControllerTest {
    @Test
    void returnsVerificationPayloadFromAssignedDoctorService() {
        LabReportService reports = mock(LabReportService.class);
        LabReportVerificationService verification = mock(LabReportVerificationService.class);
        UUID reportId = UUID.randomUUID();
        LabReportVerificationResponse expected = new LabReportVerificationResponse(reportId, 7, "NEEDS_VERIFICATION", 2,
                "/api/doctor/lab-reports/" + reportId + "/file", java.util.List.of(), java.util.List.of());
        when(verification.verification(reportId)).thenReturn(expected);

        var response = new DoctorLabReportController(reports, verification).verification(reportId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(expected);
    }

    @Test
    void acceptsUploadAsynchronouslyAndForwardsIdempotencyKey() {
        LabReportService service = mock(LabReportService.class);
        CreateLabReportResponse expected = new CreateLabReportResponse(UUID.randomUUID(), UUID.randomUUID(), "UPLOADED", LocalDateTime.now());
        when(service.upload(eq(7), any(), isNull(), isNull(), eq("retry-1"))).thenReturn(expected);
        DoctorLabReportController controller = new DoctorLabReportController(service);

        var response = controller.upload(7,
                new MockMultipartFile("file", "synthetic.pdf", "application/pdf", new byte[] {1}),
                null, null, "retry-1");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        assertThat(response.getBody()).isEqualTo(expected);
    }
}
