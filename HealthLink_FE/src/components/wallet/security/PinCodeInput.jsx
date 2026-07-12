export default function PinCodeInput({ id, label, value, onChange, disabled = false, error = '' }) {
  const update = (event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6));
  return (
    <label className="partner-pin-field" htmlFor={id}>
      <span>{label}</span>
      <input
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        autoComplete="one-time-code"
        disabled={disabled}
        id={id}
        inputMode="numeric"
        maxLength={6}
        onChange={update}
        pattern="[0-9]{6}"
        type="password"
        value={value}
      />
      <span aria-hidden="true" className="partner-pin-slots">
        {Array.from({ length: 6 }, (_, index) => <span className={value[index] ? 'is-filled' : ''} key={index}>{value[index] ? '•' : ''}</span>)}
      </span>
      {error && <small className="partner-pin-error" id={`${id}-error`}>{error}</small>}
    </label>
  );
}
