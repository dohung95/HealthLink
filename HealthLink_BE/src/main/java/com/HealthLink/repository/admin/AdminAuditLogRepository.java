package com.HealthLink.repository.admin;

import com.HealthLink.entity.AdminAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, Long>, JpaSpecificationExecutor<AdminAuditLog> {

    @Query(value = "SELECT a FROM AdminAuditLog a " +
           "LEFT JOIN FETCH a.adminUser " +
           "WHERE (:category IS NULL OR :category = '' OR a.category = :category) " +
           "AND (:actionType IS NULL OR :actionType = '' OR a.actionType = :actionType) " +
           "AND (:targetType IS NULL OR :targetType = '' OR a.targetType = :targetType) " +
           "AND (:targetId IS NULL OR :targetId = '' OR a.targetId = :targetId) " +
           "AND (:adminUserId IS NULL OR :adminUserId = '' OR a.adminUser.id = :adminUserId) " +
           "AND (:startTime IS NULL OR a.createdAt >= :startTime) " +
           "AND (:endTime IS NULL OR a.createdAt <= :endTime)",
           countQuery = "SELECT COUNT(a) FROM AdminAuditLog a " +
           "WHERE (:category IS NULL OR :category = '' OR a.category = :category) " +
           "AND (:actionType IS NULL OR :actionType = '' OR a.actionType = :actionType) " +
           "AND (:targetType IS NULL OR :targetType = '' OR a.targetType = :targetType) " +
           "AND (:targetId IS NULL OR :targetId = '' OR a.targetId = :targetId) " +
           "AND (:adminUserId IS NULL OR :adminUserId = '' OR a.adminUser.id = :adminUserId) " +
           "AND (:startTime IS NULL OR a.createdAt >= :startTime) " +
           "AND (:endTime IS NULL OR a.createdAt <= :endTime)")
    Page<AdminAuditLog> findWithFilters(
            @Param("category") String category,
            @Param("actionType") String actionType,
            @Param("targetType") String targetType,
            @Param("targetId") String targetId,
            @Param("adminUserId") String adminUserId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            Pageable pageable
    );

    List<AdminAuditLog> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(String targetType, String targetId);

    List<AdminAuditLog> findByCategoryOrderByCreatedAtDesc(String category);

    @Query("SELECT COUNT(a) FROM AdminAuditLog a WHERE a.category = :category")
    long countByCategory(@Param("category") String category);

    @Query("SELECT COUNT(a) FROM AdminAuditLog a WHERE a.actionType = :actionType")
    long countByActionType(@Param("actionType") String actionType);

    @Query("SELECT COUNT(a) FROM AdminAuditLog a WHERE a.createdAt >= :startTime AND a.createdAt <= :endTime")
    long countByDateRange(@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);
}
