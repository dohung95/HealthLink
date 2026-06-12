import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import pharmacyApi from '../../api/pharmacyApi';
import { money, dateTime, useDebouncedValue, Modal } from './PharmacyShared';

const FILTER_OPTIONS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'lowStock', label: 'Low Stock' },
];

export default function PharmacyInventoryTab({ globalSearch, pharmacyId }) {
  const [inventory, setInventory] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const deferredSearch = useDebouncedValue(globalSearch);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: 20 };
      if (deferredSearch) params.query = deferredSearch;
      if (filter === 'active') params.active = true;
      else if (filter === 'inactive') params.active = false;
      else if (filter === 'lowStock') params.lowStock = true;
      const data = await pharmacyApi.getInventory(params);
      setInventory(data);
    } catch {
      toast.error('Unable to load inventory.');
    } finally {
      setLoading(false);
    }
  }, [page, filter, deferredSearch]);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  const handleImportClick = () => setShowImportModal(true);
  const handleDownloadTemplate = () => pharmacyApi.downloadInventoryTemplate();

  const handleEdit = (item) => setEditItem({ ...item });

  return (
    <div className="pharmacy-tab-content">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h4 className="mb-0">Inventory</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary btn-sm" onClick={handleDownloadTemplate}>
            <i className="bi bi-download me-1"></i>Template
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleImportClick}>
            <i className="bi bi-upload me-1"></i>Import CSV
          </button>
        </div>
      </div>

      <div className="d-flex gap-2 mb-3">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className={`btn btn-sm ${filter === opt.key ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => { setFilter(opt.key); setPage(0); }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : inventory.content?.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-inboxes" style={{ fontSize: '3rem' }}></i>
          <p className="mt-2">No inventory items found.</p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Medicine</th>
                  <th>Strength</th>
                  <th>Form</th>
                  <th className="text-center">Qty</th>
                  <th className="text-center">Reserved</th>
                  <th className="text-center">Available</th>
                  <th className="text-end">Unit Price</th>
                  <th>Expiry</th>
                  <th className="text-center">Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inventory.content.map((item) => (
                  <tr key={item.inventoryId}>
                    <td className="fw-medium">{item.medicineName}</td>
                    <td className="text-muted small">{item.strength || '-'}</td>
                    <td className="text-muted small">{item.dosageForm || '-'}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-center">{item.reservedQuantity}</td>
                    <td className="text-center">
                      <span className={`badge ${item.availableQuantity > 10 ? 'bg-success' : item.availableQuantity > 0 ? 'bg-warning' : 'bg-danger'}`}>
                        {item.availableQuantity}
                      </span>
                    </td>
                    <td className="text-end">{item.unitPrice ? money(item.unitPrice) : '-'}</td>
                    <td className="small">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-'}</td>
                    <td className="text-center">
                      <span className={`badge ${item.active ? 'bg-success' : 'bg-secondary'}`}>
                        {item.active ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(item)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {inventory.totalPages > 1 && (
            <div className="d-flex justify-content-center gap-2 mt-3">
              <button className="btn btn-sm btn-outline-secondary" disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}>
                <i className="bi bi-chevron-left"></i>
              </button>
              <span className="align-self-center small">
                Page {page + 1} of {inventory.totalPages}
              </span>
              <button className="btn btn-sm btn-outline-secondary" disabled={page >= inventory.totalPages - 1}
                onClick={() => setPage((p) => p + 1)}>
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => { setShowImportModal(false); loadInventory(); }}
        />
      )}

      {editItem && (
        <EditInventoryModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); loadInventory(); }}
        />
      )}
    </div>
  );
}

function ImportModal({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    if (!file) { toast.error('Please select a CSV file.'); return; }
    setImporting(true);
    try {
      const data = await pharmacyApi.importInventoryCsv(file);
      setResult(data);
      toast.success(`Import complete: ${data.importedCount} new, ${data.updatedCount} updated, ${data.skippedCount} skipped.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal title="Import CSV" icon="upload_file" onClose={onClose}>
      <div className="p-3">
        {!result ? (
          <>
            <div className="mb-3">
              <label className="form-label fw-semibold">CSV File</label>
              <input type="file" className="form-control" accept=".csv"
                onChange={(e) => setFile(e.target.files[0])} />
              <div className="form-text">
                Columns: medicineId, medicineName, strength, dosageForm, quantity, unitPrice, unit, expiryDate, active.
                Max 5MB, 5000 rows.
              </div>
            </div>
            <button className="btn btn-primary w-100" disabled={importing || !file} onClick={handleImport}>
              {importing ? <><span className="spinner-border spinner-border-sm me-2" />Importing...</> : 'Import'}
            </button>
          </>
        ) : (
          <>
            <div className="mb-3">
              <h6 className="fw-semibold">Import Results</h6>
              <div className="d-flex gap-3">
                <div className="text-center p-3 bg-light rounded flex-fill">
                  <div className="fw-bold text-success fs-5">{result.importedCount}</div>
                  <small className="text-muted">New</small>
                </div>
                <div className="text-center p-3 bg-light rounded flex-fill">
                  <div className="fw-bold text-primary fs-5">{result.updatedCount}</div>
                  <small className="text-muted">Updated</small>
                </div>
                <div className="text-center p-3 bg-light rounded flex-fill">
                  <div className="fw-bold text-warning fs-5">{result.skippedCount}</div>
                  <small className="text-muted">Skipped</small>
                </div>
              </div>
            </div>
            {result.rowErrors?.length > 0 && (
              <div className="mb-3">
                <h6 className="fw-semibold text-danger">Row Errors</h6>
                <div className="table-responsive" style={{ maxHeight: '200px' }}>
                  <table className="table table-sm table-borderless">
                    <thead>
                      <tr><th>Row</th><th>Medicine</th><th>Error</th></tr>
                    </thead>
                    <tbody>
                      {result.rowErrors.map((err, i) => (
                        <tr key={i}>
                          <td>{err.rowNumber}</td>
                          <td>{err.medicineName || `#${err.medicineId}` || '-'}</td>
                          <td className="text-danger small">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <button className="btn btn-primary w-100" onClick={onImported}>Done</button>
          </>
        )}
      </div>
    </Modal>
  );
}

function EditInventoryModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    quantity: item.quantity ?? '',
    unitPrice: item.unitPrice ?? '',
    unit: item.unit ?? '',
    expiryDate: item.expiryDate ? item.expiryDate.substring(0, 10) : '',
    active: item.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (form.quantity !== '') payload.quantity = Number(form.quantity);
      if (form.unitPrice !== '') payload.unitPrice = Number(form.unitPrice);
      if (form.unit) payload.unit = form.unit;
      if (form.expiryDate) payload.expiryDate = form.expiryDate;
      payload.active = form.active;
      await pharmacyApi.updateInventory(item.inventoryId, payload);
      toast.success('Inventory item updated.');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Edit: ${item.medicineName}`} icon="edit" onClose={onClose}>
      <div className="p-3">
        <div className="row g-3">
          <div className="col-sm-6">
            <label className="form-label">Quantity</label>
            <input type="number" className="form-control" min="0"
              value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div className="col-sm-6">
            <label className="form-label">Unit Price ($)</label>
            <input type="number" className="form-control" min="0" step="0.01"
              value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
          </div>
          <div className="col-sm-6">
            <label className="form-label">Unit</label>
            <input type="text" className="form-control"
              value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
          <div className="col-sm-6">
            <label className="form-label">Expiry Date</label>
            <input type="date" className="form-control"
              value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          </div>
          <div className="col-12">
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id="edit-active"
                checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              <label className="form-check-label" htmlFor="edit-active">Active</label>
            </div>
          </div>
        </div>
        <div className="mt-3 d-flex gap-2">
          <button className="btn btn-secondary flex-fill" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-fill" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
