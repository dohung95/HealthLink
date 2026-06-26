import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { audioService } from '../utils/audioService';

const modalStyles = {
    position: 'fixed',
    top: '30px',
    right: '30px',
    padding: '24px',
    background: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    zIndex: 9999,
    boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
    backdropFilter: 'blur(10px)',
    width: '320px',
    animation: 'slideIn 0.3s ease-out'
};

/**
 * Modal hiển thị khi có cuộc gọi đến.
 * - Phát chuông khi incomingCall xuất hiện.
 * - Dừng chuông khi accept/decline hoặc unmount.
 * - Issue #5: Ẩn modal khi đang trong cuộc gọi khác (isInCall).
 */
export default function IncomingCallModal() {
    const { incomingCall, acceptCall, declineCall, roles, isInCall } = useAuth();

    // Phát/dừng chuông theo trạng thái incomingCall
    useEffect(() => {
        if (incomingCall && !isInCall) {
            audioService.playRingtone();
        } else {
            // Issue #4: Dùng forceStopRingtone để đảm bảo dừng hoàn toàn
            audioService.forceStopRingtone();
        }

        return () => {
            audioService.forceStopRingtone();
        };
    }, [incomingCall, isInCall]);

    // Issue #5: Không hiển thị nếu đang trong cuộc gọi khác
    if (!incomingCall || isInCall) {
        return null;
    }

    /**
     * Xử lý Accept: dừng chuông → phát accept sound → gọi acceptCall().
     */
    const handleAccept = () => {
        audioService.forceStopRingtone(); // Issue #4: force stop trước
        audioService.playAcceptSound();
        acceptCall();
    };

    /**
     * Xử lý Decline: dừng chuông → gọi declineCall().
     */
    const handleDecline = () => {
        audioService.forceStopRingtone();
        declineCall();
    };

    // Xác định prefix tên người gọi
    const isPatient = roles && roles.some((r) => String(r).trim().toLowerCase() === 'patient');
    const callerIsDoctor = incomingCall.callerType === 'doctor' || isPatient;
    const callerIsPharmacy = incomingCall.callerType === 'pharmacy';
    const callerPrefix = callerIsDoctor ? 'Dr. ' : callerIsPharmacy ? 'Pharmacy: ' : '';

    return (
        <div style={modalStyles}>
            <style>
                {`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                `}
            </style>
            <div className="d-flex align-items-center mb-3">
                <div style={{
                    width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#00b09a',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', marginRight: '15px', animation: 'pulse 1s infinite'
                }}>
                    <i className="bi bi-person-fill"></i>
                </div>
                <div>
                    <h5 className="mb-0" style={{ fontWeight: '700', color: '#2c3e50' }}>Incoming Call...</h5>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.9rem' }}>
                        {callerPrefix}{incomingCall.callerName}
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '20px' }}>
                <button
                    id="btn-accept-call"
                    onClick={handleAccept}
                    style={{
                        flex: 1, backgroundColor: '#00b09a', color: 'white', border: 'none',
                        padding: '12px', borderRadius: '50px', fontWeight: '600',
                        animation: 'pulse 2s infinite', transition: 'all 0.2s ease', cursor: 'pointer'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(0.9)'}
                    onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                >
                    <i className="bi bi-telephone-inbound-fill me-2"></i> Accept
                </button>
                <button
                    id="btn-decline-call"
                    onClick={handleDecline}
                    style={{
                        flex: 1, backgroundColor: '#dc3545', color: 'white', border: 'none',
                        padding: '12px', borderRadius: '50px', fontWeight: '600',
                        transition: 'all 0.2s ease', cursor: 'pointer'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(0.9)'}
                    onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                >
                    <i className="bi bi-telephone-x-fill me-2"></i> Decline
                </button>
            </div>
        </div>
    );
}