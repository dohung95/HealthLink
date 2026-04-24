import axios from 'axios';

const API_URL = 'https://localhost:7267/api';

export const healthRecordApi = {
    // --- MEDICAL HISTORY (PatientController) ---
    getPatientProfile: async () => {
        const response = await axios.get(`${API_URL}/Patient/profile`);
        return response.data;
    },
    updateMedicalHistory: async (historyText) => {
        const response = await axios.put(`${API_URL}/Patient/medical-history`,
            { medicalHistorySummary: historyText }
        );
        return response.data;
    },

    // --- DOCUMENTS (HealthRecordController) ---
    getMyRecords: async () => {
        const response = await axios.get(`${API_URL}/HealthRecord/my-records`);
        return response.data;
    },

    getRecordById: async (recordId) => {
        const response = await axios.get(`${API_URL}/HealthRecord/${recordId}`);
        return response.data;
    },

    createMedicalDocument: async (formData) => {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/HealthRecord`, formData,
        );
        return response.data;
    }
};