import { getMedicineDisplayName, getShortDescription, money } from './retailStoreUtils';

export default function RetailProductCard({ medicine, inCartQuantity, onAdd, onOpenDetail }) {
  const disabled = medicine?.prescriptionRequired;

  return (
    <div className="card retail-product-card h-100 shadow-sm">
      <div className="retail-product-media">
        {medicine?.imageUrl ? (
          <img src={medicine.imageUrl} alt={getMedicineDisplayName(medicine)} />
        ) : (
          <div className="retail-product-fallback">
            <i className="bi bi-capsule-pill"></i>
          </div>
        )}
      </div>

      <div className="card-body d-flex flex-column">
        <div className="d-flex flex-wrap gap-2 align-items-start mb-2">
          <h6 className="card-title mb-0 flex-grow-1">{getMedicineDisplayName(medicine)}</h6>
          {medicine?.prescriptionRequired && (
            <span className="badge text-bg-warning">Prescription</span>
          )}
        </div>

        <div className="small text-muted mb-2">
          {[medicine?.dosageForm, medicine?.category].filter(Boolean).join(' • ') || 'General'}
        </div>

        <p className="card-text text-muted small flex-grow-1">{getShortDescription(medicine)}</p>

        <div className="d-flex align-items-center justify-content-between gap-2 mt-2">
          <div className="fw-semibold">{money(medicine?.price)}</div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => onOpenDetail(medicine)}>
              Details
            </button>
            <button
              className="btn btn-primary btn-sm"
              type="button"
              disabled={disabled}
              onClick={() => onAdd(medicine)}
            >
              {inCartQuantity > 0 ? `In cart: ${inCartQuantity}` : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
