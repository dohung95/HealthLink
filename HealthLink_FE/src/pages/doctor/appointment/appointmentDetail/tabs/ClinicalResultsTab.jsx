import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { doctorClinicalResultApi } from '@api/doctorClinicalResultApi';
import ClinicalResultCategorySection from './clinical-results/ClinicalResultCategorySection';
import ClinicalResultDetailPanel from './clinical-results/ClinicalResultDetailPanel';
import ClinicalResultModal from './clinical-results/ClinicalResultModal';

const CATEGORY_ORDER = [
  'Blood Test',
  'Imaging',
  'Urine Test',
  'Pathology',
  'Microbiology',
  'Other',
];

function normalizeCategory(category) {
  if (!category) return 'Other';
  const c = category.trim();
  if (CATEGORY_ORDER.includes(c)) return c;
  return 'Other';
}

function groupByCategory(results) {
  const groups = {};
  results.forEach((r) => {
    const cat = normalizeCategory(r.category);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(r);
  });
  const sorted = CATEGORY_ORDER.filter((c) => groups[c]).map((c) => ({
    category: c,
    results: groups[c],
  }));
  if (groups['Other']) {
    sorted.push({ category: 'Other', results: groups['Other'] });
  }
  return sorted;
}

function SkeletonCard() {
  return (
    <div className="cr-result-card cr-skeleton-card">
      <div className="cr-skeleton-block" style={{ height: '1rem', width: '40%', marginBottom: '0.75rem' }} />
      <div className="cr-skeleton-block" style={{ height: '0.875rem', width: '70%', marginBottom: '0.5rem' }} />
      <div className="cr-skeleton-block" style={{ height: '0.875rem', width: '50%', marginBottom: '0.5rem' }} />
      <div className="cr-skeleton-block" style={{ height: '0.75rem', width: '30%' }} />
    </div>
  );
}

export default function ClinicalResultsTab({ appointmentId, canManageClinicalResults, isCancelledAppointment }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  const loadResults = useCallback(async () => {
    if (!appointmentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await doctorClinicalResultApi.getAppointmentResults(appointmentId);
      setResults(data || []);
    } catch (err) {
      console.error('Failed to load clinical results:', err);
      setError('Failed to load clinical results');
      toast.error('Failed to load clinical results');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const handleSelectCard = useCallback((result) => {
    setSelectedResult(result);
  }, []);

  const handleEdit = useCallback(() => {
    setModalOpen(true);
  }, []);

  const handleNew = useCallback(() => {
    setSelectedResult(null);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleDelete = useCallback(async (result) => {
    try {
      await doctorClinicalResultApi.deleteResult(result.documentId);
      toast.success('Clinical result deleted');
      if (selectedResult?.documentId === result.documentId) {
        setSelectedResult(null);
      }
      loadResults();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete clinical result');
    }
  }, [selectedResult, loadResults]);

  const handleModalSaved = useCallback((savedResult) => {
    if (savedResult) {
      setSelectedResult(savedResult);
    }
    loadResults();
  }, [loadResults]);

  if (loading) {
    return (
      <div className="cr-master-shell">
        <div className="cr-master-shell__list">
          <div className="cr-toolbar">
            <strong>Results</strong>
          </div>
          <div className="cr-card-grid">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
        <div className="cr-master-shell__detail">
          <div className="cr-detail-panel cr-detail-panel--empty">
            <div className="cr-detail-empty">
              <i className="bi bi-clipboard2-pulse cr-detail-empty__icon"></i>
              <h5 className="cr-detail-empty__heading">Select a result</h5>
              <p className="cr-detail-empty__text">
                Click a result from the left panel to view its full details here.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cr-board">
        <div className="cr-empty-state">
          <i className="bi bi-exclamation-circle cr-empty-state__icon"></i>
          <p className="cr-empty-state__text">{error}</p>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadResults}>
            <i className="bi bi-arrow-clockwise"></i> Retry
          </button>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="cr-board">
        <div className="cr-empty-state">
          <i className="bi bi-clipboard2-pulse cr-empty-state__icon"></i>
          <h5 className="cr-empty-state__heading">No clinical results yet</h5>
          <p className="cr-empty-state__text">
            Add a lab report, imaging result, or follow-up test result for this appointment.
          </p>
          {canManageClinicalResults && !isCancelledAppointment && (
            <button type="button" className="cr-btn-primary" onClick={handleNew}>
              <i className="bi bi-plus-lg"></i> Add result
            </button>
          )}
        </div>

        {modalOpen && (
          <ClinicalResultModal
            appointmentId={appointmentId}
            selectedResult={null}
            onClose={handleCloseModal}
            onSaved={handleModalSaved}
            canManageClinicalResults={canManageClinicalResults}
          />
        )}
      </div>
    );
  }

  const groups = groupByCategory(results);

  return (
    <div className="cr-master-shell">
      <div className="cr-master-shell__list">
        <div className="cr-toolbar">
          <strong>Results ({results.length})</strong>
          {canManageClinicalResults && !isCancelledAppointment && (
            <button type="button" className="cr-btn-primary cr-btn-primary--sm" onClick={handleNew}>
              <i className="bi bi-plus-lg"></i> Add result
            </button>
          )}
        </div>

        {groups.map((g) => (
          <ClinicalResultCategorySection
            key={g.category}
            category={g.category}
            results={g.results}
            selectedResultId={selectedResult?.documentId}
            onSelectCard={handleSelectCard}
          />
        ))}

        {modalOpen && (
          <ClinicalResultModal
            appointmentId={appointmentId}
            selectedResult={selectedResult}
            onClose={handleCloseModal}
            onSaved={handleModalSaved}
            canManageClinicalResults={canManageClinicalResults}
          />
        )}
      </div>

      <div className="cr-master-shell__detail">
        <ClinicalResultDetailPanel
          result={selectedResult}
          canManage={canManageClinicalResults}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
