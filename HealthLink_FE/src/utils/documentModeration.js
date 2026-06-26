/**
 * Document Moderation Utility
 * NSFWJS-based content safety check for uploaded images.
 */

import { moderateImageFile, isImageFile } from './imageModeration';

/**
 * Quick content check (NSFW only) without document type verification
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
    quickContentCheck
};
