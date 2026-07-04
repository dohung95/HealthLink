import React from 'react';
import ClinicalResultCompactCard from './ClinicalResultCompactCard';

export default function ClinicalResultCategorySection({
  category,
  results,
  selectedResultId,
  onSelectCard,
}) {
  return (
    <div className="cr-category-section">
      <div className="cr-category-section__header">
        <span className="cr-category-section__name">{category}</span>
        <span className="cr-category-section__count">{results.length}</span>
      </div>
      <div className="cr-card-grid">
        {results.map((result) => (
          <ClinicalResultCompactCard
            key={result.documentId}
            result={result}
            isSelected={selectedResultId === result.documentId}
            onSelect={onSelectCard}
          />
        ))}
      </div>
    </div>
  );
}
