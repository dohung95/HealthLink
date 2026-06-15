import MedicineSearchPanel from './MedicineSearchPanel';
import { Modal } from './PharmacyModal';

export default function MedicineLibraryModal({ onClose, onSelect, selectedMedicineIds = new Set() }) {
  return (
    <Modal title="Medicine Library" onClose={onClose}>
      <div className="p-3">
        <MedicineSearchPanel onSelect={onSelect} selectedIds={selectedMedicineIds} />
      </div>
    </Modal>
  );
}
