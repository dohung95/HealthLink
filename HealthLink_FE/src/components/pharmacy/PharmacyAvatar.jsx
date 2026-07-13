import { getProfileName, initials } from '../../utils/pharmacy/pharmacyHelpers';

export function Avatar({ profile, compact = false, showOnlineStatus = false }) {
  const name = getProfileName(profile);
  return (
    <div className={`pharmacy-avatar ${compact ? 'is-compact' : ''}`}>
      {profile?.avatarUrl ? <img alt={name} src={profile.avatarUrl} /> : <span>{initials(name)}</span>}
      {showOnlineStatus && (
        <span
          aria-hidden="true"
          className={`pharmacy-avatar__online-status ${profile?.isOnline ? 'is-online' : 'is-offline'}`}
        />
      )}
    </div>
  );
}
