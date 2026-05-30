package com.HealthLink.dto.review;

import lombok.*;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewStatsDto {
    private Double averageRating;
    private Integer totalReviews;
    private Map<Integer, Long> ratingDistribution; // Key: 1-5, Value: count
    private Integer totalReplied;
    private Integer totalPendingReply;
}
