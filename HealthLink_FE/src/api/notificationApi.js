import axiosInstance from './axiosConfig';
import { normalizeNotification } from './normalizers';

export const notificationApi = {
  getMyNotifications: async () => {
    const response = await axiosInstance.get('/api/notifications', {
      params: { page: 0, size: 100 },
    });

    const items = response.data?.content ?? response.data?.items ?? response.data ?? [];
    return items.map(normalizeNotification);
  },

  getUnreadCount: async () => {
    const response = await axiosInstance.get('/api/notifications/unread-count');
    // Backend trả về { unreadCount: N }
    return response.data?.unreadCount ?? response.data ?? 0;
  },

  markAsRead: async (notificationId) => {
    const response = await axiosInstance.patch(`/api/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const notifications = await notificationApi.getMyNotifications();
    await Promise.all(
      notifications
        .filter((item) => !item.isRead)
        .map((item) => notificationApi.markAsRead(item.notificationId)),
    );
    return { success: true };
  },

  deleteNotification: async (notificationId) => {
    return notificationApi.markAsRead(notificationId);
  },
};

export default notificationApi;
