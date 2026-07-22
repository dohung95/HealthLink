package com.HealthLink.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** Loads only a checksum-approved, source-traceable student-demo ruleset. */
@Service
public class ClinicalRuleSetLoader {
    private static final String RULESET_RESOURCE = "ai/rules/ruleset-v1.json";
    private static final String APPROVAL_RESOURCE = "ai/rules/ruleset-v1.approval.json";

    private final Resource rulesetResource;
    private final Resource approvalResource;
    private final ObjectMapper objectMapper;

    public ClinicalRuleSetLoader() {
        this(new ClassPathResource(RULESET_RESOURCE), new ClassPathResource(APPROVAL_RESOURCE), new ObjectMapper());
    }

    public ClinicalRuleSetLoader(Resource rulesetResource, Resource approvalResource) {
        this(rulesetResource, approvalResource, new ObjectMapper());
    }

    private ClinicalRuleSetLoader(Resource rulesetResource, Resource approvalResource, ObjectMapper objectMapper) {
        this.rulesetResource = rulesetResource;
        this.approvalResource = approvalResource;
        this.objectMapper = objectMapper;
    }

    public RuleSet load() {
        try {
            byte[] rulesetBytes = rulesetResource.getInputStream().readAllBytes();
            JsonNode ruleset = objectMapper.readTree(rulesetBytes);
            JsonNode approval = objectMapper.readTree(approvalResource.getInputStream());
            validate(ruleset, approval, sha256(rulesetBytes));
            return new RuleSet(ruleset.path("ruleSetVersion").asText(), ruleset.path("intendedUse").asText(), ruleset);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load student-demo clinical ruleset", exception);
        }
    }

    private void validate(JsonNode ruleset, JsonNode approval, String checksum) {
        required(ruleset, "schemaVersion");
        required(ruleset, "ruleSetVersion");
        required(ruleset, "effectiveDate");
        requireEquals("STUDENT_DEMO_ONLY", ruleset.path("intendedUse").asText(), "ruleset intendedUse");
        if (!ruleset.path("sources").isArray() || ruleset.path("sources").isEmpty()) {
            throw new IllegalStateException("Ruleset must contain a source");
        }
        JsonNode source = ruleset.path("sources").get(0);
        required(source, "documentId");
        required(source, "version");
        required(source, "section");
        required(approval, "reviewerName");
        requireEquals("DEMO_REVIEWER", approval.path("reviewerRole").asText(), "approval reviewerRole");
        requireEquals("APPROVED_STUDENT_DEMO", approval.path("status").asText(), "approval status");
        requireEquals("STUDENT_DEMO_ONLY", approval.path("intendedUse").asText(), "approval intendedUse");
        requireEquals(checksum, approval.path("rulesetSha256").asText(), "ruleset checksum");
        requireEquals(ruleset.path("schemaVersion").asText(), approval.path("schemaVersion").asText(), "approval schemaVersion");
        requireEquals(ruleset.path("ruleSetVersion").asText(), approval.path("ruleSetVersion").asText(), "approval rulesetVersion");
        requireEquals(ruleset.path("effectiveDate").asText(), approval.path("effectiveDate").asText(), "approval effectiveDate");
        requireEquals(source.path("documentId").asText(), approval.path("sourceDocumentId").asText(), "approval sourceDocumentId");
        requireEquals(source.path("version").asText(), approval.path("sourceVersion").asText(), "approval sourceVersion");
        requireEquals(source.path("section").asText(), approval.path("sourceSection").asText(), "approval sourceSection");
    }

    private static void required(JsonNode object, String field) {
        if (object.path(field).asText().isBlank()) throw new IllegalStateException("Missing required ruleset field: " + field);
    }

    private static void requireEquals(String expected, String actual, String field) {
        if (!expected.equals(actual)) throw new IllegalStateException("Invalid " + field);
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    public record RuleSet(String version, String intendedUse, JsonNode document) {
    }
}
