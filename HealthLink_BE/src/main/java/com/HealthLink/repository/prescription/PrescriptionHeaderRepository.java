package com.HealthLink.repository.prescription;

import com.HealthLink.entity.PrescriptionHeader;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PrescriptionHeaderRepository extends JpaRepository<PrescriptionHeader, Integer> {

    List<PrescriptionHeader> findByPatient_PatientId(String patientId);

    List<PrescriptionHeader> findByDoctor_DoctorId(String doctorId);

    List<PrescriptionHeader> findByAppointment_AppointmentId(Integer appointmentId);

    List<PrescriptionHeader> findByAppointment_AppointmentIdOrderByIssueDateDescPrescriptionHeaderIdDesc(
            Integer appointmentId
    );

    Optional<PrescriptionHeader> findByPrescriptionHeaderIdAndPatient_PatientId(
            Integer prescriptionHeaderId,
            String patientId
    );

    @Query("""
            SELECT h
            FROM PrescriptionHeader h
            WHERE h.validUntil IS NOT NULL
              AND h.validUntil >= :now
              AND h.openedAt IS NULL
              AND (h.lastReminderSentAt IS NULL OR h.lastReminderSentAt < :startOfDay)
            """)
    List<PrescriptionHeader> findReminderCandidates(
            @Param("now") LocalDateTime now,
            @Param("startOfDay") LocalDateTime startOfDay
    );

    @Query("""
            SELECT DISTINCT h
            FROM PrescriptionHeader h
            LEFT JOIN FETCH h.prescriptionItems i
            WHERE h.validUntil IS NOT NULL
              AND h.validUntil >= :now
            """)
    List<PrescriptionHeader> findActiveReminderCandidates(@Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE PrescriptionHeader h
               SET h.lastReminderSentAt = :claimedAt
             WHERE h.prescriptionHeaderId = :prescriptionHeaderId
               AND h.validUntil IS NOT NULL
               AND h.validUntil >= :now
               AND h.openedAt IS NULL
               AND (h.lastReminderSentAt IS NULL OR h.lastReminderSentAt < :startOfDay)
            """)
    int claimReminderForToday(
            @Param("prescriptionHeaderId") Integer prescriptionHeaderId,
            @Param("claimedAt") LocalDateTime claimedAt,
            @Param("now") LocalDateTime now,
            @Param("startOfDay") LocalDateTime startOfDay
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE PrescriptionHeader h
               SET h.lastReminderSentAt = NULL
             WHERE h.prescriptionHeaderId = :prescriptionHeaderId
               AND h.lastReminderSentAt = :claimedAt
            """)
    int releaseReminderClaim(
            @Param("prescriptionHeaderId") Integer prescriptionHeaderId,
            @Param("claimedAt") LocalDateTime claimedAt
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE PrescriptionHeader h
               SET h.openedAt = :openedAt
             WHERE h.prescriptionHeaderId = :prescriptionHeaderId
               AND h.patient.patientId = :patientId
               AND h.openedAt IS NULL
            """)
    int markOpenedIfNeeded(
            @Param("prescriptionHeaderId") Integer prescriptionHeaderId,
            @Param("patientId") String patientId,
            @Param("openedAt") LocalDateTime openedAt
    );
}
