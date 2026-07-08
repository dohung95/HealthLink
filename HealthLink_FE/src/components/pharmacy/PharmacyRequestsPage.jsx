import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import pharmacyApi from '../../api/pharmacyApi';
import { dateTime, statusClass, money } from '../../utils/pharmacy/pharmacyHelpers';
import {
  getWorkflowStage,
  getWorkItemKind,
  canUseRequestChat,
  matchesPharmacyWorkflowSearch,
} from './workflow/pharmacyWorkflow';
import { useChat } from '../../context/ChatContext';
import CreateOrderModal from './CreateOrderModal/index';

export default function PharmacyRequestsPage({ workItems, profile, reload, navigate: nav }) {
  const { openChatWith } = useChat();
  const hookNavigate = useNavigate();
  const navigate = nav || hookNavigate;
  const [query, setQuery] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [createOrderRequest, setCreateOrderRequest] = useState(null);
  const [createOrderMode, setCreateOrderMode] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const [cardDeliveryFee, setCardDeliveryFee] = useState({});
  const [cardEstimatedMinutes, setCardEstimatedMinutes] = useState({});
  const [cardPharmacistNotes, setCardPharmacistNotes] = useState({});

  const CLOSED_REQUEST_STATUSES = new Set(['CANCELLED', 'REJECTED']);
  const TERMINAL_ORDER_STATUSES = new Set(['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED']);

  const normalized = (value) => String(value || '').trim().toUpperCase();

  const canRenderRequestAction = (item, action, kind) => {
    if (action === 'VIEW_ONLY') return false;
    if (action === 'UPDATE_ORDER_STATUS') {
      return ['pickupReview', 'retailReview'].includes(kind)
        && normalized(item?.orderStatus) === 'PENDING';
    }
    return true;
  };

  const requestItems = useMemo(
    () => (Array.isArray(workItems) ? workItems : []),
    [workItems],
  );

  const visibleItems = useMemo(() => {
    return requestItems
      .filter((item) => {
        const requestStatus = normalized(item?.requestStatus);
        const orderStatus = normalized(item?.orderStatus);
        return !CLOSED_REQUEST_STATUSES.has(requestStatus) && !TERMINAL_ORDER_STATUSES.has(orderStatus);
      })
      .filter((item) => matchesPharmacyWorkflowSearch(item, query))
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ta - tb;
      });
  }, [query, requestItems]);

  const handleAction = async (item, action, extraPayload = {}) => {
    const itemId = getItemId(item);
    setSavingId(itemId);
    setPendingAction(action);
    let needsReload = true;
    try {
      switch (action) {
        case 'ACCEPT_REQUEST':
          await pharmacyApi.updateConsultationStatus(item.requestId, {
            status: 'IN_REVIEW',
            pharmacyNotes: item.pharmacyNotes || '',
          });
          toast.success('Request accepted.');
          break;

        case 'REJECT_REQUEST':
          await pharmacyApi.updateConsultationStatus(item.requestId, {
            status: 'CANCELLED',
            pharmacyNotes: item.pharmacyNotes || '',
          });
          toast.success('Request rejected.');
          break;

        case 'CREATE_ORDER':
          needsReload = false;
          setCreateOrderRequest(item);
          setCreateOrderMode('createFromRequest');
          break;

        case 'UPDATE_QUOTE':
          needsReload = false;
          setCreateOrderRequest(item);
          setCreateOrderMode('updateQuote');
          break;

        case 'SEND_DELIVERY_QUOTE':
          await pharmacyApi.submitDeliveryQuote(item.orderId, extraPayload);
          toast.success('Delivery quote sent to patient for confirmation');
          break;

        case 'UPDATE_ORDER_STATUS':
          if (!['pickupReview', 'retailReview'].includes(getWorkItemKind(item))
              || normalized(item.orderStatus) !== 'PENDING') {
            toast.error('This order is no longer pending review.');
            break;
          }
          await pharmacyApi.updateOrderStatus(item.orderId, { status: extraPayload.status || 'CONFIRMED' });
          toast.success('Order confirmed.');
          break;

        case 'CANCEL_ORDER':
          await pharmacyApi.updateOrderStatus(item.orderId, { status: 'CANCELLED' });
          toast.success('Order cancelled.');
          break;

        case 'APPROVE_DELIVERY_CONTACT_CHANGE':
          await pharmacyApi.reviewDeliveryContactChange(item.deliveryContactChangeRequestId, extraPayload);
          toast.success('Delivery contact change approved');
          break;

        case 'REJECT_DELIVERY_CONTACT_CHANGE':
          await pharmacyApi.reviewDeliveryContactChange(item.deliveryContactChangeRequestId, extraPayload);
          toast.success('Delivery contact change rejected');
          break;

        default:
          break;
      }
      if (needsReload) await reload();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${action}.`);
    } finally {
      setSavingId(null);
      setPendingAction(null);
    }
  };

  const getItemId = (item) =>
    item?.caseId || item?.workItemId || item?.requestId || item?.orderId || item?.deliveryContactChangeRequestId;

  const openRequestChat = (item) => {
    if (!item?.chatRoomId) {
      toast.info('Chat is not available for this request yet.');
      return;
    }
    openChatWith({
      chatRoomId: item.chatRoomId,
      displayName: item.patientName || 'Patient',
      patientId: item.patientId,
    });
  };

  const openRequestVideoCall = (item) => {
    if (!item?.availableActions?.includes('VIDEO_CALL') || !item?.chatRoomId) {
      toast.info('Video call is not available for this request yet.');
      return;
    }
    toast.info('Open chat to start a video call for this request.');
  };

  const cardValue = (dict, itemId, fallback = '') => (dict[itemId] ?? fallback);

  const noChatVideoKinds = ['deliveryOrderRequest', 'deliveryQuote', 'pickupReview', 'deliveryContactChange', 'retailReview', 'revision'];

  return (
    <>
      <div className="pharmacy-workflow-header">
        <div className="pharmacy-workflow-title">
          <span className="material-symbols-outlined">assignment</span>
          <h1>Requests</h1>
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
      <div className="pharmacy-workflow-page pharmacy-workflow-surface">
        <div className="pharmacy-request-grid">
          {visibleItems.length === 0 ? (
            <div className="pharmacy-empty compact" style={{ gridColumn: '1 / -1' }}>
              <span className="material-symbols-outlined">inbox</span>
              <h3>No requests</h3>
              <p>No work items match the current filter.</p>
            </div>
          ) : (
            visibleItems.map((item, index) => {
              const stage = getWorkflowStage(item);
              const kind = getWorkItemKind(item);
              const itemId = getItemId(item);
              const isSaving = savingId === itemId;
              const canChat = canUseRequestChat(item);
              const showChatVideo = canChat && !noChatVideoKinds.includes(kind);

              let badgeLabel = stage;
              if (kind === 'deliveryOrderRequest') badgeLabel = 'Delivery quote';
              else if (kind === 'deliveryQuote') badgeLabel = 'Delivery quote';
              else if (kind === 'pickupReview') badgeLabel = 'Pickup review';
              else if (kind === 'deliveryContactChange') badgeLabel = 'Delivery change';
              else if (kind === 'retailReview') badgeLabel = 'Retail review';
              else if (kind === 'revision') badgeLabel = 'Revision';
              else if (kind === 'consultation') badgeLabel = 'Consultation';

              return (
                <div
                  className={`pharmacy-request-card ${kind === 'consultation' ? 'is-consulting' : ''}`}
                  key={itemId}
                >
                  <span className="pharmacy-fifo-badge">{index + 1}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <span className={`pharmacy-status ${statusClass(stage)}`}>
                      {badgeLabel}
                    </span>
                    <small className="text-muted">{dateTime(item.createdAt)}</small>
                  </div>

                  <div>
                    <strong>{item.patientName || 'Unknown Patient'}</strong>
                    {item.orderNumber && (
                      <div style={{ fontSize: 13, color: 'var(--pharmacy-muted)', marginTop: 2 }}>
                        Order: #{item.orderNumber}
                      </div>
                    )}
                  </div>

                  {(kind === 'deliveryQuote') && (
                    <>
                      <div style={{ fontSize: 13, color: 'var(--pharmacy-muted)', marginTop: 4 }}>
                        <div>Address: {item.deliveryAddress || '—'}</div>
                        <div>Phone: {item.deliveryPhoneNumber || '—'}</div>
                      </div>
                      {item.medicineSubtotal != null && (
                        <div style={{ fontSize: 13, marginTop: 4 }}>
                          <span style={{ color: 'var(--pharmacy-muted)' }}>Medicine subtotal: </span>
                          <strong>{money(item.medicineSubtotal)}</strong>
                        </div>
                      )}
                      <div style={{ backgroundColor: 'var(--pharmacy-surface-alt, #fff3cd)', borderRadius: 6, padding: '6px 10px', marginTop: 6, fontSize: 12, color: '#856404' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>warning</span>
                        Stock warning: verify availability before sending quote
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <label className="form-label" style={{ fontSize: 13, marginBottom: 2 }}>Delivery fee ($)</label>
                        <input
                          className="form-control form-control-sm"
                          min="0"
                          onChange={(e) => setCardDeliveryFee((d) => ({ ...d, [itemId]: e.target.value }))}
                          step="0.01"
                          style={{ maxWidth: 160 }}
                          type="number"
                          value={cardValue(cardDeliveryFee, itemId)}
                        />
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <label className="form-label" style={{ fontSize: 13, marginBottom: 2 }}>Estimated minutes (optional)</label>
                        <input
                          className="form-control form-control-sm"
                          min="0"
                          max="999"
                          onChange={(e) => setCardEstimatedMinutes((d) => ({ ...d, [itemId]: e.target.value }))}
                          style={{ maxWidth: 120 }}
                          type="number"
                          value={cardValue(cardEstimatedMinutes, itemId)}
                        />
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <label className="form-label" style={{ fontSize: 13, marginBottom: 2 }}>Pharmacist notes (optional)</label>
                        <textarea
                          className="form-control form-control-sm"
                          onChange={(e) => setCardPharmacistNotes((d) => ({ ...d, [itemId]: e.target.value }))}
                          rows={2}
                          style={{ fontSize: 13 }}
                          value={cardValue(cardPharmacistNotes, itemId)}
                        />
                      </div>
                      <div className="pharmacy-case-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={isSaving}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(item, 'SEND_DELIVERY_QUOTE', {
                              deliveryFee: Number(cardValue(cardDeliveryFee, itemId, '0') || 0),
                              estimatedDeliveryMinutes: Number(cardValue(cardEstimatedMinutes, itemId) || 0) || undefined,
                              pharmacistNotes: cardValue(cardPharmacistNotes, itemId) || undefined,
                            });
                          }}
                          type="button"
                        >
                          {isSaving && pendingAction === 'SEND_DELIVERY_QUOTE' ? 'Sending...' : 'Send quote'}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          disabled={isSaving}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(item, 'CANCEL_ORDER');
                          }}
                          type="button"
                        >
                          {isSaving && pendingAction === 'CANCEL_ORDER' ? 'Cancelling...' : 'Cancel order'}
                        </button>
                      </div>
                    </>
                  )}

                  {(kind === 'pickupReview') && (
                    <>
                      <div style={{ backgroundColor: 'var(--pharmacy-surface-alt, #fff3cd)', borderRadius: 6, padding: '6px 10px', marginTop: 6, fontSize: 12, color: '#856404' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>warning</span>
                        Stock warning: verify availability before confirming
                      </div>
                      <div className="pharmacy-case-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={isSaving}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(item, 'UPDATE_ORDER_STATUS', { status: 'CONFIRMED' });
                          }}
                          type="button"
                        >
                          {isSaving && pendingAction === 'UPDATE_ORDER_STATUS' ? 'Confirming...' : 'Confirm'}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          disabled={isSaving}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(item, 'CANCEL_ORDER');
                          }}
                          type="button"
                        >
                          {isSaving && pendingAction === 'CANCEL_ORDER' ? 'Cancelling...' : 'Cancel'}
                        </button>
                      </div>
                    </>
                  )}

                  {(kind === 'deliveryContactChange') && (
                    <>
                      <div style={{ backgroundColor: 'var(--pharmacy-surface-alt, #f8f9fa)', borderRadius: 6, padding: 10, marginTop: 4 }}>
                        <div style={{ marginTop: 8, fontSize: 13 }}>
                          <div style={{ color: 'var(--pharmacy-muted)' }}>Current:</div>
                          <div>Address: {item.oldDeliveryAddress || '—'}</div>
                          <div>Phone: {item.oldDeliveryPhoneNumber || '—'}</div>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 13 }}>
                          <div style={{ color: 'var(--pharmacy-muted)' }}>Requested:</div>
                          <div>Address: {item.newDeliveryAddress || '—'}</div>
                          <div>Phone: {item.newDeliveryPhoneNumber || '—'}</div>
                        </div>
                        {item.deliveryContactChangeReason && (
                          <div style={{ marginTop: 6, fontSize: 12, fontStyle: 'italic', color: 'var(--pharmacy-muted)' }}>
                            Reason: {item.deliveryContactChangeReason}
                          </div>
                        )}
                        <div style={{ marginTop: 6, fontSize: 13 }}>
                          <span style={{ color: 'var(--pharmacy-muted)' }}>Old delivery fee: </span>
                          <span>{item.oldDeliveryFee != null ? money(item.oldDeliveryFee) : '—'}</span>
                          {item.currentTotal != null && (
                            <>
                              <span style={{ color: 'var(--pharmacy-muted)', marginLeft: 12 }}>Current total: </span>
                              <span>{money(item.currentTotal)}</span>
                            </>
                          )}
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <label className="form-label" style={{ fontSize: 13, marginBottom: 2 }}>New delivery fee ($)</label>
                          <input
                            className="form-control form-control-sm"
                            min="0"
                            onChange={(e) => setCardDeliveryFee((d) => ({ ...d, [itemId]: e.target.value }))}
                            step="0.01"
                            style={{ maxWidth: 160 }}
                            type="number"
                            value={cardValue(cardDeliveryFee, itemId)}
                          />
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <label className="form-label" style={{ fontSize: 13, marginBottom: 2 }}>Pharmacist notes</label>
                          <textarea
                            className="form-control form-control-sm"
                            onChange={(e) => setCardPharmacistNotes((d) => ({ ...d, [itemId]: e.target.value }))}
                            rows={2}
                            style={{ fontSize: 13 }}
                            value={cardValue(cardPharmacistNotes, itemId)}
                          />
                        </div>
                      </div>
                      <div className="pharmacy-case-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        <button
                          className="btn btn-sm btn-success"
                          disabled={isSaving || !cardValue(cardDeliveryFee, itemId)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(item, 'APPROVE_DELIVERY_CONTACT_CHANGE', {
                              status: 'APPROVED',
                              deliveryFee: Number(cardValue(cardDeliveryFee, itemId, '0') || 0),
                              estimatedDeliveryMinutes: undefined,
                              pharmacyReviewNotes: cardValue(cardPharmacistNotes, itemId) || undefined,
                            });
                          }}
                          type="button"
                        >
                          {isSaving && pendingAction === 'APPROVE_DELIVERY_CONTACT_CHANGE' ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          disabled={isSaving}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(item, 'REJECT_DELIVERY_CONTACT_CHANGE', {
                              status: 'REJECTED',
                              pharmacyReviewNotes: cardValue(cardPharmacistNotes, itemId) || undefined,
                            });
                          }}
                          type="button"
                        >
                          {isSaving && pendingAction === 'REJECT_DELIVERY_CONTACT_CHANGE' ? 'Rejecting...' : 'Reject'}
                        </button>
                      </div>
                    </>
                  )}

                  {(kind === 'consultation' || kind === 'deliveryOrderRequest' || kind === 'orderRequest' || kind === 'order' || kind === 'retailReview' || kind === 'revision') && (
                    <>
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
                      {item.symptoms ? (
                        <small style={{ color: 'var(--pharmacy-muted)', lineHeight: 1.5 }}>
                          {item.symptoms}
                        </small>
                      ) : item.description ? (
                        <small style={{ color: 'var(--pharmacy-muted)', lineHeight: 1.5 }}>
                          {item.description}
                        </small>
                      ) : null}
                      <div className="pharmacy-case-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {item.availableActions?.map((action) => {
                          if (!canRenderRequestAction(item, action, kind)) return null;
                          if (action === 'UPDATE_QUOTE' && kind !== 'revision') return null;
                          const btn = ACTION_BUTTONS[action];
                          if (!btn) return null;
                          const isSavingThis = isSaving && pendingAction === action;
                          const label = getActionButtonLabel(action, kind);
                          return (
                            <button
                              key={action}
                              className={btn.className}
                              disabled={isSaving}
                              onClick={(e) => { e.stopPropagation(); handleAction(item, action); }}
                              type="button"
                            >
                              {isSavingThis ? `${label}...` : label}
                            </button>
                          );
                        })}
                      </div>

                      {showChatVideo && (
                        <div className="pharmacy-case-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                          {item.availableActions?.includes('CHAT') && (
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={(e) => { e.stopPropagation(); openRequestChat(item); }}
                              type="button"
                            >
                              Chat
                            </button>
                          )}
                          {item.availableActions?.includes('VIDEO_CALL') && (
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={(e) => { e.stopPropagation(); openRequestVideoCall(item); }}
                              type="button"
                            >
                              Video Call
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {createOrderRequest && (
          <CreateOrderModal
            request={createOrderRequest}
            profile={profile}
            mode={createOrderMode}
            variant={
              createOrderMode === 'updateQuote'
                || getWorkItemKind(createOrderRequest) === 'deliveryOrderRequest'
                ? 'default'
                : 'consult'
            }
            onClose={() => { setCreateOrderRequest(null); setCreateOrderMode(null); }}
            onCreated={async () => {
              await reload();
              setCreateOrderRequest(null);
              setCreateOrderMode(null);
              navigate('/pharmacy-page/orders');
            }}
          />
        )}
      </div>
    </>
  );
}

const ACTION_BUTTONS = {
  ACCEPT_REQUEST: { label: 'Accept', className: 'btn btn-sm btn-primary' },
  REJECT_REQUEST: { label: 'Reject', className: 'btn btn-sm btn-outline-danger' },
  CREATE_ORDER: { label: 'Create Order', className: 'btn btn-sm btn-success' },
  UPDATE_ORDER_STATUS: { label: 'Confirm', className: 'btn btn-sm btn-primary' },
  CANCEL_ORDER: { label: 'Cancel', className: 'btn btn-sm btn-outline-danger' },
  UPDATE_QUOTE: { label: 'Update Quote', className: 'btn btn-sm btn-warning' },
};

function getActionButtonLabel(action, kind) {
  if (kind === 'deliveryOrderRequest' && action === 'CREATE_ORDER') return 'Create quote';
  if (kind === 'deliveryOrderRequest' && action === 'REJECT_REQUEST') return 'Reject request';
  return ACTION_BUTTONS[action]?.label || action;
}
