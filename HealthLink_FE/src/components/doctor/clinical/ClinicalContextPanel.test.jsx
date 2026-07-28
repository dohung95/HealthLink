import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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

  it.each([
  ['null', null],
  ['undefined', undefined],
  ['empty string', ''],
  ['empty array', []],
])('renders an empty %s field as a single em dash without Unknown badge or source', async (_, emptyValue) => {
  aiClinicalContextApi.get.mockResolvedValue(preview({
    fields: { ...preview().fields, allergies: field(emptyValue, { freshness: 'UNKNOWN' }) },
  }));

  render(<ClinicalContextPanel appointmentId={1} canManage />);
  const fieldEl = (await screen.findByText('Allergies')).closest('.clinical-context-field');

  expect(within(fieldEl).getByText('—')).toBeInTheDocument();
  expect(fieldEl).toHaveClass('clinical-context-field--empty');
  expect(within(fieldEl).queryByText(/unknown/i)).not.toBeInTheDocument();
  expect(fieldEl.querySelector('.clinical-context-field__source')).toBeNull();
  expect(fieldEl.querySelector('.clinical-context-field__state')).toBeNull();
});

it('keeps a known value visible even when freshness is UNKNOWN', async () => {
  aiClinicalContextApi.get.mockResolvedValue(preview({
    fields: {
      ...preview().fields,
      chronicConditions: field('Type 2 diabetes', { freshness: 'UNKNOWN' }),
    },
  }));

  render(<ClinicalContextPanel appointmentId={1} canManage />);
  const fieldEl = (await screen.findByText('Chronic conditions')).closest('.clinical-context-field');

  expect(within(fieldEl).getByText('Type 2 diabetes')).toBeInTheDocument();
  expect(within(fieldEl).getByText('Unknown')).toBeInTheDocument();
  expect(fieldEl.querySelector('.clinical-context-field__source')).toBeInTheDocument();
  expect(fieldEl.querySelector('.clinical-context-field__state')).toBeInTheDocument();
});

  it('displays patient-reported appointment symptoms separately from the doctor draft', async () => {
    aiClinicalContextApi.get.mockResolvedValue(preview());

    render(<ClinicalContextPanel appointmentId={1} canManage />);

    expect(await screen.findByText('Patient-reported symptoms')).toBeInTheDocument();
    expect(screen.getByText('Synthetic patient-reported dizziness')).toBeInTheDocument();
  });

  it('keeps sourced clinical groups read-only and provides navigation to their source', async () => {
    aiClinicalContextApi.get.mockResolvedValue(preview());
    const onNavigateTab = vi.fn();

    render(
      <ClinicalContextPanel
        appointmentId={1}
        canManage
        onNavigateTab={onNavigateTab}
      />,
    );

    expect(await screen.findByRole('heading', { name: /verified laboratory reports/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /appointment vitals/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /allergies and conditions/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /demographics and anthropometrics/i })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /open clinical results/i }));
    expect(onNavigateTab).toHaveBeenCalledWith('clinical-results');
    const symptomsGroup = screen.getByRole('heading', {
      name: /symptoms and clinical notes/i,
    }).closest('section');
    expect(within(symptomsGroup).getByRole('button', {
      name: /open consultation notes/i,
    })).toBeInTheDocument();

    const vitalsGroup = screen.getByRole('heading', {
      name: /appointment vitals/i,
    }).closest('section');
    fireEvent.click(within(vitalsGroup).getByRole('button', {
      name: /view patient summary/i,
    }));
    expect(onNavigateTab).toHaveBeenCalledWith('patient-summary');
    fireEvent.click(screen.getAllByRole('button', { name: /open medical history/i })[0]);
    expect(onNavigateTab).toHaveBeenCalledWith('history');
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

  it('notifies the workspace when a doctor-reviewed context is saved', async () => {
    aiClinicalContextApi.get.mockResolvedValue(preview());
    const updated = preview({
      contextVersion: 8,
      fields: {
        ...preview().fields,
        symptoms: field('Synthetic fatigue', { sourceType: 'DOCTOR_INPUT' }),
      },
    });
    aiClinicalContextApi.update.mockResolvedValue(updated);
    const onSaved = vi.fn();

    render(<ClinicalContextPanel appointmentId={1} canManage onSaved={onSaved} />);
    fireEvent.change(await screen.findByLabelText(/symptoms/i), {
      target: { value: 'Synthetic fatigue' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save clinical context/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated));
  });

  it('ignores a previous appointment context that resolves after the current appointment', async () => {
    let resolve41;
    let resolve42;
    aiClinicalContextApi.get.mockImplementation((id) => {
      if (id === 41) return new Promise((resolve) => { resolve41 = resolve; });
      return new Promise((resolve) => { resolve42 = resolve; });
    });

    const appt41Preview = preview({
      appointmentId: 41,
      fields: { ...preview().fields, symptoms: field('Appointment 41 symptom', { sourceType: 'APPOINTMENT' }) },
    });
    const appt42Preview = preview({
      appointmentId: 42,
      fields: { ...preview().fields, symptoms: field('Appointment 42 symptom', { sourceType: 'APPOINTMENT' }) },
    });

    const onPreviewChange = vi.fn();
    const { rerender } = render(
      <ClinicalContextPanel appointmentId={41} canManage onPreviewChange={onPreviewChange} />,
    );

    rerender(<ClinicalContextPanel appointmentId={42} canManage onPreviewChange={onPreviewChange} />);

    resolve42(appt42Preview);
    await waitFor(() => {
      expect(screen.getByLabelText(/symptoms/i)).toHaveValue('Appointment 42 symptom');
    });

    resolve41(appt41Preview);
    await waitFor(() => {
      expect(screen.getByLabelText(/symptoms/i)).toHaveValue('Appointment 42 symptom');
    });
  });

  it('does not apply an old appointment save response after navigation', async () => {
    let resolveUpdate41;
    let resolveGet42;
    aiClinicalContextApi.get.mockImplementation((id) => {
      if (id === 41) return Promise.resolve(preview({
        appointmentId: 41,
        contextVersion: 7,
        fields: { ...preview().fields, symptoms: field('Original 41', { sourceType: 'APPOINTMENT' }) },
      }));
      return new Promise((resolve) => { resolveGet42 = resolve; });
    });
    aiClinicalContextApi.update.mockImplementation((id) => {
      if (id === 41) return new Promise((resolve) => { resolveUpdate41 = resolve; });
      return Promise.resolve(preview({
        appointmentId: 42,
        contextVersion: 8,
        fields: { ...preview().fields, symptoms: field('Saved 42', { sourceType: 'DOCTOR_INPUT' }) },
      }));
    });

    const onSaved = vi.fn();
    const { rerender } = render(
      <ClinicalContextPanel appointmentId={41} canManage onSaved={onSaved} />,
    );

    const symptoms = await screen.findByLabelText(/symptoms/i);
    fireEvent.change(symptoms, { target: { value: 'Edit for 41' } });
    fireEvent.click(screen.getByRole('button', { name: /save clinical context/i }));

    rerender(<ClinicalContextPanel appointmentId={42} canManage onSaved={onSaved} />);

    resolveGet42(preview({
      appointmentId: 42,
      contextVersion: 8,
      fields: { ...preview().fields, symptoms: field('Appt 42 view', { sourceType: 'APPOINTMENT' }) },
    }));
    await waitFor(() => {
      expect(screen.getByLabelText(/symptoms/i)).toHaveValue('Appt 42 view');
    });

    resolveUpdate41(preview({
      appointmentId: 41,
      contextVersion: 8,
      fields: { ...preview().fields, symptoms: field('Edit for 41 done', { sourceType: 'DOCTOR_INPUT' }) },
    }));
    await waitFor(() => {
      expect(screen.getByLabelText(/symptoms/i)).toHaveValue('Appt 42 view');
    });
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('invalidates the previous appointment during render before effects run', async () => {
    let resolve41;
    aiClinicalContextApi.get.mockImplementation((id) => {
      if (id === 41) return new Promise((resolve) => { resolve41 = resolve; });
      return Promise.resolve(preview({
        appointmentId: 42,
        contextVersion: 8,
        ready: true,
        fields: { ...preview().fields, symptoms: field('Appointment 42 symptom', { sourceType: 'APPOINTMENT' }) },
      }));
    });

    const onPreviewChange = vi.fn();
    const { rerender } = render(
      <ClinicalContextPanel appointmentId={41} canManage onPreviewChange={onPreviewChange} />,
    );

    rerender(<ClinicalContextPanel appointmentId={42} canManage onPreviewChange={onPreviewChange} />);

    resolve41(preview({
      appointmentId: 41,
      contextVersion: 8,
      fields: { ...preview().fields, symptoms: field('Old 41 symptom', { sourceType: 'APPOINTMENT' }) },
    }));

    await waitFor(() => {
      expect(screen.getByLabelText(/symptoms/i)).toHaveValue('Appointment 42 symptom');
    });
    expect(onPreviewChange).not.toHaveBeenCalledWith(expect.objectContaining({
      appointmentId: 41,
    }));
  });
});
