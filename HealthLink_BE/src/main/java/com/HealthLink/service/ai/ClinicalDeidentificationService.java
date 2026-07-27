package com.HealthLink.service.ai;

import org.springframework.stereotype.Service;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@Service
public class ClinicalDeidentificationService {
    private static final Set<String> ALLOWED = Set.of("ageYears", "ageBand", "sex", "symptoms", "vitals", "heartRate", "systolicBloodPressure",
            "diastolicBloodPressure", "temperature", "spo2", "respiratoryRate", "glucose", "allergies", "chronicConditions", "currentMedications",
            "medicalHistorySummary", "verifiedLabs", "fastingStatus", "pregnancyStatus");
    public Map<String, Object> deidentify(Map<String, ?> snapshot) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (snapshot == null) return Map.of();
        snapshot.forEach((key, value) -> { if (ALLOWED.contains(key) && value != null) result.put(key, value); });
        Object fields = snapshot.get("fields");
        if (fields instanceof Map<?, ?> fieldMap) {
            fieldMap.forEach((rawKey, rawValue) -> {
                String key = String.valueOf(rawKey);
                if (!ALLOWED.contains(key) || !(rawValue instanceof Map<?, ?> field)) return;
                Object value = field.get("value");
                if (value != null) result.put(key, value);
            });
        }
        return Map.copyOf(result);
    }
}
