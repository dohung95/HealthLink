import MedicineSearchPanel from '../MedicineSearchPanel';

export default function MedicineLibraryPanel({ onAddMedicine, selectedMedicineIds, inventoryItems }) {
  return (
    <div className="medicine-library-panel">
      <MedicineSearchPanel
        items={inventoryItems}
        onSelect={onAddMedicine}
        selectedIds={selectedMedicineIds}
      />
    </div>
  );
}
