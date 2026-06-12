import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrCreateRoom, getMyRooms, getRoomMessages, sendMessage as apiSendMessage, markAsRead, uploadMedia } from '../api/chatApi';
import stompChatService from '../services/stompChatService';
import { getGeminiResponse } from '../services/geminiService';
import { checkKeywordAndGetBotReply, checkSymptomAndGetSpecialty, getDoctorsBySpecialty } from '../AI_BOT/BotBrain';
import { doctorService } from '../api/doctorApi';
import { toast } from 'sonner';

// ─── Bot cố định ──────────────
const BOT_USER = {
    userId: 'support_bot_001',
    displayName: 'HealthLink AI Bot',
    photoURL: 'https://api.dicebear.com/8.x/bottts/svg?seed=support',
    isBot: true,
};

// ─── Helper functions ────────────────────────────────────────────────
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

const getFullUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('/')) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_SPRING_API_BASE_URL || 'http://localhost:8096';
        return `${baseUrl}${url}`;
    }
    return url;
};

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
function ImageLightbox({ src, onClose }) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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
                position: 'fixed', inset: 0, zIndex: 99999,
                backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                animation: 'msgFadeSlideIn 0.2s ease-out', overflow: 'hidden',
            }}
        >
            <button onClick={onClose} style={{
                position: 'absolute', top: '16px', right: '20px',
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff', fontSize: '1.2rem', zIndex: 100000,
            }}>
                <i className="bi bi-x-lg" />
            </button>
            <div style={{
                position: 'absolute', bottom: '30px', display: 'flex', gap: '12px',
                background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: '30px', zIndex: 100000,
            }}>
                <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(s + 0.25, 5)); }} className="btn btn-sm btn-outline-light rounded-circle" style={{ width: 36, height: 36 }}><i className="bi bi-zoom-in"></i></button>
                <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(s - 0.25, 0.5)); }} className="btn btn-sm btn-outline-light rounded-circle" style={{ width: 36, height: 36 }}><i className="bi bi-zoom-out"></i></button>
                <button onClick={(e) => { e.stopPropagation(); setScale(1); setPosition({ x: 0, y: 0 }); }} className="btn btn-sm btn-outline-light rounded-circle" style={{ width: 36, height: 36 }}><i className="bi bi-arrow-counterclockwise"></i></button>
            </div>
            <img src={src} alt="preview" onMouseDown={handleMouseDown} onClick={(e) => e.stopPropagation()} draggable="false"
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                    maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.6)', cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default', userSelect: 'none',
                }}
            />
        </div>
    );
}

// ─── Component tin nhắn ──────────────────────────────────────────────────────
function ChatMessage({ message, currentUserId, isNew = false, onImageClick, onNavigate }) {
    const isOwn = message.senderId === currentUserId || message.uid === currentUserId;
    const fullText = message.content || message.text || '';
    const [displayText, setDisplayText] = useState(isNew ? '' : fullText);
    const [typewriterDone, setTypewriterDone] = useState(!isNew);

    useEffect(() => {
        if (!isNew || !fullText) return;
        let i = 0;
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
    }, [isNew, fullText]);

    const timeStr = message.timestamp
        ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
        : (message.createdAt ? formatTime(message.createdAt) : '...');

    const imageUrl = getFullUrl(message.imageUrl);
    const videoUrl = getFullUrl(message.videoUrl);
    const fileUrl = getFullUrl(message.fileUrl);

    return (
        <div className={`message d-flex mb-3 ${isOwn ? 'justify-content-end' : 'justify-content-start'}`} style={{ animation: 'msgFadeSlideIn 0.25s ease-out' }}>
            <div style={{ maxWidth: '78%' }}>
                <div className={`p-3 rounded ${isOwn ? 'bg-primary text-white shadow-sm' : 'bg-white text-dark shadow-sm border'}`}
                    style={{ borderRadius: imageUrl ? '12px' : '20px', padding: imageUrl ? '4px' : '12px 16px' }}>
                    {imageUrl && (
                        <img src={imageUrl} alt="sent" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', cursor: 'zoom-in' }}
                            onClick={() => onImageClick?.(imageUrl)} title="Click để xem ảnh phóng to" />
                    )}
                    {videoUrl && <video src={videoUrl} controls style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />}
                    {fileUrl && (
                        <div onClick={(e) => {
                            e.preventDefault();
                            const filename = fileUrl.split('/').pop();
                            fetch(fileUrl).then(res => res.blob()).then(blob => {
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.style.display = 'none';
                                a.href = url;
                                a.download = filename;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                            }).catch(() => window.open(fileUrl, '_blank'));
                        }} style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.05)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>
                            <i className="bi bi-file-earmark-arrow-down" style={{ fontSize: '24px', marginRight: '8px', color: isOwn ? '#fff' : '#0d6efd' }}></i>
                            <span style={{ color: 'inherit', wordBreak: 'break-all' }}>{fileUrl.split('/').pop()}</span>
                        </div>
                    )}
                    {fullText && (
                        <div style={{ marginTop: imageUrl || videoUrl || fileUrl ? '8px' : '0', whiteSpace: 'pre-wrap' }}>
                            {displayText}
                            {isNew && !typewriterDone && <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'currentColor', marginLeft: 2, animation: 'cursorBlink 0.7s steps(1) infinite' }} />}
                        </div>
                    )}
                    {typewriterDone && message.suggestedDoctors?.length > 0 && (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {message.suggestedDoctors.map(doc => (
                                <div key={doc.doctorId} onClick={() => onNavigate?.(`/patient-dashboard/book/${doc.doctorId}`)}
                                    style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: '12px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#212529' }}>
                                    <img src={doc.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${doc.fullName}`} alt={doc.fullName} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.fullName}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>⭐ {doc.averageRating?.toFixed(1) || 'N/A'} · {doc.specialtyName || doc.specialty}</div>
                                    </div>
                                    <i className="bi bi-chevron-right ms-auto text-muted" style={{ fontSize: '0.8rem' }} />
                                </div>
                            ))}
                        </div>
                    )}
                    {typewriterDone && message.actionUrl && message.actionLabel && (
                        <div style={{ marginTop: '12px' }}>
                            <button className="btn btn-sm btn-success rounded-pill px-3" onClick={() => onNavigate?.(message.actionUrl)}>
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

// ─── Danh sách phòng chat ───────────────────────────────────────────────
function RoomListItem({ room, currentUserId, onSelect, isActive }) {
    const name = room.user1Id === currentUserId ? room.user2DisplayName : room.user1DisplayName;
    const photo = room.user1Id === currentUserId ? room.user2PhotoURL : room.user1PhotoURL;
    const isUnread = room.unreadCount > 0;

    return (
        <li onClick={() => onSelect(room)}
            className={`list-group-item list-group-item-action d-flex align-items-center border-0 mb-1 rounded ${isActive ? 'bg-primary text-white shadow-sm' : isUnread ? 'bg-light' : 'bg-transparent'}`}
            style={{ cursor: 'pointer', padding: '12px 15px' }}>
            <img src={photo || `https://api.dicebear.com/8.x/initials/svg?seed=${name}`} alt="ava"
                className="rounded-circle me-3 border" style={{ width: 45, height: 45, flexShrink: 0, objectFit: 'cover', background: '#fff' }} />
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className={`fw-bold text-truncate ${isActive ? 'text-white' : isUnread ? 'text-dark' : ''}`}>{name}</div>
                {room.lastMessage && (
                    <small className={`text-truncate d-block ${isActive ? 'text-white-50' : isUnread ? 'fw-bold text-dark' : 'text-muted'}`}>
                        {room.lastMessage}
                    </small>
                )}
            </div>
            <div className="d-flex flex-column align-items-end ms-2">
                {room.lastMessageAt && (
                    <small className={`mb-1 ${isActive ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {formatRelative(room.lastMessageAt)}
                    </small>
                )}
                {isUnread && !isActive && (
                    <span className="badge rounded-pill bg-danger shadow-sm" style={{ fontSize: '0.7rem' }}>
                        {room.unreadCount > 99 ? '99+' : room.unreadCount}
                    </span>
                )}
            </div>
        </li>
    );
}

// ─── Main Component: PatientChatPage ──────────────────────────────────────────
export default function PatientChatPage() {
    const navigate = useNavigate();
    const { user: authUser, currentUserId } = useAuth();

    const [chatPartner, setChatPartner] = useState(BOT_USER);
    const [currentRoom, setCurrentRoom] = useState(null);

    const [formValue, setFormValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [roomList, setRoomList] = useState([]);
    const [allDoctors, setAllDoctors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [latestBotMsgId, setLatestBotMsgId] = useState(null);
    const [lightboxImage, setLightboxImage] = useState(null);

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const chatContainerRef = useRef(null);
    const shouldScrollToBottomRef = useRef(true);

    const scrollTo = useRef(null);
    const fileInputRef = useRef(null);
    const unsubscribeChat = useRef(null);
    const currentRoomRef = useRef(currentRoom);

    useEffect(() => { currentRoomRef.current = currentRoom; }, [currentRoom]);

    const handleBotNavigate = useCallback((url) => {
        if (!url) return;
        navigate(url);
    }, [navigate]);

    useEffect(() => {
        if (allDoctors.length > 0) return;
        doctorService.getAllDoctors()
            .then(data => setAllDoctors(data || []))
            .catch(() => { });
    }, []);

    // Stomp connection
    useEffect(() => {
        if (!authUser) return;
        const unsub = stompChatService.subscribeToChat((newMsg) => {
            if (newMsg.messageId === "ROOM_CREATED") {
                setRoomList(prev => {
                    if (!prev.some(r => r.chatRoomId === newMsg.chatRoomId)) {
                        getMyRooms().then(rooms => setRoomList(rooms)).catch(err => console.error(err));
                    }
                    return prev;
                });
                return;
            }

            if (newMsg.content === "[SYSTEM_BLOCK_UPDATE]") {
                getMyRooms().then(rooms => {
                    setRoomList(rooms);
                    const activeRoomId = currentRoomRef.current?.chatRoomId;
                    if (activeRoomId === newMsg.chatRoomId) {
                        const updatedRoom = rooms.find(r => r.chatRoomId === activeRoomId);
                        if (updatedRoom) setCurrentRoom(updatedRoom);
                    }
                }).catch(err => console.error(err));
                return;
            }

            const activeRoomId = currentRoomRef.current?.chatRoomId;
            const isRoomActive = activeRoomId === newMsg.chatRoomId;

            if (isRoomActive) {
                shouldScrollToBottomRef.current = true;
                setMessages(prev => {
                    if (prev.some(m => m.messageId === newMsg.messageId)) return prev;
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
                markAsRead(newMsg.chatRoomId)
                    .then(() => window.dispatchEvent(new CustomEvent('chat-read-updated')))
                    .catch(() => { });
            }

            setRoomList(prevRooms => {
                const isNewRoom = !prevRooms.some(r => r.chatRoomId === newMsg.chatRoomId);
                if (isNewRoom) {
                    getMyRooms().then(rooms => setRoomList(rooms)).catch(() => { });
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

                updated.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
                return updated;
            });
        });
        unsubscribeChat.current = unsub;
        return () => { if (unsubscribeChat.current) unsubscribeChat.current(); };
    }, [authUser, currentUserId]);

    // Load rooms
    useEffect(() => {
        if (!authUser) return;
        getMyRooms().then(rooms => setRoomList(rooms)).catch(() => { });
    }, [authUser]);

    // Load room messages
    useEffect(() => {
        if (!currentRoom) {
            setMessages([]);
            setPage(0);
            setHasMore(true);
            return;
        }
        setLoading(true);
        setPage(0);
        setHasMore(true);
        shouldScrollToBottomRef.current = true;
        getRoomMessages(currentRoom.chatRoomId, 0, 25).then(msgs => {
            setMessages(msgs);
            if (msgs.length < 25) {
                setHasMore(false);
            }
            return markAsRead(currentRoom.chatRoomId)
                .then(res => {
                    setRoomList(prevRooms => prevRooms.map(room => {
                        if (room.chatRoomId === currentRoom.chatRoomId) {
                            return { ...room, unreadCount: 0 };
                        }
                        return room;
                    }));
                    window.dispatchEvent(new CustomEvent('chat-read-updated'));
                    return res;
                });
        }).catch(() => { }).finally(() => setLoading(false));
    }, [currentRoom]);

    // Set partner -> open room
    useEffect(() => {
        if (!chatPartner || chatPartner.isBot) {
            if (chatPartner?.isBot) {
                setCurrentRoom(null);
            }
            return;
        }
        const partnerId = chatPartner.userId || chatPartner.uid;
        if (!partnerId || !currentUserId) return;

        getOrCreateRoom(partnerId).then(room => {
            setCurrentRoom(room);
            setRoomList(prev => !prev.some(r => r.chatRoomId === room.chatRoomId) ? [room, ...prev] : prev);
        }).catch(() => toast.error('Cannot open room!'));
    }, [chatPartner, currentUserId]);

    const loadMoreMessages = useCallback(() => {
        if (!currentRoom || loadingMore || !hasMore) return;
        setLoadingMore(true);
        shouldScrollToBottomRef.current = false;
        const nextPage = page + 1;
        const container = chatContainerRef.current;
        const previousScrollHeight = container ? container.scrollHeight : 0;

        getRoomMessages(currentRoom.chatRoomId, nextPage, 25)
            .then(newMsgs => {
                if (newMsgs.length > 0) {
                    setMessages(prev => [...newMsgs, ...prev]);
                    setPage(nextPage);
                    if (newMsgs.length < 25) {
                        setHasMore(false);
                    }
                    setTimeout(() => {
                        if (container) {
                            const newScrollHeight = container.scrollHeight;
                            container.scrollTop = newScrollHeight - previousScrollHeight;
                        }
                    }, 0);
                } else {
                    setHasMore(false);
                }
            })
            .catch(() => { })
            .finally(() => setLoadingMore(false));
    }, [currentRoom, page, hasMore, loadingMore]);

    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop } = chatContainerRef.current;
        if (scrollTop === 0 && hasMore && !loading && !loadingMore && currentRoom) {
            loadMoreMessages();
        }
    };

    useEffect(() => {
        if (shouldScrollToBottomRef.current && scrollTo.current) {
            scrollTo.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [messages, isBotTyping]);

    const sendMsg = async (e) => {
        e.preventDefault();
        if (!formValue.trim() || !chatPartner) return;
        shouldScrollToBottomRef.current = true;
        const text = formValue.trim();
        setFormValue('');

        const optimistic = {
            messageId: `temp_${Date.now()}`,
            senderId: currentUserId || 'guest_temp',
            content: text,
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);

        if (chatPartner.isBot) {
            setIsBotTyping(true);
            const keywordMatch = checkKeywordAndGetBotReply(text);
            if (keywordMatch) {
                await new Promise(r => setTimeout(r, 600));
                setIsBotTyping(false);
                const newMsgId = `bot_kw_${Date.now()}`;
                setLatestBotMsgId(newMsgId);
                setMessages(prev => [...prev, {
                    messageId: newMsgId, senderId: BOT_USER.userId,
                    content: keywordMatch.reply, actionUrl: keywordMatch.actionUrl, actionLabel: keywordMatch.actionLabel,
                    timestamp: new Date().toISOString(),
                }]);
            } else {
                const specialtyMatch = checkSymptomAndGetSpecialty(text);
                if (specialtyMatch) {
                    const suggestedDoctors = getDoctorsBySpecialty(allDoctors, specialtyMatch.specialty, 3);
                    const hasVI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text);
                    const hasID = /saya|aku|sakit|demam|batuk|pusing|dokter/i.test(text.toLowerCase());
                    const lang = hasVI ? 'vi' : hasID ? 'id' : 'en';
                    const specialtyName = specialtyMatch.label[lang] || specialtyMatch.label.en;
                    const replyText = lang === 'vi' ? `${specialtyMatch.icon} Based on your symptoms, I recommend seeing a **${specialtyName}** specialist! Here are some available doctors:` : lang === 'id' ? `${specialtyMatch.icon} Berdasarkan gejala yang kamu ceritakan, aku sarankan periksa ke spesialis **${specialtyName}**! Berikut beberapa dokter yang bisa membantu:` : `${specialtyMatch.icon} Based on your symptoms, I recommend seeing a **${specialtyName}** specialist! Here are some available doctors:`;

                    await new Promise(r => setTimeout(r, 700));
                    setIsBotTyping(false);
                    const newMsgId = `bot_sp_${Date.now()}`;
                    setLatestBotMsgId(newMsgId);
                    setMessages(prev => [...prev, {
                        messageId: newMsgId, senderId: BOT_USER.userId,
                        content: replyText, suggestedDoctors: suggestedDoctors,
                        actionUrl: `/patient-dashboard/booking?specialty=${encodeURIComponent(specialtyMatch.specialty)}`,
                        actionLabel: lang === 'vi' ? `📅 View available doctors` : lang === 'id' ? `📅 Lihat semua dokter ${specialtyName}` : `📅 View all ${specialtyName} doctors`,
                        timestamp: new Date().toISOString(),
                    }]);
                    return;
                }

                const { text: aiText, actionUrl, actionLabel } = await getGeminiResponse(text, []);
                setIsBotTyping(false);
                const newMsgId = `bot_ai_${Date.now()}`;
                setLatestBotMsgId(newMsgId);
                setMessages(prev => [...prev, {
                    messageId: newMsgId, senderId: BOT_USER.userId,
                    content: aiText, actionUrl, actionLabel,
                    timestamp: new Date().toISOString(),
                }]);
            }
        } else {
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
                setMessages(prev => {
                    if (prev.some(m => m.messageId === saved.messageId)) {
                        return prev.filter(m => m.messageId !== optimistic.messageId);
                    }
                    return prev.map(m => m.messageId === optimistic.messageId ? saved : m);
                });
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
        }
    };

    const sendMedia = async () => {
        if (!selectedFile || !currentRoom) return;
        setUploading(true);
        shouldScrollToBottomRef.current = true;
        try {
            const mimeType = selectedFile.type;
            let type = 'file';
            let requestPayload = {
                chatRoomId: currentRoom.chatRoomId,
                receiverId: chatPartner.userId || chatPartner.uid
            };
            let previewText = '[Tệp đính kèm]';

            if (mimeType.startsWith('image/')) {
                type = 'image';
                previewText = '[Ảnh]';
            } else if (mimeType.startsWith('video/')) {
                type = 'video';
                previewText = '[Video]';
            }

            const response = await uploadMedia(currentRoom.chatRoomId, type, selectedFile);
            const fileUrl = response.url;

            if (type === 'image') {
                requestPayload.imageUrl = fileUrl;
            } else if (type === 'video') {
                requestPayload.videoUrl = fileUrl;
            } else {
                requestPayload.fileUrl = fileUrl;
            }

            const saved = await apiSendMessage(requestPayload);
            setMessages(prev => {
                if (prev.some(m => m.messageId === saved.messageId)) return prev;
                return [...prev, saved];
            });

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
            console.error('Upload/Send failed:', err);
            toast.error('Failed to send file!');
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const maxMB = 10;
        if (file.size > maxMB * 1024 * 1024) {
            toast.error(`File is too large (max ${maxMB}MB)`);
            e.target.value = '';
            return;
        }
        setSelectedFile(file);
    };

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                if (chatPartner?.isBot) {
                    toast.error('You cannot send media to Bot!');
                    return;
                }
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) {
                    const maxMB = 10;
                    if (file.size > maxMB * 1024 * 1024) {
                        toast.error(`File is too large (max ${maxMB}MB)`);
                        return;
                    }
                    setSelectedFile(file);
                }
                break;
            }
        }
    };

    const isBlocked = currentRoom?.blockedBy;
    const isBlockedByMe = currentRoom?.blockedBy === currentUserId;

    return (
        <div className="container-fluid h-100 py-3">
            {lightboxImage && <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}

            <div className="row h-100 g-0 shadow-sm rounded-4 overflow-hidden bg-white" style={{ minHeight: 'calc(100vh - 120px)' }}>
                {/* ─── SIDEBAR TRÁI ─── */}
                <div className="col-12 col-md-4 col-lg-3 border-end d-flex flex-column bg-white">
                    <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-white">
                        <h5 className="mb-0 fw-bold">Messages</h5>
                        <span className="badge bg-primary rounded-pill">
                            {roomList.reduce((acc, r) => acc + (r.unreadCount || 0), 0) || 0}
                        </span>
                    </div>
                    <div className="flex-grow-1 overflow-auto hide-scrollbar p-2 bg-light">
                        <ul className="list-group list-group-flush gap-1">
                            {/* AI Bot */}
                            <li onClick={() => { setChatPartner(BOT_USER); setCurrentRoom(null); }}
                                className={`list-group-item list-group-item-action d-flex align-items-center border-0 mb-1 rounded ${chatPartner?.isBot ? 'bg-primary text-white shadow-sm' : 'bg-transparent'}`}
                                style={{ cursor: 'pointer', padding: '12px 15px' }}>
                                <img src={BOT_USER.photoURL} alt="bot" className="rounded-circle me-3 border bg-white" style={{ width: 45, height: 45 }} />
                                <div>
                                    <div className="fw-bold m-0">{BOT_USER.displayName}</div>
                                    <small className={chatPartner?.isBot ? 'text-white-50' : 'text-muted'}>Support 24/7</small>
                                </div>
                            </li>

                            {/* Room List */}
                            {roomList.map(room => (
                                <RoomListItem
                                    key={room.chatRoomId}
                                    room={room}
                                    currentUserId={currentUserId}
                                    onSelect={(r) => {
                                        const partnerId = r.user1Id === currentUserId ? r.user2Id : r.user1Id;
                                        setChatPartner({ userId: partnerId, displayName: r.user1Id === currentUserId ? r.user2DisplayName : r.user1DisplayName });
                                        setCurrentRoom(r);
                                    }}
                                    isActive={currentRoom?.chatRoomId === room.chatRoomId}
                                />
                            ))}
                        </ul>
                    </div>
                </div>

                {/* ─── NỘI DUNG CHAT PHẢI ─── */}
                <div className="col-12 col-md-8 col-lg-9 d-flex flex-column position-relative bg-white" style={{ height: 'calc(100vh - 120px)' }}>
                    {/* Header */}
                    <div className="p-3 border-bottom d-flex align-items-center bg-white shadow-sm z-index-1">
                        <img
                            src={chatPartner?.photoURL || (currentRoom ? (currentRoom.user1Id === currentUserId ? currentRoom.user2PhotoURL : currentRoom.user1PhotoURL) : `https://api.dicebear.com/8.x/initials/svg?seed=${chatPartner?.displayName}`)}
                            alt="avatar"
                            className="rounded-circle me-3 shadow-sm"
                            style={{ width: 45, height: 45, objectFit: 'cover' }}
                        />
                        <div>
                            <h5 className="mb-0 fw-bold">{chatPartner?.displayName || 'Chat'}</h5>
                            {chatPartner?.isBot && <small className="text-success fw-medium"><i className="bi bi-circle-fill me-1" style={{ fontSize: '8px' }}></i>Online</small>}
                        </div>
                    </div>

                    {/* Danh sách tin nhắn */}
                    <div ref={chatContainerRef} onScroll={handleScroll} className="flex-grow-1 p-4 overflow-auto" style={{ backgroundColor: '#f0f2f5' }}>
                        {loadingMore && (
                            <div className="text-center p-2 text-muted">
                                <div className="spinner-border spinner-border-sm me-2"></div> Loading older messages...
                            </div>
                        )}

                        {loading && (
                            <div className="text-center p-3 text-muted">
                                <div className="spinner-border spinner-border-sm me-2"></div> Loading...
                            </div>
                        )}

                        {chatPartner?.isBot && messages.length === 0 && (
                            <div className="text-center my-4">
                                <img src={BOT_USER.photoURL} alt="bot" width="80" className="mb-3 rounded-circle shadow-sm bg-white" />
                                <h5>Welcome to HealthLink AI</h5>
                                <p className="text-muted">How can I help you with your health today?</p>
                            </div>
                        )}

                        {messages.map((msg, index) => (
                            <ChatMessage
                                key={msg.messageId || index}
                                message={msg}
                                currentUserId={currentUserId}
                                isNew={msg.messageId === latestBotMsgId}
                                onImageClick={setLightboxImage}
                                onNavigate={handleBotNavigate}
                            />
                        ))}
                        {isBotTyping && <TypingIndicator />}
                        <div ref={scrollTo}></div>
                    </div>

                    {/* Input box */}
                    {isBlocked ? (
                        <div className="p-3 border-top bg-light text-center">
                            <span className="text-muted fst-italic">
                                {isBlockedByMe ? 'You blocked this user.' : 'You cannot reply to this conversation.'}
                            </span>
                        </div>
                    ) : (
                        <div className="p-3 bg-white border-top">
                            {selectedFile && (
                                <div className="mb-3 p-2 bg-light border rounded d-flex align-items-center justify-content-between shadow-sm">
                                    <div className="d-flex align-items-center">
                                        {selectedFile.type.startsWith('image/') ? (
                                            <img src={URL.createObjectURL(selectedFile)} alt="preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', marginRight: '10px' }} />
                                        ) : (
                                            <i className="bi bi-file-earmark-text text-primary" style={{ fontSize: '24px', marginRight: '10px' }}></i>
                                        )}
                                        <small className="text-truncate fw-medium" style={{ maxWidth: '200px' }}>{selectedFile.name}</small>
                                    </div>
                                    <button className="btn btn-sm btn-outline-danger border-0" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}><i className="bi bi-x-lg"></i></button>
                                </div>
                            )}
                            <form className="d-flex align-items-end gap-2" onSubmit={sendMsg}>
                                {!chatPartner?.isBot && (
                                    <>
                                        <input type="file" ref={fileInputRef} accept="*/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                                        <button type="button" className="btn btn-light rounded-circle shadow-sm" style={{ width: 45, height: 45 }} onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Attach file">
                                            <i className="bi bi-paperclip fs-5 text-secondary"></i>
                                        </button>
                                    </>
                                )}
                                <div className="flex-grow-1 position-relative">
                                    <input
                                        type="text"
                                        className="rounded-pill px-4 shadow-sm"
                                        style={{ height: 45, border: '1px solid #dee2e6', width: '100%' }}
                                        value={formValue}
                                        onChange={e => setFormValue(e.target.value)}
                                        onPaste={handlePaste}
                                        placeholder={chatPartner?.isBot ? "Ask anything about your health..." : "Type a message..."}
                                        disabled={uploading}
                                    />
                                </div>
                                {selectedFile ? (
                                    <button className="btn btn-success rounded-circle shadow-sm d-flex align-items-center justify-content-center" style={{ width: 45, height: 45 }} type="button" onClick={sendMedia} disabled={uploading}>
                                        {uploading ? <div className="spinner-border spinner-border-sm text-white"></div> : <i className="bi bi-send-fill"></i>}
                                    </button>
                                ) : (
                                    <button className="btn btn-primary rounded-circle shadow-sm d-flex align-items-center justify-content-center" style={{ width: 45, height: 45 }} type="submit" disabled={!formValue.trim() || uploading}>
                                        <i className="bi bi-send-fill"></i>
                                    </button>
                                )}
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
