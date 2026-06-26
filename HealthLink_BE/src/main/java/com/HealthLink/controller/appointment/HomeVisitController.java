package com.HealthLink.controller.appointment;

import com.HealthLink.dto.request.HomeVisitEstimateRequest;
import com.HealthLink.dto.request.SelectSessionRequest;
import com.HealthLink.dto.response.HomeVisitEstimateResponse;
import com.HealthLink.dto.response.HomeVisitGeocodeResponse;
import com.HealthLink.dto.response.HomeVisitInfoScanResponse;
import com.HealthLink.entity.HomeVisitDraft;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.HomeVisitDraftRepository;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.ai.DocumentAiService;
import com.HealthLink.service.homevisit.HomeVisitLocationService;
import com.HealthLink.service.homevisit.HomeVisitSessionService;
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

    private final DocumentAiService documentAiService;
    private final HomeVisitLocationService homeVisitLocationService;

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
                    documentAiService.parseHomeVisitInfo(base64, mimeType);

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
    
    @GetMapping("/geocode")
public ResponseEntity<List<HomeVisitGeocodeResponse>> geocode(
        @RequestParam String address
) {
    return ResponseEntity.ok(homeVisitLocationService.geocode(address));
}

@PostMapping("/estimate")
public ResponseEntity<HomeVisitEstimateResponse> estimate(
        @RequestBody HomeVisitEstimateRequest request
) {
    return ResponseEntity.ok(
            homeVisitLocationService.estimate(
                    request.getVisitLatitude(),
                    request.getVisitLongitude()
            )
    );
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