/**
 * CV Parser Service - Uses the self-hosted Local AI Service to extract
 * information from CV files (PDF, DOCX, image).
 * 100% private - no data leaves your network.
 */

import { GEMINI_API_KEY } from '../config';
import * as localAI from './localAIService';

/**
 * Parse CV/Resume using Local AI Service (100% private)
 * @param {File} file - CV file (PDF, DOCX, or image)
 * @param {string} type - 'doctor' or 'pharmacy'
 * @returns {Promise<{success: boolean, data?: object, error?: string, confidence?: object}>}
 */
export async function parseCV(file, type = 'doctor') {
    try {
        const localAvailable = await localAI.isLocalAIAvailable();
        if (localAvailable) {
            console.log('Using Local AI Service (private)');
            return await localAI.parseCV(file, type);
        }
        return {
            success: false,
            error: 'Local AI Service is not running. Please start the AI service (port 8097).'
        };
    } catch (error) {
        console.error('Local AI error:', error.message);
        return {
            success: false,
            error: 'Local AI Service is not available. Please start the AI service.'
        };
    }
}

/**
 * Check if AI Service is available (Local AI)
 * @returns {Promise<boolean>}
 */
export async function isAIAvailable() {
    try {
        return await localAI.isLocalAIAvailable();
    } catch {
        return false;
    }
}

/**
 * Check if the CV import feature is enabled (API key is configured)
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
