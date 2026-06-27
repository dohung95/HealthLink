import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getProfile } from '../../../api/account';
import medicineApi from '../../../api/medicineApi';
import RetailCartPanel from './RetailCartPanel';
import RetailCheckoutWizard from './RetailCheckoutWizard';
import RetailProductCard from './RetailProductCard';
import { cartSubtotal, getMedicineDisplayName, getShortDescription, money } from './retailStoreUtils';
import './RetailPharmacyStore.css';

function deriveOptions(products, field) {
  return [...new Set((products || []).map((item) => item?.[field]).filter(Boolean))].sort();
}

export default function RetailPharmacyStore({ navigate }) {
  const [products, setProducts] = useState([]);
  const [catalogOptions, setCatalogOptions] = useState({ categories: [], dosageForms: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [dosageForm, setDosageForm] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [patientProfile, setPatientProfile] = useState(null);
  const [geolocation, setGeolocation] = useState(null);
  const [geoTried, setGeoTried] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    medicineApi.searchMedicines({})
      .then((data) => {
        if (!mounted) {
          return;
        }
        const safeData = Array.isArray(data) ? data : [];
        setCatalogOptions({
          categories: deriveOptions(safeData, 'category'),
          dosageForms: deriveOptions(safeData, 'dosageForm'),
        });
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!geoTried && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeolocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          setGeoTried(true);
        },
        () => setGeoTried(true),
        { timeout: 5000 }
      );
    } else {
      setGeoTried(true);
    }
  }, [geoTried]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    getProfile(token)
      .then(setPatientProfile)
      .catch(() => setPatientProfile(null));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await medicineApi.searchMedicines({
          keyword,
          category,
          dosageForm,
        });
        if (!cancelled) {
          setProducts(Array.isArray(result) ? result : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setProducts([]);
          setError(loadError.response?.data?.message || 'Unable to load medicines right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [category, dosageForm, keyword, reloadTick]);

  const cartQuantityById = useMemo(
    () => cartItems.reduce((accumulator, item) => ({ ...accumulator, [item.medicineId]: item.quantity }), {}),
    [cartItems]
  );

  const subtotal = useMemo(() => cartSubtotal(cartItems), [cartItems]);

  const addToCart = (medicine) => {
    if (medicine.prescriptionRequired) {
      toast.error('This medicine requires a prescription.');
      return;
    }

    setCartItems((current) => {
      const existing = current.find((item) => item.medicineId === medicine.medicineId);
      if (existing) {
        return current.map((item) => item.medicineId === medicine.medicineId
          ? { ...item, quantity: item.quantity + 1 }
          : item);
      }

      return [...current, {
        ...medicine,
        quantity: 1,
      }];
    });
  };

  const incrementItem = (medicineId) => {
    setCartItems((current) => current.map((item) => item.medicineId === medicineId
      ? { ...item, quantity: item.quantity + 1 }
      : item));
  };

  const decrementItem = (medicineId) => {
    setCartItems((current) => current.map((item) => item.medicineId === medicineId
      ? { ...item, quantity: Math.max(1, item.quantity - 1) }
      : item));
  };

  const removeItem = (medicineId) => {
    setCartItems((current) => current.filter((item) => item.medicineId !== medicineId));
  };

  const handleCreated = (order) => {
    setCheckoutOpen(false);
    setCartItems([]);
    navigate(`/patient-dashboard/pharmacy/orders/${order.orderId}`);
  };

  return (
    <div className="retail-pharmacy-store">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h4 className="mb-1">Medicine Store</h4>
          <div className="text-muted">Browse over-the-counter medicines and place a retail pharmacy order.</div>
        </div>
        <div className="small text-muted">Subtotal: <strong>{money(subtotal)}</strong></div>
      </div>

      <div className="retail-store-layout">
        <div>
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small">Search</label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-search"></i></span>
                    <input
                      className="form-control"
                      placeholder="Name, brand, category, dosage..."
                      value={keyword}
                      onChange={(event) => setKeyword(event.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Category</label>
                  <select className="form-select" value={category} onChange={(event) => setCategory(event.target.value)}>
                    <option value="">All categories</option>
                    {catalogOptions.categories.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Dosage form</label>
                  <select className="form-select" value={dosageForm} onChange={(event) => setDosageForm(event.target.value)}>
                    <option value="">All forms</option>
                    {catalogOptions.dosageForms.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
              <span>{error}</span>
              <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => setReloadTick((current) => current + 1)}>
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="retail-product-grid">
              {[...Array(6)].map((_, index) => (
                <div className="card shadow-sm" key={index}>
                  <div className="placeholder-glow">
                    <div className="placeholder retail-skeleton-media w-100"></div>
                    <div className="card-body">
                      <span className="placeholder col-8 mb-2"></span>
                      <span className="placeholder col-5 mb-3"></span>
                      <span className="placeholder col-12 mb-1"></span>
                      <span className="placeholder col-10 mb-3"></span>
                      <span className="placeholder col-4"></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="card shadow-sm">
              <div className="card-body text-center py-5 text-muted">
                <i className="bi bi-search" style={{ fontSize: '2rem' }}></i>
                <p className="mt-2 mb-0">No medicines match your filters.</p>
              </div>
            </div>
          ) : (
            <div className="retail-product-grid">
              {products.map((medicine) => (
                <RetailProductCard
                  key={medicine.medicineId}
                  medicine={medicine}
                  inCartQuantity={cartQuantityById[medicine.medicineId] || 0}
                  onAdd={addToCart}
                  onOpenDetail={setSelectedMedicine}
                />
              ))}
            </div>
          )}
        </div>

        <RetailCartPanel
          items={cartItems}
          onIncrement={incrementItem}
          onDecrement={decrementItem}
          onRemove={removeItem}
          onCheckout={() => setCheckoutOpen(true)}
        />
      </div>

      {selectedMedicine && (
        <div className="retail-detail-backdrop" onClick={() => setSelectedMedicine(null)}>
          <div className="retail-detail-modal card shadow" onClick={(event) => event.stopPropagation()}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <h5 className="mb-1">{getMedicineDisplayName(selectedMedicine)}</h5>
                  <div className="small text-muted">{[selectedMedicine.dosageForm, selectedMedicine.category].filter(Boolean).join(' • ')}</div>
                </div>
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setSelectedMedicine(null)}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="row g-3">
                <div className="col-md-5">
                  {selectedMedicine.imageUrl ? (
                    <>
                      <img 
                        className="img-fluid rounded" 
                        src={selectedMedicine.imageUrl} 
                        alt={getMedicineDisplayName(selectedMedicine)} 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextElementSibling) {
                            e.target.nextElementSibling.style.display = 'flex';
                          }
                        }}
                      />
                      <div className="retail-product-fallback retail-detail-fallback" style={{ display: 'none' }}>
                        <i className="bi bi-capsule-pill"></i>
                      </div>
                    </>
                  ) : (
                    <div className="retail-product-fallback retail-detail-fallback">
                      <i className="bi bi-capsule-pill"></i>
                    </div>
                  )}
                </div>
                <div className="col-md-7">
                  <div className="fw-semibold mb-2">{money(selectedMedicine.price)}</div>
                  {selectedMedicine.prescriptionRequired && (
                    <div className="alert alert-warning py-2 small">This medicine requires a prescription and cannot be added to the retail cart.</div>
                  )}
                  <p className="text-muted">{getShortDescription(selectedMedicine)}</p>
                  <div className="small text-muted">
                    <div><strong>Brand:</strong> {selectedMedicine.brandName || 'N/A'}</div>
                    <div><strong>Generic:</strong> {selectedMedicine.genericName || 'N/A'}</div>
                    <div><strong>Unit:</strong> {selectedMedicine.unit || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {checkoutOpen && (
        <RetailCheckoutWizard
          items={cartItems}
          patientProfile={patientProfile}
          geolocation={geolocation}
          geoTried={geoTried}
          onClose={() => setCheckoutOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
