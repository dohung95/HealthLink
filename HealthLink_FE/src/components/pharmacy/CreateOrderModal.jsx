import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import medicineApi from '../../api/medicineApi';
import pharmacyApi from '../../api/pharmacyApi';
import { money } from '../../utils/pharmacy/pharmacyHelpers';
import OrderItemCard from './OrderItemCard';

const VALID_TIMINGS = new Set(['MORNING', 'AFTERNOON', 'EVENING']);

function normalizeTimingForPayload(rawTiming) {
  if (!rawTiming) return '';
  const tokens = String(rawTiming)
    .split(',')
    .map((token) => token.trim().toUpperCase())
    .filter((token) => VALID_TIMINGS.has(token));
  return [...new Set(tokens)].join(',');
}

function lineTotal(item) {
  return Number(item.quantity || 0) * Number(item.unitPrice || 0);
}

function toOrderItemPayload(item) {
  const timing = normalizeTimingForPayload(item.timing);
  return {
    medicineId: item.medicineId,
    totalSupplyDays: Number(item.totalSupplyDays || 1),
    quantity: Number(item.quantity || 1),
    unit: item.unit || undefined,
    frequency: item.frequency || undefined,
    timing: timing || undefined,
    route: item.route || undefined,
    unitPrice: Number(item.unitPrice || 0),
    notes: item.notes || undefined,
    sourcePrescriptionHeaderId: item.sourcePrescriptionHeaderId,
    sourcePrescriptionItemId: item.sourcePrescriptionItemId,
  };
}

function getPrescriptionItems(prescription) {
  return prescription.items || prescription.medications || [];
}

function getPrescriptionId(prescription) {
  return prescription.prescriptionHeaderId || prescription.prescriptionHeaderID || prescription.id || 'N/A';
}

function getPrescriptionItemKey(prescription, item, index) {
  const prescriptionId = getPrescriptionId(prescription);
  const itemId = item.prescriptionItemId || item.prescriptionItemID || item.id || null;
  return `${prescriptionId}-${itemId || item.medicineId || item.medicationName || index}`;
}

function getPrescriptionMedicationName(item) {
  return item.medicationName
    || item.name
    || item.medicineName
    || item.brandName
    || item.genericName
    || item.medicine?.name
    || item.medicine?.medicineName
    || `Medicine #${item.medicineId || item.medicineID || 'N/A'}`;
}

function getTimingText(item) {
  if (Array.isArray(item.timings) && item.timings.length) return item.timings.join(',');
  return item.timing || '';
}

function normalizeTimingWithNotesFallback(item) {
  const rawTiming = getTimingText(item);
  const normalized = normalizeTimingForPayload(rawTiming);
  const rawTokens = String(rawTiming)
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
  const invalidTokens = rawTokens.filter(
    (token) => !VALID_TIMINGS.has(token.trim().toUpperCase()),
  );
  const existingNotes = item.notes || item.instructions || '';
  if (invalidTokens.length > 0 && !normalized) {
    const timingNote = `Timing note: ${invalidTokens.join(', ')}`;
    return {
      timing: '',
      notes: existingNotes
        ? `${existingNotes}\n${timingNote}`
        : timingNote,
    };
  }
  return {
    timing: normalized,
    notes: existingNotes,
  };
}

function mapPrescriptionToOrderItems(prescription) {
  const rawPrescriptionId = prescription.prescriptionHeaderId || prescription.prescriptionHeaderID || prescription.id || null;
  const prescriptionId = rawPrescriptionId || 'unknown';
  return getPrescriptionItems(prescription).map((item, index) => {
    const originalItemId = item.prescriptionItemId || item.prescriptionItemID || item.id || null;
    const medicineId = item.medicineId || item.medicineID || item.medicine?.medicineId || item.medicine?.id;
    const { timing, notes } = normalizeTimingWithNotesFallback(item);
    return {
      localId: `rx-${Date.now()}-${prescriptionId}-${originalItemId || medicineId || index}`,
      medicineId,
      medicationName: getPrescriptionMedicationName(item),
      totalSupplyDays: Number(item.totalSupplyDays || 1),
      quantity: Number(item.quantity || 1),
      unit: item.unit || item.medicine?.unit || 'unit',
      frequency: item.frequency || '',
      timing,
      route: item.route || '',
      unitPrice: Number(item.unitPrice || item.price || item.medicine?.price || 0),
      notes,
      sourcePrescriptionHeaderId: rawPrescriptionId,
      sourcePrescriptionItemId: originalItemId,
      sourcePrescriptionItemKey: getPrescriptionItemKey(prescription, item, index),
    };
  });
}

function getMedicineDisplayName(medicine = {}) {
  const brandName = medicine.brandName || '';
  const genericName = medicine.genericName || medicine.name || medicine.medicineName || '';
  if (brandName && genericName && brandName.toLowerCase() !== genericName.toLowerCase()) {
    return `${brandName} (${genericName})`;
  }
  return brandName || genericName || `Medicine #${medicine.medicineId || medicine.id || 'N/A'}`;
}

const DELIVERY_TIME_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '60 minutes' },
  { value: 0, label: 'Custom' },
];

export default function CreateOrderModal({ request, profile, onClose, onCreated }) {
  const [leftTab, setLeftTab] = useState('prescriptions');
  const [orderItems, setOrderItems] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [deliveryMinutes, setDeliveryMinutes] = useState(null);
  const [customMinutes, setCustomMinutes] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);

  useEffect(() => {
    const preferredDelivery = normalizeDelivery(request?.preferredDeliveryType);
    setDeliveryEnabled(preferredDelivery);
    setDeliveryFee(preferredDelivery ? String(profile?.deliveryFee ?? 0) : '');
  }, [profile?.deliveryFee, request?.preferredDeliveryType, request?.requestId]);

  useEffect(() => {
    if (!request?.requestId) return;
    let alive = true;
    setLoadingPrescriptions(true);
    pharmacyApi.getRequestPrescriptions(request.requestId)
      .then((data) => { if (alive) setPrescriptions(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) setPrescriptions([]); })
      .finally(() => { if (alive) setLoadingPrescriptions(false); });
    return () => { alive = false; };
  }, [request?.requestId]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const importedItemKeys = useMemo(
    () => new Set(orderItems.map((oi) => oi.sourcePrescriptionItemKey).filter(Boolean)),
    [orderItems],
  );

  const selectedMedicineIds = useMemo(
    () => new Set(orderItems.map((oi) => oi.medicineId).filter(Boolean)),
    [orderItems],
  );

  const medicationSubtotal = orderItems.reduce((sum, item) => sum + lineTotal(item), 0);
  const deliveryFeeAmount = deliveryEnabled ? Number(deliveryFee || 0) : 0;
  const orderTotal = medicationSubtotal + deliveryFeeAmount;

  const importOrderItems = (mappedItems) => {
    if (!mappedItems.length) {
      toast.error('This prescription has no medications to import.');
      return;
    }
    const existingKeys = new Set(orderItems.map((oi) => oi.sourcePrescriptionItemKey).filter(Boolean));
    const imported = mappedItems.filter((oi) => !oi.sourcePrescriptionItemKey || !existingKeys.has(oi.sourcePrescriptionItemKey));
    if (!imported.length) {
      toast.info('All medications from this prescription are already in the order.');
      return;
    }
    setOrderItems((current) => [...current, ...imported]);
    toast.success(`${imported.length} medication${imported.length === 1 ? '' : 's'} imported.`);
  };

  const addMedicine = (medicine) => {
    const medicineId = medicine?.medicineId || medicine?.id;
    if (!medicineId) {
      toast.error('Selected medicine is missing an ID.');
      return;
    }
    setOrderItems((current) => {
      if (current.some((item) => item.medicineId === medicineId)) {
        return current;
      }
      return [
        ...current,
        {
          localId: `lib-${Date.now()}-${medicineId}`,
          medicineId,
          medicationName: getMedicineDisplayName(medicine),
          totalSupplyDays: 1,
          quantity: 1,
          unit: medicine.unit || 'unit',
          frequency: 'As directed',
          timing: '',
          route: '',
          unitPrice: Number(medicine.price || medicine.unitPrice || 0),
          notes: '',
        },
      ];
    });
    toast.success('Medicine added to order.');
  };

  const updateItem = (localId, field, value) => {
    setOrderItems((current) => current.map((item) => (
      item.localId === localId ? { ...item, [field]: value } : item
    )));
  };

  const removeItem = (localId) => {
    setOrderItems((current) => current.filter((item) => item.localId !== localId));
  };

  const handleCreateOrder = async (event) => {
    event.preventDefault();
    if (!orderItems.length) {
      toast.error('Add at least one medication.');
      return;
    }
    if (deliveryEnabled && !deliveryMinutes && !customMinutes) {
      toast.error('Please provide an estimated delivery time for delivery orders.');
      return;
    }
    setCreatingOrder(true);
    try {
      const resolvedMinutes = deliveryMinutes === 0
        ? Number(customMinutes)
        : deliveryMinutes;
      const payload = {
        deliveryType: deliveryEnabled ? 'Delivery' : 'Pickup',
        deliveryFee: deliveryFeeAmount,
        estimatedDeliveryMinutes: deliveryEnabled ? resolvedMinutes : null,
        paymentMethod: 'Cash',
        notes: request.additionalNotes,
        items: orderItems.map(toOrderItemPayload),
      };
      await pharmacyApi.createOrderFromRequest(request.requestId, payload);
      toast.success('Order created from request.');
      setOrderItems([]);
      await onCreated();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create order.');
    } finally {
      setCreatingOrder(false);
    }
  };

  return (
    <div className="pharmacy-create-order-modal">
      <button className="pharmacy-create-order-backdrop" onClick={onClose} type="button" aria-label="Close" />
      <div className="pharmacy-create-order-dialog" role="dialog" aria-modal="true">
        <div className="pharmacy-create-order-header">
          <h2>
            <i className="bi bi-bag-plus me-2"></i>
            Create Order
          </h2>
          <span className="text-muted small">{request?.displayId || `Request #${request?.requestId}`}</span>
          <button className="btn btn-light btn-sm ms-auto" onClick={onClose} type="button" aria-label="Close">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="pharmacy-create-order-layout">
          <div className="pharmacy-create-order-left">
            <div className="pharmacy-create-order-tabs">
              <button
                className={`pharmacy-tab-btn ${leftTab === 'prescriptions' ? 'is-active' : ''}`}
                onClick={() => setLeftTab('prescriptions')}
                type="button"
              >
                <i className="bi bi-prescription me-1"></i>
                Prescriptions
              </button>
              <button
                className={`pharmacy-tab-btn ${leftTab === 'medicine' ? 'is-active' : ''}`}
                onClick={() => setLeftTab('medicine')}
                type="button"
              >
                <i className="bi bi-capsule me-1"></i>
                Medicine Library
              </button>
            </div>

            <div className="pharmacy-create-order-left-content">
              {leftTab === 'prescriptions' ? (
                loadingPrescriptions ? (
                  <div className="pharmacy-bootstrap-loading">
                    <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
                    <span>Loading prescriptions...</span>
                  </div>
                ) : prescriptions.length === 0 ? (
                  <div className="pharmacy-empty compact">
                    <span className="material-symbols-outlined">prescriptions</span>
                    <h3>No prescriptions provided</h3>
                    <p>Prescriptions shared by the patient will appear here for import.</p>
                  </div>
                ) : (
                  <div>
                    <p className="pharmacy-muted small mb-2">
                      {prescriptions.length} prescription{prescriptions.length === 1 ? '' : 's'} provided
                    </p>
                    <div className="pharmacy-prescription-list">
                      {prescriptions.map((prescription) => {
                        const items = getPrescriptionItems(prescription);
                        const importableItems = mapPrescriptionToOrderItems(prescription).filter(
                          (pItem) => !pItem.sourcePrescriptionItemKey || !importedItemKeys.has(pItem.sourcePrescriptionItemKey),
                        );
                        const fullyImported = items.length > 0 && importableItems.length === 0;
                        return (
                          <div className={`card mb-2 pharmacy-prescription-card ${fullyImported ? 'border-success' : ''}`} key={getPrescriptionId(prescription)}>
                            <div className="card-body py-2 px-3">
                              <div className="d-flex justify-content-between align-items-start">
                                <div>
                                  <strong className="small">Prescription #{getPrescriptionId(prescription)}</strong>
                                  <span className="pharmacy-muted ms-2 small">{prescription.diagnosis || prescription.doctorName || ''}</span>
                                </div>
                                <button
                                  className={`btn btn-sm ${fullyImported ? 'btn-outline-secondary' : 'btn-outline-primary'}`}
                                  disabled={fullyImported || !items.length}
                                  onClick={() => importOrderItems(mapPrescriptionToOrderItems(prescription))}
                                  type="button"
                                >
                                  <i className={`bi ${fullyImported ? 'bi-check2' : 'bi-box-arrow-in-down'} me-1`}></i>
                                  {fullyImported ? 'Imported' : 'Import'}
                                </button>
                              </div>
                              {items.slice(0, 2).map((pItem, idx) => (
                                <small key={idx} className="d-block text-muted ms-2">
                                  {getPrescriptionMedicationName(pItem)} - {pItem.quantity || 0} {pItem.unit || 'unit'}
                                </small>
                              ))}
                              {items.length > 2 && <small className="text-muted ms-2">+{items.length - 2} more</small>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              ) : (
                <MedicineLibraryPanel
                  selectedMedicineIds={selectedMedicineIds}
                  onAddMedicine={addMedicine}
                />
              )}
            </div>
          </div>

          <div className="pharmacy-create-order-center">
            <div className="pharmacy-create-order-section-header">
              <h3>
                <i className="bi bi-cart me-2"></i>
                Selected Medicines
              </h3>
              <span className="badge bg-primary rounded-pill">{orderItems.length}</span>
            </div>

            <div className="pharmacy-create-order-items">
              {orderItems.length === 0 ? (
                <div className="pharmacy-empty compact">
                  <span className="material-symbols-outlined">medication</span>
                  <h3>No medications</h3>
                  <p>Import from prescriptions or search the medicine library on the left.</p>
                </div>
              ) : (
                orderItems.map((orderItem) => (
                  <OrderItemCard
                    item={orderItem}
                    key={orderItem.localId}
                    onRemove={removeItem}
                    onUpdate={updateItem}
                  />
                ))
              )}
            </div>
          </div>

          <div className="pharmacy-create-order-right">
            <div className="pharmacy-create-order-section-header">
              <h3>
                <i className="bi bi-receipt me-2"></i>
                Invoice Summary
              </h3>
            </div>

            <div className="pharmacy-invoice-summary">
              <div className="pharmacy-invoice-row">
                <span>Medications ({orderItems.length} items)</span>
                <strong>{money(medicationSubtotal)}</strong>
              </div>

              <div className="pharmacy-invoice-divider"></div>

              <div className="form-check form-switch mb-2">
                <input
                  checked={deliveryEnabled}
                  className="form-check-input"
                  id="pharmacy-modal-delivery"
                  onChange={(e) => {
                    setDeliveryEnabled(e.target.checked);
                    if (e.target.checked) {
                      setDeliveryFee((current) => current || String(profile?.deliveryFee ?? 0));
                    } else {
                      setDeliveryFee('');
                      setDeliveryMinutes(null);
                      setCustomMinutes('');
                    }
                  }}
                  type="checkbox"
                />
                <label className="form-check-label small" htmlFor="pharmacy-modal-delivery">
                  Home delivery
                </label>
              </div>

              {deliveryEnabled && (
                <div className="pharmacy-invoice-delivery-fields">
                  <div className="mb-2">
                    <label className="form-label small">Delivery fee</label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text">$</span>
                      <input
                        className="form-control"
                        min="0"
                        onChange={(e) => setDeliveryFee(e.target.value)}
                        step="0.01"
                        type="number"
                        value={deliveryFee}
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small">Delivery time</label>
                    <select
                      className="form-select form-select-sm"
                      onChange={(e) => setDeliveryMinutes(Number(e.target.value))}
                      value={deliveryMinutes ?? ''}
                    >
                      <option value="" disabled>Select time</option>
                      {DELIVERY_TIME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {deliveryMinutes === 0 && (
                      <div className="mt-1">
                        <input
                          className="form-control form-control-sm"
                          min="1"
                          onChange={(e) => setCustomMinutes(e.target.value)}
                          placeholder="Minutes"
                          type="number"
                          value={customMinutes}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pharmacy-invoice-divider"></div>

              <div className="pharmacy-invoice-row">
                <span>Delivery fee</span>
                <strong>{money(deliveryFeeAmount)}</strong>
              </div>

              <div className="pharmacy-invoice-divider"></div>

              <div className="pharmacy-invoice-total">
                <span>Total</span>
                <strong>{money(orderTotal)}</strong>
              </div>

              <button
                className="btn btn-primary w-100 mt-3"
                disabled={creatingOrder || !orderItems.length}
                onClick={handleCreateOrder}
                type="button"
              >
                {creatingOrder ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-bag-check me-2"></i>
                    Create Order - {money(orderTotal)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeDelivery(value) {
  return String(value || '').trim().toUpperCase() === 'DELIVERY';
}

function MedicineLibraryPanel({
  selectedMedicineIds,
  onAddMedicine,
}) {
  const [query, setQuery] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(() => ({
    brandName: true,
    genericName: true,
    dosageForm: false,
    manufacturer: false,
  }));

  useEffect(() => {
    let alive = true;
    medicineApi.searchMedicines()
      .then((data) => {
        if (alive) setMedicines(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (alive) setMedicines([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const medicineOptions = useMemo(() => medicines.map((m) => {
    const displayName = getMedicineDisplayName(m);
    const medicineId = m.medicineId || m.id;
    const dosageLabel = [m.strength, m.dosageForm].filter(Boolean).join(' - ');
    const searchableText = [displayName, m.brandName, m.genericName, m.name, m.medicineName, m.dosageForm, m.strength, m.manufacturer, m.unit]
      .filter(Boolean).join(' ').toLowerCase();
    return { ...m, medicineId, displayName, dosageLabel, searchLabel: [displayName, dosageLabel].filter(Boolean).join(' - '), searchableText };
  }), [medicines]);

  const filteredMedicines = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return medicineOptions;
    const LIBRARY_FILTERS = [
      { key: 'brandName', label: 'Brand Name' },
      { key: 'genericName', label: 'Generic Name' },
      { key: 'dosageForm', label: 'Dosage Form' },
      { key: 'manufacturer', label: 'Manufacturer' },
    ];
    const enabledKeys = LIBRARY_FILTERS.filter((f) => filters[f.key]).map((f) => f.key);
    return medicineOptions.filter((med) => (
      med.searchableText.includes(normalizedQuery)
      || enabledKeys.some((key) => String(med[key] || '').toLowerCase().includes(normalizedQuery))
    ));
  }, [filters, medicineOptions, query]);

  return (
    <div>
      <div className="d-flex gap-1 mb-2">
        <div className="input-group input-group-sm flex-grow-1">
          <span className="input-group-text"><i className="bi bi-search"></i></span>
          <input
            className="form-control"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search medicines..."
            value={query}
          />
        </div>
        <button className="btn btn-light btn-sm" onClick={() => setShowFilters((c) => !c)} type="button">
          <i className="bi bi-funnel"></i>
        </button>
      </div>

      {showFilters && (
        <div className="d-flex gap-2 p-1 mb-2 border rounded">
          {['brandName', 'genericName', 'dosageForm', 'manufacturer'].map((key) => (
            <label className="form-check form-check-inline small" key={key}>
              <input checked={filters[key]} className="form-check-input" onChange={() => setFilters((c) => ({ ...c, [key]: !c[key] }))} type="checkbox" />
              <span className="form-check-label">{key === 'brandName' ? 'Brand' : key === 'genericName' ? 'Generic' : key === 'dosageForm' ? 'Form' : 'Mfr'}</span>
            </label>
          ))}
        </div>
      )}

      <div className="pharmacy-create-order-library-results">
        {loading ? (
          <div className="pharmacy-bootstrap-loading compact">
            <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
            <span>Loading medicines...</span>
          </div>
        ) : filteredMedicines.length === 0 ? (
          <div className="pharmacy-empty compact">
            <span className="material-symbols-outlined">search</span>
            <h3>No medicines matched</h3>
          </div>
        ) : (
          <>
            {filteredMedicines.map((medicine) => {
              const isSelected = selectedMedicineIds.has(medicine.medicineId);
              return (
                <div
                  className="pharmacy-medicine-library-result compact"
                  key={medicine.medicineId || medicine.displayName}
                >
                  <span className="pharmacy-medicine-library-name">
                    {medicine.displayName}
                  </span>
                  <span className={`pharmacy-medicine-library-dosage ${medicine.dosageLabel ? '' : 'is-empty'}`}>
                    {medicine.dosageLabel || '-'}
                  </span>
                  <button
                    className={`pharmacy-library-icon-button ${isSelected ? 'is-added' : ''}`}
                    disabled={isSelected}
                    onClick={() => onAddMedicine(medicine)}
                    type="button"
                    aria-label={isSelected ? 'Medicine already added' : 'Add medicine'}
                    title={isSelected ? 'Already added' : 'Add medicine'}
                  >
                    <i className={`bi ${isSelected ? 'bi-check2' : 'bi-plus-lg'}`}></i>
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
