import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { getGeminiResponse } from '../services/geminiService';
import getBotResponse, { checkKeywordAndGetBotReply, checkSymptomAndGetSpecialty, getDoctorsBySpecialty } from '../AI_BOT/BotBrain';
import { doctorService } from '../api/doctorApi';

// ─── Bot cố định (chỉ dùng Gemini AI ở frontend) ──────────────
const BOT_USER = {
    userId: 'support_bot_001',
    displayName: 'HealthLink Assistant',
    photoURL: 'https://api.dicebear.com/8.x/bottts/svg?seed=support',
    isBot: true,
};

// ─── Helper: format thời gian ────────────────────────────────────────────────
function formatTime(isoString) {
    if (!isoString) return '...';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
function ChatMessage({ message, isNew = false, onNavigate }) {
    const isOwn = message.senderId === 'guest_temp';
    const fullText = message.content || message.text || '';

    // Typewriter effect
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const timeStr = message.timestamp
        ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
        : (message.createdAt ? formatTime(message.createdAt) : '...');

    const hasText = fullText.trim() !== '';

    return (
        <div className={`chat-msg ${isOwn ? 'chat-msg--own' : 'chat-msg--other'}`}>
            <div className="chat-msg-bubble" style={{ padding: '10px 14px' }}>
                {hasText && (
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                        {displayText}
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

                {/* Mini doctor cards nội bộ */}
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
                                    src={getFullUrl(doc.avatarUrl) || `https://api.dicebear.com/8.x/initials/svg?seed=${doc.fullName}`}
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

                {/* Nút hành động */}
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

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Chat() {
    const navigate = useNavigate();
    const { isChatOpen: isChatBoxOpen, setIsChatOpen: setIsChatBoxOpen } = useChat();

    const [formValue, setFormValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [allDoctors, setAllDoctors] = useState([]);
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [latestBotMsgId, setLatestBotMsgId] = useState(null);

    const scrollTo = useRef(null);

    const handleBotNavigate = useCallback((url) => {
        if (!url) return;
        setIsChatBoxOpen(false);
        navigate(url);
    }, [navigate, setIsChatBoxOpen]);

    // Lắng nghe sự kiện mở chat từ component khác (ví dụ: nút trên Home page)
    useEffect(() => {
        const handler = (e) => {
            const { message } = e.detail || {};
            setIsChatBoxOpen(true);
            if (message) setFormValue(message);
        };
        window.addEventListener('openChatWithMessage', handler);
        return () => window.removeEventListener('openChatWithMessage', handler);
    }, [setIsChatBoxOpen]);

    // Khởi tạo bot chat khi mở
    useEffect(() => {
        if (isChatBoxOpen && messages.length === 0) {
            setIsBotTyping(true);
            setTimeout(() => {
                setIsBotTyping(false);
                const welcomeMsg = {
                    messageId: `bot_welcome_${Date.now()}`,
                    senderId: BOT_USER.userId,
                    content: 'Xin chào! Tôi là trợ lý AI của HealthLink. Bạn có thể mô tả triệu chứng, hỏi về các chuyên khoa hoặc nhờ tôi tìm bác sĩ giúp bạn nhé!',
                    timestamp: new Date().toISOString(),
                };
                setLatestBotMsgId(welcomeMsg.messageId);
                setMessages([welcomeMsg]);
            }, 800);
        }
    }, [isChatBoxOpen, messages.length]);

    // Load danh sách bác sĩ offline
    useEffect(() => {
        if (allDoctors.length > 0) return;
        doctorService.getAllDoctors()
            .then(data => setAllDoctors(data || []))
            .catch(() => { });
    }, [allDoctors.length]);

    // Scroll xuống cuối
    useEffect(() => {
        if (scrollTo.current) {
            scrollTo.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [messages, isChatBoxOpen, isBotTyping]);

    const sendMsg = async (e) => {
        e.preventDefault();
        if (!formValue.trim() || isBotTyping) return;

        const text = formValue.trim();
        setFormValue('');

        const optimistic = {
            messageId: `temp_${Date.now()}`,
            senderId: 'guest_temp',
            content: text,
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);
        setIsBotTyping(true);

        let replyText = null;
        let finalActionUrl = null;
        let finalActionLabel = null;
        let suggestedDoctors = [];

        const hasVI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text);
        const hasID = /saya|aku|sakit|demam|batuk|pusing|dokter/i.test(text.toLowerCase());
        const lang = hasVI ? 'vi' : hasID ? 'id' : 'en';

        // 1. Luôn ưu tiên gọi Gemini AI trước để hiểu ngữ cảnh tự nhiên
        try {
            const aiRes = await getGeminiResponse(text, []);
            // Nếu Gemini không khả dụng, getGeminiResponse sẽ trả về getBotResponse(text).
            // Ta ưu tiên dùng reply của AI nếu nó thực sự là phản hồi từ AI.
            if (aiRes && aiRes.text && aiRes.text !== getBotResponse(text)) {
                replyText = aiRes.text;
                finalActionUrl = aiRes.actionUrl;
                finalActionLabel = aiRes.actionLabel;
            }
        } catch (error) {
            console.error("Gemini call failed:", error);
        }

        // 2. Fallback offline nếu AI không trả lời (lỗi hoặc hết quota)
        if (!replyText) {
            const keywordMatch = checkKeywordAndGetBotReply(text);
            if (keywordMatch) {
                replyText = keywordMatch.reply;
                finalActionUrl = keywordMatch.actionUrl;
                finalActionLabel = keywordMatch.actionLabel;
            } else {
                const specialtyMatch = checkSymptomAndGetSpecialty(text);
                if (specialtyMatch) {
                    const specialtyName = specialtyMatch.label[lang] || specialtyMatch.label.en;
                    replyText = lang === 'vi'
                        ? `${specialtyMatch.icon} Dựa trên triệu chứng bạn mô tả, mình gợi ý bạn nên khám chuyên khoa **${specialtyName}**! Dưới đây là một số bác sĩ phù hợp:`
                        : lang === 'id'
                            ? `${specialtyMatch.icon} Berdasarkan gejala yang kamu ceritakan, aku sarankan periksa ke spesialis **${specialtyName}**! Berikut beberapa dokter yang bisa membantu:`
                            : `${specialtyMatch.icon} Based on your symptoms, I recommend seeing a **${specialtyName}** specialist! Here are some available doctors:`;

                    finalActionUrl = `/doctors?specialty=${encodeURIComponent(specialtyMatch.specialty)}`;
                    finalActionLabel = lang === 'vi' ? `📅 Xem tất cả bác sĩ ${specialtyName}` : lang === 'id' ? `📅 Lihat semua dokter ${specialtyName}` : `📅 View all ${specialtyName} doctors`;
                    suggestedDoctors = getDoctorsBySpecialty(allDoctors, specialtyMatch.specialty, 3);
                } else {
                    replyText = getBotResponse(text);
                }
            }
        }

        // 3. Suy luận nút bấm (Action) nếu AI trả lời nhưng chưa gắn thẻ action
        if (replyText && !finalActionUrl) {
            const keywordMatch = checkKeywordAndGetBotReply(text);
            if (keywordMatch) {
                finalActionUrl = keywordMatch.actionUrl;
                finalActionLabel = keywordMatch.actionLabel;
            }
        }

        // 4. Nếu có link điều hướng tới bác sĩ chuyên khoa hoặc danh sách bác sĩ, tự động hiển thị vài bác sĩ inline
        if (finalActionUrl) {
            if (finalActionUrl.includes('specialty=')) {
                const specialtyParam = new URLSearchParams(finalActionUrl.split('?')[1]).get('specialty');
                if (specialtyParam) {
                    suggestedDoctors = getDoctorsBySpecialty(allDoctors, specialtyParam, 3);
                }
            } else if (finalActionUrl.includes('/doctors')) {
                // Lấy 3 bác sĩ đầu tiên có đánh giá cao
                suggestedDoctors = [...allDoctors]
                    .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
                    .slice(0, 3);
            }
        }

        setIsBotTyping(false);
        const newMsgId = `bot_msg_${Date.now()}`;
        setLatestBotMsgId(newMsgId);
        setMessages(prev => [...prev, {
            messageId: newMsgId,
            senderId: BOT_USER.userId,
            content: replyText || "Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau!",
            suggestedDoctors: suggestedDoctors.length > 0 ? suggestedDoctors : undefined,
            actionUrl: finalActionUrl ?? null,
            actionLabel: finalActionLabel ?? null,
            timestamp: new Date().toISOString(),
        }]);
    };

    return (
        <>
            {/* Floating chat button */}
            <div className="chat-float-wrapper">
                <button
                    className={`chat-float-button ${isChatBoxOpen ? 'chat-float-button--hidden' : ''} ${!isChatBoxOpen ? 'chat-float-button--pulsing' : ''}`}
                    onClick={() => setIsChatBoxOpen(prev => !prev)}
                    title={isChatBoxOpen ? 'Close chat' : 'Open chat'}
                >
                    <i className={`bi ${isChatBoxOpen ? 'bi-x-lg' : 'bi-robot'}`} style={{ fontSize: '1.4rem' }} />
                </button>
            </div>

            {/* Chat Box */}
            {isChatBoxOpen && (
                <div className="chat-box">
                    {/* Header */}
                    <div className="chat-box-header">
                        <div className="chat-box-header-left">
                            <img src={BOT_USER.photoURL} alt="Bot" style={{ width: 32, height: 32, borderRadius: '50%', marginRight: '10px' }} />
                            <h5 className="chat-box-header-title">{BOT_USER.displayName}</h5>
                        </div>
                        <div className="chat-box-header-actions">
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
                        {messages.length === 0 && !isBotTyping && (
                            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', padding: '24px 0' }}>
                                Say hello to start chatting!
                            </p>
                        )}
                        {messages.map(msg => (
                            <ChatMessage 
                                key={msg.messageId} 
                                message={msg} 
                                isNew={msg.messageId === latestBotMsgId}
                                onNavigate={handleBotNavigate} 
                            />
                        ))}
                        {isBotTyping && <TypingIndicator />}
                        <div ref={scrollTo} />
                    </div>

                    {/* Input */}
                    <div className="chat-input-area">
                        <form className="chat-input-row" onSubmit={sendMsg}>
                            <input
                                type="text"
                                className="chat-input-field"
                                value={formValue}
                                onChange={e => setFormValue(e.target.value)}
                                placeholder="Type a message..."
                                disabled={isBotTyping}
                            />
                            <button
                                type="submit"
                                className="chat-input-btn chat-input-btn--send"
                                disabled={!formValue.trim() || isBotTyping}
                            >
                                <i className="bi bi-send-fill" style={{ fontSize: '0.95rem' }} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}