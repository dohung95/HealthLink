package com.HealthLink.entity.enums;

import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

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

    public static List<String> normalizeAll(Collection<String> values) {
        if (values == null || values.isEmpty()) {
            throw new IllegalArgumentException("Timing is required");
        }

        Set<String> normalized = new LinkedHashSet<>();
        for (String value : values) {
            addNormalizedTokens(normalized, value);
        }

        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("Timing is required");
        }

        return List.copyOf(normalized);
    }

    public static List<String> normalizeAll(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Timing is required");
        }

        Set<String> normalized = new LinkedHashSet<>();
        addNormalizedTokens(normalized, value);

        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("Timing is required");
        }

        return List.copyOf(normalized);
    }

    public static String normalizeJoined(Collection<String> values) {
        return String.join(",", normalizeAll(values));
    }

    public static String normalizeJoined(String value) {
        return String.join(",", normalizeAll(value));
    }

    public static List<String> splitNormalized(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }

        return normalizeAll(value);
    }

    public static boolean containsTiming(String storedTiming, String timing) {
        String normalizedTiming = normalize(timing);
        return splitNormalized(storedTiming).contains(normalizedTiming);
    }

    public static boolean isSupported(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }

        try {
            normalizeAll(value);
            return true;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private static void addNormalizedTokens(Set<String> normalized, String value) {
        if (value == null || value.isBlank()) {
            return;
        }

        Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(token -> !token.isEmpty())
                .map(PrescriptionTiming::from)
                .map(PrescriptionTiming::name)
                .forEach(normalized::add);
    }
}
