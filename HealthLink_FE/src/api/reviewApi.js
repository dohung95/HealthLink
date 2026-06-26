import axiosInstance from './axiosConfig';

/**
 * Patient Review API
 * Endpoints for patient to create and manage their reviews
 */
export const patientReviewApi = {
    /**
     * Check if patient can review an appointment
     * @param {number} appointmentId
     * @returns {Promise<{canReview: boolean}>}
     */
    canReview: async (appointmentId) => {
        const response = await axiosInstance.get(`/api/patient/reviews/can-review/${appointmentId}`);
        return response.data;
    },

    /**
     * Create a new review
     * @param {Object} data - { appointmentId, rating, comment, anonymous }
     * @returns {Promise<ReviewResponseDto>}
     */
    create: async (data) => {
        const response = await axiosInstance.post('/api/patient/reviews', data);
        return response.data;
    },

    /**
     * Get review by appointment ID
     * @param {number} appointmentId
     * @returns {Promise<ReviewResponseDto>}
     */
    getByAppointment: async (appointmentId) => {
        const response = await axiosInstance.get(`/api/patient/reviews/appointment/${appointmentId}`);
        return response.data;
    },

    /**
     * Get all reviews by current patient
     * @returns {Promise<ReviewResponseDto[]>}
     */
    getMyReviews: async () => {
        const response = await axiosInstance.get('/api/patient/reviews');
        return response.data;
    },
};

/**
 * Doctor Review API
 * Endpoints for doctor to view and reply to their reviews
 */
export const doctorReviewApi = {
    /**
     * Get all reviews for the doctor (paginated)
     * @param {number} page
     * @param {number} size
     * @returns {Promise<ReviewPageResponse>}
     */
    getAll: async (page = 0, size = 10) => {
        const response = await axiosInstance.get('/api/doctor/reviews', {
            params: { page, size }
        });
        return response.data;
    },

    /**
     * Get review statistics for the doctor
     * @returns {Promise<ReviewStatsDto>}
     */
    getStats: async () => {
        const response = await axiosInstance.get('/api/doctor/reviews/stats');
        return response.data;
    },

    /**
     * Reply to a review
     * @param {number} reviewId
     * @param {Object} data - { reply }
     * @returns {Promise<ReviewResponseDto>}
     */
    reply: async (reviewId, data) => {
        const response = await axiosInstance.post(`/api/doctor/reviews/${reviewId}/reply`, data);
        return response.data;
    },

    /**
     * Get public visible reviews for any doctor
     * @param {string} doctorId
     * @returns {Promise<ReviewResponseDto[]>}
     */
    getPublicReviews: async (doctorId) => {
        const response = await axiosInstance.get(`/api/doctor/reviews/public/${doctorId}`);
        return response.data;
    },

    /**
     * Get featured reviews for homepage
     * @param {number} limit
     * @returns {Promise<ReviewResponseDto[]>}
     */
    getFeatured: async (limit = 10) => {
        const response = await axiosInstance.get('/api/doctor/reviews/public/featured', {
            params: { limit }
        });
        return response.data;
    },
};

/**
 * Admin Review API
 * Endpoints for admin to manage all reviews
 */
export const adminReviewApi = {
    /**
     * Get all reviews with filters and pagination
     * @param {Object} params - { searchTerm, rating, visible, sortBy, page, size }
     * @returns {Promise<ReviewPageResponse>}
     */
    getAll: async (params = {}) => {
        const response = await axiosInstance.get('/api/admin/reviews', { params });
        return response.data;
    },

    /**
     * Get a single review by ID
     * @param {number} reviewId
     * @returns {Promise<ReviewResponseDto>}
     */
    getById: async (reviewId) => {
        const response = await axiosInstance.get(`/api/admin/reviews/${reviewId}`);
        return response.data;
    },

    /**
     * Toggle review visibility (hide/unhide)
     * @param {number} reviewId
     * @returns {Promise<ReviewResponseDto>}
     */
    toggleVisibility: async (reviewId) => {
        const response = await axiosInstance.put(`/api/admin/reviews/${reviewId}/toggle-visibility`);
        return response.data;
    },

    /**
     * Admin replies to a review
     * @param {number} reviewId
     * @param {Object} data - { reply }
     * @returns {Promise<ReviewResponseDto>}
     */
    adminReply: async (reviewId, data) => {
        const response = await axiosInstance.post(`/api/admin/reviews/${reviewId}/admin-reply`, data);
        return response.data;
    },
};
