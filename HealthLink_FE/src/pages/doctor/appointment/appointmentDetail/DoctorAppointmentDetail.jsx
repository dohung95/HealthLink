import React, { memo } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-calendar/dist/Calendar.css';
import '@components/Css/doctor/doctor-dashboard/foundation.css';
import '@components/Css/doctor/doctor-dashboard/layout.css';
import '@components/Css/doctor/doctor-dashboard/shared-ui.css';
import '@components/Css/doctor/doctor-dashboard/consultation.css';
import '@components/Css/doctor/doctor-dashboard/responsive.css';
import {
  formatDate, formatCompactDate, formatTime, formatDateTime,
  getStatusClassName, getTypeClassName, getTypeIcon,
  getPatientInitials, calculateAge, toLocalDateValue, buildFollowUpDateTime,
} from '@utils/doctor/tabHelpers';
import { useAppointmentDetail } from '@hooks/doctor/useAppointmentDetail';
import NotesTab from './tabs/NotesTab';
import HistoryTab from './tabs/HistoryTab';
import PrescriptionTab from './tabs/PrescriptionTab';
import SharedRecordsTab from './tabs/SharedRecordsTab';
import FollowUpTab from './tabs/FollowUpTab';
import EmptyState from '@components/doctor/EmptyState';
import AppointmentSummary from '@components/doctor/AppointmentSummary';
import ActionBar from '@components/doctor/ActionBar';
import CompleteConfirmModal from '@components/doctor/CompleteConfirmModal';

const TABS = [
  { id: 'notes', label: 'Consultation Notes', icon: 'bi-journal-text' },
  { id: 'history', label: 'Medical History', icon: 'bi-clock-history' },
  { id: 'shared', label: 'Shared Records', icon: 'bi-folder2-open' },
  { id: 'prescription', label: 'Prescription', icon: 'bi-capsule-pill' },
  { id: 'followup', label: 'Follow-up', icon: 'bi-calendar-check' },
];

const DoctorAppointmentDetail = memo(({ appointment, patient, doctorId, onBack, onOpenAppointmentById }) => {
  const ctx = useAppointmentDetail({ appointment, patient, doctorId, onBack, onOpenAppointmentById });

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
    <div className="doctor-detail-layout doctor-detail-shell">
      <div className="doctor-detail-back">
        <button className="btn btn-link p-0 text-decoration-none" onClick={() => ctx.onBack?.()} type="button">
          <i className="bi bi-arrow-left me-2"></i>
          Back to appointments
        </button>
      </div>

      <div className="doctor-detail-columns">
        <AppointmentSummary
          currentAppointment={ctx.currentAppointment}
          patient={ctx.patient}
          patientName={ctx.patientName}
          patientEmail={ctx.patientEmail}
          getStatusClassName={getStatusClassName}
          getTypeClassName={getTypeClassName}
          formatCompactDate={formatCompactDate}
          formatTime={formatTime}
          calculateAge={calculateAge}
          getPatientInitials={getPatientInitials}
          loadingVitalSign={ctx.loadingVitalSign}
          latestVitalSign={ctx.latestVitalSign}
          visitReason={ctx.visitReason}
        />

        <section className="doctor-detail-card doctor-detail-workspace doctor-detail-workspace--full">
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
                visitReason={ctx.visitReason}
                canEditClinical={ctx.canEditClinical}
                isReadOnlyAppointment={ctx.isReadOnlyAppointment}
                savingNotes={ctx.savingNotes}
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
                getTypeIcon={getTypeIcon}
              />
            ) : null}
            {ctx.activeTab === 'shared' ? <SharedRecordsTab doctorId={ctx.effectiveDoctorId} patientId={ctx.patientId} /> : null}
            {ctx.activeTab === 'prescription' ? (
              <PrescriptionTab
                appointment={ctx.currentAppointment}
                patient={ctx.patient}
                consultation={ctx.consultation}
                prescription={ctx.prescription}
                loadingPrescription={ctx.loadingPrescription}
                onDraftChange={ctx.setPrescriptionDraft}
                readOnly={ctx.isReadOnlyAppointment}
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
                getTypeIcon={getTypeIcon}
                followUpNotes={ctx.followUpNotes}
                onFollowUpNotesChange={ctx.setFollowUpNotes}
                renderEmptyState={(title, description) => <EmptyState title={title} description={description} />}
                followUpConsultationType={ctx.followUpConsultationType}
                onFollowUpTypeChange={ctx.setFollowUpConsultationType}
              />
            ) : null}
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
            getTypeIcon={getTypeIcon}
            currentAppointment={ctx.currentAppointment}
            canEditClinical={ctx.canEditClinical}
            completingAppointment={ctx.completingAppointment}
            onCompleteClick={() => ctx.setShowCompleteConfirmModal(true)}
          />
        </section>
      </div>

      <CompleteConfirmModal
        show={ctx.showCompleteConfirmModal}
        completingAppointment={ctx.completingAppointment}
        onClose={() => ctx.setShowCompleteConfirmModal(false)}
        onConfirm={ctx.handleCompleteAppointment}
      />
    </div>
  );
});

DoctorAppointmentDetail.displayName = 'DoctorAppointmentDetail';

export default DoctorAppointmentDetail;