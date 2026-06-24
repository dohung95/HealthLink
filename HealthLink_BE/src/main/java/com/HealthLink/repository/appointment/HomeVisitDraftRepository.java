package com.HealthLink.repository.appointment;

import com.HealthLink.entity.HomeVisitDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface HomeVisitDraftRepository extends JpaRepository<HomeVisitDraft, Integer> {

    List<HomeVisitDraft> findByExpiresAtBefore(LocalDateTime now);

    @Modifying
    @Query("DELETE FROM HomeVisitDraft d WHERE d.expiresAt < :now")
    int deleteByExpiresAtBefore(@Param("now") LocalDateTime now);
}
