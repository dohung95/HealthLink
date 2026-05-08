package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "MedicalDocuments")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MedicalDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "DocumentID")
    private Integer documentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "HealthRecordID", nullable = false)
    @ToString.Exclude
    private HealthRecord healthRecord;

    @Column(nullable = false)
    private String documentName;

    @Column(nullable = false)
    private String documentType;

    @Column(nullable = false)
    private String fileLocation;

    private String category;
    private String description;
    
    @Column(columnDefinition = "TEXT")
    private String testResults;
    
    private String referenceRange;
    private String testStatus;
    private LocalDateTime documentDate;
    private String performedBy;
    
    @Column(name = "UploadedAt", nullable = false)
    @Builder.Default
    private LocalDateTime uploadedAt = LocalDateTime.now();
    
    @Column(name = "FileSize")
    private Long fileSize;
    
    @Column(length = 100)
    private String mimeType;
    
    @Column(length = 500)
    private String thumbnailUrl;
}