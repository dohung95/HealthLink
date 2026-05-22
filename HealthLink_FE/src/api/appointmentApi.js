import axios from 'axios';

const API_URL = 'http://localhost:8096/api';

const getAuthConfig = () => {
    const token = localStorage.getItem('token');

    return {
        headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
        },
    };
};

export const appointmentService = {
    getAvailableSlots: async (doctorId, date, consultationType) => {
        const response = await axios.get(
            `${API_URL}/appointments/available-slots`,
            {
                ...getAuthConfig(),
                params: {
                    doctorId,
                    date,
                    consultationType,
                },
            }
        );

        return response.data;
    },

    holdSlot: async (data) => {
        const response = await axios.post(
            `${API_URL}/appointments/hold-slot`,
            data,
            getAuthConfig()
        );

        return response.data;
    },

    releaseHold: async (holdId) => {
        await axios.delete(
            `${API_URL}/appointments/hold-slot/${holdId}`,
            getAuthConfig()
        );
    },

    createAppointment: async (data) => {
        const response = await axios.post(
            `${API_URL}/appointments`,
            data,
            getAuthConfig()
        );

        return response.data;
    },

    getAppointmentById: async (id) => {
        const response = await axios.get(
            `${API_URL}/appointments/${id}`,
            getAuthConfig()
        );

        return response.data;
    },

    getPatientAppointments: async (patientId) => {
        const response = await axios.get(
            `${API_URL}/appointments/patient/${patientId}`,
            getAuthConfig()
        );

        return response.data;
    },

    getPatientAppointmentsPage: async (patientId, page = 1, size = 5) => {
        const response = await axios.get(
            `${API_URL}/appointments/patient/${patientId}/page`,
            {
                ...getAuthConfig(),
                params: { page, size },
            }
        );

        return response.data;
    },

    cancelAppointment: async (id, data) => {
        const response = await axios.put(
            `${API_URL}/appointments/${id}/cancel`,
            data,
            getAuthConfig()
        );

        return response.data;
    },

    rescheduleAppointment: async (id, data) => {
        const response = await axios.put(
            `${API_URL}/appointments/${id}/reschedule`,
            data,
            getAuthConfig()
        );

        return response.data;
    },
};
