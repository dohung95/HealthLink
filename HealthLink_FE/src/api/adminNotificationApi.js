import axios from 'axios';

/**
 * API module cho Admin Notifications (Hệ thống độc lập cho Admin)
 *
 * Base URL: /api/admin/notifications
 *
 * Endpoints:
 *  - GET    /                      - Lấy danh sách thông báo (phân trang, filter by type)
 *  - GET    /unread-count          - Đếm số thông báo chưa đọc
 *  - GET    /unread-count-by-type  - Đếm số chưa đọc theo từng loại
 *  - PATCH  /{id}/read             - Đánh dấu một thông báo đã đọc
 *  - PATCH  /mark-all-read         - Đánh dấu tất cả đã đọc (có thể filter by type)
 *  - DELETE /{id}                  - Xóa một thông báo
 *  - DELETE /cleanup               - Xóa các thông báo cũ
 *  - GET    /statistics            - Thống kê thông báo
 */

const API_BASE_URL = import.meta.env.VITE_SPRING_API_BASE_URL || 'http://localhost:8096';
const API_URL = `${API_BASE_URL}/api/admin/notifications`;

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
     * @param {string} type - Loại notification (optional): NEW_REGISTRATION, NEW_APPOINTMENT, etc.
     * @returns {Promise<Object>} { content: [], totalElements, totalPages, ... }
     */
    getNotifications: async (page = 0, size = 20, type = null) => {
        try {
            const params = { page, size };
            if (type) {
                params.type = type;
            }

            const response = await axios.get(API_URL, {
                params,
                headers: getAuthHeader()
            });
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error fetching admin notifications:');
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
     * Đếm số thông báo chưa đọc theo từng loại
     * @returns {Promise<Object>} { NEW_REGISTRATION: 3, NEW_APPOINTMENT: 5, ... }
     */
    getUnreadCountByType: async () => {
        try {
            const response = await axios.get(`${API_URL}/unread-count-by-type`, {
                headers: getAuthHeader()
            });
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error fetching unread count by type:');
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
     * @param {string} type - Loại notification (optional) - nếu có chỉ đánh dấu loại đó
     * @returns {Promise<Object>} { message, count }
     */
    markAllAsRead: async (type = null) => {
        try {
            const params = type ? { type } : {};
            const response = await axios.patch(
                `${API_URL}/mark-all-read`,
                {},
                {
                    params,
                    headers: getAuthHeader()
                }
            );
            return response.data;
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
    },

    /**
     * Xóa các thông báo cũ (cleanup)
     * @param {number} daysOld - Số ngày tuổi tối thiểu để xóa (mặc định: 30)
     * @returns {Promise<Object>} { message, deletedCount }
     */
    cleanupOldNotifications: async (daysOld = 30) => {
        try {
            const response = await axios.delete(`${API_URL}/cleanup`, {
                params: { daysOld },
                headers: getAuthHeader()
            });
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error cleaning up old notifications:');
        }
    },

    /**
     * Lấy thống kê thông báo trong khoảng thời gian
     * @param {number} days - Số ngày gần đây (mặc định: 7)
     * @returns {Promise<Object>} { NEW_REGISTRATION: 10, NEW_APPOINTMENT: 25, ... }
     */
    getStatistics: async (days = 7) => {
        try {
            const response = await axios.get(`${API_URL}/statistics`, {
                params: { days },
                headers: getAuthHeader()
            });
            return response.data;
        } catch (error) {
            handleApiError(error, 'Error fetching notification statistics:');
        }
    }
};

export default adminNotificationApi;
