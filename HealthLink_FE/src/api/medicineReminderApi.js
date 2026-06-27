import axiosInstance from './axiosConfig';

export const MEDICINE_REMINDER_TIMINGS = ['MORNING', 'AFTERNOON', 'EVENING'];

export const medicineReminderApi = {
  getSettings: async () => {
    const response = await axiosInstance.get('/api/medicine-reminders/settings');
    return response.data;
  },

  updateSettings: async (settings) => {
    const response = await axiosInstance.put('/api/medicine-reminders/settings', settings);
    return response.data;
  },

  getTodayChecklist: async (timing) => {
    const response = await axiosInstance.get('/api/medicine-reminders/today', {
      params: { timing },
    });
    return response.data;
  },

  updateIntakeCheck: async ({ prescriptionItemId, timing, intakeDate, checked }) => {
    const response = await axiosInstance.patch('/api/medicine-reminders/intake-checks', {
      prescriptionItemId,
      timing,
      intakeDate,
      checked,
    });
    return response.data;
  },

  completeTiming: async (timing) => {
    const response = await axiosInstance.patch(`/api/medicine-reminders/today/${timing}/complete`);
    return response.data;
  },
};

export default medicineReminderApi;
