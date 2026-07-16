import React, { useEffect, useRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  List,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import '@components/Css/doctor/doctor-dashboard/doctor-dashboard.css';

const editorConfig = {
  placeholder: 'Enter details...',
  licenseKey: 'GPL',
  plugins: [Essentials, Paragraph, Bold, Italic, List],
  toolbar: ['bulletedList', 'numberedList', '|', 'undo', 'redo', '|', 'bold', 'italic'],
};

const ConsultationNotesTab = ({
  loadingAppointment,
  canEditClinical,
  notesDraft,
  onNotesChange,
  onSaveNotes,
}) => {
  const isDisabled = !canEditClinical;
  const onSaveRef = useRef(onSaveNotes);

  useEffect(() => {
    onSaveRef.current = onSaveNotes;
  }, [onSaveNotes]);

  useEffect(() => {
    return () => {
      onSaveRef.current();
    };
  }, []);

  const handleChange = (field, value) => {
    onNotesChange(field, value);
  };

  if (loadingAppointment) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-notes-workspace doctor-notes-workspace--consultation">
      <div className="doctor-notes-content">
        <label className="doctor-notes-field">
          <span>Diagnosis</span>
          <div>
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
          <div>
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
          <div>
            <CKEditor
              editor={ClassicEditor}
              data={notesDraft.treatmentPlan}
              onChange={(event, editor) => handleChange('treatmentPlan', editor.getData())}
              disabled={isDisabled}
              config={editorConfig}
            />
          </div>
        </label>
      </div>
    </div>
  );
};

export default ConsultationNotesTab;
