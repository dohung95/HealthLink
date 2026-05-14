import axios from 'axios';

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

/** PUT /api/account/patient/auth/email/request-change */
export const changePassword = async (token, passwordData) => {
    const res = await axios.put(`${BASE}/patient/auth/email/request-change`, passwordData, authConfig(token));
    return res.data;
};

/** POST /api/account/patient/auth/email/verify-change */
export const changeEmail = async (token, emailData) => {
    const res = await axios.post(`${BASE}/patient/auth/email/verify-change`, emailData, authConfig(token));
    return res.data;
};

// =============================================================================
// DOCTOR
// =============================================================================

/** GET /api/account/doctors/profile */
export const getDoctorProfile = async (token) => {
    const res = await axios.get(`${BASE}/doctors/profile`, authConfig(token));
    return res.data;
};

/** PUT /api/account/doctors/profile */
export const updateDoctorProfile = async (token, data) => {
    const res = await axios.put(`${BASE}/doctors/profile`, data, authConfig(token));
    return res.data;
};

/** POST /api/account/doctors/auth/email/request-change */
export const requestDoctorEmailChange = async (token, data) => {
    const res = await axios.post(`${BASE}/doctors/auth/email/request-change`, data, authConfig(token));
    return res.data;
};

/** POST /api/account/doctors/auth/email/verify-change */
export const verifyDoctorEmailChange = async (token, data) => {
    const res = await axios.post(`${BASE}/doctors/auth/email/verify-change`, data, authConfig(token));
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

/** POST /api/account/pharmacy/auth/email/request-change */
export const requestPharmacyEmailChange = async (token, data) => {
    const res = await axios.post(`${BASE}/pharmacy/auth/email/request-change`, data, authConfig(token));
    return res.data;
};

/** POST /api/account/pharmacy/auth/email/verify-change */
export const verifyPharmacyEmailChange = async (token, data) => {
    const res = await axios.post(`${BASE}/pharmacy/auth/email/verify-change`, data, authConfig(token));
    return res.data;
};