package com.HealthLink.entity.ai;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "GuidelineDocuments")
@Getter @Setter @Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class GuidelineDocument {
    public static final String ACTIVE_STUDENT_DEMO = "ACTIVE_STUDENT_DEMO";

    @Id @Column(name = "DocumentID", nullable = false, updatable = false)
    private UUID documentId;
    @Column(name = "Title", nullable = false, length = 500, updatable = false)
    private String title;
    @Column(name = "Issuer", nullable = false, length = 200, updatable = false)
    private String issuer;
    @Column(name = "Version", nullable = false, length = 100, updatable = false)
    private String version;
    @Column(name = "EffectiveDate", nullable = false, updatable = false)
    private LocalDate effectiveDate;
    @Column(name = "Checksum", nullable = false, length = 64, updatable = false)
    private String checksum;
    @Column(name = "License", nullable = false, length = 100, updatable = false)
    private String license;
    @Column(name = "CorpusVersion", nullable = false, length = 100, updatable = false)
    private String corpusVersion;
    @Column(name = "Status", nullable = false, length = 40, updatable = false)
    private String status;
    @Column(name = "RegisteredAt", nullable = false, updatable = false)
    private Instant registeredAt;
}
