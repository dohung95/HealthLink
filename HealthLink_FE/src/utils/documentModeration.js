/**
 * Document Moderation Utility
 * Combines NSFWJS content moderation with Gemini-based document type verification
 */

import { moderateImageFile, isImageFile } from './imageModeration';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Document type definitions and their expected content
const DOCUMENT_TYPES = {
    'Medical Degree Certificate': {
        keywords: ['degree', 'medicine', 'medical', 'doctor', 'M.D.', 'M.B.B.S', 'university', 'graduate', 'diploma'],
        description: 'A medical degree certificate or diploma'
    },
    'Practice License': {
        keywords: ['license', 'practice', 'medical', 'health', 'ministry', 'authority', 'registration', 'permit'],
        description: 'A medical practice license or registration certificate'
    },
    'ID Card / Passport': {
        keywords: ['identity', 'ID', 'passport', 'citizen', 'national', 'photo', 'DOB', 'date of birth'],
        description: 'A government-issued ID card or passport'
    },
    'Business License': {
        keywords: ['business', 'license', 'registration', 'company', 'commerce', 'tax', 'certificate'],
        description: 'A business registration or license certificate'
    },
    'Pharmacy License': {
        keywords: ['pharmacy', 'pharmaceutical', 'drug', 'medicine', 'license', 'registration', 'health'],
        description: 'A pharmacy operation license or registration'
    },
    'Profile Photo': {
        keywords: ['portrait', 'face', 'person', 'professional', 'photo'],
        description: 'A professional portrait photo'
    }
};

/**
 * Convert file to base64 for Gemini Vision
 * @param {File} file - Image file
 * @returns {Promise<{inlineData: {data: string, mimeType: string}}>}
 */
async function fileToGenerativePart(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1];
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: file.type
                }
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Verify document type using Gemini Vision AI
 * @param {File} file - Document file (image)
 * @param {string} expectedType - Expected document type
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<{matches: boolean, detectedType: string, confidence: number, issues: string[]}>}
 */
export async function verifyDocumentTypeWithAI(file, expectedType, apiKey) {
    if (!apiKey) {
        // If no API key, skip AI verification and allow the document
        return {
            matches: true,
            detectedType: expectedType,
            confidence: 0.5,
            issues: [],
            skipped: true,
            reason: 'AI verification skipped - no API key provided'
        };
    }

    if (!isImageFile(file)) {
        // For non-image files (PDF, DOCX), we can't use vision API directly
        return {
            matches: true,
            detectedType: expectedType,
            confidence: 0.7,
            issues: [],
            skipped: true,
            reason: 'AI verification skipped - document is not an image'
        };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const imagePart = await fileToGenerativePart(file);

        const typeInfo = DOCUMENT_TYPES[expectedType] || {
            keywords: [],
            description: expectedType
        };

        const prompt = `Analyze this document image and determine:
1. What type of document is this?
2. Is it a valid "${expectedType}" (${typeInfo.description})?
3. Is the document readable and clear?
4. Does it appear authentic (no obvious manipulation)?

Expected document should contain: ${typeInfo.keywords.join(', ')}

Return JSON only (no markdown):
{
  "detectedType": "type of document you see",
  "matchesExpected": true/false,
  "readable": true/false,
  "appearsAuthentic": true/false,
  "confidence": 0.0-1.0,
  "issues": ["list of any issues found"]
}`;

        const result = await model.generateContent([prompt, imagePart]);
        const rawText = result.response.text();

        // Clean JSON response
        let cleanJson = rawText.trim();
        if (cleanJson.startsWith('```json')) {
            cleanJson = cleanJson.slice(7);
        } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.slice(3);
        }
        if (cleanJson.endsWith('```')) {
            cleanJson = cleanJson.slice(0, -3);
        }

        const parsed = JSON.parse(cleanJson.trim());

        return {
            matches: parsed.matchesExpected && parsed.readable && parsed.appearsAuthentic,
            detectedType: parsed.detectedType,
            confidence: parsed.confidence,
            issues: parsed.issues || [],
            readable: parsed.readable,
            authentic: parsed.appearsAuthentic
        };

    } catch (error) {
        console.error('Document verification error:', error);
        // On error, allow the document but flag for manual review
        return {
            matches: true,
            detectedType: expectedType,
            confidence: 0.5,
            issues: ['AI verification failed - document will be reviewed manually'],
            error: true
        };
    }
}

/**
 * Full document moderation - checks both content safety and document type
 * @param {File} file - Document file
 * @param {string} expectedType - Expected document type
 * @param {string} [apiKey] - Optional Gemini API key for type verification
 * @returns {Promise<{safe: boolean, documentType: string, confidence: number, issues: string[], warning: boolean}>}
 */
export async function moderateDocument(file, expectedType, apiKey = null) {
    const issues = [];
    let overallSafe = true;
    let warning = false;

    // Step 1: Check NSFW content for images
    if (isImageFile(file)) {
        const nsfwResult = await moderateImageFile(file);

        if (!nsfwResult.safe) {
            return {
                safe: false,
                documentType: expectedType,
                confidence: 0,
                issues: [nsfwResult.reason],
                warning: false,
                nsfwBlocked: true
            };
        }

        if (nsfwResult.warning) {
            warning = true;
            issues.push(nsfwResult.reason);
        }
    }

    // Step 2: Verify document type with AI (if API key provided)
    if (apiKey && isImageFile(file)) {
        const typeResult = await verifyDocumentTypeWithAI(file, expectedType, apiKey);

        if (!typeResult.matches && !typeResult.skipped) {
            overallSafe = false;
            if (typeResult.issues && typeResult.issues.length > 0) {
                issues.push(...typeResult.issues);
            } else {
                issues.push(`Document appears to be "${typeResult.detectedType}" but expected "${expectedType}"`);
            }
        }

        return {
            safe: overallSafe,
            documentType: typeResult.detectedType || expectedType,
            confidence: typeResult.confidence || 0.5,
            issues,
            warning,
            aiVerified: !typeResult.skipped && !typeResult.error
        };
    }

    // No AI verification - just return NSFW result
    return {
        safe: overallSafe,
        documentType: expectedType,
        confidence: 0.7,
        issues,
        warning,
        aiVerified: false
    };
}

/**
 * Quick content check without document type verification
 * @param {File} file - File to check
 * @returns {Promise<{safe: boolean, reason?: string}>}
 */
export async function quickContentCheck(file) {
    if (!isImageFile(file)) {
        return { safe: true, skipped: true };
    }

    const result = await moderateImageFile(file);
    return {
        safe: result.safe,
        warning: result.warning,
        reason: result.reason
    };
}

export default {
    moderateDocument,
    verifyDocumentTypeWithAI,
    quickContentCheck,
    DOCUMENT_TYPES
};
