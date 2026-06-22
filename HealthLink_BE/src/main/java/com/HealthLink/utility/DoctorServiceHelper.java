package com.HealthLink.utility;

import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorService;
import com.HealthLink.entity.enums.ServiceType;
import lombok.experimental.UtilityClass;

import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@UtilityClass
public class DoctorServiceHelper {

    /** Convert DayOfWeek to 0-based index (0=Monday, 6=Sunday) */
    public static int dayOfWeekIndex(DayOfWeek day) {
        return day.getValue() % 7;
    }

    /** Build available consultation types list from Doctor entity's services */
    public static List<String> buildAvailableTypes(Doctor doctor) {
        List<String> types = new ArrayList<>();
        if (doctor.getServices() == null) return types;
        Set<ServiceType> available = doctor.getServices().stream()
                .filter(DoctorService::isAvailable)
                .map(ds -> ds.getId().getServiceType())
                .collect(Collectors.toSet());
        if (available.contains(ServiceType.ONLINE)) types.add("Online");
        if (available.contains(ServiceType.HOME_VISIT)) types.add("HomeVisit");
        return types;
    }

    /** Check if doctor supports a given consultation type */
    public static boolean isConsultationTypeSupported(Doctor doctor, String consultationType) {
        if (doctor.getServices() == null) return true;
        Set<ServiceType> available = doctor.getServices().stream()
                .filter(DoctorService::isAvailable)
                .map(ds -> ds.getId().getServiceType())
                .collect(Collectors.toSet());

        String normalized = normalizeConsultationType(consultationType);

        return switch (normalized.toLowerCase()) {
            case "online" -> available.contains(ServiceType.ONLINE);
            case "offline" -> false;
            default -> true;
        };
    }

    /** Normalize consultation type string to canonical form */
    public static String normalizeConsultationType(String consultationType) {
        if (consultationType == null || consultationType.isBlank()) {
            return "Online";
        }

        String value = consultationType.trim().toLowerCase();

        return switch (value) {
            case "video", "video call", "audio", "audio call", "chat", "online", "consultation" ->
                "Online";
            case "offline", "in-person", "in person" ->
                "Offline";
            default ->
                "Online";
        };
    }
}
