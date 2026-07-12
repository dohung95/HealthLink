import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import pharmacyApi from '../../../api/pharmacyApi';
import { money } from '../../../utils/pharmacy/pharmacyHelpers';
import DeliveryDurationPicker from './DeliveryDurationPicker';
import MedicineLibraryPanel from './MedicineLibraryPanel';
import OrderItemEditor from './OrderItemEditor';
import RequestSummaryPanel from './RequestSummaryPanel';
import { normalizeTimings, serializeTimings } from './orderItemSchedule';

function lineTotal(item) {
  return Number(item.totalPrice || 0);
}

function toOrderItemPayload(item) {
  const timing = serializeTimings(item.timing);
  return {
    medicineId: item.medicineId,
    totalSupplyDays: Number(item.totalSupplyDays || 1),
    quantity: Number(item.quantity || 1),
    unit: item.unit || undefined,
    frequency: item.frequency || undefined,
    timing: timing || undefined,
    route: item.route || undefined,
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
  const normalized = serializeTimings(rawTiming);
  const rawTokens = String(rawTiming)
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
  const normalizedTimings = new Set(normalizeTimings(rawTiming));
  const invalidTokens = rawTokens.filter(
    (token) => !normalizedTimings.has(token.trim().toUpperCase()),
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

function mapPrescriptionToOrderItems(prescription, priceLookup = new Map()) {
  const rawPrescriptionId = prescription.prescriptionHeaderId || prescription.prescriptionHeaderID || prescription.id || null;
  const prescriptionId = rawPrescriptionId || 'unknown';
  return getPrescriptionItems(prescription).map((item, index) => {
    const originalItemId = item.prescriptionItemId || item.prescriptionItemID || item.id || null;
    const medicineId = getMedicineId(item);
    const quantity = Number(item.quantity || 1);
    const unitPrice = getMedicinePrice(item, priceLookup);
    const { timing, notes } = normalizeTimingWithNotesFallback(item);
    return {
      localId: `rx-${Date.now()}-${prescriptionId}-${originalItemId || medicineId || index}`,
      medicineId,
      medicationName: getPrescriptionMedicationName(item),
      totalSupplyDays: Number(item.totalSupplyDays || 1),
      quantity,
      unit: item.unit || item.medicine?.unit || 'unit',
      frequency: item.frequency || '',
      timing,
      route: item.route || '',
      totalPrice: Number(item.totalPrice || 0) || (quantity * unitPrice),
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

function getMedicineId(value) {
  return value?.medicineId || value?.medicineID || value?.id || value?.medicine?.medicineId || value?.medicine?.id;
}

function getMedicinePrice(value, priceLookup = new Map()) {
  const direct = Number(
    value?.price
    ?? value?.unitPrice
    ?? value?.medicinePrice
    ?? value?.medicine?.price
    ?? value?.medicine?.unitPrice
    ?? 0,
  );
  if (Number.isFinite(direct) && direct > 0) return direct;
  const medicineId = getMedicineId(value);
  if (medicineId && priceLookup.has(Number(medicineId))) {
    return Number(priceLookup.get(Number(medicineId)) || 0);
  }
  return 0;
}

function normalizeDelivery(value) {
  return String(value || '').trim().toUpperCase() === 'DELIVERY';
}

function isPrescriptionSourcedItem(item) {
  return Boolean(item?.sourcePrescriptionItemId || item?.sourcePrescriptionHeaderId);
}

export default function CreateOrderModal({
  request,
  profile,
  onClose,
  onCreated,
  variant = 'default',
  mode = 'createFromRequest',
  orderId,
}) {
  const isConsultMode = variant === 'consult';
  const isQuoteRevision = mode === 'updateQuote';
  const isOrderRequest = request?.requestType === 'ORDER_REQUEST' || request?.sourceType === 'ORDER_REQUEST';
  const effectiveOrderId = orderId || request?.orderId || null;
  const [leftTab, setLeftTab] = useState(isConsultMode || isQuoteRevision ? 'summary' : 'prescriptions');
  const showSummaryTab = isConsultMode || isQuoteRevision;
  const isSummaryTab = showSummaryTab && leftTab === 'summary';
  const isMedicinesTab = !isOrderRequest && leftTab === 'medicine';
  const [orderItems, setOrderItems] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [deliveryMinuteDigits, setDeliveryMinuteDigits] = useState([0, 4, 5]);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [medicineCatalog, setMedicineCatalog] = useState([]);
  const [existingOrder, setExistingOrder] = useState(null);
  const [existingOrderLoadError, setExistingOrderLoadError] = useState(false);
  const [existingOrderReloadKey, setExistingOrderReloadKey] = useState(0);

  const existingOrderItems = useMemo(
    () => existingOrder?.items ?? existingOrder?.orderItems ?? [],
    [existingOrder],
  );
  const hasPrescriptionSource = existingOrderItems.some(isPrescriptionSourcedItem);
  const isExistingOrderLoading = isQuoteRevision && !existingOrder && !existingOrderLoadError;
  const canEditMedicineIdentity = !isOrderRequest
    && !hasPrescriptionSource
    && (!isQuoteRevision || Boolean(existingOrder));

  useEffect(() => {
    if (mode !== 'updateQuote' || !effectiveOrderId) return;
    let alive = true;
    setExistingOrder(null);
    setExistingOrderLoadError(false);
    pharmacyApi.getOrderById(effectiveOrderId)
      .then((data) => {
        if (!alive) return;
        setExistingOrder(data);
      })
      .catch(() => {
        if (!alive) return;
        setExistingOrderLoadError(true);
      });
    return () => { alive = false; };
  }, [mode, effectiveOrderId, existingOrderReloadKey]);

  useEffect(() => {
    if (!existingOrder) return;
    setOrderItems(
      existingOrderItems.map((item, index) => ({
        localId: `existing-${Date.now()}-${index}`,
        medicineId: item.medicineId,
        medicationName: item.medicationName,
        totalSupplyDays: Number(item.totalSupplyDays || 1),
        quantity: Number(item.quantity || 1),
        unit: item.unit || '',
        frequency: item.frequency || '',
        timing: item.timing || '',
        route: item.route || (isPrescriptionSourcedItem(item) ? '' : 'Oral'),
        totalPrice: Number(item.totalPrice || 0),
        notes: item.notes || '',
        sourcePrescriptionHeaderId: item.sourcePrescriptionHeaderId,
        sourcePrescriptionItemId: item.sourcePrescriptionItemId,
      })),
    );
    setDeliveryEnabled(normalizeDelivery(existingOrder.deliveryType));
    setDeliveryFee(existingOrder.deliveryFee != null ? String(existingOrder.deliveryFee) : '');
    if (existingOrder.estimatedDeliveryMinutes != null) {
      const str = String(existingOrder.estimatedDeliveryMinutes).padStart(3, '0');
      setDeliveryMinuteDigits(str.split('').map(Number));
    }
  }, [existingOrder, existingOrderItems]);

  useEffect(() => {
    if (mode !== 'updateQuote' || !existingOrder) return;
    if (hasPrescriptionSource) {
      toast.error('Cannot update quote for prescription-based orders.');
      onClose();
    }
  }, [mode, existingOrder, hasPrescriptionSource, onClose]);

  useEffect(() => {
    if (mode === 'updateQuote' && existingOrder) return;
    const preferredDelivery = normalizeDelivery(request?.preferredDeliveryType);
    setDeliveryEnabled(preferredDelivery);
    setDeliveryFee(preferredDelivery ? String(profile?.deliveryFee ?? 0) : '0');
  }, [profile?.deliveryFee, request?.preferredDeliveryType, request?.requestId, mode, existingOrder]);

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

  const medicinePriceLookup = useMemo(() => {
    const lookup = new Map();
    medicineCatalog.forEach((med) => {
      const medId = getMedicineId(med);
      if (medId) lookup.set(Number(medId), Number(med.price || 0));
    });
    return lookup;
  }, [medicineCatalog]);

  const importedItemKeys = useMemo(
    () => new Set(orderItems.map((oi) => oi.sourcePrescriptionItemKey).filter(Boolean)),
    [orderItems],
  );

  const selectedMedicineIds = useMemo(
    () => new Set(orderItems.map((oi) => oi.medicineId).filter(Boolean)),
    [orderItems],
  );

  useEffect(() => {
    if (!isOrderRequest || loadingPrescriptions || prescriptions.length === 0) return;
    setOrderItems(prev => {
      if (prev.length > 0) return prev;
      return prescriptions.flatMap((p) => mapPrescriptionToOrderItems(p, medicinePriceLookup));
    });
  }, [isOrderRequest, loadingPrescriptions, prescriptions, medicinePriceLookup]);

  useEffect(() => {
    let alive = true;
    pharmacyApi.getInventory({ availableOnly: true, size: 1000 })
      .then((data) => {
        if (!alive) return;
        const items = data?.content || [];
        const normalized = items.map((inv) => ({
          medicineId: inv.medicineId,
          name: inv.medicineName,
          brandName: inv.medicineName,
          genericName: inv.genericName,
          dosageForm: inv.dosageForm,
          strength: inv.strength,
          unit: inv.unit,
          price: inv.price,
          manufacturer: inv.pharmacyName,
          availableQuantity: inv.availableQuantity,
        }));
        setMedicineCatalog(normalized);
      })
      .catch(() => {
        if (alive) setMedicineCatalog([]);
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event) => {
      if (!isConsultMode && event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isConsultMode, onClose]);

  const medicationSubtotal = orderItems.reduce((sum, item) => sum + lineTotal(item), 0);
  const deliveryFeeAmount = deliveryEnabled ? Number(deliveryFee || 0) : 0;
  const estimatedDeliveryMinutes = Number(deliveryMinuteDigits.join(''));
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
    if (!canEditMedicineIdentity) return;
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
          unit: medicine.unit || '',
          frequency: 'As directed',
          timing: '',
          route: 'Oral',
          totalPrice: Number(medicine.price || 0),
          notes: '',
        },
      ];
    });
    toast.success('Medicine added to order.');
  };

  const replaceItem = (updatedItem) => {
    setOrderItems((current) => current.map((item) => {
      if (item.localId !== updatedItem.localId) return item;
      if (item.quantity === updatedItem.quantity) return updatedItem;
      const price = (item.totalPrice || 0) / (item.quantity || 1);
      return { ...updatedItem, totalPrice: price * Number(updatedItem.quantity) };
    }));
  };

  const removeItem = (localId) => {
    setOrderItems((current) => current.filter((item) => item.localId !== localId));
  };

  const handleCreateOrder = async (event) => {
    event.preventDefault();

    if (mode === 'updateQuote' && !effectiveOrderId) {
      toast.error('Cannot update quote because the order id is missing.');
      return;
    }

    if (!orderItems.length) {
      toast.error('Add at least one medication.');
      return;
    }

    if (isQuoteRevision && (isExistingOrderLoading || existingOrderLoadError || !existingOrder)) {
      toast.error('Load the current quote before updating it.');
      return;
    }
    const missingUnitItem = orderItems.find((item) => !String(item.unit || '').trim());
    if (missingUnitItem) {
      toast.error(`Unit is missing for medicine: ${missingUnitItem.medicationName || 'selected medicine'}`);
      return;
    }
    if (isOrderRequest && !orderItems.every((item) => item.sourcePrescriptionItemId)) {
      toast.error('Order requests can only use medicines from the submitted prescription.');
      return;
    }
    const parsedDeliveryFee = Number(deliveryFee || 0);
    if (deliveryEnabled && (!Number.isFinite(parsedDeliveryFee) || parsedDeliveryFee < 0)) {
      toast.error('Please enter a valid delivery fee.');
      return;
    }
    if (deliveryEnabled && (estimatedDeliveryMinutes < 1 || estimatedDeliveryMinutes > 999)) {
      toast.error('Please select a delivery time from 001 to 999 minutes.');
      return;
    }
    setCreatingOrder(true);
    try {
      const payload = {
        deliveryType: deliveryEnabled ? 'Delivery' : 'Pickup',
        deliveryFee: deliveryEnabled ? parsedDeliveryFee : 0,
        paymentMethod: 'Cash',
        notes: request.additionalNotes,
        items: orderItems.map(toOrderItemPayload),
      };
      if (deliveryEnabled) {
        payload.estimatedDeliveryMinutes = estimatedDeliveryMinutes;
      }
      payload.deliveryAddress = request.deliveryAddress;
      payload.deliveryLatitude = request.deliveryLatitude;
      payload.deliveryLongitude = request.deliveryLongitude;
      payload.deliveryPhoneNumber = request.deliveryPhoneNumber;
      payload.deliveryAddressSource = request.deliveryAddressSource;
      if (mode === 'updateQuote') {
        await pharmacyApi.updateOrderQuote(effectiveOrderId, payload);
        toast.success('Quote updated successfully.');
      } else {
        await pharmacyApi.createOrderFromRequest(request.requestId, payload);
        toast.success(deliveryEnabled ? 'Quote sent to patient for confirmation.' : 'Order created from request.');
      }
      setOrderItems([]);
      await onCreated();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || (mode === 'updateQuote' ? 'Unable to update quote.' : 'Unable to create order.'));
    } finally {
      setCreatingOrder(false);
    }
  };

  return (
    <div className="pharmacy-create-order-modal">
      <button
        className="pharmacy-create-order-backdrop"
        onClick={isConsultMode ? undefined : onClose}
        type="button"
        aria-label={isConsultMode ? 'Consult workflow backdrop' : 'Close'}
        tabIndex={isConsultMode ? -1 : 0}
      />
      <div className="pharmacy-create-order-dialog" role="dialog" aria-modal="true">
        <div className="pharmacy-create-order-header">
          {isConsultMode ? (
            <>
              <h2>
                <i className="bi bi-bag-plus me-2"></i>
                Consult &amp; Order
              </h2>
            </>
          ) : (
            <>
              <h2>
                <i className="bi bi-bag-plus me-2"></i>
                {mode === 'updateQuote' ? 'Update Quote' : 'Create Quote'}
              </h2>
              <span className="text-muted small">{request?.displayId || `Request #${request?.requestId}`}</span>
              <button className="btn btn-light btn-sm ms-auto" onClick={onClose} type="button" aria-label="Close">
                <i className="bi bi-x-lg"></i>
              </button>
            </>
          )}
        </div>

        <div className="pharmacy-create-order-layout">
          <div className="pharmacy-create-order-left">
            <div className="pharmacy-create-order-tabs">
              {showSummaryTab && (
                <button
                  className={`pharmacy-tab-btn ${leftTab === 'summary' ? 'is-active' : ''}`}
                  onClick={() => setLeftTab('summary')}
                  type="button"
                >
                  <i className="bi bi-clipboard2-pulse me-1"></i>
                  Summary
                </button>
              )}
              <button
                className={`pharmacy-tab-btn ${leftTab === 'prescriptions' ? 'is-active' : ''}`}
                onClick={() => setLeftTab('prescriptions')}
                type="button"
              >
                <i className="bi bi-prescription me-1"></i>
                Prescriptions
              </button>
              {canEditMedicineIdentity && (
                <button
                  className={`pharmacy-tab-btn ${leftTab === 'medicine' ? 'is-active' : ''}`}
                  onClick={() => setLeftTab('medicine')}
                  type="button"
                >
                  <i className="bi bi-capsule me-1"></i>
                  Medicines
                </button>
              )}
            </div>

            <div
              className={[
                'pharmacy-create-order-left-content',
                isSummaryTab ? 'is-summary' : '',
                isMedicinesTab ? 'is-medicines' : '',
              ].filter(Boolean).join(' ')}>
              {leftTab === 'summary' && showSummaryTab ? (
                <RequestSummaryPanel request={request} />
              ) : (leftTab === 'prescriptions' || isOrderRequest) ? (
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
                        const importableItems = mapPrescriptionToOrderItems(prescription, medicinePriceLookup).filter(
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
                                  disabled={isQuoteRevision || fullyImported || !items.length}
                                  onClick={() => importOrderItems(mapPrescriptionToOrderItems(prescription, medicinePriceLookup))}
                                  type="button"
                                >
                                  <i className={`bi ${fullyImported ? 'bi-check2' : 'bi-box-arrow-in-down'} me-1`}></i>
                                  {isQuoteRevision || isOrderRequest ? 'Prescription locked' : fullyImported ? 'Imported' : 'Import'}
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
                  inventoryItems={medicineCatalog}
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
              {isExistingOrderLoading ? (
                <div className="pharmacy-bootstrap-loading">
                  <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
                  <span>Loading current quote...</span>
                </div>
              ) : existingOrderLoadError ? (
                <div className="pharmacy-empty compact is-error">
                  <span className="material-symbols-outlined">error</span>
                  <h3>Unable to load the current quote</h3>
                  <button className="btn btn-outline-primary btn-sm" onClick={() => setExistingOrderReloadKey((key) => key + 1)} type="button">
                    Retry
                  </button>
                </div>
              ) : orderItems.length === 0 ? (
                <div className="pharmacy-empty compact">
                  <span className="material-symbols-outlined">medication</span>
                  <h3>No medications</h3>
                  <p>Import from prescriptions or search the medicine library on the left.</p>
                </div>
              ) : (
                orderItems.map((orderItem) => (
                  <OrderItemEditor
                    item={orderItem}
                    key={orderItem.localId}
                    readOnlyClinicalFields={isPrescriptionSourcedItem(orderItem)}
                    onRemove={removeItem}
                    onChange={replaceItem}
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
              {request?.deliveryType === 'Delivery' && (
                <div className="pharmacy-delivery-snapshot">
                  <strong>Delivery contact</strong>
                  <span><i className="bi bi-telephone me-1"></i>{request.deliveryPhoneNumber || '-'}</span>
                  <span><i className="bi bi-geo-alt me-1"></i>{request.deliveryAddress || '-'}</span>
                </div>
              )}

              <div className="pharmacy-invoice-row">
                <span>Medications ({orderItems.length} items)</span>
                <strong>{money(medicationSubtotal)}</strong>
              </div>

              <div className="pharmacy-invoice-divider"></div>

              {!isConsultMode && (
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
                      }
                    }}
                    type="checkbox"
                  />
                  <label className="form-check-label small" htmlFor="pharmacy-modal-delivery">
                    Home delivery
                  </label>
                </div>
              )}

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
                        required={isConsultMode && deliveryEnabled}
                        step="0.01"
                        type="number"
                        value={deliveryFee}
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small">Delivery time</label>
                    <DeliveryDurationPicker
                      digits={deliveryMinuteDigits}
                      onChange={setDeliveryMinuteDigits}
                    />
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
                disabled={creatingOrder || !orderItems.length || isExistingOrderLoading || existingOrderLoadError}
                onClick={handleCreateOrder}
                type="button"
              >
                {creatingOrder ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                    {mode === 'updateQuote' ? 'Updating Quote...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <i className="bi bi-bag-check me-2"></i>
                    {mode === 'updateQuote' ? 'Update Quote' : 'Create Quote'} - {money(orderTotal)}
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
