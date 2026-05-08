package com.HealthLink.controller;

import com.HealthLink.dto.registration.DoctorRegistrationRequest;
import com.HealthLink.dto.registration.PharmacyRegistrationRequest;
import com.HealthLink.dto.registration.RegistrationRequestResponse;
import com.HealthLink.entity.Specialty;
import com.HealthLink.service.RegistrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:63527")
@RestController
@RequestMapping("/api/registration")
@RequiredArgsConstructor
public class RegistrationController {

    private final RegistrationService registrationService;

    @PostMapping("/doctor")
    public ResponseEntity<RegistrationRequestResponse> submitDoctorRegistration(
            @Valid @RequestBody DoctorRegistrationRequest request
    ) {
        RegistrationRequestResponse response = registrationService.submitDoctorRegistration(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/pharmacy")
    public ResponseEntity<RegistrationRequestResponse> submitPharmacyRegistration(
            @Valid @RequestBody PharmacyRegistrationRequest request
    ) {
        RegistrationRequestResponse response = registrationService.submitPharmacyRegistration(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/specialties")
    public ResponseEntity<List<Specialty>> getSpecialties() {
        List<Specialty> specialties = registrationService.getActiveSpecialties();
        return ResponseEntity.ok(specialties);
    }
}
