package com.HealthLink.repository.ai;

import com.HealthLink.entity.ai.GuidelineChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface GuidelineChunkRepository extends JpaRepository<GuidelineChunk, UUID> {
}
