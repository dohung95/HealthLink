import axios from 'axios';

const API_URL = 'http://localhost:8096/api/auth';

/**
 * Đăng nhập bằng email + password.
 * @returns {Promise<LoginResponse>} accessToken, refreshToken, userId, email, username, role
 */
export async function login(email, password) {
    try {
        const res = await axios.post(`${API_URL}/login`, { email, password });
        return res.data;
    } catch (error) {
        const msg = error.response?.data?.message
            || error.response?.data?.error
            || error.message
            || 'Invalid email or password';
        throw new Error(msg);
    }
}

/**
 * Đăng ký tài khoản mới (Patient mặc định).
 * Body: { username, email, password, phoneNumber, role }
 */
export async function register(username, phoneNumber, email, password, dateOfBirth, gender, heightCm, weightKg, preferredLanguage) {
    try {
        const res = await axios.post(`${API_URL}/register`, {
            username,
            email,
            password,
            phoneNumber,
            dateOfBirth,
            gender,
            heightCm,
            weightKg,
            preferredLanguage,
            role: 'Patient',
        });
        return res.data;
    } catch (error) {
        const data = error.response?.data;
        if (data?.validationErrors || data?.ValidationErrors) {
            const errs = data.validationErrors || data.ValidationErrors;
            const msg = Object.values(errs).flat().join(', ');
            throw new Error(msg || data.message || 'Validation failed');
        }
        if (data?.errors) {
            const msg = Object.values(data.errors).flat().join(', ');
            throw new Error(msg || data.title || 'Validation failed');
        }
        const msg = data?.message || data?.Message || data?.title
            || error.message || 'Registration failed. Please try again.';
        throw new Error(msg);
    }
}

/**
 * Làm mới access token bằng refresh token.
 * @returns {Promise<LoginResponse|null>}
 */
export async function refreshAccessToken(refreshToken) {
    try {
        const res = await axios.post(`${API_URL}/refresh`, { refreshToken });
        return res.data;
    } catch (error) {
        console.error('Token refresh error:', error);
        return null;
    }
}

/**
 * Logout bảo mật: blacklist access token + revoke refresh token trên server.
 * Backend nhận Authorization header, không nhận body.
 */
export async function logout() {
    const token = localStorage.getItem('token');
    if (!token) return true;
    try {
        await axios.post(`${API_URL}/logout`, null, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return true;
    } catch (error) {
        // Dù backend lỗi vẫn tiếp tục xóa token local
        console.error('Logout error:', error);
        return false;
    }
}

/**
 * Gửi email chứa link đặt lại mật khẩu.
 * Backend luôn trả 200 dù email không tồn tại (bảo mật).
 */
export async function forgotPassword(email) {
    try {
        const res = await axios.post(`${API_URL}/forgot-password`, { email });
        return res.data;
    } catch (error) {
        const msg = error.response?.data?.message || error.message || 'Failed to send reset email.';
        throw new Error(msg);
    }
}

/**
 * Đặt lại mật khẩu mới bằng token từ email.
 * @param {string} token        - Reset token từ link email
 * @param {string} newPassword  - Mật khẩu mới
 */
export async function resetPassword(token, newPassword) {
    try {
        const res = await axios.post(`${API_URL}/reset-password`, { token, newPassword });
        return res.data;
    } catch (error) {
        const msg = error.response?.data?.message || error.message || 'Failed to reset password.';
        throw new Error(msg);
    }
}

/**
 * Thiết lập axios interceptor:
 *  - Tự động đính kèm JWT token vào mọi request.
 *  - Tự động refresh token khi gặp lỗi 401.
 */
export function setupAxiosInterceptors() {
    axios.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    axios.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;

            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;
                const storedRefreshToken = localStorage.getItem('refreshToken');

                if (storedRefreshToken) {
                    try {
                        const newTokens = await refreshAccessToken(storedRefreshToken);
                        if (newTokens) {
                            localStorage.setItem('token', newTokens.accessToken);
                            localStorage.setItem('refreshToken', newTokens.refreshToken);
                            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
                            return axios(originalRequest);
                        }
                    } catch {
                        localStorage.removeItem('token');
                        localStorage.removeItem('refreshToken');
                        window.location.href = '/login';
                    }
                }
            }

            return Promise.reject(error);
        }
    );
}
