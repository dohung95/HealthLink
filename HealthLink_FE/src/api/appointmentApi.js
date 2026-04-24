import axios from 'axios';

const API_URL = 'https://localhost:7267/api';

const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
};

export const appointmentService = {
    getAvailableSlots: async (doctorId, date) => {
        const config = getAuthConfig();
        // Thêm params vào config
        config.params = { doctorId, date };
        // Gọi axios với đúng 2 tham số
        const response = await axios.get(`${API_URL}/Appointment/available-slots`, config);
        return response.data;
    },

    createAppointment: async (data) => {
        const response = await axios.post(`${API_URL}/Appointment`, data, getAuthConfig());
        return response.data;
    },

    getMyAppointments: async () => {
        const response = await axios.get(`${API_URL}/Appointment`, getAuthConfig());
        return response.data;
    },

    cancelAppointment: async (id, reason) => {
        const response = await axios.put(`${API_URL}/Appointment/${id}/cancel`, { reason }, getAuthConfig());
        return response.data;
    },

    completeAppointment: async (id) => {
        const response = await axios.put(`${API_URL}/Appointment/${id}/complete`, {}, getAuthConfig());
        return response.data;
    },

    getMedicalHistory: async () => {
        const response = await axios.get(`${API_URL}/Appointment/medical-history`, getAuthConfig());
        return response.data;
    },

    getPatientMedicalHistory: async (patientId) => {
        const response = await axios.get(`${API_URL}/Appointment/patient/${patientId}/medical-history`, getAuthConfig());
        return response.data;
    },

    getAppointmentDetail: async (appointmentId) => {
        const response = await axios.get(`${API_URL}/Appointment/medical-history/${appointmentId}`, getAuthConfig());
        return response.data;
    }
};