import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { aiCdsApi } from '@api/aiCdsApi';
import './CdsSuggestionReviewPanel.css';

const EDITABLE_SECTIONS = [
  ['clinicalSummary', 'Clinical summary'],
  ['possibleExplanations', 'Possible explanations'],
  ['differentialDiagnoses', 'Differential diagnoses'],
  ['recommendedAdditionalTests', 'Recommended additional tests'],
  ['treatmentOptionsForDoctorReview', 'Treatment options for Doctor review'],
  ['drugWarnings', 'Drug warnings'],
  ['missingInformation', 'Missing information'],
];

function listValue(value) {
  return Array.isArray(value) ? value : [];
}

function textValue(value) {
  return typeof value === 'string' ? value : '';
}

function lines(value) {
  return listValue(value).join('\n');
}

function parseLines(value) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function parseOutput(json) {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function EvidenceList({ values, emptyText = 'None reported.' }) {
  const items = listValue(values);
  if (items.length === 0) return <p className="cds-review__empty">{emptyText}</p>;
  return (
    <ul className="cds-review__list">
      {items.map((item, index) => (
        <li key={`${typeof item === 'string' ? item : item?.evidenceId || 'item'}-${index}`}>
          {typeof item === 'string'
            ? item
            : item?.title || item?.evidenceId || 'Approved evidence'}
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children, tone = 'default' }) {
  return (
    <section className={`cds-review__section cds-review__section--${tone}`}>
      <h6>{title}</h6>
      {children}
    </section>
  );
}

export default function CdsSuggestionReviewPanel({ appointmentId, canManage, onApplied }) {
  const [suggestion, setSuggestion] = useState(null);
  const [output, setOutput] = useState(null);
  const [decision, setDecision] = useState(null);
  const [draft, setDraft] = useState({});
  const [selectedSections, setSelectedSections] = useState(
    () => new Set(EDITABLE_SECTIONS.map(([key]) => key)),
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingDecision, setPendingDecision] = useState(null);
  const [reason, setReason] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [confirmApply, setConfirmApply] = useState(false);

  const load = useCallback(async () => {
    if (!appointmentId) return;
    setLoading(true);
    setError('');
    try {
      const suggestions = await aiCdsApi.listSuggestions(appointmentId);
      const reviewTarget = (suggestions || []).find(
        (item) => item.status === 'NEEDS_DOCTOR_REVIEW',
      );
      if (!reviewTarget) {
        setSuggestion(null);
        setOutput(null);
        setDecision(null);
        return;
      }
      const parsed = parseOutput(reviewTarget.validatedOutputJson);
      if (!parsed) throw new Error('The validated AI suggestion could not be read.');
      const loadedDecision = await aiCdsApi.getDecision(reviewTarget.runId);
      const effective = parseOutput(loadedDecision?.editedOutputJson) || parsed;
      setSuggestion(reviewTarget);
      setOutput(effective);
      setDraft({
        clinicalSummary: textValue(effective.clinicalSummary),
        possibleExplanations: lines(effective.possibleExplanations),
        differentialDiagnoses: lines(effective.differentialDiagnoses),
        recommendedAdditionalTests: lines(effective.recommendedAdditionalTests),
        treatmentOptionsForDoctorReview: lines(effective.treatmentOptionsForDoctorReview),
        drugWarnings: lines(effective.drugWarnings),
        missingInformation: lines(effective.missingInformation),
      });
      setDecision(loadedDecision);
    } catch (loadError) {
      setError(loadError.response?.data?.message || loadError.message || 'Unable to load AI suggestion.');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const approved = decision?.decisionStatus === 'APPROVED_AS_IS'
    || decision?.decisionStatus === 'APPROVED_WITH_EDITS';
  const applied = decision?.applyStatus === 'APPLIED';

  const editedContent = useMemo(() => {
    if (!output) return {};
    const changes = {};
    EDITABLE_SECTIONS.forEach(([key]) => {
      const current = key === 'clinicalSummary' ? draft[key] : parseLines(draft[key] || '');
      const original = key === 'clinicalSummary'
        ? textValue(output[key])
        : listValue(output[key]);
      if (JSON.stringify(current) !== JSON.stringify(original)) {
        changes[key] = current;
      }
    });
    return changes;
  }, [draft, output]);

  const openDecision = (status) => {
    setPendingDecision(status);
    setReason('');
    setDecisionError('');
  };

  const submitDecision = async () => {
    const needsReason = pendingDecision === 'REJECTED'
      || pendingDecision === 'APPROVED_WITH_EDITS';
    if (needsReason && !reason.trim()) {
      setDecisionError('Reason is required for this decision.');
      return;
    }
    if (pendingDecision === 'APPROVED_WITH_EDITS'
        && Object.keys(editedContent).length === 0) {
      setDecisionError('Edit at least one supported field before approval.');
      return;
    }
    setBusy(true);
    setDecisionError('');
    try {
      const saved = await aiCdsApi.saveDecision(suggestion.runId, {
        decision: pendingDecision,
        editedContent: pendingDecision === 'APPROVED_WITH_EDITS' ? editedContent : null,
        reason: needsReason ? reason.trim() : null,
        expectedVersion: decision?.version ?? 0,
      });
      setDecision(saved);
      setPendingDecision(null);
    } catch (saveError) {
      setDecisionError(saveError.response?.data?.message || 'Unable to save Doctor decision.');
    } finally {
      setBusy(false);
    }
  };

  const toggleSection = (section) => {
    setSelectedSections((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const applySelected = async () => {
    if (selectedSections.size === 0) {
      setError('Select at least one approved section to apply.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = await aiCdsApi.applySuggestion(suggestion.runId, {
        selectedSections: EDITABLE_SECTIONS
          .map(([key]) => key)
          .filter((key) => selectedSections.has(key)),
        targetClinicalResultId: null,
        createNew: true,
        expectedDecisionVersion: decision.version,
      });
      setDecision(saved);
      setConfirmApply(false);
      onApplied?.(saved);
    } catch (applyError) {
      setError(applyError.response?.data?.message || 'Unable to apply approved sections.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="cds-review cds-review--loading" aria-label="Loading AI clinical suggestion">
        <div className="cds-review__skeleton" />
        <div className="cds-review__skeleton cds-review__skeleton--short" />
      </div>
    );
  }
  if (!suggestion && !error) {
    return (
      <div className="cds-review cds-review--empty">
        <strong>No AI clinical suggestion is awaiting review.</strong>
        <span>Generate a suggestion only after clinical context and laboratory data are verified.</span>
      </div>
    );
  }
  if (!suggestion) {
    return (
      <div className="cds-review cds-review--error" role="alert">
        <span>{error}</span>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={load}>Retry</button>
      </div>
    );
  }

  return (
    <div className="cds-review">
      <header className="cds-review__header">
        <div>
          <span className="cds-review__eyebrow">AI-generated clinical suggestion</span>
          <h5>Doctor review boundary</h5>
          <p>This content is not part of the medical record until you approve and explicitly apply selected sections.</p>
        </div>
        <div className="cds-review__status">
          <span>{output.urgency || 'ROUTINE'}</span>
          <span>Confidence: {output.confidence || 'LOW'}</span>
        </div>
      </header>

      {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}

      <Section title="Critical and blocking findings" tone="critical">
        <EvidenceList values={[...listValue(output.urgentWarnings), ...listValue(output.abnormalFindings)]} />
        <small>Read-only deterministic and AI safety findings.</small>
      </Section>

      <div className="cds-review__grid">
        {EDITABLE_SECTIONS.map(([key, label]) => (
          <Section key={key} title={label}>
            <label className="visually-hidden" htmlFor={`cds-${key}`}>{label}</label>
            <textarea
              id={`cds-${key}`}
              aria-label={label}
              rows={key === 'clinicalSummary' ? 4 : 3}
              value={draft[key] || ''}
              onChange={(event) => setDraft((current) => ({
                ...current,
                [key]: event.target.value,
              }))}
              disabled={!canManage || Boolean(decision)}
              className="form-control"
            />
          </Section>
        ))}
      </div>

      <Section title="Guideline citations" tone="evidence">
        <EvidenceList values={output.citations} emptyText="No approved evidence was cited." />
        <small>Citations are read-only and cannot be replaced during Doctor editing.</small>
      </Section>

      <div className="cds-review__decision-actions">
        <button type="button" className="btn btn-outline-success"
          disabled={!canManage || Boolean(decision) || busy}
          onClick={() => openDecision('APPROVED_AS_IS')}>
          Approve as-is
        </button>
        <button type="button" className="btn btn-outline-primary"
          disabled={!canManage || Boolean(decision) || busy}
          onClick={() => openDecision('APPROVED_WITH_EDITS')}>
          Approve with edits
        </button>
        <button type="button" className="btn btn-outline-danger"
          disabled={!canManage || Boolean(decision) || busy}
          onClick={() => openDecision('REJECTED')}>
          Reject
        </button>
      </div>

      {pendingDecision && (
        <div className="cds-review__confirmation" role="group" aria-label="Confirm Doctor decision">
          <strong>Confirm {pendingDecision.replaceAll('_', ' ').toLowerCase()}</strong>
          {(pendingDecision === 'REJECTED' || pendingDecision === 'APPROVED_WITH_EDITS') && (
            <div>
              <label htmlFor="cds-decision-reason">Doctor reason</label>
              <textarea id="cds-decision-reason" className="form-control" rows="2"
                value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>
          )}
          {decisionError && <div className="text-danger small" role="alert">{decisionError}</div>}
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-primary"
              disabled={busy} onClick={submitDecision}>Confirm decision</button>
            <button type="button" className="btn btn-sm btn-outline-secondary"
              disabled={busy} onClick={() => setPendingDecision(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="cds-review__apply">
        <div>
          <strong>Explicit Apply to a new clinical-result draft</strong>
          <p>Approval alone never changes the official medical record.</p>
        </div>
        <div className="cds-review__section-picker">
          {EDITABLE_SECTIONS.map(([key, label]) => (
            <div className="cds-review__section-choice" key={key}>
              <input type="checkbox"
                aria-label={key === 'clinicalSummary' ? 'Include summary' : label}
                checked={selectedSections.has(key)}
                disabled={!canManage || !approved || applied || busy}
                onChange={() => toggleSection(key)} />
              <span>{label}</span>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-primary"
          disabled={!canManage || !approved || applied || busy || selectedSections.size === 0}
          onClick={() => setConfirmApply(true)}>
          Apply selected sections
        </button>
        {confirmApply && (
          <div className="cds-review__confirmation" role="group" aria-label="Confirm Apply">
            <strong>Create a Doctor-owned DRAFT clinical result?</strong>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-sm btn-primary"
                disabled={busy} onClick={applySelected}>Confirm Apply</button>
              <button type="button" className="btn btn-sm btn-outline-secondary"
                disabled={busy} onClick={() => setConfirmApply(false)}>Cancel</button>
            </div>
          </div>
        )}
        {applied && (
          <div className="cds-review__applied" role="status">
            Applied to medical document {decision.targetMedicalDocumentId} as a draft.
          </div>
        )}
      </div>
    </div>
  );
}
