import { useState, useEffect } from 'react';

export default function PinCodeInput({
  id,
  label,
  value,
  onChange,
  disabled = false,
  error = '',
  autoComplete = 'one-time-code',
  masked = true,
  allowReveal = false,
}) {
  const [revealed, setRevealed] = useState(false);

  // Reset revealed state when id changes or masked becomes false
  useEffect(() => {
    setRevealed(false);
  }, [id]);

  useEffect(() => {
    if (!masked) setRevealed(false);
  }, [masked]);

  const update = (event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6));
  const inputType = !masked || revealed ? 'text' : 'password';
  const slotChar = (index) => {
    if (!value[index]) return '';
    return revealed || !masked ? value[index] : '•';
  };

  return (
    <label className="partner-pin-field" htmlFor={id}>
      <span>{label}</span>
      <div className="partner-pin-input-wrapper">
        <input
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          disabled={disabled}
          id={id}
          inputMode="numeric"
          maxLength={6}
          onChange={update}
          pattern="[0-9]{6}"
          type={inputType}
          value={value}
        />
        {allowReveal && (
          <button
            aria-label={revealed ? 'Hide PIN' : 'Show PIN'}
            className="partner-pin-reveal-btn"
            disabled={disabled}
            onClick={() => setRevealed((r) => !r)}
            tabIndex={-1}
            title={revealed ? 'Hide PIN' : 'Show PIN'}
            type="button"
          >
            <span className="material-symbols-outlined">
              {revealed ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        )}
      </div>
      <span aria-hidden="true" className="partner-pin-slots">
        {Array.from({ length: 6 }, (_, index) => (
          <span className={value[index] ? 'is-filled' : ''} key={index}>
            {slotChar(index)}
          </span>
        ))}
      </span>
      {error && <small className="partner-pin-error" id={`${id}-error`}>{error}</small>}
    </label>
  );
}
