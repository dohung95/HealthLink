package com.HealthLink.controller.ai;

import com.HealthLink.dto.ai.CreateLabReportResponse;
import com.HealthLink.service.ai.LabReportService;
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
