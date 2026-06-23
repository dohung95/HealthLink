/**
 * CV Parser Service - Uses AI to extract information from CV files
 * Supports PDF and DOCX formats
 *
 * Priority: Local AI Service (if available) > Gemini Cloud API
 * Local AI: 100% private - no data leaves your network
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { GEMINI_API_KEY, CONFIG } from '../config';
import * as localAI from './localAIService';

// Set PDF.js worker - use unpkg which mirrors npm versions exactly
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// CV Parse Prompt for Doctor Registration
const DOCTOR_CV_PARSE_PROMPT = `You are an intelligent CV/Resume parser for a medical professional registration system.

Your task: Extract information and MAP similar/related fields to the correct output fields.

## FIELD MAPPING RULES (Important!)
Many CVs use different terms for the same information. Map them correctly:

| Output Field      | Accept these similar terms/labels from CV                                           |
|-------------------|------------------------------------------------------------------------------------|
| fullName          | name, full name, họ tên, tên, candidate name, applicant                           |
| email             | e-mail, mail, email address, contact email, địa chỉ email                         |
| phoneNumber       | phone, mobile, tel, telephone, cell, contact number, số điện thoại, SĐT           |
| qualifications    | education, degrees, certifications, training, học vấn, bằng cấp, chứng chỉ        |
| specialty         | specialization, speciality, field, expertise, major, chuyên khoa, chuyên ngành    |
| yearsOfExperience | experience, years of practice, work experience, kinh nghiệm, số năm               |
| languageSpoken    | languages, language skills, fluent in, ngôn ngữ, ngoại ngữ                        |
| location          | address, city, region, residence, place, living in, địa chỉ, thành phố, nơi ở    |
| bio               | summary, about, profile, objective, introduction, giới thiệu, mô tả bản thân      |
| clinicName        | workplace, hospital, clinic, company, current employer, nơi làm việc, bệnh viện   |
| clinicAddress     | work address, hospital address, clinic location, địa chỉ làm việc                 |

## EXTRACTION RULES:
1. Return ONLY valid JSON, no markdown, no code blocks
2. Use null for fields not found or unclear
3. Prefer English output, but accept Vietnamese input
4. For "yearsOfExperience": extract as NUMBER (e.g., "5 years" → 5)
5. For "location": extract the PERSONAL address/city, NOT workplace
6. For "clinicAddress": extract the WORKPLACE address
7. Combine multiple qualifications with commas
8. If both Vietnamese and English versions exist, prefer English

## OUTPUT FORMAT:
{
  "fullName": "string or null",
  "email": "string or null",
  "phoneNumber": "string or null",
  "qualifications": "string or null",
  "specialty": "string or null",
  "yearsOfExperience": number or null,
  "languageSpoken": "string or null",
  "location": "string or null",
  "bio": "string (max 200 words) or null",
  "clinicName": "string or null",
  "clinicAddress": "string or null"
}

CV/Resume Text:
`;

// CV Parse Prompt for Pharmacy Registration
const PHARMACY_CV_PARSE_PROMPT = `You are an intelligent document parser for a pharmacy registration system.

Your task: Extract information and MAP similar/related fields to the correct output fields.

## FIELD MAPPING RULES (Important!)
Documents may use different terms for the same information. Map them correctly:

| Output Field   | Accept these similar terms/labels from document                                        |
|----------------|----------------------------------------------------------------------------------------|
| pharmacyName   | name, pharmacy name, store name, business name, tên nhà thuốc, tên cửa hàng           |
| email          | e-mail, mail, email address, contact email, địa chỉ email                             |
| phoneNumber    | phone, mobile, tel, telephone, contact, hotline, số điện thoại, SĐT                   |
| licenseNumber  | license, registration number, permit number, business license, giấy phép, mã số, GPKD |
| address        | street, location, full address, địa chỉ, số nhà, đường                                |
| city           | province, thành phố, tỉnh, TP (extract city/province name only)                       |
| district       | quận, huyện, county, area (extract district name only)                                |
| ward           | phường, xã, neighborhood, khu vực (extract ward name only)                            |
| description    | about, intro, summary, services, giới thiệu, mô tả, dịch vụ                           |

## ADDRESS PARSING RULES:
If the document has a FULL ADDRESS like "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM":
- address: "123 Nguyễn Huệ" (street number + street name only)
- ward: "Bến Nghé" or "Phường Bến Nghé"
- district: "Quận 1" or "1"
- city: "Hồ Chí Minh" or "TP.HCM"

## EXTRACTION RULES:
1. Return ONLY valid JSON, no markdown, no code blocks
2. Use null for fields not found or unclear
3. Accept both Vietnamese and English input
4. Split combined address into separate fields (address, ward, district, city)
5. For licenseNumber: look for patterns like "GP-xxxxx", "ĐKKD-xxxxx", or any official numbers

## OUTPUT FORMAT:
{
  "pharmacyName": "string or null",
  "email": "string or null",
  "phoneNumber": "string or null",
  "licenseNumber": "string or null",
  "address": "string (street address only) or null",
  "city": "string or null",
  "district": "string or null",
  "ward": "string or null",
  "description": "string (max 200 words) or null"
}

Document Text:
`;

/**
 * Extract text from PDF file
 * @param {File} file - PDF file
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }

    return fullText.trim();
}

/**
 * Extract text from DOCX file
 * @param {File} file - DOCX file
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromDOCX(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
}

/**
 * Convert image file to base64 for Gemini Vision
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
 * Parse CV/Resume using Local AI Service (100% private)
 * Gemini Cloud API is disabled for privacy
 * @param {File} file - CV file (PDF, DOCX, or image)
 * @param {string} type - 'doctor' or 'pharmacy'
 * @returns {Promise<{success: boolean, data?: object, error?: string, confidence?: object}>}
 */
export async function parseCV(file, type = 'doctor') {
    // Use Local AI Service only (Gemini disabled for privacy)
    try {
        const localAvailable = await localAI.isLocalAIAvailable();
        if (localAvailable) {
            console.log('Using Local AI Service (private)');
            return await localAI.parseCV(file, type);
        } else {
            return {
                success: false,
                error: 'Local AI Service is not running. Please start the AI service (port 8097).'
            };
        }
    } catch (error) {
        console.error('Local AI error:', error.message);
        return {
            success: false,
            error: 'Local AI Service is not available. Please start the AI service.'
        };
    }

    /* ========== GEMINI DISABLED FOR PRIVACY ==========
    // Fallback to Gemini Cloud API (disabled)
    if (!GEMINI_API_KEY) {
        return {
            success: false,
            error: 'AI Service is not available. Please start the local AI service or configure Gemini API key.'
        };
    }
    */

    if (!file) {
        return {
            success: false,
            error: 'No file provided.'
        };
    }

    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
        return {
            success: false,
            error: 'Unsupported file type. Please upload PDF, DOCX, or image file.'
        };
    }

    try {
        const modelName = CONFIG.GEMINI_MODEL || "gemini-1.5-flash";
        console.log('Using Gemini Cloud API:', modelName);

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });

        let response;
        const prompt = type === 'doctor' ? DOCTOR_CV_PARSE_PROMPT : PHARMACY_CV_PARSE_PROMPT;

        // Handle different file types
        if (file.type === 'application/pdf') {
            const text = await extractTextFromPDF(file);
            if (!text || text.length < 50) {
                return {
                    success: false,
                    error: 'Could not extract text from PDF. The file might be scanned or empty.'
                };
            }
            response = await model.generateContent(prompt + text);
        }
        else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const text = await extractTextFromDOCX(file);
            if (!text || text.length < 50) {
                return {
                    success: false,
                    error: 'Could not extract text from DOCX. The file might be empty.'
                };
            }
            response = await model.generateContent(prompt + text);
        }
        else if (file.type.startsWith('image/')) {
            // Use Gemini Vision for images
            const imagePart = await fileToGenerativePart(file);
            const imagePrompt = prompt + '\n[Image CV attached - please extract text and information from the image]';
            response = await model.generateContent([imagePrompt, imagePart]);
        }

        const rawText = response.response.text();

        // Clean the response - remove markdown code blocks if present
        let cleanJson = rawText.trim();
        if (cleanJson.startsWith('```json')) {
            cleanJson = cleanJson.slice(7);
        } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.slice(3);
        }
        if (cleanJson.endsWith('```')) {
            cleanJson = cleanJson.slice(0, -3);
        }
        cleanJson = cleanJson.trim();

        // Parse JSON
        const parsedData = JSON.parse(cleanJson);

        // Normalize and clean the data
        const normalizedData = normalizeData(parsedData, type);

        // Calculate confidence scores based on filled fields
        const confidence = calculateConfidence(normalizedData, type);

        return {
            success: true,
            data: normalizedData,
            confidence
        };

    } catch (error) {
        console.error('CV parsing error:', error);

        if (error.message?.includes('API key')) {
            return {
                success: false,
                error: 'Invalid API key. Please check your Gemini API key.'
            };
        }

        if (error.message?.includes('503') || error.message?.includes('high demand')) {
            return {
                success: false,
                error: 'AI service is temporarily busy. Please wait a moment and try again.'
            };
        }

        if (error.message?.includes('429') || error.message?.includes('quota')) {
            return {
                success: false,
                error: 'API rate limit reached. Please wait a few minutes and try again.'
            };
        }

        if (error.message?.includes('JSON')) {
            return {
                success: false,
                error: 'Could not parse CV content. Please try again or use a different file.'
            };
        }

        return {
            success: false,
            error: error.message || 'Failed to parse CV. Please try again.'
        };
    }
}

/**
 * Normalize and clean parsed data
 * @param {object} data - Raw parsed data
 * @param {string} type - 'doctor' or 'pharmacy'
 * @returns {object} - Cleaned data
 */
function normalizeData(data, type) {
    const normalized = { ...data };

    // Clean phone number - remove spaces, keep only digits and + sign
    if (normalized.phoneNumber) {
        normalized.phoneNumber = normalized.phoneNumber
            .replace(/[^\d+\-\s]/g, '')  // Keep digits, +, -, spaces
            .replace(/\s+/g, '')          // Remove all spaces
            .trim();
    }

    // Clean email - lowercase and trim
    if (normalized.email) {
        normalized.email = normalized.email.toLowerCase().trim();
    }

    // Normalize full name - Title Case
    if (normalized.fullName) {
        normalized.fullName = normalized.fullName
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    // Normalize pharmacy name - Title Case
    if (normalized.pharmacyName) {
        normalized.pharmacyName = normalized.pharmacyName.trim();
    }

    // Convert yearsOfExperience to number if string
    if (normalized.yearsOfExperience !== null && normalized.yearsOfExperience !== undefined) {
        if (typeof normalized.yearsOfExperience === 'string') {
            const num = parseInt(normalized.yearsOfExperience.replace(/\D/g, ''), 10);
            normalized.yearsOfExperience = isNaN(num) ? null : num;
        }
    }

    // Clean location/address fields
    const addressFields = ['location', 'address', 'city', 'district', 'ward', 'clinicAddress'];
    addressFields.forEach(field => {
        if (normalized[field]) {
            normalized[field] = normalized[field].trim();
        }
    });

    // Clean qualifications - remove extra spaces
    if (normalized.qualifications) {
        normalized.qualifications = normalized.qualifications
            .split(',')
            .map(q => q.trim())
            .filter(q => q.length > 0)
            .join(', ');
    }

    // Clean language spoken - remove duplicates and normalize
    if (normalized.languageSpoken) {
        const languages = normalized.languageSpoken
            .split(/[,;]/)
            .map(lang => lang.trim())
            .filter(lang => lang.length > 0);
        const uniqueLangs = [...new Set(languages)];
        normalized.languageSpoken = uniqueLangs.join(', ');
    }

    // Trim bio/description
    if (normalized.bio) {
        normalized.bio = normalized.bio.trim();
    }
    if (normalized.description) {
        normalized.description = normalized.description.trim();
    }

    return normalized;
}

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number format
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
    if (!phone) return false;
    // At least 9 digits
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 9 && digitsOnly.length <= 15;
}

/**
 * Calculate confidence scores for parsed fields
 * @param {object} data - Parsed CV data
 * @param {string} type - 'doctor' or 'pharmacy'
 * @returns {object} - Confidence scores per field
 */
function calculateConfidence(data, type) {
    const confidence = {};

    // Helper to calculate field confidence
    const getFieldConfidence = (value, fieldName) => {
        if (value === null || value === undefined || value === '') {
            return 0;
        }

        // Special validation for specific fields
        if (fieldName === 'email') {
            return isValidEmail(value) ? 0.95 : 0.3;
        }
        if (fieldName === 'phoneNumber') {
            return isValidPhone(value) ? 0.95 : 0.4;
        }
        if (fieldName === 'yearsOfExperience') {
            if (typeof value === 'number' && value >= 0 && value <= 60) {
                return 0.9;
            }
            return 0.5;
        }

        // General text field confidence
        if (typeof value === 'string') {
            if (value.length < 2) return 0.2;
            if (value.length < 5) return 0.5;
            if (value.length >= 5) return 0.85;
        }

        return 0.7;
    };

    if (type === 'doctor') {
        const fields = ['fullName', 'email', 'phoneNumber', 'qualifications', 'specialty',
                       'yearsOfExperience', 'languageSpoken', 'location', 'bio', 'clinicName', 'clinicAddress'];

        fields.forEach(field => {
            confidence[field] = getFieldConfidence(data[field], field);
        });
    } else {
        const fields = ['pharmacyName', 'email', 'phoneNumber', 'licenseNumber',
                       'address', 'city', 'district', 'ward', 'description'];

        fields.forEach(field => {
            confidence[field] = getFieldConfidence(data[field], field);
        });
    }

    // Calculate overall confidence (weighted)
    const scores = Object.values(confidence);
    confidence.overall = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
        : 0;

    return confidence;
}

/**
 * Check if AI Service is available (Local AI only - Gemini disabled)
 * @returns {Promise<boolean>}
 */
export async function isAIAvailable() {
    // Check Local AI only (Gemini disabled for privacy)
    try {
        return await localAI.isLocalAIAvailable();
    } catch (e) {
        return false;
    }
}

/**
 * Check if Gemini AI is available (API key is configured)
 * @returns {boolean}
 * @deprecated Use isAIAvailable() instead
 */
export function isGeminiAvailable() {
    return !!GEMINI_API_KEY && GEMINI_API_KEY.length > 10;
}

/**
 * Get supported file types for CV import
 * @returns {string[]}
 */
export function getSupportedFileTypes() {
    return ['.pdf', '.docx', '.jpg', '.jpeg', '.png', '.webp'];
}

/**
 * Get accept attribute for file input
 * @returns {string}
 */
export function getFileAcceptString() {
    return '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp';
}

export default {
    parseCV,
    isAIAvailable,
    isGeminiAvailable,
    getSupportedFileTypes,
    getFileAcceptString
};
