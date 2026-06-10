import { useState, useEffect, useRef, useCallback } from 'react';
import videoCallService from '../services/videoCallService';
import { useAuth } from '../context/AuthContext';

/**
 * Hook quản lý toàn bộ luồng WebRTC cho video call.
 * 
 * Luồng:
 *  Caller: startLocalStream() → isCallAccepted=true → createOffer() → handleReceiveAnswer()
 *  Callee: startLocalStream() → handleReceiveOffer() → handleReceiveAnswer implicit via ANSWER
 */
export const useWebRTC = (roomId, targetUserId) => {
    const { currentUserId } = useAuth();
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    // connecting | ringing | connected | disconnected
    const [callStatus, setCallStatus] = useState('connecting');
    const [isCallAccepted, setIsCallAccepted] = useState(false);

    const peerConnection = useRef(null);
    const localStreamRef = useRef(null);
    const pendingCandidates = useRef([]);
    // Lưu refs cho các giá trị mới nhất để tránh stale closure trong callback
    const targetUserIdRef = useRef(targetUserId);
    const currentUserIdRef = useRef(currentUserId);

    useEffect(() => { targetUserIdRef.current = targetUserId; }, [targetUserId]);
    useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

    // ICE Servers: STUN (Google) + TURN (openrelay miễn phí làm fallback)
    const getIceConfiguration = () => ({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ],
        iceCandidatePoolSize: 10
    });

    /**
     * Tạo RTCPeerConnection mới. Chỉ tạo 1 lần — nếu đã tồn tại thì trả về cái cũ.
     * Dùng ref thay vì state để tránh re-render không cần thiết.
     */
    const initializePeerConnection = useCallback(() => {
        if (peerConnection.current) return peerConnection.current;

        const pc = new RTCPeerConnection(getIceConfiguration());

        // Nhận track từ đối phương → cập nhật remoteStream
        pc.ontrack = (event) => {
            console.log('[WebRTC] Received remote track:', event.track.kind, event.streams);
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
                setCallStatus('connected');
            }
        };

        // Gửi ICE candidate đến đối phương
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('[WebRTC] Sending ICE candidate to', targetUserIdRef.current);
                videoCallService.sendWebRTCSignal({
                    type: 'CANDIDATE',
                    senderId: currentUserIdRef.current,
                    receiverId: targetUserIdRef.current,
                    data: JSON.stringify(event.candidate)
                });
            }
        };

        // Theo dõi trạng thái ICE gathering để debug
        pc.onicegatheringstatechange = () => {
            console.log('[WebRTC] ICE Gathering State:', pc.iceGatheringState);
        };

        // Theo dõi trạng thái kết nối
        pc.oniceconnectionstatechange = () => {
            console.log('[WebRTC] ICE Connection State:', pc.iceConnectionState);
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                setCallStatus('connected');
            } else if (pc.iceConnectionState === 'disconnected') {
                setCallStatus('disconnected');
            } else if (pc.iceConnectionState === 'failed') {
                console.warn('[WebRTC] ICE failed, attempting restart...');
                setCallStatus('disconnected');
                // Thử ICE restart nếu là caller
                try { pc.restartIce(); } catch (e) { console.error('[WebRTC] ICE restart failed:', e); }
            }
        };

        pc.onconnectionstatechange = () => {
            console.log('[WebRTC] Connection State:', pc.connectionState);
            if (pc.connectionState === 'connected') {
                setCallStatus('connected');
            } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                setCallStatus('disconnected');
            }
        };

        peerConnection.current = pc;
        return pc;
    }, []); // Không có dependency để tránh re-create PC

    /**
     * Mở camera & mic, thêm tracks vào PeerConnection.
     * Gọi TRƯỚC createOffer/createAnswer.
     */
    const startLocalStream = useCallback(async () => {
        try {
            let stream = null;
            try {
                // Thử lấy cả video lẫn audio
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            } catch (err) {
                console.warn('[WebRTC] Video+Audio failed, trying audio only:', err);
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                } catch (err2) {
                    console.warn('[WebRTC] Audio also failed, no local media:', err2);
                    stream = null;
                }
            }

            const pc = initializePeerConnection();

            if (stream) {
                localStreamRef.current = stream;
                setLocalStream(stream);

                // Thêm từng track vào PC
                stream.getTracks().forEach((track) => {
                    console.log('[WebRTC] Adding local track:', track.kind, 'readyState:', track.readyState);
                    pc.addTrack(track, stream);

                    // Issue #7: Lắng nghe khi track unmute (camera active) để re-trigger UI
                    track.onunmute = () => {
                        console.log('[WebRTC] Track unmuted:', track.kind);
                        // Force re-render bằng cách set stream mới (same object, different ref)
                        setLocalStream((prev) => prev);
                    };

                    track.onended = () => {
                        console.warn('[WebRTC] Track ended unexpectedly:', track.kind);
                    };
                });
            } else {
                // Không có media cục bộ, chỉ nhận từ đối phương
                pc.addTransceiver('video', { direction: 'recvonly' });
                pc.addTransceiver('audio', { direction: 'recvonly' });
            }

            return stream;
        } catch (error) {
            console.error('[WebRTC] Critical error in startLocalStream:', error);
            setCallStatus('disconnected');
            throw error;
        }
    }, [initializePeerConnection]);

    /**
     * Tạo Offer và gửi đến đối phương (Caller side).
     */
    const createOffer = useCallback(async () => {
        const pc = initializePeerConnection();
        try {
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await pc.setLocalDescription(offer);

            console.log('[WebRTC] Sending OFFER to', targetUserIdRef.current);
            videoCallService.sendWebRTCSignal({
                type: 'OFFER',
                senderId: currentUserIdRef.current,
                receiverId: targetUserIdRef.current,
                data: JSON.stringify(offer)
            });
        } catch (error) {
            console.error('[WebRTC] Error creating offer:', error);
        }
    }, [initializePeerConnection]);

    /**
     * Xử lý Offer nhận được → tạo Answer (Callee side).
     */
    const handleReceiveOffer = useCallback(async (offerStr) => {
        const pc = initializePeerConnection();
        try {
            const offer = JSON.parse(offerStr);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            console.log('[WebRTC] Remote description (offer) set.');

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            console.log('[WebRTC] Sending ANSWER to', targetUserIdRef.current);
            videoCallService.sendWebRTCSignal({
                type: 'ANSWER',
                senderId: currentUserIdRef.current,
                receiverId: targetUserIdRef.current,
                data: JSON.stringify(answer)
            });

            // Xử lý các ICE candidates đang chờ
            while (pendingCandidates.current.length > 0) {
                const candidate = pendingCandidates.current.shift();
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('[WebRTC] Applied pending ICE candidate.');
            }
        } catch (error) {
            console.error('[WebRTC] Error handling offer:', error);
        }
    }, [initializePeerConnection]);

    /**
     * Xử lý Answer nhận được (Caller side).
     */
    const handleReceiveAnswer = useCallback(async (answerStr) => {
        const pc = initializePeerConnection();
        try {
            // Chỉ set nếu chưa có remote description
            if (pc.remoteDescription) {
                console.warn('[WebRTC] Remote description already set, skipping answer.');
                return;
            }
            const answer = JSON.parse(answerStr);
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('[WebRTC] Remote description (answer) set successfully.');
        } catch (error) {
            console.error('[WebRTC] Error handling answer:', error);
        }
    }, [initializePeerConnection]);

    /**
     * Xử lý ICE Candidate nhận được từ đối phương.
     */
    const handleReceiveIceCandidate = useCallback(async (candidateStr) => {
        const pc = initializePeerConnection();
        try {
            const candidate = JSON.parse(candidateStr);
            if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
                // Buffer lại để xử lý sau khi setRemoteDescription
                pendingCandidates.current.push(candidate);
            }
        } catch (error) {
            console.error('[WebRTC] Error adding ICE candidate:', error);
        }
    }, [initializePeerConnection]);

    /**
     * Toggle mic on/off.
     */
    const toggleMic = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicMuted(!audioTrack.enabled);
            }
        }
    }, []);

    /**
     * Toggle camera on/off.
     */
    const toggleCamera = useCallback(() => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOff(!videoTrack.enabled);
            }
        }
    }, []);

    /**
     * Kết thúc cuộc gọi: dừng tracks, đóng PC, tùy chọn gửi HANGUP.
     * 
     * @param {boolean} sendHangup - true để gửi tín hiệu HANGUP đến đối phương
     * @returns {Promise<void>}
     */
    const endCall = useCallback((sendHangup = true) => {
        // Dừng local media tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }

        // Đóng PeerConnection
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }

        setLocalStream(null);
        setRemoteStream(null);
        setCallStatus('disconnected');

        // Issue #3: Gửi HANGUP trước khi đóng tab để STOMP kịp flush
        if (sendHangup && targetUserIdRef.current && currentUserIdRef.current) {
            console.log('[WebRTC] Sending HANGUP to', targetUserIdRef.current);
            videoCallService.sendWebRTCSignal({
                type: 'HANGUP',
                senderId: currentUserIdRef.current,
                receiverId: targetUserIdRef.current,
                data: roomId
            });
        }
    }, [roomId]);

    // =========================================================================
    // STOMP Listener: lắng nghe tín hiệu WebRTC realtime từ backend
    // =========================================================================
    useEffect(() => {
        const unsubscribe = videoCallService.subscribeToWebRTC((signal) => {
            const { type, senderId, data } = signal;

            // Chỉ xử lý tín hiệu từ đúng targetUserId
            if (senderId !== targetUserId) return;

            console.log('[WebRTC] Received signal:', type, 'from', senderId);

            switch (type) {
                case 'OFFER':
                    handleReceiveOffer(data);
                    break;
                case 'ANSWER':
                    handleReceiveAnswer(data);
                    break;
                case 'CANDIDATE':
                    handleReceiveIceCandidate(data);
                    break;
                case 'CALL_ACCEPTED':
                    console.log('[WebRTC] Call accepted by remote user');
                    setIsCallAccepted(true);
                    setCallStatus('connected');
                    break;
                case 'CALL_DECLINED':
                    console.log('[WebRTC] Call declined by remote user');
                    setCallStatus('disconnected');
                    // Issue #6: Không dùng alert, tự đóng tab
                    endCall(false);
                    setTimeout(() => {
                        window.close();
                        setTimeout(() => window.location.href = '/', 500);
                    }, 100);
                    break;
                case 'HANGUP':
                    console.log('[WebRTC] Remote user hung up.');
                    // Issue #6: Xóa alert, chỉ endCall và đóng tab
                    endCall(false);
                    setTimeout(() => {
                        window.close();
                        setTimeout(() => window.location.href = '/', 500);
                    }, 100);
                    break;
                default:
                    break;
            }
        });

        return () => {
            unsubscribe();
        };
    }, [targetUserId, handleReceiveOffer, handleReceiveAnswer, handleReceiveIceCandidate, endCall]);

    // =========================================================================
    // localStorage Listener: fallback cho race condition cross-tab
    // =========================================================================
    useEffect(() => {
        /**
         * Xử lý signal nhận từ localStorage (cross-tab communication).
         * @param {Object|null} signalObj
         */
        const handleStorageSignal = (signalObj) => {
            if (!signalObj) return;
            const { type, senderId, roomId: signalRoomId, timestamp } = signalObj;
            if (senderId !== targetUserId) return;
            if (signalRoomId && signalRoomId !== roomId) return;
            // Chỉ xử lý signal trong vòng 15 giây qua
            if (Date.now() - timestamp > 15000) return;

            console.log('[WebRTC] localStorage signal:', type);

            if (type === 'CALL_ACCEPTED') {
                setIsCallAccepted(true);
                setCallStatus('connected');
            } else if (type === 'CALL_DECLINED') {
                setCallStatus('disconnected');
                endCall(false);
                setTimeout(() => {
                    window.close();
                    setTimeout(() => window.location.href = '/', 500);
                }, 100);
            } else if (type === 'HANGUP') {
                // Issue #6: Không alert, tự đóng
                setCallStatus('disconnected');
                endCall(false);
                setTimeout(() => {
                    window.close();
                    setTimeout(() => window.location.href = '/', 500);
                }, 100);
            }
        };

        // Kiểm tra ngay lúc mount (signal có thể đã được set trước khi tab này load)
        try {
            const initialSignal = JSON.parse(localStorage.getItem('webrtc_signal'));
            handleStorageSignal(initialSignal);
        } catch (e) { /* ignore */ }

        const handleStorageChange = (e) => {
            if (e.key === 'webrtc_signal' && e.newValue) {
                try {
                    handleStorageSignal(JSON.parse(e.newValue));
                } catch (err) { /* ignore */ }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [targetUserId, roomId, endCall]);

    return {
        localStream,
        remoteStream,
        isMicMuted,
        isCameraOff,
        callStatus,
        isCallAccepted,
        setIsCallAccepted,
        startLocalStream,
        createOffer,
        toggleMic,
        toggleCamera,
        endCall
    };
};
