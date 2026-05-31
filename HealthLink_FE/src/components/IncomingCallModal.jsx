import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext'; // Import hook của bạn
import { audioService } from '../utils/audioService';

// Thêm CSS (hoặc dùng file CSS riêng) để nó nổi lên
const modalStyles = {
    position: 'fixed',
    top: '30px',
    right: '30px',
    padding: '24px',
    background: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    zIndex: 9999, // Đảm bảo nó nổi lên trên
    boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
    backdropFilter: 'blur(10px)',
    width: '320px',
    animation: 'slideIn 0.3s ease-out'
};

export default function IncomingCallModal() {
    // 1. Lắng nghe 'incomingCall' từ AuthContext
    const { incomingCall, acceptCall, declineCall, roles } = useAuth();

    // 2. Phát nhạc chuông khi có cuộc gọi đến
    useEffect(() => {
        if (incomingCall) {
            // Phát nhạc chuông
            audioService.playRingtone();
        } else {
            // Dừng nhạc chuông khi không còn cuộc gọi
            audioService.stopRingtone();
        }

        // Cleanup: Dừng nhạc khi component unmount
        return () => {
            audioService.stopRingtone();
        };
    }, [incomingCall]);

    // 3. Nếu không có ai gọi, component này "vô hình" (trả về null)
    if (!incomingCall) {
        return null;
    }

    // Hàm wrapper để dừng nhạc khi accept
    const handleAccept = () => {
        audioService.playAcceptSound(); // Phát âm thanh accept
        audioService.stopRingtone();     // Dừng nhạc chuông
        acceptCall();
    };

    // Hàm wrapper để dừng nhạc khi decline
    const handleDecline = () => {
        audioService.stopRingtone();
        declineCall();
    };

    // === XÁC ĐỊNH XEM NGƯỜI GỌI CÓ PHẢI BÁC SĨ / NHÀ THUỐC KHÔNG ===
    const isPatient = roles && roles.some(r => String(r).trim().toLowerCase() === 'patient');
    const callerIsDoctor = incomingCall.callerType === 'doctor' || isPatient;
    const callerIsPharmacy = incomingCall.callerType === 'pharmacy';
    const callerPrefix = callerIsDoctor ? 'Dr. ' : callerIsPharmacy ? 'Pharmacy: ' : '';

    // 3. Nếu CÓ cuộc gọi, hiển thị Modal
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
                    fontSize: '20px', marginRight: '15px'
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
                    onClick={handleAccept}
                    style={{ 
                        flex: 1, backgroundColor: '#00b09a', color: 'white', border: 'none', 
                        padding: '12px', borderRadius: '50px', fontWeight: '600',
                        animation: 'pulse 2s infinite',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.target.style.filter = 'brightness(0.9)'}
                    onMouseOut={(e) => e.target.style.filter = 'none'}
                >
                    <i className="bi bi-telephone-inbound-fill me-2"></i> Accept
                </button>
                <button
                    onClick={handleDecline}
                    style={{ 
                        flex: 1, backgroundColor: '#dc3545', color: 'white', border: 'none', 
                        padding: '12px', borderRadius: '50px', fontWeight: '600',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.target.style.filter = 'brightness(0.9)'}
                    onMouseOut={(e) => e.target.style.filter = 'none'}
                >
                    <i className="bi bi-telephone-x-fill me-2"></i> Decline
                </button>
            </div>
        </div>
    );
}