import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CdsSuggestionReviewPanel from './CdsSuggestionReviewPanel';
import { aiCdsApi } from '@api/aiCdsApi';

vi.mock('@api/aiCdsApi', () => ({
  aiCdsApi: {
    listSuggestions: vi.fn(),
    getDecision: vi.fn(),
    saveDecision: vi.fn(),
    applySuggestion: vi.fn(),
    getAudit: vi.fn(),
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

const suggestion = {
  runId: 'run-synthetic-1',
  status: 'NEEDS_DOCTOR_REVIEW',
  validatedOutputJson: JSON.stringify(output),
  createdAt: '2026-07-27T10:00:00',
};

const approvedDecision = {
  decisionId: 'decision-synthetic-1',
  runId: suggestion.runId,
  decisionStatus: 'APPROVED_AS_IS',
  originalOutputHash: 'synthetic-hash',
  editedOutputJson: null,
  editedOutputHash: null,
  reason: null,
  decidedAt: '2026-07-27T10:05:00',
  applyStatus: 'NOT_APPLIED',
  appliedAt: null,
  targetMedicalDocumentId: null,
  beforeHash: null,
  afterHash: null,
  version: 1,
};

function arrange({ decision = null, canManage = true } = {}) {
  aiCdsApi.listSuggestions.mockResolvedValue([suggestion]);
  aiCdsApi.getDecision.mockResolvedValue(decision);
  return render(
    <CdsSuggestionReviewPanel
      appointmentId={1}
      canManage={canManage}
      onApplied={vi.fn()}
    />,
  );
}

describe('CdsSuggestionReviewPanel', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('identifies AI output as separate from the medical record and keeps critical findings read-only', async () => {
    arrange();

    expect(await screen.findByText(/ai-generated clinical suggestion/i)).toBeInTheDocument();
    expect(screen.getByText(/not part of the medical record/i)).toBeInTheDocument();
    expect(screen.getByText('CRITICAL_GLUCOSE: Review immediately.')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('CRITICAL_GLUCOSE: Review immediately.')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/clinical summary/i)).toHaveValue(output.clinicalSummary);
  });

  it.each([
    ['Reject', 'REJECTED'],
    ['Approve with edits', 'APPROVED_WITH_EDITS'],
  ])('requires a reason before confirming %s', async (actionLabel) => {
    arrange();

    fireEvent.click(await screen.findByRole('button', { name: actionLabel }));
    fireEvent.click(screen.getByRole('button', { name: /confirm decision/i }));

    expect(screen.getByText(/reason is required/i)).toBeInTheDocument();
    expect(aiCdsApi.saveDecision).not.toHaveBeenCalled();
  });

  it('keeps Apply disabled before approval and approval never auto-applies', async () => {
    aiCdsApi.saveDecision.mockResolvedValue(approvedDecision);
    arrange();

    expect(await screen.findByRole('button', { name: /^apply selected sections$/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Approve as-is' }));
    fireEvent.click(screen.getByRole('button', { name: /confirm decision/i }));

    await waitFor(() => expect(aiCdsApi.saveDecision).toHaveBeenCalledWith(suggestion.runId, {
      decision: 'APPROVED_AS_IS',
      editedContent: null,
      reason: null,
      expectedVersion: 0,
    }));
    expect(aiCdsApi.applySuggestion).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^apply selected sections$/i })).toBeEnabled();
  });

  it('applies only explicitly selected sections to a new draft', async () => {
    const onApplied = vi.fn();
    aiCdsApi.listSuggestions.mockResolvedValue([suggestion]);
    aiCdsApi.getDecision.mockResolvedValue(approvedDecision);
    aiCdsApi.applySuggestion.mockResolvedValue({
      ...approvedDecision,
      applyStatus: 'APPLIED',
      targetMedicalDocumentId: 901,
      version: 2,
    });
    render(
      <CdsSuggestionReviewPanel appointmentId={1} canManage onApplied={onApplied} />,
    );

    expect(await screen.findByRole('button', { name: /^apply selected sections$/i })).toBeEnabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /possible explanations/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /differential diagnoses/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /recommended additional tests/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /treatment options for doctor review/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /drug warnings/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /missing information/i }));
    fireEvent.click(screen.getByRole('button', { name: /^apply selected sections$/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm apply/i }));

    await waitFor(() => expect(aiCdsApi.applySuggestion).toHaveBeenCalledWith(suggestion.runId, {
      selectedSections: ['clinicalSummary'],
      targetClinicalResultId: null,
      createNew: true,
      expectedDecisionVersion: 1,
    }));
    expect(await screen.findByText(/medical document 901/i)).toBeInTheDocument();
    expect(onApplied).toHaveBeenCalledTimes(1);
  });

  it('disables every mutation for a read-only doctor view', async () => {
    arrange({ decision: approvedDecision, canManage: false });

    expect(await screen.findByRole('button', { name: 'Approve as-is' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Approve with edits' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^apply selected sections$/i })).toBeDisabled();
    expect(screen.getByLabelText(/clinical summary/i)).toBeDisabled();
  });

  it('restores Doctor-approved edited content after reload', async () => {
    const edited = {
      ...output,
      clinicalSummary: 'Doctor-approved edited summary.',
    };
    arrange({
      decision: {
        ...approvedDecision,
        decisionStatus: 'APPROVED_WITH_EDITS',
        editedOutputJson: JSON.stringify(edited),
        editedOutputHash: 'edited-synthetic-hash',
      },
    });

    expect(await screen.findByLabelText(/clinical summary/i))
      .toHaveValue('Doctor-approved edited summary.');
  });
});
