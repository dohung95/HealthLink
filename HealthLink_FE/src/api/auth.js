import axios from 'axios';

const API_URL = 'https://localhost:7267/api/auth';
const API_URL_register = 'https://localhost:7267/api/account';

export async function login(email, password) {
    try {
        const res = await axios.post(`${API_URL}/login`, { email, password });
        return res.data;
    } catch (error) {
        // Check if error response exists
        if (error.response?.data) {
            const errorData = error.response.data;

            // Try camelCase first (from middleware)
            if (errorData.message) {
                throw new Error(errorData.message);
            }

            // Try PascalCase (fallback)
            if (errorData.Message) {
                throw new Error(errorData.Message);
            }
        }

        // Network error or other errors
        if (error.message) {
            throw new Error(error.message);
        }

        // Final fallback
        throw new Error('Invalid email or password');
    }
}

export async function register(username, phonenumber, email, password, confirmPassword, DateOfBirth) {
    try {
        const res = await axios.post(`${API_URL_register}/register/patient`, {
            email,
            password,
            confirmPassword,
            FullName: username,
            phonenumber,
            DateOfBirth
        });
        return res.data;
    } catch (error) {
        if (error.response?.data) {
            const errorData = error.response.data;

            // Handle validation errors from GlobalExceptionMiddleware
            if (errorData.validationErrors) {
                const validationErrors = errorData.validationErrors;
                const errorMessages = Object.values(validationErrors).flat().join(', ');
                throw new Error(errorMessages || errorData.message || 'Validation failed');
            }

            if (errorData.ValidationErrors) {
                const validationErrors = errorData.ValidationErrors;
                const errorMessages = Object.values(validationErrors).flat().join(', ');
                throw new Error(errorMessages || errorData.message || errorData.Message || 'Validation failed');
            }

            // Handle ASP.NET Core validation errors
            if (errorData.errors) {
                const errorMessages = Object.values(errorData.errors).flat().join(', ');
                throw new Error(errorMessages || errorData.title || 'Validation failed');
            }

            // Try camelCase message (from GlobalExceptionMiddleware)
            if (errorData.message) {
                throw new Error(errorData.message);
            }

            // Try PascalCase (fallback)
            if (errorData.Message) {
                throw new Error(errorData.Message);
            }

            // Use title if available (ASP.NET Core validation)
            if (errorData.title) {
                throw new Error(errorData.title);
            }
        }

        // Network error or other errors
        if (error.message) {
            throw new Error(error.message);
        }

        // Final fallback
        throw new Error('Registration failed. Please try again.');
    }
}

export async function refreshAccessToken(refreshToken) {
    try {
        const res = await axios.post(`${API_URL}/refresh`, { refreshToken });
        return res.data;
    } catch (error) {
        console.error('Token refresh error:', error);
        return null;
    }
}

export async function logout(refreshToken) {
    try {
        await axios.post(
            `${API_URL}/logout`,
            { refreshToken },
            {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }
        );
        return true;
    } catch (error) {
        console.error('Logout error:', error);
        return false;
    }
}

// Attach Authorization header to all requests
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

    // Handle 401 responses for token refresh
    axios.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;

            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;
                const refreshToken = localStorage.getItem('refreshToken');

                if (refreshToken) {
                    try {
                        const newTokens = await refreshAccessToken(refreshToken);
                        if (newTokens) {
                            localStorage.setItem('token', newTokens.accessToken);
                            localStorage.setItem('refreshToken', newTokens.refreshToken);
                            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
                            return axios(originalRequest);
                        }
                    } catch (refreshError) {
                        // Refresh failed, redirect to login
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

// Hàm helper mới để gọi API "Đổi Token"
export const getFirebaseTokenAPI = async (csharpToken) => {
    const response = await axios.get(`${API_URL}/firebase-token`, { // (Giả sử bạn dùng 'axios')
        headers: { 'Authorization': `Bearer ${csharpToken}` }
    });
    return response.data; // Trả về { firebaseToken: "..." }
};
