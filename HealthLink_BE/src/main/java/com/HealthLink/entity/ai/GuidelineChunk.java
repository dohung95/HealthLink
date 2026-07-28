package com.HealthLink.entity.ai;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "GuidelineChunks")
@Getter @Setter @Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class GuidelineChunk {
    @Id @Column(name = "ChunkID", nullable = false, updatable = false)
    private UUID chunkId;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DocumentID", nullable = false, updatable = false)
    @ToString.Exclude
    private GuidelineDocument document;
    @Column(name = "SectionPath", nullable = false, length = 1000, updatable = false)
    private String sectionPath;
    @Column(name = "Page", nullable = false, updatable = false)
    private int page;
    @Column(name = "TextHash", nullable = false, length = 64, updatable = false)
    private String textHash;
    @Column(name = "Checksum", nullable = false, length = 64, updatable = false)
    private String checksum;
    @Column(name = "CorpusVersion", nullable = false, length = 100, updatable = false)
    private String corpusVersion;
    @Column(name = "IndexedAt", nullable = false, updatable = false)
    private Instant indexedAt;
}
