import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ClinicalResultsTab from './ClinicalResultsTab';
import { doctorClinicalResultApi } from '@api/doctorClinicalResultApi';
import { aiLabReportApi } from '@api/aiLabReportApi';

vi.mock('@api/doctorClinicalResultApi', () => ({
  doctorClinicalResultApi: {
    getAppointmentResults: vi.fn(),
  },
}));

vi.mock('@api/aiLabReportApi', () => ({
  aiLabReportApi: {
    list: vi.fn(),
  },
}));

vi.mock('@components/doctor/clinical/ClinicalContextPanel', () => ({
  default: () => <div>AI clinical context legacy marker</div>,
}));

vi.mock('@components/doctor/clinical/CdsSuggestionReviewPanel', () => ({
  default: () => <div>AI clinical suggestion legacy marker</div>,
}));

describe('ClinicalResultsTab AI CDS separation', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps clinical results focused on reports without rendering CDS context or suggestions', async () => {
    doctorClinicalResultApi.getAppointmentResults.mockResolvedValue([]);
    aiLabReportApi.list.mockResolvedValue([]);

    render(
      <ClinicalResultsTab
        appointmentId={41}
        canManageClinicalResults
        isCancelledAppointment={false}
      />,
    );

    expect(await screen.findByRole('heading', { name: /no clinical results yet/i })).toBeInTheDocument();
    expect(screen.queryByText(/ai clinical context/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ai clinical suggestion/i)).not.toBeInTheDocument();
  });
});
