import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { getOrCreateRoom, getMyRooms, getRoomMessages, sendMessage as apiSendMessage, markAsRead } from '../api/chatApi';
import stompChatService from '../services/stompChatService';
import { getGeminiResponse } from '../services/geminiService';
import { toast } from 'sonner';

// ─── Bot cố định (chỉ dùng Gemini AI ở frontend, không lưu DB) ──────────────
const BOT_USER = {
    userId: 'support_bot_001',
    displayName: 'Bot Chat AI',
    photoURL: 'https://api.dicebear.com/8.x/bottts/svg?seed=support',
    isBot: true,
};

const styles = {
    chatIcon: {
        position: 'fixed',
        bottom: '70px',
        right: '20px',
        width: '60px',
        height: '60px',
        cursor: 'pointer',
        zIndex: 1000,
        backgroundColor: '#00b09a',
        transition: 'transform 0.2s',
    },
};

// ─── Helper: format thời gian ────────────────────────────────────────────────
function formatTime(isoString) {
    if (!isoString) return '...';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now - d;
    const m = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMs / 3600000);
    const day = Math.floor(diffMs / 86400000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} minutes ago`;
    if (h < 24) return `${h} hours ago`;
    if (day < 7) return `${day} days ago`;
    return d.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' });
}

// ─── Component tin nhắn ──────────────────────────────────────────────────────
function ChatMessage({ message, currentUserId }) {
    const isOwn = message.senderId === currentUserId || message.uid === currentUserId;

    const timeStr = message.timestamp
        ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
        : (message.createdAt ? formatTime(message.createdAt) : '...');

    return (
        <div className={`message d-flex mb-3 ${isOwn ? 'justify-content-end' : 'justify-content-start'}`}>
            <div style={{ maxWidth: '70%' }}>
                <div
                    className={`p-2 rounded ${isOwn ? 'bg-primary text-white' : 'bg-light text-dark border'}`}
                    style={{ borderRadius: message.imageUrl ? '12px' : '20px', padding: message.imageUrl ? '4px' : '8px 16px' }}
                >
                    {message.imageUrl && (
                        <img
                            src={message.imageUrl}
                            alt="sent"
                            style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', display: 'block', cursor: 'pointer' }}
                            onClick={() => window.open(message.imageUrl, '_blank')}
                        />
                    )}
                    {(message.content || message.text) && (
                        <div style={{ marginTop: message.imageUrl ? '8px' : '0' }}>{message.content || message.text}</div>
                    )}
                </div>
                <div className={`small text-muted mt-1 ${isOwn ? 'text-end' : 'text-start'}`}>{timeStr}</div>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Chat() {
    const { user: authUser, roles } = useAuth();
    const {
        isChatOpen: isChatBoxOpen,
        setIsChatOpen: setIsChatBoxOpen,
        selectedChatPartner: chatPartner,
        setSelectedChatPartner: setChatPartner,
    } = useChat();

    const [formValue, setFormValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [roomList, setRoomList] = useState([]);   // danh sách phòng chat đã chat
    const [loading, setLoading] = useState(false);
    const [currentRoom, setCurrentRoom] = useState(null); // ChatRoomDTO đang mở
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [showDoctorListModal, setShowDoctorListModal] = useState(false);
    const [stompConnected, setStompConnected] = useState(false);

    const scrollTo = useRef(null);
    const fileInputRef = useRef(null);
    const unsubscribeChat = useRef(null);

    const isPatient = roles?.some(r => r.toLowerCase() === 'patient');
    const isDoctor  = roles?.some(r => r.toLowerCase() === 'doctor');
    const isPharmacy = roles?.some(r => r.toLowerCase() === 'pharmacy');
    const isGuest   = !authUser;

    // userId thực từ JWT (field "sub")
    const currentUserId = authUser?.sub || authUser?.userId || null;

    // ── Kết nối WebSocket STOMP khi đã login ────────────────────────────────
    useEffect(() => {
        if (!authUser) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        stompChatService.connect(token, () => {
            setStompConnected(true);
            // Đăng ký nhận tin nhắn realtime
            const unsub = stompChatService.subscribeToChat((newMsg) => {
                // Chỉ thêm nếu đang mở đúng phòng chat
                setMessages(prev => {
                    // Tránh duplicate nếu cùng messageId
                    if (prev.some(m => m.messageId === newMsg.messageId)) return prev;
                    return [...prev, newMsg];
                });
            });
            unsubscribeChat.current = unsub;
        });

        return () => {
            if (unsubscribeChat.current) unsubscribeChat.current();
            stompChatService.disconnect();
        };
    }, [authUser]);

    // ── Load danh sách phòng chat (sidebar) ─────────────────────────────────
    useEffect(() => {
        if (isGuest || !authUser) return;

        const loadRooms = async () => {
            try {
                const rooms = await getMyRooms();
                setRoomList(rooms);
            } catch (err) {
                console.error('Error fetching rooms:', err);
            }
        };

        loadRooms();
    }, [authUser, isGuest]);

    // ── Load tin nhắn khi chọn phòng chat ───────────────────────────────────
    useEffect(() => {
        if (!currentRoom) {
            setMessages([]);
            return;
        }

        const loadMessages = async () => {
            setLoading(true);
            try {
                const msgs = await getRoomMessages(currentRoom.chatRoomId);
                setMessages(msgs);
                // Đánh dấu đã đọc
                await markAsRead(currentRoom.chatRoomId).catch(() => {});
            } catch (err) {
                console.error('Error fetching messages:', err);
            } finally {
                setLoading(false);
            }
        };

        loadMessages();
    }, [currentRoom]);

    // ── Mở phòng chat khi chatPartner được set từ context ───────────────────
    useEffect(() => {
        if (!chatPartner || isGuest) return;
        if (chatPartner.isBot) {
            setCurrentRoom(null);
            setMessages([]);
            return;
        }
        // chatPartner có thể là user có field userId hoặc uid
        const partnerId = chatPartner.userId || chatPartner.uid;
        if (!partnerId || !currentUserId) return;

        const openRoom = async () => {
            try {
                const room = await getOrCreateRoom(currentUserId, partnerId);
                setCurrentRoom(room);
            } catch (err) {
                console.error('Error opening room:', err);
                toast.error('Cannot open room!');
            }
        };

        openRoom();
    }, [chatPartner, currentUserId]);

    // ── Scroll xuống cuối khi có tin nhắn mới ───────────────────────────────
    useEffect(() => {
        scrollTo.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isChatBoxOpen]);

    // ── Lắng nghe sự kiện mở chat từ component khác ─────────────────────────
    useEffect(() => {
        const handler = (e) => {
            const { message } = e.detail || {};
            setIsChatBoxOpen(true);
            if (message) setFormValue(message);
        };
        window.addEventListener('openChatWithMessage', handler);
        return () => window.removeEventListener('openChatWithMessage', handler);
    }, []);

    // ── Guest: mặc định chat với Bot ────────────────────────────────────────
    useEffect(() => {
        if (isGuest) setChatPartner(BOT_USER);
    }, [isGuest]);

    // ── Gửi tin nhắn ────────────────────────────────────────────────────────
    const sendMsg = async (e) => {
        e.preventDefault();
        if (!formValue.trim() || !chatPartner) return;

        const text = formValue.trim();
        setFormValue('');

        // Hiển thị ngay (optimistic UI)
        const optimistic = {
            messageId: `temp_${Date.now()}`,
            senderId: currentUserId || 'guest_temp',
            content: text,
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);

        // ── Nếu là Bot ──
        if (chatPartner.isBot || chatPartner.userId === BOT_USER.userId) {
            const botReply = await getGeminiResponse(text, []);
            await new Promise(r => setTimeout(r, 800));
            setMessages(prev => [...prev, {
                messageId: `bot_${Date.now()}`,
                senderId: BOT_USER.userId,
                content: botReply,
                timestamp: new Date().toISOString(),
            }]);
            return;
        }

        // ── Guest cố chat với người thật ──
        if (isGuest) {
            toast.info('Please login to chat with real doctor!');
            return;
        }

        // ── Chat thật → gửi lên backend ──
        if (!currentRoom) {
            toast.error('You have not opened the chat room!');
            return;
        }
        const partnerId = chatPartner.userId || chatPartner.uid;

        try {
            const saved = await apiSendMessage({
                chatRoomId: currentRoom.chatRoomId,
                receiverId: partnerId,
                content: text,
            });
            // Thay optimistic bằng tin nhắn thật
            setMessages(prev => prev.map(m => m.messageId === optimistic.messageId ? saved : m));
        } catch (err) {
            console.error('Error sending message:', err);
            toast.error('Failed to send message!');
            setMessages(prev => prev.filter(m => m.messageId !== optimistic.messageId));
        }
    };

    // ── Gửi ảnh ─────────────────────────────────────────────────────────────
    const sendImage = async () => {
        if (!selectedFile || !currentRoom || isGuest) return;
        if (chatPartner?.isBot) { toast.info('You cannot send image to Bot!'); return; }

        setUploading(true);
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64 = ev.target.result;
            if (base64.length > 900 * 1024) {
                toast.info('Image is too large after converting!');
                setUploading(false);
                return;
            }
            try {
                const partnerId = chatPartner.userId || chatPartner.uid;
                const saved = await apiSendMessage({
                    chatRoomId: currentRoom.chatRoomId,
                    receiverId: partnerId,
                    imageUrl: base64,
                });
                setMessages(prev => [...prev, saved]);
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            } catch (err) {
                toast.error('Failed to send image!');
            } finally {
                setUploading(false);
            }
        };
        reader.onerror = () => { toast.error('Failed to read file!'); setUploading(false); };
        reader.readAsDataURL(selectedFile);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) { toast.info('Only accept image files!'); return; }
        if (file.size > 300 * 1024) { toast.info('Image max 300KB!'); return; }
        setSelectedFile(file);
    };

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                if (chatPartner?.isBot) { toast.info('You cannot send image to Bot!'); return; }
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file && file.size <= 300 * 1024) setSelectedFile(file);
                else toast.info('Image max 300KB!');
                break;
            }
        }
    };

    // ── Chọn partner từ danh sách phòng ─────────────────────────────────────
    const selectRoom = (room) => {
        // Xác định đối phương
        const partnerId = room.user1Id === currentUserId ? room.user2Id : room.user1Id;
        const partnerName = room.user1Id === currentUserId ? room.user2DisplayName : room.user1DisplayName;
        const partnerPhoto = room.user1Id === currentUserId ? room.user2PhotoURL : room.user1PhotoURL;

        setChatPartner({ userId: partnerId, displayName: partnerName, photoURL: partnerPhoto });
        setCurrentRoom(room);
        setShowDoctorListModal(false);
    };

    // ── Render ───────────────────────────────────────────────────────────────
    const showInput = (isGuest && chatPartner) || (chatPartner && (isPatient || isDoctor));

    return (
        <>
            {/* Icon mở chat */}
            {!isChatBoxOpen && (
                <div
                    className="chat-icon rounded-circle d-flex align-items-center justify-content-center shadow-lg"
                    style={styles.chatIcon}
                    onClick={() => setIsChatBoxOpen(true)}
                    title="Open Message"
                >
                    <i className="bi bi-chat-fill text-white" style={{ fontSize: '1.5rem' }}></i>
                </div>
            )}

            {/* 2. Chat Box (popup) */}
            {isChatBoxOpen && (
                <div className="chat-box chat-box-responsive container d-flex flex-column border rounded shadow-lg bg-white">
                    {/* Header */}
                    <div className="p-3 border-bottom bg-light d-flex justify-content-between align-items-center">
                        {isDoctor && chatPartner && (
                            <button className="btn btn-sm btn-link text-decoration-none" onClick={() => { setChatPartner(null); setCurrentRoom(null); }}>
                                &lt; Go Back
                            </button>
                        )}
                        <h5 className="mb-0 fs-6">
                            {isGuest && chatPartner && `Chat with ${chatPartner.displayName}`}
                            {/* doctor */}
                            {!isGuest && isDoctor && !chatPartner && 'List of patients'}
                            {!isGuest && isDoctor && chatPartner && `Chat with ${chatPartner.displayName}`}
                            {/* pharmacy */}
                            {!isGuest && isPharmacy && !chatPartner && 'List of patients'}
                            {!isGuest && isPharmacy && chatPartner && `Chat with ${chatPartner.displayName}`}
                            {/* patient */}
                            {!isGuest && isPatient && chatPartner && isDoctor && `Chat with Doctor ${chatPartner.displayName}`}
                            {!isGuest && isPatient && chatPartner && isPharmacy && `Chat with Pharmacy ${chatPartner.displayName}`}
                        </h5>
                        <button className="btn-close" onClick={() => setIsChatBoxOpen(false)} aria-label="Close"></button>
                    </div>

                    {/* Nội dung */}
                    <div className="flex-grow-1 p-3 overflow-y-auto" style={{ backgroundColor: '#f8f9fa' }}>
                        {/* Guest chỉ thấy Bot */}
                        {isGuest && chatPartner && (
                            <>
                                {messages.length === 0 && <p className="text-center text-muted">Say Hello to Bot!</p>}
                                {messages.map(msg => <ChatMessage key={msg.messageId} message={msg} currentUserId="guest_temp" />)}
                                <div ref={scrollTo}></div>
                            </>
                        )}

                        {/* Doctor: danh sách phòng hoặc tin nhắn */}
                        {!isGuest && isDoctor && (
                            <>
                                {!chatPartner ? (
                                    <ul className="list-group list-group-flush">
                                        {roomList.length === 0 && <li className="list-group-item">No message here.</li>}
                                        {roomList.map(room => {
                                            const name = room.user1Id === currentUserId ? room.user2DisplayName : room.user1DisplayName;
                                            const photo = room.user1Id === currentUserId ? room.user2PhotoURL : room.user1PhotoURL;
                                            return (
                                                <li key={room.chatRoomId} onClick={() => selectRoom(room)}
                                                    className="list-group-item list-group-item-action d-flex align-items-center" style={{ cursor: 'pointer' }}>
                                                    <img src={photo || `https://api.dicebear.com/8.x/initials/svg?seed=${name}`} alt="ava"
                                                        className="rounded-circle me-2" style={{ width: 40, height: 40, flexShrink: 0 }} />
                                                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                        <div className="fw-bold">{name}</div>
                                                        {room.lastMessage && <small className="text-muted text-truncate d-block">{room.lastMessage}</small>}
                                                    </div>
                                                    {room.lastMessageAt && (
                                                        <small className="text-muted ms-2" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                                            {formatRelative(room.lastMessageAt)}
                                                        </small>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <>
                                        {loading && <p className="text-center text-muted">Loading messages...</p>}
                                        {messages.map(msg => <ChatMessage key={msg.messageId} message={msg} currentUserId={currentUserId} />)}
                                        <div ref={scrollTo}></div>
                                    </>
                                )}
                            </>
                        )}

                        {/* Pharmacy: danh sách phòng và tin nhắn */}
                        {!isGuest && isPharmacy && (
                            <>
                                {!chatPartner ? (
                                    <ul className="list-group list-group-flush">
                                        {roomList.length === 0 && <li className="list-group-item">No message here.</li>}
                                        {roomList.map(room => {
                                            const name = room.user1Id === currentUserId ? room.user2DisplayName : room.user1DisplayName;
                                            const photo = room.user1Id === currentUserId ? room.user2PhotoURL : room.user1PhotoURL;
                                            return (
                                                <li key={room.chatRoomId} onClick={() => selectRoom(room)}
                                                    className="list-group-item list-group-item-action d-flex align-items-center" style={{ cursor: 'pointer' }}>
                                                    <img src={photo || `https://api.dicebear.com/8.x/initials/svg?seed=${name}`}
                                                        className="rounded-circle me-2" style={{ width: 40, height: 40, flexShrink: 0 }} />
                                                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                        <div className="fw-bold">{name}</div>
                                                        {room.lastMessage && <small className="text-muted text-truncate d-block">{room.lastMessage}</small>}
                                                    </div>
                                                    {room.lastMessageAt && (
                                                        <small className="text-muted ms-2" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                                            {formatRelative(room.lastMessageAt)}
                                                        </small>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <>
                                        {loading && <p className="text-center text-muted">Loading messages...</p>}
                                        {messages.map(msg => <ChatMessage key={msg.messageId} message={msg} currentUserId={currentUserId} />)}
                                        <div ref={scrollTo}></div>
                                    </>
                                )}
                            </>
                        )}

                        {/* Patient: tin nhắn */}
                        {!isGuest && isPatient && chatPartner && (
                            <>
                                {loading && <p className="text-center text-muted">Loading messages...</p>}
                                {messages.length === 0 && !loading && <p className="text-center text-muted">Send messages!</p>}
                                {messages.map(msg => <ChatMessage key={msg.messageId} message={msg} currentUserId={currentUserId} />)}
                                <div ref={scrollTo}></div>
                            </>
                        )}
                    </div>

                    {/* Input gửi tin nhắn */}
                    {showInput && (
                        <div className="p-2 border-top">
                            {selectedFile && (
                                <div className="mb-2 p-2 bg-light rounded d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center">
                                        <img src={URL.createObjectURL(selectedFile)} alt="preview"
                                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', marginRight: '10px' }} />
                                        <small className="text-truncate">{selectedFile.name}</small>
                                    </div>
                                    <button className="btn btn-sm btn-danger" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>✕</button>
                                </div>
                            )}
                            <form className="d-flex" onSubmit={sendMsg}>
                                {!isGuest && isPatient && (
                                    <button type="button" className="btn btn-outline-secondary me-2"
                                        onClick={() => setShowDoctorListModal(true)} title="Choose doctor">
                                        <i className="bi bi-person-lines-fill"></i>
                                    </button>
                                )}
                                {!isGuest && !chatPartner?.isBot && (
                                    <>
                                        <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                                        <button type="button" className="btn btn-outline-primary me-2"
                                            onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Send image">
                                            <i className="bi bi-image"></i>
                                        </button>
                                    </>
                                )}
                                <input type="text" className="form-control" value={formValue}
                                    onChange={e => setFormValue(e.target.value)} onPaste={handlePaste}
                                    placeholder="Type a message..." disabled={uploading} />
                                {selectedFile ? (
                                    <button className="btn btn-success ms-2" type="button" onClick={sendImage} disabled={uploading}>
                                        {uploading ? <><span className="spinner-border spinner-border-sm me-1"></span>Sending...</> : 'Send'}
                                    </button>
                                ) : (
                                    <button className="btn btn-primary ms-2" type="submit" disabled={!formValue.trim() || uploading}>Send</button>
                                )}
                            </form>
                        </div>
                    )}

                    {/* Modal chọn bác sĩ (Patient) */}
                    {isPatient && showDoctorListModal && (
                        <div style={{ position: 'absolute', bottom: '80px', left: 0, right: 0, zIndex: 10, padding: '0 10px' }}>
                            <div className="card shadow-lg">
                                <div className="card-header d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0 fs-6">Choice Doctors</h5>
                                    <button className="btn-close" onClick={() => setShowDoctorListModal(false)}></button>
                                </div>
                                <ul className="list-group list-group-flush" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {/* Bot */}
                                    <li onClick={() => { setChatPartner(BOT_USER); setCurrentRoom(null); setShowDoctorListModal(false); }}
                                        className="list-group-item list-group-item-action d-flex align-items-center" style={{ cursor: 'pointer' }}>
                                        <img src={BOT_USER.photoURL} alt="bot" className="rounded-circle me-2" style={{ width: 40, height: 40 }} />
                                        <div>
                                            <div className="fw-bold">{BOT_USER.displayName}</div>
                                            <small className="text-muted" style={{ fontSize: '0.85rem' }}>AI support 24/7</small>
                                        </div>
                                    </li>
                                    {/* Các phòng chat đã có */}
                                    {roomList.map(room => {
                                        const partnerId = room.user1Id === currentUserId ? room.user2Id : room.user1Id;
                                        const name = room.user1Id === currentUserId ? room.user2DisplayName : room.user1DisplayName;
                                        const photo = room.user1Id === currentUserId ? room.user2PhotoURL : room.user1PhotoURL;
                                        return (
                                            <li key={room.chatRoomId} onClick={() => selectRoom(room)}
                                                className="list-group-item list-group-item-action d-flex align-items-center" style={{ cursor: 'pointer' }}>
                                                <img src={photo || `https://api.dicebear.com/8.x/initials/svg?seed=${name}`}
                                                    alt="ava" className="rounded-circle me-2" style={{ width: 40, height: 40 }} />
                                                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                    <div className="fw-bold">Dr. {name}</div>
                                                    {room.lastMessage && <small className="text-muted text-truncate d-block">{room.lastMessage}</small>}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Model chọn nhà thuốc (Patient) */}
                    {isPatient && showPharmacyListModal && (
                        <div style={{ position: 'absolute', bottom: '80px', left: 0, right: 0, zIndex: 10, padding: '0 10px' }}>
                            <div className="card shadow-lg">
                                <div className="card-header d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0 fs-6">Choice Pharmacy</h5>
                                    <button className="btn-close" onClick={() => setShowPharmacyListModal(false)}></button>
                                </div>
                                <ul className="list-group list-group-flush" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {/* Các phòng chat đã có */}
                                    {roomList.map(room => {
                                        const partnerId = room.user1Id === currentUserId ? room.user2Id : room.user1Id;
                                        const name = room.user1Id === currentUserId ? room.user2DisplayName : room.user1DisplayName;
                                        const photo = room.user1Id === currentUserId ? room.user2PhotoURL : room.user1PhotoURL;
                                        return (
                                            <li key={room.chatRoomId} onClick={() => selectRoom(room)}
                                                className="list-group-item list-group-item-action d-flex align-items-center" style={{ cursor: 'pointer' }}>
                                                <img src={photo || `https://api.dicebear.com/8.x/initials/svg?seed=${name}`}
                                                    alt="ava" className="rounded-circle me-2" style={{ width: 40, height: 40 }} />
                                                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                    <div className="fw-bold">Dr. {name}</div>
                                                    {room.lastMessage && <small className="text-muted text-truncate d-block">{room.lastMessage}</small>}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}