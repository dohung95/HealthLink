/**
 * Decode JWT token and return payload
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded token payload or null if invalid
 */
export function decodeToken(token) {
    try {
        if (!token) return null;

        const parts = token.split('.');
        if (parts.length !== 3) return null;

        // Decode the payload (second part)
        const decoded = JSON.parse(atob(parts[1]));
        return decoded;
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
}

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if expired, false otherwise
 */
export function isTokenExpired(token) {
    try {
        const decoded = decodeToken(token);
        if (!decoded || !decoded.exp) return true;

        // exp is in seconds, Date.now() is in milliseconds
        return decoded.exp * 1000 < Date.now();
    } catch (error) {
        return true;
    }
}

/**
 * Get expiration time in seconds remaining
 * @param {string} token - JWT token
 * @returns {number} - Seconds remaining until expiration
 */
export function getTokenExpiresIn(token) {
    try {
        const decoded = decodeToken(token);
        if (!decoded || !decoded.exp) return 0;

        return decoded.exp - Math.floor(Date.now() / 1000);
    } catch (error) {
        return 0;
    }
}
