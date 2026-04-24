import React, { createContext, useContext, useState, useEffect } from 'react';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [selectedChatPartner, setSelectedChatPartner] = useState(null);

    // Cleanup: Xóa localStorage cũ để đảm bảo chatbox luôn đóng khi load trang
    useEffect(() => {
        localStorage.removeItem('chatBoxOpen');
    }, []);

    const openChatWith = (partner) => {
        if (partner && partner.uid) {
            // ✅ CRITICAL: Sanitize UID để đảm bảo không có dấu gạch ngang
            const sanitizedPartner = {
                ...partner,
                uid: partner.uid.replace(/-/g, '')
            };
            setSelectedChatPartner(sanitizedPartner);
        } else {
            setSelectedChatPartner(partner);
        }
        setIsChatOpen(true);
    };

    // ✅ FIX: Hàm riêng để set partner MÀ KHÔNG MỞ CHAT (dùng cho default setup)
    const setPartnerOnly = (partner) => {
        if (partner && partner.uid) {
            const sanitizedPartner = {
                ...partner,
                uid: partner.uid.replace(/-/g, '')
            };
            setSelectedChatPartner(sanitizedPartner);
        } else {
            setSelectedChatPartner(partner);
        }
    };

    const closeChat = () => {
        setIsChatOpen(false);
    };

    const toggleChat = () => {
        setIsChatOpen(prev => !prev);
    };

    return (
        <ChatContext.Provider value={{
            isChatOpen,
            setIsChatOpen,
            selectedChatPartner,
            setSelectedChatPartner: setPartnerOnly, // ✅ FIX: Dùng setPartnerOnly thay vì openChatWith
            openChatWith,
            closeChat,
            toggleChat
        }}>
            {children}
        </ChatContext.Provider>
    );
};
