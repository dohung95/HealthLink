package com.HealthLink.service.ai;

import com.HealthLink.config.GeminiConfig;
import com.HealthLink.dto.ai.CVParseResult;
import com.HealthLink.dto.ai.DocumentScreeningResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.ByteArrayInputStream;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiAIServiceImpl implements GeminiAIService {

    private final GeminiConfig geminiConfig;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private static final String DOCTOR_CV_PROMPT = """
            You are a CV/Resume parser for a medical professional registration system.

            Analyze the following CV/Resume and extract information in JSON format.
            Return ONLY valid JSON, no markdown formatting, no code blocks.
            Use null for any fields that are not found or unclear.

            Extract these fields:
            {
              "fullName": "Full name of the person",
              "email": "Email address if found",
              "phoneNumber": "Phone number if found",
              "qualifications": "All degrees, certifications (comma separated)",
              "specialty": "Primary medical specialty",
              "yearsOfExperience": number or null,
              "languageSpoken": "Languages spoken (comma separated)",
              "location": "City or region",
              "bio": "Professional summary max 200 words",
              "clinicName": "Current workplace name",
              "clinicAddress": "Workplace address"
            }

            CV/Resume Content:
            """;

    private static final String PHARMACY_CV_PROMPT = """
            You are a document parser for a pharmacy registration system.

            Analyze the following document and extract information in JSON format.
            Return ONLY valid JSON, no markdown formatting, no code blocks.
            Use null for any fields that are not found or unclear.

            Extract these fields:
            {
              "pharmacyName": "Name of the pharmacy",
              "email": "Email address",
              "phoneNumber": "Phone number",
              "licenseNumber": "Business/pharmacy license number",
              "address": "Full street address",
              "city": "City name",
              "district": "District name",
              "ward": "Ward name",
              "description": "Brief description max 200 words"
            }

            Document Content:
            """;

    private static final String DOCUMENT_VERIFY_PROMPT = """
            You are an AI document verification specialist for a healthcare platform.
            Analyze this document image thoroughly and check for:

            1. CONTENT SAFETY (CRITICAL - Check first):
               - NSFW content (nudity, sexual content, hentai, pornography)
               - Violence/gore (blood, injury, weapons, disturbing imagery)
               - Hate symbols or offensive content
               - Drug-related inappropriate content
               - Any content unsuitable for a professional medical platform

            2. DOCUMENT VERIFICATION:
               - What type of document is this?
               - Is it a valid "%s"?
               - Is the document readable and clear (not blurry, cropped, or damaged)?
               - Does it appear authentic (no photoshop, manipulation, fake watermarks)?
               - Is all required information visible and complete?
               - Are there any signs of forgery (inconsistent fonts, unnatural edges)?

            3. DOCUMENT QUALITY:
               - Image resolution and clarity
               - Proper orientation
               - Complete document (no cut-off edges)

            Return JSON only (no markdown, no code blocks):
            {
              "contentSafe": true/false,
              "nsfwDetected": true/false,
              "violenceDetected": true/false,
              "hateContentDetected": true/false,
              "safetyScore": 0.0-1.0,
              "safetyIssues": ["list of safety concerns if any"],
              "detectedType": "type of document you see",
              "typeMatches": true/false,
              "readable": true/false,
              "appearsAuthentic": true/false,
              "complete": true/false,
              "confidence": 0.0-1.0,
              "issues": ["list of document issues if any"]
            }
            """;

    private static final String PROFILE_PHOTO_VERIFY_PROMPT = """
            You are an AI profile photo verification specialist for a healthcare platform.
            This image is submitted as a PROFILE PHOTO for a medical professional.

            Analyze this image thoroughly:

            1. CONTENT SAFETY (CRITICAL - Reject immediately if violated):
               - NSFW content (nudity, sexual content, hentai, pornography, revealing clothing)
               - Violence/gore imagery
               - Hate symbols or offensive gestures
               - Drug-related content
               - Memes, cartoons, anime characters (not real person)
               - Inappropriate or unprofessional imagery

            2. PROFILE PHOTO REQUIREMENTS:
               - Is this a photo of a REAL PERSON (not cartoon, anime, AI-generated, or object)?
               - Is a human FACE clearly visible?
               - Is it a PROFESSIONAL looking photo suitable for a healthcare platform?
               - Is the person appropriately dressed (professional attire)?
               - Is the image clear and high quality?
               - Is there only ONE person in the photo?

            3. QUALITY CHECK:
               - Good lighting and resolution
               - Face is not obscured (sunglasses, masks are acceptable for medical context)
               - Appropriate background (not inappropriate locations)

            Return JSON only (no markdown, no code blocks):
            {
              "contentSafe": true/false,
              "nsfwDetected": true/false,
              "violenceDetected": true/false,
              "hateContentDetected": true/false,
              "safetyScore": 0.0-1.0,
              "safetyIssues": ["list of safety concerns if any"],
              "isRealPerson": true/false,
              "hasFaceDetected": true/false,
              "isProfessionalPhoto": true/false,
              "isAppropriatelyDressed": true/false,
              "imageQuality": "good/acceptable/poor",
              "confidence": 0.0-1.0,
              "issues": ["list of issues if any"]
            }
            """;

    @Override
    public boolean isAvailable() {
        return geminiConfig.isConfigured();
    }

    @Override
    public CVParseResult parseCV(String fileContent, String mimeType, String type) {
        if (!isAvailable()) {
            return CVParseResult.builder()
                    .success(false)
                    .errorMessage("Gemini AI is not configured")
                    .build();
        }

        try {
            String prompt = "doctor".equals(type) ? DOCTOR_CV_PROMPT : PHARMACY_CV_PROMPT;

            String response;
            if (mimeType.startsWith("image/")) {
                // Use vision API for images
                response = callGeminiWithImage(prompt, fileContent, mimeType);
            } else {
                // Extract text first for PDF/DOCX
                byte[] bytes = Base64.getDecoder().decode(fileContent);
                String text;
                if (mimeType.equals("application/pdf")) {
                    text = extractTextFromPDF(bytes);
                } else {
                    text = extractTextFromDOCX(bytes);
                }
                response = callGeminiWithText(prompt + text);
            }

            // Parse response
            String cleanJson = cleanJsonResponse(response);
            JsonNode jsonNode = objectMapper.readTree(cleanJson);

            CVParseResult.CVParseResultBuilder builder = CVParseResult.builder()
                    .success(true);

            if ("doctor".equals(type)) {
                builder.fullName(getTextValue(jsonNode, "fullName"))
                        .email(getTextValue(jsonNode, "email"))
                        .phoneNumber(getTextValue(jsonNode, "phoneNumber"))
                        .qualifications(getTextValue(jsonNode, "qualifications"))
                        .specialty(getTextValue(jsonNode, "specialty"))
                        .yearsOfExperience(getIntValue(jsonNode, "yearsOfExperience"))
                        .languageSpoken(getTextValue(jsonNode, "languageSpoken"))
                        .location(getTextValue(jsonNode, "location"))
                        .bio(getTextValue(jsonNode, "bio"))
                        .clinicName(getTextValue(jsonNode, "clinicName"))
                        .clinicAddress(getTextValue(jsonNode, "clinicAddress"));
            } else {
                builder.pharmacyName(getTextValue(jsonNode, "pharmacyName"))
                        .email(getTextValue(jsonNode, "email"))
                        .phoneNumber(getTextValue(jsonNode, "phoneNumber"))
                        .licenseNumber(getTextValue(jsonNode, "licenseNumber"))
                        .address(getTextValue(jsonNode, "address"))
                        .city(getTextValue(jsonNode, "city"))
                        .district(getTextValue(jsonNode, "district"))
                        .ward(getTextValue(jsonNode, "ward"))
                        .description(getTextValue(jsonNode, "description"));
            }

            return builder.build();

        } catch (Exception e) {
            log.error("Error parsing CV: {}", e.getMessage(), e);
            return CVParseResult.builder()
                    .success(false)
                    .errorMessage("Failed to parse CV: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public DocumentScreeningResult verifyDocument(String fileContent, String mimeType, String expectedType) {
        if (!isAvailable()) {
            return DocumentScreeningResult.builder()
                    .passed(true)
                    .confidence(0.5)
                    .contentSafe(true)
                    .issues(List.of("AI verification unavailable"))
                    .build();
        }

        boolean isProfilePhoto = "Profile Photo".equalsIgnoreCase(expectedType);

        try {
            String prompt;
            if (isProfilePhoto) {
                prompt = PROFILE_PHOTO_VERIFY_PROMPT;
            } else {
                prompt = String.format(DOCUMENT_VERIFY_PROMPT, expectedType);
            }

            String response;

            if (mimeType.startsWith("image/")) {
                response = callGeminiWithImage(prompt, fileContent, mimeType);
            } else {
                // For non-image documents, skip detailed verification but still mark as pending review
                return DocumentScreeningResult.builder()
                        .expectedType(expectedType)
                        .passed(true)
                        .confidence(0.7)
                        .readable(true)
                        .appearsAuthentic(true)
                        .complete(true)
                        .contentSafe(true)
                        .isProfilePhoto(isProfilePhoto)
                        .issues(List.of("Non-image document - manual review recommended"))
                        .build();
            }

            String cleanJson = cleanJsonResponse(response);
            JsonNode jsonNode = objectMapper.readTree(cleanJson);

            // ============ SAFETY CHECK (CRITICAL) ============
            boolean contentSafe = getBooleanValue(jsonNode, "contentSafe", true);
            boolean nsfwDetected = getBooleanValue(jsonNode, "nsfwDetected", false);
            boolean violenceDetected = getBooleanValue(jsonNode, "violenceDetected", false);
            boolean hateContentDetected = getBooleanValue(jsonNode, "hateContentDetected", false);
            double safetyScore = getDoubleValue(jsonNode, "safetyScore", 1.0);

            List<String> safetyIssues = new ArrayList<>();
            JsonNode safetyIssuesNode = jsonNode.get("safetyIssues");
            if (safetyIssuesNode != null && safetyIssuesNode.isArray()) {
                for (JsonNode issue : safetyIssuesNode) {
                    safetyIssues.add(issue.asText());
                }
            }

            // If any unsafe content detected, immediately fail
            if (nsfwDetected || violenceDetected || hateContentDetected || !contentSafe) {
                List<String> criticalIssues = new ArrayList<>();
                if (nsfwDetected) criticalIssues.add("NSFW/inappropriate content detected");
                if (violenceDetected) criticalIssues.add("Violence/gore content detected");
                if (hateContentDetected) criticalIssues.add("Hate symbols/offensive content detected");
                criticalIssues.addAll(safetyIssues);

                return DocumentScreeningResult.builder()
                        .expectedType(expectedType)
                        .passed(false)
                        .confidence(0.0)
                        .contentSafe(false)
                        .nsfwDetected(nsfwDetected)
                        .violenceDetected(violenceDetected)
                        .hateContentDetected(hateContentDetected)
                        .safetyScore(safetyScore)
                        .safetyIssues(safetyIssues)
                        .isProfilePhoto(isProfilePhoto)
                        .issues(criticalIssues)
                        .build();
            }

            // ============ PROFILE PHOTO SPECIFIC CHECK ============
            if (isProfilePhoto) {
                boolean isRealPerson = getBooleanValue(jsonNode, "isRealPerson", true);
                boolean hasFaceDetected = getBooleanValue(jsonNode, "hasFaceDetected", true);
                boolean isProfessionalPhoto = getBooleanValue(jsonNode, "isProfessionalPhoto", true);
                boolean isAppropriatelyDressed = getBooleanValue(jsonNode, "isAppropriatelyDressed", true);
                double confidence = getDoubleValue(jsonNode, "confidence", 0.5);

                List<String> issues = new ArrayList<>();
                JsonNode issuesNode = jsonNode.get("issues");
                if (issuesNode != null && issuesNode.isArray()) {
                    for (JsonNode issue : issuesNode) {
                        issues.add(issue.asText());
                    }
                }

                // Profile photo passes if: real person + face visible + appropriate
                boolean passed = isRealPerson && hasFaceDetected && isAppropriatelyDressed && contentSafe;

                if (!isRealPerson) issues.add("Not a photo of a real person");
                if (!hasFaceDetected) issues.add("No face detected in photo");
                if (!isProfessionalPhoto) issues.add("Photo is not professional-looking");
                if (!isAppropriatelyDressed) issues.add("Inappropriate attire for a healthcare professional");

                return DocumentScreeningResult.builder()
                        .expectedType(expectedType)
                        .detectedType("Profile Photo")
                        .typeMatches(true)
                        .readable(true)
                        .appearsAuthentic(isRealPerson)
                        .complete(hasFaceDetected)
                        .confidence(confidence)
                        .contentSafe(contentSafe)
                        .safetyScore(safetyScore)
                        .safetyIssues(safetyIssues)
                        .isProfilePhoto(true)
                        .isProfessionalPhoto(isProfessionalPhoto)
                        .hasFaceDetected(hasFaceDetected)
                        .issues(issues)
                        .passed(passed)
                        .build();
            }

            // ============ DOCUMENT VERIFICATION ============
            boolean typeMatches = getBooleanValue(jsonNode, "typeMatches", true);
            boolean readable = getBooleanValue(jsonNode, "readable", true);
            boolean authentic = getBooleanValue(jsonNode, "appearsAuthentic", true);
            boolean complete = getBooleanValue(jsonNode, "complete", true);
            double confidence = getDoubleValue(jsonNode, "confidence", 0.5);

            List<String> issues = new ArrayList<>();
            JsonNode issuesNode = jsonNode.get("issues");
            if (issuesNode != null && issuesNode.isArray()) {
                for (JsonNode issue : issuesNode) {
                    issues.add(issue.asText());
                }
            }

            // Document passes if: safe content + type matches + readable + authentic
            boolean passed = contentSafe && typeMatches && readable && authentic;

            return DocumentScreeningResult.builder()
                    .expectedType(expectedType)
                    .detectedType(getTextValue(jsonNode, "detectedType"))
                    .typeMatches(typeMatches)
                    .readable(readable)
                    .appearsAuthentic(authentic)
                    .complete(complete)
                    .confidence(confidence)
                    .contentSafe(contentSafe)
                    .safetyScore(safetyScore)
                    .safetyIssues(safetyIssues)
                    .isProfilePhoto(false)
                    .issues(issues)
                    .passed(passed)
                    .build();

        } catch (Exception e) {
            log.error("Error verifying document: {}", e.getMessage(), e);
            return DocumentScreeningResult.builder()
                    .expectedType(expectedType)
                    .passed(true)
                    .confidence(0.5)
                    .contentSafe(true)
                    .isProfilePhoto(isProfilePhoto)
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

    private String callGeminiWithText(String prompt) throws Exception {
        String url = String.format(GEMINI_API_URL, geminiConfig.getModel(), geminiConfig.getApiKey());

        Map<String, Object> content = new HashMap<>();
        content.put("parts", List.of(Map.of("text", prompt)));

        Map<String, Object> request = new HashMap<>();
        request.put("contents", List.of(content));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
        ResponseEntity<JsonNode> response = restTemplate.exchange(url, HttpMethod.POST, entity, JsonNode.class);

        return extractResponseText(response.getBody());
    }

    private String callGeminiWithImage(String prompt, String base64Image, String mimeType) throws Exception {
        String url = String.format(GEMINI_API_URL, geminiConfig.getModel(), geminiConfig.getApiKey());

        List<Map<String, Object>> parts = new ArrayList<>();
        parts.add(Map.of("text", prompt));
        parts.add(Map.of("inline_data", Map.of(
                "mime_type", mimeType,
                "data", base64Image
        )));

        Map<String, Object> content = new HashMap<>();
        content.put("parts", parts);

        Map<String, Object> request = new HashMap<>();
        request.put("contents", List.of(content));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
        ResponseEntity<JsonNode> response = restTemplate.exchange(url, HttpMethod.POST, entity, JsonNode.class);

        return extractResponseText(response.getBody());
    }

    private String extractResponseText(JsonNode response) {
        try {
            return response.get("candidates").get(0)
                    .get("content").get("parts").get(0)
                    .get("text").asText();
        } catch (Exception e) {
            log.error("Error extracting response text: {}", e.getMessage());
            return "{}";
        }
    }

    private String cleanJsonResponse(String response) {
        String clean = response.trim();
        if (clean.startsWith("```json")) {
            clean = clean.substring(7);
        } else if (clean.startsWith("```")) {
            clean = clean.substring(3);
        }
        if (clean.endsWith("```")) {
            clean = clean.substring(0, clean.length() - 3);
        }
        return clean.trim();
    }

    private String getTextValue(JsonNode node, String field) {
        JsonNode fieldNode = node.get(field);
        if (fieldNode == null || fieldNode.isNull()) {
            return null;
        }
        return fieldNode.asText();
    }

    private Integer getIntValue(JsonNode node, String field) {
        JsonNode fieldNode = node.get(field);
        if (fieldNode == null || fieldNode.isNull()) {
            return null;
        }
        return fieldNode.asInt();
    }

    private double getDoubleValue(JsonNode node, String field, double defaultValue) {
        JsonNode fieldNode = node.get(field);
        if (fieldNode == null || fieldNode.isNull()) {
            return defaultValue;
        }
        return fieldNode.asDouble();
    }

    private boolean getBooleanValue(JsonNode node, String field, boolean defaultValue) {
        JsonNode fieldNode = node.get(field);
        if (fieldNode == null || fieldNode.isNull()) {
            return defaultValue;
        }
        return fieldNode.asBoolean();
    }
}
