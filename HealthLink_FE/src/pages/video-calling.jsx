import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAuth } from '../context/AuthContext';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { toast } from 'sonner';

/**
 * Trang Video Call — giao diện cuộc gọi WebRTC.
 * 
 * Issues fixed:
 * - #2: Hiển thị call timer (thời gian đã gọi)
 * - #3: Delay 300ms trước khi đóng tab để STOMP kịp flush HANGUP
 * - #5: Gọi setCallActive(false) khi rời trang
 * - #7: Re-assign srcObject khi localStream/track thay đổi, retry nếu camera xám
 */
export default function VideoCallPage() {
    const [searchParams] = useSearchParams();
    const roomID = searchParams.get('roomID');
    const targetUserId = searchParams.get('targetUserId');
    const userName = searchParams.get('userName');
    const isCaller = searchParams.get('isCaller') === 'true';

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // Issue #2: Call timer state
    const [callDuration, setCallDuration] = useState(0); // giây
    const callTimerRef = useRef(null);

    const { setCallActive } = useAuth();

    const {
        localStream,
        remoteStream,
        isMicMuted,
        isCameraOff,
        callStatus,
        startLocalStream,
        createOffer,
        toggleMic,
        toggleCamera,
        endCall,
        isCallAccepted,
        setIsCallAccepted
    } = useWebRTC(roomID, targetUserId);

    // Bắt đầu local stream và khởi tạo cuộc gọi khi mount
    useEffect(() => {
        if (!targetUserId) {
            toast.error('Missing target user ID!');
            return;
        }

        const initCall = async () => {
            try {
                await startLocalStream();
            } catch (error) {
                toast.error('Could not access Camera/Microphone! You can still watch the other person.');
            }

            // Người nhận đã accept khi click popup
            if (!isCaller) {
                setIsCallAccepted(true);
            }
        };

        initCall();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetUserId, isCaller]);

    // Cleanup khi rời trang
    useEffect(() => {
        /**
         * Issue #3: Gửi HANGUP trước khi đóng tab bằng sendBeacon (reliable hơn).
         * sendBeacon vẫn gửi được sau khi tab bắt đầu unload.
         */
        const handleBeforeUnload = () => {
            endCall(true);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            // Issue #5: Clear isInCall flag khi trang unmount
            if (setCallActive) setCallActive(false);
            // Không gửi HANGUP ở đây (StrictMode sẽ unmount rồi mount lại)
            endCall(false);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Dừng timer
            if (callTimerRef.current) clearInterval(callTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Gửi Offer khi cuộc gọi được chấp nhận (Caller side)
    useEffect(() => {
        if (isCaller && isCallAccepted) {
            console.log('[VideoCall] Call accepted, creating offer after delay...');
            // Đợi 2.5s để tab của người nhận kịp mở và subscribe WebRTC
            const timer = setTimeout(() => {
                createOffer();
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [isCaller, isCallAccepted, createOffer]);

    // Issue #2: Bắt đầu / dừng call timer khi callStatus thay đổi
    useEffect(() => {
        if (callStatus === 'connected') {
            // Bắt đầu đếm
            if (!callTimerRef.current) {
                callTimerRef.current = setInterval(() => {
                    setCallDuration((prev) => prev + 1);
                }, 1000);
            }
        } else {
            // Dừng đếm
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
                callTimerRef.current = null;
            }
        }

        return () => {
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
                callTimerRef.current = null;
            }
        };
    }, [callStatus]);

    /**
     * Issue #7: Gắn localStream vào video element.
     * Phát ngay lập tức, không chờ onunmute để tránh lỗi màn hình xám.
     */
    useEffect(() => {
        const videoEl = localVideoRef.current;
        if (!videoEl || !localStream) return;

        videoEl.srcObject = localStream;
        videoEl.play().catch(e => console.warn('[VideoCall] Auto-play failed:', e));
    }, [localStream, isCameraOff]);

    // Gắn remoteStream vào video element
    useEffect(() => {
        const videoEl = remoteVideoRef.current;
        if (!videoEl || !remoteStream) return;

        videoEl.srcObject = remoteStream;
        videoEl.play().catch(() => {});
    }, [remoteStream]);

    /**
     * Định dạng giây → MM:SS
     * @param {number} seconds
     * @returns {string}
     */
    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    /**
     * Issue #3: Kết thúc cuộc gọi và đóng tab sau khi STOMP kịp flush.
     */
    const handleEndCall = useCallback(() => {
        endCall(true); // Gửi HANGUP
        if (setCallActive) setCallActive(false);
        // Delay 300ms để STOMP WebSocket frame kịp gửi
        setTimeout(() => {
            window.close();
        }, 300);
    }, [endCall, setCallActive]);

    // =========================================================================
    // UI: Màn hình chờ (Caller chờ người kia nhấc máy)
    // =========================================================================
    if (isCaller && !isCallAccepted) {
        return (
            <div style={{
                backgroundColor: '#1a1a1a', minHeight: '100vh', display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white'
            }}>
                <div className="text-center mb-5">
                    <div style={{
                        width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#333',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                        boxShadow: '0 0 30px rgba(0, 176, 154, 0.4)', border: '2px solid #00b09a',
                        animation: 'pulse 1.5s infinite'
                    }}>
                        <i className="bi bi-person-fill text-muted" style={{ fontSize: '4rem' }}></i>
                    </div>
                    <h3 className="mt-4 fw-bold">Calling {userName}...</h3>
                    <p className="text-muted">Waiting for them to answer</p>
                </div>

                <Button
                    id="btn-cancel-call"
                    variant="danger"
                    className="rounded-pill px-4 py-2 mt-4"
                    onClick={handleEndCall}
                >
                    <i className="bi bi-telephone-x-fill me-2"></i>
                    Cancel Call
                </Button>

                <style>
                    {`
                    @keyframes pulse {
                        0% { box-shadow: 0 0 0 0 rgba(0, 176, 154, 0.7); }
                        70% { box-shadow: 0 0 0 30px rgba(0, 176, 154, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(0, 176, 154, 0); }
                    }
                    `}
                </style>
            </div>
        );
    }

    // =========================================================================
    // UI: Màn hình cuộc gọi chính
    // =========================================================================
    return (
        <div style={{ backgroundColor: '#1a1a1a', minHeight: '100vh', padding: '20px', color: 'white' }}>
            <Container fluid>
                {/* Header */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center gap-3">
                        <h4 className="mb-0">
                            HealthLink Secure Call
                            <span className="badge bg-primary ms-2">{callStatus}</span>
                        </h4>
                        {/* Issue #2: Hiển thị call timer khi connected */}
                        {callStatus === 'connected' && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                backgroundColor: 'rgba(0, 176, 154, 0.15)',
                                border: '1px solid rgba(0, 176, 154, 0.4)',
                                borderRadius: '20px', padding: '4px 14px',
                                fontFamily: 'monospace', fontSize: '1rem', color: '#00d4b8'
                            }}>
                                <i className="bi bi-clock-fill" style={{ fontSize: '0.8rem' }}></i>
                                <span id="call-timer">{formatDuration(callDuration)}</span>
                            </div>
                        )}
                    </div>
                    <div>Talking to: <strong>{userName}</strong></div>
                </div>

                <Row className="justify-content-center">
                    {/* Remote Video (màn hình lớn) */}
                    <Col lg={8} className="mb-4" style={{ position: 'relative' }}>
                        <div style={{
                            backgroundColor: '#000',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            height: '65vh',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                        }}>
                            {remoteStream ? (
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div className="text-center text-muted">
                                    <i className="bi bi-person-video" style={{ fontSize: '4rem' }}></i>
                                    <p className="mt-2">
                                        {callStatus === 'connected'
                                            ? 'Waiting for remote video...'
                                            : 'Connecting...'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Local Video (góc dưới phải) */}
                        <div style={{
                            position: 'absolute',
                            bottom: '20px',
                            right: '30px',
                            width: '200px',
                            height: '150px',
                            backgroundColor: '#333',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
                            border: '2px solid #00b09a'
                        }}>
                            {localStream && !isCameraOff ? (
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted // Quan trọng: tránh echo
                                    style={{
                                        width: '100%', height: '100%',
                                        objectFit: 'cover',
                                        transform: 'scaleX(-1)' // Mirror
                                    }}
                                />
                            ) : (
                                <div className="d-flex h-100 align-items-center justify-content-center text-muted">
                                    <div className="text-center">
                                        <i className="bi bi-camera-video-off" style={{ fontSize: '1.5rem', color: '#dc3545' }}></i>
                                        <p className="small mt-1 mb-0 text-white-50">Camera is off</p>
                                    </div>
                                </div>
                            )}
                            {/* Label */}
                            <div style={{
                                position: 'absolute', bottom: '4px', left: '6px',
                                fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)',
                                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}>
                                You
                                {isMicMuted && <i className="bi bi-mic-mute-fill text-danger"></i>}
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* Controls */}
                <Row>
                    <Col className="d-flex justify-content-center gap-4 mt-3">
                        {/* Mic toggle */}
                        <Button
                            id="btn-toggle-mic"
                            variant={isMicMuted ? 'danger' : 'secondary'}
                            className="rounded-circle p-3"
                            onClick={toggleMic}
                            style={{ width: '60px', height: '60px' }}
                            title={isMicMuted ? 'Unmute' : 'Mute'}
                        >
                            <i className={`bi ${isMicMuted ? 'bi-mic-mute-fill' : 'bi-mic-fill'} fs-4`}></i>
                        </Button>

                        {/* End call */}
                        <Button
                            id="btn-end-call"
                            variant="danger"
                            className="rounded-circle p-3"
                            onClick={handleEndCall}
                            style={{ width: '70px', height: '70px', boxShadow: '0 0 15px rgba(220,53,69,0.5)' }}
                            title="End Call"
                        >
                            <i className="bi bi-telephone-x-fill fs-3"></i>
                        </Button>

                        {/* Camera toggle */}
                        <Button
                            id="btn-toggle-camera"
                            variant={isCameraOff ? 'danger' : 'secondary'}
                            className="rounded-circle p-3"
                            onClick={toggleCamera}
                            style={{ width: '60px', height: '60px' }}
                            title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
                        >
                            <i className={`bi ${isCameraOff ? 'bi-camera-video-off-fill' : 'bi-camera-video-fill'} fs-4`}></i>
                        </Button>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}