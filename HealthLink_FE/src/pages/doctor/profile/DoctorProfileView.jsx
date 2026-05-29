import React, { useEffect, useRef } from 'react';
import DoctorWalletTab from '@components/doctor/DoctorWalletTab';

const getInitials = (name) => {
  if (!name) return 'DR';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const withDoctorTitle = (name) => {
  if (!name) return 'Doctor';
  return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
};

const formatYears = (value) => {
  const years = Number(value);
  return Number.isFinite(years) && years > 0 ? `${years} Years` : 'Not set';
};

const formatRating = (value) => {
  const rating = Number(value);
  return Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : 'New';
};

const StarRating = ({ rating }) => {
  const numRating = Number(rating);
  if (!Number.isFinite(numRating) || numRating <= 0) return null;

  const fullStars = Math.floor(numRating);
  const hasHalf = numRating - fullStars >= 0.3;
  const stars = [];

  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <span key={`full-${i}`} className="material-symbols-outlined text-warning" style={{ fontSize: '0.875rem', fontVariationSettings: '"FILL" 1' }}>
        star
      </span>
    );
  }
  if (hasHalf) {
    stars.push(
      <span key="half" className="material-symbols-outlined text-warning" style={{ fontSize: '0.875rem' }}>
        star_half
      </span>
    );
  }
  return <>{stars}</>;
};

export default function DoctorProfileView({ doctorData, activeTab = 'personal' }) {
  const walletSectionRef = useRef(null);

  useEffect(() => {
    if (activeTab !== 'wallet') return;

    const frameId = window.requestAnimationFrame(() => {
      walletSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeTab]);

  const doctorName = withDoctorTitle(doctorData?.fullName);
  const avatarUrl = doctorData?.avatarUrl || doctorData?.profileImage || doctorData?.imageUrl;
  const specialty = doctorData?.specialty || doctorData?.specialtyName || 'Specialty not set';
  const rating = formatRating(doctorData?.averageRating);
  const totalReviews = Number(doctorData?.totalReviews || 0);
  const doctorId = doctorData?.doctorId || doctorData?.doctorID || 'Not set';
  const qualifications = doctorData?.qualifications || 'No qualifications added yet';
  const clinicName = doctorData?.clinicName || doctorData?.hospital || 'No affiliation added yet';
  const clinicAddress = doctorData?.clinicAddress || doctorData?.workingAddress || doctorData?.location || 'Address not set';
  const bio = doctorData?.bio || doctorData?.description || 'No professional bio added yet.';
  const yearsOfExperience = Number(doctorData?.yearsOfExperience);

  return (
    <div className="doctor-content-section px-3 px-md-4 py-3 py-md-5">
      <div className="row g-4 g-md-5">
        {/* ========== LEFT COLUMN ========== */}
        <section className="col-lg-5 d-flex flex-column gap-4">
          {/* ---- Identity Card ---- */}
          <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: '1.25rem', background: 'var(--surface)' }}>
            {/* Cover gradient */}
            <div style={{
              height: '6rem',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 50%, #2563eb 100%)',
              position: 'relative'
            }}>
              {/* Online status badge */}
              <div className="position-absolute top-0 end-0 m-3">
                <span className="badge rounded-pill bg-success bg-opacity-90 px-3 py-1.5 small fw-semibold shadow-sm d-inline-flex align-items-center gap-1">
                  <span className="d-inline-block rounded-circle bg-white" style={{ width: '0.5rem', height: '0.5rem', boxShadow: '0 0 0 2px rgba(255,255,255,0.3)' }} />
                  Available
                </span>
              </div>
            </div>

            <div className="card-body px-4 pb-4" style={{ marginTop: '-2.5rem' }}>
              <div className="d-flex align-items-end gap-3 mb-3">
                {/* Avatar */}
                <div className="position-relative flex-shrink-0" style={{ width: '5.5rem', height: '5.5rem' }}>
                  <div className="rounded-4 border border-2 border-white overflow-hidden d-flex align-items-center justify-content-center w-100 h-100 shadow"
                    style={{
                      background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, var(--primary-light) 0%, #d0e1ff 100%)',
                      color: 'var(--primary)',
                      fontSize: '1.5rem',
                      fontWeight: 800
                    }}>
                    {avatarUrl ? (
                      <img alt={doctorName} src={avatarUrl} className="w-100 h-100 object-fit-cover" />
                    ) : (
                      <span>{getInitials(doctorData?.fullName)}</span>
                    )}
                  </div>
                </div>

                {/* Name & Specialty */}
                <div className="min-w-0 pb-1">
                  <h3 className="fw-bold mb-0 text-truncate" style={{ color: 'var(--text-primary)', fontSize: '1.35rem', letterSpacing: '-0.02em' }}>
                    {doctorName}
                  </h3>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <span className="badge rounded-pill fw-semibold d-inline-flex align-items-center gap-1 px-3 py-1.5"
                      style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.8125rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>stethoscope</span>
                      {specialty}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div className="d-flex align-items-center gap-2 mb-3">
                <StarRating rating={doctorData?.averageRating} />
                <span className="fw-bold" style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{rating}</span>
                <span className="text-muted small fw-semibold" style={{ fontSize: '0.75rem' }}>
                  {totalReviews > 0 ? `(${totalReviews} review${totalReviews > 1 ? 's' : ''})` : '(No reviews yet)'}
                </span>
              </div>

              {/* Metrics */}
              <div className="row g-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="col-6">
                  <div className="p-3 rounded-3" style={{ background: 'var(--surface-muted)' }}>
                    <p className="text-muted text-uppercase small fw-bold mb-1" style={{ fontSize: '0.6875rem', letterSpacing: '0.04em' }}>Experience</p>
                    <p className="fw-bold mb-0 d-flex align-items-center gap-1" style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--warning)' }}>workspace_premium</span>
                      {formatYears(yearsOfExperience)}
                    </p>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-3 rounded-3" style={{ background: 'var(--surface-muted)' }}>
                    <p className="text-muted text-uppercase small fw-bold mb-1" style={{ fontSize: '0.6875rem', letterSpacing: '0.04em' }}>Doctor ID</p>
                    <p className="fw-bold mb-0 text-truncate d-flex align-items-center gap-1" style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--primary)' }}>fingerprint</span>
                      {doctorId}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---- Info Tiles ---- */}
          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem', background: 'var(--surface)' }}>
                <div className="card-body p-4">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3"
                    style={{ width: '2.75rem', height: '2.75rem',                    background: 'linear-gradient(135deg, var(--primary-light), #d0e1ff)', color: 'var(--primary)' }}>
                    <span className="material-symbols-outlined">school</span>
                  </div>
                  <h5 className="fw-bold mb-2" style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>Education</h5>
                  <p className="fw-semibold mb-1" style={{ color: 'var(--text-primary)', fontSize: '0.875rem', lineHeight: 1.4 }}>{qualifications}</p>
                  <p className="text-muted small fw-semibold text-uppercase mb-0" style={{ fontSize: '0.6875rem', letterSpacing: '0.04em' }}>Professional credentials</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-sm-6">
              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem', background: 'var(--surface)' }}>
                <div className="card-body p-4">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3"
                    style={{ width: '2.75rem', height: '2.75rem',                    background: 'linear-gradient(135deg, var(--primary-light), #d0e1ff)', color: 'var(--primary)' }}>
                    <span className="material-symbols-outlined">local_hospital</span>
                  </div>
                  <h5 className="fw-bold mb-2" style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>Affiliations</h5>
                  <p className="fw-semibold mb-1" style={{ color: 'var(--text-primary)', fontSize: '0.875rem', lineHeight: 1.4 }}>{clinicName}</p>
                  <p className="text-muted small fw-semibold text-uppercase mb-0" style={{ fontSize: '0.6875rem', letterSpacing: '0.04em' }}>{clinicAddress}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ---- Bio Card ---- */}
          <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: '1rem', background: 'var(--surface)' }}>
            <div className="d-flex">
              {/* Accent bar */}
              <div style={{ width: '4px', background: 'linear-gradient(180deg, var(--primary), var(--primary-border))', flexShrink: 0 }} />
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--primary)' }}>description</span>
                  <h5 className="fw-bold mb-0" style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>Bio</h5>
                </div>
                <p className="mb-0" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>{bio}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== RIGHT COLUMN (Wallet) ========== */}
        <section className="col-lg-7" id="doctor-wallet-section" ref={walletSectionRef} style={{ scrollMarginTop: '6rem' }}>
          <DoctorWalletTab profile={doctorData} />
        </section>
      </div>
    </div>
  );
}
