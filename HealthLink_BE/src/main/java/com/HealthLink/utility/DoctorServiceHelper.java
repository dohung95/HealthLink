package com.HealthLink.utility;

import lombok.experimental.UtilityClass;

import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.List;

@UtilityClass
public class DoctorServiceHelper {

    /** Convert DayOfWeek to 0-based index (0=Monday, 6=Sunday) */
    public static int dayOfWeekIndex(DayOfWeek day) {
        return day.getValue() % 7;
    }

    /** Build available consultation types list from 4 booleans */
    public static List<String> buildAvailableTypes(
            boolean video, boolean audio, boolean chat, boolean offline) {
        List<String> types = new ArrayList<>();
        if (video) types.add("Video");
        if (audio) types.add("Audio");
        if (chat) types.add("Chat");
        if (offline) types.add("Offline");
        return types;
    }
}
