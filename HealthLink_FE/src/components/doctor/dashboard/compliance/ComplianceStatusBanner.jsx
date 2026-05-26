import React, { useEffect, useState } from 'react';
import { doctorComplianceService } from '../../../../api/complianceApi';

const STATUS_META = {
  COMPLIANT: { icon: 'check_circle', label: 'Compliant', text: 'text-success', bg: 'bg-success', soft: 'bg-success/10' },
  IN_PROGRESS: { icon: 'info', label: 'In Progress', text: 'text-warning', bg: 'bg-warning', soft: 'bg-warning/10' },
  PENDING: { icon: 'schedule', label: 'Pending', text: 'text-primary', bg: 'bg-primary', soft: 'bg-primary/10' },
  NON_COMPLIANT: { icon: 'error', label: 'Non-compliant', text: 'text-critical', bg: 'bg-critical', soft: 'bg-critical/10' },
  EXEMPTED: { icon: 'verified_user', label: 'Exempted', text: 'text-text-muted', bg: 'bg-text-muted', soft: 'bg-surface-container' },
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
      <section className="rounded-lg border border-surface-border bg-white p-5 text-sm text-text-muted">
        Loading compliance status...
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-text-main">
        <span className="material-symbols-outlined text-warning">warning</span>
        <span>{error}</span>
        <button className="ml-auto rounded border border-warning px-3 py-1 text-xs font-semibold text-warning" onClick={fetchComplianceStatus} type="button">
          Retry
        </button>
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
    <section className="relative overflow-hidden rounded-lg border border-surface-border bg-surface-container-lowest p-5">
      <div className={`absolute left-0 top-0 h-full w-1 ${meta.bg}`} />
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-start gap-4">
          <span className={`material-symbols-outlined mt-0.5 text-[24px] ${meta.text}`}>{meta.icon}</span>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-3">
              <h3 className="mb-0 text-base font-semibold text-text-main">Schedule Compliance - {formatMonth(currentMonth.complianceMonth)}</h3>
              <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.soft} ${meta.text}`}>
                {meta.label}
              </span>
            </div>
            <p className="mb-3 max-w-2xl text-sm text-text-muted">
              {currentMonth.scheduleActive
                ? currentMonth.statusMessage || 'Patients can book appointments with you.'
                : 'Patients cannot book appointments until minimum schedule hours are met.'}
            </p>
            <button className="flex items-center gap-1 text-xs font-semibold text-primary-container lg:hidden" onClick={() => setExpanded((current) => !current)} type="button">
              {expanded ? 'Hide details' : 'Show details'}
              <span className="material-symbols-outlined text-[16px]">{expanded ? 'expand_less' : 'expand_more'}</span>
            </button>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center lg:gap-6">
          <div className="w-full lg:w-48">
            <div className="mb-1 flex justify-between text-xs font-semibold">
              <span className="text-text-main">{scheduledHours}/{requiredHours} hours</span>
              <span className={meta.text}>{percentage.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
              <div className={`h-full rounded-full ${meta.bg}`} style={{ width: `${percentage}%` }} />
            </div>
          </div>
          {isWarning ? (
            <button className="rounded border border-surface-border bg-white px-4 py-2 text-sm font-semibold text-text-main transition hover:bg-surface-container" onClick={onValidateClick} type="button">
              Validate
            </button>
          ) : null}
          {nextMonth ? (
            <button className="hidden rounded p-2 text-text-muted hover:bg-surface-container lg:flex" onClick={() => setExpanded((current) => !current)} type="button">
              <span className="material-symbols-outlined">{expanded ? 'expand_less' : 'expand_more'}</span>
            </button>
          ) : null}
        </div>
      </div>

      {expanded && nextMonth ? (
        <div className="mt-4 rounded border border-surface-border bg-surface-bright p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-text-main">Next Month: {formatMonth(nextMonth.complianceMonth)}</span>
            <span className="text-text-muted">{(nextMonth.compliancePercentage || 0).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
            <div className="h-full rounded-full bg-primary-container" style={{ width: `${Math.min(nextMonth.compliancePercentage || 0, 100)}%` }} />
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default ComplianceStatusBanner;
