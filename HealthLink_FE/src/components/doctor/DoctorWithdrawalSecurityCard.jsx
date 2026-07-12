import PartnerPinFlow from '../wallet/security/PartnerPinFlow';
import '../wallet/wallet-shared.css';

export default function DoctorWithdrawalSecurityCard({ compact = false }) {
  return <section className="wallet-tx-section wallet-card-shadow" aria-label="Withdrawal PIN security">
    <div className="wallet-tx-header"><div className="wallet-tx-header-left"><span className="wallet-tx-header-icon material-symbols-outlined">pin</span><div><h3 className="wallet-tx-header-title">Withdrawal PIN</h3><p className="partner-pin-muted">Optional before setup. Once configured, every supported withdrawal client requires it.</p></div></div></div>
    <div style={{ padding: compact ? '1rem' : '1.25rem' }}><PartnerPinFlow compact={compact} /></div>
  </section>;
}
