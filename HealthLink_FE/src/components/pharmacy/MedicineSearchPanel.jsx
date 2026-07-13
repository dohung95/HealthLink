import { useEffect, useMemo, useRef, useState } from 'react';
import { medicineApi } from '../../api/medicineApi';

const LIBRARY_FILTERS = [
  { key: 'brandName', label: 'Brand Name' },
  { key: 'genericName', label: 'Generic Name' },
  { key: 'dosageForm', label: 'Dosage Form' },
  { key: 'manufacturer', label: 'Manufacturer' },
];

function createEmptyFilterState() {
  return {
    brandName: true,
    genericName: true,
    dosageForm: false,
    manufacturer: false,
  };
}

function getMedicineDisplayName(medicine = {}) {
  const brandName = medicine.brandName || '';
  const genericName = medicine.genericName || medicine.name || '';

  if (brandName && genericName && brandName.toLowerCase() !== genericName.toLowerCase()) {
    return `${brandName} (${genericName})`;
  }

  return brandName || genericName || 'Unnamed medicine';
}

function normalizeMedicine(medicine = {}) {
  const displayName = getMedicineDisplayName(medicine);
  const searchableText = [
    displayName,
    medicine.name,
    medicine.brandName,
    medicine.genericName,
    medicine.dosageForm,
    medicine.strength,
    medicine.manufacturer,
    medicine.unit,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return {
    ...medicine,
    displayName,
    searchLabel: [displayName, medicine.strength].filter(Boolean).join(' - '),
    searchableText,
  };
}

function formatDosageForm(form) {
  const value = String(form || '').trim();
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function hasSelectedId(selectedIds, medicineId) {
  return selectedIds.has(medicineId)
    || selectedIds.has(String(medicineId))
    || selectedIds.has(Number(medicineId));
}

export default function MedicineSearchPanel({ onSelect, selectedIds = new Set(), items }) {
  const [query, setQuery] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(createEmptyFilterState);
  const [activeDosageForm, setActiveDosageForm] = useState(null);
  const [recentMedicineIds, setRecentMedicineIds] = useState([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    if (items) {
      setMedicines(Array.isArray(items) ? items : []);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(false);

    medicineApi.searchMedicines('')
      .then((data) => {
        if (!cancelled) setMedicines(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) {
          setMedicines([]);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [items]);

  useEffect(() => {
    const handler = (event) => {
      if (
        suggestionsRef.current
        && !suggestionsRef.current.contains(event.target)
        && inputRef.current
        && !inputRef.current.contains(event.target)
      ) {
        setIsSuggestionsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const medicineOptions = useMemo(
    () => medicines.map((medicine) => normalizeMedicine(medicine)),
    [medicines],
  );

  const medicineMap = useMemo(
    () => new Map(medicineOptions.map((medicine) => [medicine.medicineId, medicine])),
    [medicineOptions],
  );

  const activeFilterCount = useMemo(
    () => LIBRARY_FILTERS.filter((filter) => filters[filter.key]).length,
    [filters],
  );

  const recentMedicines = useMemo(
    () => recentMedicineIds.map((id) => medicineMap.get(id)).filter(Boolean),
    [medicineMap, recentMedicineIds],
  );

  const commonMedicines = useMemo(
    () => medicineOptions.slice(0, 4),
    [medicineOptions],
  );

  const dosageForms = useMemo(() => {
    const forms = new Set(
      medicineOptions
        .map((medicine) => medicine.dosageForm?.trim().toLowerCase())
        .filter(Boolean),
    );
    forms.delete('tablet');
    return Array.from(forms).sort();
  }, [medicineOptions]);

  const filteredMedicines = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const enabledKeys = LIBRARY_FILTERS
      .filter((filter) => filters[filter.key])
      .map((filter) => filter.key);

    return medicineOptions.filter((medicine) => {
      if (activeDosageForm && medicine.dosageForm?.toLowerCase() !== activeDosageForm) {
        return false;
      }

      if (!normalizedQuery) return true;

      if (!enabledKeys.length) return medicine.searchableText.includes(normalizedQuery);

      return enabledKeys.some((key) =>
        String(medicine[key] || '').toLowerCase().includes(normalizedQuery),
      );
    });
  }, [activeDosageForm, filters, medicineOptions, query]);

  const suggestionItems = useMemo(() => {
    const items = [];
    recentMedicines.forEach((medicine) => items.push({ ...medicine, suggestionType: 'recent' }));
    commonMedicines.forEach((medicine) => items.push({ ...medicine, suggestionType: 'common' }));

    if (!query.trim()) return items;

    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((medicine) => medicine.searchableText.includes(normalizedQuery));
  }, [commonMedicines, query, recentMedicines]);

  const selectMedicine = (medicine) => {
    if (!medicine?.medicineId || hasSelectedId(selectedIds, medicine.medicineId)) return;

    onSelect(medicine);
    setRecentMedicineIds((currentIds) =>
      [medicine.medicineId, ...currentIds.filter((id) => id !== medicine.medicineId)].slice(0, 5),
    );
  };

  const selectSuggestion = (medicine) => {
    selectMedicine(medicine);
    setIsSuggestionsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (!isSuggestionsOpen || suggestionItems.length === 0) {
      if (event.key === 'ArrowDown' && suggestionItems.length > 0) {
        event.preventDefault();
        setIsSuggestionsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((current) => (current + 1) % suggestionItems.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => (current - 1 + suggestionItems.length) % suggestionItems.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (highlightedIndex >= 0) selectSuggestion(suggestionItems[highlightedIndex]);
    } else if (event.key === 'Escape') {
      setIsSuggestionsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const toggleFilter = (key) => {
    setFilters((current) => ({ ...current, [key]: !current[key] }));
  };

  const recentSuggestions = suggestionItems.filter((item) => item.suggestionType === 'recent');
  const commonSuggestions = suggestionItems.filter((item) => item.suggestionType === 'common');

  return (
    <section className="pharmacy-medicines-panel">
      <div className="pharmacy-medicines-panel__header">
        <div className="pharmacy-medicines-panel__search-group">
          <i className="bi bi-search"></i>
          <input
            className="form-control pharmacy-medicines-panel__input"
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setIsSuggestionsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search medicines, brands, or generics..."
            ref={inputRef}
            type="text"
            value={query}
          />

          {isSuggestionsOpen && suggestionItems.length > 0 && (
            <div className="pharmacy-medicines-panel__suggestions" ref={suggestionsRef}>
              {recentSuggestions.length > 0 && (
                <>
                  <div className="pharmacy-medicines-panel__suggestions-header">
                    <i className="bi bi-clock-history"></i>
                    Recent Searches
                  </div>
                  {recentSuggestions.map((item) => {
                    const index = suggestionItems.indexOf(item);
                    return (
                      <button
                        className={`pharmacy-medicines-panel__suggestions-item${highlightedIndex === index ? ' is-focused' : ''}`}
                        disabled={hasSelectedId(selectedIds, item.medicineId)}
                        key={`recent-${item.medicineId}`}
                        onClick={() => selectSuggestion(item)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        type="button"
                      >
                        <i className="bi bi-clock-history"></i>
                        <span>{item.searchLabel}</span>
                      </button>
                    );
                  })}
                </>
              )}

              {commonSuggestions.length > 0 && (
                <>
                  <div className="pharmacy-medicines-panel__suggestions-header">
                    <i className="bi bi-heart"></i>
                    Commonly Used
                  </div>
                  {commonSuggestions.map((item) => {
                    const index = suggestionItems.indexOf(item);
                    return (
                      <button
                        className={`pharmacy-medicines-panel__suggestions-item${highlightedIndex === index ? ' is-focused' : ''}`}
                        disabled={hasSelectedId(selectedIds, item.medicineId)}
                        key={`common-${item.medicineId}`}
                        onClick={() => selectSuggestion(item)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        type="button"
                      >
                        <i className="bi bi-heart"></i>
                        <span>{item.searchLabel}</span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        <button
          className="pharmacy-medicines-panel__filter-btn"
          onClick={() => setShowFilters((current) => !current)}
          type="button"
        >
          <span className={`pharmacy-medicines-panel__filter-icon${showFilters ? ' is-active' : ''}`}>
            <i className="bi bi-funnel"></i>
            {activeFilterCount > 0 && (
              <span className="pharmacy-medicines-panel__filter-count">{activeFilterCount}</span>
            )}
          </span>
        </button>
      </div>

      {showFilters && (
        <div className="pharmacy-medicines-panel__filters">
          {LIBRARY_FILTERS.map((filter) => (
            <label className="pharmacy-medicines-panel__filter" key={filter.key}>
              <input
                checked={filters[filter.key]}
                onChange={() => toggleFilter(filter.key)}
                type="checkbox"
              />
              <span>{filter.label}</span>
            </label>
          ))}
        </div>
      )}

      {dosageForms.length > 0 && (
        <div className="pharmacy-medicines-panel__dosage-forms">
          {dosageForms.map((form) => (
            <button
              className={`pharmacy-medicines-panel__dosage-chip${activeDosageForm === form ? ' is-active' : ''}`}
              key={form}
              onClick={() => setActiveDosageForm((current) => (current === form ? null : form))}
              type="button"
            >
              {formatDosageForm(form)}
            </button>
          ))}
          {activeDosageForm && (
            <button
              className="pharmacy-medicines-panel__dosage-clear"
              onClick={() => setActiveDosageForm(null)}
              type="button"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="pharmacy-medicines-panel__results-head">
        <div>
          <p className="pharmacy-medicines-panel__results-title">Search Results</p>
          <p className="pharmacy-medicines-panel__results-subtitle">
            {filteredMedicines.length} medicine{filteredMedicines.length === 1 ? '' : 's'} available
          </p>
        </div>
      </div>

      <div className="pharmacy-medicines-panel__results">
        {loading ? (
          <div className="pharmacy-bootstrap-loading compact">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <span>Loading medicines...</span>
          </div>
        ) : error ? (
          <div className="pharmacy-empty compact is-error">
            <span className="material-symbols-outlined">error</span>
            <h3>Unable to load medicines</h3>
            <p>Try again or check your connection.</p>
          </div>
        ) : filteredMedicines.length > 0 ? (
          filteredMedicines.map((medicine) => {
            const isSelected = hasSelectedId(selectedIds, medicine.medicineId);

            return (
              <div
                className={`pharmacy-medicines-panel__result${isSelected ? ' is-selected' : ''}`}
                key={medicine.medicineId}
              >
                <div className="pharmacy-medicines-panel__result-body">
                  <div className="pharmacy-medicines-panel__result-title-row">
                    <div className="pharmacy-medicines-panel__result-title-group">
                      <h4>{medicine.displayName}</h4>
                      {medicine.strength && (
                        <span className="pharmacy-medicines-panel__chip">{medicine.strength}</span>
                      )}
                    </div>
                  </div>

                  <div className="pharmacy-medicines-panel__pill-list">
                    {medicine.brandName && (
                      <span className="pharmacy-medicines-panel__pill">Brand: {medicine.brandName}</span>
                    )}
                    {medicine.genericName && (
                      <span className="pharmacy-medicines-panel__pill">Generic: {medicine.genericName}</span>
                    )}
                    {medicine.unit && (
                      <span className="pharmacy-medicines-panel__pill">Unit: {medicine.unit}</span>
                    )}
                  </div>
                </div>

                <button
                  className={`pharmacy-medicines-panel__add-btn${isSelected ? ' is-selected' : ''}`}
                  disabled={isSelected}
                  onClick={() => selectMedicine(medicine)}
                  type="button"
                >
                  <i className={`bi ${isSelected ? 'bi-check2' : 'bi-plus-lg'}`}></i>
                </button>
              </div>
            );
          })
        ) : (
          <div className="pharmacy-empty compact">
            <span className="material-symbols-outlined">search_off</span>
            <h3>No medicines matched this search</h3>
            <p>Try another keyword or loosen the active search filters.</p>
          </div>
        )}
      </div>
    </section>
  );
}
