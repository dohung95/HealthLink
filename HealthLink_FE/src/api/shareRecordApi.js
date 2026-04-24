import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7267/api';

export const shareApi = {
    // Share health record with doctor
    shareWithDoctor: async (data) => {
        const response = await axios.post(
            `${API_BASE_URL}/HealthRecordShare`,
            data,
        );
        return response.data;
    },
    // Get all shares for current patient
    getMyShares: async () => {
        const response = await axios.get(
            `${API_BASE_URL}/HealthRecordShare/my-shares`,
        );
        return response.data;
    },
    // Get records shared with current doctor
    getSharedWithMe: async () => {
        const response = await axios.get(
            `${API_BASE_URL}/HealthRecordShare/shared-with-me`,
        );
        return response.data;
    },
    // Revoke share
    revokeShare: async (shareId, reason = null) => {
        const response = await axios.delete(
            `${API_BASE_URL}/HealthRecordShare/${shareId}`,
            {
                data: { reason }
            }
        );
        return response.data;
    },
    // Check if doctor can access health record
    canAccessHealthRecord: async (healthRecordId) => {
        const response = await axios.get(
            `${API_BASE_URL}/HealthRecordShare/can-access/${healthRecordId}`,
        );
        return response.data;
    },
};