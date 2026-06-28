import React, { memo, useMemo } from 'react';
import { toast } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-calendar/dist/Calendar.css';
import '@components/Css/doctor/doctor-dashboard/doctor-dashboard.css';
import {
  formatDate, formatCompactDate, formatTime, formatDateTime,
  getStatusClassName, getTypeClassName,
  calculateAge, toLocalDateValue, buildFollowUpDateTime,
} from '@utils/doctor/tabHelpers';
import { useAppointmentDetail } from '@hooks/doctor/useAppointmentDetail';
import NotesTab from './tabs/NotesTab';
import HistoryTab from './tabs/HistoryTab';
import PrescriptionTab from './tabs/PrescriptionTab';
import SharedRecordsTab from './tabs/SharedRecordsTab';
import FollowUpTab from './tabs/FollowUpTab';
import EmptyState from '@components/doctor/EmptyState';
import ActionBar from '@components/doctor/ActionBar';
import CompleteConfirmModal from '@components/doctor/CompleteConfirmModal';
import PatientSummarySidebar from '@components/doctor/PatientSummarySidebar';

const TABS = [
  { id: 'notes', label: 'Consultation Notes', icon: 'bi-journal-text' },
  { id: 'history', label: 'Medical History', icon: 'bi-clock-history' },
  { id: 'shared', label: 'Shared Records', icon: 'bi-folder2-open' },
  { id: 'prescription', label: 'Prescription', icon: 'bi-capsule-pill' },
  { id: 'followup', label: 'Follow-up', icon: 'bi-calendar-check' },
];

const DoctorAppointmentDetail = memo(({ appointment, patient, doctorId, onBack, onOpenAppointmentById }) => {
  const ctx = useAppointmentDetail({ appointment, patient, doctorId, onBack, onOpenAppointmentById });

  const showWorkspaceOverlay = useMemo(() =>
    !ctx.hasAppointmentTimeArrived && !ctx.hasStarted && ctx.statusKey === 'scheduled',
    [ctx.hasAppointmentTimeArrived, ctx.hasStarted, ctx.statusKey],
  );

  if (!appointment || !patient) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-detail-layout">
      <div className="doctor-detail-back">
        <button className="btn btn-link p-0 text-decoration-none" onClick={() => ctx.onBack?.()} type="button">
          <i className="bi bi-arrow-left me-2"></i>
          Back to appointments
        </button>
      </div>

      <div className="doctor-detail-shell">
      <section className="doctor-detail-card doctor-detail-workspace doctor-detail-workspace--full">
        <div className="doctor-detail-with-sidebar">
          <PatientSummarySidebar
            patient={ctx.patient}
            patientName={ctx.patientName}
            visitReason={ctx.visitReason}
            latestVitalSign={ctx.latestVitalSign}
            loadingVitalSign={ctx.loadingVitalSign}
          />
          <div className="doctor-detail-workspace-main" style={{ position: 'relative' }}>
            {showWorkspaceOverlay && (
              <div
                className="doctor-detail-workspace-overlay"
                onClick={() => toast.info('Appointment time has not arrived yet.', { toastId: 'appointment-time-locked' })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    toast.info('Appointment time has not arrived yet.', { toastId: 'appointment-time-locked' });
                  }
                }}
                aria-label="Workspace locked until appointment time"
              >
                <div className="doctor-detail-workspace-overlay__content">
                  <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>lock</span>
                  <p className="doctor-detail-workspace-overlay__title">Appointment Not Yet Started</p>
                  <p className="doctor-detail-workspace-overlay__desc">
                    The consultation workspace will be available once the appointment time arrives.
                    You can start the consultation from the action bar below when the time comes.
                  </p>
                </div>
              </div>
            )}
        <div className="doctor-detail-appt-header">
          <div className="doctor-detail-appt-header__main-row">
            <span className="doctor-detail-appointment-id">
              <i className="bi bi-hash"></i>
              {'Appointment ID: '}{ctx.currentAppointment?.appointmentID || ctx.currentAppointment?.appointmentId || 'N/A'}
            </span>
            <span className={getStatusClassName(ctx.currentAppointment?.status)}>
              {ctx.currentAppointment?.status || 'Unknown'}
            </span>
          </div>
          <div className="doctor-detail-summary__chips">
            <span className={getTypeClassName(ctx.currentAppointment?.consultationType)}>
              {ctx.currentAppointment?.consultationType || 'Consultation'}
            </span>
            <span className="doctor-detail-chip">
              <i className="bi bi-calendar3"></i>
              {formatCompactDate(ctx.currentAppointment?.appointmentTime)}
            </span>
            <span className="doctor-detail-chip">
              <i className="bi bi-clock"></i>
              {formatTime(ctx.currentAppointment?.appointmentTime)}
            </span>
          </div>
        </div>
        <div className="doctor-detail-tabs" role="tablist" aria-label="Appointment detail tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`doctor-detail-tab ${ctx.activeTab === tab.id ? 'doctor-detail-tab--active' : ''}`}
              onClick={() => ctx.setActiveTab(tab.id)}
              type="button"
              title={tab.label}
              aria-label={tab.label}
            >
              <i className={`bi ${tab.icon}`}></i>
              <span className="doctor-detail-tab__label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="doctor-detail-tab-panel doctor-detail-tab-panel--workspace">
          {ctx.activeTab === 'notes' ? (
              <NotesTab
                loadingAppointment={ctx.loadingAppointment}
                canEditClinical={ctx.canEditClinical}
                notesDraft={ctx.notesDraft}
                onNotesChange={ctx.handleNotesDraftChange}
                onSaveNotes={ctx.handleSaveNotes}
              />
            ) : null}
            {ctx.activeTab === 'history' ? (
              <HistoryTab
                loadingHistory={ctx.loadingHistory}
                completedHistory={ctx.completedHistory}
                selectedHistoryAppointment={ctx.selectedHistoryAppointment}
                loadingHistorySnapshot={ctx.loadingHistorySnapshot}
                selectedHistoryConsultation={ctx.selectedHistoryConsultation}
                onViewAppointmentDetail={ctx.handleViewAppointmentDetail}
                renderEmptyState={(title, description) => <EmptyState title={title} description={description} />}
                formatCompactDate={formatCompactDate}
                formatTime={formatTime}
                formatDate={formatDate}
                getStatusClassName={getStatusClassName}
              />
            ) : null}
            {ctx.activeTab === 'shared' ? <SharedRecordsTab doctorId={ctx.effectiveDoctorId} patientId={ctx.patientId} appointmentId={ctx.currentAppointment?.appointmentId} /> : null}
            {ctx.activeTab === 'prescription' ? (
              <PrescriptionTab
                appointment={ctx.currentAppointment}
                patient={ctx.patient}
                consultation={ctx.consultation}
                prescription={ctx.prescription}
                prescriptionDraft={ctx.prescriptionDraft}
                loadingPrescription={ctx.loadingPrescription}
                onDraftChange={ctx.setPrescriptionDraft}
                readOnly={ctx.isReadOnlyAppointment}
                canEditPrescription={ctx.canEditPrescription}
              />
            ) : null}
            {ctx.activeTab === 'followup' ? (
              <FollowUpTab
                canEditFollowUp={ctx.canEditFollowUp}
                consultation={ctx.consultation}
                formatDateTime={formatDateTime}
                loadingFollowUpCalendar={ctx.loadingFollowUpCalendar}
                followUpCalendarDayMap={ctx.followUpCalendarDayMap}
                followUpSelectedDate={ctx.followUpSelectedDate}
                toLocalDateValue={toLocalDateValue}
                onFollowUpMonthChange={ctx.handleFollowUpMonthChange}
                onFollowUpDateChange={ctx.handleFollowUpDateChange}
                loadingFollowUpSlots={ctx.loadingFollowUpSlots}
                followUpSlots={ctx.followUpSlots}
                buildFollowUpDateTime={buildFollowUpDateTime}
                selectedFollowUpDateTime={ctx.selectedFollowUpDateTime}
                savingFollowUp={ctx.savingFollowUp}
                onSelectFollowUpSlot={ctx.handleSelectFollowUpSlot}
                selectedScheduleLabel={ctx.selectedScheduleLabel}
                canCancelFollowUp={ctx.canCancelFollowUp}
                onCancelFollowUp={ctx.handleCancelFollowUp}
                followUpAction={ctx.followUpAction}
                onConfirmFollowUp={ctx.handleConfirmFollowUp}
                currentAppointment={ctx.currentAppointment}
                followUpNotes={ctx.followUpNotes}
                onFollowUpNotesChange={ctx.setFollowUpNotes}
                renderEmptyState={(title, description) => <EmptyState title={title} description={description} />}
                followUpConsultationType={ctx.followUpConsultationType}
                onFollowUpTypeChange={ctx.setFollowUpConsultationType}
              />
            ) : null}
          </div>
          </div>
        </div>

          <ActionBar
            handleChat={ctx.handleChat}
            canStartConsultation={ctx.canStartConsultation}
            hasStarted={ctx.hasStarted}
            hasAppointmentTimeArrived={ctx.hasAppointmentTimeArrived}
            isCancelledAppointment={ctx.isCancelledAppointment}
            isReadOnlyAppointment={ctx.isReadOnlyAppointment}
            startingConsultation={ctx.startingConsultation}
            handleStartConsultation={ctx.handleStartConsultation}
            handleVideoCall={ctx.handleVideoCall}
            joinDisabled={ctx.joinDisabled}
            actionLabel={ctx.actionLabel}
            currentAppointment={ctx.currentAppointment}
            completingAppointment={ctx.completingAppointment}
            onCompleteClick={() => ctx.setShowCompleteConfirmModal(true)}
          />
        </section>
      </div>

      <CompleteConfirmModal
        show={ctx.showCompleteConfirmModal}
        completingAppointment={ctx.completingAppointment}
        copyPrescription={ctx.copyPrescription}
        onCopyPrescriptionChange={ctx.setCopyPrescription}
        hasPendingFollowUp={ctx.hasPendingFollowUp}
        onClose={() => ctx.setShowCompleteConfirmModal(false)}
        onConfirm={ctx.handleCompleteAppointment}
        notesSaved={Boolean(ctx.consultation?.doctorNotes || ctx.consultation?.diagnosis || ctx.consultation?.treatmentPlan)}
        prescriptionReady={Boolean(ctx.prescription || (ctx.prescriptionDraft?.medicationRows?.length > 0))}
        followUpConfigured={Boolean(ctx.hasPendingFollowUp || ctx.consultation?.followUpDate)}
      />
    </div>
  );
});

DoctorAppointmentDetail.displayName = 'DoctorAppointmentDetail';

export default DoctorAppointmentDetail;
