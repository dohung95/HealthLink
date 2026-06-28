import React from 'react';

const LIBRARY_FILTERS = [
  { key: 'brandName', label: 'Brand Name' },
  { key: 'genericName', label: 'Generic Name' },
  { key: 'dosageForm', label: 'Dosage Form' },
  { key: 'manufacturer', label: 'Manufacturer' },
];

export default function MedicineSearch({
  activeDosageForm,
  commonMedicines,
  dosageForms,
  filteredMedicines,
  filters,
  loading,
  onClose,
  onDosageFormChange,
  onQueryChange,
  onSelectMedicine,
  onToggleFilter,
  onToggleFilters,
  query,
  recentMedicines,
  selectedMedicineIds,
  showFilters,
  isPanel = false,
}) {
  const resultCount = filteredMedicines.length;
  const activeFilterCount = LIBRARY_FILTERS.filter((filter) => filters[filter.key]).length;

  const suggestionItems = React.useMemo(() => {
    const items = [];
    recentMedicines.forEach((m) => items.push({ ...m, __isRecent: true }));
    commonMedicines.forEach((m) => items.push({ ...m, __isRecent: false }));
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((m) => m.searchableText && m.searchableText.includes(q));
  }, [query, recentMedicines, commonMedicines]);

  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const inputRef = React.useRef(null);
  const suggestionsRef = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e) => {
    if (!isOpen || suggestionItems.length === 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % suggestionItems.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + suggestionItems.length) % suggestionItems.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          onSelectMedicine(suggestionItems[highlightedIndex]);
          setIsOpen(false);
          setHighlightedIndex(-1);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const selectSuggestion = (item) => {
    onSelectMedicine(item);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  if (isPanel) {
    const recentList = suggestionItems.filter((m) => m.__isRecent);
    const commonList = suggestionItems.filter((m) => !m.__isRecent);

    return (
      <section className="doctor-prescription-library__main">
        <div className="doctor-prescription-library__header">
          <div className="doctor-prescription-library__search-group">
            <i className="bi bi-search"></i>
            <input
              ref={inputRef}
              className="form-control doctor-prescription-input"
              placeholder="Search medicines, brands, or generics..."
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
            />

            {isOpen && suggestionItems.length > 0 ? (
              <div className="doctor-prescription-library__suggestions" ref={suggestionsRef}>
                {recentList.length > 0 ? (
                  <>
                    <div className="doctor-prescription-library__suggestions-header">
                      <i className="bi bi-clock-history"></i>
                      Recent Searches
                    </div>
                    {recentList.map((item) => {
                      const idx = suggestionItems.indexOf(item);
                      return (
                        <button
                          className={`doctor-prescription-library__suggestions-item${highlightedIndex === idx ? ' doctor-prescription-library__suggestions-item--focused' : ''}`}
                          key={`sr-${item.medicineId}`}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          onClick={() => selectSuggestion(item)}
                          type="button"
                        >
                          <i className="bi bi-clock-history"></i>
                          <span>{item.searchLabel}</span>
                        </button>
                      );
                    })}
                  </>
                ) : null}
                {commonList.length > 0 ? (
                  <>
                    <div className="doctor-prescription-library__suggestions-header">
                      <i className="bi bi-heart"></i>
                      Commonly Used
                    </div>
                    {commonList.map((item) => {
                      const idx = suggestionItems.indexOf(item);
                      return (
                        <button
                          className={`doctor-prescription-library__suggestions-item${highlightedIndex === idx ? ' doctor-prescription-library__suggestions-item--focused' : ''}`}
                          key={`sc-${item.medicineId}`}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          onClick={() => selectSuggestion(item)}
                          type="button"
                        >
                          <i className="bi bi-heart"></i>
                          <span>{item.searchLabel}</span>
                        </button>
                      );
                    })}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="doctor-prescription-library__header-actions">
            <button
              className="btn doctor-prescription-library__filter-btn"
              onClick={onToggleFilters}
              type="button"
            >
              <span className={`doctor-prescription-library__filter-icon-wrapper${showFilters ? ' doctor-prescription-library__filter-icon-wrapper--active' : ''}`}>
                <i className="bi bi-funnel"></i>
                {activeFilterCount > 0 ? (
                  <span className="doctor-prescription-library__filter-count">{activeFilterCount}</span>
                ) : null}
              </span>
            </button>
          </div>
        </div>

        {showFilters ? (
          <div className="doctor-prescription-library__filters">
            <div className="doctor-prescription-library__filters-grid">
              {LIBRARY_FILTERS.map((filter) => (
                <label className="doctor-prescription-library__filter" key={filter.key}>
                  <input
                    checked={filters[filter.key]}
                    onChange={() => onToggleFilter(filter.key)}
                    type="checkbox"
                  />
                  <span>{filter.label}</span>
                </label>
              ))}
            </div>
            <p className="doctor-prescription-library__filter-note">
              The Stock field was removed because it is not available in the current medicine data.
            </p>
          </div>
        ) : null}

        {dosageForms?.length > 0 ? (
          <div className="doctor-prescription-library__dosage-forms">
            {dosageForms.map((form) => (
              <button
                className={`doctor-prescription-library__dosage-form-chip${activeDosageForm === form ? ' doctor-prescription-library__dosage-form-chip--active' : ''}`}
                key={form}
                onClick={() => onDosageFormChange(activeDosageForm === form ? null : form)}
                type="button"
              >
                {form.charAt(0).toUpperCase() + form.slice(1)}
              </button>
            ))}
            {activeDosageForm ? (
              <button
                className="doctor-prescription-library__dosage-form-clear"
                onClick={() => onDosageFormChange(null)}
                type="button"
              >
                Clear
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="doctor-prescription-library__results-head">
          <div>
            <p className="doctor-prescription-library__results-title">Search Results</p>
            <p className="doctor-prescription-library__results-subtitle">
              {resultCount} medicine{resultCount === 1 ? '' : 's'} available
            </p>
          </div>
        </div>

        <div className="doctor-prescription-library__results">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filteredMedicines.length > 0 ? (
            filteredMedicines.map((medicine) => {
              const isSelected = selectedMedicineIds.has(medicine.medicineId);

              return (
                <div className={`doctor-prescription-library__result${isSelected ? ' doctor-prescription-library__result--selected' : ''}`} key={medicine.medicineId}>
                  <div className="doctor-prescription-library__result-body">
                    <div className="doctor-prescription-library__result-title-row">
                      <div className="doctor-prescription-library__result-title-group">
                        <h4>{medicine.displayName}</h4>
                        {medicine.strength ? (
                          <span className="doctor-prescription-chip">{medicine.strength}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="doctor-prescription-pill-list">
                      {medicine.brandName ? (
                        <span className="doctor-prescription-pill">Brand: {medicine.brandName}</span>
                      ) : null}
                      {medicine.genericName ? (
                        <span className="doctor-prescription-pill">Generic: {medicine.genericName}</span>
                      ) : null}
                      {medicine.unit ? (
                        <span className="doctor-prescription-pill">Unit: {medicine.unit}</span>
                      ) : null}
                    </div>
                  </div>

                  <button
                    className={`doctor-prescription-library__result-add-btn${isSelected ? ' doctor-prescription-library__result-add-btn--selected' : ''}`}
                    disabled={isSelected}
                    onClick={() => onSelectMedicine(medicine)}
                    type="button"
                  >
                    <i className={`bi ${isSelected ? 'bi-check2' : 'bi-plus-lg'}`}></i>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="doctor-prescription-empty-state">
              <div className="doctor-prescription-empty-state__icon">
                <i className="bi bi-search"></i>
              </div>
              <h4>No medicines matched this search</h4>
              <p>Try another keyword or loosen the active search filters.</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="doctor-prescription-library">
      <div className="doctor-prescription-library__backdrop" onClick={onClose}></div>
      <div
        aria-modal="true"
        className="doctor-prescription-library__dialog"
        role="dialog"
      >
        <aside className="doctor-prescription-library__sidebar">
          <div>
            <p className="doctor-detail-eyebrow">Medicine Library</p>
            <h3 className="doctor-detail-section-title">Find a medication</h3>
          </div>

          <div className="doctor-prescription-library__sidebar-group">
            <p className="doctor-prescription-library__sidebar-label">Recent Searches</p>
            {recentMedicines.length > 0 ? (
              <div className="doctor-prescription-library__shortcut-list">
                {recentMedicines.map((medicine) => (
                  <button
                    className="doctor-prescription-library__shortcut"
                    key={`recent-${medicine.medicineId}`}
                    onClick={() => onSelectMedicine(medicine)}
                    type="button"
                  >
                    <i className="bi bi-clock-history"></i>
                    <span>{medicine.searchLabel}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="doctor-prescription-library__placeholder">
                Search selections will show up here.
              </p>
            )}
          </div>

          <div className="doctor-prescription-library__sidebar-group">
            <p className="doctor-prescription-library__sidebar-label">Commonly Used</p>
            {commonMedicines.length > 0 ? (
              <div className="doctor-prescription-library__shortcut-list">
                {commonMedicines.map((medicine) => (
                  <button
                    className="doctor-prescription-library__shortcut"
                    key={`common-${medicine.medicineId}`}
                    onClick={() => onSelectMedicine(medicine)}
                    type="button"
                  >
                    <i className="bi bi-heart"></i>
                    <span>{medicine.searchLabel}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="doctor-prescription-library__placeholder">
                Medicine catalog is loading.
              </p>
            )}
          </div>
        </aside>

        <section className="doctor-prescription-library__main">
          <div className="doctor-prescription-library__header">
            <div className="doctor-prescription-library__search-group">
              <i className="bi bi-search"></i>
              <input
                autoFocus
                className="form-control doctor-prescription-input"
                placeholder="Search medicines, brands, or generics..."
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
              />
            </div>

            <div className="doctor-prescription-library__header-actions">
              <button
                className="btn doctor-prescription-library__filter-btn"
                onClick={onToggleFilters}
                type="button"
              >
                <span className={`doctor-prescription-library__filter-icon-wrapper${showFilters ? ' doctor-prescription-library__filter-icon-wrapper--active' : ''}`}>
                  <i className="bi bi-funnel"></i>
                  {activeFilterCount > 0 ? (
                    <span className="doctor-prescription-library__filter-count">{activeFilterCount}</span>
                  ) : null}
                </span>
              </button>
            </div>
          </div>

          {showFilters ? (
            <div className="doctor-prescription-library__filters">
              <div className="doctor-prescription-library__filters-grid">
                {LIBRARY_FILTERS.map((filter) => (
                  <label className="doctor-prescription-library__filter" key={filter.key}>
                    <input
                      checked={filters[filter.key]}
                      onChange={() => onToggleFilter(filter.key)}
                      type="checkbox"
                    />
                    <span>{filter.label}</span>
                  </label>
                ))}
              </div>
              <p className="doctor-prescription-library__filter-note">
                The Stock field was removed because it is not available in the current medicine data.
              </p>
            </div>
          ) : null}

          {dosageForms?.length > 0 ? (
            <div className="doctor-prescription-library__dosage-forms">
              {dosageForms.map((form) => (
                <button
                  className={`doctor-prescription-library__dosage-form-chip${activeDosageForm === form ? ' doctor-prescription-library__dosage-form-chip--active' : ''}`}
                  key={form}
                  onClick={() => onDosageFormChange(activeDosageForm === form ? null : form)}
                  type="button"
                >
                  {form.charAt(0).toUpperCase() + form.slice(1)}
                </button>
              ))}
              {activeDosageForm ? (
                <button
                  className="doctor-prescription-library__dosage-form-clear"
                  onClick={() => onDosageFormChange(null)}
                  type="button"
                >
                  Clear
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="doctor-prescription-library__results-head">
            <div>
              <p className="doctor-prescription-library__results-title">Search Results</p>
              <p className="doctor-prescription-library__results-subtitle">
                {resultCount} medicine{resultCount === 1 ? '' : 's'} available
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filteredMedicines.length > 0 ? (
            <div className="doctor-prescription-library__results">
              {filteredMedicines.map((medicine) => {
                const isSelected = selectedMedicineIds.has(medicine.medicineId);

                return (
                  <div className={`doctor-prescription-library__result${isSelected ? ' doctor-prescription-library__result--selected' : ''}`} key={medicine.medicineId}>
                    <div className="doctor-prescription-library__result-body">
                      <div className="doctor-prescription-library__result-title-row">
                        <div className="doctor-prescription-library__result-title-group">
                          <h4>{medicine.displayName}</h4>
                          {medicine.strength ? (
                            <span className="doctor-prescription-chip">{medicine.strength}</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="doctor-prescription-pill-list">
                        {medicine.brandName ? (
                          <span className="doctor-prescription-pill">Brand: {medicine.brandName}</span>
                        ) : null}
                        {medicine.genericName ? (
                          <span className="doctor-prescription-pill">Generic: {medicine.genericName}</span>
                        ) : null}
                        {medicine.unit ? (
                          <span className="doctor-prescription-pill">Unit: {medicine.unit}</span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      className={`doctor-prescription-library__result-add-btn${isSelected ? ' doctor-prescription-library__result-add-btn--selected' : ''}`}
                      disabled={isSelected}
                      onClick={() => onSelectMedicine(medicine)}
                      type="button"
                    >
                      <i className={`bi ${isSelected ? 'bi-check2' : 'bi-plus-lg'}`}></i>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="doctor-prescription-empty-state">
              <div className="doctor-prescription-empty-state__icon">
                <i className="bi bi-search"></i>
              </div>
              <h4>No medicines matched this search</h4>
              <p>Try another keyword or loosen the active search filters.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
