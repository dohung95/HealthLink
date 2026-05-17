import { useState, useEffect, useRef, useCallback } from 'react';
import videoCallService from '../services/videoCallService';
import { useAuth } from '../context/AuthContext';

export const useWebRTC = (roomId, targetUserId) => {
    const { currentUserId } = useAuth();
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [callStatus, setCallStatus] = useState('connecting'); // connecting, ringing, connected, disconnected
    const [isCallAccepted, setIsCallAccepted] = useState(false);

    const peerConnection = useRef(null);
    const localStreamRef = useRef(null);
    const pendingCandidates = useRef([]);

    // ICE Servers (Google's public STUN servers)
    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    // 1. Khởi tạo PeerConnection
    const initializePeerConnection = useCallback(() => {
        if (peerConnection.current) return peerConnection.current;

        const pc = new RTCPeerConnection(configuration);

        // Lắng nghe luồng media từ đối phương
        pc.ontrack = (event) => {
            console.log("Received remote track:", event.streams[0]);
            setRemoteStream(event.streams[0]);
            setCallStatus('connected');
        };

        // Gửi ICE Candidate cho đối phương qua STOMP
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("Sending ICE candidate to", targetUserId);
                videoCallService.sendWebRTCSignal({
                    type: "CANDIDATE",
                    senderId: currentUserId,
                    receiverId: targetUserId,
                    data: JSON.stringify(event.candidate)
                });
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log("ICE Connection State:", pc.iceConnectionState);
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                setCallStatus('disconnected');
            }
        };

        peerConnection.current = pc;
        return pc;
    }, [targetUserId, currentUserId]);

    // 2. Mở Camera và Mic
    const startLocalStream = useCallback(async () => {
        try {
            let stream;
            try {
                // Thử lấy cả hình lẫn tiếng
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            } catch (err) {
                console.warn("Could not get video + audio, trying audio only...", err);
                try {
                    // Fallback 1: Chỉ lấy tiếng
                    stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                } catch (err2) {
                    console.warn("Could not get audio either, proceeding without local media.", err2);
                    // Fallback 2: Không lấy gì cả
                    stream = null;
                }
            }

            if (stream) {
                setLocalStream(stream);
                localStreamRef.current = stream;
            }

            const pc = initializePeerConnection();
            if (stream) {
                stream.getTracks().forEach((track) => {
                    pc.addTrack(track, stream);
                });
            } else {
                // Thêm transceiver để có thể nhận video/audio dù không gửi
                pc.addTransceiver('video', { direction: 'recvonly' });
                pc.addTransceiver('audio', { direction: 'recvonly' });
            }

            return stream;
        } catch (error) {
            console.error("Critical error in startLocalStream:", error);
            setCallStatus('disconnected');
            throw error;
        }
    }, [initializePeerConnection]);

    // 3. Tạo Lời mời (Offer)
    const createOffer = useCallback(async () => {
        const pc = initializePeerConnection();
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            console.log("Sending Offer to", targetUserId);
            videoCallService.sendWebRTCSignal({
                type: "OFFER",
                senderId: currentUserId,
                receiverId: targetUserId,
                data: JSON.stringify(offer)
            });
        } catch (error) {
            console.error("Error creating offer:", error);
        }
    }, [initializePeerConnection, targetUserId, currentUserId]);

    // 4. Xử lý Lời mời và Trả lời (Answer)
    const handleReceiveOffer = useCallback(async (offerStr) => {
        const pc = initializePeerConnection();
        try {
            const offer = JSON.parse(offerStr);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            console.log("Sending Answer to", targetUserId);
            videoCallService.sendWebRTCSignal({
                type: "ANSWER",
                senderId: currentUserId,
                receiverId: targetUserId,
                data: JSON.stringify(answer)
            });

            // Process any pending ICE candidates
            while (pendingCandidates.current.length > 0) {
                const candidate = pendingCandidates.current.shift();
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (error) {
            console.error("Error handling offer:", error);
        }
    }, [initializePeerConnection, targetUserId, currentUserId]);

    const handleReceiveAnswer = useCallback(async (answerStr) => {
        const pc = initializePeerConnection();
        try {
            const answer = JSON.parse(answerStr);
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            console.log("Remote description set from answer.");
        } catch (error) {
            console.error("Error handling answer:", error);
        }
    }, [initializePeerConnection]);

    const handleReceiveIceCandidate = useCallback(async (candidateStr) => {
        const pc = initializePeerConnection();
        try {
            const candidate = JSON.parse(candidateStr);
            if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
                // Keep candidate until remote description is set
                pendingCandidates.current.push(candidate);
            }
        } catch (error) {
            console.error("Error adding ice candidate:", error);
        }
    }, [initializePeerConnection]);

    // 5. Điều khiển UI
    const toggleMic = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleCamera = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOff(!videoTrack.enabled);
            }
        }
    };

    // 5. Kết thúc cuộc gọi
    const endCall = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        setLocalStream(null);
        setRemoteStream(null);
        setCallStatus('disconnected');

        // Thông báo cho đối phương
        if (targetUserId && currentUserId) {
            videoCallService.sendWebRTCSignal({
                type: "HANGUP",
                senderId: currentUserId,
                receiverId: targetUserId,
                data: roomId
            });
        }
    }, [targetUserId, currentUserId]);

    // 6. STOMP Listeners
    useEffect(() => {
        const unsubscribe = videoCallService.subscribeToWebRTC((signal) => {
            const { type, senderId, data } = signal;

            // Đảm bảo chỉ xử lý tín hiệu từ targetUserId
            if (senderId !== targetUserId) return;

            switch (type) {
                case "OFFER":
                    handleReceiveOffer(data);
                    break;
                case "ANSWER":
                    handleReceiveAnswer(data);
                    break;
                case "CANDIDATE":
                    handleReceiveIceCandidate(data);
                    break;
                case "CALL_ACCEPTED":
                    console.log("Call accepted by remote user");
                    setIsCallAccepted(true);
                    setCallStatus('connected');
                    break;
                case "CALL_DECLINED":
                    console.log("Call declined by remote user");
                    setCallStatus('disconnected');
                    alert("The other person declined the call.");
                    window.close();
                    break;
                case "HANGUP":
                    console.log("Remote user hung up.");
                    endCall();
                    alert("The call has ended.");
                    window.close();
                    break;
                default:
                    break;
            }
        });

        return () => {
            unsubscribe();
        };
    }, [targetUserId, handleReceiveOffer, handleReceiveAnswer, handleReceiveIceCandidate, endCall]);

    // 7. Lắng nghe signal từ localStorage (trường hợp race condition khi tab chưa load xong)
    useEffect(() => {
        const handleSignal = (signalObj) => {
            if (!signalObj) return;
            const { type, senderId, roomId: signalRoomId, timestamp } = signalObj;
            if (senderId !== targetUserId) return;
            if (signalRoomId && signalRoomId !== roomId) return; // Đảm bảo đúng phòng
            
            // Chỉ xử lý các signal mới trong vòng 15 giây qua
            if (Date.now() - timestamp > 15000) return;

            if (type === 'CALL_ACCEPTED') {
                console.log("Call accepted via localStorage");
                setIsCallAccepted(true);
                setCallStatus('connected');
            } else if (type === 'CALL_DECLINED') {
                console.log("Call declined via localStorage");
                setCallStatus('disconnected');
                alert("The other person declined the call.");
                endCall();
                window.close();
            } else if (type === 'HANGUP') {
                console.log("Hangup via localStorage");
                setCallStatus('disconnected');
                alert("The call has ended.");
                endCall();
                window.close();
            }
        };

        // Kiểm tra ngay lúc mount (nếu tab mở sau khi tín hiệu đã bắn)
        try {
            const initialSignal = JSON.parse(localStorage.getItem('webrtc_signal'));
            handleSignal(initialSignal);
        } catch(e) {}

        // Lắng nghe sự thay đổi
        const handleStorageChange = (e) => {
            if (e.key === 'webrtc_signal' && e.newValue) {
                try {
                    const signalObj = JSON.parse(e.newValue);
                    handleSignal(signalObj);
                } catch(err) {}
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [targetUserId, endCall]);

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
