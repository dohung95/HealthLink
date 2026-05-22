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

export const shareApi = {
    // Patient share 1 health record cho doctor
    shareWithDoctor: async (recordId, patientId, data) => {
        const response = await axios.post(
            `${API_URL}/health-records/${recordId}/share`,
            data,
            {
                ...getAuthConfig(),
                params: { patientId },
            }
        );

        return response.data;
    },

    // Patient xem các share mình đã tạo
    getMyShares: async (patientId, page = 1, size = 5) => {
        const response = await axios.get(
            `${API_URL}/health-records/shares/my`,
            {
                ...getAuthConfig(),
                params: {
                    patientId,
                    page,
                    size,
                },
            }
        );

        return response.data;
    },

    // Patient thu hồi quyền chia sẻ
    revokeShare: async (shareId, patientId, revokeReason = 'Patient revoked access') => {
        const response = await axios.put(
            `${API_URL}/health-records/shares/${shareId}/revoke`,
            {
                revokeReason,
            },
            {
                ...getAuthConfig(),
                params: { patientId },
            }
        );

        return response.data;
    },

    // Doctor xem danh sách record được share cho mình
    getSharedWithMe: async (doctorId) => {
        const response = await axios.get(
            `${API_URL}/doctor/health-records/shared-with-me`,
            {
                ...getAuthConfig(),
                params: { doctorId },
            }
        );

        return response.data;
    },

    // Doctor xem chi tiết 1 share
    getShareDetail: async (shareId, doctorId) => {
        const response = await axios.get(
            `${API_URL}/doctor/health-records/shares/${shareId}`,
            {
                ...getAuthConfig(),
                params: { doctorId },
            }
        );

        return response.data;
    },
};