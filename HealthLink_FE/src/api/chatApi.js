import axiosInstance from './axiosConfig';

/**
 * API client cho chức năng chat (ChatRoom + Message).
 * Tất cả yêu cầu đều cần JWT token (được tự động đính kèm qua axiosInstance).
 * Base URL: http://localhost:8096/api/chat
 */

const BASE = 'http://localhost:8096/api/chat';

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

/**
 * Tạo mới hoặc lấy phòng chat 1-1 giữa người dùng hiện tại và đối phương.
 * user1Id được lấy tự động từ JWT ở backend – không cần truyền từ FE.
 *
 * @param {string} partnerId       - userId (UUID) của đối phương
 * @param {string} [appointmentId] - ID của cuộc hẹn (tuỳ chọn)
 * @returns {Promise<ChatRoomDTO>}
 */
export async function getOrCreateRoom(partnerId, appointmentId = null) {
    const token = getToken();
    const body = { user2Id: partnerId };
    if (appointmentId) body.appointmentId = appointmentId;

    const res = await fetch(`${BASE}/rooms`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`getOrCreateRoom failed: ${res.status}`);
    return res.json();
}

/**
 * Lấy danh sách tất cả phòng chat của người dùng hiện tại (từ JWT).
 * Trả về kèm số tin nhắn chưa đọc (unreadCount).
 *
 * @returns {Promise<ChatRoomDTO[]>}
 */
export async function getMyRooms() {
    const token = getToken();
    const res = await fetch(`${BASE}/rooms/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`getMyRooms failed: ${res.status}`);
    return res.json();
}

/**
 * Lấy lịch sử tin nhắn trong một phòng chat với phân trang.
 *
 * @param {string} chatRoomId - ID phòng chat
 * @param {number} page - Trang cần lấy (mặc định 0)
 * @param {number} size - Số lượng tin nhắn mỗi trang (mặc định 25)
 * @returns {Promise<MessageDTO[]>}
 */
export async function getRoomMessages(chatRoomId, page = 0, size = 25) {
    const token = getToken();
    const res = await fetch(`${BASE}/rooms/${chatRoomId}/messages?page=${page}&size=${size}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`getRoomMessages failed: ${res.status}`);
    return res.json();
}

/**
 * Tìm kiếm tin nhắn trong phòng theo từ khóa.
 *
 * @param {string} chatRoomId - ID phòng chat
 * @param {string} query - Từ khóa tìm kiếm
 * @returns {Promise<MessageDTO[]>}
 */
export async function searchRoomMessages(chatRoomId, query) {
    const token = getToken();
    const res = await fetch(`${BASE}/rooms/${chatRoomId}/messages/search?query=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`searchRoomMessages failed: ${res.status}`);
    return res.json();
}

/**
 * Gửi tin nhắn mới.
 * senderId được lấy tự động từ JWT ở backend — không cần truyền.
 *
 * @param {object} request
 * @param {string} request.chatRoomId  - ID phòng chat
 * @param {string} request.receiverId  - userId của người nhận
 * @param {string} [request.content]   - Nội dung text (null nếu chỉ gửi ảnh)
 * @param {string} [request.imageUrl]  - URL ảnh (base64 hoặc URL)
 * @returns {Promise<MessageDTO>}
 */
export async function sendMessage(request) {
    const token = getToken();
    const res = await fetch(`${BASE}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error(`sendMessage failed: ${res.status}`);
    return res.json();
}

/**
 * Đánh dấu tất cả tin nhắn chưa đọc trong phòng là đã đọc.
 *
 * @param {string} chatRoomId - ID phòng chat
 * @returns {Promise<{updated: number}>}
 */
export async function markAsRead(chatRoomId) {
    const token = getToken();
    const res = await fetch(`${BASE}/rooms/${chatRoomId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`markAsRead failed: ${res.status}`);
    return res.json();
}

/**
 * Upload file đa phương tiện (ảnh, video, file).
 *
 * @param {string} chatRoomId - ID phòng chat
 * @param {string} type - 'image', 'video', 'file'
 * @param {File} file - File object
 * @returns {Promise<{url: string}>}
 */
export async function uploadMedia(chatRoomId, type, file) {
    const token = getToken();
    const formData = new FormData();
    formData.append('chatRoomId', chatRoomId);
    formData.append('type', type);
    formData.append('file', file);

    const res = await fetch(`${BASE}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });

    if (!res.ok) throw new Error(`uploadMedia failed: ${res.status}`);
    return res.json();
}

/**
 * Bật/Tắt chặn phòng chat.
 *
 * @param {string} chatRoomId - ID phòng chat
 * @returns {Promise<void>}
 */
export async function toggleBlock(chatRoomId) {
    const token = getToken();
    const res = await fetch(`${BASE}/rooms/${chatRoomId}/block`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`toggleBlock failed: ${res.status}`);
}
