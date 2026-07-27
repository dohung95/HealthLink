package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.RuleFinding;
import com.HealthLink.integration.ai.CdsWorkerClient;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class CdsSuggestionValidator {
    public void validate(CdsWorkerClient.CdsWorkerResponse response, List<String> approvedEvidenceIds, List<RuleFinding> ruleFindings) {
        if (response == null || !validSchema(response)) throw new ValidationException("MODEL_SCHEMA_INVALID");

        List<String> evidenceIds = response.evidenceIds();
        Set<String> approved = approvedEvidenceIds == null ? Set.of() : Set.copyOf(approvedEvidenceIds);
        boolean invalidEvidence = evidenceIds == null
                || evidenceIds.stream().anyMatch(id -> id == null || id.isBlank())
                || new HashSet<>(evidenceIds).size() != evidenceIds.size()
                || !approved.containsAll(evidenceIds)
                || (hasActionableContent(response) && evidenceIds.isEmpty());
        if (invalidEvidence) throw new ValidationException("CITATION_INVALID");

        if (!response.requiresDoctorApproval()) throw new ValidationException("MODEL_SCHEMA_INVALID: requiresDoctorApproval");
        if ((ruleFindings == null ? List.<RuleFinding>of() : ruleFindings).stream()
                .filter(f -> f.severity() == RuleFinding.Severity.CRITICAL)
                .anyMatch(f -> !allSuggestionText(response).contains(f.code())))
            throw new ValidationException("MODEL_SCHEMA_INVALID: critical rule omitted");
    }

    private static boolean validSchema(CdsWorkerClient.CdsWorkerResponse response) {
        return response.clinicalSummary() != null && !response.clinicalSummary().isBlank()
                && Set.of("ROUTINE", "SOON", "URGENT").contains(response.urgency())
                && Set.of("LOW", "MEDIUM", "HIGH").contains(response.confidence())
                && response.abnormalFindings() != null && response.possibleExplanations() != null
                && response.differentialDiagnoses() != null && response.recommendedAdditionalTests() != null
                && response.treatmentOptionsForDoctorReview() != null && response.drugWarnings() != null
                && response.missingInformation() != null;
    }

    private static boolean hasActionableContent(CdsWorkerClient.CdsWorkerResponse response) {
        return !response.possibleExplanations().isEmpty()
                || !response.differentialDiagnoses().isEmpty()
                || !response.recommendedAdditionalTests().isEmpty()
                || !response.treatmentOptionsForDoctorReview().isEmpty();
    }

    private static String allSuggestionText(CdsWorkerClient.CdsWorkerResponse response) {
        List<String> values = new ArrayList<>();
        values.add(response.clinicalSummary());
        values.addAll(response.abnormalFindings());
        values.addAll(response.possibleExplanations());
        values.addAll(response.differentialDiagnoses());
        values.addAll(response.recommendedAdditionalTests());
        values.addAll(response.treatmentOptionsForDoctorReview());
        values.addAll(response.drugWarnings());
        values.addAll(response.missingInformation());
        return String.join("\n", values);
    }
    public static class ValidationException extends IllegalArgumentException { public ValidationException(String message) { super(message); } }
}
