import React, { createContext, useContext, useState, useEffect } from "react";
import { login as loginAPI, register as registerAPI, logout as logoutAPI, forgotPassword as forgotPasswordAPI, resetPassword as resetPasswordAPI, setupAxiosInterceptors } from '../api/auth';
import { decodeToken, getTokenExpiresIn } from '../utils/tokenUtils';
import stompChatService from '../services/stompChatService';
import videoCallService from '../services/videoCallService';
import { toast } from 'sonner';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

const getInCallKey = () => 'healthlink_in_call_' + (localStorage.getItem('userId') || sessionStorage.getItem('userId') || 'guest');

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [roles, setRoles] = useState([]);
    const [token, setToken] = useState(() => localStorage.getItem('token') || sessionStorage.getItem('token') || null)
    const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken') || null)
    const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem('userId') || sessionStorage.getItem('userId') || null)
    const [tokenExpiry, setTokenExpiry] = useState(null);
    const [loading, setLoading] = useState(true); // Thêm loading state

    const [connection, setConnection] = useState(null); // DISABLED - using STOMP instead
    const [incomingCall, setIncomingCall] = useState(null);
    // Issue #5: Guard chống cuộc gọi chồng chéo — dùng localStorage để sync cross-tab
    const [isInCall, setIsInCall] = useState(() => localStorage.getItem(getInCallKey()) === 'true');

    // Setup axios interceptors on mount
    useEffect(() => {
        setupAxiosInterceptors();
        // Clear stuck call flag on app load to prevent permanent locks
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId') || 'guest';
        localStorage.removeItem('healthlink_in_call_' + userId);
        setIsInCall(false);
    }, []);

    // Update user and roles when token changes
    useEffect(() => {
        if (token) {
            const decoded = decodeToken(token);
            setUser(decoded);
            const expiresIn = getTokenExpiresIn(token);
            setTokenExpiry(expiresIn);
            // Extract roles from claims
            // JWT tokens may store roles in different formats
            let userRoles = [];

            // Try ClaimTypes.Role (full claim type name from ASP.NET Identity)
            const roleClaimType = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
            if (decoded?.[roleClaimType]) {
                const roleValue = decoded[roleClaimType];
                userRoles = Array.isArray(roleValue) ? roleValue : [roleValue];
            }
            // Try short key 'role'
            else if (decoded?.role) {
                const roleValue = decoded.role;
                userRoles = Array.isArray(roleValue) ? roleValue : [roleValue];
            }
            // Try 'roles' (plural)
            else if (decoded?.roles) {
                const roleValue = decoded.roles;
                userRoles = Array.isArray(roleValue) ? roleValue : [roleValue];
            }
            // Check all keys for role-related claims (in case of multiple role claims)
            else {
                const allKeys = Object.keys(decoded || {});
                const roleKeys = allKeys.filter(key =>
                    key.toLowerCase().includes('role') ||
                    key.includes('http://schemas.microsoft.com/ws/2008/06/identity/claims/role')
                );

                if (roleKeys.length > 0) {
                    roleKeys.forEach(key => {
                        const roleValue = decoded[key];
                        if (roleValue) {
                            if (Array.isArray(roleValue)) {
                                userRoles = [...userRoles, ...roleValue];
                            } else {
                                userRoles.push(roleValue);
                            }
                        }
                    });
                    // Remove duplicates
                    userRoles = [...new Set(userRoles)];
                }
            }

            setRoles(userRoles);
            setLoading(false); // Đã load xong
        } else {
            setUser(null);
            setRoles([]);
            setTokenExpiry(null);
            setLoading(false); // Đã load xong (không có token)
        }
    }, [token]);

    // Setup auto-logout timer when token expires
    useEffect(() => {
        if (!token) return;

        const expiresIn = getTokenExpiresIn(token);
        if (expiresIn <= 0) {
            logout();
            return;
        }

        // Set logout timer for token expiry (5 minutes before actual expiry)
        // const timeoutMs = (expiresIn - 300) * 1000; // 300 seconds = 5 minutes
        // if (timeoutMs > 0) {
        //     const timer = setTimeout(() => {
        //         logout();
        //         alert('Your session has expired. Please login again.');
        //     }, timeoutMs);

        //     return () => clearTimeout(timer);
        // }
    }, [token]);

    ///=>> Spring Boot login
    const login = async (email, password, rememberMe = true) => {
        try {
            const response = await loginAPI(email, password);
            if (!response || !response.accessToken) {
                throw new Error('Login failed');
            }

            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('token', response.accessToken);
            storage.setItem('refreshToken', response.refreshToken);
            // Lưu userId thật (UUID) để chat và so sánh room không bị lệch email/UUID
            if (response.userId) storage.setItem('userId', response.userId);
            setToken(response.accessToken);
            setRefreshToken(response.refreshToken);
            if (response.userId) setCurrentUserId(response.userId);

            return true;
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Login failed. Please try again later.' };
        }
    };

    ///=>> use for identity and firebase
    const register = async (username, phonenumber, email, password, role, dateOfBirth, gender, heightCm, weightKg, preferredLanguage) => {
        try {
            await registerAPI(username, phonenumber, email, password, dateOfBirth, gender, heightCm, weightKg, preferredLanguage, role);
            return true;
        } catch (error) {
            console.error("Double register error:", error);
            // Don't call logout() to avoid redirect, just clear any partial state
            setToken(null);
            setRefreshToken(null);
            setUser(null);
            setRoles([]);
            setTokenExpiry(null);
            localStorage.removeItem(getInCallKey());
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userId');
            sessionStorage.removeItem(getInCallKey());
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('refreshToken');
            sessionStorage.removeItem('userId');
            setCurrentUserId(null);
            throw error;
        }

    };

    ///=>> Spring Boot logout
    const logout = async () => {
        try {
            await logoutAPI();
        } catch (e) {
            console.error('Logout API call failed:', e);
        }
        localStorage.removeItem(getInCallKey());
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userId');
        sessionStorage.removeItem(getInCallKey());
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('userId');
        setToken(null);
        setRefreshToken(null);
        setUser(null);
        setRoles([]);
        setTokenExpiry(null);
        setCurrentUserId(null);
        window.location.href = '/';
    };

    //forgot password
    const forgotPassword = async (email) => {
        try {
            await forgotPasswordAPI(email);
            return true;
        } catch (error) {
            console.error('Forgot password error:', error);
            throw error;
        }
    };

    // reset password
    const resetPassword = async (token, password) => {
        try {
            await resetPasswordAPI(token, password);
            return true;
        } catch (error) {
            console.error('Reset password error:', error);
            throw error;
        }
    };

    // kết nối STOMP WebSocket cho Chat và WebRTC
    useEffect(() => {
        if (token && !connection) {
            // 1. Kết nối STOMP Server (Spring Boot) thay vì SignalR
            stompChatService.connect(token, () => {
                setConnection(true); // Đánh dấu đã kết nối

                // 2. Đăng ký lắng nghe tín hiệu WebRTC (Incoming Call)
                videoCallService.subscribeToWebRTC((signal) => {
                    const { type, senderId, senderName, data } = signal;

                    if (type === "CALL_REQUEST") {
                        // Issue #5: Chặn nếu đang trong cuộc gọi khác (đọc trực tiếp localStorage)
                        if (localStorage.getItem(getInCallKey()) === 'true') {
                            console.log('[WebRTC] Automatically declining because already in a call.');
                            videoCallService.sendWebRTCSignal({
                                type: 'CALL_DECLINED',
                                senderId: localStorage.getItem('userId') || sessionStorage.getItem('userId'),
                                senderName: 'User',
                                receiverId: senderId,
                                data: data
                            });
                            return;
                        }

                        // Nhận được cuộc gọi mới
                        setIncomingCall({ callerId: senderId, callerName: senderName, roomId: data });
                    }
                    // else if (type === "CALL_ACCEPTED") {
                    //     // Bác sĩ (người gọi) nhận được tín hiệu bắt máy từ bệnh nhân
                    //     // Lấy thông tin user hiện tại (Doctor)
                    //     const currentToken = localStorage.getItem('token') || sessionStorage.getItem('token');
                    //     const decodedUser = decodeToken(currentToken);
                    //     const userId = decodedUser.sub;
                    //     const userName = decodedUser.preferred_username || decodedUser.email;

                    //     // Mở cửa sổ Zego (vì BẠN là người gọi) - truyền targetUserId là người đã accept (senderId)
                    //     // senderName chính là người đã bắt máy (người nhận ban đầu)
                    //     const callUrl = `/video-calling?roomID=${data}&targetUserId=${encodeURIComponent(senderId)}&userName=${encodeURIComponent(senderName)}&isCaller=true`;
                    //     const windowSpecs = 'width=1000,height=700,noopener,noreferrer';
                    //     window.open(callUrl, '_blank', windowSpecs);
                    // }
                    else if (type === "CALL_ACCEPTED") {
                        // Bắn event qua localStorage để báo cho tab video-call biết (chống race condition)
                        localStorage.setItem('webrtc_signal', JSON.stringify({
                            type,
                            senderId,
                            roomId: data,
                            timestamp: Date.now()
                        }));
                    }
                    else if (type === "CALL_DECLINED" || type === "HANGUP" || type === "CALL_HANDLED_ELSEWHERE") {
                        // Nếu người gọi hủy cuộc gọi, đóng popup lại
                        setIncomingCall(prev => {
                            console.log('[WebRTC] Received HANGUP/DECLINED/HANDLED. prev:', prev, 'senderId:', senderId);
                            // Nếu HANGUP/DECLINED từ người gọi, hoặc là HANDLED_ELSEWHERE từ chính mình
                            if ((prev && prev.callerId === senderId) || (type === "CALL_HANDLED_ELSEWHERE" && prev && prev.roomId === data)) {
                                if (type !== "CALL_HANDLED_ELSEWHERE") {
                                    toast.info("The call has ended or was canceled.");
                                }
                                return null;
                            }
                            return prev;
                        });

                        // Bắn event qua localStorage để xử lý cross-tab race conditions
                        localStorage.setItem('webrtc_signal', JSON.stringify({
                            type,
                            senderId,
                            roomId: incomingCall ? incomingCall.roomId : data,
                            timestamp: Date.now()
                        }));
                    }
                    // Các tín hiệu OFFER, ANSWER, CANDIDATE sẽ được useWebRTC lắng nghe thêm
                });
            });
        }
        else if (!token && connection) {
            stompChatService.disconnect();
            setConnection(false);
        }

        return () => {
            // Cleanup khi app tắt (nhưng thường STOMP quản lý tự động)
        }
    }, [token, connection]);

    // Issue #5: Sync isInCall state khi localStorage thay đổi (cross-tab)
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === getInCallKey()) {
                setIsInCall(e.newValue === 'true');
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    /**
     * Đánh dấu đang trong/ngoài cuộc gọi, sync cross-tab qua localStorage.
     * @param {boolean} inCall
     */
    const setCallActive = (inCall) => {
        setIsInCall(inCall);
        if (inCall) {
            localStorage.setItem(getInCallKey(), 'true');
        } else {
            localStorage.removeItem(getInCallKey());
        }
    };

    // 1. Khi BẠN bấm nút "Gọi"
    const initiateCall = async (targetUserId, roomId, targetUserName = "User", callerName = "") => {
        // Issue #5: Chặn nếu đang trong cuộc gọi
        if (isInCall || localStorage.getItem(getInCallKey()) === 'true') {
            toast.warning("You are currently on another call. Please end the current call before making a new one.");
            return;
        }

        // Đánh dấu ngay lập tức để chặn spam click (Double click prevention)
        localStorage.setItem(getInCallKey(), 'true');
        setIsInCall(true);

        // Clear any stale STOMP WebRTC signals from previous calls to prevent auto-hangup
        localStorage.removeItem('webrtc_signal');

        try {
            // Lấy token và decode để lấy thông tin người gọi
            const currentToken = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (!currentToken) {
                toast.error("Error: You are not logged in. Please log in again.");
                return;
            }

            const decodedUser = decodeToken(currentToken);
            if (!decodedUser) {
                toast.error("Error: Invalid token.");
                return;
            }

            const currentUserName = callerName || decodedUser.preferred_username || decodedUser.email || decodedUser.sub || "User";

            // ===== KIỂM TRA VÀ GỬI THÔNG BÁO CHO NGƯỜI NHẬN =====
            if (!stompChatService.isConnected) {
                console.error("Error: No STOMP connection");
                toast.error("Error: Unable to send call notification. Please try again.");
                return;
            }

            try {
                // Gửi thông báo qua STOMP cho người nhận
                videoCallService.sendWebRTCSignal({
                    type: "CALL_REQUEST",
                    senderId: currentUserId,
                    senderName: currentUserName,
                    receiverId: targetUserId,
                    data: roomId
                });
            } catch (invokeError) {
                console.error("Error sending CALL_REQUEST:", invokeError);
                toast.error("Error: Unable to send call notification. " + invokeError.message);
                return;
            }
            // =========================================================

            // Đánh dấu đang trong cuộc gọi
            setCallActive(true);

            // Điều hướng người gọi đến trang video call
            const callUrl = `/video-calling?roomID=${roomId}&targetUserId=${encodeURIComponent(targetUserId)}&userName=${encodeURIComponent(targetUserName)}&isCaller=true`;

            // Mở trong tab mới
            const windowSpecs = 'width=1000,height=700';
            const callWindow = window.open(callUrl, '_blank', windowSpecs);

            // Khi tab video call đóng → clear isInCall flag
            if (callWindow) {
                const checkClosed = setInterval(() => {
                    if (callWindow.closed) {
                        clearInterval(checkClosed);
                        setCallActive(false);
                        
                        // Gửi thêm tín hiệu HANGUP phòng hờ trường hợp user bấm dấu X đóng thẳng cửa sổ
                        videoCallService.sendWebRTCSignal({
                            type: 'HANGUP',
                            senderId: currentUserId,
                            receiverId: targetUserId,
                            data: roomId
                        });
                    }
                }, 1000);
            } else {
                toast.error("Pop-up blocked! Please allow pop-ups for this website to make video calls.");
                setCallActive(false);
            }

        } catch (error) {
            console.error("Error initiating call:", error);
            toast.error("Error: Unable to initiate call. " + error.message);
            setCallActive(false);
        }
    };

    // 2. Khi BẠN bấm "Bắt máy"
    const acceptCall = async () => {
        // Issue #5: Chặn nếu đang trong cuộc gọi khác
        if (isInCall || localStorage.getItem(getInCallKey()) === 'true') {
            toast.warning("You are currently on another call. Please end the current call before making a new one.");
            setIncomingCall(null); // Tự động từ chối
            return;
        }

        // Đánh dấu ngay lập tức để chặn spam click
        localStorage.setItem(getInCallKey(), 'true');
        setIsInCall(true);

        // 1. Kiểm tra connection và cuộc gọi đến
        if (!stompChatService.isConnected) {
            console.error("Error: No STOMP connection");
            toast.error("Error: Connection not established. Please try again.");
            return;
        }

        if (!incomingCall) {
            console.error("Error: No incoming call");
            toast.error("Error: No incoming call");
            return;
        }

        try {
            // Lấy token của người nhận
            const currentToken = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (!currentToken) {
                console.error("Error: No token found for the receiver");
                toast.error("Error: No token found, please log in again.");
                return;
            }

            const decodedUser = decodeToken(currentToken);
            if (!decodedUser) {
                console.error("Error: Unable to decode token of the receiver");
                toast.error("Error: Invalid token.");
                return;
            }

            const userName = decodedUser.preferred_username || decodedUser.email || decodedUser.sub || "User";

            // Báo cho server là đã bắt máy
            videoCallService.sendWebRTCSignal({
                type: "CALL_ACCEPTED",
                senderId: currentUserId,
                senderName: userName,
                receiverId: incomingCall.callerId,
                data: incomingCall.roomId
            });

            // Báo cho các thiết bị KHÁC CỦA CHÍNH MÌNH tắt chuông
            videoCallService.sendWebRTCSignal({
                type: "CALL_HANDLED_ELSEWHERE",
                senderId: currentUserId,
                receiverId: currentUserId, // Gửi cho chính mình
                data: incomingCall.roomId
            });

            // Đánh dấu đang trong cuộc gọi
            setCallActive(true);

            // Mở cửa sổ video call (người nhận)
            const callUrl = `/video-calling?roomID=${incomingCall.roomId}&targetUserId=${encodeURIComponent(incomingCall.callerId)}&userName=${encodeURIComponent(incomingCall.callerName)}&isCaller=false`;
            const windowSpecs = 'width=1000,height=700';
            const callWindow = window.open(callUrl, '_blank', windowSpecs);

            // Khi tab video call đóng → clear isInCall flag
            if (callWindow) {
                const checkClosed = setInterval(() => {
                    if (callWindow.closed) {
                        clearInterval(checkClosed);
                        setCallActive(false);
                        videoCallService.sendWebRTCSignal({
                            type: 'HANGUP',
                            senderId: currentUserId,
                            receiverId: incomingCall.callerId,
                            data: incomingCall.roomId
                        });
                    }
                }, 1000);
            } else {
                toast.error("Pop-up blocked! Please allow pop-ups for this website to answer video calls.");
                setCallActive(false);
            }

            setIncomingCall(null); // Đóng pop-up
        } catch (error) {
            console.error("Error accepting call:", error);
            toast.error("Error: Unable to accept call. " + error.message);
            setCallActive(false);
        }
    };

    // 3. Khi BẠN bấm "Từ chối"
    const declineCall = async () => {
        if (incomingCall) {
            // Báo cho server là bạn đã từ chối
            videoCallService.sendWebRTCSignal({
                type: "CALL_DECLINED",
                senderId: currentUserId,
                receiverId: incomingCall.callerId,
                data: incomingCall.roomId
            });

            // Báo cho các thiết bị KHÁC CỦA CHÍNH MÌNH tắt chuông
            videoCallService.sendWebRTCSignal({
                type: "CALL_HANDLED_ELSEWHERE",
                senderId: currentUserId,
                receiverId: currentUserId, // Gửi cho chính mình
                data: incomingCall.roomId
            });
            setIncomingCall(null); // Đóng pop-up
        }
    };

    // Timeout cho người nhận: Tự động từ chối sau 30s nếu không bắt máy
    useEffect(() => {
        let timeoutId;
        if (incomingCall) {
            timeoutId = setTimeout(() => {
                toast.warning('Incoming call timed out after 30 seconds.');
                declineCall();
            }, 30000);
        }
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [incomingCall]);

    const value = {
        user,
        token,
        refreshToken,
        roles,
        tokenExpiry,
        loading,
        currentUserId,   // UUID thật (lưu lúc login), dùng cho chat room matching
        login,
        logout,
        register,
        forgotPassword,
        resetPassword,
        isAuthenticated: !!token,
        hasRole: (role) => roles.includes(role),

        initiateCall,
        acceptCall,
        declineCall,
        incomingCall,
        isInCall,        // Issue #5: Guard chống cuộc gọi chồng chéo
        setCallActive    // Expose để video-calling page có thể clear khi đóng
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}