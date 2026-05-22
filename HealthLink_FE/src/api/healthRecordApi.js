import axios from 'axios';

const API_URL = 'http://localhost:8096/api';

const getAuthConfig = () => {
    const token = localStorage.getItem('token');

    return {
        headers: {
            Authorization: token ? `Bearer ${token}` : '',
        },
    };
};

export const healthRecordApi = {
    // Lấy toàn bộ health record của patient
    getMyRecords: async (patientId, page = 1, size = 6) => {
        const response = await axios.get(
            `${API_URL}/health-records/my`,
            {
                ...getAuthConfig(),
                params: { patientId, page, size },
            }
        );

        return response.data;
    },

    // Lấy chi tiết 1 health record
    getRecordById: async (recordId, patientId) => {
        const response = await axios.get(
            `${API_URL}/health-records/${recordId}`,
            {
                ...getAuthConfig(),
                params: { patientId },
            }
        );

        return response.data;
    },

    // Tạo health record mới
    createRecord: async (patientId, data) => {
        const response = await axios.post(
            `${API_URL}/health-records`,
            data,
            {
                ...getAuthConfig(),
                params: { patientId },
            }
        );

        return response.data;
    },

    // Upload 1 document vào 1 health record
    uploadDocument: async (recordId, patientId, file, category, description) => {
        const formData = new FormData();
        formData.append('file', file);

        if (category) {
            formData.append('category', category);
        }

        if (description) {
            formData.append('description', description);
        }

        const response = await axios.post(
            `${API_URL}/health-records/${recordId}/documents`,
            formData,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'multipart/form-data',
                },
                params: { patientId },
            }
        );

        return response.data;
    },

    // Xóa 1 document khỏi health record
    deleteDocument: async (recordId, docId, patientId) => {
        await axios.delete(
            `${API_URL}/health-records/${recordId}/documents/${docId}`,
            {
                ...getAuthConfig(),
                params: { patientId },
            }
        );
    },

    // Tạo health record từ 1 file
    uploadDocumentAutoRecord: async (patientId, file, category, description, documentDate) => {
        const formData = new FormData();
        formData.append('file', file);

        if (category) {
            formData.append('category', category);
        }

        if (description) {
            formData.append('description', description);
        }

        if (documentDate) {
            formData.append('documentDate', documentDate);
        }

        const response = await axios.post(
            `${API_URL}/health-records/documents/auto`,
            formData,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'multipart/form-data',
                },
                params: { patientId },
            }
        );

        return response.data;
    },
};