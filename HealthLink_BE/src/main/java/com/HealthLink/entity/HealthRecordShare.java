package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "HealthRecordShares")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class HealthRecordShare {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ShareID")
    private Integer shareId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "HealthRecordID", nullable = false)
    @ToString.Exclude
    private HealthRecord healthRecord;

    @Column(columnDefinition = "TEXT")
    private String sharedDocumentIds;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SharedWithDoctorId", nullable = false)
    @ToString.Exclude
    private Doctor sharedWithDoctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SharedByPatientId", nullable = false)
    @ToString.Exclude
    private Patient sharedByPatient;

    private String permissionLevel = "View";
    
    @Column(nullable = false)
    private LocalDateTime consentGivenAt;
    
    private LocalDateTime expiryDate;
    private boolean isRevoked = false;
    private LocalDateTime revokedAt;
    private String revokeReason;
}