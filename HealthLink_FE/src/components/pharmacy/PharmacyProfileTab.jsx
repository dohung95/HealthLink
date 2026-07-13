import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadPharmacyAvatar } from '../../api/account';
import { Avatar, getProfileName } from './PharmacyShared';
import PharmacySecurityPanel from './PharmacySecurityPanel';

export default function PharmacyProfileTab({ token, profile, reload, logout }) {
  const fileRef = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  useEffect(() => setAvatarUrl(profile?.avatarUrl || ''), [profile?.avatarUrl]);
  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadPharmacyAvatar(token, file);
      setAvatarUrl(result.avatarUrl);
      toast.success('Avatar uploaded.');
      await reload();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Unable to upload avatar.');
    }
  };
  const name = getProfileName(profile);
  const address = [profile?.address, profile?.district, profile?.city].filter(Boolean).join(', ') || 'No address provided';
  return <div className="pharmacy-profile-unified">
    <section className="pharmacy-card pharmacy-profile-main">
      <div className="profile-section-header"><span className="material-symbols-outlined">store</span><h2>Pharmacy Profile</h2></div>
      <div className="profile-avatar-section"><div className="profile-avatar-wrapper"><Avatar profile={{ ...profile, avatarUrl }} showOnlineStatus /><button aria-label="Upload photo" className="profile-avatar-overlay" onClick={() => fileRef.current?.click()} type="button"><span className="material-symbols-outlined">photo_camera</span></button></div><div className="profile-avatar-info"><strong>{name}</strong><span>{profile?.email || ''}</span><button className="profile-upload-btn" onClick={() => fileRef.current?.click()} type="button"><span className="material-symbols-outlined">upload</span>Upload Photo</button><input ref={fileRef} accept="image/*" hidden onChange={uploadAvatar} type="file" /></div></div>
      <div className="profile-display-fields"><div className="profile-display-row"><span className="profile-display-label">Pharmacy Name</span><strong>{name}</strong></div><div className="profile-display-row"><span className="profile-display-label">Email</span><strong>{profile?.email || '-'}</strong></div><div className="profile-display-row"><span className="profile-display-label">Phone</span><strong>{profile?.phoneNumber || '-'}</strong></div><div className="profile-display-row"><span className="profile-display-label">Address</span><strong>{address}</strong></div></div>
    </section>
    <PharmacySecurityPanel logout={logout} token={token} />
  </div>;
}
