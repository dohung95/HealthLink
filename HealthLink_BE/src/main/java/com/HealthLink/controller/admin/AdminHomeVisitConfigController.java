package com.HealthLink.controller.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:63527")
@RestController
@RequestMapping("/api/admin/home-visit")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminHomeVisitConfigController {

    @Value("${homevisit.default-fee}")
    private BigDecimal defaultFee;

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        return ResponseEntity.ok(Map.of("defaultFee", defaultFee));
    }
}
