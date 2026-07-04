import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { doctorClinicalResultApi } from '@api/doctorClinicalResultApi';
import ClinicalResultFilePane from './ClinicalResultFilePane';
import ClinicalResultFormPane from './ClinicalResultFormPane';

function buildInitialForm(result) {
  if (!result) {
    return {
      category: '',
      testName: '',
      clinicalStatus: 'DRAFT',
      documentDate: new Date().toISOString().slice(0, 10),
      labFacilityName: '',
      structuredResultsJson: JSON.stringify([]),
      doctorAssessment: '',
      patientSummary: '',
      existingFileLocation: null,
    };
  }
  return {
    category: result.category || '',
    testName: result.testName || '',
    clinicalStatus: result.clinicalStatus || 'PENDING_RESULT',
    documentDate: result.documentDate ? new Date(result.documentDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    labFacilityName: result.labFacilityName || '',
    structuredResultsJson: result.structuredResultsJson || JSON.stringify([]),
    doctorAssessment: result.doctorAssessment || '',
    patientSummary: result.patientSummary || '',
    existingFileLocation: result.fileLocation || null,
  };
}

function hasChanges(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b);
}

export default function ClinicalResultModal({
  appointmentId,
  selectedResult,
  onClose,
  onSaved,
  canManageClinicalResults,
}) {
  const editingId = selectedResult?.documentId || null;
  const [form, setForm] = useState(() => buildInitialForm(selectedResult));
  const [initialForm] = useState(() => buildInitialForm(selectedResult));
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [discardConfirm, setDiscardConfirm] = useState(false);

  const handleChange = useCallback((updated) => {
    setForm(updated);
  }, []);

  const handleFileSelect = useCallback((f) => {
    setFile(f);
  }, []);

  const handleClose = useCallback(() => {
    const currentClean = buildInitialForm(selectedResult);
    const dirty = hasChanges(
      { ...currentClean, ...form, file: file ? true : false },
      { ...currentClean, file: selectedResult?.fileLocation ? true : false }
    ) || !!file;
    if (dirty && !discardConfirm) {
      setDiscardConfirm(true);
      return;
    }
    onClose();
  }, [form, file, selectedResult, discardConfirm, onClose]);

  useEffect(() => {
    if (discardConfirm) {
      setDiscardConfirm(false);
      onClose();
    }
  }, [discardConfirm, onClose]);

  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        file: file || undefined,
        publishNow: false,
      };
      const saved = editingId
        ? await doctorClinicalResultApi.updateResult(editingId, payload)
        : await doctorClinicalResultApi.createResult(appointmentId, payload);
      toast.success(editingId ? 'Clinical result updated' : 'Clinical result saved as draft');
      onSaved(saved);
      onClose();
    } catch (err) {
      console.error('Failed to save:', err);
      toast.error(err.response?.data?.message || 'Failed to save clinical result');
    } finally {
      setSaving(false);
    }
  }, [form, file, editingId, appointmentId, onSaved, onClose]);

  const handlePublish = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        file: file || undefined,
        publishNow: false,
      };
      let docId = editingId;
      if (!editingId) {
        const created = await doctorClinicalResultApi.createResult(appointmentId, payload);
        docId = created.documentId;
      } else {
        await doctorClinicalResultApi.updateResult(editingId, payload);
      }
      let published = null;
      if (docId) {
        published = await doctorClinicalResultApi.publishResult(docId);
        toast.success('Clinical result published');
      }
      onSaved(published);
      onClose();
    } catch (err) {
      console.error('Failed to publish:', err);
      toast.error(err.response?.data?.message || 'Failed to publish clinical result');
    } finally {
      setSaving(false);
    }
  }, [form, file, editingId, appointmentId, onSaved, onClose]);

  return (
    <div className="cr-modal-overlay" onClick={handleClose}>
      <div className="cr-modal cr-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="cr-modal__header">
          <h5 className="cr-modal__title">{editingId ? 'Edit Result' : 'New Result'}</h5>
          <button type="button" className="cr-btn-close" onClick={handleClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        {discardConfirm ? (
          <div className="cr-modal__body cr-modal__body--center">
            <div className="cr-discard-confirm">
              <i className="bi bi-exclamation-triangle cr-discard-confirm__icon"></i>
              <h6>Discard unsaved result?</h6>
              <p>Your uploaded file and edited fields will be cleared.</p>
              <div className="cr-discard-confirm__actions">
                <button type="button" className="cr-btn-secondary" onClick={() => setDiscardConfirm(false)}>
                  Keep editing
                </button>
                <button type="button" className="cr-btn-danger" onClick={() => { setDiscardConfirm(false); onClose(); }}>
                  Discard
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="cr-modal-layout">
            <div className="cr-modal-layout__pane">
              <ClinicalResultFilePane
                file={file}
                onFileSelect={handleFileSelect}
                existingFileLocation={selectedResult?.fileLocation}
              />
            </div>
            <div className="cr-modal-layout__pane">
              <ClinicalResultFormPane
                form={form}
                onChange={handleChange}
                onSaveDraft={handleSaveDraft}
                onPublish={handlePublish}
                saving={saving}
                editingId={editingId}
                appointmentId={appointmentId}
                file={file}
                onFileSelect={handleFileSelect}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
