import React, { memo, useMemo } from 'react';
import { toast } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-calendar/dist/Calendar.css';
import '@components/Css/doctor/doctor-dashboard/doctor-dashboard.css';
import {
  formatDate, formatCompactDate, formatTime, formatDateTime,
  getStatusClassName, getStatusLabel, getTypeClassName,
  toLocalDateValue, buildFollowUpDateTime,
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
import ConsultationTimerStrip from '@components/doctor/ConsultationTimerStrip';

const TABS = [
  { id: 'notes', label: 'Consultation Notes', icon: 'bi-journal-text' },
  { id: 'history', label: 'Medical History', icon: 'bi-clock-history' },
  { id: 'shared', label: 'Shared Records', icon: 'bi-folder2-open' },
  { id: 'prescription', label: 'Prescription', icon: 'bi-capsule-pill' },
  { id: 'followup', label: 'Follow-up', icon: 'bi-calendar-check' },
];

const getRowTimings = (row) => {
  const source = Array.isArray(row?.timings) && row.timings.length > 0
    ? row.timings
    : String(row?.timing || '').split(',').map((v) => v.trim()).filter(Boolean);
  return [...new Set(source.map((v) => String(v).toUpperCase()).filter(Boolean))];
};

const DoctorAppointmentDetail = memo(({ appointment, patient, doctorId, onBack, onOpenAppointmentById }) => {
  const ctx = useAppointmentDetail({ appointment, patient, doctorId, onBack, onOpenAppointmentById });

  const showWorkspaceOverlay = useMemo(() =>
    !ctx.hasStarted && ctx.statusKey === 'scheduled',
    [ctx.hasStarted, ctx.statusKey],
  );

  const prescriptionDraftRows = useMemo(() =>
    Array.isArray(ctx.prescriptionDraft?.medicationRows)
      ? ctx.prescriptionDraft.medicationRows.filter((row) => row?.medicineId)
      : [],
    [ctx.prescriptionDraft],
  );

  const incompletePrescriptionItems = useMemo(() => {
    if (ctx.prescription) return [];
    return prescriptionDraftRows
      .map((row, idx) => {
        const quantity = Number(row?.quantity);
        const totalSupplyDays = Number(row?.totalSupplyDays);
        const timings = getRowTimings(row);
        const isComplete = Number.isFinite(quantity) && quantity >= 1 &&
          Number.isFinite(totalSupplyDays) && totalSupplyDays >= 1 && timings.length > 0;
        return isComplete ? null : {
          index: idx + 1,
          name: row.displayName || row.brandName || row.genericName || row.medicineQuery || `Item #${idx + 1}`,
        };
      })
      .filter(Boolean);
  }, [ctx.prescription, prescriptionDraftRows]);

  const prescriptionReady = useMemo(() =>
    Boolean(ctx.prescription || (prescriptionDraftRows.length > 0 && incompletePrescriptionItems.length === 0)),
    [ctx.prescription, prescriptionDraftRows, incompletePrescriptionItems],
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

  const showTimer = ctx.statusKey === 'inconsultation' || ctx.statusKey === 'inprogress';

  return (
    <>
      {(showTimer && appointment) && (
        <ConsultationTimerStrip
          appointmentTime={appointment.appointmentTime}
          endTime={appointment.endTime}
        />
      )}
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
                onClick={() => {
                  const msg = ctx.hasAppointmentTimeArrived
                    ? 'Please start the consultation first.'
                    : 'Appointment time has not arrived yet.';
                  toast.info(msg, { toastId: 'workspace-locked' });
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    const msg = ctx.hasAppointmentTimeArrived
                      ? 'Please start the consultation first.'
                      : 'Appointment time has not arrived yet.';
                    toast.info(msg, { toastId: 'workspace-locked' });
                  }
                }}
                aria-label="Workspace locked until appointment time"
              >
                <div className="doctor-detail-workspace-overlay__content">
                  <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>lock</span>
                  <p className="doctor-detail-workspace-overlay__title">
                    {ctx.hasAppointmentTimeArrived ? 'Start Consultation First' : 'Appointment Not Yet Started'}
                  </p>
                  <p className="doctor-detail-workspace-overlay__desc">
                    {ctx.hasAppointmentTimeArrived ? (
                      'Click "Start Consultation" in the action bar below to begin.'
                    ) : (
                      'The consultation workspace will be available once the appointment time arrives. You can start the consultation from the action bar below when the time comes.'
                    )}
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
              {getStatusLabel(ctx.currentAppointment?.status)}
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
                followUpAction={ctx.followUpAction}
                onConfirmFollowUp={ctx.handleConfirmFollowUp}
                followUpPaymentStatus={ctx.followUpPaymentStatus}
                sendingPaymentRequest={ctx.sendingPaymentRequest}
                handleSendPaymentRequest={ctx.handleSendPaymentRequest}
                currentAppointment={ctx.currentAppointment}
                followUpNotes={ctx.followUpNotes}
                onFollowUpNotesChange={ctx.setFollowUpNotes}
                renderEmptyState={(title, description) => <EmptyState title={title} description={description} />}
                followUpConsultationType={ctx.followUpConsultationType}
                onFollowUpTypeChange={ctx.setFollowUpConsultationType}
                showRescheduleConfirm={ctx.showRescheduleConfirm}
                isRescheduling={ctx.isRescheduling}
                handleInitiateReschedule={ctx.handleInitiateReschedule}
                handleConfirmRescheduleModal={ctx.handleConfirmRescheduleModal}
                handleCancelRescheduleModal={ctx.handleCancelRescheduleModal}
                handleSaveReschedule={ctx.handleSaveReschedule}
                handleCancelReschedule={ctx.handleCancelReschedule}
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
        notesSaved={Boolean(
          ctx.notesDraft?.diagnosis ||
          ctx.notesDraft?.doctorNotes ||
          ctx.notesDraft?.treatmentPlan ||
          ctx.consultation?.doctorNotes ||
          ctx.consultation?.diagnosis ||
          ctx.consultation?.treatmentPlan
        )}
        prescriptionReady={prescriptionReady}
        prescriptionIncompleteItems={incompletePrescriptionItems}
        followUpConfigured={Boolean(ctx.selectedFollowUpDateTime)}
        followUpInfo={ctx.selectedFollowUpDateTime ? {
          scheduleLabel: ctx.selectedScheduleLabel,
          consultationType: ctx.followUpConsultationType,
        } : null}
        followUpPaymentStatus={ctx.followUpPaymentStatus}
      />
    </div>
    </>
  );
});

DoctorAppointmentDetail.displayName = 'DoctorAppointmentDetail';

export default DoctorAppointmentDetail;
