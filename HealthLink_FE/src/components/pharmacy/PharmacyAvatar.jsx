import { getProfileName, initials } from '../../utils/pharmacy/pharmacyHelpers';

export function Avatar({ profile, compact = false }) {
  const name = getProfileName(profile);
  return (
    <div className={`pharmacy-avatar ${compact ? 'is-compact' : ''}`}>
      {profile?.avatarUrl ? <img alt={name} src={profile.avatarUrl} /> : <span>{initials(name)}</span>}
    </div>
  );
}
