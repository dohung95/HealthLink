import { useEffect, useMemo, useState } from 'react';
import medicineApi from '../../api/medicineApi';

function getMedicineDisplayName(medicine = {}) {
  const brandName = medicine.brandName || '';
  const genericName = medicine.genericName || medicine.name || medicine.medicineName || '';
  if (brandName && genericName && brandName.toLowerCase() !== genericName.toLowerCase()) {
    return `${brandName} (${genericName})`;
  }
  return brandName || genericName || `Medicine #${medicine.medicineId || medicine.id || 'N/A'}`;
}

const LIBRARY_FILTERS = [
  { key: 'brandName', label: 'Brand Name' },
  { key: 'genericName', label: 'Generic Name' },
  { key: 'dosageForm', label: 'Dosage Form' },
  { key: 'manufacturer', label: 'Manufacturer' },
];

export default function MedicineLibraryModal({ onClose, onSelect, recentMedicineIds, selectedMedicineIds }) {
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

  const medicineOptions = useMemo(() => medicines.map((m) => {
    const displayName = getMedicineDisplayName(m);
    const medicineId = m.medicineId || m.id;
    const searchableText = [displayName, m.brandName, m.genericName, m.name, m.medicineName, m.dosageForm, m.strength, m.manufacturer, m.unit]
      .filter(Boolean).join(' ').toLowerCase();
    return { ...m, medicineId, displayName, searchLabel: [displayName, m.strength].filter(Boolean).join(' - '), searchableText };
  }), [medicines]);

  const filteredMedicines = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return medicineOptions;
    const enabledKeys = LIBRARY_FILTERS.filter((f) => filters[f.key]).map((f) => f.key);
    return medicineOptions.filter((med) => (
      med.searchableText.includes(normalizedQuery)
      || enabledKeys.some((key) => String(med[key] || '').toLowerCase().includes(normalizedQuery))
    ));
  }, [filters, medicineOptions, query]);

  return (
    <div className="pharmacy-medicine-library">
      <button className="pharmacy-medicine-library-backdrop" onClick={onClose} type="button" aria-label="Close" />
      <div aria-modal="true" className="pharmacy-medicine-library-dialog" role="dialog">
        <div className="pharmacy-medicine-library-header">
          <div className="pharmacy-medicine-library-search">
            <i className="bi bi-search"></i>
            <input autoFocus className="form-control" onChange={(e) => setQuery(e.target.value)} placeholder="Search medicines..." value={query} />
          </div>
          <button className="btn btn-light btn-sm" onClick={() => setShowFilters((c) => !c)} type="button">
            <i className="bi bi-funnel"></i>
          </button>
          <button className="btn btn-light btn-sm" onClick={onClose} type="button" aria-label="Close">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {showFilters && (
          <div className="d-flex gap-2 p-2 border-bottom">
            {LIBRARY_FILTERS.map((f) => (
              <label className="form-check form-check-inline small" key={f.key}>
                <input checked={filters[f.key]} className="form-check-input" onChange={() => setFilters((c) => ({ ...c, [f.key]: !c[f.key] }))} type="checkbox" />
                <span className="form-check-label">{f.label}</span>
              </label>
            ))}
          </div>
        )}

        <div className="p-2" style={{ overflow: 'auto', maxHeight: '60vh' }}>
          {loading ? (
            <div className="pharmacy-bootstrap-loading">
              <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
              <span>Loading medicines...</span>
            </div>
          ) : filteredMedicines.length ? filteredMedicines.map((medicine) => {
            const isSelected = selectedMedicineIds.has(medicine.medicineId);
            return (
              <div className="pharmacy-medicine-library-result" key={medicine.medicineId || medicine.displayName}>
                <div className="pharmacy-medicine-library-result-content">
                  <div className="pharmacy-medicine-library-result-title">
                    <h4>{medicine.displayName}</h4>
                    {medicine.strength && <span className="badge bg-light text-primary border ms-1">{medicine.strength}</span>}
                  </div>
                  <p className="small text-muted">{medicine.manufacturer || ''}</p>
                </div>
                <button className={`btn btn-sm ${isSelected ? 'btn-outline-secondary' : 'btn-primary'}`} disabled={isSelected} onClick={() => onSelect(medicine)} type="button">
                  <i className={`bi ${isSelected ? 'bi-check2' : 'bi-plus-lg'} me-1`}></i>
                  {isSelected ? 'Added' : 'Add'}
                </button>
              </div>
            );
          }) : (
            <div className="pharmacy-empty">
              <span className="material-symbols-outlined">search</span>
              <h3>No medicines matched</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
