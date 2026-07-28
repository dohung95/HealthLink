package com.HealthLink.service.ai;

import com.HealthLink.integration.ai.CdsWorkerClient;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CdsSuggestionValidatorTest {
    @Test
    void rejectsFabricatedCitationsAndMissingDoctorApproval() {
        CdsSuggestionValidator validator = new CdsSuggestionValidator();
        CdsWorkerClient.CdsWorkerResponse response = new CdsWorkerClient.CdsWorkerResponse(
                "ROUTINE", "synthetic summary", List.of(), List.of(), List.of(), List.of(), List.of(), List.of(),
                List.of(), List.of("fabricated-evidence"), "LOW", false);

        assertThatThrownBy(() -> validator.validate(response, List.of("approved-evidence"), List.of()))
                .isInstanceOf(CdsSuggestionValidator.ValidationException.class)
                .hasMessageContaining("CITATION_INVALID");
    }

    @Test
    void rejectsActionableSuggestionWithoutEvidence() {
        CdsSuggestionValidator validator = new CdsSuggestionValidator();
        CdsWorkerClient.CdsWorkerResponse response = response(
                List.of("Order a synthetic follow-up test."), List.of(), List.of());

        assertThatThrownBy(() -> validator.validate(response, List.of("approved-evidence"), List.of()))
                .isInstanceOf(CdsSuggestionValidator.ValidationException.class)
                .hasMessage("CITATION_INVALID");
    }

    @Test
    void acceptsNonActionableMissingInformationWithoutEvidence() {
        CdsSuggestionValidator validator = new CdsSuggestionValidator();
        CdsWorkerClient.CdsWorkerResponse response = response(List.of(), List.of(), List.of());

        validator.validate(response, List.of("approved-evidence"), List.of());
    }

    @Test
    void rejectsDuplicateOrBlankEvidenceIdsForActionableSuggestion() {
        CdsSuggestionValidator validator = new CdsSuggestionValidator();
        CdsWorkerClient.CdsWorkerResponse duplicate = response(List.of("Order a synthetic test."), List.of(),
                List.of("approved-evidence", "approved-evidence"));
        CdsWorkerClient.CdsWorkerResponse blank = response(List.of("Order a synthetic test."), List.of(), List.of(" "));

        assertThatThrownBy(() -> validator.validate(duplicate, List.of("approved-evidence"), List.of()))
                .isInstanceOf(CdsSuggestionValidator.ValidationException.class)
                .hasMessage("CITATION_INVALID");
        assertThatThrownBy(() -> validator.validate(blank, List.of("approved-evidence"), List.of()))
                .isInstanceOf(CdsSuggestionValidator.ValidationException.class)
                .hasMessage("CITATION_INVALID");
    }

    @Test
    void rejectsInvalidSchemaFields() {
        CdsSuggestionValidator validator = new CdsSuggestionValidator();
        CdsWorkerClient.CdsWorkerResponse invalidUrgency = new CdsWorkerClient.CdsWorkerResponse(
                "NOW", "synthetic summary", List.of(), List.of(), List.of(), List.of(), List.of(), List.of(),
                List.of(), List.of(), "CERTAIN", true);

        assertThatThrownBy(() -> validator.validate(invalidUrgency, List.of(), List.of()))
                .isInstanceOf(CdsSuggestionValidator.ValidationException.class)
                .hasMessage("MODEL_SCHEMA_INVALID");
    }

    @Test
    void preservesCriticalRuleCodeOutsideClinicalSummary() {
        CdsSuggestionValidator validator = new CdsSuggestionValidator();
        CdsWorkerClient.CdsWorkerResponse response = new CdsWorkerClient.CdsWorkerResponse(
                "ROUTINE", "synthetic summary", List.of(), List.of(), List.of(), List.of(), List.of(),
                List.of("CRITICAL_ALLERGY_REVIEW"), List.of(), List.of(), "LOW", true);

        validator.validate(response, List.of(), List.of(
                new com.HealthLink.dto.ai.RuleFinding("CRITICAL_ALLERGY_REVIEW", com.HealthLink.dto.ai.RuleFinding.Severity.CRITICAL,
                        List.of(), "title", "synthetic", "synthetic", "synthetic", "synthetic", "rules-v1")
        ));
    }

    private static CdsWorkerClient.CdsWorkerResponse response(List<String> recommendedTests, List<String> treatmentOptions,
                                                               List<String> evidenceIds) {
        return new CdsWorkerClient.CdsWorkerResponse(
                "ROUTINE", "synthetic summary", List.of(), List.of(), List.of(), recommendedTests, treatmentOptions,
                List.of(), List.of("Medication allergies are unknown."), evidenceIds, "LOW", true);
    }
}
