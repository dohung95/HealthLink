import React, { useEffect, useRef } from 'react';
import DoctorWalletTab from '../profile/DoctorWalletTab';

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

  return (
    <div className="doctor-content-section row g-3">
      {/* Page Header */}
      <div className="col-12">
        <div className="doctor-page-header mb-1">
          <h1 className="doctor-page-header__title">Profile</h1>
          <p className="doctor-page-header__subtitle">Professional information and wallet</p>
        </div>
      </div>

      <section className="col-lg-5 d-flex flex-column gap-3">
        {/* Identity Card */}
        <div className="doctor-profile-card">
          <div className="doctor-profile-card__body">
            <div className="d-flex align-items-start gap-4">
              <div className="doctor-profile-avatar">
                {avatarUrl ? (
                  <img alt={doctorName} src={avatarUrl} />
                ) : (
                  <span>{getInitials(doctorData?.fullName)}</span>
                )}
              </div>

              <div className="doctor-profile-identity">
                <h3 className="doctor-profile-identity__name">{doctorName}</h3>
                <p className="doctor-profile-identity__specialty">{specialty}</p>
                <div className="doctor-profile-identity__rating">
                  <span className="material-symbols-outlined doctor-profile-identity__star">
                    star
                  </span>
                  <span className="doctor-profile-identity__score">{rating}</span>
                  <span className="doctor-profile-identity__reviews">
                    {totalReviews > 0 ? `(${totalReviews} Reviews)` : '(No reviews yet)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="doctor-profile-metrics">
              <ProfileMetric label="Experience" value={formatYears(doctorData?.yearsOfExperience)} />
              <ProfileMetric label="Doctor ID" value={doctorId} />
            </div>
          </div>
        </div>

        {/* Info Tiles */}
        <div className="row g-3">
          <div className="col-12 col-sm-6">
            <div className="doctor-info-tile">
              <div className="doctor-info-tile__icon">
                <span className="material-symbols-outlined">school</span>
              </div>
              <h4 className="doctor-info-tile__title">Education</h4>
              <p className="doctor-info-tile__value">{qualifications}</p>
              <p className="doctor-info-tile__detail">Professional credentials</p>
            </div>
          </div>
          <div className="col-12 col-sm-6">
            <div className="doctor-info-tile">
              <div className="doctor-info-tile__icon">
                <span className="material-symbols-outlined">local_hospital</span>
              </div>
              <h4 className="doctor-info-tile__title">Affiliations</h4>
              <p className="doctor-info-tile__value">{clinicName}</p>
              <p className="doctor-info-tile__detail">{clinicAddress}</p>
            </div>
          </div>
        </div>

        {/* Bio Card */}
        <div className="doctor-profile-bio">
          <div className="doctor-profile-bio__body">
            <div className="doctor-profile-bio__header">
              <span className="material-symbols-outlined doctor-profile-bio__icon">description</span>
              <h4 className="doctor-profile-bio__title">Bio</h4>
            </div>
            <p className="doctor-profile-bio__text">{bio}</p>
          </div>
        </div>
      </section>

      <section className="col-lg-7" id="doctor-wallet-section" ref={walletSectionRef} style={{scrollMarginTop:'6rem'}}>
        <DoctorWalletTab profile={doctorData} />
      </section>
    </div>
  );
}

function ProfileMetric({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="doctor-profile-metric__label">{label}</p>
      <p className="doctor-profile-metric__value">{value}</p>
    </div>
  );
}
