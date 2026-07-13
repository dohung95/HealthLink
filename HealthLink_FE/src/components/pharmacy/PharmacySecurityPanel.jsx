import { useRef, useState } from 'react';
import PharmacyPasswordChangeModal from './PharmacyPasswordChangeModal';
import PartnerPinSecurity from '../wallet/security/PartnerPinSecurity';

export default function PharmacySecurityPanel({ token, logout }) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const passwordOpenerRef = useRef(null);
  const openPassword = (event) => {
    passwordOpenerRef.current = event.currentTarget;
    setPasswordOpen(true);
  };
  return <aside aria-label="Security settings" className="pharmacy-security-panel">
    <section className="pharmacy-security-setting"><div><span className="material-symbols-outlined">password</span><div><h2>Password</h2><p>Update the password used to sign in.</p></div></div><button onClick={openPassword} type="button">Change password</button></section>
    <section className="pharmacy-security-setting"><div><span className="material-symbols-outlined">pin</span><div><h2>Withdrawal PIN</h2><PartnerPinSecurity compact /></div></div></section>
    <PharmacyPasswordChangeModal logout={logout} onClose={() => setPasswordOpen(false)} open={passwordOpen} openerRef={passwordOpenerRef} token={token} />
  </aside>;
}
