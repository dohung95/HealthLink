package com.HealthLink.controller.payment;

import com.HealthLink.dto.payment.CommissionConfigDTO;
import com.HealthLink.entity.CommissionConfig;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.payment.PaymentCommissionConfigRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * REST controller để Admin quản lý cấu hình tỷ lệ chiết khấu (CommissionConfig).
 *
 * <p>Đường dẫn gốc: /api/admin/commission-configs
 *
 * <p>Các endpoint:
 * <ul>
 *   <li>GET    /api/admin/commission-configs          – Danh sách tất cả cấu hình</li>
 *   <li>GET    /api/admin/commission-configs/{id}     – Chi tiết một cấu hình</li>
 *   <li>POST   /api/admin/commission-configs          – Tạo mới cấu hình</li>
 *   <li>PUT    /api/admin/commission-configs/{id}     – Cập nhật cấu hình</li>
 *   <li>DELETE /api/admin/commission-configs/{id}     – Vô hiệu hóa cấu hình</li>
 * </ul>
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/commission-configs")
@RequiredArgsConstructor
public class CommissionConfigController {

    private final PaymentCommissionConfigRepository commissionConfigRepository;

    // ──────────────────────────────────────────────────────────────────────
    // Lấy danh sách cấu hình
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Lấy toàn bộ danh sách cấu hình chiết khấu.
     *
     * GET /api/admin/commission-configs
     */
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<CommissionConfigDTO>> getAllConfigs() {
        List<CommissionConfigDTO> result = commissionConfigRepository.findAll()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /**
     * Lấy chi tiết một cấu hình chiết khấu theo ID.
     *
     * GET /api/admin/commission-configs/{id}
     */
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<CommissionConfigDTO> getConfigById(@PathVariable Integer id) {
        CommissionConfig config = commissionConfigRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("CommissionConfig not found with ID: " + id));
        return ResponseEntity.ok(toDTO(config));
    }

    // ──────────────────────────────────────────────────────────────────────
    // Tạo mới cấu hình
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Tạo mới cấu hình tỷ lệ chiết khấu cho một loại dịch vụ.
     * ServiceType phải là duy nhất (ví dụ: CONSULTATION_ONLINE, CONSULTATION_OFFLINE, PHARMACY_ORDER).
     *
     * POST /api/admin/commission-configs
     */
    @PostMapping
    @Transactional
    public ResponseEntity<CommissionConfigDTO> createConfig(
            @Valid @RequestBody CommissionConfigDTO dto) {
        // Kiểm tra serviceType không trùng lặp
        if (commissionConfigRepository.findByServiceTypeAndActiveTrue(dto.getServiceType()).isPresent()) {
            throw new BadRequestException(
                    "An active CommissionConfig already exists for serviceType: " + dto.getServiceType());
        }

        CommissionConfig config = CommissionConfig.builder()
                .serviceType(dto.getServiceType())
                .commissionRate(dto.getCommissionRate())
                .minCommission(dto.getMinCommission())
                .description(dto.getDescription())
                .active(true)
                .effectiveFrom(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();

        CommissionConfig saved = commissionConfigRepository.save(config);
        log.info("CommissionConfig created: serviceType={}, rate={}",
                saved.getServiceType(), saved.getCommissionRate());

        return ResponseEntity.ok(toDTO(saved));
    }

    // ──────────────────────────────────────────────────────────────────────
    // Cập nhật cấu hình
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Cập nhật tỷ lệ chiết khấu cho một cấu hình đã tồn tại.
     * Ghi lại thời gian updatedAt.
     *
     * PUT /api/admin/commission-configs/{id}
     */
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<CommissionConfigDTO> updateConfig(
            @PathVariable Integer id,
            @Valid @RequestBody CommissionConfigDTO dto) {
        CommissionConfig config = commissionConfigRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("CommissionConfig not found with ID: " + id));

        // Cập nhật các trường được phép thay đổi
        config.setCommissionRate(dto.getCommissionRate());
        config.setMinCommission(dto.getMinCommission());
        config.setDescription(dto.getDescription());
        config.setUpdatedAt(LocalDateTime.now());

        CommissionConfig updated = commissionConfigRepository.save(config);
        log.info("CommissionConfig updated: id={}, newRate={}", id, updated.getCommissionRate());

        return ResponseEntity.ok(toDTO(updated));
    }

    // ──────────────────────────────────────────────────────────────────────
    // Vô hiệu hóa cấu hình (soft delete)
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Vô hiệu hóa (soft-delete) một cấu hình chiết khấu.
     * Không xóa bản ghi khỏi DB để bảo toàn lịch sử kiểm toán.
     *
     * DELETE /api/admin/commission-configs/{id}
     */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deactivateConfig(@PathVariable Integer id) {
        CommissionConfig config = commissionConfigRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("CommissionConfig not found with ID: " + id));

        config.setActive(false);
        config.setEffectiveTo(LocalDateTime.now());
        config.setUpdatedAt(LocalDateTime.now());
        commissionConfigRepository.save(config);

        log.info("CommissionConfig deactivated: id={}, serviceType={}", id, config.getServiceType());
        return ResponseEntity.noContent().build();
    }

    // ──────────────────────────────────────────────────────────────────────
    // Private helper – Ánh xạ entity → DTO
    // ──────────────────────────────────────────────────────────────────────

    /** Ánh xạ CommissionConfig entity → CommissionConfigDTO. */
    private CommissionConfigDTO toDTO(CommissionConfig config) {
        return CommissionConfigDTO.builder()
                .serviceType(config.getServiceType())
                .commissionRate(config.getCommissionRate())
                .minCommission(config.getMinCommission())
                .description(config.getDescription())
                .build();
    }
}
