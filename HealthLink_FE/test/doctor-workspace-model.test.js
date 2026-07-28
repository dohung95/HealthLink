import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DOCTOR_WORKSPACE_TABS,
  createConsultationNotesState,
  hydrateConsultationNotesState,
  markConsultationNotesSaved,
  shouldSaveConsultationNotesOnTabChange,
  updateConsultationNotesState,
} from '../src/utils/doctor/doctorWorkspaceModel.js';

test('doctor consultation workspace includes the prescription tab', () => {
  assert.equal(
    DOCTOR_WORKSPACE_TABS.some((tab) => tab.id === 'prescription'),
    true,
  );
});

test('AI CDS appears immediately after clinical results in the doctor workspace', () => {
  const clinicalResultsIndex = DOCTOR_WORKSPACE_TABS.findIndex(
    (tab) => tab.id === 'clinical-results',
  );

  assert.notEqual(clinicalResultsIndex, -1);
  assert.equal(DOCTOR_WORKSPACE_TABS[clinicalResultsIndex + 1]?.id, 'ai-cds');
  assert.equal(DOCTOR_WORKSPACE_TABS[clinicalResultsIndex + 1]?.label, 'AI CDS');
});

test('server refresh for the same appointment does not overwrite a dirty notes draft', () => {
  const initial = createConsultationNotesState(101, {
    diagnosis: 'Initial diagnosis',
    doctorNotes: '',
    treatmentPlan: '',
  });
  const edited = updateConsultationNotesState(initial, 'doctorNotes', '<p>New local note</p>');

  const hydrated = hydrateConsultationNotesState(edited, 101, {
    diagnosis: 'Initial diagnosis',
    doctorNotes: 'Stale server note',
    treatmentPlan: '',
  });

  assert.equal(hydrated.draft.doctorNotes, '<p>New local note</p>');
  assert.equal(hydrated.dirty, true);
});

test('switching appointments replaces the notes draft with the new appointment data', () => {
  const edited = updateConsultationNotesState(
    createConsultationNotesState(101, {}),
    'diagnosis',
    'Appointment 101 draft',
  );

  const hydrated = hydrateConsultationNotesState(edited, 202, {
    diagnosis: 'Appointment 202 diagnosis',
    doctorNotes: 'Appointment 202 note',
    treatmentPlan: '',
  });

  assert.equal(hydrated.appointmentId, 202);
  assert.equal(hydrated.draft.diagnosis, 'Appointment 202 diagnosis');
  assert.equal(hydrated.dirty, false);
});

test('a save response does not clear dirty state when the doctor edited during the request', () => {
  const beforeSave = updateConsultationNotesState(
    createConsultationNotesState(101, {}),
    'doctorNotes',
    'First note',
  );
  const savedDraft = beforeSave.draft;
  const editedDuringSave = updateConsultationNotesState(beforeSave, 'doctorNotes', 'Latest note');

  const result = markConsultationNotesSaved(editedDuringSave, savedDraft);

  assert.equal(result.draft.doctorNotes, 'Latest note');
  assert.equal(result.dirty, true);
});

test('leaving a dirty consultation notes tab triggers autosave', () => {
  assert.equal(shouldSaveConsultationNotesOnTabChange('notes', 'prescription', true), true);
  assert.equal(shouldSaveConsultationNotesOnTabChange('notes', 'history', false), false);
  assert.equal(shouldSaveConsultationNotesOnTabChange('prescription', 'history', true), false);
});
