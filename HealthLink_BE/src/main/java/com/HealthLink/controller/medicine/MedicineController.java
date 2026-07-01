package com.HealthLink.controller.medicine;

import com.HealthLink.dto.medicine.MedicineRequest;
import com.HealthLink.dto.medicine.MedicineResponse;
import com.HealthLink.service.medicine.MedicineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medicines")
@RequiredArgsConstructor
public class MedicineController {

    private final MedicineService medicineService;

    /**
     * GET /api/medicines?keyword=...
     * Tìm kiếm thuốc theo tên. Nếu không truyền keyword, trả về tất cả thuốc đang
     * hoạt động.
     */
    @GetMapping
    public ResponseEntity<List<MedicineResponse>> searchMedicines(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String dosageForm,
            @RequestParam(required = false) Integer categoryId) {
        return ResponseEntity.ok(medicineService.searchMedicines(keyword, category, dosageForm, categoryId));
    }

    /**
     * GET /api/medicines/{id}
     * Lấy chi tiết một loại thuốc theo ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<MedicineResponse> getMedicineById(@PathVariable Integer id) {
        return ResponseEntity.ok(medicineService.getMedicineById(id));
    }

    /**
     * POST /api/medicines
     * Thêm một loại thuốc mới.
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MedicineResponse> addMedicine(@RequestBody MedicineRequest medicine) {
        return ResponseEntity.ok(medicineService.addMedicine(medicine));
    }

    /**
     * PUT /api/medicines/{id}
     * Cập nhật thông tin một loại thuốc.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MedicineResponse> updateMedicine(@PathVariable Integer id,
            @RequestBody MedicineRequest medicine) {
        return ResponseEntity.ok(medicineService.updateMedicine(id, medicine));
    }

    /**
     * DELETE /api/medicines/{id}
     * Xóa một loại thuốc.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteMedicine(@PathVariable Integer id) {
        medicineService.deleteMedicine(id);
        return ResponseEntity.noContent().build();
    }
}
