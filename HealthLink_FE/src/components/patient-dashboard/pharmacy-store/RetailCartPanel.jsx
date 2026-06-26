import { cartSubtotal, getMedicineDisplayName, money } from './retailStoreUtils';

export default function RetailCartPanel({ items, onIncrement, onDecrement, onRemove, onCheckout }) {
  const subtotal = cartSubtotal(items);

  return (
    <div className="card retail-cart-panel shadow-sm">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h5 className="mb-0">Cart</h5>
            <div className="small text-muted">{items.length} items</div>
          </div>
          <div className="retail-cart-total">{money(subtotal)}</div>
        </div>

        {items.length === 0 ? (
          <div className="retail-cart-empty text-center text-muted">
            <i className="bi bi-bag"></i>
            <p className="mb-0">Add over-the-counter medicines to start checkout.</p>
          </div>
        ) : (
          <>
            <div className="retail-cart-items">
              {items.map((item) => (
                <div className="retail-cart-item" key={item.medicineId}>
                  <div className="retail-cart-item-main">
                    <div className="fw-medium">{getMedicineDisplayName(item)}</div>
                    <div className="small text-muted">{money(item.price)} each</div>
                  </div>
                  <div className="retail-cart-item-side">
                    <div className="retail-qty-control">
                      <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => onDecrement(item.medicineId)}>
                        <i className="bi bi-dash"></i>
                      </button>
                      <span>{item.quantity}</span>
                      <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => onIncrement(item.medicineId)}>
                        <i className="bi bi-plus"></i>
                      </button>
                    </div>
                    <button className="btn btn-link text-danger btn-sm p-0" type="button" onClick={() => onRemove(item.medicineId)}>
                      <i className="bi bi-trash3"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="retail-cart-footer">
              <div className="d-flex justify-content-between small text-muted mb-1">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <button className="btn btn-primary w-100" type="button" onClick={onCheckout}>
                Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
