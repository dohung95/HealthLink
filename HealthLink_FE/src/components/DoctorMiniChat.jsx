import React from 'react';
import MiniChatBox from './chat/MiniChatBox';

export default function DoctorMiniChat(props) {
  const { patientId, patientName, appointmentId, isFullTab, onClose } = props;
  return (
    <MiniChatBox
      partnerUserId={patientId}
      partnerName={patientName || 'Patient'}
      appointmentId={appointmentId}
      isFullTab={isFullTab}
      onClose={onClose}
    />
  );
}
