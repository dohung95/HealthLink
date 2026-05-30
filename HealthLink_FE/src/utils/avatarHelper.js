// Helper function to get full avatar URL
// Handles both relative paths (from backend) and absolute URLs

const DEFAULT_API_HOST = 'http://localhost:8096';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_SPRING_API_BASE_URL || DEFAULT_API_HOST;

/**
 * Get the full URL for an avatar image
 * @param {string} avatarUrl - The avatar URL from the database (can be relative or absolute)
 * @returns {string|null} - Full URL or null if no avatar
 */
export const getAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return null;

  // If already an absolute URL, return as-is
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }

  // If relative path, prepend the API base URL
  // Handle both "/uploads/..." and "uploads/..." formats
  const path = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
  return `${API_BASE_URL}${path}`;
};

export default getAvatarUrl;
