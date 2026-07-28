import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CdsSuggestionReviewPanel from './CdsSuggestionReviewPanel';
import { aiCdsApi } from '@api/aiCdsApi';
import { doctorClinicalResultApi } from '@api/doctorClinicalResultApi';

vi.mock('@api/aiCdsApi', () => ({
  aiCdsApi: {
    listSuggestions: vi.fn(),
    getDecision: vi.fn(),
    saveDecision: vi.fn(),
    applySuggestion: vi.fn(),
  },
}));

vi.mock('@api/doctorClinicalResultApi', () => ({
  doctorClinicalResultApi: {
    getAppointmentResults: vi.fn(),
  },
}));

const output = {
  urgency: 'URGENT',
  clinicalSummary: 'Synthetic summary for doctor review.',
  abnormalFindings: ['Glucose is above the referenced range.'],
  urgentWarnings: ['CRITICAL_GLUCOSE: Review immediately.'],
  possibleExplanations: ['Synthetic explanation.'],
  differentialDiagnoses: ['Synthetic differential.'],
  recommendedAdditionalTests: ['Repeat fasting glucose.'],
  treatmentOptionsForDoctorReview: ['Review lifestyle intervention guidance.'],
  drugWarnings: ['Check renal function before medication changes.'],
  missingInformation: ['Recent HbA1c.'],
  confidence: 'MEDIUM',
  citations: [{ evidenceId: 'guideline-chunk-1', title: 'Synthetic guideline evidence' }],
  requiresDoctorApproval: true,
};

const latestSuggestion = {
  runId: 'run-synthetic-latest',
  snapshotContextVersion: 4,
  contextCurrent: true,
  status: 'NEEDS_DOCTOR_REVIEW',
  validatedOutputJson: JSON.stringify(output),
  modelName: 'qwen3:4b-instruct',
  ruleSetVersion: 'demo-rules-v1',
  corpusVersion: 'demo-corpus-v1',
  createdAt: '2026-07-27T10:00:00Z',
};

const olderSuggestion = {
  ...latestSuggestion,
  runId: 'run-synthetic-older',
  snapshotContextVersion: 3,
  status: 'SUPERSEDED',
  createdAt: '2026-07-26T10:00:00Z',
};

const approvedDecision = {
  decisionId: 'decision-synthetic-1',
  runId: latestSuggestion.runId,
  decisionStatus: 'APPROVED_AS_IS',
  originalOutputHash: 'synthetic-hash',
  editedOutputJson: null,
  editedOutputHash: null,
  reason: null,
  decidedAt: '2026-07-27T10:05:00Z',
  applyStatus: 'NOT_APPLIED',
  appliedAt: null,
  targetMedicalDocumentId: null,
  version: 1,
};

let observerCallback;
let observerDisconnect;

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function arrange({
  suggestions = [latestSuggestion, olderSuggestion],
  decisions = {},
  canManage = true,
  refreshKey = 0,
  generationStatus = null,
  onApplied = vi.fn(),
  clinicalResults = [],
  loadError = null,
} = {}) {
  if (loadError) aiCdsApi.listSuggestions.mockRejectedValue(loadError);
  else aiCdsApi.listSuggestions.mockResolvedValue(suggestions);
  aiCdsApi.getDecision.mockImplementation(async (runId) => decisions[runId] || null);
  doctorClinicalResultApi.getAppointmentResults.mockResolvedValue(clinicalResults);
  return render(
    <CdsSuggestionReviewPanel
      appointmentId={1}
      canManage={canManage}
      refreshKey={refreshKey}
      generationStatus={generationStatus}
      onApplied={onApplied}
    />,
  );
}

describe('CdsSuggestionReviewPanel', () => {
  beforeEach(() => {
    observerDisconnect = vi.fn();
    globalThis.IntersectionObserver = vi.fn((callback) => {
      observerCallback = callback;
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: observerDisconnect,
      };
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    delete globalThis.IntersectionObserver;
  });

  it('selects and displays the newest run metadata by default', async () => {
    arrange({ suggestions: [olderSuggestion, latestSuggestion] });

    expect(await screen.findByText(/latest suggestion/i)).toBeInTheDocument();
    expect(screen.getByText(/qwen3:4b-instruct/i)).toBeInTheDocument();
  });

  it('uses only latest-suggestion copy and never history wording', async () => {
    arrange({ suggestions: [olderSuggestion, latestSuggestion] });

    expect(await screen.findByText(/latest suggestion/i)).toBeInTheDocument();
    expect(screen.queryByText(/available in history/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/remains available in history/i)).not.toBeInTheDocument();
  });

  it('marks a stale run Outdated and blocks every mutation', async () => {
    arrange({
      suggestions: [{ ...latestSuggestion, contextCurrent: false }],
    });

    expect(await screen.findByText(/^outdated$/i)).toBeInTheDocument();
    expect(screen.getByText(/return to clinical context/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit response/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve as is/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^reject$/i })).toBeDisabled();
  });

  it('keeps an applied run Applied and explains that context changed after review', async () => {
    arrange({
      suggestions: [{ ...latestSuggestion, contextCurrent: false }],
      decisions: {
        [latestSuggestion.runId]: {
          ...approvedDecision,
          applyStatus: 'APPLIED',
          targetMedicalDocumentId: 901,
        },
      },
    });

    expect(await screen.findByText(/^applied$/i)).toBeInTheDocument();
    expect(screen.getByText(/context has changed since review/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply selected sections/i })).toBeDisabled();
  });

  it('edits one supported section in place and requires a reason to approve changes', async () => {
    arrange();

    const summarySection = await screen.findByRole('region', { name: 'Clinical summary' });
    fireEvent.click(within(summarySection).getByRole('button', { name: /edit response/i }));
    fireEvent.change(within(summarySection).getByRole('textbox', { name: /clinical summary/i }), {
      target: { value: 'Doctor-edited synthetic summary.' },
    });

    expect(screen.getByRole('button', { name: /approve changes/i })).toBeEnabled();
    expect(screen.queryByRole('textbox', { name: /possible explanations/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /approve changes/i }));
    const dialog = screen.getByRole('dialog', { name: /approve changes/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm approval/i }));
    expect(within(dialog).getByText(/reason is required/i)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/doctor reason/i), {
      target: { value: 'Clarified the clinical wording.' },
    });
    aiCdsApi.saveDecision.mockResolvedValue({
      ...approvedDecision,
      decisionStatus: 'APPROVED_WITH_EDITS',
      editedOutputJson: JSON.stringify({
        ...output,
        clinicalSummary: 'Doctor-edited synthetic summary.',
      }),
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm approval/i }));

    await waitFor(() => expect(aiCdsApi.saveDecision).toHaveBeenCalledWith(latestSuggestion.runId, {
      decision: 'APPROVED_WITH_EDITS',
      editedContent: { clinicalSummary: 'Doctor-edited synthetic summary.' },
      reason: 'Clarified the clinical wording.',
      expectedVersion: 0,
    }));
  });

  it('approves unchanged output without a reason and never auto-applies', async () => {
    aiCdsApi.saveDecision.mockResolvedValue(approvedDecision);
    arrange();

    fireEvent.click(await screen.findByRole('button', { name: /approve as is/i }));
    const dialog = screen.getByRole('dialog', { name: /approve as is/i });
    expect(within(dialog).queryByLabelText(/doctor reason/i)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm approval/i }));

    await waitFor(() => expect(aiCdsApi.saveDecision).toHaveBeenCalledWith(latestSuggestion.runId, {
      decision: 'APPROVED_AS_IS',
      editedContent: null,
      reason: null,
      expectedVersion: 0,
    }));
    expect(aiCdsApi.applySuggestion).not.toHaveBeenCalled();
  });

  it('requires a reason in the accessible Reject dialog', async () => {
    arrange();

    fireEvent.click(await screen.findByRole('button', { name: /^reject$/i }));
    const dialog = screen.getByRole('dialog', { name: /reject suggestion/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm rejection/i }));

    expect(within(dialog).getByText(/reason is required/i)).toBeInTheDocument();
    expect(aiCdsApi.saveDecision).not.toHaveBeenCalled();
  });

  it('moves focus into a review dialog and restores it when Escape closes the dialog', async () => {
    arrange();

    const rejectButton = await screen.findByRole('button', { name: /^reject$/i });
    rejectButton.focus();
    fireEvent.click(rejectButton);

    const dialog = screen.getByRole('dialog', { name: /reject suggestion/i });
    expect(dialog).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: /reject suggestion/i })).not.toBeInTheDocument();
    expect(rejectButton).toHaveFocus();
  });

  it('applies selected sections to a new draft by default', async () => {
    aiCdsApi.applySuggestion.mockResolvedValue({
      ...approvedDecision,
      applyStatus: 'APPLIED',
      targetMedicalDocumentId: 901,
      version: 2,
    });
    arrange({ decisions: { [latestSuggestion.runId]: approvedDecision } });

    fireEvent.click(await screen.findByRole('button', { name: /apply selected sections/i }));
    const dialog = screen.getByRole('dialog', { name: /apply selected sections/i });
    expect(within(dialog).getByRole('radio', { name: /create a new draft/i })).toBeChecked();
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm apply/i }));

    await waitFor(() => expect(aiCdsApi.applySuggestion).toHaveBeenCalledWith(latestSuggestion.runId, {
      selectedSections: [
        'clinicalSummary',
        'possibleExplanations',
        'differentialDiagnoses',
        'recommendedAdditionalTests',
        'treatmentOptionsForDoctorReview',
        'drugWarnings',
        'missingInformation',
      ],
      targetClinicalResultId: null,
      createNew: true,
      expectedDecisionVersion: 1,
    }));
    expect(await screen.findByText(/medical document 901/i)).toBeInTheDocument();
  });

  it('loads appointment drafts and applies to exactly one selected existing result', async () => {
    aiCdsApi.applySuggestion.mockResolvedValue({
      ...approvedDecision,
      applyStatus: 'APPLIED',
      targetMedicalDocumentId: 701,
      version: 2,
    });
    arrange({
      decisions: { [latestSuggestion.runId]: approvedDecision },
      clinicalResults: [
        { documentId: 701, documentName: 'Existing synthetic draft', clinicalStatus: 'DRAFT' },
        { documentId: 702, documentName: 'Published result', clinicalStatus: 'PUBLISHED' },
      ],
    });

    fireEvent.click(await screen.findByRole('button', { name: /apply selected sections/i }));
    const dialog = screen.getByRole('dialog', { name: /apply selected sections/i });
    await waitFor(() => expect(doctorClinicalResultApi.getAppointmentResults).toHaveBeenCalledWith(1));
    fireEvent.click(within(dialog).getByRole('radio', { name: /use an existing draft/i }));
    fireEvent.change(within(dialog).getByLabelText(/target clinical result/i), {
      target: { value: '701' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm apply/i }));

    await waitFor(() => expect(aiCdsApi.applySuggestion).toHaveBeenCalledWith(latestSuggestion.runId, {
      selectedSections: expect.any(Array),
      targetClinicalResultId: 701,
      createNew: false,
      expectedDecisionVersion: 1,
    }));
    expect(within(dialog).queryByText(/published result/i)).not.toBeInTheDocument();
  });

  it('renders a sticky suggestion contents navigation and cleans up IntersectionObserver', async () => {
    const view = arrange();

    const toc = await screen.findByRole('navigation', { name: /suggestion sections/i });
    expect(within(toc).getByRole('link', { name: 'Clinical summary' }))
      .toHaveAttribute('href', '#cds-section-clinicalSummary');
    expect(within(toc).getByRole('link', { name: 'Evidence' }))
      .toHaveAttribute('href', '#cds-section-citations');
    await waitFor(() => expect(globalThis.IntersectionObserver).toHaveBeenCalled());

    act(() => {
      observerCallback([{ isIntersecting: true, target: { id: 'cds-section-abnormalFindings' } }]);
    });
    expect(within(toc).getByRole('link', { name: 'Abnormal findings' }))
      .toHaveAttribute('aria-current', 'location');

    view.unmount();
    expect(observerDisconnect).toHaveBeenCalled();
  });

  it('discards an active draft on refresh and shows a visible warning', async () => {
    const view = arrange();
    const summarySection = await screen.findByRole('region', { name: 'Clinical summary' });
    fireEvent.click(within(summarySection).getByRole('button', { name: /edit response/i }));
    fireEvent.change(within(summarySection).getByRole('textbox'), {
      target: { value: 'Unsaved local draft.' },
    });

    aiCdsApi.listSuggestions.mockResolvedValue([
      { ...latestSuggestion, contextCurrent: false },
    ]);
    view.rerender(
      <CdsSuggestionReviewPanel
        appointmentId={1}
        canManage
        refreshKey={1}
      />,
    );

    expect(await screen.findByText(/draft was discarded because the clinical context or run changed/i))
      .toBeInTheDocument();
    expect(screen.getByText(/^outdated$/i)).toBeInTheDocument();
  });

  it('ignores an older load that resolves after a newer refresh', async () => {
    let resolveOld, resolveNew;
    aiCdsApi.listSuggestions
      .mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveNew = resolve; }));

    const view = arrange({ suggestions: [olderSuggestion, latestSuggestion], refreshKey: 0 });
    view.rerender(
      <CdsSuggestionReviewPanel appointmentId={1} canManage refreshKey={1} />,
    );

    resolveOld([olderSuggestion, latestSuggestion]);
    await act(async () => {});

    expect(screen.queryByText(/qwen3:4b-instruct/i)).not.toBeInTheDocument();

    resolveNew([{ ...latestSuggestion }]);
    expect(await screen.findByText(/qwen3:4b-instruct/i)).toBeInTheDocument();
  });

  it('uses descending run id as the deterministic tie break for same-createdAt runs', async () => {
    const runA = { ...latestSuggestion, runId: 'run-a' };
    const runB = { ...latestSuggestion, runId: 'run-b' };
    arrange({ suggestions: [runA, runB] });

    await screen.findByText(/qwen3:4b-instruct/i);
    expect(aiCdsApi.getDecision).toHaveBeenCalledWith('run-b');
  });

  it('closes the decision dialog when the selected run changes', async () => {
    const view = arrange();
    const approveBtn = await screen.findByRole('button', { name: /approve as is/i });
    fireEvent.click(approveBtn);
    expect(screen.getByRole('dialog', { name: /approve as is/i })).toBeInTheDocument();

    aiCdsApi.listSuggestions.mockResolvedValue([
      { ...latestSuggestion, runId: 'run-replacement', status: 'NEEDS_DOCTOR_REVIEW' },
      olderSuggestion,
    ]);
    view.rerender(
      <CdsSuggestionReviewPanel appointmentId={1} canManage refreshKey={2} />,
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /approve as is/i })).not.toBeInTheDocument();
    });
    expect(aiCdsApi.saveDecision).not.toHaveBeenCalled();
  });

  it('humanizes coded findings non-destructively while leaving natural warnings untouched', async () => {
    const codedOutput = {
      ...output,
      abnormalFindings: [
        'GLUCOSE_126_MG_DL',
        'HEMOGLOBIN_13.4_G_DL',
        'WBC_7.2_10_9_L',
        'UNPARSEABLE_DEMO_CODE',
        'EGFR_48_ML_MIN_1.73_M2',
        'HBA1C_6.5_PERCENT',
        'GLUCOSE_126_FOO_BAR',
      ],
      urgentWarnings: ['CRITICAL_GLUCOSE: Review immediately.'],
    };
    const frozen = deepFreeze({ ...codedOutput });
    const run = deepFreeze({
      ...latestSuggestion,
      validatedOutputJson: JSON.stringify(frozen),
    });

    aiCdsApi.getDecision.mockResolvedValue(null);
    aiCdsApi.saveDecision.mockResolvedValue(approvedDecision);
    aiCdsApi.applySuggestion.mockResolvedValue({
      ...approvedDecision,
      applyStatus: 'APPLIED',
      targetMedicalDocumentId: 901,
      version: 2,
    });
    arrange({ suggestions: [run, olderSuggestion] });

    expect(await screen.findByText('Glucose is 126 mg/dL.')).toBeInTheDocument();
    expect(screen.getByText('Hemoglobin is 13.4 g/dL.')).toBeInTheDocument();
    expect(screen.getByText('WBC is 7.2 10^9/L.')).toBeInTheDocument();
    expect(screen.getByText('Unparseable demo code.')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL_GLUCOSE: Review immediately.')).toBeInTheDocument();
    expect(screen.getByText('eGFR 48 ml min 1.73 m2.')).toBeInTheDocument();
    expect(screen.getByText('HbA1c is 6.5 %.')).toBeInTheDocument();
    expect(screen.getByText('Glucose 126 foo bar.')).toBeInTheDocument();
    expect(JSON.parse(run.validatedOutputJson)).toEqual(frozen);
    const rawFindings = JSON.parse(run.validatedOutputJson).abnormalFindings;
    expect(rawFindings).toContain('GLUCOSE_126_MG_DL');
    expect(rawFindings).toContain('EGFR_48_ML_MIN_1.73_M2');
    expect(rawFindings).toContain('HBA1C_6.5_PERCENT');
    expect(rawFindings).not.toContain('mg/dL');
    expect(rawFindings).not.toContain('eGFR');
    expect(rawFindings).not.toContain('HbA1c');
    expect(rawFindings).not.toContain('Glucose is 126');

    fireEvent.click(screen.getByRole('button', { name: /approve as is/i }));
    fireEvent.click(within(
      screen.getByRole('dialog', { name: /approve as is/i }),
    ).getByRole('button', { name: /confirm approval/i }));
    await waitFor(() => expect(aiCdsApi.saveDecision).toHaveBeenCalledWith(run.runId, {
      decision: 'APPROVED_AS_IS',
      editedContent: null,
      reason: null,
      expectedVersion: 0,
    }));

    fireEvent.click(await screen.findByRole('button', { name: /apply selected sections/i }));
    fireEvent.click(within(
      screen.getByRole('dialog', { name: /apply selected sections/i }),
    ).getByRole('button', { name: /confirm apply/i }));
    await waitFor(() => expect(aiCdsApi.applySuggestion).toHaveBeenCalledWith(
      run.runId,
      expect.objectContaining({
        selectedSections: expect.not.arrayContaining([
          'abnormalFindings',
          'urgentWarnings',
          'citations',
        ]),
      }),
    ));
    expect(JSON.parse(run.validatedOutputJson)).toEqual(frozen);
  });

  it('ignores an older decision hydration that resolves after the latest run', async () => {
    let resolveDecisionA;
    let resolveDecisionB;

    const runA = { ...latestSuggestion, runId: 'run-a', validatedOutputJson: JSON.stringify({ ...output, clinicalSummary: 'Summary from run A.' }) };
    const runB = { ...latestSuggestion, runId: 'run-b', validatedOutputJson: JSON.stringify({ ...output, clinicalSummary: 'Summary from run B.' }) };

    const view = arrange({ suggestions: [runA], refreshKey: 0 });
    aiCdsApi.getDecision.mockImplementation(async (runId) => {
      if (runId === 'run-a') return new Promise((resolve) => { resolveDecisionA = resolve; });
      if (runId === 'run-b') return new Promise((resolve) => { resolveDecisionB = resolve; });
      return null;
    });

    await act(async () => {});

    aiCdsApi.listSuggestions.mockResolvedValue([runB]);
    view.rerender(
      <CdsSuggestionReviewPanel appointmentId={1} canManage refreshKey={1} />,
    );
    await act(async () => {});

    resolveDecisionB({ ...approvedDecision, runId: 'run-b' });
    await act(async () => {});
    await screen.findByText('Summary from run B.', {}, { timeout: 2000 });

    resolveDecisionA({ ...approvedDecision, runId: 'run-a' });
    await act(async () => {});

    expect(screen.getByText('Summary from run B.')).toBeInTheDocument();
    expect(screen.queryByText('Summary from run A.')).not.toBeInTheDocument();
  });

  it('ignores an approval response when its run is replaced while pending', async () => {
    let resolveSave;
    aiCdsApi.saveDecision.mockImplementation(() => new Promise((resolve) => {
      resolveSave = resolve;
    }));
    const view = arrange();
    fireEvent.click(await screen.findByRole('button', { name: /approve as is/i }));
    const dialog = screen.getByRole('dialog', { name: /approve as is/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm approval/i }));
    await waitFor(() => expect(aiCdsApi.saveDecision).toHaveBeenCalledWith(
      latestSuggestion.runId,
      expect.anything(),
    ));

    const replacementRun = {
      ...latestSuggestion,
      runId: 'run-replacement',
      status: 'NEEDS_DOCTOR_REVIEW',
    };
    aiCdsApi.listSuggestions.mockResolvedValue([
      replacementRun,
    ]);
    aiCdsApi.getDecision.mockResolvedValue(null);
    view.rerender(
      <CdsSuggestionReviewPanel appointmentId={1} canManage refreshKey={2} />,
    );
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /approve as is/i })).not.toBeInTheDocument();
    });

    await act(async () => {
      resolveSave({ ...approvedDecision, runId: latestSuggestion.runId });
    });

    expect(screen.getByRole('button', { name: /apply selected sections/i })).toBeDisabled();
  });

  it('ignores an apply response when its run is replaced while pending', async () => {
    let resolveApply;
    aiCdsApi.applySuggestion.mockImplementation(() => new Promise((resolve) => {
      resolveApply = resolve;
    }));
    const onApplied = vi.fn();
    const view = arrange({
      decisions: { [latestSuggestion.runId]: approvedDecision },
      onApplied,
    });
    fireEvent.click(await screen.findByRole('button', { name: /apply selected sections/i }));
    const dialog = screen.getByRole('dialog', { name: /apply selected sections/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm apply/i }));
    await waitFor(() => expect(aiCdsApi.applySuggestion).toHaveBeenCalledWith(
      latestSuggestion.runId,
      expect.anything(),
    ));

    aiCdsApi.listSuggestions.mockResolvedValue([
      { ...latestSuggestion, runId: 'run-replacement', status: 'NEEDS_DOCTOR_REVIEW' },
    ]);
    aiCdsApi.getDecision.mockResolvedValue(null);
    view.rerender(
      <CdsSuggestionReviewPanel appointmentId={1} canManage refreshKey={2} />,
    );
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /apply selected sections/i })).not.toBeInTheDocument();
    });

    await act(async () => {
      resolveApply({
        ...approvedDecision,
        runId: latestSuggestion.runId,
        applyStatus: 'APPLIED',
        targetMedicalDocumentId: 901,
        version: 2,
      });
    });

    expect(onApplied).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /apply selected sections/i })).toBeDisabled();
  });

  it('ignores existing clinical-result drafts loaded for a replaced run', async () => {
    let resolveOldDrafts;
    let resolveNewDrafts;
    doctorClinicalResultApi.getAppointmentResults
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveOldDrafts = resolve;
      }))
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveNewDrafts = resolve;
      }));

    const replacementRun = { ...latestSuggestion, runId: 'run-replacement' };
    const view = arrange({
      decisions: { [latestSuggestion.runId]: approvedDecision },
    });

    fireEvent.click(await screen.findByRole('button', { name: /apply selected sections/i }));
    await waitFor(() => expect(doctorClinicalResultApi.getAppointmentResults).toHaveBeenCalledTimes(1));

    aiCdsApi.listSuggestions.mockResolvedValue([replacementRun]);
    aiCdsApi.getDecision.mockResolvedValue({
      ...approvedDecision,
      runId: replacementRun.runId,
    });
    view.rerender(
      <CdsSuggestionReviewPanel appointmentId={1} canManage refreshKey={2} />,
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /apply selected sections/i })).not.toBeInTheDocument();
    });
    fireEvent.click(await screen.findByRole('button', { name: /apply selected sections/i }));
    const replacementDialog = screen.getByRole('dialog', { name: /apply selected sections/i });
    await waitFor(() => expect(doctorClinicalResultApi.getAppointmentResults).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveOldDrafts([
        { documentId: 701, documentName: 'Obsolete run draft', clinicalStatus: 'DRAFT' },
      ]);
    });
    fireEvent.click(within(replacementDialog).getByRole('radio', { name: /use an existing draft/i }));

    expect(within(replacementDialog).queryByRole('option', { name: /obsolete run draft/i }))
      .not.toBeInTheDocument();

    await act(async () => {
      resolveNewDrafts([]);
    });
  });

  it('uses descending run id as the deterministic tie-break when both createdAt dates are invalid', async () => {
    const runA = { ...latestSuggestion, runId: 'run-a', createdAt: 'not-a-date' };
    const runB = { ...latestSuggestion, runId: 'run-b', createdAt: 'also-invalid' };
    arrange({ suggestions: [runA, runB] });

    await screen.findByText(/qwen3:4b-instruct/i);
    expect(aiCdsApi.getDecision).toHaveBeenCalledWith('run-b');
  });

  it('renders generation, empty, retrieval warning, blocked, and error guidance states', async () => {
    const loading = arrange({
      suggestions: [],
      generationStatus: { busy: true, status: 'GENERATING_LOCAL' },
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/generating local/i);
    loading.unmount();

    const empty = arrange({ suggestions: [] });
    expect(await screen.findByText(/no ai suggestion has been generated yet/i)).toBeInTheDocument();
    empty.unmount();

    const retryable = arrange({
      suggestions: [],
      generationStatus: { busy: false, status: 'FAILED_RETRYABLE', error: 'Local model timed out.' },
    });
    expect(await screen.findByText(/retry from the confirmed context/i)).toBeInTheDocument();
    retryable.unmount();

    const finalFailure = arrange({
      suggestions: [],
      generationStatus: { busy: false, status: 'FAILED_FINAL' },
    });
    expect(await screen.findByText(/check local ai resources/i)).toBeInTheDocument();
    finalFailure.unmount();

    const warning = arrange({
      suggestions: [{ ...latestSuggestion, errorCode: 'RAG_INSUFFICIENT' }],
    });
    expect(await screen.findByText(/approved guideline evidence was limited/i)).toBeInTheDocument();
    warning.unmount();

    const blocked = arrange({
      suggestions: [{ ...latestSuggestion, status: 'RULES_BLOCKED', errorCode: 'RULES_BLOCKED' }],
    });
    expect(await screen.findByText(/clinical rules blocked approval/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve as is/i })).toBeDisabled();
    blocked.unmount();

    arrange({ loadError: new Error('Synthetic load failure') });
    expect(await screen.findByRole('alert')).toHaveTextContent(/synthetic load failure/i);
  });
});
