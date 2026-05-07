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

    @Column(name = "PermissionLevel", length = 50)
    @Builder.Default
    private String permissionLevel = "View";
    
    @Column(name = "ConsentGivenAt", nullable = false)
    private LocalDateTime consentGivenAt;
    
    @Column(name = "ExpiryDate")
    private LocalDateTime expiryDate;

    @Column(name = "Revoked")
    @Builder.Default
    private boolean revoked = false;
    
    @Column(name = "RevokedAt")
    private LocalDateTime revokedAt;
    
    @Column(name = "RevokeReason")
    private String revokeReason;
}