import { describe, expect, it } from 'vitest';
import { shouldOpenAppointmentDetail } from './appointmentDetailAccess';

describe('shouldOpenAppointmentDetail', () => {
  it('allows a completed appointment to remain on its detail page for clinical review', () => {
    expect(shouldOpenAppointmentDetail({ status: 'COMPLETED' })).toBe(true);
  });
});
