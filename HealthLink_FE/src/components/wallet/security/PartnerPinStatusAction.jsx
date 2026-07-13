export default function PartnerPinStatusAction({ compact = false, error, loading, onStart, status }) {
  if (!status && !error) return <p className="partner-pin-muted">Loading PIN security...</p>;
  if (status?.locked) return <div className="partner-pin-lock"><strong>PIN temporarily locked</strong><span>Try again after {status.lockedUntil || 'the lock period'}.</span></div>;
  return <div className={`partner-pin-status ${compact ? 'is-compact' : ''}`}>
    <div><strong>{status?.configured ? 'Withdrawal PIN is configured' : 'Withdrawal PIN is not configured'}</strong><span>{status?.configured ? 'A PIN is required for supported withdrawal clients.' : 'Use a six-digit PIN to protect withdrawals.'}</span></div>
    <button disabled={loading} onClick={onStart} type="button">{loading ? 'Sending code...' : status?.configured ? 'Change PIN' : 'Create PIN'}</button>
    {error && <small className="partner-pin-error" role="alert">{error}</small>}
  </div>;
}
