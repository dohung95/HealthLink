import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { aiClinicalContextApi } from '@api/aiClinicalContextApi';
import { aiCdsApi } from '@api/aiCdsApi';
import websocketService from '@services/websocketService';
import ClinicalContextPanel from '@components/doctor/clinical/ClinicalContextPanel';
import CdsSuggestionReviewPanel from '@components/doctor/clinical/CdsSuggestionReviewPanel';
import './AiCdsTab.css';

const STEP_CONTEXT = 'context';
const STEP_SUGGESTION = 'suggestion';

const PROGRESS_COPY = {
  QUEUED: 'Suggestion request queued.',
  RETRIEVING: 'Retrieving approved guideline evidence.',
  GENERATING_LOCAL: 'Generating the structured suggestion.',
  GENERATING_FALLBACK: 'Generating with the approved fallback provider.',
  NEEDS_DOCTOR_REVIEW: 'Suggestion ready for doctor review.',
  FAILED_RETRYABLE: 'Generation paused. You can retry with the same context snapshot.',
  FAILED_FINAL: 'Generation failed. Review the context and local AI resources.',
  RULES_BLOCKED: 'Clinical rules blocked generation. Review the safety findings.',
};

const TERMINAL_STATUSES = new Set([
  'NEEDS_DOCTOR_REVIEW',
  'FAILED_RETRYABLE',
  'FAILED_FINAL',
  'RULES_BLOCKED',
  'SUPERSEDED',
]);

function labReportIds(preview) {
  const value = preview?.fields?.verifiedLabReportIds?.value;
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function requestErrorMessage(error) {
  if (error?.response?.status === 409) {
    return 'The clinical context changed before generation. Review the latest version and try again.';
  }
  if (error?.response?.status === 401 || error?.response?.status === 403) {
    return 'You are not authorized to generate a suggestion for this appointment.';
  }
  return 'The suggestion could not be generated. The verified snapshot is retained for a safe retry.';
}

export default function AiCdsTab({
  appointmentId,
  canManage = false,
  isCancelledAppointment = false,
  onNavigateTab,
}) {
  const effectiveCanManage = Boolean(canManage && !isCancelledAppointment);
  const [preview, setPreview] = useState(null);
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [generationStatus, setGenerationStatus] = useState(null);
  const [generationError, setGenerationError] = useState(null);
  const [contextNotice, setContextNotice] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingSnapshot, setPendingSnapshot] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [contextRefreshKey, setContextRefreshKey] = useState(0);
  const [activeStep, setActiveStep] = useState(STEP_CONTEXT);
  const initialStepResolvedRef = useRef(false);
  const generationInFlightRef = useRef(false);
  const activeRunIdRef = useRef(null);
  const knownRunIdsRef = useRef(new Set());
  const prevAppointmentRef = useRef(appointmentId);
  const resetAppointmentRef = useRef(appointmentId);
  const appointmentRef = useRef(appointmentId);
  const summaryRequestSequenceRef = useRef(0);
  const generationRequestSequenceRef = useRef(0);
  const bufferedRunEventsRef = useRef(new Map());
  const lastTerminalStatusRef = useRef(new Map());

  appointmentRef.current = appointmentId;
  if (prevAppointmentRef.current !== appointmentId) {
    summaryRequestSequenceRef.current += 1;
    generationRequestSequenceRef.current += 1;
    generationInFlightRef.current = false;
    prevAppointmentRef.current = appointmentId;
  }

  function resetAppointmentState() {
    setPreview(null);
    setHasSuggestions(false);
    setGenerationStatus(null);
    setGenerationError(null);
    setContextNotice(null);
    setIsGenerating(false);
    setPendingSnapshot(null);
    setRefreshKey(0);
    setContextRefreshKey(0);
    setActiveStep(STEP_CONTEXT);
    initialStepResolvedRef.current = false;
    generationInFlightRef.current = false;
    activeRunIdRef.current = null;
    knownRunIdsRef.current = new Set();
    bufferedRunEventsRef.current = new Map();
    lastTerminalStatusRef.current = new Map();
  }

  const snapshotMatches = useCallback(function snapshotMatches(snapshot, preview) {
    if (!snapshot || !preview) return false;
    return snapshot.appointmentId === appointmentId
      && snapshot.contextVersion === preview.contextVersion
      && snapshot.labIdsKey === JSON.stringify(labReportIds(preview));
  }, [appointmentId]);

  const loadSuggestionSummary = useCallback(async () => {
    if (!appointmentId) return;
    const requestAppointmentId = appointmentId;
    const requestSequence = ++summaryRequestSequenceRef.current;
    try {
      const suggestions = await aiCdsApi.listSuggestions(requestAppointmentId);
      if (appointmentRef.current !== requestAppointmentId
        || summaryRequestSequenceRef.current !== requestSequence) {
        return;
      }
      const runs = Array.isArray(suggestions) ? suggestions : [];
      knownRunIdsRef.current = new Set(runs.map((run) => run?.runId).filter(Boolean));
      setHasSuggestions(runs.length > 0);
      if (!initialStepResolvedRef.current) {
        if (runs.length > 0) {
          setActiveStep(STEP_SUGGESTION);
        }
        initialStepResolvedRef.current = true;
      }
    } catch {
      if (appointmentRef.current !== requestAppointmentId
        || summaryRequestSequenceRef.current !== requestSequence) {
        return;
      }
      if (!initialStepResolvedRef.current) {
        initialStepResolvedRef.current = true;
      }
    }
  }, [appointmentId]);

  useEffect(() => {
    if (resetAppointmentRef.current !== appointmentId) {
      resetAppointmentState();
      resetAppointmentRef.current = appointmentId;
    }
    void loadSuggestionSummary();
  }, [appointmentId, loadSuggestionSummary]);

  useEffect(() => {
    if (!appointmentId) return undefined;

    const unsubscribe = websocketService.subscribeToCdsRuns((event) => {
      if (!event?.runId || !event?.status) return;
      if (event.runId === activeRunIdRef.current
        || knownRunIdsRef.current.has(event.runId)) {
        if (TERMINAL_STATUSES.has(event.status)) {
          const lastTerminal = lastTerminalStatusRef.current.get(event.runId);
          if (lastTerminal === event.status) return;
          lastTerminalStatusRef.current.set(event.runId, event.status);
        }
        setGenerationStatus(event.status);
        if (TERMINAL_STATUSES.has(event.status)) {
          setRefreshKey((current) => current + 1);
          void loadSuggestionSummary();
        }
        return;
      }
      bufferedRunEventsRef.current.set(event.runId, event);
    });

    return () => {
      unsubscribe?.();
    };
  }, [appointmentId, loadSuggestionSummary]);

  const handlePreviewChange = useCallback((nextPreview) => {
    setPreview(nextPreview);
  }, []);

  const handleContextSaved = useCallback((nextPreview) => {
    setPreview(nextPreview);
    setPendingSnapshot(null);
    activeRunIdRef.current = null;
    setGenerationStatus(null);
    setGenerationError(null);
    setRefreshKey((current) => current + 1);
    if (hasSuggestions) {
      setContextNotice(
        'The existing AI suggestion is now outdated. Review this context and generate a new suggestion.',
      );
    } else {
      setContextNotice('Context saved. Confirm it when you are ready to generate.');
    }
  }, [hasSuggestions]);

  const verifiedLabReportIds = useMemo(() => labReportIds(preview), [preview]);
  const canGenerate = effectiveCanManage
    && Boolean(preview?.ready)
    && Boolean(preview?.contextVersion !== undefined)
    && !isGenerating;
  const suggestionGenerationStatus = useMemo(() => (
    generationStatus
      ? {
        status: generationStatus,
        busy: isGenerating || [
          'QUEUED',
          'RETRIEVING',
          'GENERATING_LOCAL',
          'GENERATING_FALLBACK',
        ].includes(generationStatus),
        error: generationError,
      }
      : null
  ), [generationError, generationStatus, isGenerating]);

  const suggestionStepAvailable = hasSuggestions || isGenerating || generationStatus !== null;

  const generate = useCallback(async () => {
    if (!canGenerate || generationInFlightRef.current) return;
    const genAppointmentId = appointmentId;
    const genSequence = ++generationRequestSequenceRef.current;
    generationInFlightRef.current = true;
    setIsGenerating(true);
    setGenerationError(null);
    setContextNotice(null);
    setGenerationStatus('QUEUED');
    setActiveStep(STEP_SUGGESTION);

    let snapshot = snapshotMatches(pendingSnapshot, preview) ? pendingSnapshot : null;

    try {
      if (!snapshot) {
        const created = await aiClinicalContextApi.createSnapshot(genAppointmentId, {
          verifiedLabReportIds,
          expectedContextVersion: preview.contextVersion,
        });
        if (appointmentRef.current !== genAppointmentId
          || generationRequestSequenceRef.current !== genSequence) {
          return;
        }
        snapshot = {
          appointmentId: genAppointmentId,
          snapshotId: created.snapshotId,
          contextVersion: preview.contextVersion,
          labIdsKey: JSON.stringify(verifiedLabReportIds),
        };
        setPendingSnapshot(snapshot);
      }

      const createdRun = await aiCdsApi.createSuggestion(genAppointmentId, {
        snapshotId: snapshot.snapshotId,
        expectedContextVersion: preview.contextVersion,
        verifiedLabReportIds,
      });
      if (appointmentRef.current !== genAppointmentId
        || generationRequestSequenceRef.current !== genSequence) {
        return;
      }
      activeRunIdRef.current = createdRun.runId;
      knownRunIdsRef.current.add(createdRun.runId);
      const bufferedEvent = bufferedRunEventsRef.current.get(createdRun.runId);
      bufferedRunEventsRef.current.clear();
      if (bufferedEvent) {
        setGenerationStatus(bufferedEvent.status);
        if (TERMINAL_STATUSES.has(bufferedEvent.status)) {
          lastTerminalStatusRef.current.set(createdRun.runId, bufferedEvent.status);
          setRefreshKey((current) => current + 1);
          void loadSuggestionSummary();
        }
      } else {
        setGenerationStatus(createdRun.status || 'NEEDS_DOCTOR_REVIEW');
        lastTerminalStatusRef.current.set(createdRun.runId, createdRun.status || 'NEEDS_DOCTOR_REVIEW');
        setRefreshKey((current) => current + 1);
        void loadSuggestionSummary();
      }
      setPendingSnapshot(null);
      setHasSuggestions(true);
      setContextRefreshKey((current) => current + 1);
    } catch (error) {
      if (appointmentRef.current !== genAppointmentId
        || generationRequestSequenceRef.current !== genSequence) {
        return;
      }
      setGenerationStatus('FAILED_RETRYABLE');
      setGenerationError(requestErrorMessage(error));
    } finally {
      if (appointmentRef.current === genAppointmentId
        && generationRequestSequenceRef.current === genSequence) {
        generationInFlightRef.current = false;
        setIsGenerating(false);
      }
    }
  }, [
    appointmentId,
    canGenerate,
    loadSuggestionSummary,
    pendingSnapshot,
    preview,
    snapshotMatches,
    verifiedLabReportIds,
  ]);

  const handleApplied = useCallback(() => {
    setRefreshKey((current) => current + 1);
    setContextRefreshKey((current) => current + 1);
    void loadSuggestionSummary();
  }, [loadSuggestionSummary]);

  const actionLabel = pendingSnapshot && snapshotMatches(pendingSnapshot, preview)
    ? 'Retry generation'
    : hasSuggestions
      ? 'Confirm updated context & regenerate'
      : 'Confirm context & generate';

  const stepperState = (step) => {
    if (step === STEP_CONTEXT) {
      return {
        marker: 1,
        label: 'Clinical context',
        helper: 'Review patient information',
        active: activeStep === STEP_CONTEXT,
        disabled: false,
        completed: activeStep === STEP_SUGGESTION,
      };
    }
    return {
      marker: 2,
      label: 'AI suggestion',
      helper: 'Review generated guidance',
      active: activeStep === STEP_SUGGESTION,
      disabled: !suggestionStepAvailable,
      completed: false,
    };
  };

  const handleStepClick = (step) => {
    if (step === STEP_SUGGESTION && !suggestionStepAvailable) return;
    setActiveStep(step);
  };

  return (
    <section className="ai-cds-workspace" aria-labelledby="ai-cds-workspace-title">
      <header className="ai-cds-workspace__header">
        <div>
          <div className="ai-cds-workspace__labels">
            <span className="ai-cds-workspace__demo-label">Student demo</span>
            <span className="ai-cds-workspace__doctor-label">Doctor review required</span>
          </div>
          <h2 id="ai-cds-workspace-title">AI Clinical Decision Support</h2>
          <p>
            Review the clinical context before generating decision-support guidance.
          </p>
        </div>
        {!effectiveCanManage ? (
          <span className="ai-cds-workspace__readonly">Read only</span>
        ) : null}
      </header>

      <div className="ai-cds-workspace__notice" role="note">
        This student-demo output does not replace clinical judgement and must not be used for real
        diagnosis or treatment.
      </div>

      <nav className="ai-cds-stepper" aria-label="AI CDS workflow">
        <ol className="ai-cds-stepper__list">
          <li>
            <button
              type="button"
              className={`ai-cds-stepper__step${
                stepperState(STEP_CONTEXT).active ? ' ai-cds-stepper__step--active' : ''
              }${stepperState(STEP_CONTEXT).completed ? ' ai-cds-stepper__step--completed' : ''}`}
              onClick={() => handleStepClick(STEP_CONTEXT)}
              aria-current={stepperState(STEP_CONTEXT).active ? 'step' : undefined}
              aria-controls="ai-cds-context-step"
            >
              <span className="ai-cds-stepper__marker">{stepperState(STEP_CONTEXT).marker}</span>
              <span className="ai-cds-stepper__text">
                <span className="ai-cds-stepper__label">{stepperState(STEP_CONTEXT).label}</span>
                <span className="ai-cds-stepper__helper">{stepperState(STEP_CONTEXT).helper}</span>
              </span>
            </button>
          </li>
          <li aria-hidden="true" className="ai-cds-stepper__connector" />
          <li>
            <button
              type="button"
              className={`ai-cds-stepper__step${
                stepperState(STEP_SUGGESTION).active ? ' ai-cds-stepper__step--active' : ''
              }${stepperState(STEP_SUGGESTION).disabled ? ' ai-cds-stepper__step--disabled' : ''}`}
              onClick={() => handleStepClick(STEP_SUGGESTION)}
              disabled={stepperState(STEP_SUGGESTION).disabled}
              aria-current={stepperState(STEP_SUGGESTION).active ? 'step' : undefined}
              aria-controls="ai-cds-suggestion-step"
            >
              <span className="ai-cds-stepper__marker">{stepperState(STEP_SUGGESTION).marker}</span>
              <span className="ai-cds-stepper__text">
                <span className="ai-cds-stepper__label">{stepperState(STEP_SUGGESTION).label}</span>
                <span className="ai-cds-stepper__helper">{stepperState(STEP_SUGGESTION).helper}</span>
              </span>
            </button>
          </li>
        </ol>
      </nav>

<section
        id="ai-cds-context-step"
        className="ai-cds-stage"
        hidden={activeStep !== STEP_CONTEXT}
        aria-hidden={activeStep !== STEP_CONTEXT}
      >
        <div className="ai-cds-stage__inner ai-cds-stage__inner--context">
          <div className="ai-cds-step-one-shell">
            <ClinicalContextPanel
              appointmentId={appointmentId}
              canManage={effectiveCanManage}
              onNavigateTab={onNavigateTab}
              onPreviewChange={handlePreviewChange}
              onSaved={handleContextSaved}
              refreshKey={contextRefreshKey}
              hasExistingSuggestion={hasSuggestions}
            />

            <footer className="ai-cds-step-one-shell__footer">
              {contextNotice ? (
                <div className="ai-cds-generation__context-notice" role="status">
                  {contextNotice}
                </div>
              ) : null}

              {generationError ? (
                <div className="alert alert-warning mb-3" role="alert">
                  {generationError}
                </div>
              ) : null}

              {generationStatus && PROGRESS_COPY[generationStatus] ? (
                <div className="ai-cds-generation__progress" role="status">
                  <span className={`ai-cds-generation__status ${
                    isGenerating ? 'ai-cds-generation__status--active' : ''
                  }`} aria-hidden="true" />
                  <div>
                    <strong>{generationStatus.replaceAll('_', ' ')}</strong>
                    <p>{PROGRESS_COPY[generationStatus]}</p>
                  </div>
                </div>
              ) : null}

              <div className="ai-cds-step-one-shell__actions">
                <div className="ai-cds-step-one-shell__status">
                  {preview?.ready ? 'Ready' : 'Needs review'}
                </div>
                <button
                  type="button"
                  className="btn btn-success ai-cds-step-one-shell__generate"
                  disabled={!canGenerate}
                  onClick={generate}
                >
                  {isGenerating ? 'Preparing suggestion...' : actionLabel}
                </button>
              </div>

              {!preview?.ready ? (
                <p className="ai-cds-generation__helper">
                  Resolve the readiness checks above before generation.
                </p>
              ) : null}
              {!effectiveCanManage ? (
                <p className="ai-cds-generation__helper">
                  This workspace is read-only for the current appointment state.
                </p>
              ) : null}
            </footer>
          </div>
        </div>
      </section>

      <section
        id="ai-cds-suggestion-step"
        className="ai-cds-stage"
        hidden={activeStep !== STEP_SUGGESTION}
        aria-hidden={activeStep !== STEP_SUGGESTION}
      >
        <div className="ai-cds-stage__inner ai-cds-stage__inner--suggestion">
          {generationError && (
            <div className="alert alert-warning mb-3" role="alert">
              {generationError}
            </div>
          )}
          {generationStatus && generationStatus !== 'NEEDS_DOCTOR_REVIEW' && !isGenerating && (
            <button
              type="button"
              className="btn btn-outline-secondary mb-3"
              onClick={() => setActiveStep(STEP_CONTEXT)}
            >
              Back to Clinical context
            </button>
          )}
          <CdsSuggestionReviewPanel
            appointmentId={appointmentId}
            canManage={effectiveCanManage}
            refreshKey={refreshKey}
            generationStatus={suggestionGenerationStatus}
            onApplied={handleApplied}
          />
        </div>
      </section>
    </section>
  );
}
