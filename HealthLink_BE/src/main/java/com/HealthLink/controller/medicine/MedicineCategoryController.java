package com.HealthLink.controller.medicine;

import com.HealthLink.dto.medicine.MedicineCategoryResponse;
import com.HealthLink.service.medicine.MedicineCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/medicine-categories")
@RequiredArgsConstructor
public class MedicineCategoryController {

    private final MedicineCategoryService categoryService;

    @GetMapping("/tree")
    public ResponseEntity<List<MedicineCategoryResponse>> getActiveCategoryTree() {
        return ResponseEntity.ok(categoryService.getActiveCategoryTree());
    }
}
