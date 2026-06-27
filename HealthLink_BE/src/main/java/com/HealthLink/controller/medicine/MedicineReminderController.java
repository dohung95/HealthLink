package com.HealthLink.controller.medicine;

import com.HealthLink.dto.medicine.MedicineIntakeCheckRequest;
import com.HealthLink.dto.medicine.MedicineReminderChecklistResponse;
import com.HealthLink.dto.medicine.MedicineReminderSettingRequest;
import com.HealthLink.dto.medicine.MedicineReminderSettingResponse;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.medicine.MedicineReminderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/medicine-reminders")
@RequiredArgsConstructor
public class MedicineReminderController {

    private final MedicineReminderService medicineReminderService;
    private final UserRepository userRepository;

    @GetMapping("/settings")
    public ResponseEntity<MedicineReminderSettingResponse> getSettings(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(medicineReminderService.getSettings(resolveUserId(userDetails)));
    }

    @PutMapping("/settings")
    public ResponseEntity<MedicineReminderSettingResponse> updateSettings(
            @Valid @RequestBody MedicineReminderSettingRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(medicineReminderService.updateSettings(resolveUserId(userDetails), request));
    }

    @GetMapping("/today")
    public ResponseEntity<MedicineReminderChecklistResponse> getTodayChecklist(
            @RequestParam String timing,
            @AuthenticationPrincipal UserDetails userDetails) {
        LocalDateTime now = LocalDateTime.now().withNano(0);
        return ResponseEntity.ok(medicineReminderService.getChecklist(
                resolveUserId(userDetails),
                timing,
                now.toLocalDate(),
                now
        ));
    }

    @PatchMapping("/intake-checks")
    public ResponseEntity<MedicineReminderChecklistResponse> updateIntakeCheck(
            @Valid @RequestBody MedicineIntakeCheckRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(medicineReminderService.updateIntakeCheck(
                resolveUserId(userDetails),
                request,
                LocalDateTime.now().withNano(0)
        ));
    }

    @PatchMapping("/today/{timing}/complete")
    public ResponseEntity<MedicineReminderChecklistResponse> completeTiming(
            @PathVariable String timing,
            @AuthenticationPrincipal UserDetails userDetails) {
        LocalDateTime now = LocalDateTime.now().withNano(0);
        return ResponseEntity.ok(medicineReminderService.completeTiming(
                resolveUserId(userDetails),
                timing,
                now.toLocalDate(),
                now
        ));
    }

    private String resolveUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User", "email", userDetails.getUsername()))
                .getId();
    }
}
