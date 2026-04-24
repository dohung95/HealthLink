import React, { useEffect, useRef, useState } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
// KHÔNG import useAuth ở đây

// (Đặt hàm getUrlParams của bạn ở đây)
function getUrlParams(url = window.location.href) {
    const urlObj = new URL(url);
    return urlObj.searchParams;
}

// (Đặt myconfig của bạn ở đây)
const myconfig = {
    turnOnMicrophoneWhenJoining: true,
    turnOnCameraWhenJoining: true,
    showMyCameraToggleButton: true,
    showMyMicrophoneToggleButton: true,
    showAudioVideoSettingsButton: true,
    showScreenSharingButton: true, // (Bạn có thể đặt false nếu muốn)
    showTextChat: true,
    showUserList: false,
    showRoomDetailsButton: false,
    showPreJoinView: false,
    maxUsers: 2,
    layout: "Auto",
    showLayoutButton: false,
    scenario: {
        mode: ZegoUIKitPrebuilt.OneONoneCall,
    },
};

export default function VideoCallPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const meetingContainerRef = useRef(null); // Tạo ref cho div

    // Dùng useEffect để chạy logic an toàn
    useEffect(() => {
        try {
            // === 1. LẤY VÀ GIẢI MÃ (DECODE) TỪ URL ===
            const roomID = getUrlParams().get('roomID');
            const userID_encoded = getUrlParams().get('userID');
            const userName_encoded = getUrlParams().get('userName');
            console.log(roomID)

            if (!roomID || !userID_encoded || !userName_encoded) {
                setError("Error: Missing room or user information.");
                setIsLoading(false);
                return;
            }

            // Giải mã (Decode) các ký tự đặc biệt (như dấu cách %20)
            const userID = decodeURIComponent(userID_encoded);
            const userName = decodeURIComponent(userName_encoded);

            setIsLoading(false);

            // 2. TẠO TOKEN (DÙNG THÔNG TIN ĐÃ GIẢI MÃ)
            const appID = 2102231885; // (Cách làm Test, lộ bí mật)
            const serverSecret = "0c6cec04eb3243744ed3af9863223ca3";

            const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
                appID,
                serverSecret,
                roomID,
                userID,
                userName
            );

            const zp = ZegoUIKitPrebuilt.create(kitToken);

            zp.joinRoom({
                container: meetingContainerRef.current, // Gắn vào div
                ...myconfig, // Dùng "..."
            });

        } catch (err) {
            console.error("Error initializing Zego:", err);
            setError("Error: Unable to initialize call.");
            setIsLoading(false);
        }

        // Chạy 1 lần duy nhất khi component tải
    }, []);

    // Giao diện (UI)
    if (error) {
        return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
    }

    if (isLoading) {
        return <div style={{ padding: '20px' }}>Initializing call...</div>;
    }

    // Gắn ref vào div
    return (
        <div
            className="myCallContainer"
            ref={meetingContainerRef}
            style={{ width: '100vw', height: '100vh' }}
        ></div>
    );
}