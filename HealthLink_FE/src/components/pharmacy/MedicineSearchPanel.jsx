import React, { useState, useEffect, useRef } from 'react';
import { medicineApi } from '../../api/medicineApi';

export default function MedicineSearchPanel({ onSelect, selectedIds = new Set() }) {
  const [query, setQuery] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => { return () => { aliveRef.current = false; }; }, []);

  useEffect(() => {
    const keyword = query.trim();
    setLoading(true);
    medicineApi.searchMedicines(keyword)
      .then(data => { if (aliveRef.current) setMedicines(Array.isArray(data) ? data : []); })
      .catch(() => { if (aliveRef.current) setMedicines([]); })
      .finally(() => { if (aliveRef.current) setLoading(false); });
  }, [query]);

  return (
    <div className="medicine-search-panel">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search medicines..."
        className="form-control mb-2"
      />
      {loading && <div className="text-center py-2">Loading...</div>}
      <div className="medicine-grid">
        {medicines.map(m => (
          <div key={m.medicineId}
            className={`medicine-card ${selectedIds.has(m.medicineId) ? 'selected' : ''}`}
          >
            <span className="medicine-name">{m.name}</span>
            <span className="medicine-detail">{m.strength} {m.dosageForm}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => onSelect(m)}
              disabled={selectedIds.has(m.medicineId)}
            >
              {selectedIds.has(m.medicineId) ? 'Added' : 'Add'}
            </button>
          </div>
        ))}
      </div>
      {!loading && medicines.length === 0 && (
        <div className="pharmacy-empty compact">
          <span className="material-symbols-outlined">medication</span>
          <h3>No medicines found</h3>
          <p>Try another medicine name or category.</p>
        </div>
      )}
    </div>
  );
}
