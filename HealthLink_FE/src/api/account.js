import axios from 'axios';
import { normalizeDoctorProfile } from './normalizers';

const BASE = 'http://localhost:8096/api/account';

/** Helper tạo config với Authorization header */
const authConfig = (token) => ({
    headers: { Authorization: `Bearer ${token}` }
});

// =============================================================================
// PATIENT
// =============================================================================

/** GET /api/account/patient/profile */
export const getProfile = async (token) => {
    const res = await axios.get(`${BASE}/patient/profile`, authConfig(token));
    return res.data;
};

/** PUT /api/account/patient/profile */
export const updateProfile = async (token, data) => {
    const res = await axios.put(`${BASE}/patient/profile`, data, authConfig(token));
    return res.data;
};

/** POST /api/account/patient/avatar — Upload ảnh đại diện (multipart/form-data) */
export const uploadPatientAvatar = async (token, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${BASE}/patient/avatar`, formData, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
        },
    });
    return res.data; // { avatarUrl: "http://..." }
};

/** PUT /api/account/patient/auth/password/change — Đổi mật khẩu khi đã đăng nhập */
export const changePassword = async (token, passwordData) => {
    const res = await axios.put(`${BASE}/patient/auth/password/change`, passwordData, authConfig(token));
    return res.data;
};

/** POST /api/account/patient/auth/email/request-change — Bước 1: Yêu cầu đổi email (gửi OTP) */
export const requestEmailChange = async (token, emailData) => {
    const res = await axios.post(`${BASE}/patient/auth/email/request-change`, emailData, authConfig(token));
    return res.data;
};

/** POST /api/account/patient/auth/email/verify-change — Bước 2: Xác nhận OTP để hoàn tất đổi email */
export const verifyEmailChange = async (token, verifyData) => {
    const res = await axios.post(`${BASE}/patient/auth/email/verify-change`, verifyData, authConfig(token));
    return res.data;
};

// =============================================================================
// DOCTOR
// =============================================================================

/** GET /api/account/doctors/profile */
export const getDoctorProfile = async (token) => {
    const res = await axios.get(`${BASE}/doctors/profile`, authConfig(token));
    return normalizeDoctorProfile(res.data);
};

/** PUT /api/account/doctors/profile */
export const updateDoctorProfile = async (token, data) => {
    const payload = {
        phoneNumber: data.phoneNumber,
        avatarUrl: data.avatarUrl,
        bio: data.bio ?? data.description ?? '',
        paypalEmail: data.paypalEmail ?? '',
    };
    const res = await axios.put(`${BASE}/doctors/profile`, payload, authConfig(token));
    return normalizeDoctorProfile(res.data);
};

/** POST /api/account/doctors/avatar — Upload ảnh đại diện bác sĩ */
export const uploadDoctorAvatar = async (token, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${BASE}/doctors/avatar`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    });
    return res.data; // { avatarUrl: "http://..." }
};

/** POST /api/account/doctors/auth/email/request-change */
export const requestDoctorEmailChange = async (token, data) => {
    const res = await axios.post(`${BASE}/doctors/auth/email/request-change`, data, authConfig(token));
    return res.data;
};

/** POST /api/account/doctors/auth/email/verify-change */
export const verifyDoctorEmailChange = async (token, data) => {
    const res = await axios.post(`${BASE}/doctors/auth/email/verify-change`, data, authConfig(token));
    return normalizeDoctorProfile(res.data);
};

/** POST /api/account/doctors/auth/password/request-change */
export const requestDoctorPasswordChange = async (token) => {
    const res = await axios.post(`${BASE}/doctors/auth/password/request-change`, {}, authConfig(token));
    return res.data;
};

/** PUT /api/account/doctors/auth/password/change */
export const verifyDoctorPasswordChange = async (token, data) => {
    const res = await axios.put(`${BASE}/doctors/auth/password/change`, {
        verificationCode: data.verificationCode,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
    }, authConfig(token));
    return res.data;
};

// =============================================================================
// PHARMACY
// =============================================================================

/** GET /api/account/pharmacy/profile */
export const getPharmacyProfile = async (token) => {
    const res = await axios.get(`${BASE}/pharmacy/profile`, authConfig(token));
    return res.data;
};

/** PUT /api/account/pharmacy/profile */
export const updatePharmacyProfile = async (token, data) => {
    const res = await axios.put(`${BASE}/pharmacy/profile`, data, authConfig(token));
    return res.data;
};

/** PUT /api/account/pharmacy/auth/password/change */
export const changePharmacyPassword = async (token, passwordData) => {
    const res = await axios.put(`${BASE}/pharmacy/auth/password/change`, passwordData, authConfig(token));
    return res.data;
};

/** POST /api/account/pharmacy/avatar — Upload ảnh đại diện nhà thuốc */
export const uploadPharmacyAvatar = async (token, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${BASE}/pharmacy/avatar`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    });
    return res.data; // { avatarUrl: "http://..." }
};

/** POST /api/account/pharmacy/auth/email/request-change */
export const requestPharmacyEmailChange = async (token, data) => {
    const res = await axios.post(`${BASE}/pharmacy/auth/email/request-change`, data, authConfig(token));
    return res.data;
};

/** POST /api/account/pharmacy/auth/email/verify-change */
export const verifyPharmacyEmailChange = async (token, data) => {
    const payload = {
        ...data,
        verificationCode: data.verificationCode || data.otp,
    };
    const res = await axios.post(`${BASE}/pharmacy/auth/email/verify-change`, payload, authConfig(token));
    return res.data;
};

/** POST /api/account/pharmacy/auth/paypal/request-otp — Bước 1: Yêu cầu OTP đổi PayPal email */
export const requestPharmacyPaypalOtp = async (token, data) => {
    const res = await axios.post(`${BASE}/pharmacy/auth/paypal/request-otp`, data, authConfig(token));
    return res.data;
};

/** POST /api/account/pharmacy/auth/paypal/verify-otp — Bước 2: Xác nhận OTP + cập nhật PayPal email */
export const verifyPharmacyPaypalOtp = async (token, data) => {
    const payload = {
        newPaypalEmail: data.newPaypalEmail,
        otp: data.otp,
    };
    const res = await axios.post(`${BASE}/pharmacy/auth/paypal/verify-otp`, payload, authConfig(token));
    return res.data;
};

/** POST /api/account/pharmacy/auth/password/request-otp — Bước 1: Yêu cầu OTP đổi mật khẩu */
export const requestPharmacyPasswordChangeOtp = async (token) => {
    const res = await axios.post(`${BASE}/pharmacy/auth/password/request-otp`, {}, authConfig(token));
    return res.data;
};

/** PUT /api/account/pharmacy/auth/password/change — Bước 2: Xác nhận OTP + đổi mật khẩu */
export const verifyPharmacyPasswordChangeOtp = async (token, data) => {
    const payload = {
        otp: data.otp,
        newPassword: data.newPassword,
    };
    const res = await axios.put(`${BASE}/pharmacy/auth/password/change`, payload, authConfig(token));
    return res.data;
};
