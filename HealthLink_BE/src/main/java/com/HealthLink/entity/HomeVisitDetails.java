package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "HomeVisitDetails")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HomeVisitDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "HomeVisitDetailID")
    private Integer homeVisitDetailId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "AppointmentID", nullable = false, unique = true)
    @ToString.Exclude
    private Appointment appointment;

    @Column(name = "VisitAddress", nullable = false, length = 1000)
    private String visitAddress;

    @Column(name = "VisitCity", length = 255)
    private String visitCity;

    @Column(name = "ContactPhone", nullable = false, length = 50)
    private String contactPhone;

    @Column(name = "ReasonForHomeVisit", nullable = false, length = 2000)
    private String reasonForHomeVisit;

    @Column(name = "SpecialNotes", length = 2000)
    private String specialNotes;

    @Column(name = "IsForSelf", nullable = false)
    private Boolean isForSelf;

    @Column(name = "ReceiverName", length = 255)
    private String receiverName;

    @Column(name = "ReceiverAge")
    private Integer receiverAge;

    @Column(name = "ReceiverGender", length = 20)
    private String receiverGender;

    @Column(name = "ReceiverRelationship", length = 100)
    private String receiverRelationship;

    @Column(name = "ReceiverPhone", length = 50)
    private String receiverPhone;

    @Column(name = "VisitLatitude")
    private Double visitLatitude;

    @Column(name = "VisitLongitude")
    private Double visitLongitude;

    @Column(name = "DistanceKm")
    private Double distanceKm;

    @Column(name = "EstimatedTravelMinutes")
    private Integer estimatedTravelMinutes;

    @Column(name = "VisitDurationMinutes")
    @Builder.Default
    private Integer visitDurationMinutes = 30;

    @Column(name = "TravelBufferBeforeMinutes")
    @Builder.Default
    private Integer travelBufferBeforeMinutes = 30;

    @Column(name = "TravelBufferAfterMinutes")
    @Builder.Default
    private Integer travelBufferAfterMinutes = 30;

    @Column(name = "HomeVisitFee", precision = 18, scale = 2)
    private BigDecimal homeVisitFee;

    @Column(name = "TravelFee", precision = 18, scale = 2)
    private BigDecimal travelFee;
}