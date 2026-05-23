import { GoogleGenerativeAI } from "@google/generative-ai";
import getBotResponse from '../AI_BOT/BotBrain';
import { GEMINI_API_KEY as API_KEY, CONFIG } from '../config';

console.log('🔍 API_KEY loaded:', API_KEY ? 'YES' : 'NO');

let genAI = null;
let model = null;

// ─── System Prompt thông minh: hướng dẫn Gemini hiểu ngữ cảnh y tế ──────────
// Khi Gemini nhận ra ý định điều hướng, nó sẽ tự động gắn thẻ [ACTION:/route]
// vào cuối câu trả lời để frontend có thể render nút bấm tương ứng.
const SYSTEM_INSTRUCTION = `
You are HealthLink AI — a warm, friendly, and professional health assistant for a telemedicine platform.

## YOUR PERSONALITY:
- Speak naturally and empathetically like a knowledgeable friend, not a robot.
- Keep responses concise (2–4 sentences max) unless the user asks for details.
- Support 3 languages: Vietnamese (vi), English (en), Indonesian (id). Detect the user's language and reply in the SAME language automatically.

## ACTION TAGGING (CRITICAL):
When you detect clear user intent to navigate, append ONE action tag at the very end of your reply (after all text). Do NOT explain the tag to the user.

Intent → Tag:
- User wants to book / schedule / make an appointment → [ACTION:/schedule]
- User wants to find / browse / see doctors → [ACTION:/doctors]
- User wants pharmacy / medicine / buy medicine → [ACTION:/pharmacy]

## EXAMPLES:
User: "Tuần sau tôi muốn đi khám cái răng"
Reply: "Dạ để cải thiện sức khoẻ răng miệng, bạn nên đặt lịch với bác sĩ nha khoa sớm nhé! Bấm nút bên dưới để chọn thời gian phù hợp nhé 😊 [ACTION:/schedule]"

User: "I have a headache and want to see a specialist"
Reply: "I'm sorry to hear that! For persistent headaches, seeing a neurologist is a great idea. Let me help you find the right doctor 🩺 [ACTION:/doctor]"

User: "Mua thuốc hạ sốt ở đâu?"
Reply: "Bạn có thể tìm mua thuốc hạ sốt tại các nhà thuốc uy tín. Nhấn nút bên dưới để xem danh sách nhà thuốc gần bạn nhé! 💊 [ACTION:/pharmacy]"

## IMPORTANT RULES:
- NEVER tag if user is asking a medical question (what is, how to treat, what are symptoms) — just answer directly.
- NEVER tag if user uses negation (don't want, cancel, not interested, không muốn, hủy, tidak mau).
- Only ONE tag per reply, placed at the very end after all text.
- If no clear navigation intent, reply helpfully without any tag.
`;

// Initialize Gemini AI with smart system instruction
if (API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(API_KEY);
        model = genAI.getGenerativeModel({
            model: CONFIG.GEMINI_MODEL,
            systemInstruction: SYSTEM_INSTRUCTION,
        });
        console.log('✅ Gemini AI initialized with smart system instruction');
    } catch (error) {
        console.warn('⚠️ Failed to initialize Gemini AI:', error.message);
        genAI = null;
        model = null;
    }
} else {
    console.warn('⚠️ Gemini API key not found. Using fallback responses only.');
}

// ─── Mapping action tag → route và label đa ngôn ngữ ────────────────────────
const ACTION_MAP = {
    '/schedule': {
        label: { vi: '📅 Đặt lịch khám', en: '📅 Book Appointment', id: '📅 Buat Janji' },
    },
    '/doctor': {
        label: { vi: '🩺 Xem danh sách bác sĩ', en: '🩺 View Doctor List', id: '🩺 Lihat Daftar Dokter' },
    },
    '/pharmacy': {
        label: { vi: '💊 Xem nhà thuốc', en: '💊 View Pharmacies', id: '💊 Lihat Apotek' },
    },
};

/**
 * Bóc tách thẻ [ACTION:/route] từ reply của Gemini AI.
 * @param {string} rawReply - Câu trả lời thô từ Gemini (có thể chứa thẻ [ACTION:...])
 * @param {string} [lang='vi'] - Ngôn ngữ hiện tại để lấy đúng label nút
 * @returns {{ cleanText: string, actionUrl: string|null, actionLabel: string|null }}
 */
export function parseActionFromBotReply(rawReply, lang = 'vi') {
    const actionRegex = /\[ACTION:(\/[a-z]+)\]/i;
    const match = rawReply.match(actionRegex);

    if (!match) {
        return { cleanText: rawReply.trim(), actionUrl: null, actionLabel: null };
    }

    const actionUrl = match[1];
    const cleanText = rawReply.replace(actionRegex, '').trim();
    const actionInfo = ACTION_MAP[actionUrl];
    const supportedLangs = ['vi', 'en', 'id'];
    const resolvedLang = supportedLangs.includes(lang) ? lang : 'en';
    const actionLabel = actionInfo?.label[resolvedLang] ?? null;

    return { cleanText, actionUrl, actionLabel };
}

/**
 * Lấy response từ Gemini AI với fallback về rule-based nếu lỗi.
 * Trả về object { text, actionUrl, actionLabel } thay vì string thuần.
 * @param {string} userMessage
 * @param {Array} conversationHistory
 * @returns {Promise<{ text: string, actionUrl: string|null, actionLabel: string|null }>}
 */
export async function getGeminiResponse(userMessage, conversationHistory = []) {
    // Detect ngôn ngữ để truyền vào parseActionFromBotReply
    const hasVietnamese = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(userMessage);
    const hasIndonesian = /saya|aku|sakit|demam|batuk|pusing|dokter|obat|mau|tolong|terima kasih|halo/i.test(userMessage.toLowerCase());
    const lang = hasVietnamese ? 'vi' : hasIndonesian ? 'id' : 'en';

    if (!model) {
        console.log('🔄 Using rule-based response (no AI available)');
        return { text: getBotResponse(userMessage), actionUrl: null, actionLabel: null };
    }

    try {
        const result = await model.generateContent(userMessage);
        const rawReply = result.response.text();
        console.log('🤖 Gemini raw reply:', rawReply);

        // Bóc tách thẻ [ACTION:...] nếu Gemini tự gắn vào
        const { cleanText, actionUrl, actionLabel } = parseActionFromBotReply(rawReply, lang);
        return { text: cleanText, actionUrl, actionLabel };

    } catch (error) {
        console.error('❌ Gemini AI error:', error);
        console.log('🔄 Falling back to rule-based response');
        return { text: getBotResponse(userMessage), actionUrl: null, actionLabel: null };
    }
}

export function isGeminiAvailable() {
    return model !== null;
}

export default {
    getGeminiResponse,
    isGeminiAvailable,
    parseActionFromBotReply,
};
