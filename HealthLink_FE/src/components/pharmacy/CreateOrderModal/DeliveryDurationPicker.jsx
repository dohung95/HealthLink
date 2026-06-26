import { useRef } from 'react';

function clampDigit(value) {
  return ((value % 10) + 10) % 10;
}

function updateDigit(digits, index, nextDigit) {
  return digits.map((digit, currentIndex) => (
    currentIndex === index ? clampDigit(nextDigit) : digit
  ));
}

export default function DeliveryDurationPicker({ digits, onChange }) {
  const pointerRef = useRef(null);

  const handlePointerDown = (index) => (e) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    pointerRef.current = { startY: e.clientY, index, accumulated: 0 };
    const onMove = (ev) => {
      if (!pointerRef.current) return;
      const delta = ev.clientY - pointerRef.current.startY;
      if (Math.abs(delta) >= 24) {
        const steps = Math.floor(Math.abs(delta) / 24) * Math.sign(delta);
        pointerRef.current.startY = ev.clientY;
        onChange(updateDigit(digits, pointerRef.current.index, digits[pointerRef.current.index] - steps));
      }
    };
    const onUp = () => {
      pointerRef.current = null;
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  };

  const handleWheel = (index) => (e) => {
    e.preventDefault();
    const direction = e.deltaY > 0 ? -1 : 1;
    onChange(updateDigit(digits, index, digits[index] + direction));
  };

  const handleKeyDown = (index) => (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(updateDigit(digits, index, digits[index] + 1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(updateDigit(digits, index, digits[index] - 1));
    } else if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      onChange(updateDigit(digits, index, Number(e.key)));
    }
  };

  const labels = ['hundreds', 'tens', 'ones'];

  return (
    <div className="pharmacy-duration-picker">
      <div className="pharmacy-duration-picker__digits">
        {digits.map((digit, index) => (
          <button
            key={index}
            className="pharmacy-duration-picker__cell"
            type="button"
            aria-label={`Delivery minutes ${labels[index]} digit`}
            onPointerDown={handlePointerDown(index)}
            onWheel={handleWheel(index)}
            onKeyDown={handleKeyDown(index)}
          >
            <span className="pharmacy-duration-picker__ghost">{clampDigit(digit + 1)}</span>
            <span className="pharmacy-duration-picker__digit">{digit}</span>
            <span className="pharmacy-duration-picker__ghost">{clampDigit(digit - 1)}</span>
          </button>
        ))}
      </div>
      <div className="pharmacy-duration-picker__summary">
        <span className="pharmacy-duration-picker__summary-value">{String(Number(digits.join(''))).padStart(3, '0')} min</span>
        <span className="pharmacy-duration-picker__eta">
          Est. arrival: ~{new Date(Date.now() + Number(digits.join('')) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
