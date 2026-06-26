import React from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Heading,
  List,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import '@components/Css/doctor/doctor-dashboard/doctor-dashboard.css';

const editorConfig = {
  placeholder: 'Enter details...',
  licenseKey: 'GPL',
  plugins: [Essentials, Paragraph, Bold, Italic, Heading, List],
  toolbar: ['heading', '|', 'bold', 'italic', 'bulletedList', 'numberedList', '|', 'undo', 'redo'],
};

const ConsultationNotesTab = ({
  loadingAppointment,
  canEditClinical,
  savingNotes,
  notesDraft,
  onNotesChange,
  onSaveNotes,
  onLockedAction,
  onMarkDirty,
  onMarkClean,
}) => {
  if (loadingAppointment) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const isDisabled = !canEditClinical || savingNotes;

  const handleLockedAction = () => {
    if (!canEditClinical && typeof onLockedAction === 'function') onLockedAction();
  };

  const handleChange = (field, value) => {
    onNotesChange(field, value);
    if (typeof onMarkDirty === 'function') onMarkDirty();
  };

  const handleSave = () => {
    if (!canEditClinical) {
      if (typeof onLockedAction === 'function') onLockedAction();
      return;
    }
    onSaveNotes();
    if (typeof onMarkClean === 'function') onMarkClean();
  };

  return (
    <div className="doctor-notes-workspace doctor-notes-workspace--consultation">
      <div className="doctor-notes-content">
        <label className="doctor-notes-field">
          <span>Diagnosis</span>
          <div onClick={handleLockedAction} onFocus={handleLockedAction}>
            <CKEditor
              editor={ClassicEditor}
              data={notesDraft.diagnosis}
              onChange={(event, editor) => handleChange('diagnosis', editor.getData())}
              disabled={isDisabled}
              config={editorConfig}
            />
          </div>
        </label>

        <label className="doctor-notes-field">
          <span>Doctor Notes</span>
          <div onClick={handleLockedAction} onFocus={handleLockedAction}>
            <CKEditor
              editor={ClassicEditor}
              data={notesDraft.doctorNotes}
              onChange={(event, editor) => handleChange('doctorNotes', editor.getData())}
              disabled={isDisabled}
              config={editorConfig}
            />
          </div>
        </label>

        <label className="doctor-notes-field">
          <span>Treatment Plan</span>
          <div onClick={handleLockedAction} onFocus={handleLockedAction}>
            <CKEditor
              editor={ClassicEditor}
              data={notesDraft.treatmentPlan}
              onChange={(event, editor) => handleChange('treatmentPlan', editor.getData())}
              disabled={isDisabled}
              config={editorConfig}
            />
          </div>
        </label>

        <div className="doctor-notes-actions">
          <button
            className={`btn btn-primary ${isDisabled ? 'disabled' : ''}`}
            aria-disabled={isDisabled}
            onClick={handleSave}
            type="button"
          >
            <i className="bi bi-save me-2"></i>
            {savingNotes ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationNotesTab;
