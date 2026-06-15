import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import DoctorWalletTab from '@components/doctor/DoctorWalletTab';

export default function DoctorWalletPage() {
  const { doctorData } = useOutletContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filters = useMemo(() => ({
    searchTerm,
    dateFrom,
    dateTo,
    typeFilter,
    statusFilter,
  }), [searchTerm, dateFrom, dateTo, typeFilter, statusFilter]);

  return (
    <div
      style={{ maxWidth: '860px', margin: '0 auto', width: '100%' }}
    >
      <DoctorWalletTab
        profile={doctorData}
        filters={filters}
        filterControls={{
          searchTerm, setSearchTerm,
          dateFrom, setDateFrom,
          dateTo, setDateTo,
          typeFilter, setTypeFilter,
          statusFilter, setStatusFilter,
        }}
      />
    </div>
  );
}
