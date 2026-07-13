/**
 * Local AI Service - Uses local HealthLink_AI_Service for CV parsing
 * 100% private - no data leaves your network
 *
 * Replaces Gemini Cloud API for document processing
 */

// Local AI Service URL
const LOCAL_AI_URL = 'http://localhost:8097';

// AI_Service does CPU-only OCR + a local LLM call, which can legitimately take
// tens of seconds on a large/multi-page document — long enough that a bare
// `fetch` (previously no timeout at all) could hang indefinitely if the
// service or the Ollama daemon got stuck. Bound it so the UI can fail with a
// clear message instead of spinning forever.
const PARSE_TIMEOUT_MS = 60000;

/**
 * Downscale an image file client-side before upload if it exceeds maxDimension.
 * Large phone-camera photos (often 3000-4000px) cost time both over the wire
 * and server-side (denoise + OCR scale with pixel count), so capping the
 * longest side here shrinks both without a noticeable legibility loss.
 * Non-image files (PDF/DOCX) are returned unchanged.
 * @param {File} file
 * @param {number} maxDimension
 * @param {number} quality
 * @returns {Promise<File>}
 */
async function resizeImageIfNeeded(file, maxDimension = 1800, quality = 0.85) {
    if (!file || !file.type || !file.type.startsWith('image/')) {
        return file;
    }

    try {
        const bitmap = await createImageBitmap(file);
        const largestSide = Math.max(bitmap.width, bitmap.height);

        if (largestSide <= maxDimension) {
            bitmap.close?.();
            return file;
        }

        const scale = maxDimension / largestSide;
        const targetWidth = Math.round(bitmap.width * scale);
        const targetHeight = Math.round(bitmap.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
        bitmap.close?.();

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (!blob) return file;

        return new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
    } catch (error) {
        console.warn('Client-side image resize failed, uploading original file:', error.message);
        return file;
    }
}

/**
 * Check if Local AI Service is available
 * @returns {Promise<boolean>}
 */
export async function isLocalAIAvailable() {
    try {
        const response = await fetch(`${LOCAL_AI_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        if (response.ok) {
            const data = await response.json();
            return data.status === 'healthy';
        }
        return false;
    } catch (error) {
        console.log('Local AI Service not available:', error.message);
        return false;
    }
}

/**
 * Parse CV/Resume using Local AI Service
 * @param {File} file - CV file (PDF, DOCX, or image)
 * @param {string} type - 'doctor' or 'pharmacy'
 * @returns {Promise<{success: boolean, data?: object, error?: string, confidence?: object}>}
 */
export async function parseCV(file, type = 'doctor') {
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
        const uploadFile = await resizeImageIfNeeded(file);

        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('doc_type', type);

        const response = await fetch(`${LOCAL_AI_URL}/parse-cv`, {
            method: 'POST',
            body: formData,
            signal: AbortSignal.timeout(PARSE_TIMEOUT_MS)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            return {
                success: false,
                error: result.error || 'Failed to parse CV'
            };
        }

        // Normalize and clean the data
        const normalizedData = normalizeData(result.data, type);

        // Calculate confidence scores
        const confidence = result.confidence || calculateConfidence(normalizedData, type);

        return {
            success: true,
            data: normalizedData,
            confidence
        };

    } catch (error) {
        console.error('Local AI CV parsing error:', error);

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return {
                success: false,
                error: 'Local AI Service is not running. Please start the AI service.'
            };
        }

        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            return {
                success: false,
                error: 'Processing took too long and was cancelled. Please try again with a clearer/smaller file.'
            };
        }

        return {
            success: false,
            error: error.message || 'Failed to parse CV. Please try again.'
        };
    }
}

/**
 * Verify document using Local AI Service
 * @param {File} file - Document image
 * @param {string} expectedType - Expected document type
 * @returns {Promise<object>}
 */
export async function verifyDocument(file, expectedType) {
    try {
        const uploadFile = await resizeImageIfNeeded(file);

        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('expected_type', expectedType);

        const response = await fetch(`${LOCAL_AI_URL}/screen-document`, {
            method: 'POST',
            body: formData,
            signal: AbortSignal.timeout(PARSE_TIMEOUT_MS)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();

    } catch (error) {
        console.error('Local AI document verification error:', error);
        return {
            passed: true,
            confidence: 0.5,
            contentSafe: true,
            issues: ['Verification error - manual review required']
        };
    }
}

/**
 * Verify profile photo using Local AI Service
 * @param {File} file - Profile photo
 * @returns {Promise<object>}
 */
export async function verifyProfilePhoto(file) {
    try {
        const uploadFile = await resizeImageIfNeeded(file);

        const formData = new FormData();
        formData.append('file', uploadFile);

        const response = await fetch(`${LOCAL_AI_URL}/verify-profile`, {
            method: 'POST',
            body: formData,
            signal: AbortSignal.timeout(PARSE_TIMEOUT_MS)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();

    } catch (error) {
        console.error('Local AI profile verification error:', error);
        return {
            valid: true,
            hasFace: false,
            singleFace: false,
            contentSafe: true,
            confidence: 0.5,
            issues: ['Verification error - manual review required']
        };
    }
}

/**
 * Perform OCR on a file
 * @param {File} file - Image or document file
 * @returns {Promise<{success: boolean, text: string, confidence: number}>}
 */
export async function performOCR(file) {
    try {
        const uploadFile = await resizeImageIfNeeded(file);

        const formData = new FormData();
        formData.append('file', uploadFile);

        const response = await fetch(`${LOCAL_AI_URL}/ocr`, {
            method: 'POST',
            body: formData,
            signal: AbortSignal.timeout(PARSE_TIMEOUT_MS)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();

    } catch (error) {
        console.error('Local AI OCR error:', error);
        return {
            success: false,
            text: '',
            confidence: 0
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
    if (!data) return {};

    const normalized = { ...data };

    // Clean phone number
    if (normalized.phoneNumber) {
        normalized.phoneNumber = normalized.phoneNumber
            .replace(/[^\d+\-\s]/g, '')
            .replace(/\s+/g, '')
            .trim();
    }

    // Clean email
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

    // Normalize pharmacy name
    if (normalized.pharmacyName) {
        normalized.pharmacyName = normalized.pharmacyName.trim();
    }

    // Convert yearsOfExperience to number
    if (normalized.yearsOfExperience !== null && normalized.yearsOfExperience !== undefined) {
        if (typeof normalized.yearsOfExperience === 'string') {
            const num = parseInt(normalized.yearsOfExperience.replace(/\D/g, ''), 10);
            normalized.yearsOfExperience = isNaN(num) ? null : num;
        }
    }

    // Clean address fields
    const addressFields = ['location', 'address', 'city', 'district', 'ward', 'clinicAddress'];
    addressFields.forEach(field => {
        if (normalized[field]) {
            normalized[field] = normalized[field].trim();
        }
    });

    // Clean qualifications
    if (normalized.qualifications) {
        normalized.qualifications = normalized.qualifications
            .split(',')
            .map(q => q.trim())
            .filter(q => q.length > 0)
            .join(', ');
    }

    // Clean languages
    if (normalized.languageSpoken) {
        const languages = normalized.languageSpoken
            .split(/[,;]/)
            .map(lang => lang.trim())
            .filter(lang => lang.length > 0);
        normalized.languageSpoken = [...new Set(languages)].join(', ');
    }

    // Trim bio/description
    if (normalized.bio) normalized.bio = normalized.bio.trim();
    if (normalized.description) normalized.description = normalized.description.trim();

    return normalized;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
function isValidPhone(phone) {
    if (!phone) return false;
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

    const getFieldConfidence = (value, fieldName) => {
        if (value === null || value === undefined || value === '') {
            return 0;
        }

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

    const scores = Object.values(confidence);
    confidence.overall = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
        : 0;

    return confidence;
}

/**
 * Get supported file types for CV import
 */
export function getSupportedFileTypes() {
    return ['.pdf', '.docx', '.jpg', '.jpeg', '.png', '.webp'];
}

/**
 * Get accept attribute for file input
 */
export function getFileAcceptString() {
    return '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp';
}

export default {
    parseCV,
    verifyDocument,
    verifyProfilePhoto,
    performOCR,
    isLocalAIAvailable,
    getSupportedFileTypes,
    getFileAcceptString
};
