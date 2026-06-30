package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "RefundRequests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "RequestId")
    private Integer id;

    @Column(nullable = false, length = 50)
    private String paymentId;

    @Column(nullable = false, length = 50)
    private String patientId;

    private Integer invoiceId;

    @Column(length = 500)
    private String reason;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(length = 50)
    private String reviewedBy;

    @Column(name = "CreatedAt")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "ReviewedAt")
    private LocalDateTime reviewedAt;
}
