import React from 'react';

const shimmer = `
@keyframes doctorShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}`;

const baseStyle = {
  background: 'linear-gradient(90deg, var(--doctor-surface-muted) 25%, var(--doctor-border-light) 50%, var(--doctor-surface-muted) 75%)',
  backgroundSize: '200% 100%',
  animation: 'doctorShimmer 1.5s ease-in-out infinite',
  borderRadius: 'var(--doctor-radius-md)',
};

function SkeletonBlock({ width, height, style }) {
  return (
    <div
      style={{
        ...baseStyle,
        width: width || '100%',
        height: height || '1rem',
        ...style,
      }}
    />
  );
}

export function DoctorSkeletonCard() {
  return (
    <div className="doctor-skeleton-card">
      <style>{shimmer}</style>
      <div className="doctor-skeleton-card__top">
        <SkeletonBlock width="2.75rem" height="2.75rem" style={{ borderRadius: '0.75rem', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <SkeletonBlock width="60%" height="0.875rem" />
          <SkeletonBlock width="40%" height="0.75rem" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <SkeletonBlock height="2.5rem" style={{ borderRadius: 'var(--doctor-radius-sm)' }} />
        <SkeletonBlock height="2.5rem" style={{ borderRadius: 'var(--doctor-radius-sm)' }} />
      </div>
      <SkeletonBlock width="100%" height="2rem" style={{ borderRadius: 'var(--doctor-radius-md)' }} />
    </div>
  );
}

export function DoctorSkeletonList({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      <style>{shimmer}</style>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            border: '1px solid var(--doctor-border)',
            borderRadius: 'var(--doctor-radius-md)',
            background: 'var(--doctor-surface)',
          }}
        >
          <SkeletonBlock width="2.25rem" height="2.25rem" style={{ borderRadius: '999px', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <SkeletonBlock width="55%" height="0.8125rem" />
            <SkeletonBlock width="35%" height="0.6875rem" />
          </div>
          <SkeletonBlock width="4rem" height="1.25rem" style={{ borderRadius: '999px', flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

export function DoctorSkeletonTimeline({ rows = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', padding: '1rem' }}>
      <style>{shimmer}</style>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <SkeletonBlock width="3.5rem" height="0.75rem" />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', paddingTop: '0.25rem' }}>
            <SkeletonBlock width="0.75rem" height="0.75rem" style={{ borderRadius: '999px' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem 0.75rem', border: '1px solid var(--doctor-border-light)', borderRadius: 'var(--doctor-radius-md)' }}>
            <SkeletonBlock width="50%" height="0.75rem" />
            <SkeletonBlock width="30%" height="0.625rem" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DoctorSkeletonPage() {
  return (
    <div className="doctor-skeleton-page">
      <style>{shimmer}</style>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={{ flex: 1, padding: '0.875rem 1rem', border: '1px solid var(--doctor-border-light)', borderRadius: 'var(--doctor-radius-md)' }}>
            <SkeletonBlock width="40%" height="1.25rem" style={{ marginBottom: '0.25rem' }} />
            <SkeletonBlock width="60%" height="0.75rem" />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div>
          <SkeletonBlock height="8rem" style={{ borderRadius: 'var(--doctor-radius-lg)', marginBottom: '1rem' }} />
          <DoctorSkeletonList rows={3} />
        </div>
        <SkeletonBlock height="16rem" style={{ borderRadius: 'var(--doctor-radius-lg)' }} />
      </div>
    </div>
  );
}

export default DoctorSkeletonCard;
