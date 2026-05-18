import axios from 'axios';

/**
 * API module cho Admin Notifications
 *
 * Endpoints:
 *  - GET    /api/notifications           - Lấy danh sách thông báo (phân trang)
 *  - GET    /api/notifications/unread-count - Đếm số thông báo chưa đọc
 *  - PATCH  /api/notifications/{id}/read - Đánh dấu một thông báo đã đọc
 *  - PATCH  /api/notifications/mark-all-read - Đánh dấu tất cả đã đọc
 *  - DELETE /api/notifications/{id}      - Xóa một thông báo
 */

const API_BASE_URL = import.meta.env.VITE_SPRING_API_BASE_URL || 'http://localhost:8096';
const API_URL = `${API_BASE_URL}/api/notifications`;

// Helper: Lấy auth header
const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper: Xử lý lỗi API
const handleApiError = (error, defaultMessage) => {
    console.error(defaultMessage, error);

    if (error.response?.status === 401) {
        // Token hết hạn
        localStorage.removeItem('token');
        window.location.href = '/login';
    }

    throw error;
};

const adminNotificationApi = {
    /**
     * Lấy danh sách thông báo (phân trang)
     * @param {number} page - Trang hiện tại (0-indexed)
     * @param {number} size - Số item mỗi trang
     * @returns {Promise<Object>} { content: [], totalElements, totalPages, ... }
     */
    getNotifications: async (page = 0, size = 20) => {
        try {
            const response = await axios.get(API_URL, {
                params: { page, size },
                headers: getAuthHeader()
            });
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error fetching notifications:');
        }
    },

    /**
     * Đếm số thông báo chưa đọc
     * @returns {Promise<number>}
     */
    getUnreadCount: async () => {
        try {
            const response = await axios.get(`${API_URL}/unread-count`, {
                headers: getAuthHeader()
            });
            return response.data.unreadCount || 0;
        } catch (error) {
            handleApiError(error, 'Error fetching unread count:');
        }
    },

    /**
     * Đánh dấu một thông báo đã đọc
     * @param {number} notificationId - ID thông báo
     * @returns {Promise<void>}
     */
    markAsRead: async (notificationId) => {
        try {
            await axios.patch(
                `${API_URL}/${notificationId}/read`,
                {},
                { headers: getAuthHeader() }
            );
        } catch (error) {
            handleApiError(error, `Error marking notification ${notificationId} as read:`);
        }
    },

    /**
     * Đánh dấu tất cả thông báo đã đọc
     * @returns {Promise<void>}
     */
    markAllAsRead: async () => {
        try {
            await axios.patch(
                `${API_URL}/mark-all-read`,
                {},
                { headers: getAuthHeader() }
            );
        } catch (error) {
            handleApiError(error, 'Error marking all notifications as read:');
        }
    },

    /**
     * Xóa một thông báo
     * @param {number} notificationId - ID thông báo
     * @returns {Promise<void>}
     */
    deleteNotification: async (notificationId) => {
        try {
            await axios.delete(`${API_URL}/${notificationId}`, {
                headers: getAuthHeader()
            });
        } catch (error) {
            handleApiError(error, `Error deleting notification ${notificationId}:`);
        }
    }
};

export default adminNotificationApi;
