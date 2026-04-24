import React from 'react';

function Payment() {
  return (
    <div className="section">
      <h2>Secure Payment</h2>
      <p>View your invoice or insurance details.</p>
      <button className="btn btn-primary">View Invoice</button>
      <div className="form-group">
        <label>Insurance Details:</label>
        <input type="text" className="form-control" placeholder="Enter insurance ID" />
      </div>
    </div>
  );
}

export default Payment;