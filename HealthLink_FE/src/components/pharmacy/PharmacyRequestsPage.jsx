import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import pharmacyApi from '../../api/pharmacyApi';
import { dateTime, statusClass } from '../../utils/pharmacy/pharmacyHelpers';
import {
  REQUEST_STAGE_GROUPS,
  getWorkflowStage,
  isRequestWorkItem,
  matchesPharmacyWorkflowSearch,
} from './workflow/pharmacyWorkflow';
import CreateOrderModal from './CreateOrderModal/index';

export default function PharmacyRequestsPage({ workItems, profile, reload, navigate: nav }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const hookNavigate = useNavigate();
  const navigate = nav || hookNavigate;
  const initialGroup = searchParams.get('group') === 'CONSULTING' ? 'CONSULTING' : 'NEW_REQUESTS';
  const [activeGroup, setActiveGroup] = useState(initialGroup);
  const [query, setQuery] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [createOrderRequest, setCreateOrderRequest] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const requestItems = useMemo(
    () => (Array.isArray(workItems) ? workItems : []).filter(isRequestWorkItem),
    [workItems],
  );

  const visibleItems = useMemo(() => {
    const group = REQUEST_STAGE_GROUPS.find((entry) => entry.key === activeGroup);
    const stages = group?.stages || [];
    return requestItems.filter((item) => (
      stages.includes(getWorkflowStage(item)) && matchesPharmacyWorkflowSearch(item, query)
    ));
  }, [activeGroup, query, requestItems]);

  const stageCounts = useMemo(() => {
    const counts = {};
    REQUEST_STAGE_GROUPS.forEach((group) => {
      counts[group.key] = requestItems.filter((item) =>
        group.stages.includes(getWorkflowStage(item)),
      ).length;
    });
    return counts;
  }, [requestItems]);

  const switchGroup = (key) => {
    setActiveGroup(key);
    setSearchParams(key === 'NEW_REQUESTS' ? {} : { group: key });
  };

  const handleAction = async (item, action) => {
    setSavingId(getItemId(item));
    setPendingAction(action);
    try {
      if (action === 'accept') {
        await pharmacyApi.updateConsultationStatus(item.requestId, {
          status: 'IN_REVIEW',
          pharmacyNotes: item.pharmacyNotes || '',
        });
        toast.success('Request accepted.');
      } else if (action === 'reject') {
        await pharmacyApi.updateConsultationStatus(item.requestId, {
          status: 'CANCELLED',
          pharmacyNotes: item.pharmacyNotes || '',
        });
        toast.success('Request rejected.');
      }
      await reload();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${action} request.`);
    } finally {
      setSavingId(null);
      setPendingAction(null);
    }
  };

  const getItemId = (item) => item?.caseId || item?.workItemId || item?.requestId || item?.orderId;

  const stageConfig = REQUEST_STAGE_GROUPS.find((g) => g.key === activeGroup);

  return (
    <div className="pharmacy-workflow-page">
      <div className="pharmacy-workflow-header">
        <div className="pharmacy-workflow-title">
          <h1>Requests</h1>
          <p>
            {stageCounts.NEW_REQUESTS || 0} new, {stageCounts.CONSULTING || 0} consulting
          </p>
        </div>
        <div className="pharmacy-workflow-search">
          <span className="material-symbols-outlined">search</span>
          <input
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by phone, patient, request ID..."
            value={query}
          />
        </div>
      </div>

      <div className="pharmacy-order-tabs">
        {REQUEST_STAGE_GROUPS.map((group) => (
          <button
            className={`pharmacy-order-tab ${activeGroup === group.key ? 'is-active' : ''}`}
            key={group.key}
            onClick={() => switchGroup(group.key)}
            type="button"
          >
            {group.label}
            <span className="pharmacy-order-tab-count">{stageCounts[group.key] || 0}</span>
          </button>
        ))}
      </div>

      <div className="pharmacy-request-grid">
        {visibleItems.length === 0 ? (
          <div className="pharmacy-empty compact" style={{ gridColumn: '1 / -1' }}>
            <span className="material-symbols-outlined">inbox</span>
            <h3>No {stageConfig?.label?.toLowerCase() || 'requests'}</h3>
            <p>No work items match the current filter.</p>
          </div>
        ) : (
          visibleItems.map((item) => {
            const stage = getWorkflowStage(item);
            const isNewRequest = stage === 'NEW_REQUEST';
            const isConsulting = stage === 'CONSULTING' || stage === 'REVISION_REQUESTED';
            const itemId = getItemId(item);
            const isSaving = savingId === itemId;

            return (
              <div className="pharmacy-request-card" key={itemId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span className={`pharmacy-status ${statusClass(stage)}`}>
                    {stage}
                  </span>
                  <small className="text-muted">{dateTime(item.createdAt)}</small>
                </div>

                <div>
                  <strong>{item.patientName || 'Unknown Patient'}</strong>
                  {item.deliveryPhoneNumber && (
                    <div style={{ fontSize: 13, color: 'var(--pharmacy-muted)' }}>
                      {item.deliveryPhoneNumber}
                    </div>
                  )}
                  {item.deliveryAddress && (
                    <div style={{ fontSize: 12, color: 'var(--pharmacy-muted)', marginTop: 2 }}>
                      {item.deliveryAddress}
                    </div>
                  )}
                </div>

                {item.symptoms && (
                  <small style={{ color: 'var(--pharmacy-muted)', lineHeight: 1.5 }}>
                    {item.symptoms}
                  </small>
                )}

                {item.description && !item.symptoms && (
                  <small style={{ color: 'var(--pharmacy-muted)', lineHeight: 1.5 }}>
                    {item.description}
                  </small>
                )}

                <div className="pharmacy-case-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isNewRequest && (
                    <>
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={isSaving}
                        onClick={() => handleAction(item, 'accept')}
                        type="button"
                      >
                        {isSaving && pendingAction === 'accept' ? 'Accepting...' : 'Accept'}
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        disabled={isSaving}
                        onClick={() => handleAction(item, 'reject')}
                        type="button"
                      >
                        {isSaving && pendingAction === 'reject' ? 'Rejecting...' : 'Reject'}
                      </button>
                    </>
                  )}
                  {isConsulting && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => setCreateOrderRequest(item)}
                      type="button"
                    >
                      Create Order
                    </button>
                  )}
                  {item.availableActions?.includes('CHAT') && (
                    <button className="btn btn-sm btn-outline-secondary" type="button">
                      <i className="bi bi-chat-dots"></i> Chat
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {createOrderRequest && (
        <CreateOrderModal
          request={createOrderRequest}
          profile={profile}
          onClose={() => setCreateOrderRequest(null)}
          onCreated={async () => {
            await reload();
            setCreateOrderRequest(null);
            navigate('/pharmacy-page/orders');
          }}
        />
      )}
    </div>
  );
}
