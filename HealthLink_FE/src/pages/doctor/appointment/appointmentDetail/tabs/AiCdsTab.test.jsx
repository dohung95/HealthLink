import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AiCdsTab from './AiCdsTab';
import { aiClinicalContextApi } from '@api/aiClinicalContextApi';
import { aiCdsApi } from '@api/aiCdsApi';
import websocketService from '@services/websocketService';

vi.mock('@api/aiClinicalContextApi', () => ({
  aiClinicalContextApi: {
    get: vi.fn(),
    update: vi.fn(),
    createSnapshot: vi.fn(),
  },
}));

vi.mock('@api/aiCdsApi', () => ({
  aiCdsApi: {
    createSuggestion: vi.fn(),
    listSuggestions: vi.fn(),
  },
}));

vi.mock('@services/websocketService', () => ({
  default: {
    subscribeToCdsRuns: vi.fn(),
  },
}));

vi.mock('@components/doctor/clinical/CdsSuggestionReviewPanel', () => ({
  default: ({ generationStatus, refreshKey }) => (
    <div data-testid="suggestion-workspace">
      Suggestion status: {generationStatus?.status || 'IDLE'}; refresh {refreshKey}
    </div>
  ),
}));

const field = (value, overrides = {}) => ({
  value,
  sourceType: 'PATIENT_PROFILE',
  sourceId: 'synthetic-source',
  capturedAt: '2026-07-28T10:00:00',
  freshness: 'CURRENT',
  verificationState: 'VERIFIED',
  ...overrides,
});

const readyPreview = (overrides = {}) => ({
  appointmentId: 41,
  contextVersion: 7,
  ready: true,
  blockers: [],
  fields: {
    symptoms: field('Synthetic fatigue', { sourceType: 'DOCTOR_INPUT' }),
    workingDiagnosis: field('Student-demo anaemia', { sourceType: 'DOCTOR_INPUT' }),
    patientReportedSymptoms: field('Synthetic dizziness', { sourceType: 'APPOINTMENT' }),
    reasonForVisit: field('Student demo follow-up', { sourceType: 'APPOINTMENT' }),
    verifiedLabReportIds: field(
      ['6b53f3c2-798f-4268-82a4-210602ba1a23', 'a84e70d3-c331-4c25-b75c-2107c97cf032'],
      { sourceType: 'VERIFIED_LAB_REPORT' },
    ),
    heartRate: field(72, { sourceType: 'APPOINTMENT_VITAL' }),
    systolicBloodPressure: field(118, { sourceType: 'APPOINTMENT_VITAL' }),
    diastolicBloodPressure: field(76, { sourceType: 'APPOINTMENT_VITAL' }),
    temperature: field(36.8, { sourceType: 'APPOINTMENT_VITAL' }),
    spo2: field(98, { sourceType: 'APPOINTMENT_VITAL' }),
    respiratoryRate: field(16, { sourceType: 'APPOINTMENT_VITAL' }),
    glucose: field(101, { sourceType: 'APPOINTMENT_VITAL' }),
    allergies: field('No known allergies'),
    chronicConditions: field('Type 2 diabetes'),
    currentMedications: field('Metformin'),
    medicalHistorySummary: field('Synthetic history'),
    ageYears: field(41, { sourceType: 'DERIVED' }),
    sex: field('Female'),
    heightCm: field(165),
    weightKg: field(68),
    bmi: field(24.98, { sourceType: 'DERIVED' }),
    bloodType: field('O+'),
    pregnancyStatus: field('Not pregnant'),
    renalHepaticContext: field('No documented impairment'),
  },
  ...overrides,
});

describe('AiCdsTab orchestration', () => {
  let websocketCallback;
  let unsubscribe;

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    websocketCallback = undefined;
    unsubscribe = undefined;
  });

  function arrange(preview = readyPreview()) {
    aiClinicalContextApi.get.mockResolvedValue(preview);
    aiCdsApi.listSuggestions.mockResolvedValue([]);
    unsubscribe = vi.fn();
    websocketService.subscribeToCdsRuns.mockImplementation((callback) => {
      websocketCallback = callback;
      return unsubscribe;
    });
  }

  async function clickGenerate() {
    const button = await screen.findByRole('button', { name: /confirm context & generate/i });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    return button;
  }

  it('creates an immutable snapshot before requesting a suggestion with exact matching context', async () => {
    arrange();
    aiClinicalContextApi.createSnapshot.mockResolvedValue({ snapshotId: 'snapshot-synthetic-1' });
    aiCdsApi.createSuggestion.mockResolvedValue({
      runId: 'run-synthetic-1',
      status: 'NEEDS_DOCTOR_REVIEW',
    });

    render(<AiCdsTab appointmentId={41} canManage />);
    await clickGenerate();

    const verifiedLabReportIds = [
      '6b53f3c2-798f-4268-82a4-210602ba1a23',
      'a84e70d3-c331-4c25-b75c-2107c97cf032',
    ];
    await waitFor(() => expect(aiClinicalContextApi.createSnapshot).toHaveBeenCalledWith(41, {
      verifiedLabReportIds,
      expectedContextVersion: 7,
    }));
    expect(aiCdsApi.createSuggestion).toHaveBeenCalledWith(41, {
      snapshotId: 'snapshot-synthetic-1',
      expectedContextVersion: 7,
      verifiedLabReportIds,
    });
    expect(aiClinicalContextApi.createSnapshot.mock.invocationCallOrder[0])
      .toBeLessThan(aiCdsApi.createSuggestion.mock.invocationCallOrder[0]);
  });

  it('switches to Step 2 on generation and shows progress', async () => {
    arrange();
    aiClinicalContextApi.createSnapshot.mockResolvedValue({ snapshotId: 'snapshot-synthetic-1' });
    let resolveSuggestion;
    aiCdsApi.createSuggestion.mockImplementation(() => (
      new Promise((resolve) => { resolveSuggestion = resolve; })
    ));

    render(<AiCdsTab appointmentId={41} canManage />);
    await clickGenerate();

    expect(screen.getByRole('button', { name: /^2 ai suggestion/i })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('suggestion-workspace')).toHaveTextContent(/Suggestion status:/);

    websocketCallback({ runId: 'run-synthetic-1', status: 'GENERATING_LOCAL' });
    await waitFor(() => resolveSuggestion({ runId: 'run-synthetic-1', status: 'NEEDS_DOCTOR_REVIEW' }));
    await waitFor(() => expect(aiCdsApi.createSuggestion).toHaveBeenCalled());
  });

  it('does not carry suggestion or snapshot state into another appointment', async () => {
    arrange();
    let resolve41;
    let resolve42;
    aiCdsApi.listSuggestions.mockImplementation((id) => {
      if (id === 41) return new Promise((resolve) => { resolve41 = resolve; });
      return new Promise((resolve) => { resolve42 = resolve; });
    });
    aiClinicalContextApi.createSnapshot
      .mockResolvedValueOnce({ snapshotId: 'snapshot-41' })
      .mockResolvedValueOnce({ snapshotId: 'snapshot-42' });
    aiCdsApi.createSuggestion.mockResolvedValue({ runId: 'run-42', status: 'NEEDS_DOCTOR_REVIEW' });

    const { rerender } = render(<AiCdsTab appointmentId={41} canManage />);
    resolve41([{ runId: 'run-41', status: 'NEEDS_DOCTOR_REVIEW' }]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^2 ai suggestion/i }))
        .toHaveAttribute('aria-current', 'step');
    });

    fireEvent.click(screen.getByRole('button', { name: /^1 clinical context/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^1 clinical context/i }))
        .toHaveAttribute('aria-current', 'step');
    });

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => expect(aiClinicalContextApi.createSnapshot).toHaveBeenCalledWith(41, expect.anything()));

    rerender(<AiCdsTab appointmentId={42} canManage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^1 clinical context/i }))
        .toHaveAttribute('aria-current', 'step');
    });
    expect(screen.getByRole('button', { name: /^2 ai suggestion/i })).toBeDisabled();

    resolve42([]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^2 ai suggestion/i })).toBeDisabled();
    });

    await clickGenerate();
    await waitFor(() => expect(aiClinicalContextApi.createSnapshot).toHaveBeenCalledWith(42, expect.anything()));
    expect(aiCdsApi.createSuggestion).toHaveBeenCalledWith(42, expect.objectContaining({
      snapshotId: 'snapshot-42',
    }));
    expect(aiCdsApi.createSuggestion).not.toHaveBeenCalledWith(42, expect.objectContaining({
      snapshotId: 'snapshot-41',
    }));
  });

  it('ignores an older appointment summary that resolves after the current appointment', async () => {
    arrange();
    let resolve41;
    let resolve42;
    aiCdsApi.listSuggestions.mockImplementation((id) => {
      if (id === 41) return new Promise((resolve) => { resolve41 = resolve; });
      return new Promise((resolve) => { resolve42 = resolve; });
    });

    const { rerender } = render(<AiCdsTab appointmentId={41} canManage />);
    rerender(<AiCdsTab appointmentId={42} canManage />);

    resolve42([]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^2 ai suggestion/i })).toBeDisabled();
    });

    resolve41([{ runId: 'run-41', status: 'NEEDS_DOCTOR_REVIEW' }]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^1 clinical context/i }))
        .toHaveAttribute('aria-current', 'step');
    });
    expect(screen.getByRole('button', { name: /^2 ai suggestion/i })).toBeDisabled();
  });

  it('protects the generation flow from a double click', async () => {
    arrange();
    let resolveSnapshot;
    aiClinicalContextApi.createSnapshot.mockImplementation(() => (
      new Promise((resolve) => { resolveSnapshot = resolve; })
    ));
    aiCdsApi.createSuggestion.mockResolvedValue({
      runId: 'run-synthetic-1',
      status: 'NEEDS_DOCTOR_REVIEW',
    });

    render(<AiCdsTab appointmentId={41} canManage />);
    const confirm = await screen.findByRole('button', { name: /confirm context & generate/i });
    await waitFor(() => expect(confirm).toBeEnabled());
    fireEvent.click(confirm);
    await waitFor(() => expect(aiClinicalContextApi.createSnapshot).toHaveBeenCalledTimes(1));
    fireEvent.click(confirm);
    await waitFor(() => expect(aiClinicalContextApi.createSnapshot).toHaveBeenCalledTimes(1));
    resolveSnapshot({ snapshotId: 'snapshot-synthetic-1' });
    await waitFor(() => expect(aiCdsApi.createSuggestion).toHaveBeenCalledTimes(1));
  });

  it('reuses the current snapshot when generation fails and the context has not changed', async () => {
    arrange();
    aiClinicalContextApi.createSnapshot.mockResolvedValue({ snapshotId: 'snapshot-synthetic-1' });
    aiCdsApi.createSuggestion
      .mockRejectedValueOnce(new Error('Synthetic generation failure'))
      .mockResolvedValueOnce({ runId: 'run-synthetic-2', status: 'NEEDS_DOCTOR_REVIEW' });

    render(<AiCdsTab appointmentId={41} canManage />);
    await clickGenerate();

    expect(await screen.findByRole('alert')).toHaveTextContent(/suggestion could not be generated/i);

    fireEvent.click(screen.getByRole('button', { name: /back to clinical context/i }));
    fireEvent.click(screen.getByRole('button', { name: /retry generation/i }));
    await waitFor(() => expect(aiCdsApi.createSuggestion).toHaveBeenCalledTimes(2));
    expect(aiClinicalContextApi.createSnapshot).toHaveBeenCalledTimes(1);
  });

  it('shows status-only updates while the create request is still running and cleans up', async () => {
    arrange();
    aiClinicalContextApi.createSnapshot.mockResolvedValue({ snapshotId: 'snapshot-synthetic-1' });
    let resolveSuggestion;
    aiCdsApi.createSuggestion.mockImplementation(() => (
      new Promise((resolve) => { resolveSuggestion = resolve; })
    ));

    const { unmount } = render(<AiCdsTab appointmentId={41} canManage />);
    await clickGenerate();
    await waitFor(() => expect(aiCdsApi.createSuggestion).toHaveBeenCalled());

    websocketCallback({ runId: 'run-synthetic-1', status: 'GENERATING_LOCAL' });
    websocketCallback({ runId: 'run-synthetic-1', status: 'NEEDS_DOCTOR_REVIEW' });

    resolveSuggestion({ runId: 'run-synthetic-1', status: 'QUEUED' });
    await waitFor(() => {
      expect(screen.getByTestId('suggestion-workspace')).toHaveTextContent(/needs_doctor_review/i);
    });

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('ignores an unrelated WebSocket event while createSuggestion is pending', async () => {
    arrange();
    aiClinicalContextApi.createSnapshot.mockResolvedValue({ snapshotId: 'snapshot-synthetic-1' });
    let resolveSuggestion;
    aiCdsApi.createSuggestion.mockImplementation(() => (
      new Promise((resolve) => { resolveSuggestion = resolve; })
    ));

    render(<AiCdsTab appointmentId={41} canManage />);
    await clickGenerate();
    await waitFor(() => expect(aiCdsApi.createSuggestion).toHaveBeenCalled());
    expect(screen.getByTestId('suggestion-workspace')).toHaveTextContent(/QUEUED/);

    websocketCallback({ runId: 'other-run', status: 'GENERATING_LOCAL' });
    await expect(screen.findByTestId('suggestion-workspace')).resolves.toHaveTextContent(/QUEUED/);

    resolveSuggestion({ runId: 'expected-run', status: 'NEEDS_DOCTOR_REVIEW' });
    await waitFor(() => {
      expect(screen.getByTestId('suggestion-workspace')).toHaveTextContent(/needs_doctor_review/i);
    });
  });

  it('reconciles a buffered event when the create response returns the matching run id', async () => {
    arrange();
    aiClinicalContextApi.createSnapshot.mockResolvedValue({ snapshotId: 'snapshot-synthetic-1' });
    let resolveSuggestion;
    aiCdsApi.createSuggestion.mockImplementation(() => (
      new Promise((resolve) => { resolveSuggestion = resolve; })
    ));

    render(<AiCdsTab appointmentId={41} canManage />);
    await clickGenerate();
    await waitFor(() => expect(aiCdsApi.createSuggestion).toHaveBeenCalled());

    websocketCallback({ runId: 'expected-run', status: 'GENERATING_LOCAL' });
    websocketCallback({ runId: 'expected-run', status: 'NEEDS_DOCTOR_REVIEW' });

    resolveSuggestion({ runId: 'expected-run', status: 'QUEUED' });
    await waitFor(() => {
      expect(screen.getByTestId('suggestion-workspace')).toHaveTextContent(/needs_doctor_review/i);
    });
  });

  it('saves context without generating and warns when an existing suggestion becomes outdated', async () => {
    const current = readyPreview();
    const updated = readyPreview({
      contextVersion: 8,
      fields: {
        ...current.fields,
        symptoms: field('Synthetic fatigue after exercise', { sourceType: 'DOCTOR_INPUT' }),
      },
    });
    arrange(current);
    aiCdsApi.listSuggestions.mockResolvedValue([{ runId: 'run-existing', status: 'NEEDS_DOCTOR_REVIEW' }]);
    aiClinicalContextApi.update.mockResolvedValue(updated);

    render(<AiCdsTab appointmentId={41} canManage />);
    fireEvent.click(await screen.findByRole('button', { name: /^1 clinical context/i }));
    fireEvent.change(await screen.findByLabelText(/symptoms/i), {
      target: { value: 'Synthetic fatigue after exercise' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save clinical context/i }));

    expect(await screen.findByText(/existing ai suggestion is now outdated/i)).toBeInTheDocument();
    expect(aiClinicalContextApi.createSnapshot).not.toHaveBeenCalled();
    expect(aiCdsApi.createSuggestion).not.toHaveBeenCalled();
  });

  it('blocks generation when readiness checks fail or the appointment is read-only', async () => {
    arrange(readyPreview({
      ready: false,
      blockers: [{ code: 'MISSING_SYMPTOMS', message: 'Symptoms are required.' }],
    }));

    const { rerender } = render(<AiCdsTab appointmentId={41} canManage />);
    expect(await screen.findByRole('button', { name: /confirm context & generate/i })).toBeDisabled();
    expect(screen.getByText('MISSING_SYMPTOMS')).toBeInTheDocument();

    rerender(<AiCdsTab appointmentId={41} canManage={false} />);
    expect(screen.getByLabelText(/symptoms/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /confirm context & generate/i })).toBeDisabled();
  });

  it('does not let an obsolete generation unlock the current appointment generation', async () => {
    arrange();
    let resolveSnapshot41;
    aiClinicalContextApi.createSnapshot.mockImplementation((id) => {
      if (id === 41) return new Promise((resolve) => { resolveSnapshot41 = resolve; });
      return new Promise(() => {});
    });
    aiCdsApi.createSuggestion.mockResolvedValue({
      runId: 'run-42', status: 'NEEDS_DOCTOR_REVIEW',
    });

    const { rerender } = render(<AiCdsTab appointmentId={41} canManage />);
    await clickGenerate();
    await waitFor(() => expect(aiClinicalContextApi.createSnapshot).toHaveBeenCalledWith(41, expect.anything()));

    rerender(<AiCdsTab appointmentId={42} canManage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /confirm context/i })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /confirm context/i }));
    await waitFor(() => expect(aiClinicalContextApi.createSnapshot).toHaveBeenCalledWith(42, expect.anything()));

    resolveSnapshot41(Promise.reject(new Error('Old failure')));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /preparing suggestion/i, hidden: true })).toBeDisabled();
    });

    expect(aiClinicalContextApi.createSnapshot).toHaveBeenCalledTimes(2);
    expect(aiCdsApi.createSuggestion).toHaveBeenCalledTimes(0);
  });

  it('ignores a previous appointment summary failure before the current summary succeeds', async () => {
    arrange();
    let reject41;
    let resolve42;
    aiCdsApi.listSuggestions.mockImplementation((id) => {
      if (id === 41) return new Promise((_, reject) => { reject41 = reject; });
      return new Promise((resolve) => { resolve42 = resolve; });
    });

    const { rerender } = render(<AiCdsTab appointmentId={41} canManage />);
    rerender(<AiCdsTab appointmentId={42} canManage />);

    reject41(new Error('Old summary error'));
    await waitFor(() => expect(aiCdsApi.listSuggestions).toHaveBeenCalledWith(42));

    resolve42([{ runId: 'run-42', status: 'NEEDS_DOCTOR_REVIEW' }]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^2 ai suggestion/i }))
        .toHaveAttribute('aria-current', 'step');
    });
  });

  it('ignores the first A summary after navigating A to B to A', async () => {
    arrange();
    let resolve41First;
    let resolve42;
    let resolve41Second;
    let callCount = 0;
    aiCdsApi.listSuggestions.mockImplementation((id) => {
      callCount++;
      if (id === 41 && callCount === 1) return new Promise((resolve) => { resolve41First = resolve; });
      if (id === 42) return new Promise((resolve) => { resolve42 = resolve; });
      return new Promise((resolve) => { resolve41Second = resolve; });
    });

    const { rerender } = render(<AiCdsTab appointmentId={41} canManage />);

    rerender(<AiCdsTab appointmentId={42} canManage />);
    await waitFor(() => expect(aiCdsApi.listSuggestions).toHaveBeenCalledWith(42));

    rerender(<AiCdsTab appointmentId={41} canManage />);
    await waitFor(() => {
      expect(aiCdsApi.listSuggestions.mock.calls.filter(([id]) => id === 41)).toHaveLength(2);
    });

    resolve41Second([{ runId: 'run-a-new', status: 'NEEDS_DOCTOR_REVIEW' }]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^2 ai suggestion/i }))
        .toHaveAttribute('aria-current', 'step');
    });
    expect(screen.getByRole('button', { name: /^2 ai suggestion/i })).not.toBeDisabled();

    resolve42([]);
    resolve41First([]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^2 ai suggestion/i }))
        .toHaveAttribute('aria-current', 'step');
    });
    expect(screen.getByRole('button', { name: /^2 ai suggestion/i })).not.toBeDisabled();
  });

  it('does not let an old A generation mutate a new A visit', async () => {
    arrange();
    let resolveSnapshot41First;
    let resolveSnapshot41Second;
    let snapshotCallCount = 0;
    aiClinicalContextApi.createSnapshot.mockImplementation((id) => {
      snapshotCallCount++;
      if (id === 41 && snapshotCallCount === 1) return new Promise((resolve) => { resolveSnapshot41First = resolve; });
      if (id === 41 && snapshotCallCount === 2) return new Promise((resolve) => { resolveSnapshot41Second = resolve; });
      return new Promise(() => {});
    });
    aiCdsApi.createSuggestion.mockResolvedValue({
      runId: 'run-41-new', status: 'NEEDS_DOCTOR_REVIEW',
    });

    const { rerender } = render(<AiCdsTab appointmentId={41} canManage />);
    await clickGenerate();
    await waitFor(() => expect(aiClinicalContextApi.createSnapshot).toHaveBeenCalledWith(41, expect.anything()));

    rerender(<AiCdsTab appointmentId={42} canManage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /confirm context/i })).toBeEnabled());

    rerender(<AiCdsTab appointmentId={41} canManage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /confirm context/i })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: /confirm context/i }));
    await waitFor(() => expect(aiClinicalContextApi.createSnapshot).toHaveBeenCalledWith(41, expect.anything()));

    expect(aiClinicalContextApi.createSnapshot).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: /preparing suggestion/i, hidden: true }));
    await waitFor(() => expect(aiClinicalContextApi.createSnapshot).toHaveBeenCalledTimes(2));

    resolveSnapshot41First(Promise.reject(new Error('Old failure')));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /preparing suggestion/i, hidden: true })).toBeDisabled();
    });

    expect(aiClinicalContextApi.createSnapshot).toHaveBeenCalledTimes(2);
    resolveSnapshot41Second({ snapshotId: 'snapshot-41-new' });
    await waitFor(() => {
      expect(aiCdsApi.createSuggestion).toHaveBeenCalledWith(41, expect.objectContaining({
        snapshotId: 'snapshot-41-new',
      }));
    });
  });

  it('deduplicates the same terminal WebSocket status transition', async () => {
    arrange();
    aiCdsApi.listSuggestions.mockResolvedValue([
      { runId: 'run-synthetic-1', status: 'NEEDS_DOCTOR_REVIEW' },
    ]);

    render(<AiCdsTab appointmentId={41} canManage />);
    await screen.findByRole('button', { name: /^2 ai suggestion/i });
    const before = aiCdsApi.listSuggestions.mock.calls.length;

    websocketCallback({ runId: 'run-synthetic-1', status: 'NEEDS_DOCTOR_REVIEW' });
    await waitFor(() => {
      expect(aiCdsApi.listSuggestions.mock.calls.length - before).toBe(1);
    });

    const afterFirstTerminal = aiCdsApi.listSuggestions.mock.calls.length;
    websocketCallback({ runId: 'run-synthetic-1', status: 'NEEDS_DOCTOR_REVIEW' });
    await waitFor(() => {
      expect(aiCdsApi.listSuggestions.mock.calls.length - afterFirstTerminal).toBe(0);
    });
  });

  it('deduplicates buffered terminal event followed by the same WebSocket frame', async () => {
    arrange();
    aiClinicalContextApi.createSnapshot.mockResolvedValue({ snapshotId: 'snapshot-synthetic-1' });
    let resolveSuggestion;
    aiCdsApi.createSuggestion.mockImplementation(() => (
      new Promise((resolve) => { resolveSuggestion = resolve; })
    ));

    render(<AiCdsTab appointmentId={41} canManage />);
    await clickGenerate();
    await waitFor(() => expect(aiCdsApi.createSuggestion).toHaveBeenCalled());

    websocketCallback({ runId: 'expected-run', status: 'NEEDS_DOCTOR_REVIEW' });

    const beforeBufferedReconciliation = aiCdsApi.listSuggestions.mock.calls.length;
    resolveSuggestion({ runId: 'expected-run', status: 'QUEUED' });
    await waitFor(() => {
      expect(screen.getByTestId('suggestion-workspace')).toHaveTextContent(/needs_doctor_review/i);
    });
    await waitFor(() => {
      expect(aiCdsApi.listSuggestions.mock.calls.length - beforeBufferedReconciliation).toBe(1);
    });

    const afterBuffered = aiCdsApi.listSuggestions.mock.calls.length;
    websocketCallback({ runId: 'expected-run', status: 'NEEDS_DOCTOR_REVIEW' });
    await waitFor(() => {
      expect(aiCdsApi.listSuggestions.mock.calls.length - afterBuffered).toBe(0);
    });
  });

  describe('stepper workflow', () => {
    it('opens Clinical context when the appointment has no suggestion', async () => {
      arrange();
      aiCdsApi.listSuggestions.mockResolvedValue([]);

      render(<AiCdsTab appointmentId={41} canManage />);

      const stepper = await screen.findByRole('navigation', { name: /ai cds workflow/i });
      expect(stepper).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^1 clinical context/i })).toHaveAttribute('aria-current', 'step');

      const contextSection = document.getElementById('ai-cds-context-step');
      const suggestionSection = document.getElementById('ai-cds-suggestion-step');
      expect(contextSection).not.toBeNull();
      expect(suggestionSection).not.toBeNull();
      expect(contextSection).not.toHaveAttribute('hidden');
      expect(suggestionSection).toHaveAttribute('hidden');
    });

    it('opens AI suggestion when the appointment already has a suggestion', async () => {
      arrange();
      aiCdsApi.listSuggestions.mockResolvedValue([{ runId: 'run-existing', status: 'NEEDS_DOCTOR_REVIEW' }]);

      render(<AiCdsTab appointmentId={41} canManage />);

      expect(await screen.findByRole('button', { name: /^2 ai suggestion/i }))
        .toHaveAttribute('aria-current', 'step');

      const contextSection = document.getElementById('ai-cds-context-step');
      const suggestionSection = document.getElementById('ai-cds-suggestion-step');
      expect(contextSection).toHaveAttribute('hidden');
      expect(suggestionSection).not.toHaveAttribute('hidden');
    });

    it('falls back to Clinical context when suggestion summary loading fails', async () => {
      arrange();
      aiCdsApi.listSuggestions.mockRejectedValue(new Error('Network error'));

      render(<AiCdsTab appointmentId={41} canManage />);

      expect(await screen.findByRole('button', { name: /^1 clinical context/i }))
        .toHaveAttribute('aria-current', 'step');

      const contextSection = document.getElementById('ai-cds-context-step');
      expect(contextSection).not.toHaveAttribute('hidden');
    });

    it('allows moving between steps without unmounting either panel', async () => {
      arrange();
      aiCdsApi.listSuggestions.mockResolvedValue([
        { runId: 'run-synthetic-1', status: 'NEEDS_DOCTOR_REVIEW' },
      ]);

      render(<AiCdsTab appointmentId={41} canManage />);

      const step1 = await screen.findByRole('button', { name: /^1 clinical context/i });
      const step2 = screen.getByRole('button', { name: /^2 ai suggestion/i });
      expect(step2).toHaveAttribute('aria-current', 'step');
      expect(step1).not.toHaveAttribute('aria-current', 'step');
      expect(step2).toBeEnabled();

      fireEvent.click(step1);
      expect(document.getElementById('ai-cds-context-step')).not.toHaveAttribute('hidden');
      expect(document.getElementById('ai-cds-suggestion-step')).toHaveAttribute('hidden');
      expect(step1).toHaveAttribute('aria-current', 'step');
      expect(step2).not.toHaveAttribute('aria-current', 'step');

      const symptomsInput = screen.getByLabelText('Symptoms');
      fireEvent.change(symptomsInput, { target: { value: 'Edited symptom.' } });

      fireEvent.click(step2);
      expect(document.getElementById('ai-cds-context-step')).toHaveAttribute('hidden');
      expect(document.getElementById('ai-cds-suggestion-step')).not.toHaveAttribute('hidden');
      expect(screen.getByTestId('suggestion-workspace')).toBeInTheDocument();

      fireEvent.click(step1);
      expect(document.getElementById('ai-cds-context-step')).not.toHaveAttribute('hidden');
      expect(screen.getByLabelText('Symptoms')).toHaveValue('Edited symptom.');
    });

    it('activates a step via click and tracks aria-current', async () => {
      arrange();
      aiCdsApi.listSuggestions.mockResolvedValue([
        { runId: 'run-synthetic-1', status: 'NEEDS_DOCTOR_REVIEW' },
      ]);

      render(<AiCdsTab appointmentId={41} canManage />);

      const step1 = await screen.findByRole('button', { name: /^1 clinical context/i });
      const step2 = await screen.findByRole('button', { name: /^2 ai suggestion/i });

      expect(step1.tagName).toBe('BUTTON');
      expect(step2.tagName).toBe('BUTTON');
      expect(step2).not.toBeDisabled();

      await waitFor(() => {
        expect(step2).toHaveAttribute('aria-current', 'step');
      });

      fireEvent.click(step1);
      await waitFor(() => {
        expect(step1).toHaveAttribute('aria-current', 'step');
        expect(step2).not.toHaveAttribute('aria-current', 'step');
      });
      expect(document.getElementById('ai-cds-context-step')).not.toHaveAttribute('hidden');
      expect(document.getElementById('ai-cds-suggestion-step')).toHaveAttribute('hidden');

      fireEvent.click(step2);
      await waitFor(() => {
        expect(step2).toHaveAttribute('aria-current', 'step');
        expect(step1).not.toHaveAttribute('aria-current', 'step');
      });
      expect(document.getElementById('ai-cds-suggestion-step')).not.toHaveAttribute('hidden');
    });

    it('does not activate a disabled Step 2', async () => {
      arrange();
      aiCdsApi.listSuggestions.mockResolvedValue([]);

      render(<AiCdsTab appointmentId={41} canManage />);

      const step2 = await screen.findByRole('button', { name: /^2 ai suggestion/i });
      expect(step2).toBeDisabled();
      fireEvent.click(step2);
      expect(step2).not.toHaveAttribute('aria-current', 'step');
      expect(document.getElementById('ai-cds-suggestion-step')).toHaveAttribute('hidden');
    });

    it('disables Step 2 until a suggestion or generation status exists', async () => {
      arrange();
      aiCdsApi.listSuggestions.mockResolvedValue([]);

      render(<AiCdsTab appointmentId={41} canManage />);

      expect(await screen.findByRole('button', { name: /^2 ai suggestion/i })).toBeDisabled();
    });
  });
});
