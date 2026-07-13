import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { money } from '../../utils/pharmacy/pharmacyHelpers';

export default function DeliveryChangeConfirmModal({
  mode,
  item,
  payload,
  saving,
  onCancel,
  onConfirm,
}) {
  const titleRef = useRef(null);
  const isReject = mode === 'REJECT';
  const title = isReject ? 'Reject delivery change' : 'Approve delivery change';

  useEffect(() => {
    titleRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, saving]);

  return createPortal(
    <div
      aria-labelledby="delivery-change-confirm-title"
      aria-modal="true"
      className={`pharmacy-delivery-change-modal ${isReject ? 'is-danger' : ''}`}
      role="dialog"
    >
      <button
        aria-label="Cancel delivery change review"
        className="pharmacy-delivery-change-modal__backdrop"
        disabled={saving}
        onClick={onCancel}
        type="button"
      />
      <div className="pharmacy-delivery-change-modal__card">
        <div className="pharmacy-delivery-change-modal__header">
          <div>
            <span className="material-symbols-outlined" aria-hidden="true">
              {isReject ? 'warning' : 'local_shipping'}
            </span>
            <h2 ref={titleRef} id="delivery-change-confirm-title" tabIndex="-1">{title}</h2>
          </div>
          <button
            aria-label="Close delivery change confirmation"
            className="pharmacy-delivery-change-modal__close"
            disabled={saving}
            onClick={onCancel}
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="pharmacy-delivery-change-modal__body">
          <p>
            {isReject
              ? 'Review the requested delivery details before declining this change.'
              : 'Review the revised delivery details before sending the decision to the patient.'}
          </p>
          <dl className="pharmacy-delivery-change-modal__details">
            <div>
              <dt>Current address</dt>
              <dd>{item.oldDeliveryAddress || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Requested address</dt>
              <dd>{item.newDeliveryAddress || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Patient reason</dt>
              <dd>{item.deliveryContactChangeReason || 'No reason provided'}</dd>
            </div>
            {isReject ? null : (
              <>
                <div>
                  <dt>Old delivery fee</dt>
                  <dd>{item.oldDeliveryFee != null ? money(item.oldDeliveryFee) : 'Not provided'}</dd>
                </div>
                <div>
                  <dt>New delivery fee</dt>
                  <dd>{money(payload.deliveryFee)}</dd>
                </div>
                <div>
                  <dt>Estimated arrival</dt>
                  <dd>{payload.estimatedDeliveryMinutes} minutes</dd>
                </div>
              </>
            )}
          </dl>
          {isReject ? (
            <p className="pharmacy-delivery-change-modal__notice is-danger">
              The requested address and delivery contact will remain unchanged.
            </p>
          ) : (
            <p className="pharmacy-delivery-change-modal__notice">
              The patient must reconfirm the updated delivery fee before payment can continue.
            </p>
          )}
        </div>

        <div className="pharmacy-delivery-change-modal__actions">
          <button className="btn btn-light" disabled={saving} onClick={onCancel} type="button">
            Cancel
          </button>
          <button className={`btn ${isReject ? 'btn-danger' : 'btn-success'}`} disabled={saving} onClick={() => onConfirm(payload)} type="button">
            {saving ? (isReject ? 'Rejecting...' : 'Approving...') : (isReject ? 'Reject change' : 'Approve change')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
