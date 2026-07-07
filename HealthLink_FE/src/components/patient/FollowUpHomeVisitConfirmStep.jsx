import React from 'react';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
};

const DetailRow = ({ label, value }) => (
  <div className="d-flex justify-content-between gap-3 mb-2">
    <span className="text-muted">{label}</span>
    <strong className="text-end">{value || 'N/A'}</strong>
  </div>
);

const SectionTitle = ({ icon, title }) => (
  <h6 className="mb-2"><i className={`bi ${icon} me-2`} />{title}</h6>
);

const FollowUpHomeVisitConfirmStep = ({
  statusData,
  locationDetails,
  selectedServices,
  saving,
  onBack,
  onConfirm,
}) => {
  const serviceTotal = selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0);

  return (
    <div className="border rounded-3 p-4 bg-white">
      <h5 className="mb-3"><i className="bi bi-check2-square me-2" />Confirm Details</h5>

      <div className="row g-4">
        <div className="col-md-6">
          <SectionTitle icon="bi-calendar-event" title="Follow-up Schedule" />
          <div className="ps-1">
            <DetailRow label="Date" value={formatDate(statusData?.followUpDate)} />
            <DetailRow label="Notes" value={statusData?.followUpNotes} />
            <DetailRow label="Doctor ID" value={statusData?.doctorId} />
            <DetailRow label="Source Appointment" value={String(statusData?.sourceAppointmentId ?? '')} />
          </div>
        </div>

        <div className="col-md-6">
          <SectionTitle icon="bi-geo-alt" title="Visit Location" />
          <div className="ps-1">
            <DetailRow label="Address" value={locationDetails.visitAddress} />
            <DetailRow label="City" value={locationDetails.visitCity} />
            <DetailRow label="Contact Phone" value={locationDetails.contactPhone} />
            <DetailRow label="Reason" value={locationDetails.reasonForHomeVisit} />
            {locationDetails.specialNotes && <DetailRow label="Special Notes" value={locationDetails.specialNotes} />}
          </div>
        </div>
      </div>

      {locationDetails.isForSelf === false && (
        <div className="mt-3">
          <SectionTitle icon="bi-person" title="Receiver Details" />
          <div className="ps-1">
            <DetailRow label="Name" value={locationDetails.receiverName} />
            <DetailRow label="Age" value={locationDetails.receiverAge} />
            <DetailRow label="Gender" value={locationDetails.receiverGender} />
            <DetailRow label="Relationship" value={locationDetails.receiverRelationship} />
            <DetailRow label="Phone" value={locationDetails.receiverPhone} />
          </div>
        </div>
      )}

      {selectedServices.length > 0 && (
        <div className="mt-3">
          <SectionTitle icon="bi-clipboard2-pulse" title={`Selected Services (${selectedServices.length})`} />
          <div className="ps-1">
            {selectedServices.map((svc) => (
              <DetailRow key={svc.serviceId} label={svc.serviceName} value={`$${Number(svc.price || 0).toFixed(2)}`} />
            ))}
            <hr className="my-1" />
            <DetailRow label="Service Total" value={`$${serviceTotal.toFixed(2)}`} />
          </div>
        </div>
      )}

      <div className="d-flex justify-content-between mt-4">
        <button type="button" className="btn btn-outline-secondary" onClick={onBack} disabled={saving}>
          <i className="bi bi-arrow-left me-2" />Back
        </button>
        <button type="button" className="btn btn-success" onClick={onConfirm} disabled={saving}>
          {saving ? (
            <><span className="spinner-border spinner-border-sm me-2" role="status" />Saving...</>
          ) : (
            <><i className="bi bi-check-lg me-2" />Save details and continue to payment</>
          )}
        </button>
      </div>
    </div>
  );
};

export default FollowUpHomeVisitConfirmStep;
