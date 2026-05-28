import React from 'react';
import SharedRecordsView from '../../shared-records/SharedRecordsView';
import '../../Css/SharedRecordsTab.css';

const SharedRecordsTab = ({ doctorId, patientId }) => (
  <SharedRecordsView
    doctorId={doctorId}
    patientFilter={patientId}
    emptyTitle="No Shared Records from This Patient"
    emptyMessage="This patient has not shared any health records with you."
  />
);

export default SharedRecordsTab;
