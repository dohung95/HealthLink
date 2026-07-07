export const initialDoctorVitalsForm = {
  heartRate: '',
  bloodPressureSystolic: '',
  bloodPressureDiastolic: '',
  temperature: '',
  oxygenSaturation: '',
  respiratoryRate: '',
  notes: '',
};

export const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasFormValue = (value) => value !== '' && value !== null && value !== undefined;

const stringifyVitalValue = (value) => {
  if (value === null || value === undefined) return '';
  return String(value);
};

export function getDoctorVitalsInitialForm(latestVitalSign) {
  if (!latestVitalSign) {
    return { ...initialDoctorVitalsForm };
  }

  return {
    heartRate: stringifyVitalValue(latestVitalSign.heartRate),
    bloodPressureSystolic: stringifyVitalValue(latestVitalSign.bloodPressureSystolic),
    bloodPressureDiastolic: stringifyVitalValue(latestVitalSign.bloodPressureDiastolic),
    temperature: stringifyVitalValue(latestVitalSign.temperature),
    oxygenSaturation: stringifyVitalValue(latestVitalSign.oxygenSaturation),
    respiratoryRate: stringifyVitalValue(latestVitalSign.respiratoryRate),
    notes: latestVitalSign.notes || '',
  };
}

export function validateDoctorVitalsForm(form) {
  const errors = {};
  const heartRate = toNumberOrNull(form.heartRate);

  if (heartRate === null) {
    errors.heartRate = 'Heart rate is required.';
  } else if (heartRate < 30 || heartRate > 220) {
    errors.heartRate = 'Heart rate must be between 30 and 220 bpm.';
  }

  const hasSystolic = hasFormValue(form.bloodPressureSystolic);
  const hasDiastolic = hasFormValue(form.bloodPressureDiastolic);
  const systolic = toNumberOrNull(form.bloodPressureSystolic);
  const diastolic = toNumberOrNull(form.bloodPressureDiastolic);

  if (hasSystolic !== hasDiastolic) {
    errors.bloodPressure = 'Enter both systolic and diastolic blood pressure.';
  }

  if (systolic !== null && (systolic < 70 || systolic > 250)) {
    errors.bloodPressureSystolic = 'Systolic pressure must be between 70 and 250 mmHg.';
  }

  if (diastolic !== null && (diastolic < 40 || diastolic > 150)) {
    errors.bloodPressureDiastolic = 'Diastolic pressure must be between 40 and 150 mmHg.';
  }

  if (systolic !== null && diastolic !== null && diastolic >= systolic) {
    errors.bloodPressure = 'Diastolic pressure must be lower than systolic pressure.';
  }

  const temperature = toNumberOrNull(form.temperature);
  if (temperature !== null && (temperature < 30 || temperature > 45)) {
    errors.temperature = 'Temperature must be between 30 and 45 C.';
  }

  const oxygenSaturation = toNumberOrNull(form.oxygenSaturation);
  if (oxygenSaturation !== null && (oxygenSaturation < 50 || oxygenSaturation > 100)) {
    errors.oxygenSaturation = 'SpO2 must be between 50 and 100%.';
  }

  const respiratoryRate = toNumberOrNull(form.respiratoryRate);
  if (respiratoryRate !== null && (respiratoryRate < 5 || respiratoryRate > 60)) {
    errors.respiratoryRate = 'Respiratory rate must be between 5 and 60 breaths/min.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function buildDoctorVitalsPayload({ form, patientId, appointmentId }) {
  return {
    patientId,
    appointmentId,
    heartRate: toNumberOrNull(form.heartRate),
    bloodPressureSystolic: toNumberOrNull(form.bloodPressureSystolic),
    bloodPressureDiastolic: toNumberOrNull(form.bloodPressureDiastolic),
    temperature: toNumberOrNull(form.temperature),
    oxygenSaturation: toNumberOrNull(form.oxygenSaturation),
    respiratoryRate: toNumberOrNull(form.respiratoryRate),
    source: 'Manual',
    deviceName: null,
    notes: form.notes?.trim() || null,
  };
}
