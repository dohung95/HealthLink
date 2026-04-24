import React, { createContext, useContext, useState, useEffect } from "react";
import { login as loginAPI, register as registerAPI, logout as logoutAPI, setupAxiosInterceptors, getFirebaseTokenAPI } from '../api/auth';
import { decodeToken, getTokenExpiresIn } from '../utils/tokenUtils';

import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import * as signalR from "@microsoft/signalr";
import { toast } from 'sonner';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [roles, setRoles] = useState([]);
    const [token, setToken] = useState(() => localStorage.getItem('token') || null)
    const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refreshToken') || null)
    const [tokenExpiry, setTokenExpiry] = useState(null);
    const [loading, setLoading] = useState(true); // Thêm loading state

    const [connection, setConnection] = useState(null); // Lưu trữ kết nối
    const [incomingCall, setIncomingCall] = useState(null);

    // Setup axios interceptors on mount
    useEffect(() => {
        setupAxiosInterceptors();
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

    ///=>> use for identity and firebase
    const login = async (email, password) => {
        try {
            // 1. ĐĂNG NHẬP C# (Như cũ)
            const csharpResponse = await loginAPI(email, password);
            if (!csharpResponse || !csharpResponse.accessToken) {
                throw new Error("C# login failed");
            }

            const csharpToken = csharpResponse.accessToken;
            localStorage.setItem('token', csharpToken);
            setToken(csharpToken); // Cập nhật state C#

            // 2. ĐĂNG NHẬP FIREBASE (Bước mới)
            const firebaseResponse = await getFirebaseTokenAPI(csharpToken);
            const firebaseToken = firebaseResponse.firebaseToken;

            const userCredential = await signInWithCustomToken(auth, firebaseToken);
            const user = userCredential.user; // ← Lấy user Firebase

            // === THÊM ĐOẠN NÀY: Tạo/update user document trong Firestore ===
            const userRef = doc(db, "users", user.uid);

            // Decode token để lấy thông tin
            const decoded = decodeToken(csharpToken);
            const username = decoded?.preferred_username || decoded?.email || user.email || "User";

            // Lấy role từ token
            const roleClaimType = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
            let userRole = decoded?.[roleClaimType] || decoded?.role || "patient";
            if (Array.isArray(userRole)) userRole = userRole[0]; // Nếu là mảng, lấy role đầu tiên

            await setDoc(userRef, {
                uid: user.uid,
                displayName: username,
                email: decoded?.email || user.email || email,
                photoURL: user.photoURL || "",
                role: userRole
            }, { merge: true }); // merge: true = update nếu đã tồn tại, create nếu chưa

            console.log(`✓ User ${username} (${userRole}) saved to Firebase`);
            // ================================================================

            return true;
        } catch (error) {
            console.error("Double login error:", error);

            // Check if error is related to account status
            const errorMessage = error.message || '';
            const statusErrors = [
                'inactive',
                'suspended',
                'banned',
                'not active',
                'admin approval',
                'contact support'
            ];

            const isStatusError = statusErrors.some(keyword =>
                errorMessage.toLowerCase().includes(keyword)
            );

            // REMOVED: Don't call logout() on login failure - it causes page reload
            // Just throw the error to let Sign_in component handle it
            // if (!isStatusError) {
            //     logout();
            // }


            throw error;
        }
    };

    ///=>> use for identity and firebase
    const register = async (username, phonenumber, email, password, confirmPassword, role, DateOfBirth) => {
        try {
            await registerAPI(username, phonenumber, email, password, confirmPassword, DateOfBirth);
            // const csharpResponse = await loginAPI(email, password);
            // const csharpToken = csharpResponse.accessToken;
            // localStorage.setItem('token', csharpToken);
            // setToken(csharpToken);

            // // 3. ĐĂNG NHẬP FIREBASE (Bước mới)
            // const firebaseResponse = await getFirebaseTokenAPI(csharpToken);
            // const firebaseToken = firebaseResponse.firebaseToken;
            // const userCredential = await signInWithCustomToken(auth, firebaseToken);
            // const user = userCredential.user; // Lấy user Firebase

            // // 4. TẠO "DANH BẠ" (Lưu user vào Firestore)
            // const userRef = doc(db, "users", user.uid);
            // await setDoc(userRef, {
            //     uid: user.uid,
            //     displayName: username,
            //     email: email,
            //     photoURL: "", // (Ảnh mặc định)
            //     role: role // <-- LƯU ROLE VÀO DATABASE
            // }, { merge: true });

            console.log("dmmm role lon:      ", role)
            return true;
        } catch (error) {
            console.error("Double register error:", error);
            // Don't call logout() to avoid redirect, just clear any partial state
            setToken(null);
            setRefreshToken(null);
            setUser(null);
            setRoles([]);
            setTokenExpiry(null);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            throw error;
        }

    };

    ///=>> use for identity and firebase
    const logout = async () => {
        // (Hàm 'logoutAPI' của C# là không bắt buộc, vì token C# sẽ tự hết hạn)
        if (refreshToken) {
            await logoutAPI(refreshToken);
        }
        // Logout from Firebase
        await signOut(auth); // <-- Add this line
        setToken(null);
        setRefreshToken(null);
        setUser(null);
        setRoles([]);
        setTokenExpiry(null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/';
    };

    useEffect(() => {
        // Nếu có token (đã login) VÀ chưa có kết nối
        if (token && !connection) {

            // 1. Xây dựng kết nối đến Hub
            const newConnection = new signalR.HubConnectionBuilder()
                .withUrl("https://localhost:7267/notificationcalling", { // (Đảm bảo URL này đúng)
                    // 2. GỬI KÈM JWT TOKEN ĐỂ XÁC THỰC
                    accessTokenFactory: () => token
                })
                .withAutomaticReconnect()
                .build();

            // 3. Khởi động kết nối
            newConnection.start()
                .then(() => {
                    // console.log("SignalR Connected!");
                    setConnection(newConnection);

                    // 4. LẮNG NGHE CÁC SỰ KIỆN TỪ SERVER

                    // A. Khi AI ĐÓ GỌI BẠN (Reng reng!)
                    newConnection.on("IncomingCall", (callerId, callerName, roomId) => {
                        // console.log(`Incoming call from ${callerName}`);
                        // Lưu thông tin cuộc gọi để hiển thị Pop-up
                        setIncomingCall({ callerId, callerName, roomId });
                    });

                    // B. Khi NGƯỜI BẠN GỌI đã "Bắt máy" (Bác sĩ nhận được tin này)
                    // (Phiên bản ĐÃ SỬA LỖI - chỉ có 1 listener)
                    newConnection.on("CallAccepted", (receiverId, roomId) => {
                        // console.log("Call accepted, Doctor opening Zego...");

                        // Đọc token mới nhất từ localStorage để tránh lỗi "stale state"
                        const currentToken = localStorage.getItem('token');
                        if (!currentToken) {
                            console.error("Error: Caller token (Doctor) not found");
                            return;
                        }

                        // Tự giải mã token (dùng hàm decodeToken của bạn)
                        const decodedUser = decodeToken(currentToken);
                        if (!decodedUser) {
                            console.error("Error: Unable to decode caller token (Doctor)");
                            return;
                        }

                        // Lấy thông tin user TƯƠI MỚI (fresh)
                        const userId = decodedUser.sub;
                        const userName = decodedUser.preferred_username || decodedUser.email;

                        // Mở cửa sổ Zego (vì BẠN là người gọi)
                        const callUrl = `/video-calling?roomID=${roomId}&userID=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName)}`;
                        const windowSpecs = 'width=1000,height=700,noopener,noreferrer';
                        window.open(callUrl, '_blank', windowSpecs);
                    });

                    // C. Khi NGƯỜI BẠN GỌI đã "Từ chối"
                    newConnection.on("CallDeclined", () => {
                        // console.log("Call declined.");
                        toast.info("User declined the call.");
                    });

                })
                .catch(e => console.error("SignalR Connection Error: ", e));
        }
        // Nếu không có token (logout) VÀ đang có kết nối
        else if (!token && connection) {
            connection.stop();
            setConnection(null);
        }

        // Cleanup (chạy khi component bị hủy)
        return () => {
            if (connection) {
                connection.stop();
            }
        }
        // Chạy lại logic này mỗi khi 'token' hoặc 'connection' thay đổi
        // (Không cần 'user' trong dependency array nữa vì 'CallAccepted' đã đọc từ localStorage)
    }, [token, connection]);

    // 1. Khi BẠN bấm nút "Gọi"
    const initiateCall = async (targetUserId, roomId, targetUserName = "User") => {
        try {
            // Lấy token và decode để lấy thông tin người gọi
            const currentToken = localStorage.getItem('token');
            if (!currentToken) {
                toast.error("Error: You are not logged in. Please log in again.");
                return;
            }

            const decodedUser = decodeToken(currentToken);
            if (!decodedUser) {
                toast.error("Error: Invalid token.");
                return;
            }

            const currentUserId = decodedUser.sub;
            const currentUserName = decodedUser.preferred_username || decodedUser.email || "User";

            // console.log('Initiating call:', {
            //     currentUserId,
            //     currentUserName,
            //     targetUserId,
            //     targetUserName,
            //     roomId
            // });

            // ===== KIỂM TRA VÀ GỬI THÔNG BÁO CHO NGƯỜI NHẬN =====
            if (!connection) {
                console.error("Error: No SignalR connection");
                toast.error("Error: Unable to send call notification. Please try again.");
                return;
            }

            // Kiểm tra connection state
            if (connection.state !== signalR.HubConnectionState.Connected) {
                console.error(`Error: SignalR connection is not in Connected state. Current state: ${connection.state}`);
                toast.error("Error: Connection not ready. Please wait a moment and try again.");
                return;
            }

            try {
                // Gửi thông báo qua SignalR cho bệnh nhân
                await connection.invoke("InitiateCall", targetUserId, roomId);
                // console.log(`✓ Đã gửi thông báo cuộc gọi đến ${targetUserName}`);
            } catch (invokeError) {
                console.error("Error invoking InitiateCall:", invokeError);
                toast.error("Error: Unable to send call notification. " + invokeError.message);
                return;
            }
            // =========================================================

            // Điều hướng người gọi đến trang video call
            // Thêm "Dr." nếu user là bác sĩ
            const isDoctor = roles && roles.some(r => String(r).trim().toLowerCase() === 'doctor');
            const displayName = isDoctor ? `Dr. ${currentUserName}` : currentUserName;

            const callUrl = `/video-calling?roomID=${roomId}&userID=${encodeURIComponent(currentUserId)}&userName=${encodeURIComponent(displayName)}`;

            // Mở trong tab mới hoặc điều hướng trực tiếp
            const windowSpecs = 'width=1000,height=700,noopener,noreferrer';
            window.open(callUrl, '_blank', windowSpecs);

        } catch (error) {
            console.error("Error initiating call:", error);
            toast.error("Error: Unable to initiate call. " + error.message);
        }
    };

    // 2. Khi BẠN bấm "Bắt máy"
    const acceptCall = async () => {
        // 1. Kiểm tra connection và cuộc gọi đến
        if (!connection) {
            console.error("Error: No SignalR connection");
            toast.error("Error: Connection not established. Please try again.");
            return;
        }

        if (!incomingCall) {
            console.error("Error: No incoming call");
            toast.error("Error: No incoming call");
            return;
        }

        // 2. Kiểm tra connection state
        if (connection.state !== signalR.HubConnectionState.Connected) {
            console.error(`Error: SignalR connection is not in Connected state. Current state: ${connection.state}`);
            toast.error("Error: Connection not ready. Please wait and try again.");
            return;
        }

        try {
            // 3. Lấy token của chính Bác sĩ (người nhận)
            const currentToken = localStorage.getItem('token');
            if (!currentToken) {
                console.error("Error: No token found for the receiver");
                toast.error("Error: No token found, please log in again.");
                return;
            }

            // 4. Tự giải mã token
            const decodedUser = decodeToken(currentToken);
            if (!decodedUser) {
                console.error("Error: Unable to decode token of the receiver");
                toast.error("Error: Invalid token.");
                return;
            }

            // 5. Lấy thông tin user TƯƠI MỚI (fresh)
            const userId = decodedUser.sub;
            const userName = decodedUser.preferred_username || decodedUser.email;

            // 6. Báo cho server là bạn đã bắt máy
            await connection.invoke("AcceptCall", incomingCall.callerId, incomingCall.roomId);
            // console.log(`✓ Đã chấp nhận cuộc gọi từ ${incomingCall.callerName}`);

            // 7. Mở cửa sổ Zego (vì BẠN là người nhận)
            const callUrl = `/video-calling?roomID=${incomingCall.roomId}&userID=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName)}`;
            const windowSpecs = 'width=1000,height=700,noopener,noreferrer';
            window.open(callUrl, '_blank', windowSpecs);

            setIncomingCall(null); // Đóng pop-up
        } catch (error) {
            console.error("Error accepting call:", error);
            toast.error("Error: Unable to accept call. " + error.message);
        }
    };

    // 3. Khi BẠN bấm "Từ chối"
    const declineCall = async () => {
        if (connection && incomingCall) {
            // Báo cho server là bạn đã từ chối
            await connection.invoke("DeclineCall", incomingCall.callerId);
            setIncomingCall(null); // Đóng pop-up
        }
    };

    const value = {
        user,
        token,
        refreshToken,
        roles,
        tokenExpiry,
        loading,
        login,
        logout,
        register,
        isAuthenticated: !!token,
        hasRole: (role) => roles.includes(role),

        initiateCall,
        acceptCall,
        declineCall,
        incomingCall
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}