import axiosInstance from './axiosConfig';

export const vitalSignApi = {
    createVitalSign: async (data) => {
        const response = await axiosInstance.post('/api/vital-signs', data);
        return response.data;
    },

    getAppointmentVitalSigns: async (appointmentId) => {
        const response = await axiosInstance.get(
            `/api/vital-signs/appointment/${appointmentId}`
        );
        return response.data;
    },

    getLatestAppointmentVitalSign: async (appointmentId) => {
        const response = await axiosInstance.get(
            `/api/vital-signs/appointment/${appointmentId}/latest`
        );
        return response.data;
    },

    getPatientVitalSigns: async (patientId) => {
        const response = await axiosInstance.get(
            `/api/vital-signs/patient/${patientId}`
        );
        return response.data;
    },
};