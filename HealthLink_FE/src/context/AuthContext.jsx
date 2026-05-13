import React, { createContext, useContext, useState, useEffect } from "react";
import { login as loginAPI, register as registerAPI, logout as logoutAPI, setupAxiosInterceptors, getFirebaseTokenAPI } from '../api/auth';
import { decodeToken, getTokenExpiresIn } from '../utils/tokenUtils';

import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
// import * as signalR from "@microsoft/signalr"; // TEMPORARILY DISABLED
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

    const [connection, setConnection] = useState(null); // DISABLED - using STOMP instead
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
        // TEMPORARILY DISABLE SIGNALR - Backend uses STOMP WebSocket, not SignalR protocol
        // TODO: Implement STOMP client (SockJS + stompjs) for realtime notifications
        console.log("SignalR disabled - using STOMP backend instead");
        // Skip all SignalR setup to prevent connection errors
    }, [token]);

    // 1. Khi BẠN bấm nút "Gọi" - TEMPORARILY DISABLED
    const initiateCall = async (targetUserId, roomId, targetUserName = "User") => {
        toast.info("Video calling temporarily disabled - SignalR not available");
        console.warn("initiateCall disabled - backend uses STOMP, not SignalR");
        // TODO: Implement via REST API or STOMP client
    };

    // 2. Khi BẠN bấm "Bắt máy" - TEMPORARILY DISABLED
    const acceptCall = async () => {
        toast.info("Video calling temporarily disabled - SignalR not available");
        console.warn("acceptCall disabled - backend uses STOMP, not SignalR");
        // TODO: Implement via REST API or STOMP client
    };

    // 3. Khi BẠN bấm "Từ chối" - TEMPORARILY DISABLED
    const declineCall = async () => {
        toast.info("Video calling temporarily disabled - SignalR not available");
        console.warn("declineCall disabled - backend uses STOMP, not SignalR");
        setIncomingCall(null); // Đóng pop-up
        // TODO: Implement via REST API or STOMP client
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