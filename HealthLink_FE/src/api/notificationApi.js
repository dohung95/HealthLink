import axios from 'axios';

const API_URL = 'https://localhost:7267/api/Notification';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const notificationApi = {
  // Get all notifications for current user
  getMyNotifications: async () => {
    try {
      const response = await axios.get(`${API_URL}/my`, {
        headers: getAuthHeader()
      });
      console.log('API response for notifications:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get unread count
  getUnreadCount: async () => {
    const response = await axios.get(`${API_URL}/my/unread-count`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    const response = await axios.put(`${API_URL}/${notificationId}/mark-read`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await axios.put(`${API_URL}/mark-all-read`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    const response = await axios.delete(`${API_URL}/${notificationId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  }
};

export default notificationApi;
