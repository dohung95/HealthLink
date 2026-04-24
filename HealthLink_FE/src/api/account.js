const API_UPDATE_URL = 'https://localhost:7267/api/account';
import axios from 'axios';

// --- Lấy thông tin hồ sơ hiện tại ---
export const getProfile = async (token) => {
    const response = await axios.get(
        `${API_UPDATE_URL}/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
};

// --- Cập nhật thông tin chung (Fullname, SĐT, etc.) ---
// ✅ ĐÚNG
export const updateProfile = async (token, data) => {
    const response = await axios.put(
        `${API_UPDATE_URL}/update-profile`,
        data,  // ← Phải gửi data!
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
};

// --- Đổi mật khẩu ---
export const changePassword = async (token, passwordData) => {
    const response = await axios.put(
        `${API_UPDATE_URL}/change-password`,
        passwordData,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
};

// --- Đổi email ---
export const changeEmail = async (token, emailData) => {
    const response = await axios.post(
        `${API_UPDATE_URL}/change-email`,
        emailData,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
};