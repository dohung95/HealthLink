import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import LabReportVerificationPanel from './LabReportVerificationPanel';
import { aiLabReportApi } from '@api/aiLabReportApi';

vi.mock('pdfjs-dist', () => ({ getDocument: vi.fn(() => ({ promise: Promise.resolve({ getPage: vi.fn(() => Promise.resolve({ getViewport: () => ({ width: 1, height: 1 }), render: () => ({ promise: Promise.resolve() }) })) }) })) }));

vi.mock('@api/aiLabReportApi', () => ({
  aiLabReportApi: {
    getVerification: vi.fn().mockResolvedValue({
      reportId: 'report-1', status: 'NEEDS_VERIFICATION', version: 3,
      warnings: [],
      observations: [{ observationId: 1, testNameRaw: 'Glucose', valueText: '126', unitRaw: 'mg/dL', verificationStatus: 'UNVERIFIED', sourcePage: 1, sourceBoundingBox: { x: 0.1, y: 0.1, width: 0.2, height: 0.1 } }],
    }),
    getFile: vi.fn().mockResolvedValue(new Blob(['synthetic'], { type: 'application/pdf' })),
    updateObservation: vi.fn(),
    verify: vi.fn(),
  },
}));

describe('LabReportVerificationPanel', () => {
  beforeAll(() => { URL.createObjectURL = vi.fn(() => 'blob:synthetic'); URL.revokeObjectURL = vi.fn(); HTMLCanvasElement.prototype.getContext = vi.fn(() => ({})); });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('keeps final verification disabled while an active observation is undecided', async () => {
    render(<LabReportVerificationPanel reportId="report-1" canManage />);
    expect(await screen.findByLabelText('testNameRaw-1')).toHaveValue('Glucose');
    expect(screen.getByRole('button', { name: /confirm verification/i })).toBeDisabled();
  });

  it('preserves the local draft and explains how to retry after a 409 conflict', async () => {
    aiLabReportApi.updateObservation.mockRejectedValueOnce({ response: { status: 409 } });
    render(<LabReportVerificationPanel reportId="report-1" canManage />);
    fireEvent.change(await screen.findByLabelText('valueText-1'), { target: { value: '127' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify', exact: true }));
    expect(await screen.findByText(/concurrent update was detected/i)).toBeInTheDocument();
    expect(screen.getByLabelText('valueText-1')).toHaveValue('127');
  });

  it('blocks final confirmation when a verified row still has an unrecognized-unit warning', async () => {
    aiLabReportApi.getVerification.mockResolvedValueOnce({
      reportId: 'report-1', status: 'NEEDS_VERIFICATION', version: 3,
      warnings: [{ code: 'UNIT_NOT_RECOGNIZED', rowOrder: 1, message: 'Correct the OCR unit.' }],
      observations: [{ observationId: 1, rowOrder: 1, testNameRaw: 'Hemoglobin', valueText: '13.4', unitRaw: 'gldL', verificationStatus: 'VERIFIED' }],
    });
    render(<LabReportVerificationPanel reportId="report-1" canManage />);
    expect(await screen.findByText('UNIT_NOT_RECOGNIZED')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm verification/i })).toBeDisabled();
  });

  it('shows confirmation only after the server accepts final verification', async () => {
    const verifiedResponse = {
      reportId: 'report-1', status: 'VERIFIED', version: 4, warnings: [],
      observations: [{ observationId: 1, rowOrder: 1, testNameRaw: 'Glucose', valueText: '126', unitRaw: 'mg/dL', verificationStatus: 'VERIFIED' }],
    };
    aiLabReportApi.getVerification.mockResolvedValueOnce({ ...verifiedResponse, status: 'NEEDS_VERIFICATION', version: 3 }).mockResolvedValueOnce(verifiedResponse);
    aiLabReportApi.verify.mockResolvedValueOnce(verifiedResponse);
    render(<LabReportVerificationPanel reportId="report-1" canManage />);
    await screen.findByLabelText('PDF source page 1');
    const finalize = await screen.findByRole('button', { name: /confirm verification/i });
    expect(finalize).toBeEnabled();
    fireEvent.click(finalize);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm', exact: true }));
    expect(await screen.findByText('VERIFIED')).toBeInTheDocument();
    expect(aiLabReportApi.verify).toHaveBeenCalledWith('report-1', { expectedVersion: 3, observationIds: [1] });
  });

  it('derives numericValue from an edited numeric OCR value before saving', async () => {
    aiLabReportApi.updateObservation.mockResolvedValueOnce({});
    render(<LabReportVerificationPanel reportId="report-1" canManage />);
    await screen.findByLabelText('PDF source page 1');
    fireEvent.change(await screen.findByLabelText('valueText-1'), { target: { value: '127' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify', exact: true }));
    await waitFor(() => expect(aiLabReportApi.updateObservation).toHaveBeenCalledWith('report-1', 1, expect.objectContaining({ numericValue: 127 })));
  });

  it('blocks confirmation and exposes recovery when protected source preview fails', async () => {
    aiLabReportApi.getVerification.mockResolvedValueOnce({
      reportId: 'report-1', status: 'NEEDS_VERIFICATION', version: 3, warnings: [],
      observations: [{ observationId: 1, rowOrder: 1, testNameRaw: 'Glucose', valueText: '126', unitRaw: 'mg/dL', verificationStatus: 'VERIFIED' }],
    });
    aiLabReportApi.getFile.mockRejectedValueOnce(new Error('network'));
    render(<LabReportVerificationPanel reportId="report-1" canManage />);
    expect(await screen.findByText(/source document could not be loaded/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm verification/i })).toBeDisabled();
  });
});
