import React from 'react';
import { useOutletContext } from 'react-router-dom';
import DoctorReviewsWidget from '../DoctorReviewsWidget';

export default function DoctorReviewsView() {
  const { doctorId } = useOutletContext();
  return <DoctorReviewsWidget doctorId={doctorId} />;
}
