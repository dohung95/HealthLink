import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import pharmacyApi from '../../api/pharmacyApi';
import { medicineApi } from '../../api/medicineApi';
import { useDebouncedValue, Modal } from './PharmacyShared';
import { collectExpandableCategoryIds, flattenCategoryTree } from './workflow/inventoryCategoryTree';

const PAGE_SIZE = 5;
const LOW_STOCK_THRESHOLD = 10;
const PAGE_BUTTON_LIMIT = 3;

const FILTER_OPTIONS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'lowStock', label: 'Low Stock' },
  { key: 'expiringSoon', label: 'Expiring Soon' },
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

function getExpiryTone(value, now = new Date()) {
  if (!value) return '';
  const expiry = new Date(`${value}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return '';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / 86400000);
  if (diffDays <= 0) return 'danger';
  if (diffDays < 30) return 'warning';
  return '';
}

function deriveOptions(items, field) {
  return [...new Set((items || []).map((item) => item?.[field]).filter(Boolean))].sort();
}

function getVisiblePageNumbers(totalPages, currentPage) {
  if (totalPages <= 0) return [];
  const visibleCount = Math.min(PAGE_BUTTON_LIMIT, totalPages);
  const maxStart = Math.max(totalPages - visibleCount, 0);
  const start = Math.min(Math.max(currentPage - 1, 0), maxStart);
  return Array.from({ length: visibleCount }, (_, index) => start + index);
}

export default function PharmacyInventoryTab({ inventoryRefreshToken = 0 }) {
  const [inventory, setInventory] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [categoryTree, setCategoryTree] = useState([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedDosageForm, setSelectedDosageForm] = useState('');
  const [dosageFormOptions, setDosageFormOptions] = useState([]);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState(() => new Set());
  const deferredInventorySearch = useDebouncedValue(inventorySearch);

  const loadInventory = useCallback(async (overrides = {}) => {
    setLoading(true);
    try {
      const params = { page: overrides.page ?? page, size: PAGE_SIZE };
      const q = overrides.query ?? deferredInventorySearch;
      if (q) params.query = q;
      const form = overrides.dosageForm ?? selectedDosageForm;
      if (form) params.dosageForm = form;
      const f = overrides.filter ?? filter;
      if (f === 'active') params.active = true;
      else if (f === 'inactive') params.active = false;
      else if (f === 'lowStock') params.lowStock = true;
      else if (f === 'expiringSoon') params.expiringSoon = true;
      const cid = overrides.categoryId ?? selectedCategoryId;
      if (cid) params.categoryId = cid;

      const data = await pharmacyApi.getInventory(params);
      setInventory(data);

      if ((overrides.filter ?? filter) === 'lowStock') {
        const lowStockData = await pharmacyApi.getInventory({ page: 0, size: 1, lowStock: true });
        setLowStockCount(Number(lowStockData?.totalElements ?? 0));
      }

      return data;
    } catch {
      toast.error('Unable to load inventory.');
    } finally {
      setLoading(false);
    }
  }, [page, filter, deferredInventorySearch, selectedDosageForm, selectedCategoryId]);

  useEffect(() => {
    medicineApi.getMedicineCategoryTree()
      .then((tree) => {
        const safeTree = Array.isArray(tree) ? tree : [];
        setCategoryTree(safeTree);
        setExpandedCategoryIds(new Set(collectExpandableCategoryIds(safeTree)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    medicineApi.searchMedicines({})
      .then((data) => {
        if (!mounted) return;
        setDosageFormOptions(deriveOptions(Array.isArray(data) ? data : [], 'dosageForm'));
      })
      .catch(() => setDosageFormOptions([]));

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    loadInventory();
  }, [inventoryRefreshToken, loadInventory]);

  const handleImportClick = () => setShowImportModal(true);
  const handleDownloadTemplate = () => pharmacyApi.downloadInventoryTemplate();
  const handleEdit = (item) => setEditItem({ ...item });

  const items = inventory.content || [];
  const totalElements = Number(inventory.totalElements ?? 0);
  const totalPages = Number(inventory.totalPages ?? 0);
  const startEntry = totalElements > 0 ? page * PAGE_SIZE + 1 : 0;
  const endEntry = totalElements > 0 ? Math.min(page * PAGE_SIZE + items.length, totalElements) : 0;
  const visiblePageNumbers = useMemo(() => getVisiblePageNumbers(totalPages, page), [totalPages, page]);

  const categories = useMemo(
    () => flattenCategoryTree(categoryTree, expandedCategoryIds),
    [categoryTree, expandedCategoryIds]
  );

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter);
    setPage(0);
  };

  const handleInventorySearchChange = (event) => {
    setInventorySearch(event.target.value);
    setPage(0);
  };

  const handleDosageFormChange = (event) => {
    setSelectedDosageForm(event.target.value);
    setPage(0);
  };

  const toggleCategoryExpanded = (categoryId) => {
    setExpandedCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 0 || nextPage >= totalPages) return;
    setPage(nextPage);
  };

  return (
    <div className="pharmacy-tab-content pharmacy-inventory">
      <div className="pharmacy-inventory-header">
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

      <div className="pharmacy-inventory-layout">
        {categories.length > 0 && (
          <aside className="pharmacy-inventory-sidebar">
            <strong className="pharmacy-inventory-sidebar-title">Categories</strong>
            <button
              className={`pharmacy-inventory-category ${selectedCategoryId === null ? 'is-active' : ''}`}
              onClick={() => { setSelectedCategoryId(null); setPage(0); }}
              type="button"
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                className={`pharmacy-inventory-category ${selectedCategoryId === cat.categoryId ? 'is-active' : ''}`}
                key={cat.categoryId}
                onClick={() => { setSelectedCategoryId(cat.categoryId); setPage(0); }}
                style={{ paddingLeft: 12 + Math.min(cat.depth, 4) * 12 }}
                type="button"
              >
                <span className="pharmacy-inventory-category-main">
                  {cat.hasChildren ? (
                    <span
                      aria-label={expandedCategoryIds.has(cat.categoryId) ? `Collapse ${cat.name}` : `Expand ${cat.name}`}
                      className="pharmacy-inventory-category-toggle"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleCategoryExpanded(cat.categoryId);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleCategoryExpanded(cat.categoryId);
                        }
                      }}
                    >
                      <span className="material-symbols-outlined">
                        {expandedCategoryIds.has(cat.categoryId) ? 'expand_more' : 'chevron_right'}
                      </span>
                    </span>
                  ) : (
                    <span className="pharmacy-inventory-category-spacer" />
                  )}
                  <span className="pharmacy-inventory-category-name">{cat.name}</span>
                </span>
                {cat.hasChildren ? (
                  <span className="pharmacy-inventory-category-count">{cat.childCount}</span>
                ) : null}
              </button>
            ))}
          </aside>
        )}

      <section className="pharmacy-inventory-card">
        <div className="pharmacy-inventory-toolbar">
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

          <div className="pharmacy-inventory-toolbar-controls" aria-label="Inventory search and form filter">
            <label className="pharmacy-inventory-search">
              <span className="material-symbols-outlined">search</span>
              <input
                aria-label="Search inventory by medicine name"
                onChange={handleInventorySearchChange}
                placeholder="Search medicine"
                type="search"
                value={inventorySearch}
              />
            </label>
            <select
              aria-label="Filter inventory by dosage form"
              className="pharmacy-inventory-form-filter"
              onChange={handleDosageFormChange}
              value={selectedDosageForm}
            >
              <option value="">All forms</option>
              {dosageFormOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
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
                    <th className="is-number" title="Physical units currently in the pharmacy">On hand</th>
                    <th className="is-number" title="Units committed to confirmed orders that are not yet packed">Reserved</th>
                    <th className="is-number" title="On hand minus reserved units">Available</th>
                    <th className="is-number">Min Stock</th>
                    <th>Expiry</th>
                    <th className="is-center">Active</th>
                    <th className="is-action"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const availableTone = getAvailableTone(item.availableQuantity);
                    const expiryTone = getExpiryTone(item.expiryDate);
                    return (
                      <tr className={getRowStockClass(item.availableQuantity)} key={item.inventoryId}>
                        <td className="pharmacy-inventory-medicine">
                          {item.medicineName || '-'}
                        </td>
                        <td>{item.strength || '-'}</td>
                        <td>{item.dosageForm || '-'}</td>
                        <td className="is-number">{item.quantity ?? 0}</td>
                        <td className="is-number">{item.reservedQuantity ?? 0}</td>
                        <td className={`is-number pharmacy-inventory-available-text is-${availableTone}`}>
                          {item.availableQuantity ?? 0}
                        </td>
                        <td className="is-number">{item.minStockLevel ?? '-'}</td>
                        <td className={expiryTone ? `pharmacy-inventory-expiry-text is-${expiryTone}` : ''}>{formatInventoryDate(item.expiryDate)}</td>
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
      </div>

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImported={async () => {
            setShowImportModal(false);
            const data = await loadInventory();
            if (data?.content?.length === 0 && page > 0) {
              setPage(0);
            }
          }}
        />
      )}

      {editItem && (
        <EditInventoryModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={async () => {
            setEditItem(null);
            await loadInventory({ page });
          }}
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
                Columns: medicineId, medicineName, strength, dosageForm, quantity, unit, expiryDate, active. Unit is read from the medicine master.
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
    expiryDate: item.expiryDate ? item.expiryDate.substring(0, 10) : '',
    active: item.active ?? true,
    minStockLevel: item.minStockLevel ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (form.quantity !== '') payload.quantity = Number(form.quantity);
      if (form.expiryDate) payload.expiryDate = form.expiryDate;
      if (form.minStockLevel !== '') payload.minStockLevel = Number(form.minStockLevel);
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
            <label className="form-label">Unit</label>
            <div className="form-control-plaintext">{item.unit || 'Missing unit'}</div>
          </div>
          <div className="col-sm-6">
            <label className="form-label">Expiry Date</label>
            <input type="date" className="form-control"
              value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          </div>
          <div className="col-sm-6">
            <label className="form-label">Min Stock Level</label>
            <input type="number" className="form-control" min="0"
              value={form.minStockLevel} onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })} />
            <div className="form-text">Leave empty for default threshold (10).</div>
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
