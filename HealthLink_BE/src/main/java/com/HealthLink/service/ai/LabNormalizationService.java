package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.NormalizedLabObservation;
import com.HealthLink.entity.ai.LabObservation;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class LabNormalizationService {
    private static final String ALIAS_RESOURCE = "ai/terminology/lab-aliases-vi.json";
    private static final BigDecimal GLUCOSE_MMOL_L_TO_MG_DL = new BigDecimal("18.0182");

    private final List<Alias> aliases;

    public LabNormalizationService() {
        this.aliases = loadAliases();
    }

    public NormalizedLabObservation normalize(LabObservation observation) {
        String rawName = observation.getTestNameRaw();
        String normalizedRawName = canonicalize(rawName);
        Alias exact = aliases.stream().filter(alias -> alias.canonicalAlias().equals(normalizedRawName)).findFirst().orElse(null);
        if (exact != null) {
            return mapped(observation, exact, NormalizedLabObservation.MappingMethod.CURATED_EXACT_ALIAS, BigDecimal.ONE);
        }

        Alias fuzzy = aliases.stream().filter(alias -> normalizedRawName.contains(alias.canonicalAlias())).findFirst().orElse(null);
        if (fuzzy != null) {
            return new NormalizedLabObservation(observation.getObservationId(), observation.getVerificationStatus(), rawName,
                    fuzzy.normalizedName(), null, observation.getUnitRaw(), null, observation.getNumericValue(), null,
                    observation.getComparator(), new BigDecimal("0.60"), NormalizedLabObservation.MappingMethod.FUZZY_CANDIDATE, true);
        }

        return new NormalizedLabObservation(observation.getObservationId(), observation.getVerificationStatus(), rawName,
                null, null, observation.getUnitRaw(), null, observation.getNumericValue(), null, observation.getComparator(),
                BigDecimal.ZERO, NormalizedLabObservation.MappingMethod.UNMAPPED, true);
    }

    private NormalizedLabObservation mapped(LabObservation observation, Alias alias,
                                             NormalizedLabObservation.MappingMethod method, BigDecimal confidence) {
        ConvertedValue converted = convert(alias.normalizedName(), observation.getNumericValue(), observation.getUnitRaw());
        boolean requiresReview = converted.value() == null;
        return new NormalizedLabObservation(observation.getObservationId(), observation.getVerificationStatus(), observation.getTestNameRaw(),
                alias.normalizedName(), alias.loincCode(), observation.getUnitRaw(), converted.unit(), observation.getNumericValue(),
                converted.value(), observation.getComparator(), confidence, method, requiresReview);
    }

    private ConvertedValue convert(String normalizedName, BigDecimal rawValue, String rawUnit) {
        if (rawValue == null || rawUnit == null || rawUnit.isBlank()) return ConvertedValue.unavailable();
        String unit = rawUnit.trim();
        if ("Glucose".equals(normalizedName)) {
            if ("mg/dL".equalsIgnoreCase(unit)) return new ConvertedValue(rawValue, "mg/dL");
            if ("mmol/L".equalsIgnoreCase(unit)) return new ConvertedValue(rawValue.multiply(GLUCOSE_MMOL_L_TO_MG_DL), "mg/dL");
            return ConvertedValue.unavailable();
        }
        if ("Creatinine".equals(normalizedName) && "mg/dL".equalsIgnoreCase(unit)) return new ConvertedValue(rawValue, "mg/dL");
        if ("WBC".equals(normalizedName) && ("10^9/L".equals(unit) || "10*9/L".equals(unit))) return new ConvertedValue(rawValue, "10^9/L");
        if ("Hemoglobin".equals(normalizedName) && "g/dL".equalsIgnoreCase(unit)) return new ConvertedValue(rawValue, "g/dL");
        if ("Potassium".equals(normalizedName) && "mmol/L".equalsIgnoreCase(unit)) return new ConvertedValue(rawValue, "mmol/L");
        return ConvertedValue.unavailable();
    }

    private List<Alias> loadAliases() {
        try (InputStream stream = getClass().getClassLoader().getResourceAsStream(ALIAS_RESOURCE)) {
            if (stream == null) throw new IllegalStateException("Missing lab terminology resource: " + ALIAS_RESOURCE);
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> document = mapper.readValue(stream, new TypeReference<>() { });
            List<Map<String, String>> rows = mapper.convertValue(document.get("aliases"), new TypeReference<>() { });
            return rows.stream().map(row -> new Alias(row.get("alias"), row.get("normalizedName"), row.get("loincCode"))).toList();
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to load lab terminology resource", exception);
        }
    }

    private static String canonicalize(String value) {
        if (value == null) return "";
        String decomposed = Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return decomposed.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private record Alias(String alias, String normalizedName, String loincCode) {
        private String canonicalAlias() { return canonicalize(alias); }
    }

    private record ConvertedValue(BigDecimal value, String unit) {
        private static ConvertedValue unavailable() { return new ConvertedValue(null, null); }
    }
}
