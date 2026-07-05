import React, { useEffect, useMemo, useState, useCallback, forwardRef } from 'react';
import { toast } from 'react-toastify';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { doctorService } from '@api/doctorApi';
import { appointmentService } from '@api/appointmentApi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import AppointmentCard from '@components/doctor/AppointmentCard';
import { DoctorSkeletonList } from '@components/doctor/DoctorSkeleton';
import DoctorEmptyState from '@components/doctor/DoctorEmptyState';
import DoctorErrorState from '@components/doctor/DoctorErrorState';
import ClinicalResultModal from './appointmentDetail/tabs/clinical-results/ClinicalResultModal';
import ClinicalResultCompactCard from './appointmentDetail/tabs/clinical-results/ClinicalResultCompactCard';
import ClinicalResultDetailPanel from './appointmentDetail/tabs/clinical-results/ClinicalResultDetailPanel';
import { doctorClinicalResultApi } from '@api/doctorClinicalResultApi';
import {
  getPatientName,
  getVisitReason,
  getStatusKey,
  parseAppointmentDate,
  formatTimeFromDate,
} from '@utils/doctor/appointmentHelpers';
import '@components/Css/doctor/doctor-dashboard/doctor-split-patients.css';
import '@components/Css/doctor/doctor-dashboard/_prescriptions-workspace.css';

const DatePickerButton = forwardRef(({ value, onClick }, ref) => (
  <button
    type="button"
    className={`split-patients__date-btn${value ? ' split-patients__date-btn--selected' : ''}`}
    onClick={onClick}
    ref={ref}
    title="Select date"
  >
    <span className="material-symbols-outlined">calendar_today</span>
    {value && <span>{value}</span>}
  </button>
));
DatePickerButton.displayName = 'DatePickerButton';

const PAGE_SIZE = 6;

const STATUS_CHIPS = [
  { key: 'ALL', label: 'All' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export default function DoctorAppointmentHistory() {
  const navigate = useNavigate();
  const { doctorId } = useOutletContext();

  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [appointmentDetail, setAppointmentDetail] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('clinical-results');
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [selectedClinicalResultId, setSelectedClinicalResultId] = useState(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);

  useEffect(() => {
    if (!doctorId) return;
    let mounted = true;
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await doctorService.getDoctorAppointments(doctorId);
        if (mounted) setAllAppointments(data || []);
      } catch (err) {
        console.error('Error fetching appointment history:', err);
        if (mounted) setError('Failed to load appointment history');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAll();
    return () => { mounted = false; };
  }, [doctorId]);

  useEffect(() => {
    if (!selectedAppointmentId) {
      setAppointmentDetail(null);
      setPatientHistory(null);
      return;
    }
    let mounted = true;
    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const appt = allAppointments.find(
          (a) => (a.appointmentId || a.appointmentID) === selectedAppointmentId
        );
        const patientId = appt?.patientId;
        const [detail, history] = await Promise.all([
          appointmentService.getAppointmentDetail(selectedAppointmentId),
          patientId ? doctorService.getMyDoctorPatientHistory(patientId) : Promise.resolve(null),
        ]);
        if (!mounted) return;
        if (detail) setAppointmentDetail(detail);
        if (history) setPatientHistory(history);
      } catch (err) {
        console.error('Failed to load appointment detail:', err);
        if (!mounted) return;
        setAppointmentDetail(null);
      } finally {
        if (mounted) setDetailLoading(false);
      }
    };
    fetchDetail();
    return () => { mounted = false; };
  }, [selectedAppointmentId, allAppointments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, statusFilter, searchTerm]);

  const filteredAppointments = useMemo(() => {
    let list = [...allAppointments];

    if (selectedDate) {
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);
      list = list.filter((a) => {
        const d = parseAppointmentDate(a);
        return d && d >= dayStart && d <= dayEnd;
      });
    }

    if (statusFilter === 'ALL') {
      list = list.filter((a) => ['completed', 'cancelled'].includes(getStatusKey(a)));
    } else if (statusFilter === 'COMPLETED') {
      list = list.filter((a) => getStatusKey(a) === 'completed');
    } else if (statusFilter === 'CANCELLED') {
      list = list.filter((a) => getStatusKey(a) === 'cancelled');
    }

    const query = searchTerm.trim().toLowerCase();
    if (query) {
      list = list.filter((appt) => {
        const haystack = [getPatientName(appt), getVisitReason(appt)]
          .filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(query);
      });
    }

    list.sort((a, b) => {
      const aTime = parseAppointmentDate(a)?.getTime() || 0;
      const bTime = parseAppointmentDate(b)?.getTime() || 0;
      return bTime - aTime;
    });

    return list;
  }, [allAppointments, selectedDate, statusFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredAppointments.slice(start, start + PAGE_SIZE);
  }, [filteredAppointments, safePage]);

  const handleSelectAppointment = useCallback((appt) => {
    const id = appt.appointmentId || appt.appointmentID;
    setSelectedAppointmentId(id);
    setActiveTab('clinical-results');
  }, []);

  const handleDetailRetry = useCallback(() => {
    if (selectedAppointmentId) {
      setSelectedAppointmentId((prev) => ({ ...prev }));
    }
  }, [selectedAppointmentId]);

  const isSelected = (appt) => {
    const id = appt.appointmentId || appt.appointmentID;
    return id === selectedAppointmentId;
  };

  const formatHistoryDate = (value) => {
    if (!value) return 'Not recorded';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('vi-VN');
  };

  const getClinicalResultId = (item) =>
    item?.documentID ?? item?.documentId ?? item?.id ?? null;

  const getDocumentId = (item) =>
    item?.documentID ??
    item?.documentId ??
    item?.id ??
    `${item?.category || 'document'}-${item?.documentName || item?.documentDate || item?.uploadedAt || ''}`;

  const getPrescriptionItems = (prescription) => {
    if (Array.isArray(prescription?.items)) return prescription.items;
    if (Array.isArray(prescription?.medications)) return prescription.medications;
    return [];
  };

  const clinicalResults = useMemo(
    () => patientHistory?.clinicalResults || [],
    [patientHistory]
  );

  const prescriptions = useMemo(
    () => patientHistory?.prescriptions || [],
    [patientHistory]
  );

  const historyDocuments = useMemo(() => {
    const categories = patientHistory?.documentsByCategory || [];
    return categories.flatMap((category) =>
      (category?.documents || []).map((document) => ({
        ...document,
        category: document?.category || category?.category,
      }))
    );
  }, [patientHistory]);

  useEffect(() => {
    setSelectedClinicalResultId((current) => {
      if (clinicalResults.some((item) => getClinicalResultId(item) === current)) return current;
      return getClinicalResultId(clinicalResults[0]) ?? null;
    });
  }, [clinicalResults]);

  useEffect(() => {
    setSelectedDocumentId((current) => {
      if (historyDocuments.some((item) => getDocumentId(item) === current)) return current;
      return getDocumentId(historyDocuments[0]) ?? null;
    });
  }, [historyDocuments]);

  const selectedClinicalResult = useMemo(
    () => clinicalResults.find((item) => getClinicalResultId(item) === selectedClinicalResultId) || null,
    [clinicalResults, selectedClinicalResultId]
  );

  const selectedPrescription = useMemo(
    () => prescriptions.find((rx) => rx.appointmentId === selectedAppointmentId) || null,
    [prescriptions, selectedAppointmentId]
  );

  const selectedConsultation = useMemo(() => {
    const appts = patientHistory?.appointments || [];
    return appts.find((a) => (a.appointmentID ?? a.appointmentId) === selectedAppointmentId) || null;
  }, [patientHistory, selectedAppointmentId]);

  const selectedDocument = useMemo(
    () => historyDocuments.find((item) => getDocumentId(item) === selectedDocumentId) || null,
    [historyDocuments, selectedDocumentId]
  );

  const renderHistoryMasterDetail = ({ title, count, action, emptyMessage, list, detail }) => (
    <div className="history-md">
      <aside className="history-md__list">
        <div className="history-md__list-header">
          <div>
            <h4>{title}</h4>
            <span>{count} item{count === 1 ? '' : 's'}</span>
          </div>
          {action}
        </div>
        {count === 0 ? (
          <div className="history-md__empty">{emptyMessage}</div>
        ) : (
          <div className="history-md__list-scroll">{list}</div>
        )}
      </aside>
      <section className="history-md__detail">
        {count === 0 ? <div className="history-md__empty">{emptyMessage}</div> : detail}
      </section>
    </div>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    const startPage = Math.max(1, safePage - 2);
    const endPage = Math.min(totalPages, safePage + 2);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return (
      <div className="d-flex align-items-center justify-content-center gap-2 mt-3">
        <button className="btn btn-sm btn-outline-secondary" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)} type="button">Prev</button>
        {startPage > 1 && <span className="small text-muted">…</span>}
        {pages.map((p) => (
          <button key={p} className={`btn btn-sm ${p === safePage ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setCurrentPage(p)} type="button">{p}</button>
        ))}
        {endPage < totalPages && <span className="small text-muted">…</span>}
        <button className="btn btn-sm btn-outline-secondary" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)} type="button">Next</button>
      </div>
    );
  };

  const CalendarContainer = ({ className, children }) => (
    <div className={className}>
      {children}
      <div className="react-datepicker__clear-row">
        <button
          type="button"
          className="react-datepicker__clear-btn"
          onClick={() => setSelectedDate(null)}
        >
          Clear
        </button>
      </div>
    </div>
  );

  const renderList = () => (
    <div className="split-patients-list d-flex flex-column" style={{ height: '100%', overflow: 'hidden' }}>
      <div className="split-patients__toolbar">
        <div className="split-patients__toolbar-header">
          <span className="split-patients__toolbar-title">Appointments</span>
          {!loading && filteredAppointments.length > 0 && (
            <span className="split-patients__toolbar-count">{filteredAppointments.length}</span>
          )}
        </div>

        <div className="split-patients__filters">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className={`split-patients__filter-chip${statusFilter === chip.key ? ' split-patients__filter-chip--active' : ''}`}
              onClick={() => setStatusFilter(chip.key)}
            >
              {chip.label}
            </button>
          ))}
          <div className="ms-auto">
            <DatePicker
              selected={selectedDate}
              onChange={(d) => setSelectedDate(d)}
              dateFormat="MM/dd/yyyy"
              maxDate={new Date()}
              customInput={<DatePickerButton />}
              calendarContainer={CalendarContainer}
            />
          </div>
        </div>

        <div className="split-patients__search">
          <span className="material-symbols-outlined split-patients__search-icon">search</span>
          <input
            aria-label="Search appointments"
            className="split-patients__search-input"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patient..."
            value={searchTerm}
          />
        </div>
      </div>

      <div className="split-patients__list-scroll">
        {loading ? (
          <DoctorSkeletonList rows={4} />
        ) : error ? (
          <DoctorErrorState message={error} />
        ) : pageItems.length === 0 ? (
          <DoctorEmptyState icon="calendar_month" title="No appointments found" description="Try adjusting your filters or date range." />
        ) : (
          <div className="d-flex flex-column" style={{ gap: '0.5rem' }}>
            {pageItems.map((appt) => (
              <div
                key={appt.appointmentID || appt.appointmentId}
                className={isSelected(appt) ? 'split-patients__list-card--selected' : ''}
              >
                <AppointmentCard
                  compact
                  appointment={appt}
                  onView={handleSelectAppointment}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {renderPagination()}
    </div>
  );

  const renderClinicalResults = () => {
    if (!appointmentDetail || String(appointmentDetail.status || '').toLowerCase() === 'cancelled') {
      return <DoctorEmptyState icon="cancel" title="Appointment Cancelled" description="Clinical results are not available for cancelled appointments." />;
    }
    const resultList = clinicalResults;
    return renderHistoryMasterDetail({
      title: 'Clinical Results',
      count: resultList.length,
      emptyMessage: 'No clinical results found.',
      list: resultList.map((r, idx) => {
        const id = getClinicalResultId(r);
        return (
          <ClinicalResultCompactCard
            key={id}
            result={r}
            order={idx + 1}
            isSelected={selectedClinicalResultId === id}
            onSelect={() => setSelectedClinicalResultId(id)}
          />
        );
      }),
      detail: selectedClinicalResult ? (
        <ClinicalResultDetailPanel
          result={selectedClinicalResult}
          canManage
          onEdit={(r) => {
            setSelectedClinicalResultId(getClinicalResultId(r));
            setEditModalOpen(true);
          }}
          onPublish={async (r) => {
            try {
              const docId = r.documentId ?? r.documentID;
              await doctorClinicalResultApi.publishResult(docId);
              toast.success('Clinical result published');
              const pid = appointmentDetail?.patientId || appointmentDetail?.patientID;
              if (pid) {
                const h = await doctorService.getMyDoctorPatientHistory(pid);
                if (h) setPatientHistory(h);
              }
            } catch (err) {
              toast.error(err.response?.data?.message || 'Failed to publish clinical result');
            }
          }}
        />
      ) : (
        <div className="history-md__empty">Select a result to view details.</div>
      ),
    });
  };

  const renderPrescriptions = () => {
    if (!appointmentDetail || String(appointmentDetail.status || '').toLowerCase() === 'cancelled') {
      return <DoctorEmptyState icon="cancel" title="Appointment Cancelled" description="Prescriptions are not available for cancelled appointments." />;
    }
    const STATUS_STYLES = {
      ACTIVE: { bg: '#d1fae5', text: '#059669', dot: '#10b981', border: '#6ee7b7', pillBg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' },
      ISSUED: { bg: '#fef3c7', text: '#b45309', dot: '#d97706', border: '#fcd34d', pillBg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' },
      EXPIRED: { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8', border: '#cbd5e1', pillBg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' },
    };
    const DEFAULT_STYLE = { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8', border: '#cbd5e1', pillBg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' };
    const getStatusStyle = (s) => STATUS_STYLES[s] || DEFAULT_STYLE;
    const getValidStatus = (validUntil) => {
      if (!validUntil) return selectedPrescription.status || 'ISSUED';
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      return now > new Date(validUntil) ? 'EXPIRED' : 'ACTIVE';
    };
    if (!selectedPrescription) {
      return <DoctorEmptyState icon="medication" title="No Prescription" description="No prescription was issued for this appointment." />;
    }
    return (
      <div className="history-md__detail-panel" style={{ minHeight: '100%' }}>
        <style>{`
          @keyframes statusPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.8); }
          }
          .rx-med-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .rx-med-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .rx-med-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
          }
          .rx-med-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          .rx-med-scroll {
            scrollbar-width: thin;
          }
        `}</style>
        <div className="w-100" style={{ background: 'var(--doctor-surface-muted, #f8fafc)', border: '1px solid var(--doctor-border, #e2e8f0)', borderRadius: '0.75rem', padding: '1.25rem', height: '100%' }}>
          {/* Status header spanning both columns */}
          <div className="d-flex align-items-center justify-content-between mb-3 px-1">
            <div className="d-flex align-items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--doctor-text-muted, #64748b)' }}>event_available</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--doctor-text-secondary, #475569)' }}>
                Valid until: <strong>{selectedPrescription.validUntil ? formatHistoryDate(selectedPrescription.validUntil) : 'N/A'}</strong>
              </span>
            </div>
            {(() => {
              const validStatus = getValidStatus(selectedPrescription.validUntil);
              const vs = getStatusStyle(validStatus);
              return (
                <span className="small fw-semibold d-inline-flex align-items-center px-3 py-1 rounded-pill" style={{
                  columnGap: '0.375rem',
                  background: vs.pillBg,
                  color: vs.text,
                  border: `1px solid ${vs.border}`,
                  fontSize: '0.6875rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  userSelect: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}>
                  <span style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: vs.dot,
                    display: 'inline-block', flexShrink: 0,
                    animation: validStatus === 'ACTIVE' ? 'statusPulse 2s ease-in-out infinite' : 'none',
                    boxShadow: `0 0 0 2px ${vs.bg}`,
                  }} />
                  {validStatus}
                </span>
              );
            })()}
          </div>
          <div className="row g-3" style={{ height: '100%' }}>
            {/* Left sub-panel: Diagnosis + Doctor Notes + Treatment Plan */}
            <div className="col-md-5 d-flex flex-column" style={{ height: '100%' }}>
              <div className="d-flex flex-column gap-3 overflow-y-auto pe-1" style={{ minHeight: 0 }}>
                {/* Diagnosis */}
                {(() => {
                  const value = selectedPrescription.diagnosis || selectedConsultation?.diagnosis;
                  if (!value) return null;
                  return (
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1 px-1">
                        <span className="material-symbols-outlined" style={{ fontSize: '0.8125rem', color: 'var(--doctor-text-muted, #64748b)' }}>biotech</span>
                        <span className="small fw-semibold" style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--doctor-text-muted, #64748b)' }}>Diagnosis</span>
                      </div>
                      <div className="rounded-4 p-4" style={{ background: 'var(--doctor-surface, #ffffff)', border: '1px solid var(--doctor-border, #e2e8f0)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <p className="mb-0" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--doctor-text, #0f172a)', lineHeight: 1.5 }}>{value}</p>
                      </div>
                    </div>
                  );
                })()}
                {/* Doctor Notes */}
                {(() => {
                  const value = selectedPrescription.notes || selectedConsultation?.doctorNotes;
                  if (!value) return null;
                  return (
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1 px-1">
                        <span className="material-symbols-outlined" style={{ fontSize: '0.8125rem', color: 'var(--doctor-text-muted, #64748b)' }}>description</span>
                        <span className="small fw-semibold" style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--doctor-text-muted, #64748b)' }}>Doctor Notes</span>
                      </div>
                      <div className="rounded-4 p-4" style={{ background: 'var(--doctor-surface, #ffffff)', border: '1px solid var(--doctor-border, #e2e8f0)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <p className="mb-0" style={{ fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-line', color: 'var(--doctor-text, #0f172a)' }}>{value}</p>
                      </div>
                    </div>
                  );
                })()}
                {/* Treatment Plan */}
                {selectedConsultation?.treatmentPlan && (
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1 px-1">
                      <span className="material-symbols-outlined" style={{ fontSize: '0.8125rem', color: 'var(--doctor-text-muted, #64748b)' }}>clinical_notes</span>
                      <span className="small fw-semibold" style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--doctor-text-muted, #64748b)' }}>Treatment Plan</span>
                    </div>
                    <div className="rounded-4 p-4" style={{ background: 'var(--doctor-surface, #ffffff)', border: '1px solid var(--doctor-border, #e2e8f0)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <p className="mb-0" style={{ fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-line', color: 'var(--doctor-text, #0f172a)' }}>{selectedConsultation.treatmentPlan}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Right sub-panel: Medications */}
            <div className="col-md-7 d-flex flex-column" style={{ height: '100%' }}>
              {(() => {
                const medications = getPrescriptionItems(selectedPrescription);
                return (
                  <>
                    {/* Medications header outside card — matches left column style */}
                    <div className="d-flex align-items-center gap-2 mb-2 px-1">
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--doctor-text-muted, #64748b)' }}>medication</span>
                      <span className="small fw-semibold" style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--doctor-text-muted, #64748b)' }}>Medications</span>
                    </div>
                    <div className="rounded-4 p-4 d-flex flex-column" style={{ background: 'var(--doctor-surface, #ffffff)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', flex: 1, minHeight: 0 }}>
                      <div className="overflow-y-auto rx-med-scroll" style={{ flex: 1, minHeight: 0, padding: 8 }}>
                        {medications.length === 0 ? (
                          <div className="text-center py-4 rounded-3" style={{ background: 'var(--doctor-surface-muted, #f8fafc)', border: '1px dashed var(--doctor-border, #e2e8f0)' }}>
                            <span className="material-symbols-outlined d-block mb-2" style={{ fontSize: '1.5rem', color: 'var(--doctor-text-muted, #64748b)' }}>medication</span>
                            <p className="mb-0" style={{ fontSize: '0.8125rem', color: 'var(--doctor-text-muted, #64748b)' }}>No medication details available</p>
                          </div>
                        ) : (
                          <div className="d-flex flex-column gap-2">
                            {medications.map((item, index) => (
                              <div key={`${item.medicationName || 'med'}-${index}`}
                                className="rounded-3"
                                style={{ position: 'relative', border: '1px solid var(--doctor-border, #e2e8f0)', background: 'var(--doctor-surface, #ffffff)', padding: '0.75rem 1rem' }}
                              >
                                {/* Corner order badge — uses doctor-prescription-item-card__order-badge from _prescriptions-workspace.css */}
                                <div className="doctor-prescription-item-card__order-badge">
                                  {index + 1}
                                </div>
                                <div className="d-flex align-items-center justify-content-between pb-2 mb-2" style={{ borderBottom: '1px solid var(--doctor-border, #e2e8f0)' }}>
                                  <span className="fw-semibold" style={{ fontSize: '0.875rem', color: 'var(--doctor-text, #0f172a)' }}>
                                    {item.medicationName || `Medication ${index + 1}`}
                                  </span>
                                  {item.dosage && (
                                    <span className="small fw-semibold" style={{ color: 'var(--doctor-primary, #0052cc)' }}>{item.dosage}</span>
                                  )}
                                </div>
                                <div className="doctor-prescription-pill-list">
                                  {item.route && (
                                    <span className="doctor-prescription-pill">Route: {item.route}</span>
                                  )}
                                  {item.frequency && (
                                    <span className="doctor-prescription-pill">Frequency: {item.frequency}</span>
                                  )}
                                  {item.totalSupplyDays && (
                                    <span className="doctor-prescription-pill">{item.totalSupplyDays} day{item.totalSupplyDays > 1 ? 's' : ''} supply</span>
                                  )}
                                  {item.quantity && (
                                    <span className="doctor-prescription-pill">Qty: {item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>
                                  )}
                                  {item.timing && (
                                    <span className="doctor-prescription-pill">Timing: {item.timing}</span>
                                  )}
                                </div>
                                {item.notes && (
                                  <p className="mb-0 mt-1 small d-flex align-items-center gap-1" style={{ color: 'var(--doctor-text-muted, #64748b)', fontSize: '0.75rem' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>notes</span>
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDocuments = () => {
    if (!appointmentDetail || String(appointmentDetail.status || '').toLowerCase() === 'cancelled') {
      return <DoctorEmptyState icon="cancel" title="Appointment Cancelled" description="Documents are not available for cancelled appointments." />;
    }
    const docList = historyDocuments;
    return renderHistoryMasterDetail({
      title: 'Documents',
      count: docList.length,
      emptyMessage: 'No documents found.',
      list: docList.map((d) => {
        const id = getDocumentId(d);
        return (
          <button
            key={id}
            type="button"
            className={`history-md__item ${selectedDocumentId === id ? 'history-md__item--active' : ''}`}
            onClick={() => setSelectedDocumentId(id)}
          >
            <p className="history-md__title">{d.documentName || d.category || 'Document'}</p>
            <p className="history-md__meta">{d.category || ''}{d.documentDate ? ` \u00b7 ${formatHistoryDate(d.documentDate)}` : d.uploadedAt ? ` \u00b7 ${formatHistoryDate(d.uploadedAt)}` : ''}</p>
          </button>
        );
      }),
      detail: selectedDocument ? (
        <div className="history-md__detail-panel">
          <div className="history-md__detail-header">
            <div>
              <h5 className="history-md__detail-title">{selectedDocument.documentName || selectedDocument.category || 'Document'}</h5>
              <p className="history-md__detail-meta">{selectedDocument.category || ''}{selectedDocument.documentType ? ` \u00b7 ${selectedDocument.documentType}` : ''}</p>
            </div>
          </div>
          <div className="history-md__section">
            <div className="history-md__field-grid">
              {selectedDocument.documentDate && (
                <div className="history-md__field">
                  <span>Document Date</span>
                  <strong>{formatHistoryDate(selectedDocument.documentDate)}</strong>
                </div>
              )}
              {selectedDocument.uploadedAt && (
                <div className="history-md__field">
                  <span>Uploaded</span>
                  <strong>{formatHistoryDate(selectedDocument.uploadedAt)}</strong>
                </div>
              )}
              {selectedDocument.mimeType && (
                <div className="history-md__field">
                  <span>Type</span>
                  <strong>{selectedDocument.mimeType}</strong>
                </div>
              )}
              {selectedDocument.fileSize != null && (
                <div className="history-md__field">
                  <span>Size</span>
                  <strong>{selectedDocument.fileSize > 1024 * 1024 ? `${(selectedDocument.fileSize / (1024 * 1024)).toFixed(1)} MB` : `${(selectedDocument.fileSize / 1024).toFixed(1)} KB`}</strong>
                </div>
              )}
              {selectedDocument.testResults && (
                <div className="history-md__field">
                  <span>Test Results</span>
                  <strong>{selectedDocument.testResults}</strong>
                </div>
              )}
              {selectedDocument.referenceRange && (
                <div className="history-md__field">
                  <span>Reference Range</span>
                  <strong>{selectedDocument.referenceRange}</strong>
                </div>
              )}
              {selectedDocument.resultUnit && (
                <div className="history-md__field">
                  <span>Result Unit</span>
                  <strong>{selectedDocument.resultUnit}</strong>
                </div>
              )}
              {selectedDocument.clinicalStatus && (
                <div className="history-md__field">
                  <span>Status</span>
                  <strong>{selectedDocument.clinicalStatus}</strong>
                </div>
              )}
              {selectedDocument.sourceType && (
                <div className="history-md__field">
                  <span>Source</span>
                  <strong>{selectedDocument.sourceType}</strong>
                </div>
              )}
              {selectedDocument.visibilityStatus && (
                <div className="history-md__field">
                  <span>Visibility</span>
                  <strong>{selectedDocument.visibilityStatus}</strong>
                </div>
              )}
              {selectedDocument.labFacilityName && (
                <div className="history-md__field">
                  <span>Facility</span>
                  <strong>{selectedDocument.labFacilityName}</strong>
                </div>
              )}
              {selectedDocument.doctorName && (
                <div className="history-md__field">
                  <span>Doctor</span>
                  <strong>{selectedDocument.doctorName}</strong>
                </div>
              )}
            </div>
          </div>
          {selectedDocument.description && (
            <div className="history-md__section">
              <h5>Description</h5>
              <p style={{ fontSize: '0.875rem', color: '#334155', margin: 0 }}>{selectedDocument.description}</p>
            </div>
          )}
          {selectedDocument.doctorAssessment && (
            <div className="history-md__section">
              <h5>Doctor's Assessment</h5>
              <p style={{ fontSize: '0.875rem', color: '#334155', margin: 0 }}>{selectedDocument.doctorAssessment}</p>
            </div>
          )}
          {selectedDocument.patientSummary && (
            <div className="history-md__section">
              <h5>Patient Summary</h5>
              <p style={{ fontSize: '0.875rem', color: '#334155', margin: 0 }}>{selectedDocument.patientSummary}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="history-md__empty">Select a document to view details.</div>
      ),
    });
  };

  const TABS = [
    { key: 'clinical-results', label: 'Clinical Results' },
    { key: 'prescriptions', label: 'Prescriptions' },
    { key: 'documents', label: 'Documents' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'clinical-results': return renderClinicalResults();
      case 'prescriptions': return renderPrescriptions();
      case 'documents': return renderDocuments();
      default: return renderClinicalResults();
    }
  };

  const renderDetail = () => {
    if (!selectedAppointmentId) {
      return (
        <div className="split-patients__empty-detail">
          <span className="material-symbols-outlined">calendar_month</span>
          <h3>Select an appointment</h3>
          <p>Choose an appointment from the list to view its details.</p>
        </div>
      );
    }

    if (detailLoading) {
      return (
        <div className="split-patients__detail-skeleton">
          <div className="skeleton-hero">
            <div className="skeleton-hero__avatar" />
            <div className="skeleton-hero__lines">
              <div className="skeleton-hero__line" style={{ width: '55%' }} />
              <div className="skeleton-hero__line" style={{ width: '35%' }} />
            </div>
          </div>
          <div className="skeleton-tabs" />
          <div className="skeleton-grid">
            <div className="skeleton-grid__item" />
            <div className="skeleton-grid__item" />
          </div>
        </div>
      );
    }

    if (!appointmentDetail) {
      return <DoctorErrorState message="Failed to load appointment details" onRetry={handleDetailRetry} />;
    }

    const patientName = appointmentDetail.patientName || 'Unknown Patient';
    const apptDate = parseAppointmentDate(appointmentDetail);

    return (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="split-patients__detail-header">
            <div className="split-patients__detail-hero">
              <div className="split-patients__detail-avatar">
                <span>{(patientName).charAt(0).toUpperCase()}</span>
              </div>
              <div className="split-patients__detail-hero-info">
                <h2>{patientName}</h2>
                <p>{apptDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {apptDate?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </div>

          <div className="split-patients__tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`split-patients__tab${activeTab === tab.key ? ' split-patients__tab--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="split-patients__tab-content" style={{ flex: 1, overflow: 'auto' }}>
            {renderTabContent()}
          </div>
        </div>
        {activeTab === 'clinical-results' && editModalOpen && (
          <ClinicalResultModal
            appointmentId={appointmentDetail.appointmentId || appointmentDetail.appointmentID}
            selectedResult={selectedClinicalResult}
            onClose={() => setEditModalOpen(false)}
            onSaved={(savedResult) => {
              setEditModalOpen(false);
              const pid = appointmentDetail?.patientId || appointmentDetail?.patientID;
              if (pid) {
                doctorService.getMyDoctorPatientHistory(pid).then((h) => {
                  if (h) setPatientHistory(h);
                });
              }
            }}
            canManageClinicalResults={true}
          />
        )}
      </>
    );
  };

  return (
    <div className="split-patients-container" style={{ height: '100%' }}>
      {renderList()}
      <div className="split-patients-detail split-patients-detail--visible">
        {renderDetail()}
      </div>
    </div>
  );
}
