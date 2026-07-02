import React, { useState } from 'react';
import { toast } from 'sonner';

import { togglePharmacyOnline } from '../../api/account';

export default function PharmacyOnlineToggle({
  token,
  profile,
  onProfileUpdated,
  variant = 'header',
}) {
  const [updating, setUpdating] = useState(false);
  const hasProfile = Boolean(profile);
  const isOnline = Boolean(profile?.isOnline);
  const statusLabel = updating ? '...' : hasProfile ? (isOnline ? 'Online' : 'Offline') : 'Status';

  const handleToggle = async () => {
    if (!token || !hasProfile || updating) return;

    setUpdating(true);
    try {
      const updatedProfile = await togglePharmacyOnline(token);
      await onProfileUpdated?.(updatedProfile);
      toast.success(updatedProfile?.isOnline ? 'Pharmacy is online.' : 'Pharmacy is offline.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to toggle pharmacy status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <button
      aria-label="Toggle online status"
      aria-pressed={isOnline}
      className={`pharmacy-online-toggle pharmacy-online-toggle--${variant} ${isOnline ? 'is-online' : 'is-offline'}`}
      disabled={updating || !token || !hasProfile}
      onClick={handleToggle}
      title={!hasProfile ? 'Loading status' : isOnline ? 'Go offline' : 'Go online'}
      type="button"
    >
      <span className="pharmacy-online-toggle-track" aria-hidden="true">
        <span className="pharmacy-online-toggle-text">{statusLabel}</span>
        <span className="pharmacy-online-toggle-knob" />
      </span>
    </button>
  );
}
