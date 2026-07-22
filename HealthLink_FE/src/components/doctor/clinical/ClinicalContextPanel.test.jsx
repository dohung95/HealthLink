import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ClinicalContextPanel from './ClinicalContextPanel';
import { aiClinicalContextApi } from '@api/aiClinicalContextApi';

vi.mock('@api/aiClinicalContextApi', () => ({
  aiClinicalContextApi: {
    get: vi.fn(),
    update: vi.fn(),
  },
}));

const field = (value, overrides = {}) => ({
  value,
  sourceType: 'PATIENT_PROFILE',
  sourceId: 'synthetic-profile',
  capturedAt: '2026-07-22T10:00:00',
  freshness: 'CURRENT',
  verificationState: 'VERIFIED',
  ...overrides,
});

const preview = (overrides = {}) => ({
  appointmentId: 1,
  contextVersion: 7,
  ready: false,
  blockers: [{ code: 'MISSING_SYMPTOMS', message: 'Symptoms are required before an AI suggestion can be prepared.' }],
  fields: {
    symptoms: field(null, { sourceType: 'APPOINTMENT', freshness: 'UNKNOWN', verificationState: 'UNKNOWN' }),
    patientReportedSymptoms: field('Synthetic patient-reported dizziness', { sourceType: 'APPOINTMENT' }),
    workingDiagnosis: field(null, { sourceType: 'DOCTOR_INPUT', freshness: 'UNKNOWN', verificationState: 'UNKNOWN' }),
    ageYears: field(41, { sourceType: 'DERIVED' }),
    sex: field('Female'),
    reasonForVisit: field('Synthetic student-demo follow-up', { sourceType: 'APPOINTMENT' }),
    allergies: field(null, { freshness: 'UNKNOWN', verificationState: 'UNKNOWN' }),
    chronicConditions: field('Type 2 diabetes'),
    currentMedications: field('Metformin'),
    medicalHistorySummary: field('Synthetic student-demo history'),
    heightCm: field(165),
    weightKg: field(68),
    bmi: field(24.98, { sourceType: 'DERIVED' }),
    bloodType: field('O+'),
    pregnancyStatus: field(null, { freshness: 'UNKNOWN', verificationState: 'UNKNOWN' }),
    renalHepaticContext: field(null, { freshness: 'UNKNOWN', verificationState: 'UNKNOWN' }),
    heartRate: field(72, { sourceType: 'APPOINTMENT_VITAL' }),
    systolicBloodPressure: field(118, { sourceType: 'APPOINTMENT_VITAL' }),
    diastolicBloodPressure: field(76, { sourceType: 'APPOINTMENT_VITAL' }),
    temperature: field(36.8, { sourceType: 'APPOINTMENT_VITAL' }),
    spo2: field(98, { sourceType: 'APPOINTMENT_VITAL' }),
    respiratoryRate: field(16, { sourceType: 'APPOINTMENT_VITAL' }),
    glucose: field(null, { freshness: 'UNKNOWN', verificationState: 'UNKNOWN' }),
    verifiedLabReportIds: field(['synthetic-report-1'], { sourceType: 'VERIFIED_LAB_REPORT' }),
  },
  ...overrides,
});

describe('ClinicalContextPanel', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('requires symptoms before saving the clinical-context draft', async () => {
    aiClinicalContextApi.get.mockResolvedValue(preview());

    render(<ClinicalContextPanel appointmentId={1} canManage />);

    expect(await screen.findByLabelText(/symptoms/i)).toBeRequired();
    expect(screen.getByRole('button', { name: /save clinical context/i })).toBeDisabled();
  });

  it('shows unknown provenance as unknown instead of inferring an absence', async () => {
    aiClinicalContextApi.get.mockResolvedValue(preview());

    render(<ClinicalContextPanel appointmentId={1} canManage />);

    expect(await screen.findByText('Allergies')).toBeInTheDocument();
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
    expect(screen.queryByText('None')).not.toBeInTheDocument();
  });

  it('displays patient-reported appointment symptoms separately from the doctor draft', async () => {
    aiClinicalContextApi.get.mockResolvedValue(preview());

    render(<ClinicalContextPanel appointmentId={1} canManage />);

    expect(await screen.findByText('Patient-reported symptoms')).toBeInTheDocument();
    expect(screen.getByText('Synthetic patient-reported dizziness')).toBeInTheDocument();
  });

  it('renders the server readiness blocker with its actionable message', async () => {
    aiClinicalContextApi.get.mockResolvedValue(preview());

    render(<ClinicalContextPanel appointmentId={1} canManage />);

    expect(await screen.findByText('MISSING_SYMPTOMS')).toBeInTheDocument();
    expect(screen.getByText(/symptoms are required before an ai suggestion/i)).toBeInTheDocument();
  });

  it('saves the doctor draft using the server version and displays the updated version', async () => {
    aiClinicalContextApi.get.mockResolvedValue(preview());
    aiClinicalContextApi.update.mockResolvedValue(preview({
      contextVersion: 8,
      ready: true,
      blockers: [],
      fields: { ...preview().fields, symptoms: field('Synthetic fatigue for three days', { sourceType: 'DOCTOR_INPUT' }) },
    }));

    render(<ClinicalContextPanel appointmentId={1} canManage />);
    const symptoms = await screen.findByLabelText(/symptoms/i);
    fireEvent.change(symptoms, { target: { value: 'Synthetic fatigue for three days' } });
    fireEvent.click(screen.getByRole('button', { name: /save clinical context/i }));

    await waitFor(() => expect(aiClinicalContextApi.update).toHaveBeenCalledWith(1, {
      symptoms: 'Synthetic fatigue for three days',
      workingDiagnosis: null,
      expectedContextVersion: 7,
    }));
    expect(await screen.findByText(/context version 8/i)).toBeInTheDocument();
  });
});
