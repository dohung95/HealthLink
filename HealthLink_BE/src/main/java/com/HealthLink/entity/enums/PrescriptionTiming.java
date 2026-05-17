package com.HealthLink.entity.enums;

import java.util.Arrays;

public enum PrescriptionTiming {
    MORNING,
    AFTERNOON,
    EVENING;

    public static PrescriptionTiming from(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Timing is required");
        }

        return Arrays.stream(values())
                .filter(timing -> timing.name().equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Timing must be one of MORNING, AFTERNOON, EVENING"));
    }

    public static String normalize(String value) {
        return from(value).name();
    }

    public static boolean isSupported(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }

        return Arrays.stream(values())
                .anyMatch(timing -> timing.name().equalsIgnoreCase(value.trim()));
    }
}
