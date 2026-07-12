import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { uploadPharmacyAvatar } from '../../api/account';
import { Avatar, getProfileName } from './PharmacyShared';
import PharmacySecurityPanel from './PharmacySecurityPanel';

export default function PharmacyProfileTab({ token, profile, reload, logout }) {
  const [params, setParams] = useSearchParams();
  const active = params.get('section') === 'security' ? 'security' : 'profile';
  const fileRef = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  useEffect(() => setAvatarUrl(profile?.avatarUrl || ''), [profile?.avatarUrl]);

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { const result = await uploadPharmacyAvatar(token, file); setAvatarUrl(result.avatarUrl); toast.success('Avatar uploaded.'); await reload(); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to upload avatar.'); }
  };
  const select = (section) => setParams(section === 'security' ? { section: 'security' } : {}, { replace: true });
  const name = getProfileName(profile);
  const address = [profile?.address, profile?.district, profile?.city].filter(Boolean).join(', ') || 'No address provided';

  return <div className="pharmacy-profile-shell">
    <aside className="pharmacy-profile-nav" aria-label="Profile settings">
      <button className={active === 'profile' ? 'is-active' : ''} onClick={() => select('profile')} type="button"><span className="material-symbols-outlined">store</span>Profile</button>
      <button className={active === 'security' ? 'is-active' : ''} onClick={() => select('security')} type="button"><span className="material-symbols-outlined">shield_lock</span>Security</button>
    </aside>
    <main className="pharmacy-profile-content">
      {active === 'security' ? <PharmacySecurityPanel token={token} logout={logout} /> : <section className="pharmacy-card">
        <div className="profile-section-header"><span className="material-symbols-outlined">store</span><h2>Pharmacy Profile</h2></div>
        <div className="profile-avatar-section"><div className="profile-avatar-wrapper"><Avatar profile={{ ...profile, avatarUrl }} showOnlineStatus /><button aria-label="Upload photo" className="profile-avatar-overlay" onClick={() => fileRef.current?.click()} type="button"><span className="material-symbols-outlined">photo_camera</span></button></div><div className="profile-avatar-info"><strong>{name}</strong><span>{profile?.email || ''}</span><button className="profile-upload-btn" onClick={() => fileRef.current?.click()} type="button"><span className="material-symbols-outlined">upload</span>Upload Photo</button><input ref={fileRef} accept="image/*" hidden onChange={uploadAvatar} type="file" /></div></div>
        <div className="profile-display-fields">
          <div className="profile-display-row"><span className="profile-display-label">Pharmacy Name</span><strong>{name}</strong></div>
          <div className="profile-display-row"><span className="profile-display-label">Email</span><strong>{profile?.email || '-'}</strong></div>
          <div className="profile-display-row"><span className="profile-display-label">Phone</span><strong>{profile?.phoneNumber || '-'}</strong></div>
          <div className="profile-display-row"><span className="profile-display-label">Address</span><strong>{address}</strong></div>
        </div>
      </section>}
    </main>
  </div>;
}
