package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.CVParseResult;
import com.HealthLink.dto.ai.DocumentScreeningResult;
import com.HealthLink.dto.response.HomeVisitInfoScanResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.io.ByteArrayInputStream;
import java.util.*;

/**
 * Local AI Service Implementation.
 * Calls the self-hosted HealthLink_AI_Service (FastAPI: OCR + NudeNet + Ollama).
 * 100% private - no data leaves your network.
 */
@Service
@Slf4j
public class LocalAIServiceImpl implements DocumentAiService {

    @Value("${ai.service.local.url:http://localhost:8097}")
    private String aiServiceUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public boolean isAvailable() {
        try {
            String url = aiServiceUrl + "/health";
            ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);
            return response.getStatusCode() == HttpStatus.OK;
        } catch (Exception e) {
            log.warn("Local AI Service not available: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public CVParseResult parseCV(String fileContent, String mimeType, String type) {
        try {
            byte[] bytes = Base64.getDecoder().decode(fileContent);

            // Prepare multipart request
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new ByteArrayResource(bytes) {
                @Override
                public String getFilename() {
                    return getFilenameFromMimeType(mimeType);
                }
            });
            body.add("doc_type", type);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    aiServiceUrl + "/parse-cv",
                    HttpMethod.POST,
                    requestEntity,
                    JsonNode.class
            );

            JsonNode jsonNode = response.getBody();

            if (jsonNode == null || !getBooleanValue(jsonNode, "success", false)) {
                return CVParseResult.builder()
                        .success(false)
                        .errorMessage(getTextValue(jsonNode, "error"))
                        .build();
            }

            JsonNode data = jsonNode.get("data");
            if (data == null) {
                return CVParseResult.builder()
                        .success(false)
                        .errorMessage("No data returned from AI service")
                        .build();
            }

            CVParseResult.CVParseResultBuilder builder = CVParseResult.builder()
                    .success(true);

            if ("doctor".equals(type)) {
                builder.fullName(getTextValue(data, "fullName"))
                        .email(getTextValue(data, "email"))
                        .phoneNumber(getTextValue(data, "phoneNumber"))
                        .qualifications(getTextValue(data, "qualifications"))
                        .specialty(getTextValue(data, "specialty"))
                        .yearsOfExperience(getIntValue(data, "yearsOfExperience"))
                        .languageSpoken(getTextValue(data, "languageSpoken"))
                        .location(getTextValue(data, "location"))
                        .bio(getTextValue(data, "bio"))
                        .clinicName(getTextValue(data, "clinicName"))
                        .clinicAddress(getTextValue(data, "clinicAddress"));
            } else {
                builder.pharmacyName(getTextValue(data, "pharmacyName"))
                        .email(getTextValue(data, "email"))
                        .phoneNumber(getTextValue(data, "phoneNumber"))
                        .licenseNumber(getTextValue(data, "licenseNumber"))
                        .address(getTextValue(data, "address"))
                        .city(getTextValue(data, "city"))
                        .district(getTextValue(data, "district"))
                        .ward(getTextValue(data, "ward"))
                        .description(getTextValue(data, "description"));
            }

            return builder.build();

        } catch (Exception e) {
            log.error("Error parsing CV with Local AI: {}", e.getMessage(), e);
            return CVParseResult.builder()
                    .success(false)
                    .errorMessage("Failed to parse CV: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public DocumentScreeningResult verifyDocument(String fileContent, String mimeType, String expectedType) {
        try {
            byte[] bytes = Base64.getDecoder().decode(fileContent);

            // Prepare multipart request
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new ByteArrayResource(bytes) {
                @Override
                public String getFilename() {
                    return getFilenameFromMimeType(mimeType);
                }
            });
            body.add("expected_type", expectedType);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    aiServiceUrl + "/screen-document",
                    HttpMethod.POST,
                    requestEntity,
                    JsonNode.class
            );

            JsonNode jsonNode = response.getBody();

            if (jsonNode == null) {
                return DocumentScreeningResult.builder()
                        .passed(true)
                        .confidence(0.5)
                        .contentSafe(true)
                        .issues(List.of("No response from AI service"))
                        .build();
            }

            boolean passed = getBooleanValue(jsonNode, "passed", true);
            boolean contentSafe = getBooleanValue(jsonNode, "contentSafe", true);
            boolean nsfwDetected = getBooleanValue(jsonNode, "nsfwDetected", false);
            boolean violenceDetected = getBooleanValue(jsonNode, "violenceDetected", false);
            boolean hateContentDetected = getBooleanValue(jsonNode, "hateContentDetected", false);
            double safetyScore = getDoubleValue(jsonNode, "safetyScore", 1.0);
            boolean typeMatches = getBooleanValue(jsonNode, "typeMatches", true);
            String detectedType = getTextValue(jsonNode, "detectedType");
            boolean readable = getBooleanValue(jsonNode, "readable", true);
            boolean appearsAuthentic = getBooleanValue(jsonNode, "appearsAuthentic", true);
            boolean complete = getBooleanValue(jsonNode, "complete", true);
            double confidence = getDoubleValue(jsonNode, "confidence", 0.5);
            boolean isProfilePhoto = getBooleanValue(jsonNode, "isProfilePhoto", false);
            boolean hasFaceDetected = getBooleanValue(jsonNode, "hasFaceDetected", false);
            boolean isProfessionalPhoto = getBooleanValue(jsonNode, "isProfessionalPhoto", true);

            List<String> issues = new ArrayList<>();
            JsonNode issuesNode = jsonNode.get("issues");
            if (issuesNode != null && issuesNode.isArray()) {
                for (JsonNode issue : issuesNode) {
                    issues.add(issue.asText());
                }
            }

            List<String> safetyIssues = new ArrayList<>();
            JsonNode safetyIssuesNode = jsonNode.get("safetyIssues");
            if (safetyIssuesNode != null && safetyIssuesNode.isArray()) {
                for (JsonNode issue : safetyIssuesNode) {
                    safetyIssues.add(issue.asText());
                }
            }

            return DocumentScreeningResult.builder()
                    .expectedType(expectedType)
                    .detectedType(detectedType)
                    .passed(passed)
                    .contentSafe(contentSafe)
                    .nsfwDetected(nsfwDetected)
                    .violenceDetected(violenceDetected)
                    .hateContentDetected(hateContentDetected)
                    .safetyScore(safetyScore)
                    .safetyIssues(safetyIssues)
                    .typeMatches(typeMatches)
                    .readable(readable)
                    .appearsAuthentic(appearsAuthentic)
                    .complete(complete)
                    .confidence(confidence)
                    .isProfilePhoto(isProfilePhoto)
                    .hasFaceDetected(hasFaceDetected)
                    .isProfessionalPhoto(isProfessionalPhoto)
                    .issues(issues)
                    .build();

        } catch (Exception e) {
            log.error("Error verifying document with Local AI: {}", e.getMessage(), e);
            return DocumentScreeningResult.builder()
                    .expectedType(expectedType)
                    .passed(true)
                    .confidence(0.5)
                    .contentSafe(true)
                    .issues(List.of("Verification error - manual review required: " + e.getMessage()))
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    @Override
    public String extractTextFromPDF(byte[] fileContent) {
        try (PDDocument document = Loader.loadPDF(fileContent)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        } catch (Exception e) {
            log.error("Error extracting text from PDF: {}", e.getMessage());
            return "";
        }
    }

    @Override
    public String extractTextFromDOCX(byte[] fileContent) {
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(fileContent));
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            return extractor.getText();
        } catch (Exception e) {
            log.error("Error extracting text from DOCX: {}", e.getMessage());
            return "";
        }
    }

    private String getFilenameFromMimeType(String mimeType) {
        return switch (mimeType) {
            case "application/pdf" -> "document.pdf";
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> "document.docx";
            case "image/jpeg" -> "image.jpg";
            case "image/png" -> "image.png";
            case "image/webp" -> "image.webp";
            default -> "file.bin";
        };
    }

    private String getTextValue(JsonNode node, String field) {
        if (node == null) return null;
        JsonNode fieldNode = node.get(field);
        if (fieldNode == null || fieldNode.isNull()) {
            return null;
        }
        return fieldNode.asText();
    }

    private Integer getIntValue(JsonNode node, String field) {
        if (node == null) return null;
        JsonNode fieldNode = node.get(field);
        if (fieldNode == null || fieldNode.isNull()) {
            return null;
        }
        return fieldNode.asInt();
    }

    private double getDoubleValue(JsonNode node, String field, double defaultValue) {
        if (node == null) return defaultValue;
        JsonNode fieldNode = node.get(field);
        if (fieldNode == null || fieldNode.isNull()) {
            return defaultValue;
        }
        return fieldNode.asDouble();
    }

    private boolean getBooleanValue(JsonNode node, String field, boolean defaultValue) {
        if (node == null) return defaultValue;
        JsonNode fieldNode = node.get(field);
        if (fieldNode == null || fieldNode.isNull()) {
            return defaultValue;
        }
        return fieldNode.asBoolean();
    }

    @Override
    public HomeVisitInfoScanResponse parseHomeVisitInfo(String fileContent, String mimeType) {
        try {
            byte[] bytes = Base64.getDecoder().decode(fileContent);

            // Prepare multipart request (same pattern as parseCV / verifyDocument)
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new ByteArrayResource(bytes) {
                @Override
                public String getFilename() {
                    return getFilenameFromMimeType(mimeType);
                }
            });

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    aiServiceUrl + "/parse-home-visit",
                    HttpMethod.POST,
                    requestEntity,
                    JsonNode.class
            );

            JsonNode jsonNode = response.getBody();

            if (jsonNode == null || !getBooleanValue(jsonNode, "success", false)) {
                String error = getTextValue(jsonNode, "error");
                return HomeVisitInfoScanResponse.builder()
                        .success(false)
                        .errorMessage(error != null ? error : "Could not scan home visit information")
                        .warnings(List.of("Please fill the form manually"))
                        .build();
            }

            return HomeVisitInfoScanResponse.builder()
                    .success(true)
                    .receiverName(getTextValue(jsonNode, "receiverName"))
                    .receiverAge(getIntValue(jsonNode, "receiverAge"))
                    .receiverGender(getTextValue(jsonNode, "receiverGender"))
                    .receiverPhone(getTextValue(jsonNode, "receiverPhone"))
                    .receiverRelationship(getTextValue(jsonNode, "receiverRelationship"))
                    .visitAddress(getTextValue(jsonNode, "visitAddress"))
                    .visitCity(getTextValue(jsonNode, "visitCity"))
                    .confidence(getDoubleValue(jsonNode, "confidence", 0.0))
                    .warnings(getStringList(jsonNode, "warnings"))
                    .build();

        } catch (Exception e) {
            log.error("Error parsing home visit info with Local AI: {}", e.getMessage(), e);
            return HomeVisitInfoScanResponse.builder()
                    .success(false)
                    .errorMessage("Failed to scan home visit information: " + e.getMessage())
                    .warnings(List.of("Please fill the form manually"))
                    .build();
        }
    }

    private List<String> getStringList(JsonNode node, String field) {
        List<String> values = new ArrayList<>();
        if (node == null) return values;
        JsonNode fieldNode = node.get(field);
        if (fieldNode != null && fieldNode.isArray()) {
            for (JsonNode item : fieldNode) {
                values.add(item.asText());
            }
        }
        return values;
    }
}
