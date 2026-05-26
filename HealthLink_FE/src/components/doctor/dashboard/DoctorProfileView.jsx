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
    <div className="grid grid-cols-1 gap-4 p-3 lg:grid-cols-12 lg:p-4">
      <section className="flex flex-col gap-4 lg:col-span-5">
        <article className="rounded-lg border border-surface-border bg-surface-container-lowest p-4 shadow-sm md:p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-surface-border bg-primary-fixed text-lg font-bold text-primary">
              {avatarUrl ? (
                <img alt={doctorName} className="h-full w-full object-cover" src={avatarUrl} />
              ) : (
                <span>{getInitials(doctorData?.fullName)}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="mb-1 truncate text-lg font-semibold text-text-main">{doctorName}</h3>
              <p className="mb-0 text-sm font-medium text-primary">{specialty}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
                <span className="material-symbols-outlined text-[18px] text-warning" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
                <span className="font-semibold text-text-main">{rating}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {totalReviews > 0 ? `(${totalReviews} Reviews)` : '(No reviews yet)'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-surface-border pt-4">
            <ProfileMetric label="Experience" value={formatYears(doctorData?.yearsOfExperience)} />
            <ProfileMetric label="Doctor ID" value={doctorId} />
          </div>
        </article>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoTile icon="school" title="Education" value={qualifications} detail="Professional credentials" />
          <InfoTile icon="local_hospital" title="Affiliations" value={clinicName} detail={clinicAddress} />
        </div>

        <article className="rounded-lg border border-surface-border bg-surface-container-lowest p-4 shadow-sm md:p-5">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-main">
            <span className="material-symbols-outlined text-[20px] text-text-muted">description</span>
            Bio
          </h4>
          <p className="mb-0 text-sm leading-6 text-text-muted">{bio}</p>
        </article>
      </section>

      <section className="scroll-mt-24 lg:col-span-7" id="doctor-wallet-section" ref={walletSectionRef}>
        <DoctorWalletTab profile={doctorData} />
      </section>
    </div>
  );
}

function ProfileMetric({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mb-0 truncate text-base font-medium text-text-main">{value}</p>
    </div>
  );
}

function InfoTile({ icon, title, value, detail }) {
  return (
    <article className="rounded-lg border border-surface-border bg-surface-container-lowest p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined rounded bg-primary-fixed p-1 text-[20px] text-primary">{icon}</span>
        <h4 className="mb-0 text-sm font-semibold text-text-main">{title}</h4>
      </div>
      <p className="mb-1 text-sm font-medium text-text-main">{value}</p>
      <p className="mb-0 text-xs font-semibold uppercase tracking-wide text-text-muted">{detail}</p>
    </article>
  );
}
