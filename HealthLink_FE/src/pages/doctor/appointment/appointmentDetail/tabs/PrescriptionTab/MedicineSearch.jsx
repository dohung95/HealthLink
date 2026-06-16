import React from 'react';

const LIBRARY_FILTERS = [
  { key: 'brandName', label: 'Brand Name' },
  { key: 'genericName', label: 'Generic Name' },
  { key: 'dosageForm', label: 'Dosage Form' },
  { key: 'manufacturer', label: 'Manufacturer' },
];

export default function MedicineSearch({
  commonMedicines,
  filteredMedicines,
  filters,
  loading,
  onClose,
  onQueryChange,
  onSelectMedicine,
  onToggleFilter,
  onToggleFilters,
  query,
  recentMedicines,
  selectedMedicineIds,
  showFilters,
}) {
  const resultCount = filteredMedicines.length;
  const activeFilterCount = LIBRARY_FILTERS.filter((filter) => filters[filter.key]).length;

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
                  <div className="doctor-prescription-library__result" key={medicine.medicineId}>
                    <div className="doctor-prescription-library__result-content">
                      <div className="doctor-prescription-library__result-title-row">
                        <h4>{medicine.displayName}</h4>
                        {medicine.strength ? (
                          <span className="doctor-prescription-chip">{medicine.strength}</span>
                        ) : null}
                        {medicine.dosageForm ? (
                          <span className="doctor-prescription-chip doctor-prescription-chip--muted">
                            {medicine.dosageForm}
                          </span>
                        ) : null}
                      </div>

                      <p className="doctor-prescription-library__result-meta">
                        {medicine.manufacturer || 'Manufacturer not listed'}
                      </p>

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
                      className={`btn ${isSelected ? 'btn-outline-secondary' : 'btn-primary'}`}
                      disabled={isSelected}
                      onClick={() => onSelectMedicine(medicine)}
                      type="button"
                    >
                      <i className={`bi ${isSelected ? 'bi-check2' : 'bi-plus-lg'} me-2`}></i>
                      {isSelected ? 'Selected' : 'Add'}
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
