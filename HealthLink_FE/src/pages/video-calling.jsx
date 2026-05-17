import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { toast } from 'sonner';

export default function VideoCallPage() {
    const [searchParams] = useSearchParams();
    const roomID = searchParams.get('roomID');
    const targetUserId = searchParams.get('targetUserId');
    const userName = searchParams.get('userName');
    const isCaller = searchParams.get('isCaller') === 'true';

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

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

    // Bắt đầu local stream khi mở trang
    useEffect(() => {
        if (!targetUserId) {
            toast.error("Missing target user ID!");
            return;
        }

        const initCall = async () => {
            try {
                // Thử kết nối camera và mic
                await startLocalStream();
            } catch (error) {
                // Báo lỗi nhưng vẫn có thể cho phép kết nối để nhận luồng từ đối phương
                toast.error("Could not access Camera/Microphone! You can still watch the other person.");
            }

            // Người nhận mặc định đã "Accept" khi click popup nên ta set thẳng isCallAccepted = true
            if (!isCaller) {
                setIsCallAccepted(true);
            }
        };

        initCall();

        // Không cleanup endCall ở đây để tránh infinite loop khi endCall thay đổi reference
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetUserId, isCaller]);

    // Xử lý cleanup khi unmount trang
    useEffect(() => {
        return () => {
            endCall();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Gửi Offer KHI CUỘC GỌI ĐƯỢC CHẤP NHẬN
    useEffect(() => {
        if (isCaller && isCallAccepted) {
            console.log("Call accepted, creating offer...");
            // Đợi 2.5s để tab của người nhận kịp mở và subscribe WebRTC
            setTimeout(() => {
                createOffer();
            }, 2500);
        }
    }, [isCaller, isCallAccepted, createOffer]);

    // Gắn stream vào thẻ video
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // UI Render
    if (isCaller && !isCallAccepted) {
        return (
            <div style={{ backgroundColor: '#1a1a1a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <div className="text-center mb-5">
                    <div style={{
                        width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#333', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                        boxShadow: '0 0 30px rgba(0, 176, 154, 0.4)', border: '2px solid #00b09a', animation: 'pulse 1.5s infinite'
                    }}>
                        <i className="bi bi-person-fill text-muted" style={{ fontSize: '4rem' }}></i>
                    </div>
                    <h3 className="mt-4 fw-bold">Calling {userName}...</h3>
                    <p className="text-muted">Waiting for them to answer</p>
                </div>

                <Button 
                    variant="danger" 
                    className="rounded-pill px-4 py-2 mt-4"
                    onClick={() => {
                        endCall();
                        window.close();
                    }}
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

    return (
        <div style={{ backgroundColor: '#1a1a1a', minHeight: '100vh', padding: '20px', color: 'white' }}>
            <Container fluid>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4>HealthLink Secure Call <span className="badge bg-primary ms-2">{callStatus}</span></h4>
                    <div>Talking to: <strong>{userName}</strong></div>
                </div>

                <Row className="justify-content-center">
                    {/* Remote Video (Màn hình lớn) */}
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
                                    <p className="mt-2">Waiting for remote video...</p>
                                </div>
                            )}
                        </div>

                        {/* Local Video (Góc dưới) */}
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
                            {localStream ? (
                                <video 
                                    ref={localVideoRef} 
                                    autoPlay 
                                    playsInline 
                                    muted // Quan trọng: Muted để không bị vọng âm
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
                                />
                            ) : (
                                <div className="d-flex h-100 align-items-center justify-content-center text-muted">
                                    Local Camera
                                </div>
                            )}
                        </div>
                    </Col>
                </Row>

                {/* Controls */}
                <Row>
                    <Col className="d-flex justify-content-center gap-4 mt-3">
                        <Button 
                            variant={isMicMuted ? "danger" : "secondary"} 
                            className="rounded-circle p-3"
                            onClick={toggleMic}
                            style={{ width: '60px', height: '60px' }}
                        >
                            <i className={`bi ${isMicMuted ? 'bi-mic-mute-fill' : 'bi-mic-fill'} fs-4`}></i>
                        </Button>
                        
                        <Button 
                            variant="danger" 
                            className="rounded-circle p-3"
                            onClick={() => {
                                endCall();
                                window.close(); // Đóng tab
                            }}
                            style={{ width: '70px', height: '70px', boxShadow: '0 0 15px rgba(220,53,69,0.5)' }}
                        >
                            <i className="bi bi-telephone-x-fill fs-3"></i>
                        </Button>

                        <Button 
                            variant={isCameraOff ? "danger" : "secondary"} 
                            className="rounded-circle p-3"
                            onClick={toggleCamera}
                            style={{ width: '60px', height: '60px' }}
                        >
                            <i className={`bi ${isCameraOff ? 'bi-camera-video-off-fill' : 'bi-camera-video-fill'} fs-4`}></i>
                        </Button>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}