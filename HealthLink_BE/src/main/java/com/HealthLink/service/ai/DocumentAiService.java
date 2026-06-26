package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.CVParseResult;
import com.HealthLink.dto.ai.DocumentScreeningResult;
import com.HealthLink.dto.response.HomeVisitInfoScanResponse;

/**
 * Service interface for AI document processing operations.
 * Backed by the self-hosted local AI service (OCR + NudeNet + Ollama).
 */
public interface DocumentAiService {

    /**
     * Check if the AI service is available and properly configured
     */
    boolean isAvailable();

    /**
     * Parse a CV/Resume file and extract information
     * @param fileContent Base64 encoded file content
     * @param mimeType File MIME type
     * @param type "doctor" or "pharmacy"
     * @return Parsed CV data
     */
    CVParseResult parseCV(String fileContent, String mimeType, String type);

    /**
     * Verify a document against expected type
     * @param fileContent Base64 encoded file content
     * @param mimeType File MIME type
     * @param expectedType Expected document type
     * @return Document verification result
     */
    DocumentScreeningResult verifyDocument(String fileContent, String mimeType, String expectedType);

    /**
     * Extract text from PDF content
     * @param fileContent Base64 encoded PDF content
     * @return Extracted text
     */
    String extractTextFromPDF(byte[] fileContent);

    /**
     * Extract text from DOCX content
     * @param fileContent DOCX file bytes
     * @return Extracted text
     */
    String extractTextFromDOCX(byte[] fileContent);

    HomeVisitInfoScanResponse parseHomeVisitInfo(String fileContent, String mimeType);
}
