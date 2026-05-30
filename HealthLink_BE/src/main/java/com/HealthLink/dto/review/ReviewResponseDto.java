package com.HealthLink.dto.review;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewResponseDto {
    private Integer reviewId;
    private Integer appointmentId;

    // Patient info (hidden if anonymous)
    private String patientId;
    private String patientName;
    private String patientAvatar;
    private boolean anonymous;

    // Doctor info
    private String doctorId;
    private String doctorName;
    private String doctorAvatar;
    private String specialtyName;

    // Review content
    private Integer rating;
    private String comment;
    private LocalDateTime reviewDate;
    private boolean visible;
    private Integer helpfulCount;

    // Replies
    private String doctorReply;
    private LocalDateTime doctorReplyDate;
    private String adminReply;
    private LocalDateTime adminReplyDate;
}
