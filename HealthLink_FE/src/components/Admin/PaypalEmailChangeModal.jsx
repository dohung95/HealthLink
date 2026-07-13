import React, { useEffect, useState } from "react";

/**
 * Reusable 2-step "Change PayPal Email" modal for Admin Doctor/Pharmacy Management.
 * Step 1: admin submits a new PayPal email -> OTP is emailed to that new address.
 * Step 2: admin enters the OTP (relayed by the doctor/pharmacy) to confirm the change.
 */
export default function PaypalEmailChangeModal({
  show,
  onHide,
  entityLabel, // "Doctor" | "Pharmacy"
  entityName,
  currentPaypalEmail,
  requestFn, // (newPaypalEmail, reason) => Promise
  verifyFn, // (otp, reason) => Promise<updatedDto>
  onSuccess, // (updatedDto) => void
  showToast,
}) {
  const [step, setStep] = useState("request"); // request | verify
  const [newPaypalEmail, setNewPaypalEmail] = useState("");
  const [reason, setReason] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [reasonError, setReasonError] = useState("");

  useEffect(() => {
    if (show) {
      setStep("request");
      setNewPaypalEmail("");
      setReason("");
      setOtp("");
      setEmailError("");
      setReasonError("");
    }
  }, [show]);

  if (!show) return null;

  const handleSendOtp = async () => {
    setEmailError("");
    setReasonError("");
    if (!newPaypalEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newPaypalEmail)) {
      setEmailError("Please enter a valid PayPal email address");
      return;
    }
    if (!reason.trim()) {
      setReasonError("Please provide a reason for this change");
      return;
    }
    try {
      setSubmitting(true);
      await requestFn(newPaypalEmail.trim(), reason.trim());
      showToast({ title: "OTP Sent", message: `An OTP was emailed to ${newPaypalEmail.trim()}`, type: "success" });
      setStep("verify");
    } catch (err) {
      setEmailError(err.response?.data?.message || err.response?.data?.error || err.message || "Unable to send OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      showToast({ title: "Validation Error", message: "Please enter the OTP", type: "error" });
      return;
    }
    try {
      setSubmitting(true);
      const updated = await verifyFn(otp.trim(), reason.trim());
      showToast({ title: "PayPal Email Updated", message: `PayPal email changed to ${newPaypalEmail.trim()}`, type: "success" });
      onSuccess?.(updated);
      onHide();
    } catch (err) {
      showToast({ title: "Verification Failed", message: err.response?.data?.message || err.response?.data?.error || err.message || "Invalid or expired OTP", type: "error", duration: 5000 });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onHide}>
      <div className="admin-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
        <div className="admin-modal-content">
          <div className="admin-modal-header primary" style={{ background: "linear-gradient(135deg, #0070ba 0%, #1546a0 100%)" }}>
            <h5><i className="bi bi-paypal me-2"></i>Change PayPal Email</h5>
            <button type="button" className="admin-modal-close" onClick={onHide}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className="admin-modal-body">
            <div style={{ background: "#eff6ff", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
              <div className="d-flex align-items-center gap-3">
                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: "50px", height: "50px" }}>
                  <i className="bi bi-person"></i>
                </div>
                <div>
                  <h6 className="mb-1" style={{ fontWeight: "600" }}>{entityName}</h6>
                  <p className="mb-0" style={{ fontSize: "13px", color: "#64748b" }}>{entityLabel}</p>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="admin-form-label">Current PayPal Email</label>
              <div style={{ padding: "10px 14px", background: "white", border: "2px dashed #dbeafe", borderRadius: "8px" }}>
                {currentPaypalEmail || <span className="text-muted">Not set</span>}
              </div>
            </div>

            {step === "request" ? (
              <div className="mb-3">
                <label className="admin-form-label">New PayPal Email <span className="text-danger">*</span></label>
                <input
                  type="email"
                  className={`form-control admin-form-control${emailError ? " is-invalid" : ""}`}
                  value={newPaypalEmail}
                  onChange={(e) => {
                    setNewPaypalEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  placeholder="new-paypal@example.com"
                  disabled={submitting}
                />
                {emailError ? (
                  <div className="text-danger d-block" style={{ fontSize: "13px", marginTop: "4px" }}>{emailError}</div>
                ) : (
                  <small className="text-muted d-block">An OTP will be sent to this new address to confirm ownership.</small>
                )}

                <label className="admin-form-label mt-3">Reason <span className="text-danger">*</span></label>
                <textarea
                  className={`form-control admin-form-control${reasonError ? " is-invalid" : ""}`}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (reasonError) setReasonError("");
                  }}
                  placeholder="Why is this PayPal email being changed?"
                  rows={2}
                  disabled={submitting}
                  style={{ resize: "none" }}
                />
                {reasonError ? (
                  <div className="text-danger d-block" style={{ fontSize: "13px", marginTop: "4px" }}>{reasonError}</div>
                ) : (
                  <small className="text-muted d-block">This reason will be recorded in the audit log.</small>
                )}
              </div>
            ) : (
              <div className="mb-3">
                <label className="admin-form-label">Enter OTP <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control admin-form-control"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit code"
                  maxLength={6}
                  disabled={submitting}
                />
                <small className="text-muted">
                  Sent to <strong>{newPaypalEmail}</strong>. Ask {entityLabel.toLowerCase()} to check that inbox and relay the code.
                </small>
                <div className="mt-2">
                  <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setStep("request")} disabled={submitting}>
                    <i className="bi bi-arrow-left"></i> Change email / resend
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="admin-modal-footer">
            <button type="button" className="admin-btn-modal secondary" onClick={onHide} disabled={submitting}>
              <i className="bi bi-x-circle"></i>Cancel
            </button>
            {step === "request" ? (
              <button type="button" className="admin-btn-modal primary" onClick={handleSendOtp} disabled={submitting}>
                <i className="bi bi-send"></i>{submitting ? "Sending..." : "Send OTP"}
              </button>
            ) : (
              <button type="button" className="admin-btn-modal primary" onClick={handleVerifyOtp} disabled={submitting}>
                <i className="bi bi-check-circle"></i>{submitting ? "Verifying..." : "Confirm"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
