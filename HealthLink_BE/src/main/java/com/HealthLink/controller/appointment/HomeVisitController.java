package com.HealthLink.controller.appointment;

import com.HealthLink.dto.response.HomeVisitInfoScanResponse;
import com.HealthLink.service.ai.GeminiAIService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.List;

@RestController
@RequestMapping("/api/home-visit")
@RequiredArgsConstructor
public class HomeVisitController {

    private final GeminiAIService geminiAIService;

    @PostMapping("/scan-info")
    public ResponseEntity<HomeVisitInfoScanResponse> scanHomeVisitInfo(
            @RequestParam("file") MultipartFile file
    ) {
        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(
                        HomeVisitInfoScanResponse.builder()
                                .success(false)
                                .errorMessage("File is required")
                                .warnings(List.of("Please upload an image or document"))
                                .build()
                );
            }

            String mimeType = file.getContentType();

            if (!isSupportedFileType(mimeType)) {
                return ResponseEntity.badRequest().body(
                        HomeVisitInfoScanResponse.builder()
                                .success(false)
                                .errorMessage("Unsupported file type")
                                .warnings(List.of("Please upload JPG, PNG, PDF, or DOCX"))
                                .build()
                );
            }

            String base64 = Base64.getEncoder().encodeToString(file.getBytes());

            HomeVisitInfoScanResponse result =
                    geminiAIService.parseHomeVisitInfo(base64, mimeType);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(
                    HomeVisitInfoScanResponse.builder()
                            .success(false)
                            .errorMessage("Cannot scan file: " + e.getMessage())
                            .warnings(List.of("Please fill the form manually"))
                            .build()
            );
        }
    }

    private boolean isSupportedFileType(String mimeType) {
        if (mimeType == null || mimeType.isBlank()) {
            return false;
        }

        return mimeType.startsWith("image/")
                || "application/pdf".equalsIgnoreCase(mimeType)
                || "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    .equalsIgnoreCase(mimeType);
    }
}