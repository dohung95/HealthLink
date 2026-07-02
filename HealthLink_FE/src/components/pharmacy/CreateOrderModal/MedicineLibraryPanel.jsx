import MedicineSearchPanel from '../MedicineSearchPanel';

export default function MedicineLibraryPanel({ onAddMedicine, selectedMedicineIds }) {
  return (
    <div className="medicine-library-panel">
      <MedicineSearchPanel onSelect={onAddMedicine} selectedIds={selectedMedicineIds} />
    </div>
  );
}
