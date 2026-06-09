package com.HealthLink.dto.response.moderation;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class ImageModerationResponse {
    private boolean safe;
    private boolean skipped;
    private boolean needsReview;
    private String reason;
    private List<Map<String, Object>> detections;
    private List<Map<String, Object>> blockedDetections;
    private List<Map<String, Object>> reviewDetections;
}