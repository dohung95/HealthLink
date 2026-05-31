import React, { useEffect, useState } from 'react';
import { doctorComplianceService } from '@api/complianceApi';

const STATUS_META = {
  COMPLIANT: { icon: 'check_circle', label: 'Compliant', badgeClass: 'doctor-status-badge--compliant', progressClass: 'doctor-compliance-banner__progress-fill--compliant', accentClass: 'doctor-compliance-banner__accent--compliant', iconClass: 'doctor-compliance-banner__icon--compliant', progressPctClass: 'doctor-compliance-banner__progress-pct--compliant' },
  IN_PROGRESS: { icon: 'info', label: 'In Progress', badgeClass: 'doctor-status-badge--in-progress', progressClass: 'doctor-compliance-banner__progress-fill--warning', accentClass: 'doctor-compliance-banner__accent--warning', iconClass: 'doctor-compliance-banner__icon--warning', progressPctClass: 'doctor-compliance-banner__progress-pct--warning' },
  PENDING: { icon: 'schedule', label: 'Pending', badgeClass: 'doctor-status-badge--pending', progressClass: 'doctor-compliance-banner__progress-fill--pending', accentClass: 'doctor-compliance-banner__accent--pending', iconClass: 'doctor-compliance-banner__icon--pending', progressPctClass: 'doctor-compliance-banner__progress-pct--compliant' },
  NON_COMPLIANT: { icon: 'error', label: 'Non-compliant', badgeClass: 'doctor-status-badge--non-compliant', progressClass: 'doctor-compliance-banner__progress-fill--error', accentClass: 'doctor-compliance-banner__accent--error', iconClass: 'doctor-compliance-banner__icon--error', progressPctClass: 'doctor-compliance-banner__progress-pct--warning' },
  EXEMPTED: { icon: 'verified_user', label: 'Exempted', badgeClass: 'doctor-status-badge--exempted', progressClass: 'doctor-compliance-banner__progress-fill--compliant', accentClass: 'doctor-compliance-banner__accent--compliant', iconClass: 'doctor-compliance-banner__icon--compliant', progressPctClass: 'doctor-compliance-banner__progress-pct--compliant' },
};

const formatMonth = (monthStr) => {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const getMeta = (status) => STATUS_META[status] || STATUS_META.PENDING;

const ComplianceStatusBanner = ({ onValidateClick }) => {
  const [complianceData, setComplianceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const fetchComplianceStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await doctorComplianceService.getComplianceStatus();
      setComplianceData(data);
    } catch (err) {
      console.error('Error fetching compliance status:', err);
      setError(err.response?.data?.message || 'Failed to load compliance status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceStatus();
  }, []);

  if (loading) {
    return (
      <section className="doctor-compliance-banner">
        <div className="doctor-compliance-banner__body" style={{justifyContent:'center'}}>
          <span className="text-sm text-text-muted">Loading compliance status...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="doctor-compliance-banner">
        <div className="doctor-compliance-banner__body" style={{flexDirection:'row',alignItems:'center',gap:'0.75rem'}}>
          <span className="material-symbols-outlined text-warning">warning</span>
          <span className="text-sm text-text-main flex-1">{error}</span>
          <button className="btn btn-outline-warning btn-sm flex-shrink-0" onClick={fetchComplianceStatus} type="button">Retry</button>
        </div>
      </section>
    );
  }

  if (!complianceData) return null;

  const currentMonth = complianceData;
  const nextMonth = complianceData.nextMonthStatus;
  const meta = getMeta(currentMonth.status);
  const percentage = Math.min(Number(currentMonth.compliancePercentage || 0), 100);
  const scheduledHours = currentMonth.scheduledHours || 0;
  const requiredHours = currentMonth.requiredHours || 0;
  const isWarning = currentMonth.status !== 'COMPLIANT' && currentMonth.status !== 'EXEMPTED';

  return (
    <section className="doctor-compliance-banner">
      <div className={`doctor-compliance-banner__accent ${meta.accentClass}`} />
      <div className="doctor-compliance-banner__body">
        <div className="doctor-compliance-banner__content">
          <span className={`material-symbols-outlined doctor-compliance-banner__icon ${meta.iconClass}`}>{meta.icon}</span>
          <div>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <h3 className="doctor-compliance-banner__info-title">Schedule Compliance - {formatMonth(currentMonth.complianceMonth)}</h3>
              <span className={`doctor-status-badge ${meta.badgeClass}`}>{meta.label}</span>
            </div>
            <p className="doctor-compliance-banner__info-desc">
              {currentMonth.scheduleActive
                ? currentMonth.statusMessage || 'Patients can book appointments with you.'
                : 'Patients cannot book appointments until minimum schedule hours are met.'}
            </p>
            <button className="doctor-compliance-banner__expand-mobile" onClick={() => setExpanded((current) => !current)} type="button">
              {expanded ? 'Hide details' : 'Show details'}
              <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>{expanded ? 'expand_less' : 'expand_more'}</span>
            </button>
          </div>
        </div>

        <div className="doctor-compliance-banner__right">
          <div>
            <div className="doctor-compliance-banner__progress-header">
              <span className="doctor-compliance-banner__progress-hours">{scheduledHours}/{requiredHours} hours</span>
              <span className={`doctor-compliance-banner__progress-pct ${meta.progressPctClass}`}>{percentage.toFixed(0)}%</span>
            </div>
            <div className="doctor-compliance-banner__progress-bar">
              <div className={`doctor-compliance-banner__progress-fill ${meta.progressClass}`} style={{ width: `${percentage}%` }} />
            </div>
          </div>
          <div className="doctor-compliance-banner__actions">
            {isWarning ? (
              <button className="btn btn-outline-primary btn-sm" onClick={onValidateClick} type="button">Validate</button>
            ) : null}
            {nextMonth ? (
              <button className="doctor-compliance-banner__expand" onClick={() => setExpanded((current) => !current)} type="button">
                <span className="material-symbols-outlined">{expanded ? 'expand_less' : 'expand_more'}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {expanded && nextMonth ? (
        <div className="doctor-compliance-banner__next-month">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="fw-semibold text-sm text-text-main">Next Month: {formatMonth(nextMonth.complianceMonth)}</span>
            <span className="text-xs text-text-muted">{(nextMonth.compliancePercentage || 0).toFixed(0)}%</span>
          </div>
          <div className="doctor-compliance-banner__progress-bar">
            <div
              className="doctor-compliance-banner__progress-fill doctor-compliance-banner__progress-fill--pending"
              style={{ width: `${Math.min(nextMonth.compliancePercentage || 0, 100)}%` }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default ComplianceStatusBanner;
