import axiosInstance from './axiosConfig';

/**
 * Admin Compliance API Service
 * For admin to manage and monitor doctor compliance
 */
export const adminComplianceService = {
  /**
   * Get all doctors' compliance for a month
   * @param {string} month - Format: YYYY-MM
   * @param {Object} params - { status, specialtyId, pageNumber, pageSize }
   */
  getAllCompliance: async (month, params = {}) => {
    const response = await axiosInstance.get('/api/admin/compliance', {
      params: {
        month,
        status: params.status || undefined,
        specialtyId: params.specialtyId || undefined,
        pageNumber: params.pageNumber || 1,
        pageSize: params.pageSize || 20,
      }
    });
    return response.data;
  },

  /**
   * Get compliance statistics for a month
   * @param {string} month - Format: YYYY-MM
   */
  getStatistics: async (month) => {
    const response = await axiosInstance.get('/api/admin/compliance/statistics', {
      params: { month }
    });
    return response.data;
  },

  /**
   * Exempt a doctor from compliance requirement
   * @param {string} doctorId
   * @param {Object} data - { complianceMonth: 'YYYY-MM', reason: 'string' }
   */
  exemptDoctor: async (doctorId, data) => {
    const response = await axiosInstance.post(`/api/admin/compliance/${doctorId}/exempt`, data);
    return response.data;
  },

  /**
   * Get all compliance configurations
   * @param {boolean} active - Filter by active status (optional)
   */
  getConfigs: async (active = undefined) => {
    const response = await axiosInstance.get('/api/admin/compliance/config', {
      params: active !== undefined ? { active } : {}
    });
    return response.data;
  },

  /**
   * Create a new compliance configuration
   * @param {Object} data - { specialtyId, minHoursPerMonth, warningThresholdPercent, description, active, effectiveFrom, effectiveTo }
   */
  createConfig: async (data) => {
    const response = await axiosInstance.post('/api/admin/compliance/config', data);
    return response.data;
  },

  /**
   * Update a compliance configuration
   * @param {number} configId
   * @param {Object} data
   */
  updateConfig: async (configId, data) => {
    const response = await axiosInstance.put(`/api/admin/compliance/config/${configId}`, data);
    return response.data;
  },

  /**
   * Delete a compliance configuration
   * @param {number} configId
   */
  deleteConfig: async (configId) => {
    const response = await axiosInstance.delete(`/api/admin/compliance/config/${configId}`);
    return response.data;
  },

  /**
   * Manually trigger compliance check (for testing)
   */
  triggerCheck: async () => {
    const response = await axiosInstance.post('/api/admin/compliance/trigger-check');
    return response.data;
  },
};

export default {
  admin: adminComplianceService,
};
