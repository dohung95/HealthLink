package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.entity.Patient;
import com.HealthLink.entity.PharmacyConsultationRequest;
import com.HealthLink.entity.enums.PrescriptionTiming;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.List;

@UtilityClass
public class PharmacyServiceHelper {

    public static final double EARTH_RADIUS_KM = 6371.0;

    public static String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public static String firstNonBlank(String primary, String fallback) {
        String trimmedPrimary = trimToNull(primary);
        return trimmedPrimary != null ? trimmedPrimary : trimToNull(fallback);
    }

    public static String normalizeDeliveryAddressSource(String source) {
        String normalized = trimToNull(source);
        if (normalized == null) return null;
        String upper = normalized.toUpperCase();
        if (!List.of("DEVICE_LOCATION", "MANUAL", "PROFILE").contains(upper)) {
            throw new IllegalArgumentException("Unsupported delivery address source: " + upper);
        }
        return upper;
    }

    public static double calculateDistanceKm(
            double startLat, double startLon, double endLat, double endLon) {
        double latDistance = Math.toRadians(endLat - startLat);
        double lonDistance = Math.toRadians(endLon - startLon);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(startLat))
                * Math.cos(Math.toRadians(endLat))
                * Math.sin(lonDistance / 2)
                * Math.sin(lonDistance / 2);
        return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    public static String buildPatientAddress(Patient patient) {
        if (patient == null) return "";
        StringBuilder sb = new StringBuilder();
        if (patient.getAddress() != null) sb.append(patient.getAddress());
        if (patient.getCity() != null) {
            if (!sb.isEmpty()) sb.append(", ");
            sb.append(patient.getCity());
        }
        if (patient.getCountry() != null) {
            if (!sb.isEmpty()) sb.append(", ");
            sb.append(patient.getCountry());
        }
        return sb.toString();
    }

    public static String requestTypeOf(PharmacyConsultationRequest request) {
        String raw = request != null ? request.getRequestType() : null;
        if (raw == null || raw.isBlank()) return "CONSULTATION";
        return raw.trim().toUpperCase();
    }

    public static List<String> timingsForResponse(String timing) {
        try {
            return PrescriptionTiming.splitNormalized(timing);
        } catch (IllegalArgumentException ex) {
            return List.of();
        }
    }

    public static List<String> deserializeAttachments(String attachments, ObjectMapper objectMapper) {
        if (attachments == null || attachments.isBlank()) return List.of();
        try {
            return objectMapper.readValue(attachments, new TypeReference<List<String>>() {});
        } catch (Exception ex) {
            return List.of();
        }
    }
}
