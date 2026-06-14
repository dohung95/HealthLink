import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { getOrCreateRoom, getMyRooms, getRoomMessages, sendMessage as apiSendMessage, markAsRead, uploadMedia } from '../api/chatApi';
import stompChatService from '../services/stompChatService';
import { getGeminiResponse } from '../services/geminiService';
import { checkKeywordAndGetBotReply, checkSymptomAndGetSpecialty, getDoctorsBySpecialty } from '../AI_BOT/BotBrain';
import { doctorService } from '../api/doctorApi';
import { toast } from 'sonner';

// ─── Bot cố định (chỉ dùng Gemini AI ở frontend, không lưu DB) ──────────────
const BOT_USER = {
    userId: 'support_bot_001',
    displayName: 'Bot Chat AI',
    photoURL: 'https://api.dicebear.com/8.x/bottts/svg?seed=support',
    isBot: true,
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
        </div>
    );
}

// ─── Component Lightbox xem ảnh phóng to ─────────────────────────────────────
/**
 * Hiển thị ảnh phóng to dạng overlay popup khi người dùng click vào ảnh trong chat.
 * @param {{ src: string, onClose: () => void }} props
 */
function ImageLightbox({ src, onClose }) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Đóng khi nhấn phím Escape
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const handleWheel = (e) => {
        const scaleAmount = -e.deltaY * 0.002;
        setScale(s => Math.min(Math.max(0.5, s + scaleAmount), 5));
    };

    const handleMouseDown = (e) => {
        if (scale > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <div
            onClick={onClose}
            onWheel={handleWheel}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                backgroundColor: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'msgFadeSlideIn 0.2s ease-out',
                overflow: 'hidden',
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
                    zIndex: 100000,
                }}
                title="Đóng (Esc)"
            >
                <i className="bi bi-x-lg" />
            </button>

            {/* Công cụ Zoom */}
            <div style={{
                position: 'absolute',
                bottom: '30px',
                display: 'flex',
                gap: '12px',
                background: 'rgba(0,0,0,0.5)',
                padding: '8px 16px',
                borderRadius: '30px',
                backdropFilter: 'blur(4px)',
                zIndex: 100000,
            }}>
                <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(s + 0.25, 5)); }} className="btn btn-sm btn-outline-light rounded-circle" style={{ width: 36, height: 36 }} title="Zoom In"><i className="bi bi-zoom-in"></i></button>
                <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(s - 0.25, 0.5)); }} className="btn btn-sm btn-outline-light rounded-circle" style={{ width: 36, height: 36 }} title="Zoom Out"><i className="bi bi-zoom-out"></i></button>
                <button onClick={(e) => { e.stopPropagation(); setScale(1); setPosition({ x: 0, y: 0 }); }} className="btn btn-sm btn-outline-light rounded-circle" style={{ width: 36, height: 36 }} title="Reset"><i className="bi bi-arrow-counterclockwise"></i></button>
            </div>

            {/* Ảnh phóng to */}
            <img
                src={src}
                alt="preview"
                onMouseDown={handleMouseDown}
                onClick={(e) => e.stopPropagation()}
                draggable="false"
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    objectFit: 'contain',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                    cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                    userSelect: 'none',
                }}
            />
        </div>
    );
}

// ─── Helper: xử lý URL tương đối ──────────────────────────────────────────────
const getFullUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('/')) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_SPRING_API_BASE_URL || 'http://localhost:8096';
        return `${baseUrl}${url}`;
    }
    return url;
};

// ─── Component tin nhắn ──────────────────────────────────────────────────────
/**
 * @param {{ message: object, currentUserId: string, isNew?: boolean, onImageClick?: (src: string) => void, onNavigate?: (url: string) => void }} props
 * isNew=true kích hoạt typewriter effect cho tin nhắn bot mới nhất
 */
function ChatMessage({ message, currentUserId, isNew = false, onImageClick, onNavigate }) {
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

    const imageUrl = getFullUrl(message.imageUrl);
    const videoUrl = getFullUrl(message.videoUrl);
    const fileUrl = getFullUrl(message.fileUrl);

    return (
        <div className={`chat-msg ${isOwn ? 'chat-msg--own' : 'chat-msg--other'}`}>
            <div className="chat-msg-bubble">
                    {/* image */}
                    {imageUrl && (
                        <img
                            src={imageUrl}
                            alt="sent"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '300px',
                                borderRadius: '8px',
                                display: 'block',
                                cursor: 'zoom-in',
                                transition: 'opacity 0.15s',
                            }}
                            onClick={() => onImageClick?.(imageUrl)}
                            title="click to zoom in"
                        />
                    )}
                    {/* video */}
                    {videoUrl && (
                        <video
                            src={videoUrl}
                            controls
                            style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', display: 'block' }}
                        />
                    )}
                    {/* link file */}
                    {fileUrl && (
                        <div
                            onClick={(e) => {
                                e.preventDefault();
                                const filename = fileUrl.split('/').pop();
                                fetch(fileUrl)
                                    .then(res => res.blob())
                                    .then(blob => {
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.style.display = 'none';
                                        a.href = url;
                                        a.download = filename;
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                    })
                                    .catch(err => {
                                        console.error('Download failed', err);
                                        window.open(fileUrl, '_blank');
                                    });
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: 'rgba(0,0,0,0.05)',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                marginTop: imageUrl || videoUrl ? '8px' : '0',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                            title="Click to download"
                        >
                            <i className="bi bi-file-earmark-arrow-down" style={{ fontSize: '24px', marginRight: '8px', color: isOwn ? '#fff' : '#0d6efd' }}></i>
                            <span style={{ color: 'inherit', textDecoration: 'none', fontWeight: '500', wordBreak: 'break-all' }}>
                                {fileUrl.split('/').pop()}
                            </span>
                        </div>
                    )}
                    {/* text */}
                    {fullText && (
                        <div style={{ marginTop: imageUrl || videoUrl || fileUrl ? '8px' : '0', whiteSpace: 'pre-wrap' }}>
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
                        </div>
                    )}

                    {/* Mini doctor cards nội bộ (gợi ý bác sĩ từ BotBrain offline) */}
                    {typewriterDone && message.suggestedDoctors?.length > 0 && (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {message.suggestedDoctors.map(doc => (
                                <div key={doc.doctorId}
                                    onClick={() => onNavigate?.(`/patient-dashboard/book/${doc.doctorId}`)}
                                    style={{
                                        background: '#fff',
                                        border: '1px solid #dee2e6',
                                        borderRadius: '12px',
                                        padding: '8px 12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        cursor: 'pointer',
                                        transition: 'box-shadow 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,176,154,0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                                >
                                    <img
                                        src={doc.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${doc.fullName}`}
                                        alt={doc.fullName}
                                        style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
                                    />
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#212529', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {doc.fullName}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                                            ⭐ {doc.averageRating?.toFixed(1) || 'N/A'} &nbsp;·&nbsp; {doc.specialtyName || doc.specialty}
                                        </div>
                                    </div>
                                    <i className="bi bi-chevron-right ms-auto text-muted" style={{ fontSize: '0.8rem' }} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Nút hành động (chỉ hiện sau khi typewriter hoàn tất) */}
                    {typewriterDone && message.actionUrl && message.actionLabel && (
                        <div style={{ marginTop: '8px', animation: 'msgFadeSlideIn 0.3s ease-out' }}>
                            <button
                                className="btn btn-sm btn-success"
                                onClick={() => onNavigate?.(message.actionUrl)}
                                style={{ borderRadius: '20px', fontSize: '0.85rem' }}
                            >
                                {message.actionLabel}
                            </button>
                        </div>
                    )}
                </div>
                <div className={`chat-msg-time`}>{timeStr}</div>
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
    const navigate = useNavigate();
    const { user: authUser, roles, currentUserId, initiateCall, isInCall } = useAuth();
    const {
        isChatOpen: isChatBoxOpen,
        setIsChatOpen: setIsChatBoxOpen,
        selectedChatPartner: chatPartner,
        setSelectedChatPartner: setChatPartner,
    } = useChat();

    const [formValue, setFormValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [roomList, setRoomList] = useState([]);   // danh sách phòng chat đã chat
    const [allDoctors, setAllDoctors] = useState([]);            // cache bác sĩ cho gợi ý offline
    const [loading, setLoading] = useState(false);
    const [currentRoom, setCurrentRoom] = useState(null); // ChatRoomDTO đang mở
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [showDoctorListModal, setShowDoctorListModal] = useState(false);
    const [stompConnected, setStompConnected] = useState(false);
    const [isBotTyping, setIsBotTyping] = useState(false);       // hiển thị typing indicator
    const [latestBotMsgId, setLatestBotMsgId] = useState(null); // đánh dấu tin nhắn bot mới nhất để kích hoạt typewriter
    const [lightboxImage, setLightboxImage] = useState(null);    // URL ảnh đang xem phóng to trong lightbox

    // ── States cho hiệu ứng icon thu/hiện ──────────────────────────────────────
    const [isIconHidden, setIsIconHidden] = useState(true);   // true = icon đang thu vào phải
    const [isShaking, setIsShaking] = useState(false);         // true = đang chạy animation lắc

    const scrollTo = useRef(null);
    const fileInputRef = useRef(null);
    const unsubscribeChat = useRef(null);

    // Dùng ref để trong hàm subscribeToChat (callback) lấy được giá trị mới nhất mà không cần tạo lại sub
    const currentRoomRef = useRef(currentRoom);
    useEffect(() => { currentRoomRef.current = currentRoom; }, [currentRoom]);

    const isChatBoxOpenRef = useRef(isChatBoxOpen);
    useEffect(() => { isChatBoxOpenRef.current = isChatBoxOpen; }, [isChatBoxOpen]);

    const isPatient = roles?.some(r => r.toLowerCase() === 'patient');
    const isDoctor = roles?.some(r => r.toLowerCase() === 'doctor');
    const isPharmacy = roles?.some(r => r.toLowerCase() === 'pharmacy');
    const isGuest = !authUser;

    const chatPartnerId = chatPartner?.userId || chatPartner?.uid;
    const chatPartnerName = chatPartner?.displayName || 'Patient';
    const canStartVideoFromChat = Boolean(
      isPharmacy
        && chatPartner
        && !chatPartner.isBot
        && currentRoom
        && chatPartnerId
    );

    /**
     * Điều hướng mượt mà (SPA) và tự động đóng/thu nhỏ chat popup.
     * Dùng cho cả nút action trong bubble và mini doctor cards.
     * @param {string} url - Đường dẫn cần điều hướng tới.
     */
    const handleBotNavigate = useCallback((url) => {
        if (!url) return;
        setIsChatBoxOpen(false); // Thu nhỏ chat popup
        navigate(url);           // Điều hướng SPA (không reload trang)
    }, [navigate, setIsChatBoxOpen]);

    // Load danh sách bác sĩ 1 lần khi chat bot mở → dùng cho gợi ý offline (0 token)
    useEffect(() => {
        if (allDoctors.length > 0) return; // Đã load rồi thì bỏ qua
        doctorService.getAllDoctors()
            .then(data => setAllDoctors(data || []))
            .catch(() => { }); // Lỗi thì im lặng, không ảnh hưởng UX
    }, []);

    // ── Hiệu ứng peek-and-shake mỗi 10 giây (khi icon đang đóng) ──────────────
    useEffect(() => {
        if (isChatBoxOpen) return; // Không cần khi chat đang mở
        const timer = setInterval(() => {
            // Bước 1: Trượt ra
            setIsIconHidden(false);
            setIsShaking(true);
            // Bước 2: Sau 3 giây → thu vào lại
            const hideTimer = setTimeout(() => {
                setIsShaking(false);
                setIsIconHidden(true);
            }, 3000);
            return () => clearTimeout(hideTimer);
        }, 10000);
        return () => clearInterval(timer);
    }, [isChatBoxOpen]);

    // ── Khi popup chat đóng → thu icon vào phải lại ─────────────────────────
    useEffect(() => {
        if (!isChatBoxOpen) {
            setIsIconHidden(true);
            setIsShaking(false);
        }
    }, [isChatBoxOpen]);

    // ── Đăng ký sự kiện Chat khi Component được render ────────────────────────────────
    useEffect(() => {
        if (!authUser) return;
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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

            // Sự kiện phòng bị chặn/bỏ chặn
            if (newMsg.content === "[SYSTEM_BLOCK_UPDATE]") {
                getMyRooms().then(rooms => {
                    setRoomList(rooms);
                    const activeRoomId = currentRoomRef.current?.chatRoomId;
                    if (activeRoomId === newMsg.chatRoomId) {
                        const updatedRoom = rooms.find(r => r.chatRoomId === activeRoomId);
                        if (updatedRoom) setCurrentRoom(updatedRoom);
                    }
                }).catch(err => console.error(err));
                return; // KHÔNG hiển thị tin nhắn hệ thống
            }

            const activeRoomId = currentRoomRef.current?.chatRoomId;
            const isRoomActive = activeRoomId === newMsg.chatRoomId && isChatBoxOpenRef.current;

            // 1. Chỉ thêm tin nhắn vào màn hình chat nếu đang mở đúng phòng đó
            if (activeRoomId === newMsg.chatRoomId) {
                setMessages(prev => {
                    // Tránh duplicate nếu cùng messageId
                    if (prev.some(m => m.messageId === newMsg.messageId)) return prev;

                    // Xử lý race condition: STOMP tới trước REST
                    if (newMsg.senderId === currentUserId) {
                        const tempIndex = prev.findIndex(m => m.messageId.startsWith('temp_') && m.content === newMsg.content);
                        if (tempIndex !== -1) {
                            const newArr = [...prev];
                            newArr[tempIndex] = newMsg;
                            return newArr;
                        }
                    }

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
                await markAsRead(currentRoom.chatRoomId).catch(() => { });
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
        if (scrollTo.current) {
            // Sử dụng block: 'nearest' để tránh lỗi cuộn toàn bộ trang web (body) xuống theo
            scrollTo.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
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
            setIsBotTyping(true); // bật typing indicator

            // Bước 1: Kiểm tra keyword nội bộ (Tier 1 - offline, 0 token)
            const keywordMatch = checkKeywordAndGetBotReply(text);
            if (keywordMatch) {
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
                // Bước 2: Kiểm tra triệu chứng → gợi ý chuyên khoa + bác sĩ (Tier 1.5 - offline, 0 token)
                const specialtyMatch = checkSymptomAndGetSpecialty(text);
                if (specialtyMatch) {
                    const suggestedDoctors = getDoctorsBySpecialty(allDoctors, specialtyMatch.specialty, 3);

                    // Detect ngôn ngữ nhanh
                    const hasVI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text);
                    const hasID = /saya|aku|sakit|demam|batuk|pusing|dokter/i.test(text.toLowerCase());
                    const lang = hasVI ? 'vi' : hasID ? 'id' : 'en';

                    const specialtyName = specialtyMatch.label[lang] || specialtyMatch.label.en;
                    const replyText = lang === 'vi'
                        ? `${specialtyMatch.icon} Dựa trên triệu chứng bạn mô tả, mình gợi ý bạn nên khám chuyên khoa **${specialtyName}**! Dưới đây là một số bác sĩ phù hợp:`
                        : lang === 'id'
                            ? `${specialtyMatch.icon} Berdasarkan gejala yang kamu ceritakan, aku sarankan periksa ke spesialis **${specialtyName}**! Berikut beberapa dokter yang bisa membantu:`
                            : `${specialtyMatch.icon} Based on your symptoms, I recommend seeing a **${specialtyName}** specialist! Here are some available doctors:`;

                    await new Promise(r => setTimeout(r, 700));
                    setIsBotTyping(false);
                    const newMsgId = `bot_sp_${Date.now()}`;
                    setLatestBotMsgId(newMsgId);
                    setMessages(prev => [...prev, {
                        messageId: newMsgId,
                        senderId: BOT_USER.userId,
                        content: replyText,
                        suggestedDoctors: suggestedDoctors,
                        actionUrl: `/schedule?specialty=${encodeURIComponent(specialtyMatch.specialty)}`,
                        actionLabel: lang === 'vi' ? `📅 Xem tất cả bác sĩ ${specialtyName}` : lang === 'id' ? `📅 Lihat semua dokter ${specialtyName}` : `📅 View all ${specialtyName} doctors`,
                        timestamp: new Date().toISOString(),
                    }]);
                    return;
                }

                // Bước 3: Gemini AI (Tier 2 - gọi API, tốn token) - chỉ khi câu hỏi phức tạp
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

            // Thay optimistic bằng tin nhắn thật, tránh duplicate với STOMP
            setMessages(prev => {
                if (prev.some(m => m.messageId === saved.messageId)) {
                    return prev.filter(m => m.messageId !== optimistic.messageId);
                }
                return prev.map(m => m.messageId === optimistic.messageId ? saved : m);
            });

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

    // ── Gửi đính kèm (Ảnh, Video, File) ─────────────────────────────────────────────────────────────
    const sendMedia = async () => {
        if (!selectedFile || !currentRoom || isGuest) return;
        if (chatPartner?.isBot) { toast.info('You cannot send media to Bot!'); return; }

        setUploading(true);
        try {
            // Xác định type
            const mimeType = selectedFile.type;
            let type = 'file';
            let requestPayload = { chatRoomId: currentRoom.chatRoomId, receiverId: chatPartner.userId || chatPartner.uid };
            let previewText = '[Tệp đính kèm]';

            if (mimeType.startsWith('image/')) {
                type = 'image';
                previewText = '[Ảnh]';
            } else if (mimeType.startsWith('video/')) {
                type = 'video';
                previewText = '[Video]';
            }

            // Gọi API upload
            const response = await uploadMedia(currentRoom.chatRoomId, type, selectedFile);
            const fileUrl = response.url;

            // Gắn URL vào request
            if (type === 'image') {
                requestPayload.imageUrl = fileUrl;
            } else if (type === 'video') {
                requestPayload.videoUrl = fileUrl;
            } else {
                requestPayload.fileUrl = fileUrl;
            }

            // Gửi tin nhắn
            const saved = await apiSendMessage(requestPayload);
            setMessages(prev => {
                if (prev.some(m => m.messageId === saved.messageId)) return prev;
                return [...prev, saved];
            });

            // Cập nhật roomList
            setRoomList(prevRooms => {
                const updated = prevRooms.map(r => r.chatRoomId === currentRoom.chatRoomId
                    ? { ...r, lastMessage: previewText, lastMessageAt: saved.timestamp }
                    : r);
                updated.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
                return updated;
            });

            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            console.error(err);
            toast.error('Failed to send file!');
        } finally {
            setUploading(false);
        }
    };

    // ── Xử lý chọn file để gửi ─────────────────────────────────────────────────────────────
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        // Limit file size to 20MB
        if (file.size > 20 * 1024 * 1024) {
            toast.info('File max size is 20MB!');
            return;
        }
        setSelectedFile(file);
    };

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                if (chatPartner?.isBot) { toast.info('You cannot send media to Bot!'); return; }
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file && file.size <= 20 * 1024 * 1024) {
                    setSelectedFile(file);
                } else {
                    toast.info('File max size is 20MB!');
                }
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

    const handleVideoCallFromChat = () => {
      if (!canStartVideoFromChat) {
        toast.error('Open a patient conversation before starting a video call.');
        return;
      }

      if (isInCall) {
        toast.warning('You are currently on another call. Please end it before making a new one.');
        return;
      }

      const callerName = authUser?.preferred_username
        || authUser?.email
        || authUser?.sub
        || 'Pharmacy';

      initiateCall(
        chatPartnerId,
        currentRoom.chatRoomId,
        chatPartnerName,
        callerName,
      );
    };

    // ── Render ───────────────────────────────────────────────────────────────
    const isBlocked = currentRoom && currentRoom.blockedBy;
    const isBlockedByMe = isBlocked && currentRoom.blockedBy === currentUserId;
    const showInput = ((isGuest && chatPartner) || (chatPartner && (isPatient || isDoctor || isPharmacy))) && !isBlocked;
    const totalUnread = roomList.reduce((acc, room) => acc + (room.unreadCount || 0), 0);

    return (
        <>
            {/* Lightbox xem ảnh phóng to */}
            {lightboxImage && (
                <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
            )}

            {/* Floating chat button */}
            <div className="chat-float-wrapper">
              <button
                className={
                  `chat-float-button${!isChatBoxOpen && isShaking ? ' chat-float-button--shaking' : ''}${isChatBoxOpen ? ' chat-float-button--hidden' : ''}`
                }
                onClick={() => { setIsChatBoxOpen(prev => !prev); setIsIconHidden(false); setIsShaking(false); }}
                title={isChatBoxOpen ? 'Close chat' : 'Open chat'}
              >
                <i className={`bi ${isChatBoxOpen ? 'bi-x-lg' : 'bi-chat-dots-fill'}`} style={{ fontSize: '1.3rem' }} />
                {!isChatBoxOpen && totalUnread > 0 && (
                  <span className="chat-float-badge">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </button>
            </div>

            {/* Chat Box */}
            {isChatBoxOpen && (
              <div className="chat-box">
                {/* Header */}
                <div className="chat-box-header">
                  <div className="chat-box-header-left">
                    {(isDoctor || isPharmacy) && chatPartner && (
                      <button
                        className="chat-box-header-back"
                        onClick={() => { setChatPartner(null); setCurrentRoom(null); }}
                      >
                        <i className="bi bi-arrow-left" />
                      </button>
                    )}
                    <h5 className="chat-box-header-title">
                      {isGuest && chatPartner && `Chat with ${chatPartner.displayName}`}
                      {!isGuest && isDoctor && !chatPartner && 'Patients'}
                      {!isGuest && isDoctor && chatPartner && chatPartner.displayName}
                      {!isGuest && isPharmacy && !chatPartner && 'Patients'}
                      {!isGuest && isPharmacy && chatPartner && chatPartner.displayName}
                      {!isGuest && isPatient && chatPartner && chatPartner.displayName}
                    </h5>
                  </div>
                  <div className="chat-box-header-actions">
                    {canStartVideoFromChat && (
                      <button
                        className="chat-box-header-btn"
                        onClick={handleVideoCallFromChat}
                        title="Start video call"
                      >
                        <i className="bi bi-camera-video" />
                      </button>
                    )}
                    <button
                      className="chat-box-header-btn"
                      onClick={() => setIsChatBoxOpen(false)}
                      title="Close"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="chat-messages">
                  {isGuest && chatPartner && (
                    <>
                      {messages.length === 0 && (
                        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', padding: '24px 0' }}>
                          Say hello to start chatting
                        </p>
                      )}
                      {messages.map(msg => (
                        <ChatMessage key={msg.messageId} message={msg} currentUserId="guest_temp"
                          isNew={msg.messageId === latestBotMsgId}
                          onImageClick={setLightboxImage}
                          onNavigate={handleBotNavigate} />
                      ))}
                      {isBotTyping && <TypingIndicator />}
                      <div ref={scrollTo} />
                    </>
                  )}

                  {!isGuest && isDoctor && (
                    <>
                      {!chatPartner ? (
                        <>
                          {roomList.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', padding: '24px 0' }}>
                              No conversations yet
                            </p>
                          )}
                          {roomList.map(room => (
                            <RoomListItem key={room.chatRoomId} room={room} currentUserId={currentUserId} onSelect={selectRoom} />
                          ))}
                        </>
                      ) : (
                        <>
                          {loading && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', padding: '24px 0' }}>Loading...</p>}
                          {messages.map(msg => (
                            <ChatMessage key={msg.messageId} message={msg} currentUserId={currentUserId}
                              isNew={msg.messageId === latestBotMsgId}
                              onImageClick={setLightboxImage}
                              onNavigate={handleBotNavigate} />
                          ))}
                          {isBotTyping && <TypingIndicator />}
                          <div ref={scrollTo} />
                        </>
                      )}
                    </>
                  )}

                  {!isGuest && isPharmacy && (
                    <>
                      {!chatPartner ? (
                        <>
                          {roomList.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', padding: '24px 0' }}>
                              No conversations yet
                            </p>
                          )}
                          {roomList.map(room => (
                            <RoomListItem key={room.chatRoomId} room={room} currentUserId={currentUserId} onSelect={selectRoom} />
                          ))}
                        </>
                      ) : (
                        <>
                          {loading && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', padding: '24px 0' }}>Loading...</p>}
                          {messages.map(msg => (
                            <ChatMessage key={msg.messageId} message={msg} currentUserId={currentUserId}
                              isNew={msg.messageId === latestBotMsgId}
                              onImageClick={setLightboxImage}
                              onNavigate={handleBotNavigate} />
                          ))}
                          {isBotTyping && <TypingIndicator />}
                          <div ref={scrollTo} />
                        </>
                      )}
                    </>
                  )}

                  {!isGuest && isPatient && chatPartner && (
                    <>
                      {loading && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', padding: '24px 0' }}>Loading...</p>}
                      {messages.length === 0 && !loading && (
                        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', padding: '24px 0' }}>
                          No messages yet
                        </p>
                      )}
                      {messages.map(msg => (
                        <ChatMessage key={msg.messageId} message={msg} currentUserId={currentUserId}
                          isNew={msg.messageId === latestBotMsgId}
                          onImageClick={setLightboxImage}
                          onNavigate={handleBotNavigate} />
                      ))}
                      {isBotTyping && <TypingIndicator />}
                      <div ref={scrollTo} />
                    </>
                  )}
                </div>

                {/* Input */}
                {isBlocked ? (
                  <div className="chat-input-area">
                    <p style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', margin: 0, fontSize: '0.85rem' }}>
                      {isBlockedByMe ? 'You blocked this user.' : 'You cannot reply to this conversation.'}
                    </p>
                  </div>
                ) : showInput && (
                  <div className="chat-input-area">
                    {selectedFile && (
                      <div className="chat-file-preview">
                        {selectedFile.type.startsWith('image/') ? (
                          <img src={URL.createObjectURL(selectedFile)} alt="" />
                        ) : selectedFile.type.startsWith('video/') ? (
                          <div className="chat-file-preview-icon">
                            <i className="bi bi-camera-video" />
                          </div>
                        ) : (
                          <div className="chat-file-preview-icon">
                            <i className="bi bi-file-earmark-text" />
                          </div>
                        )}
                        <span className="chat-file-preview-name">{selectedFile.name}</span>
                        <button
                          className="chat-file-preview-remove"
                          onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        >
                          <i className="bi bi-x" />
                        </button>
                      </div>
                    )}
                    <form className="chat-input-row" onSubmit={sendMsg}>
                      {!isGuest && isPatient && (
                        <button
                          type="button"
                          className="chat-input-btn chat-input-btn--attach"
                          onClick={() => setShowDoctorListModal(true)}
                          title="Choose doctor"
                        >
                          <i className="bi bi-person-lines-fill" />
                        </button>
                      )}
                      {!isGuest && !chatPartner?.isBot && (
                        <>
                          <input type="file" ref={fileInputRef} accept="*/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                          <button
                            type="button"
                            className="chat-input-btn chat-input-btn--attach"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            title="Attach file"
                          >
                            <i className="bi bi-paperclip" />
                          </button>
                        </>
                      )}
                      <input
                        type="text"
                        className="chat-input-field"
                        value={formValue}
                        onChange={e => setFormValue(e.target.value)}
                        onPaste={handlePaste}
                        placeholder="Type a message..."
                        disabled={uploading}
                      />
                      <button
                        type="submit"
                        className="chat-input-btn chat-input-btn--send"
                        disabled={!formValue.trim() || uploading}
                      >
                        <i className="bi bi-send-fill" style={{ fontSize: '0.95rem' }} />
                      </button>
                    </form>
                  </div>
                )}

                {/* Doctor select modal */}
                {isPatient && showDoctorListModal && (
                  <div className="chat-doctor-modal">
                    <div className="chat-doctor-modal-header">
                      <h5 className="chat-doctor-modal-title">Select a doctor</h5>
                      <button className="chat-box-header-btn" onClick={() => setShowDoctorListModal(false)}>
                        <i className="bi bi-x-lg" />
                      </button>
                    </div>
                    <div className="chat-doctor-modal-list">
                      {roomList.map(room => (
                        <RoomListItem key={room.chatRoomId} room={room} currentUserId={currentUserId} onSelect={(r) => { selectRoom(r); setShowDoctorListModal(false); }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
        </>
    );
}