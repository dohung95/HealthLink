import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBNJTDQrwrvboEDF-yPObe5K8H4TAfkEVs",
    authDomain: "app-chat-8ad17.firebaseapp.com",
    projectId: "app-chat-8ad17",
    storageBucket: "app-chat-8ad17.firebasestorage.app",
    messagingSenderId: "661281711635",
    appId: "1:661281711635:web:eec889ee725bcf2ec3c1e6",
    measurementId: "G-PM3MRXBMP4"
};

const app = initializeApp(firebaseConfig);

// 4. "Xuất" (export) các dịch vụ bạn cần
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);