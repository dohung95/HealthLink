import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DoctorAppointmentDetail from './DoctorAppointmentDetail';
import { useAppointmentDetail } from '@hooks/doctor/useAppointmentDetail';

vi.mock('@hooks/doctor/useAppointmentDetail', () => ({
  useAppointmentDetail: vi.fn(),
}));

vi.mock('./tabs/NotesTab', () => ({ default: () => null }));
vi.mock('./tabs/HistoryTab', () => ({ default: () => null }));
vi.mock('./tabs/PrescriptionTab', () => ({ default: () => null }));
vi.mock('./tabs/SharedRecordsTab', () => ({ default: () => null }));
vi.mock('./tabs/FollowUpTab', () => ({ default: () => null }));
vi.mock('./tabs/ClinicalResultsTab', () => ({ default: () => null }));
vi.mock('./tabs/AiCdsTab', () => ({
  default: ({ onNavigateTab }) => (
    <section>
      <h2>AI Clinical Decision Support</h2>
      <button type="button" onClick={() => onNavigateTab('clinical-results')}>
        Open clinical results source
      </button>
      <button type="button" onClick={() => onNavigateTab('patient-summary')}>
        View patient summary source
      </button>
    </section>
  ),
}));
vi.mock('@components/doctor/ActionBar', () => ({ default: () => null }));
vi.mock('@components/doctor/CompleteConfirmModal', () => ({ default: () => null }));
vi.mock('@components/doctor/PatientSummarySidebar', () => ({
  default: () => <aside className="patient-sidebar">Patient summary</aside>,
}));
vi.mock('@components/doctor/DoctorVitalsGate', () => ({ default: () => null }));
vi.mock('@components/doctor/ConsultationTimerStrip', () => ({ default: () => null }));

describe('DoctorAppointmentDetail AI CDS tab', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the dedicated AI CDS tab and its workspace shell', () => {
    const setActiveTab = vi.fn();
    useAppointmentDetail.mockReturnValue({
      activeTab: 'ai-cds',
      setActiveTab,
      notesDirty: false,
      handleSaveNotes: vi.fn(),
      hasStarted: true,
      statusKey: 'completed',
      patient: { patientId: 'synthetic-patient-1' },
      patientName: 'Synthetic Patient',
      currentAppointment: {
        appointmentId: 41,
        appointmentTime: '2026-07-28T10:00:00',
        status: 'COMPLETED',
        consultationType: 'Video',
      },
      prescriptionDraft: null,
      canManageClinicalResults: true,
      isCancelledAppointment: false,
      isReadOnlyAppointment: false,
    });

    render(
      <DoctorAppointmentDetail
        appointment={{ appointmentId: 41 }}
        patient={{ patientId: 'synthetic-patient-1' }}
      />,
    );

    expect(screen.getByRole('button', { name: 'AI CDS' })).toBeInTheDocument();
    expect(screen.getByRole('heading', {
      name: /ai clinical decision support/i,
    })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /open clinical results source/i }));
    expect(setActiveTab).toHaveBeenCalledWith('clinical-results');

    const patientSummary = document.querySelector('.patient-sidebar');
    patientSummary.scrollIntoView = vi.fn();
    fireEvent.click(screen.getByRole('button', { name: /view patient summary source/i }));
    expect(patientSummary.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
    expect(setActiveTab).toHaveBeenCalledTimes(1);
  });
});
