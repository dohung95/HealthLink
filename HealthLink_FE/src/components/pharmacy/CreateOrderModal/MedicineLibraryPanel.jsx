import MedicineSearchPanel from '../MedicineSearchPanel';

export default function MedicineLibraryPanel({ onAddMedicine, selectedMedicineIds }) {
  return (
    <div className="medicine-library-panel">
      <h5>Select Medicines</h5>
      <MedicineSearchPanel onSelect={onAddMedicine} selectedIds={selectedMedicineIds} />
    </div>
  );
}
