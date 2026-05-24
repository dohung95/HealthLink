package com.HealthLink.repository.admin;

import com.HealthLink.entity.AdminScheduleAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AdminScheduleAuditLogRepository extends JpaRepository<AdminScheduleAuditLog, Long> {

    /**
     * Lấy tất cả audit logs có phân trang.
     */
    Page<AdminScheduleAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Lấy audit logs của một admin cụ thể.
     */
    Page<AdminScheduleAuditLog> findByAdminUser_IdOrderByCreatedAtDesc(String adminUserId, Pageable pageable);

    /**
     * Lấy audit logs liên quan đến một bác sĩ.
     */
    Page<AdminScheduleAuditLog> findByTargetDoctorIdOrderByCreatedAtDesc(String doctorId, Pageable pageable);

    /**
     * Lấy audit logs liên quan đến một appointment.
     */
    List<AdminScheduleAuditLog> findByTargetAppointmentIdOrderByCreatedAtDesc(Integer appointmentId);

    /**
     * Lấy audit logs theo loại action.
     */
    Page<AdminScheduleAuditLog> findByActionTypeOrderByCreatedAtDesc(String actionType, Pageable pageable);

    /**
     * Lấy audit logs trong khoảng thời gian.
     */
    Page<AdminScheduleAuditLog> findByCreatedAtBetweenOrderByCreatedAtDesc(
            LocalDateTime startTime, LocalDateTime endTime, Pageable pageable);

    /**
     * Tìm kiếm audit logs với nhiều filter.
     */
    @Query("SELECT a FROM AdminScheduleAuditLog a WHERE " +
           "(:adminUserId IS NULL OR a.adminUser.id = :adminUserId) AND " +
           "(:doctorId IS NULL OR a.targetDoctorId = :doctorId) AND " +
           "(:actionType IS NULL OR a.actionType = :actionType) AND " +
           "(:startTime IS NULL OR a.createdAt >= :startTime) AND " +
           "(:endTime IS NULL OR a.createdAt <= :endTime) " +
           "ORDER BY a.createdAt DESC")
    Page<AdminScheduleAuditLog> findWithFilters(
            @Param("adminUserId") String adminUserId,
            @Param("doctorId") String doctorId,
            @Param("actionType") String actionType,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            Pageable pageable);

    /**
     * Đếm số actions của admin trong ngày (để giám sát).
     */
    @Query("SELECT COUNT(a) FROM AdminScheduleAuditLog a WHERE a.adminUser.id = :adminUserId AND a.createdAt >= :startOfDay")
    long countAdminActionsToday(@Param("adminUserId") String adminUserId, @Param("startOfDay") LocalDateTime startOfDay);
}
