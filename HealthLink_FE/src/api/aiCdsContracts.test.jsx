import { afterEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from './axiosConfig';
import { aiCdsApi } from './aiCdsApi';
import { aiClinicalContextApi } from './aiClinicalContextApi';

vi.mock('./axiosConfig', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('AI CDS API contracts', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates an immutable snapshot without changing its request body', async () => {
    const payload = {
      verifiedLabReportIds: ['synthetic-report-1'],
      expectedContextVersion: 7,
    };
    axiosInstance.post.mockResolvedValue({ data: { snapshotId: 'snapshot-1' } });

    await expect(aiClinicalContextApi.createSnapshot(41, payload))
      .resolves.toEqual({ snapshotId: 'snapshot-1' });
    expect(axiosInstance.post).toHaveBeenCalledWith(
      '/api/doctor/appointments/41/clinical-context/snapshots',
      payload,
    );
  });

  it('creates a suggestion for an appointment without changing its request body', async () => {
    const payload = {
      snapshotId: 'snapshot-1',
      expectedContextVersion: 7,
      verifiedLabReportIds: ['synthetic-report-1'],
    };
    axiosInstance.post.mockResolvedValue({
      data: { runId: 'run-1', status: 'QUEUED' },
    });

    await expect(aiCdsApi.createSuggestion(41, payload))
      .resolves.toEqual({ runId: 'run-1', status: 'QUEUED' });
    expect(axiosInstance.post).toHaveBeenCalledWith(
      '/api/doctor/appointments/41/cds-suggestions',
      payload,
    );
  });

  it('gets a suggestion through the appointment-scoped detail route', async () => {
    axiosInstance.get.mockResolvedValue({
      data: { runId: 'run-1', status: 'NEEDS_DOCTOR_REVIEW' },
    });

    await expect(aiCdsApi.getSuggestion(41, 'run-1')).resolves.toEqual({
      runId: 'run-1',
      status: 'NEEDS_DOCTOR_REVIEW',
    });
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/api/doctor/appointments/41/cds-suggestions/run-1',
    );
  });
});
