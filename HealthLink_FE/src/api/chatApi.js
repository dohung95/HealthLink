import axiosInstance from './axiosConfig';

/**
 * API client cho chức năng chat (ChatRoom + Message).
 * Tất cả yêu cầu đều cần JWT token (được tự động đính kèm qua axiosInstance).
 * Base URL: http://localhost:8096/api/chat
 */

const BASE = 'http://localhost:8096/api/chat';

/**
 * Tạo mới hoặc lấy phòng chat 1-1 giữa 2 user.
 * Nếu phòng đã tồn tại, trả về phòng đó.
 *
 * @param {string} user1Id      - userId của người dùng 1
 * @param {string} user2Id      - userId của người dùng 2
 * @param {string} [appointmentId] - ID của cuộc hẹn (tuỳ chọn)
 * @returns {Promise<ChatRoomDTO>}
 */
export async function getOrCreateRoom(user1Id, user2Id, appointmentId = null) {
    const token = localStorage.getItem('token');
    const body = { user1Id, user2Id };
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
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE}/rooms/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`getMyRooms failed: ${res.status}`);
    return res.json();
}

/**
 * Lấy toàn bộ lịch sử tin nhắn trong một phòng chat.
 *
 * @param {string} chatRoomId - ID phòng chat
 * @returns {Promise<MessageDTO[]>}
 */
export async function getRoomMessages(chatRoomId) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE}/rooms/${chatRoomId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`getRoomMessages failed: ${res.status}`);
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
    const token = localStorage.getItem('token');
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
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE}/rooms/${chatRoomId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`markAsRead failed: ${res.status}`);
    return res.json();
}
