import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

function parseEndTime(appointmentTime, endTime) {
  const now = Date.now();
  const end = endTime
    ? new Date(endTime).getTime()
    : new Date(appointmentTime).getTime() + 30 * 60 * 1000;
  return Math.max(0, Math.floor((end - now) / 1000));
}

const ConsultationTimerStrip = ({ appointmentTime, endTime }) => {
  const [timeLeft, setTimeLeft] = useState(() => parseEndTime(appointmentTime, endTime));
  const warned5 = useRef(false);
  const warned0 = useRef(false);

  useEffect(() => {
    if (!appointmentTime) return;

    if (timeLeft <= 0 && !warned0.current) {
      warned0.current = true;
      toast.warn('Hết giờ tư vấn');
      return;
    }

    const id = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 300 && next > 0 && !warned5.current) {
          warned5.current = true;
          toast.info('5 phút còn lại');
        }
        if (next <= 0 && !warned0.current) {
          warned0.current = true;
          toast.warn('Hết giờ tư vấn');
          clearInterval(id);
        }
        return Math.max(0, next);
      });
    }, 1000);

    return () => { clearInterval(id); };
  }, [appointmentTime]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!appointmentTime) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const tone = timeLeft > 300 ? '#0d6efd' : timeLeft > 0 ? '#ffc107' : '#dc3545';

  return (
    <div
      style={{
        position: 'fixed',
        top: 80,
        right: 16,
        zIndex: 1050,
        fontFamily: "'Courier New', monospace",
        fontSize: '1.25rem',
        fontWeight: 700,
        padding: '6px 14px',
        background: '#fff',
        borderLeft: `4px solid ${tone}`,
        borderRadius: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        lineHeight: 1,
      }}
    >
      {display}
    </div>
  );
};

export default ConsultationTimerStrip;
