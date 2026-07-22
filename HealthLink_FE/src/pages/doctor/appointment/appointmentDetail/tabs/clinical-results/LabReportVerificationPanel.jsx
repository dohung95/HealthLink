import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { aiLabReportApi } from '@api/aiLabReportApi';
import * as pdfjsLib from 'pdfjs-dist';

const editableFields = ['testNameRaw', 'valueText', 'unitRaw', 'referenceRangeRaw', 'flagRaw'];

function hasRequiredFields(row) {
  return Boolean(row.testNameRaw?.trim() && row.valueText?.trim());
}

function toObservationUpdate(row, expectedVersion, decision) {
  const numericValue = /^[-+]?\d+(?:[.,]\d+)?$/.test(row.valueText?.trim() || '') ? Number(row.valueText.trim().replace(',', '.')) : null;
  return {
    expectedVersion, decision, testNameRaw: row.testNameRaw, valueText: row.valueText, numericValue,
    comparator: row.comparator ?? null, unitRaw: row.unitRaw ?? null, unitUcum: row.unitUcum ?? null,
    referenceLow: row.referenceLow ?? null, referenceHigh: row.referenceHigh ?? null,
    referenceText: row.referenceText ?? null, abnormalFlag: row.abnormalFlag ?? null,
    testNameNormalized: row.testNameNormalized ?? null, loincCode: row.loincCode ?? null,
  };
}

function SourceViewer({ reportId, selected, onStateChange }) {
  const [url, setUrl] = useState(null);
  const [type, setType] = useState('');
  const [failed, setFailed] = useState(false);
  const canvasRef = React.useRef(null);
  useEffect(() => {
    let active = true; let objectUrl;
    aiLabReportApi.getFile(reportId).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); setType(blob.type); setFailed(false); onStateChange(!blob.type.includes('pdf'));
    }).catch(() => { if (active) { setFailed(true); onStateChange(false); } });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [reportId, onStateChange]);
  const box = selected?.sourceBoundingBox;
  useEffect(() => {
    if (!url || !type.includes('pdf') || !canvasRef.current) return undefined;
    let cancelled = false;
    (async () => { const document = await pdfjsLib.getDocument(url).promise; const page = await document.getPage(selected?.sourcePage || 1); const viewport = page.getViewport({ scale: 1.4 }); const canvas = canvasRef.current; canvas.width = viewport.width; canvas.height = viewport.height; await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise; if (!cancelled) onStateChange(true); })().catch(() => !cancelled && onStateChange(false));
    return () => { cancelled = true; };
  }, [url, type, selected?.sourcePage, onStateChange]);
  if (failed) return <div className="border border-danger rounded p-3 text-danger">Source document could not be loaded. Use Refresh after checking your connection.</div>;
  if (!url) return <div className="border rounded p-3 text-muted">Loading protected source document...</div>;
  if (type.startsWith('image/')) return <div className="position-relative border rounded overflow-auto" style={{ maxHeight: 460 }}>
    <img src={url} alt="Original laboratory report" className="img-fluid d-block" />
    {box && <span aria-label="Selected OCR source area" className="position-absolute border border-danger border-2" style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%`, pointerEvents: 'none' }} />}
  </div>;
  return <div data-testid="pdf-source-page" className="border rounded overflow-auto"><div className="small text-muted p-1">Source page {selected?.sourcePage || 1}</div><div className="position-relative d-inline-block"><canvas ref={canvasRef} aria-label={`PDF source page ${selected?.sourcePage || 1}`} className="img-fluid d-block" />{box && <span aria-label="Selected OCR source area" className="position-absolute border border-danger border-2" style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%`, pointerEvents: 'none' }} />}</div></div>;
}

export default function LabReportVerificationPanel({ reportId, canManage, onVerified }) {
  const [data, setData] = useState(null); const [draft, setDraft] = useState([]); const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false); const [confirmOpen, setConfirmOpen] = useState(false); const [conflict, setConflict] = useState(false); const [sourceReady, setSourceReady] = useState(false); const [localDraft, setLocalDraft] = useState(null);
  const load = useCallback(async () => { const next = await aiLabReportApi.getVerification(reportId); setData(next); setDraft(next.observations || []); setSelectedId(next.observations?.[0]?.observationId ?? null); setConflict(false); }, [reportId]);
  useEffect(() => { load().catch(() => toast.error('Unable to load laboratory verification.')); }, [load]);
  const selected = draft.find((row) => row.observationId === selectedId);
  const unresolvedUnit = useCallback((row) => (data?.warnings || []).some((w) => w.code === 'UNIT_NOT_RECOGNIZED' && (w.observationId === row.observationId || w.rowOrder === row.rowOrder)), [data]);
  const finalReady = useMemo(() => sourceReady && draft.length > 0 && draft.every((row) => row.verificationStatus !== 'UNVERIFIED' && (row.verificationStatus === 'REJECTED' || hasRequiredFields(row)) && !(row.verificationStatus === 'VERIFIED' && unresolvedUnit(row))), [draft, unresolvedUnit, sourceReady]);
  const updateDraft = (id, patch) => setDraft((rows) => rows.map((row) => row.observationId === id ? { ...row, ...patch } : row));
  const saveRow = async (row, decision) => {
    setBusy(true); setConflict(false);
    try { const next = await aiLabReportApi.updateObservation(reportId, row.observationId, toObservationUpdate(row, data.version, decision)); await load(); toast.success('Row saved. It is not final until the report is confirmed.'); return next; }
    catch (error) { if (error.response?.status === 409) { setLocalDraft(draft); const latest = await aiLabReportApi.getVerification(reportId); setData(latest); setConflict(true); toast.error('Another change was saved. Compare the server report with your preserved local draft.'); } else toast.error('Unable to save this row.'); }
    finally { setBusy(false); }
  };
  const verify = async () => { setBusy(true); try { await aiLabReportApi.verify(reportId, { expectedVersion: data.version, observationIds: draft.map((x) => x.observationId) }); await load(); setConfirmOpen(false); toast.success('Laboratory report verified.'); onVerified?.(); } catch (error) { if (error.response?.status === 409) { setConflict(true); toast.error('The report changed. Your draft was kept for retry.'); } else toast.error('Verification was not accepted. Review the blocking rows.'); } finally { setBusy(false); } };
  if (!data) return <div className="p-3 text-muted">Loading laboratory verification...</div>;
  return <section className="card border-primary-subtle shadow-sm mt-3" aria-label="Laboratory report verification">
    <div className="card-header bg-white d-flex flex-wrap gap-2 justify-content-between align-items-center"><div><strong>AI-extracted laboratory results</strong><div className="small text-muted">All OCR values require a doctor decision before final verification.</div></div><span className="badge text-bg-warning">{data.status}</span></div>
    <div className="card-body">
      {conflict && <div className="alert alert-warning" role="alert">A concurrent update was detected. The latest server version is loaded separately; your local draft is preserved. <button type="button" className="btn btn-sm btn-outline-dark ms-2" onClick={() => { setDraft(localDraft || draft); setConflict(false); }}>Use local draft and retry</button></div>}
      {(data.warnings || []).map((warning, index) => <div className="alert alert-danger py-2" key={`${warning.code}-${index}`}><strong>{warning.code}</strong>: {warning.message || 'Correct or reject the affected row before final verification.'}</div>)}
      <div className="row g-3"><div className="col-12 col-xl-7"><div className="table-responsive"><table className="table table-sm align-middle"><thead><tr><th>Test</th><th>Value</th><th>Unit</th><th>Decision</th></tr></thead><tbody>{draft.map((row) => <tr key={row.observationId} className={selectedId === row.observationId ? 'table-primary' : ''} onClick={() => setSelectedId(row.observationId)}>
        {editableFields.slice(0, 3).map((field) => <td key={field}><input aria-label={`${field}-${row.observationId}`} className="form-control form-control-sm" value={row[field] || ''} disabled={!canManage || busy} onChange={(event) => updateDraft(row.observationId, { [field]: event.target.value })} /></td>)}
        <td><div className="btn-group btn-group-sm" role="group"><button type="button" className={`btn ${row.verificationStatus === 'VERIFIED' ? 'btn-success' : 'btn-outline-success'}`} disabled={!canManage || busy || !hasRequiredFields(row)} onClick={() => saveRow(row, 'VERIFIED')}>Verify</button><button type="button" className={`btn ${row.verificationStatus === 'REJECTED' ? 'btn-secondary' : 'btn-outline-secondary'}`} disabled={!canManage || busy} onClick={() => saveRow(row, 'REJECTED')}>Reject</button></div></td>
      </tr>)}</tbody></table></div></div><div className="col-12 col-xl-5"><SourceViewer reportId={reportId} selected={selected} onStateChange={setSourceReady} /></div></div>
      <div className="d-flex flex-wrap justify-content-end gap-2 border-top pt-3"><button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => load()}>Refresh</button><button type="button" className="btn btn-primary" disabled={!canManage || busy || !finalReady || data.status === 'VERIFIED'} onClick={() => setConfirmOpen(true)}>Confirm verification</button></div>
    </div>
    {confirmOpen && <div className="modal d-block" role="dialog" aria-modal="true"><div className="modal-dialog"><div className="modal-content"><div className="modal-header"><h5 className="modal-title">Confirm laboratory verification</h5></div><div className="modal-body">This applies the doctor's reviewed decisions. AI output will not be treated as confirmed until the server accepts this action.</div><div className="modal-footer"><button className="btn btn-outline-secondary" disabled={busy} onClick={() => setConfirmOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={verify}>Confirm</button></div></div></div></div>}
  </section>;
}
