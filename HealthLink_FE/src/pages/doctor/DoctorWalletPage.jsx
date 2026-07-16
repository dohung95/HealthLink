import React from 'react';
import { useOutletContext } from 'react-router-dom';
import DoctorWalletTab from '@components/doctor/DoctorWalletTab';

export default function DoctorWalletPage() {
  const { doctorData } = useOutletContext();

  return (
    <div
      style={{ maxWidth: '860px', margin: '0 auto', width: '100%' }}
    >
      <DoctorWalletTab profile={doctorData} />
    </div>
  );
}
