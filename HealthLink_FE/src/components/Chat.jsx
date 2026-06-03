import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { getOrCreateRoom, getMyRooms, getRoomMessages, sendMessage as apiSendMessage, markAsRead } from '../api/chatApi';
import stompChatService from '../services/stompChatService';
import { getGeminiResponse } from '../services/geminiService';
import { checkKeywordAndGetBotReply } from '../AI_BOT/BotBrain';
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

// format relative time for chat
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


// ─── Component hiển thị 3 chấm “Bot đang gõ” ────────────────────────────────
function TypingIndicator() {
    return (
        <div className="d-flex justify-content-start mb-3">
            <div style={{
                background: '#e9ecef',
                borderRadius: '20px',
                padding: '10px 16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
            }}>
                {[0, 1, 2].map(i => (
                    <span key={i} style={{
                        width: 8, height: 8,
                        borderRadius: '50%',
                        background: '#6c757d',
                        display: 'inline-block',
                        animation: 'botTypingBounce 1.2s infinite ease-in-out',
                        animationDelay: `${i * 0.2}s`,
                    }} />
                ))}
            </div>
            <style>{`
                @keyframes botTypingBounce {
                    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                    40% { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

// ─── Component Lightbox xem ảnh phóng to ─────────────────────────────────────
/**
 * Hiển thị ảnh phóng to dạng overlay popup khi người dùng click vào ảnh trong chat.
 * @param {{ src: string, onClose: () => void }} props
 */
function ImageLightbox({ src, onClose }) {
    // Đóng khi nhấn phím Escape
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                backgroundColor: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'msgFadeSlideIn 0.2s ease-out',
                cursor: 'zoom-out',
            }}
        >
            {/* Nút đóng */}
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: '16px',
                    right: '20px',
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                    fontSize: '1.2rem',
                    backdropFilter: 'blur(4px)',
                    transition: 'background 0.2s',
                }}
                title="Đóng (Esc)"
            >
                <i className="bi bi-x-lg" />
            </button>

            {/* Ảnh phóng to — stopPropagation để không đóng khi click vào ảnh */}
            <img
                src={src}
                alt="preview"
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    objectFit: 'contain',
                    borderRadius: '12px',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                    cursor: 'default',
                    userSelect: 'none',
                }}
            />
        </div>
    );
}

// ─── Component tin nhắn ──────────────────────────────────────────────────────
/**
 * @param {{ message: object, currentUserId: string, isNew?: boolean, onImageClick?: (src: string) => void }} props
 * isNew=true kích hoạt typewriter effect cho tin nhắn bot mới nhất
 */
function ChatMessage({ message, currentUserId, isNew = false, onImageClick }) {
    const isOwn = message.senderId === currentUserId || message.uid === currentUserId;
    const fullText = message.content || message.text || '';

    // Typewriter effect: chỉ chạy cho tin nhắn bot mới (isNew=true), chỉ chạy 1 lần
    const [displayText, setDisplayText] = useState(isNew ? '' : fullText);
    const [typewriterDone, setTypewriterDone] = useState(!isNew);

    useEffect(() => {
        if (!isNew || !fullText) return;
        let i = 0;
        // Tốc độ gõ phụ thuộc độ dài câu (câu dài gõ nhanh hơn, tối đa 15ms/ký tự)
        const speed = Math.max(15, Math.min(35, Math.round(1500 / fullText.length)));
        const interval = setInterval(() => {
            i++;
            setDisplayText(fullText.slice(0, i));
            if (i >= fullText.length) {
                clearInterval(interval);
                setTypewriterDone(true);
            }
        }, speed);
        return () => clearInterval(interval);
    // chỉ chạy khi mount (isNew là prop tĩnh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const timeStr = message.timestamp
        ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
        : (message.createdAt ? formatTime(message.createdAt) : '...');

    return (
        <div className={`message d-flex mb-3 ${isOwn ? 'justify-content-end' : 'justify-content-start'}`}
            style={{ animation: 'msgFadeSlideIn 0.25s ease-out' }}>
            <style>{`
                @keyframes msgFadeSlideIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <div style={{ maxWidth: '70%' }}>
                <div
                    className={`p-2 rounded ${isOwn ? 'bg-primary text-white' : 'bg-light text-dark border'}`}
                    style={{ borderRadius: message.imageUrl ? '12px' : '20px', padding: message.imageUrl ? '4px' : '8px 16px' }}
                >
                    {message.imageUrl && (
                        <img
                            src={message.imageUrl}
                            alt="sent"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '300px',
                                borderRadius: '8px',
                                display: 'block',
                                cursor: 'zoom-in',
                                transition: 'opacity 0.15s',
                            }}
                            onClick={() => onImageClick?.(message.imageUrl)}
                            title="Click để xem ảnh phóng to"
                        />
                    )}
                    {fullText && (
                        <div style={{ marginTop: message.imageUrl ? '8px' : '0', whiteSpace: 'pre-wrap' }}>
                            {displayText}
                            {/* Con trỏ nhấp nháy trong khi chưa gõ xong */}
                            {isNew && !typewriterDone && (
                                <span style={{
                                    display: 'inline-block',
                                    width: 2, height: '1em',
                                    background: 'currentColor',
                                    marginLeft: 2,
                                    verticalAlign: 'text-bottom',
                                    animation: 'cursorBlink 0.7s steps(1) infinite',
                                }} />
                            )}
                            <style>{`
                                @keyframes cursorBlink {
                                    0%, 100% { opacity: 1; }
                                    50% { opacity: 0; }
                                }
                            `}</style>
                        </div>
                    )}
                    {/* Nút hành động (chỉ hiện sau khi typewriter hoàn tất) */}
                    {typewriterDone && message.actionUrl && message.actionLabel && (
                        <div style={{ marginTop: '8px', animation: 'msgFadeSlideIn 0.3s ease-out' }}>
                            <button
                                className="btn btn-sm btn-success"
                                onClick={() => window.location.href = message.actionUrl}
                                style={{ borderRadius: '20px', fontSize: '0.85rem' }}
                            >
                                {message.actionLabel}
                            </button>
                        </div>
                    )}
                </div>
                <div className={`small text-muted mt-1 ${isOwn ? 'text-end' : 'text-start'}`}>{timeStr}</div>
            </div>
        </div>
    );
}

// ─── Component hiển thị phòng chat (Danh sách bên trái/Modal) ───────────────
function RoomListItem({ room, currentUserId, onSelect }) {
    const name = room.user1Id === currentUserId ? room.user2DisplayName : room.user1DisplayName;
    const photo = room.user1Id === currentUserId ? room.user2PhotoURL : room.user1PhotoURL;
    const isUnread = room.unreadCount > 0;

    return (
        <li onClick={() => onSelect(room)}
            className={`list-group-item list-group-item-action d-flex align-items-center ${isUnread ? 'bg-light' : ''}`} 
            style={{ cursor: 'pointer' }}>
            <img src={photo || `https://api.dicebear.com/8.x/initials/svg?seed=${name}`} alt="ava"
                className="rounded-circle me-2" style={{ width: 40, height: 40, flexShrink: 0 }} />
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className={`fw-bold ${isUnread ? 'text-dark' : ''}`}>{name}</div>
                {room.lastMessage && (
                    <small className={`text-truncate d-block ${isUnread ? 'fw-bold text-dark' : 'text-muted'}`}>
                        {room.lastMessage}
                    </small>
                )}
            </div>
            <div className="d-flex flex-column align-items-end ms-2">
                {room.lastMessageAt && (
                    <small className="text-muted mb-1" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {formatRelative(room.lastMessageAt)}
                    </small>
                )}
                {isUnread && (
                    <span className="badge rounded-pill bg-danger" style={{ fontSize: '0.7rem' }}>
                        {room.unreadCount > 99 ? '99+' : room.unreadCount}
                    </span>
                )}
            </div>
        </li>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Chat() {
    const { user: authUser, roles, currentUserId } = useAuth();
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
    const [isBotTyping, setIsBotTyping] = useState(false);       // hiển thị typing indicator
    const [latestBotMsgId, setLatestBotMsgId] = useState(null); // đánh dấu tin nhắn bot mới nhất để kích hoạt typewriter
    const [lightboxImage, setLightboxImage] = useState(null);    // URL ảnh đang xem phóng to trong lightbox

    const scrollTo = useRef(null);
    const fileInputRef = useRef(null);
    const unsubscribeChat = useRef(null);

    // Dùng ref để trong hàm subscribeToChat (callback) lấy được giá trị mới nhất mà không cần tạo lại sub
    const currentRoomRef = useRef(currentRoom);
    useEffect(() => { currentRoomRef.current = currentRoom; }, [currentRoom]);

    const isChatBoxOpenRef = useRef(isChatBoxOpen);
    useEffect(() => { isChatBoxOpenRef.current = isChatBoxOpen; }, [isChatBoxOpen]);

    const isPatient = roles?.some(r => r.toLowerCase() === 'patient');
    const isDoctor  = roles?.some(r => r.toLowerCase() === 'doctor');
    const isPharmacy = roles?.some(r => r.toLowerCase() === 'pharmacy');
    const isGuest   = !authUser;

    // ── Đăng ký sự kiện Chat khi Component được render ────────────────────────────────
    useEffect(() => {
        if (!authUser) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        setStompConnected(stompChatService.isConnected);

            // Đăng ký nhận tin nhắn realtime
        const unsub = stompChatService.subscribeToChat((newMsg) => {
            // Sự kiện phòng mới được tạo (chưa có tin nhắn)
            if (newMsg.messageId === "ROOM_CREATED") {
                setRoomList(prevRooms => {
                    if (!prevRooms.some(r => r.chatRoomId === newMsg.chatRoomId)) {
                        getMyRooms().then(rooms => setRoomList(rooms)).catch(err => console.error(err));
                    }
                    return prevRooms;
                });
                return; // KHÔNG thêm vào màn hình hiển thị tin nhắn
            }

            const activeRoomId = currentRoomRef.current?.chatRoomId;
            const isRoomActive = activeRoomId === newMsg.chatRoomId && isChatBoxOpenRef.current;

            // 1. Chỉ thêm tin nhắn vào màn hình chat nếu đang mở đúng phòng đó
            if (activeRoomId === newMsg.chatRoomId) {
                setMessages(prev => {
                    // Tránh duplicate nếu cùng messageId
                    if (prev.some(m => m.messageId === newMsg.messageId)) return prev;
                    return [...prev, newMsg];
                });
                
                // Nếu chat box đang mở, đánh dấu đã đọc luôn
                if (isChatBoxOpenRef.current) {
                    markAsRead(newMsg.chatRoomId).catch(err => console.error(err));
                }
            }

            // 2. Cập nhật danh sách phòng (bên trái/modal)
            setRoomList(prevRooms => {
                const isNewRoom = !prevRooms.some(r => r.chatRoomId === newMsg.chatRoomId);
                if (isNewRoom) {
                    // Nếu là phòng mới tinh (chưa từng chat), gọi API lấy lại danh sách
                    getMyRooms().then(rooms => setRoomList(rooms)).catch(err => console.error(err));
                    return prevRooms;
                }
                
                const updated = prevRooms.map(room => {
                    if (room.chatRoomId === newMsg.chatRoomId) {
                        return {
                            ...room,
                            lastMessage: newMsg.content || "[Ảnh]",
                            lastMessageAt: newMsg.timestamp,
                            unreadCount: isRoomActive ? 0 : (room.unreadCount || 0) + 1
                        };
                    }
                    return room;
                });
                
                // Sắp xếp đưa phòng có tin mới nhất lên đầu
                updated.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
                return updated;
            });
        });
        unsubscribeChat.current = unsub;

        return () => {
            if (unsubscribeChat.current) unsubscribeChat.current();
            // KHÔNG gọi disconnect ở đây nữa vì AuthContext sẽ quản lý vòng đời connection
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
                const room = await getOrCreateRoom(partnerId);
                setCurrentRoom(room);
                // Thêm phòng vào danh sách nếu chưa có
                setRoomList(prev => {
                    if (!prev.some(r => r.chatRoomId === room.chatRoomId)) {
                        // Thêm phòng mới lên đầu danh sách
                        return [room, ...prev];
                    }
                    return prev;
                });
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

    // ── Default view logic ──────────────────────────────────────────────────
    useEffect(() => {
        if (isGuest) {
            setChatPartner(BOT_USER);
        } else if (isDoctor || isPharmacy) {
            setChatPartner(null);
            setCurrentRoom(null);
        } else if (isPatient && !chatPartner) {
            setChatPartner(BOT_USER);
        }
    }, [isGuest, isDoctor, isPharmacy, isPatient]);

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
            const keywordMatch = checkKeywordAndGetBotReply(text);
            setIsBotTyping(true); // bật typing indicator

            if (keywordMatch) {
                // Bot nội bộ: delay giả 600ms → tắt typing → hiện message ngay
                await new Promise(r => setTimeout(r, 600));
                setIsBotTyping(false);
                const newMsgId = `bot_kw_${Date.now()}`;
                setLatestBotMsgId(newMsgId);
                setMessages(prev => [...prev, {
                    messageId: newMsgId,
                    senderId: BOT_USER.userId,
                    content: keywordMatch.reply,
                    actionUrl: keywordMatch.actionUrl,
                    actionLabel: keywordMatch.actionLabel,
                    timestamp: new Date().toISOString(),
                }]);
            } else {
                // Gemini AI: giữ typing indicator BẬT trong suốt thời gian chờ API
                // → tắt ngay khi response về → hiện message ngay lập tức (không có khoảng trống)
                const { text: aiText, actionUrl, actionLabel } = await getGeminiResponse(text, []);
                setIsBotTyping(false);
                const newMsgId = `bot_ai_${Date.now()}`;
                setLatestBotMsgId(newMsgId);
                setMessages(prev => [...prev, {
                    messageId: newMsgId,
                    senderId: BOT_USER.userId,
                    content: aiText,
                    actionUrl: actionUrl ?? null,
                    actionLabel: actionLabel ?? null,
                    timestamp: new Date().toISOString(),

                }]);
            }
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
            
            // Cập nhật roomList
            setRoomList(prevRooms => {
                const updated = prevRooms.map(r => r.chatRoomId === currentRoom.chatRoomId 
                    ? { ...r, lastMessage: text, lastMessageAt: saved.timestamp } 
                    : r);
                updated.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
                return updated;
            });
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
                
                // Cập nhật roomList
                setRoomList(prevRooms => {
                    const updated = prevRooms.map(r => r.chatRoomId === currentRoom.chatRoomId 
                        ? { ...r, lastMessage: "[Ảnh]", lastMessageAt: saved.timestamp } 
                        : r);
                    updated.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
                    return updated;
                });
                
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

    // ── Xử lý chọn file để gửi ─────────────────────────────────────────────────────────────
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

        // Optimistic clear unreadCount
        setRoomList(prev => prev.map(r => r.chatRoomId === room.chatRoomId ? { ...r, unreadCount: 0 } : r));
    };

    // ── Render ───────────────────────────────────────────────────────────────
    const showInput = (isGuest && chatPartner) || (chatPartner && (isPatient || isDoctor || isPharmacy));

    return (
        <>
            {/* Lightbox xem ảnh phóng to */}
            {lightboxImage && (
                <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
            )}

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
                        {(isDoctor || isPharmacy) && chatPartner && (
                            <button className="btn btn-sm btn-link text-decoration-none" onClick={() => { setChatPartner(null); setCurrentRoom(null); }}>
                                <i className="bi bi-arrow-left" style={{ fontSize: '1.3rem', color: 'black' }}></i>
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
                            {!isGuest && isPatient && chatPartner && `Chat with ${chatPartner.displayName}`}
                        </h5>
                        <button className="btn-close" onClick={() => setIsChatBoxOpen(false)} aria-label="Close"></button>
                    </div>

                    {/* Nội dung */}
                    <div className="flex-grow-1 p-3 overflow-y-auto hide-scrollbar" style={{ backgroundColor: '#f8f9fa' }}>
                        {/* Guest chỉ thấy Bot */}
                        {isGuest && chatPartner && (
                            <>
                                {messages.length === 0 && <p className="text-center text-muted">Say Hello to Bot!</p>}
                                {messages.map(msg => (
                                    <ChatMessage key={msg.messageId} message={msg} currentUserId="guest_temp"
                                        isNew={msg.messageId === latestBotMsgId}
                                        onImageClick={setLightboxImage} />
                                ))}
                                {isBotTyping && <TypingIndicator />}
                                <div ref={scrollTo}></div>
                            </>
                        )}

                        {/* Doctor: danh sách phòng hoặc tin nhắn */}
                        {!isGuest && isDoctor && (
                            <>
                                {!chatPartner ? (
                                    <ul className="list-group list-group-flush">
                                        {roomList.length === 0 && <li className="list-group-item">No message here.</li>}
                                        {roomList.map(room => (
                                            <RoomListItem key={room.chatRoomId} room={room} currentUserId={currentUserId} onSelect={selectRoom} />
                                        ))}
                                    </ul>
                                ) : (
                                    <>
                                        {loading && <p className="text-center text-muted">Loading messages...</p>}
                                        {messages.map(msg => (
                                            <ChatMessage key={msg.messageId} message={msg} currentUserId={currentUserId}
                                                isNew={msg.messageId === latestBotMsgId}
                                                onImageClick={setLightboxImage} />
                                        ))}
                                        {isBotTyping && <TypingIndicator />}
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
                                        {roomList.map(room => (
                                            <RoomListItem key={room.chatRoomId} room={room} currentUserId={currentUserId} onSelect={selectRoom} />
                                        ))}
                                    </ul>
                                ) : (
                                    <>
                                        {loading && <p className="text-center text-muted">Loading messages...</p>}
                                        {messages.map(msg => (
                                            <ChatMessage key={msg.messageId} message={msg} currentUserId={currentUserId}
                                                isNew={msg.messageId === latestBotMsgId}
                                                onImageClick={setLightboxImage} />
                                        ))}
                                        {isBotTyping && <TypingIndicator />}
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
                                {messages.map(msg => (
                                    <ChatMessage key={msg.messageId} message={msg} currentUserId={currentUserId}
                                        isNew={msg.messageId === latestBotMsgId}
                                        onImageClick={setLightboxImage} />
                                ))}
                                {isBotTyping && <TypingIndicator />}
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
                                <ul className="list-group list-group-flush hide-scrollbar" style={{ maxHeight: '300px', overflowY: 'auto' }}>
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
                                    {roomList.map(room => (
                                        <RoomListItem key={room.chatRoomId} room={room} currentUserId={currentUserId} onSelect={selectRoom} />
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Model chọn nhà thuốc (Patient) */}
                    {/* {isPatient && showPharmacyListModal && (
                        <div style={{ position: 'absolute', bottom: '80px', left: 0, right: 0, zIndex: 10, padding: '0 10px' }}>
                            <div className="card shadow-lg">
                                <div className="card-header d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0 fs-6">Choice Pharmacy</h5>
                                    <button className="btn-close" onClick={() => setShowPharmacyListModal(false)}></button>
                                </div>
                                <ul className="list-group list-group-flush" style={{ maxHeight: '300px', overflowY: 'auto' }}> */}
                                    {/* Các phòng chat đã có */}
                                    {/* {roomList.map(room => {
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
                    )}*/}
                </div>
            )}
        </>
    );
}