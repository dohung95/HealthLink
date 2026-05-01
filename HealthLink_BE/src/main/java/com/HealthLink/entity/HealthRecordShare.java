package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "HealthRecordShares")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthRecordShare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ShareID")
    private Integer shareId;

    @Column(name = "HealthRecordID", nullable = false)
    private Integer healthRecordId;

    @Column(name = "SharedDocumentIDs")
    private String sharedDocumentIds;

    @Column(name = "SharedWithDoctorID", nullable = false, length = 450)
    private String sharedWithDoctorId;

    @Column(name = "SharedByPatientID", nullable = false, length = 450)
    private String sharedByPatientId;

    @Column(name = "PermissionLevel", nullable = false)
    @Builder.Default
    private String permissionLevel = "View";

    @Column(name = "ConsentGivenAt", nullable = false)
    private LocalDateTime consentGivenAt;

    @Column(name = "ExpiryDate")
    private LocalDateTime expiryDate;

    @Column(name = "IsRevoked", nullable = false)
    @Builder.Default
    private boolean isRevoked = false;

    @Column(name = "RevokedAt")
    private LocalDateTime revokedAt;

    @Column(name = "RevokeReason")
    private String revokeReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "HealthRecordID", insertable = false, updatable = false)
    private HealthRecord healthRecord;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SharedWithDoctorID", insertable = false, updatable = false)
    private Doctor sharedWithDoctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SharedByPatientID", insertable = false, updatable = false)
    private Patient sharedByPatient;

    // Permission levels
    public static final String PERMISSION_VIEW = "View";
    public static final String PERMISSION_VIEW_AND_EDIT = "ViewAndEdit";

    @PrePersist
    protected void onCreate() {
        if (consentGivenAt == null) {
            consentGivenAt = LocalDateTime.now();
        }
        if (permissionLevel == null) {
            permissionLevel = PERMISSION_VIEW;
        }
    }
}
