package com.HealthLink.controller.appointment;

import com.HealthLink.dto.request.HomeVisitDoctorSearchRequest;
import com.HealthLink.dto.request.HomeVisitEstimateRequest;
import com.HealthLink.dto.request.HomeVisitSlotSearchRequest;
import com.HealthLink.dto.request.SelectSessionRequest;
import com.HealthLink.dto.response.*;
import com.HealthLink.entity.HomeVisitDraft;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.HomeVisitDraftRepository;
import com.HealthLink.repository.appointment.HomeVisitServiceRepository;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.ai.DocumentAiService;
import com.HealthLink.service.homevisit.HomeVisitDoctorSearchService;
import com.HealthLink.service.homevisit.HomeVisitLocationService;
import com.HealthLink.service.homevisit.HomeVisitSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HomeVisitController {

    private final DocumentAiService documentAiService;
    private final HomeVisitLocationService homeVisitLocationService;
    private final HomeVisitSessionService homeVisitSessionService;
    private final HomeVisitDraftRepository homeVisitDraftRepository;
    private final UserRepository userRepository;
    private final HomeVisitServiceRepository homeVisitServiceRepository;
    private final HomeVisitDoctorSearchService homeVisitDoctorSearchService;

    private String resolveUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException(
                "User", "email", userDetails.getUsername()))
                .getId();
    }

    @PostMapping("/home-visit/scan-info")
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

            HomeVisitInfoScanResponse result
                    = documentAiService.parseHomeVisitInfo(base64, mimeType);

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

    @GetMapping("/home-visit/geocode")
    public ResponseEntity<List<HomeVisitGeocodeResponse>> geocode(
            @RequestParam String address
    ) {
        return ResponseEntity.ok(homeVisitLocationService.geocodeByNominatim(address));
    }

    @PostMapping("/home-visit/estimate")
    public ResponseEntity<HomeVisitEstimateResponse> estimate(
            @RequestBody HomeVisitEstimateRequest request
    ) {
        return ResponseEntity.ok(
                homeVisitLocationService.estimate(
                        request.getDoctorId(),
                        request.getVisitLatitude(),
                        request.getVisitLongitude()
                )
        );
    }

    @GetMapping("/doctors/{doctorId}/home-visit-sessions")
    public ResponseEntity<List<AvailableSessionResponse>> getSessions(
            @PathVariable String doctorId
    ) {
        return ResponseEntity.ok(homeVisitSessionService.getAvailableSessions(doctorId));
    }

    @PostMapping("/home-visit/select-session")
    public ResponseEntity<DraftResponse> selectSession(
            @RequestBody SelectSessionRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String patientId = resolveUserId(userDetails);

        if (!homeVisitSessionService.isSlotAvailable(
                request.getDoctorId(),
                request.getScheduleId(),
                request.getBookingDate(),
                request.getStartTime(),
                request.getEndTime()
        )) {
            return ResponseEntity.badRequest().body(
                    DraftResponse.builder()
                            .message("Selected home visit slot is no longer available")
                            .build()
            );
        }

        HomeVisitDraft draft = HomeVisitDraft.builder()
                .patientId(patientId)
                .doctorId(request.getDoctorId())
                .scheduleId(request.getScheduleId())
                .bookingDate(request.getBookingDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .visitAddress(request.getVisitAddress())
                .visitLatitude(request.getVisitLatitude())
                .visitLongitude(request.getVisitLongitude())
                .contactPhone(request.getContactPhone())
                .reasonForHomeVisit(request.getReasonForHomeVisit())
                .specialNotes(request.getSpecialNotes())
                .expiresAt(LocalDateTime.now().plusMinutes(30))
                .build();

        draft = homeVisitDraftRepository.save(draft);

        return ResponseEntity.ok(DraftResponse.builder()
                .draftId(draft.getId())
                .expiresAt(draft.getExpiresAt())
                .message("Session selected. Please complete payment within 30 minutes.")
                .build());
    }

    @GetMapping("/home-visit/sessions")
    public ResponseEntity<SessionStatusResponse> checkSessionStatus(
            @RequestParam String doctorId,
            @RequestParam String date,
            @RequestParam Integer scheduleId
    ) {
        java.time.LocalDate bookingDate = java.time.LocalDate.parse(date);
        boolean available = homeVisitSessionService.isSessionAvailable(doctorId, scheduleId, bookingDate);
        return ResponseEntity.ok(SessionStatusResponse.builder()
                .scheduleId(scheduleId)
                .available(available)
                .message(available ? "Session is available" : "Session is no longer available")
                .build());
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

    @GetMapping("/home-visit/services")
    public ResponseEntity<List<HomeVisitServiceResponse>> getHomeVisitServices() {
        return ResponseEntity.ok(
                homeVisitServiceRepository.findByActiveTrueOrderByServiceNameAsc()
                        .stream()
                        .map(service -> HomeVisitServiceResponse.builder()
                        .serviceId(service.getServiceId())
                        .serviceName(service.getServiceName())
                        .description(service.getDescription())
                        .price(service.getPrice())
                        .durationMinutes(service.getDurationMinutes())
                        .build())
                        .toList()
        );
    }

    @PostMapping("/doctors/{doctorId}/home-visit-slots")
    public ResponseEntity<List<HomeVisitSlotResponse>> getHomeVisitSlots(
            @PathVariable String doctorId,
            @RequestBody HomeVisitSlotSearchRequest request
    ) {
        return ResponseEntity.ok(
                homeVisitSessionService.getAvailableSlots(
                        doctorId,
                        request.getVisitLatitude(),
                        request.getVisitLongitude(),
                        request.getHomeVisitServiceIds()
                )
        );
    }

    @PostMapping("/home-visit/doctors/search")
    public ResponseEntity<List<HomeVisitDoctorOptionResponse>> searchHomeVisitDoctors(
            @RequestBody HomeVisitDoctorSearchRequest request
    ) {
        return ResponseEntity.ok(homeVisitDoctorSearchService.search(request));
    }
}
