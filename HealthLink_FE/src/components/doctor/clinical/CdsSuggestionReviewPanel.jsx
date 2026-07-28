import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { aiCdsApi } from '@api/aiCdsApi';
import { doctorClinicalResultApi } from '@api/doctorClinicalResultApi';
import './CdsSuggestionReviewPanel.css';

const EDITABLE_SECTIONS = [
  ['clinicalSummary', 'Clinical summary'],
  ['possibleExplanations', 'Possible explanations'],
  ['differentialDiagnoses', 'Differential diagnoses'],
  ['recommendedAdditionalTests', 'Additional tests'],
  ['treatmentOptionsForDoctorReview', 'Treatment options'],
  ['drugWarnings', 'Drug and safety warnings'],
  ['missingInformation', 'Missing information'],
];

const CONTENT_SECTIONS = [
  ['clinicalSummary', 'Clinical summary'],
  ['abnormalFindings', 'Abnormal findings'],
  ['possibleExplanations', 'Possible explanations'],
  ['differentialDiagnoses', 'Differential diagnoses'],
  ['recommendedAdditionalTests', 'Additional tests'],
  ['treatmentOptionsForDoctorReview', 'Treatment options'],
  ['drugWarnings', 'Drug and safety warnings'],
  ['missingInformation', 'Missing information'],
  ['citations', 'Evidence'],
];

const READ_ONLY_RUN_STATUSES = new Set(['SUPERSEDED', 'OUTDATED', 'REJECTED']);
const GENERATION_LABELS = {
  QUEUED: 'Queued',
  RETRIEVING: 'Retrieving approved evidence',
  GENERATING_LOCAL: 'Generating locally',
};

const CLINICAL_ACRONYMS = {
  WBC: 'WBC',
  RBC: 'RBC',
  ALT: 'ALT',
  AST: 'AST',
  LDL: 'LDL',
  HDL: 'HDL',
  INR: 'INR',
  TSH: 'TSH',
  CRP: 'CRP',
  BUN: 'BUN',
  EGFR: 'eGFR',
  HBA1C: 'HbA1c',
};

const CODED_UNITS = {
  MG_DL: 'mg/dL',
  MMOL_L: 'mmol/L',
  G_DL: 'g/dL',
  G_L: 'g/L',
  MM_HG: 'mmHg',
  PERCENT: '%',
  '10_9_L': '10^9/L',
  IU_L: 'IU/L',
};

function humanizeCodedFinding(value) {
  if (typeof value !== 'string') return value;
  if (!/^[A-Z0-9_.-]+$/.test(value) || !value.includes('_')) return value;

  const tokens = value.split('_');
  const numIdx = tokens.findIndex((t) => /^-?\d+(?:\.\d+)?$/.test(t));
  if (numIdx === -1) {
    return tokens.map((t, i) => {
      if (CLINICAL_ACRONYMS[t]) return CLINICAL_ACRONYMS[t];
      const lowered = t.toLowerCase();
      return i === 0 ? lowered.charAt(0).toUpperCase() + lowered.slice(1) : lowered;
    }).join(' ') + '.';
  }

  const nameTokens = tokens.slice(0, numIdx);
  const numericValue = tokens[numIdx];
  const unitKey = tokens.slice(numIdx + 1).join('_');

  if (!CODED_UNITS[unitKey]) {
    const allParts = tokens.map((t) => {
      if (CLINICAL_ACRONYMS[t]) return CLINICAL_ACRONYMS[t];
      return /^-?\d+(?:\.\d+)?$/.test(t) ? t : t.toLowerCase();
    });
    if (!CLINICAL_ACRONYMS[tokens[0]]) {
      allParts[0] = allParts[0].charAt(0).toUpperCase() + allParts[0].slice(1);
    }
    return allParts.join(' ') + '.';
  }

  const nameStr = nameTokens
    .map((t) => CLINICAL_ACRONYMS[t] || (t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()))
    .join(' ');
  return `${nameStr} is ${numericValue} ${CODED_UNITS[unitKey]}.`;
}

function compareRunsNewestFirst(left, right) {
  const leftTime = Date.parse(left?.createdAt || '');
  const rightTime = Date.parse(right?.createdAt || '');
  const difference = rightTime - leftTime;
  if (Number.isFinite(difference) && difference !== 0) return difference;
  return String(right?.runId || '').localeCompare(String(left?.runId || ''));
}

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

function buildDraft(output) {
  if (!output) return {};
  return Object.fromEntries(EDITABLE_SECTIONS.map(([key]) => [
    key,
    key === 'clinicalSummary' ? textValue(output[key]) : lines(output[key]),
  ]));
}

function formatStatus(value) {
  return (value || 'UNKNOWN').replaceAll('_', ' ');
}

function formatDate(value) {
  if (!value) return 'Time unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function EvidenceList({ values, emptyText = 'None reported.' }) {
  const items = listValue(values);
  if (items.length === 0) return <p className="cds-review__empty-copy">{emptyText}</p>;
  return (
    <ul className="cds-review__list">
      {items.map((item, index) => {
        const key = typeof item === 'string'
          ? item
          : item?.evidenceId || item?.chunkId || `evidence-${index}`;
        return (
          <li key={`${key}-${index}`}>
            {typeof item === 'string' ? (
              item
            ) : (
              <>
                <strong>{item?.title || item?.sourceTitle || item?.evidenceId || 'Approved evidence'}</strong>
                {(item?.section || item?.page) && (
                  <span>
                    {[item.section, item.page ? `p. ${item.page}` : null].filter(Boolean).join(' · ')}
                  </span>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Modal({ title, children, onClose, closeDisabled = false }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    dialogRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && !closeDisabled) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = [...dialogRef.current.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    )];
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="cds-review__modal-backdrop">
      <div
        ref={dialogRef}
        className="cds-review__modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="cds-review__modal-header">
          <h3>{title}</h3>
          <button
            type="button"
            className="cds-review__close"
            aria-label={`Close ${title}`}
            disabled={closeDisabled}
            onClick={onClose}
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SuggestionSection({
  sectionKey,
  label,
  output,
  draft,
  editing,
  canEdit,
  onStartEdit,
  onCancelEdit,
  onChange,
}) {
  const isSummary = sectionKey === 'clinicalSummary';
  const isEditable = EDITABLE_SECTIONS.some(([key]) => key === sectionKey);
  const sectionId = `cds-section-${sectionKey}`;
  const values = sectionKey === 'abnormalFindings'
    ? [...listValue(output.urgentWarnings), ...listValue(output.abnormalFindings)].map(humanizeCodedFinding)
    : output[sectionKey];

  return (
    <section
      id={sectionId}
      data-cds-section
      className={`cds-review__section cds-review__section--${sectionKey}`}
      role="region"
      aria-labelledby={`${sectionId}-title`}
    >
      <div className="cds-review__section-heading">
        <h3 id={`${sectionId}-title`}>{label}</h3>
        {isEditable && canEdit && !editing && (
          <button type="button" className="cds-review__text-action" onClick={onStartEdit}>
            Edit response
          </button>
        )}
      </div>

      {editing ? (
        <div className="cds-review__editor">
          <label htmlFor={`cds-editor-${sectionKey}`}>{label}</label>
          <textarea
            id={`cds-editor-${sectionKey}`}
            aria-label={label}
            className="form-control"
            rows={isSummary ? 5 : 6}
            value={draft[sectionKey] || ''}
            onChange={(event) => onChange(event.target.value)}
          />
          <button type="button" className="cds-review__text-action" onClick={onCancelEdit}>
            Cancel section edit
          </button>
        </div>
      ) : isSummary ? (
        <p className="cds-review__summary">{textValue(values) || 'No clinical summary was generated.'}</p>
      ) : (
        <EvidenceList
          values={values}
          emptyText={sectionKey === 'citations'
            ? 'No approved evidence was cited.'
            : 'None reported.'}
        />
      )}

      {sectionKey === 'abnormalFindings' && (
        <p className="cds-review__section-note">
          Read-only deterministic and AI safety findings.
        </p>
      )}
      {sectionKey === 'citations' && (
        <p className="cds-review__section-note">
          Evidence is read-only and remains linked to this model run.
        </p>
      )}
    </section>
  );
}

export default function CdsSuggestionReviewPanel({
  appointmentId,
  canManage,
  refreshKey = 0,
  generationStatus = null,
  onApplied,
}) {
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [decision, setDecision] = useState(null);
  const [output, setOutput] = useState(null);
  const [draft, setDraft] = useState({});
  const [editingSections, setEditingSections] = useState(() => new Set());
  const [selectedSections, setSelectedSections] = useState(
    () => new Set(EDITABLE_SECTIONS.map(([key]) => key)),
  );
  const [activeSection, setActiveSection] = useState(CONTENT_SECTIONS[0][0]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draftWarning, setDraftWarning] = useState('');
  const [decisionDialog, setDecisionDialog] = useState(null);
  const [reason, setReason] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [applyDialog, setApplyDialog] = useState(false);
  const [applyMode, setApplyMode] = useState('new');
  const [targetClinicalResultId, setTargetClinicalResultId] = useState('');
  const [clinicalResultDrafts, setClinicalResultDrafts] = useState([]);
  const [applyLoadError, setApplyLoadError] = useState('');
  const rootRef = useRef(null);
  const dirtyRef = useRef(false);
  const initializedRef = useRef(false);
  const appointmentRef = useRef(appointmentId);
  const previousAppointmentRef = useRef(appointmentId);
  const loadSequenceRef = useRef(0);
  const mutationSequenceRef = useRef(0);
  const draftLoadSequenceRef = useRef(0);
  const currentRunIdRef = useRef('');

  appointmentRef.current = appointmentId;
  if (previousAppointmentRef.current !== appointmentId) {
    loadSequenceRef.current += 1;
    mutationSequenceRef.current += 1;
    draftLoadSequenceRef.current += 1;
    currentRunIdRef.current = '';
    previousAppointmentRef.current = appointmentId;
  }

  const selectedRun = useMemo(
    () => runs.find((run) => run.runId === selectedRunId) || null,
    [runs, selectedRunId],
  );

  const hydrateRun = useCallback(async (run) => {
    if (!run) {
      return {
        decision: null,
        output: null,
        draft: {},
      };
    }
    const loadedDecision = await aiCdsApi.getDecision(run.runId);
    const original = parseOutput(run.validatedOutputJson);
    const effective = parseOutput(loadedDecision?.editedOutputJson) || original;
    return {
      decision: loadedDecision,
      output: effective,
      draft: buildDraft(effective),
    };
  }, []);

  const load = useCallback(async () => {
    if (!appointmentId) return;
    const requestAppointmentId = appointmentId;
    const seq = ++loadSequenceRef.current;
    if (initializedRef.current && dirtyRef.current) {
      setDraftWarning('Your local suggestion draft was discarded because the clinical context or run changed.');
    }
    setLoading(true);
    setError('');
    try {
      const response = await aiCdsApi.listSuggestions(requestAppointmentId);
      if (appointmentRef.current !== requestAppointmentId
        || seq !== loadSequenceRef.current) return;
      const sorted = [...(response || [])].sort(compareRunsNewestFirst);
      const latest = sorted[0] || null;
      const newRunId = latest?.runId || '';
      if (newRunId !== currentRunIdRef.current) {
        mutationSequenceRef.current += 1;
        draftLoadSequenceRef.current += 1;
        currentRunIdRef.current = newRunId;
        setDecisionDialog(null);
        setApplyDialog(null);
        setDraftWarning('');
        setReason('');
        setDecisionError('');
        setApplyLoadError('');
        setEditingSections(new Set());
        setSelectedSections(new Set(EDITABLE_SECTIONS.map(([key]) => key)));
        setClinicalResultDrafts([]);
        setTargetClinicalResultId('');
        setBusy(false);
        dirtyRef.current = false;
      }
      const hydrated = await hydrateRun(latest);
      if (appointmentRef.current !== requestAppointmentId
        || seq !== loadSequenceRef.current
        || currentRunIdRef.current !== newRunId) return;
      setRuns(latest ? [latest] : []);
      setSelectedRunId(newRunId);
      setDecision(hydrated.decision);
      setOutput(hydrated.output);
      setDraft(hydrated.draft);
      setEditingSections(new Set());
      dirtyRef.current = false;
      initializedRef.current = true;
    } catch (loadError) {
      if (appointmentRef.current !== requestAppointmentId
        || seq !== loadSequenceRef.current) return;
      setRuns([]);
      setSelectedRunId('');
      setDecision(null);
      setOutput(null);
      setError(loadError.response?.data?.message || loadError.message || 'Unable to load AI suggestions.');
    } finally {
      if (appointmentRef.current === requestAppointmentId
        && seq === loadSequenceRef.current) {
        setLoading(false);
      }
    }
  }, [appointmentId, hydrateRun]);

  const operationIsCurrent = (operation, sequenceRef) => (
    appointmentRef.current === operation.appointmentId
    && currentRunIdRef.current === operation.runId
    && sequenceRef.current === operation.sequence
  );

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!output || typeof IntersectionObserver === 'undefined') return undefined;
    const sections = rootRef.current?.querySelectorAll('[data-cds-section]') || [];
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible?.target?.id) {
        setActiveSection(visible.target.id.replace('cds-section-', ''));
      }
    }, {
      rootMargin: '-18% 0px -65% 0px',
      threshold: 0.01,
    });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [output, selectedRunId]);

  const editedContent = useMemo(() => {
    if (!output) return {};
    const changes = {};
    EDITABLE_SECTIONS.forEach(([key]) => {
      const current = key === 'clinicalSummary' ? draft[key] || '' : parseLines(draft[key] || '');
      const original = key === 'clinicalSummary'
        ? textValue(output[key])
        : listValue(output[key]);
      if (JSON.stringify(current) !== JSON.stringify(original)) changes[key] = current;
    });
    return changes;
  }, [draft, output]);

  const hasEdits = Object.keys(editedContent).length > 0;
  dirtyRef.current = hasEdits;

  const approved = decision?.decisionStatus === 'APPROVED_AS_IS'
    || decision?.decisionStatus === 'APPROVED_WITH_EDITS';
  const applied = decision?.applyStatus === 'APPLIED';
  const contextChanged = selectedRun?.contextCurrent === false;
  const derivedStatus = applied
    ? 'APPLIED'
    : contextChanged
      ? 'OUTDATED'
      : decision?.decisionStatus === 'REJECTED'
        ? 'REJECTED'
        : selectedRun?.status;
  const rulesBlocked = selectedRun?.status === 'RULES_BLOCKED'
    || selectedRun?.errorCode === 'RULES_BLOCKED';
  const isReviewStatus = selectedRun?.status === 'NEEDS_DOCTOR_REVIEW';
  const runReadOnly = READ_ONLY_RUN_STATUSES.has(derivedStatus)
    || rulesBlocked
    || Boolean(decision)
    || !isReviewStatus;
  const canReview = Boolean(canManage && selectedRun && !runReadOnly && !contextChanged);
  const canApply = Boolean(
    canManage
    && approved
    && !applied
    && !contextChanged
    && selectedRun?.status !== 'SUPERSEDED',
  );

  const updateDraft = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const cancelSectionEdit = (key) => {
    setDraft((current) => ({
      ...current,
      [key]: key === 'clinicalSummary' ? textValue(output?.[key]) : lines(output?.[key]),
    }));
    setEditingSections((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  };

  const openDecision = (kind) => {
    setDecisionDialog({ kind, runId: selectedRun?.runId || '' });
    setReason('');
    setDecisionError('');
  };

  const submitDecision = async () => {
    if (decisionDialog?.runId !== selectedRun?.runId) {
      setDecisionError('This suggestion has changed. Please review before deciding.');
      return;
    }
    const approvingChanges = decisionDialog?.kind === 'approve' && hasEdits;
    const rejecting = decisionDialog?.kind === 'reject';
    if ((approvingChanges || rejecting) && !reason.trim()) {
      setDecisionError('Reason is required for this decision.');
      return;
    }
    if (!canReview) {
      setDecisionError('This suggestion is read-only. Regenerate from the current context.');
      return;
    }
    const operation = {
      appointmentId,
      runId: decisionDialog.runId,
      sequence: ++mutationSequenceRef.current,
    };
    setBusy(true);
    setDecisionError('');
    try {
      const saved = await aiCdsApi.saveDecision(operation.runId, {
        decision: rejecting
          ? 'REJECTED'
          : approvingChanges ? 'APPROVED_WITH_EDITS' : 'APPROVED_AS_IS',
        editedContent: approvingChanges ? editedContent : null,
        reason: approvingChanges || rejecting ? reason.trim() : null,
        expectedVersion: decision?.version ?? 0,
      });
      if (!operationIsCurrent(operation, mutationSequenceRef)) return;
      setDecision(saved);
      setDecisionDialog(null);
      setEditingSections(new Set());
      dirtyRef.current = false;
      if (saved?.editedOutputJson) {
        const effective = parseOutput(saved.editedOutputJson);
        if (effective) {
          setOutput(effective);
          setDraft(buildDraft(effective));
        }
      }
    } catch (saveError) {
      if (!operationIsCurrent(operation, mutationSequenceRef)) return;
      setDecisionError(saveError.response?.data?.message || 'Unable to save Doctor decision.');
    } finally {
      if (operationIsCurrent(operation, mutationSequenceRef)) {
        setBusy(false);
      }
    }
  };

  const openApply = async () => {
    const operation = {
      appointmentId,
      runId: selectedRun?.runId || '',
      sequence: ++draftLoadSequenceRef.current,
    };
    setApplyDialog({ runId: operation.runId });
    setApplyMode('new');
    setTargetClinicalResultId('');
    setApplyLoadError('');
    try {
      const results = await doctorClinicalResultApi.getAppointmentResults(operation.appointmentId);
      if (!operationIsCurrent(operation, draftLoadSequenceRef)) return;
      setClinicalResultDrafts((results || []).filter(
        (result) => (result.clinicalStatus || result.visibilityStatus || '').toUpperCase() === 'DRAFT',
      ));
    } catch {
      if (!operationIsCurrent(operation, draftLoadSequenceRef)) return;
      setClinicalResultDrafts([]);
      setApplyLoadError('Existing drafts could not be loaded. You can still create a new draft.');
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
    if (applyDialog?.runId !== selectedRun?.runId) {
      setApplyLoadError('This suggestion has changed. Please review before applying.');
      return;
    }
    if (!canApply) {
      setApplyLoadError('This suggestion can no longer be applied.');
      return;
    }
    if (selectedSections.size === 0) {
      setApplyLoadError('Select at least one approved section to apply.');
      return;
    }
    if (applyMode === 'existing' && !targetClinicalResultId) {
      setApplyLoadError('Select an existing draft clinical result.');
      return;
    }
    const operation = {
      appointmentId,
      runId: applyDialog.runId,
      sequence: ++mutationSequenceRef.current,
    };
    setBusy(true);
    setApplyLoadError('');
    try {
      const useExisting = applyMode === 'existing';
      const saved = await aiCdsApi.applySuggestion(operation.runId, {
        selectedSections: EDITABLE_SECTIONS
          .map(([key]) => key)
          .filter((key) => selectedSections.has(key)),
        targetClinicalResultId: useExisting ? Number(targetClinicalResultId) : null,
        createNew: !useExisting,
        expectedDecisionVersion: decision.version,
      });
      if (!operationIsCurrent(operation, mutationSequenceRef)) return;
      setDecision(saved);
      setApplyDialog(null);
      onApplied?.(saved);
    } catch (applyError) {
      if (!operationIsCurrent(operation, mutationSequenceRef)) return;
      setApplyLoadError(applyError.response?.data?.message || 'Unable to apply approved sections.');
    } finally {
      if (operationIsCurrent(operation, mutationSequenceRef)) {
        setBusy(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="cds-review cds-review--loading" aria-label="Loading AI clinical suggestions">
        <div className="cds-review__skeleton cds-review__skeleton--header" />
        <div className="cds-review__skeleton" />
        <div className="cds-review__skeleton cds-review__skeleton--short" />
      </div>
    );
  }

  if (!selectedRun && error) {
    return (
      <div className="cds-review cds-review--state cds-review--error" role="alert">
        <strong>AI suggestions could not be loaded.</strong>
        <p>{error}</p>
        <button type="button" className="btn btn-outline-secondary" onClick={load}>Retry</button>
      </div>
    );
  }

  if (!selectedRun) {
    if (generationStatus?.busy) {
      return (
        <div className="cds-review cds-review--state cds-review--generating" role="status">
          <span className="cds-review__progress-mark" aria-hidden="true" />
          <div>
            <strong>{GENERATION_LABELS[generationStatus.status] || formatStatus(generationStatus.status)}</strong>
            <p>The clinical context is being processed. This panel will update when the run is ready.</p>
          </div>
        </div>
      );
    }
    if (generationStatus?.status === 'FAILED_RETRYABLE') {
      return (
        <div className="cds-review cds-review--state cds-review--empty" role="alert">
          <div>
            <strong>Generation can be retried.</strong>
            <p>Retry from the confirmed context if it has not changed.</p>
            {generationStatus.error && <p>{generationStatus.error}</p>}
          </div>
        </div>
      );
    }
    if (generationStatus?.status === 'FAILED_FINAL') {
      return (
        <div className="cds-review cds-review--state cds-review--error" role="alert">
          <div>
            <strong>Generation could not be completed.</strong>
            <p>Check local AI resources or update the clinical context before starting another run.</p>
            {generationStatus.error && <p>{generationStatus.error}</p>}
          </div>
        </div>
      );
    }
    return (
      <div className="cds-review cds-review--state cds-review--empty">
        <strong>No AI suggestion has been generated yet.</strong>
        <p>Review and confirm the clinical context before starting a new model run.</p>
        {generationStatus?.error && <p role="alert">{generationStatus.error}</p>}
      </div>
    );
  }

  const failedRetryable = selectedRun.status === 'FAILED_RETRYABLE';
  const failedFinal = selectedRun.status === 'FAILED_FINAL';

  return (
    <div className="cds-review" ref={rootRef}>
      <header className="cds-review__header">
        <div className="cds-review__title">
          <span className="cds-review__eyebrow">AI clinical decision support</span>
          <h2>Doctor review workspace</h2>
          <p>
            AI output stays outside the medical record until you approve it and explicitly apply selected sections.
          </p>
        </div>
        <div className="cds-review__run-state">
          <span className={`cds-review__status-badge cds-review__status-badge--${(derivedStatus || '').toLowerCase()}`}>
            {formatStatus(derivedStatus)}
          </span>
          <span>{output?.urgency || 'ROUTINE'} urgency</span>
          <span>{output?.confidence || 'LOW'} confidence</span>
        </div>
      </header>

      <div className="cds-review__latest">
        <span className="cds-review__latest-label">Latest suggestion</span>
        <dl className="cds-review__metadata">
          <div><dt>Context</dt><dd>v{selectedRun.snapshotContextVersion ?? 'Unknown'}</dd></div>
          <div><dt>Model</dt><dd>{selectedRun.modelName || 'Not recorded'}</dd></div>
          <div><dt>Rules</dt><dd>{selectedRun.ruleSetVersion || 'Not recorded'}</dd></div>
          <div><dt>Corpus</dt><dd>{selectedRun.corpusVersion || 'Not recorded'}</dd></div>
          <div><dt>Created</dt><dd>{formatDate(selectedRun.createdAt)}</dd></div>
        </dl>
      </div>

      {generationStatus?.busy && (
        <div className="cds-review__notice cds-review__notice--progress" role="status">
          <span className="cds-review__progress-mark" aria-hidden="true" />
          {GENERATION_LABELS[generationStatus.status] || formatStatus(generationStatus.status)}
        </div>
      )}
      {draftWarning && (
        <div className="cds-review__notice cds-review__notice--warning" role="alert">
          {draftWarning}
        </div>
      )}
      {error && <div className="cds-review__notice cds-review__notice--error" role="alert">{error}</div>}
      {contextChanged && !applied && (
        <div className="cds-review__notice cds-review__notice--warning" role="alert">
          This suggestion is outdated. Return to Clinical context, confirm the updated information, and regenerate before review or apply.
        </div>
      )}
      {contextChanged && applied && (
        <div className="cds-review__notice cds-review__notice--neutral">
          Context has changed since review. The applied record and its audit trail remain unchanged.
        </div>
      )}
      {selectedRun.errorCode === 'RAG_INSUFFICIENT' && (
        <div className="cds-review__notice cds-review__notice--warning">
          Approved guideline evidence was limited. Review the deterministic findings and citations carefully.
        </div>
      )}
      {rulesBlocked && output && (
        <div className="cds-review__notice cds-review__notice--error">
          Clinical rules blocked approval. Resolve the blocking findings and regenerate.
        </div>
      )}
      {failedRetryable && (
        <div className="cds-review__notice cds-review__notice--warning">
          Generation did not finish. Retry from the confirmed context if it has not changed.
        </div>
      )}
      {failedFinal && (
        <div className="cds-review__notice cds-review__notice--error">
          Generation failed permanently. Check local AI resources or update the clinical context before retrying.
        </div>
      )}

      {output ? (
        <div className="cds-review__content">
          <nav className="cds-review__toc" aria-label="Suggestion sections">
            <span>On this report</span>
            <div className="cds-review__toc-links">
              {CONTENT_SECTIONS.map(([key, label]) => (
                <a
                  key={key}
                  href={`#cds-section-${key}`}
                  aria-current={activeSection === key ? 'location' : undefined}
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>

          <div className="cds-review__report">
            {CONTENT_SECTIONS.map(([key, label]) => (
              <SuggestionSection
                key={key}
                sectionKey={key}
                label={label}
                output={output}
                draft={draft}
                editing={editingSections.has(key)}
                canEdit={canReview}
                onStartEdit={() => setEditingSections((current) => new Set(current).add(key))}
                onCancelEdit={() => cancelSectionEdit(key)}
                onChange={(value) => updateDraft(key, value)}
              />
            ))}
          </div>
        </div>
      ) : rulesBlocked ? (
        <div className="cds-review cds-review--state cds-review--error" role="alert">
          <strong>Clinical rules stopped this run before model generation.</strong>
          <p>
            Return to Clinical context, confirm the fasting and pregnancy safety fields,
            then regenerate.
          </p>
        </div>
      ) : (
        <div className="cds-review__notice cds-review__notice--error">
          This run does not contain a validated suggestion report.
        </div>
      )}

      <div className="cds-review__review-bar">
        <div>
          <strong>{applied ? 'Applied to the medical record draft' : approved ? 'Doctor approved' : 'Doctor decision required'}</strong>
          <span>
            {applied
              ? `Medical document ${decision.targetMedicalDocumentId}`
              : hasEdits ? `${Object.keys(editedContent).length} edited section(s)` : 'No local edits'}
          </span>
        </div>
        <div className="cds-review__review-actions">
          <button
            type="button"
            className="btn btn-outline-danger"
            disabled={!canReview || busy}
            onClick={() => openDecision('reject')}
          >
            Reject
          </button>
          <button
            type="button"
            className="btn btn-success"
            disabled={!canReview || busy}
            onClick={() => openDecision('approve')}
          >
            {hasEdits ? 'Approve changes' : 'Approve as is'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canApply || busy}
            onClick={openApply}
          >
            Apply selected sections
          </button>
        </div>
      </div>

      {decisionDialog && (
        <Modal
          title={decisionDialog.kind === 'reject'
            ? 'Reject suggestion'
            : hasEdits ? 'Approve changes' : 'Approve as is'}
          closeDisabled={busy}
          onClose={() => setDecisionDialog(null)}
        >
          <p>
            {decisionDialog.kind === 'reject'
              ? 'The rejected run remains preserved in the audit trail and will not change the medical record.'
              : 'Approval does not apply content to the medical record.'}
          </p>
          {(decisionDialog.kind === 'reject' || hasEdits) && (
            <div className="cds-review__field">
              <label htmlFor="cds-decision-reason">Doctor reason</label>
              <textarea
                id="cds-decision-reason"
                className="form-control"
                rows="3"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          )}
          {decisionError && <div className="cds-review__form-error" role="alert">{decisionError}</div>}
          <div className="cds-review__modal-actions">
            <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => setDecisionDialog(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-success" disabled={busy} onClick={submitDecision}>
              {decisionDialog.kind === 'reject' ? 'Confirm rejection' : 'Confirm approval'}
            </button>
          </div>
        </Modal>
      )}

      {applyDialog && (
        <Modal title="Apply selected sections" closeDisabled={busy} onClose={() => setApplyDialog(false)}>
          <p>Choose exactly which approved content is copied into a Doctor-owned clinical-result draft.</p>
          <fieldset className="cds-review__section-picker">
            <legend>Approved sections</legend>
            {EDITABLE_SECTIONS.map(([key, label]) => (
              <label key={key} className="cds-review__section-choice">
                <input
                  type="checkbox"
                  checked={selectedSections.has(key)}
                  disabled={busy}
                  onChange={() => toggleSection(key)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="cds-review__target-picker">
            <legend>Clinical result target</legend>
            <label>
              <input
                type="radio"
                name="cds-apply-target"
                checked={applyMode === 'new'}
                onChange={() => setApplyMode('new')}
              />
              <span>Create a new draft</span>
            </label>
            <label>
              <input
                type="radio"
                name="cds-apply-target"
                checked={applyMode === 'existing'}
                disabled={clinicalResultDrafts.length === 0}
                onChange={() => setApplyMode('existing')}
              />
              <span>Use an existing draft</span>
            </label>
          </fieldset>
          {applyMode === 'existing' && (
            <div className="cds-review__field">
              <label htmlFor="cds-target-clinical-result">Target clinical result</label>
              <select
                id="cds-target-clinical-result"
                className="form-select"
                value={targetClinicalResultId}
                onChange={(event) => setTargetClinicalResultId(event.target.value)}
              >
                <option value="">Select a draft</option>
                {clinicalResultDrafts.map((result) => (
                  <option key={result.documentId} value={result.documentId}>
                    {result.documentName || result.testName || `Draft ${result.documentId}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          {applyLoadError && <div className="cds-review__form-error" role="alert">{applyLoadError}</div>}
          <div className="cds-review__modal-actions">
            <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => setApplyDialog(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={applySelected}>
              Confirm apply
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
