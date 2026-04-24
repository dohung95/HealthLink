import React, { useState, useEffect } from 'react';
import { prescriptionService } from '../api/prescriptionApi';
import consultationApi from '../api/consultationApi';
import { toast } from 'react-toastify';
import './Css/PrescriptionModal.css';

const CreatePrescriptionModal = ({ isOpen, onClose, appointment, patient }) => {
  const [currentMedicine, setCurrentMedicine] = useState({
    medicationName: '',
    dosage: '',
    quantity: '',
    instructions: '',
    totalSupplyDays: 0
  });

  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingPrescription, setExistingPrescription] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Load existing prescription when modal opens
  useEffect(() => {
    const loadExistingPrescription = async () => {
      if (isOpen && appointment?.appointmentID) {
        try {
          const existing = await prescriptionService.getByAppointment(appointment.appointmentID);
          if (existing) {
            setExistingPrescription(existing);
            setIsEditMode(true);
            // Load prescription items
            const header = await prescriptionService.getPrescriptionHeader(existing.prescriptionHeaderID);
            if (header && header.medications) {
              setPrescriptionItems(header.medications.map((med, index) => ({
                id: med.prescriptionItemID || Date.now() + index,
                medicationName: med.medicationName,
                dosage: med.dosage,
                quantity: med.quantity || '',
                instructions: med.instructions,
                totalSupplyDays: med.totalSupplyDays
              })));
            }
          }
        } catch (err) {
          console.error('Error loading existing prescription:', err);
        }
      }
    };
    loadExistingPrescription();
  }, [isOpen, appointment]);

  // Helper to calculate age
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentMedicine(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddMedicine = () => {
    // Validation
    if (!currentMedicine.medicationName.trim()) {
      setError('Please enter medicine name');
      return;
    }
    if (!currentMedicine.dosage.trim()) {
      setError('Please enter dosage');
      return;
    }
    if (!currentMedicine.quantity.trim()) {
      setError('Please enter quantity');
      return;
    }
    if (!currentMedicine.instructions.trim()) {
      setError('Please enter usage instructions');
      return;
    }
    if (!currentMedicine.totalSupplyDays || currentMedicine.totalSupplyDays <= 0) {
      setError('Please enter valid supply days');
      return;
    }

    // Update existing item or add new one
    if (editingItemId) {
      setPrescriptionItems(prev => prev.map(item =>
        item.id === editingItemId ? { ...currentMedicine, id: editingItemId } : item
      ));
      setEditingItemId(null);
    } else {
      // Add to list
      setPrescriptionItems(prev => [...prev, { ...currentMedicine, id: Date.now() }]);
    }

    // Reset form
    setCurrentMedicine({
      medicationName: '',
      dosage: '',
      quantity: '',
      instructions: '',
      totalSupplyDays: 0
    });
    setError('');
  };

  const handleRemoveMedicine = (id) => {
    setPrescriptionItems(prev => prev.filter(item => item.id !== id));
    // If editing this item, cancel edit
    if (editingItemId === id) {
      setEditingItemId(null);
      setCurrentMedicine({
        medicationName: '',
        dosage: '',
        quantity: '',
        instructions: '',
        totalSupplyDays: 0
      });
    }
  };

  const handleEditMedicine = (item) => {
    setCurrentMedicine({
      medicationName: item.medicationName,
      dosage: item.dosage,
      quantity: item.quantity,
      instructions: item.instructions,
      totalSupplyDays: item.totalSupplyDays
    });
    setEditingItemId(item.id);
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setCurrentMedicine({
      medicationName: '',
      dosage: '',
      quantity: '',
      instructions: '',
      totalSupplyDays: 0
    });
    setError('');
  };

  const handleSubmit = async () => {
    if (prescriptionItems.length === 0) {
      setError('Please add at least one medication');
      return;
    }

    // Thêm validation cho diagnosis
    if (!diagnosis.trim()) {
      setError('Please enter a diagnosis');
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);

    setIsSubmitting(true);
    setError('');

    try {
      // Get appointment ID and patient ID
      const appointmentId = appointment?.appointmentID;
      const patientId = patient?.patientID || appointment?.patientID;

      if (!appointmentId) {
        setError('Appointment ID not found');
        setIsSubmitting(false);
        return;
      }

      if (!patientId) {
        setError('Patient ID not found');
        setIsSubmitting(false);
        return;
      }

      const prescriptionData = {
        appointmentID: appointmentId,
        patientID: patientId,
        medications: prescriptionItems.map(item => ({
          medicationName: item.medicationName,
          dosage: item.dosage,
          instructions: item.instructions,
          totalSupplyDays: parseInt(item.totalSupplyDays)
        }))
      };

      console.log('Sending prescription data:', prescriptionData);

      // Create or update prescription
      if (isEditMode && existingPrescription) {
        await prescriptionService.updatePrescription(existingPrescription.prescriptionHeaderID, prescriptionData);
        toast.success('Prescription updated successfully!', {
          position: 'top-right',
          autoClose: 3000,
        });
      } else {
        await prescriptionService.createPrescription(prescriptionData);
        toast.success('Prescription created successfully!', {
          position: 'top-right',
          autoClose: 3000,
        });
      }

      // Create consultation if there are doctor notes or diagnosis
      if (additionalNotes.trim() || diagnosis.trim()) {
        const consultationData = {
          AppointmentID: appointmentId,
          StartTime: new Date().toISOString(),
          EndTime: new Date().toISOString(),
          DoctorNotes: additionalNotes.trim() || null,
          Diagnosis: diagnosis.trim() || null,  // <-- THÊM DÒNG NÀY
          FollowUpDate: null
        };

        console.log('Sending consultation data:', consultationData);

        try {
          await consultationApi.createConsultation(consultationData);
          console.log('Consultation created successfully');
        } catch (consultationError) {
          console.error('Error creating consultation:', consultationError);
          console.error('Consultation error details:', consultationError.response?.data);
          // Don't fail the whole operation if consultation fails
        }
      }

      // Success - close modal and reset
      handleClose();
    } catch (err) {
      console.error('Error saving prescription:', err);
      console.error('Error response:', err.response?.data);
      toast.error(err.response?.data?.title || err.response?.data?.message || 'Failed to save prescription. Please try again.', {
        position: 'top-right',
        autoClose: 3000,
      });
      setError(err.response?.data?.title || err.response?.data?.message || 'Failed to save prescription. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPrescriptionItems([]);
    setCurrentMedicine({
      medicationName: '',
      dosage: '',
      quantity: '',
      instructions: '',
      totalSupplyDays: 0
    });
    setAdditionalNotes('');
    setDiagnosis('');
    setError('');
    setExistingPrescription(null);
    setIsEditMode(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content-custom" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>

        {/* Modal Header */}
        <div className="d-flex align-items-center justify-content-between p-4 border-bottom border-gray-200 prescription-modal-header" style={{ flexShrink: 0 }}>
          <div className="d-flex flex-column gap-1">
            <h1 className="fs-4 fw-bold text-gray-800 mb-0">
              {isEditMode ? 'Edit Prescription' : 'Write Prescription'}
            </h1>
            <p className="small text-gray-500 mb-0">
              Patient: {patient?.fullName || 'N/A'} - {calculateAge(patient?.dateOfBirth)} years - {appointment?.reason || 'N/A'}
            </p>
          </div>
          <button
            className="btn p-2 rounded-circle border-0 bg-transparent text-gray-500"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 d-flex flex-column gap-4" style={{ flexGrow: 1, overflowY: 'auto', maxHeight: 'calc(90vh - 200px)' }}>

          {/* Error Message */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          {/* Diagnosis Field */}
          <div className="p-3 p-md-4 border border-primary rounded-3 bg-light">
            <label className="d-flex flex-column w-100">
              <p className="text-primary small fw-bold mb-2">
                <i className="bi bi-clipboard2-pulse me-2"></i>Diagnosis *
              </p>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Enter diagnosis (e.g., Hypertension Stage 1, Type 2 Diabetes)..."
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              ></textarea>
              <small className="text-muted mt-1">
                <i className="bi bi-info-circle me-1"></i>
                Primary diagnosis or condition identified during consultation
              </small>
            </label>
          </div>

          {/* Add Medicine Form */}
          <div className="p-3 p-md-4 border border-gray-200 rounded-3 bg-white">
            <div className="row g-3 align-items-start">
              {/* Medicine Name */}
              <div className="col-12 col-lg-6">
                <label className="d-flex flex-column w-100">
                  <p className="text-text-light-primary small fw-medium mb-2">Medicine Name *</p>
                  <input
                    className="form-control prescription-form-control"
                    placeholder="Enter medicine name..."
                    name="medicationName"
                    value={currentMedicine.medicationName}
                    onChange={handleInputChange}
                  />
                </label>
              </div>

              {/* Dosage */}
              <div className="col-6 col-lg-3">
                <label className="d-flex flex-column w-100">
                  <p className="text-text-light-primary small fw-medium mb-2">Dosage *</p>
                  <input
                    className="form-control prescription-form-control"
                    placeholder="e.g. 500mg"
                    name="dosage"
                    value={currentMedicine.dosage}
                    onChange={handleInputChange}
                  />
                </label>
              </div>

              {/* Quantity */}
              <div className="col-6 col-lg-3">
                <label className="d-flex flex-column w-100">
                  <p className="text-text-light-primary small fw-medium mb-2">Quantity *</p>
                  <input
                    className="form-control prescription-form-control"
                    placeholder="e.g. 20 pills"
                    name="quantity"
                    value={currentMedicine.quantity}
                    onChange={handleInputChange}
                  />
                </label>
              </div>

              {/* Supply Days */}
              <div className="col-12 col-lg-4">
                <label className="d-flex flex-column w-100">
                  <p className="text-text-light-primary small fw-medium mb-2">Total Supply Days *</p>
                  <input
                    type="number"
                    className="form-control prescription-form-control"
                    placeholder="e.g. 7"
                    name="totalSupplyDays"
                    value={currentMedicine.totalSupplyDays || ''}
                    onChange={handleInputChange}
                    min="1"
                  />
                </label>
              </div>

              {/* Frequency/Usage */}
              <div className="col-12 col-lg-6">
                <label className="d-flex flex-column w-100">
                  <p className="text-text-light-primary small fw-medium mb-2">Frequency/Usage *</p>
                  <input
                    className="form-control prescription-form-control"
                    placeholder="e.g. Morning 1 pill, Evening 1 pill after meal"
                    name="instructions"
                    value={currentMedicine.instructions}
                    onChange={handleInputChange}
                  />
                </label>
              </div>

              {/* Add/Update button */}
              <div className="col-12 col-lg-2 d-grid align-self-end">
                {editingItemId ? (
                  <div className="d-flex flex-column gap-2">
                    <button
                      className="btn btn-primary d-flex align-items-center justify-content-center gap-2 px-3 fw-semibold"
                      onClick={handleAddMedicine}
                      type="button"
                    >
                      <span className="material-symbols-outlined small">check_circle</span>
                      <span>Update</span>
                    </button>
                    <button
                      className="btn btn-secondary d-flex align-items-center justify-content-center gap-2 px-3 fw-semibold"
                      onClick={handleCancelEdit}
                      type="button"
                    >
                      <span>Cancel</span>
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-add-medicine d-flex align-items-center justify-content-center gap-2 px-3 fw-semibold"
                    onClick={handleAddMedicine}
                    type="button"
                  >
                    <span className="material-symbols-outlined small">add_circle</span>
                    <span>Add</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Prescription List */}
          {prescriptionItems.length > 0 && (
            <div className="d-flex flex-column gap-3">
              <h3 className="fs-6 fw-semibold text-gray-700 mb-0">Current Prescription</h3>
              <div className="overflow-auto border border-gray-200 rounded-3">
                <table className="table table-borderless table-striped align-middle mb-0 prescription-table">
                  <thead className="prescription-table-header">
                    <tr>
                      <th className="px-3 py-3" scope="col">No.</th>
                      <th className="px-3 py-3" scope="col">Medicine Name</th>
                      <th className="px-3 py-3" scope="col">Dose & Qty</th>
                      <th className="px-3 py-3" scope="col">Supply Days</th>
                      <th className="px-3 py-3" scope="col">Usage</th>
                      <th className="px-3 py-3 text-end" scope="col"><span className="visually-hidden">Action</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptionItems.map((item, index) => (
                      <tr key={item.id} className={editingItemId === item.id ? 'table-warning' : ''}>
                        <td className="px-3 py-3 prescription-table-body-row-medium">{index + 1}</td>
                        <td className="px-3 py-3 prescription-table-body-row-medium">{item.medicationName}</td>
                        <td className="px-3 py-3 text-gray-500">{item.dosage} - {item.quantity}</td>
                        <td className="px-3 py-3 text-gray-500">{item.totalSupplyDays} days</td>
                        <td className="px-3 py-3 text-gray-500">{item.instructions}</td>
                        <td className="px-3 py-3 text-end">
                          <div className="d-flex gap-2 justify-content-end">
                            <button
                              className="btn btn-sm p-1"
                              onClick={() => handleEditMedicine(item)}
                              type="button"
                              disabled={editingItemId && editingItemId !== item.id}
                              title="Edit"
                              style={{ border: 'none', background: 'transparent', color: '#3b82f6' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>edit</span>
                            </button>
                            <button
                              className="btn-delete-medicine"
                              onClick={() => handleRemoveMedicine(item.id)}
                              type="button"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes section */}
          {/* Doctor Notes Field */}
          <div className="col-12">
            <label className="d-flex flex-column w-100">
              <p className="text-text-light-primary small fw-medium mb-2">
                <i className="bi bi-journal-text me-2"></i>Doctor Notes
              </p>
              <textarea
                className="form-control"
                rows="4"
                placeholder="Enter additional notes, observations, treatment plan..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
              ></textarea>
              <small className="text-muted mt-1">
                Additional observations, symptoms, or treatment recommendations
              </small>
            </label>
          </div>
      </div>

      {/* Modal Footer */}
      <div className="d-flex align-items-center justify-content-end gap-3 p-4 border-top border-gray-200 prescription-modal-footer rounded-bottom-3">
        <button
          className="btn btn-sm px-4 py-2 fw-semibold text-gray-700 bg-white border border-gray-300"
          onClick={handleClose}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          className="btn btn-sm px-4 py-2 fw-semibold text-white btn-add-medicine"
          onClick={handleSubmit}
          disabled={isSubmitting || prescriptionItems.length === 0}
        >
          {isSubmitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {isEditMode ? 'Updating...' : 'Saving...'}
            </>
          ) : (
            isEditMode ? 'Update Prescription' : 'Save Prescription'
          )}
                </button>
      </div>
    </div>

    {/* Confirmation Modal */}
    {showConfirmModal && (
      <div
        className="modal-overlay"
        style={{
          zIndex: 1060,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={() => setShowConfirmModal(false)}
      >
        <div
          className="modal-dialog"
          style={{ maxWidth: '600px', width: '90%', margin: '1.75rem auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="modal-content"
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
          >
            <div className="modal-header border-0 pb-2 pt-4 px-4">
              <h5 className="modal-title fw-bold">
                {isEditMode ? 'Confirm Update' : 'Confirm Create'}
              </h5>
            </div>
            <div className="modal-body py-3 px-4">
              <p className="mb-0 fs-6">
                Are you sure you want to {isEditMode ? 'update' : 'create'} this prescription with {prescriptionItems.length} medication{prescriptionItems.length > 1 ? 's' : ''}?
              </p>
            </div>
            <div className="modal-footer border-0 pt-2 pb-4 px-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

export default CreatePrescriptionModal;
