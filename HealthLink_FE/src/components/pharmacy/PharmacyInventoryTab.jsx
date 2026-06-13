import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import pharmacyApi from '../../api/pharmacyApi';
import { money, useDebouncedValue, Modal } from './PharmacyShared';

const PAGE_SIZE = 5;
const LOW_STOCK_THRESHOLD = 10;
const PAGE_BUTTON_LIMIT = 3;

const FILTER_OPTIONS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'lowStock', label: 'Low Stock' },
];

function getAvailableTone(value) {
  const available = Number(value ?? 0);
  if (available <= 0) return 'danger';
  if (available <= LOW_STOCK_THRESHOLD) return 'warning';
  return 'success';
}

function getRowStockClass(value) {
  const tone = getAvailableTone(value);
  if (tone === 'danger') return 'is-out-stock';
  if (tone === 'warning') return 'is-low-stock';
  return '';
}

function formatInventoryDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US');
}

function getVisiblePageNumbers(totalPages, currentPage) {
  if (totalPages <= 0) return [];
  const visibleCount = Math.min(PAGE_BUTTON_LIMIT, totalPages);
  const maxStart = Math.max(totalPages - visibleCount, 0);
  const start = Math.min(Math.max(currentPage - 1, 0), maxStart);
  return Array.from({ length: visibleCount }, (_, index) => start + index);
}

export default function PharmacyInventoryTab({ globalSearch }) {
  const [inventory, setInventory] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const deferredSearch = useDebouncedValue(globalSearch);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: PAGE_SIZE };
      if (deferredSearch) params.query = deferredSearch;
      if (filter === 'active') params.active = true;
      else if (filter === 'inactive') params.active = false;
      else if (filter === 'lowStock') params.lowStock = true;

      const [data, lowStockData] = await Promise.all([
        pharmacyApi.getInventory(params),
        pharmacyApi.getInventory({ page: 0, size: 1, lowStock: true }),
      ]);
      setInventory(data);
      setLowStockCount(Number(lowStockData?.totalElements ?? 0));
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

  const items = inventory.content || [];
  const totalElements = Number(inventory.totalElements ?? 0);
  const totalPages = Number(inventory.totalPages ?? 0);
  const startEntry = totalElements > 0 ? page * PAGE_SIZE + 1 : 0;
  const endEntry = totalElements > 0 ? Math.min(page * PAGE_SIZE + items.length, totalElements) : 0;
  const visiblePageNumbers = useMemo(() => getVisiblePageNumbers(totalPages, page), [totalPages, page]);

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter);
    setPage(0);
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 0 || nextPage >= totalPages) return;
    setPage(nextPage);
  };

  return (
    <div className="pharmacy-tab-content pharmacy-inventory">
      <div className="pharmacy-inventory-header">
        <h1>Inventory</h1>
        <div className="pharmacy-inventory-actions">
          <button className="pharmacy-inventory-action secondary" onClick={handleDownloadTemplate} type="button">
            <span className="material-symbols-outlined">download</span>
            Template
          </button>
          <button className="pharmacy-inventory-action primary" onClick={handleImportClick} type="button">
            <span className="material-symbols-outlined">upload</span>
            Import CSV
          </button>
        </div>
      </div>

      <section className="pharmacy-inventory-card">
        <div className="pharmacy-inventory-tabs" role="tablist" aria-label="Inventory filters">
          {FILTER_OPTIONS.map((opt) => (
            <button
              aria-selected={filter === opt.key}
              className={filter === opt.key ? 'active' : ''}
              key={opt.key}
              onClick={() => handleFilterChange(opt.key)}
              role="tab"
              type="button"
            >
              {opt.label}
              {opt.key === 'lowStock' && lowStockCount > 0 ? (
                <span className="pharmacy-inventory-tab-count">{lowStockCount}</span>
              ) : null}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="pharmacy-inventory-loading" aria-live="polite" role="status">
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <span key={index} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="pharmacy-inventory-empty">
            <span className="material-symbols-outlined">inventory_2</span>
            <h2>No inventory items found.</h2>
            <p>Try another filter or import a CSV template.</p>
          </div>
        ) : (
          <>
            <div className="pharmacy-inventory-table-scroll">
              <table className="pharmacy-inventory-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Strength</th>
                    <th>Form</th>
                    <th className="is-number">Qty</th>
                    <th className="is-number">Reserved</th>
                    <th className="is-number">Available</th>
                    <th className="is-number">Unit Price</th>
                    <th>Expiry</th>
                    <th className="is-center">Active</th>
                    <th className="is-action"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const availableTone = getAvailableTone(item.availableQuantity);
                    return (
                      <tr className={getRowStockClass(item.availableQuantity)} key={item.inventoryId}>
                        <td className="pharmacy-inventory-medicine">{item.medicineName || '-'}</td>
                        <td>{item.strength || '-'}</td>
                        <td>{item.dosageForm || '-'}</td>
                        <td className="is-number">{item.quantity ?? 0}</td>
                        <td className="is-number">{item.reservedQuantity ?? 0}</td>
                        <td className={`is-number pharmacy-inventory-available-text is-${availableTone}`}>
                          {item.availableQuantity ?? 0}
                        </td>
                        <td className="is-number">{item.unitPrice ? money(item.unitPrice) : '-'}</td>
                        <td>{formatInventoryDate(item.expiryDate)}</td>
                        <td className="is-center">
                          <span className={`pharmacy-inventory-status ${item.active ? 'is-active' : 'is-inactive'}`}>
                            {item.active ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="is-action">
                          <button
                            aria-label={`Edit ${item.medicineName || 'inventory item'}`}
                            className="pharmacy-inventory-edit"
                            onClick={() => handleEdit(item)}
                            title="Edit"
                            type="button"
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pharmacy-inventory-footer">
              <span>Showing {startEntry} to {endEntry} of {totalElements} entries</span>
              <div className="pharmacy-inventory-pages" aria-label="Inventory pagination">
                <button
                  aria-label="Previous page"
                  disabled={page === 0}
                  onClick={() => handlePageChange(page - 1)}
                  type="button"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {visiblePageNumbers.map((pageNumber) => (
                  <button
                    aria-current={pageNumber === page ? 'page' : undefined}
                    className={pageNumber === page ? 'active' : ''}
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    type="button"
                  >
                    {pageNumber + 1}
                  </button>
                ))}
                <button
                  aria-label="Next page"
                  disabled={page >= totalPages - 1}
                  onClick={() => handlePageChange(page + 1)}
                  type="button"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </>
        )}
      </section>

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
