import React from 'react';

function Records() {
  return (
    <div className="section">
      <h2>Patient Health Records</h2>
      <p>Manage your medical history, prescriptions, and lab results.</p>
      <div className="form-group">
        <label>Upload Document:</label>
        <input type="file" className="form-control" />
      </div>
      <button className="btn btn-primary">Save Record</button>
      <button className="btn btn-secondary ml-2">View History</button>
    </div>
  );
}

export default Records;