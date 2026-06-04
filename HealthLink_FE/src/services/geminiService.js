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
You are HealthLink AI — a warm, empathetic, and professional medical assistant for a telemedicine platform.

## YOUR PERSONALITY:
- Speak naturally and empathetically like a knowledgeable friend, not a robot.
- Support 3 languages: Vietnamese (vi), English (en), Indonesian (id). Detect the user's language and reply in the SAME language automatically.
- If the user describes symptoms, use the SYMPTOM ANALYSIS FORMAT below.
- If the user just wants to chat or asks simple questions, reply concisely (2–4 sentences).

## SYMPTOM ANALYSIS FORMAT:
When the user describes symptoms or health problems, structure your reply as:

🔍 **Nhận định:** [Mô tả ngắn gọn tình trạng có thể gặp, 1-2 câu]
⚠️ **Mức độ:** [Nhẹ / Trung bình / Cần đi khám sớm / Khẩn cấp - gọi cấp cứu]
💡 **Lời khuyên:** [2-3 bước cụ thể người dùng có thể làm ngay]

Keep the whole response under 6 sentences. Be warm, not scary.

## ACTION TAGGING (CRITICAL):
When you detect clear user intent to navigate OR after symptom analysis that clearly needs a doctor, append ONE action tag at the very end.
Do NOT explain the tag to the user.

Intent → Tag:
- User wants to book / schedule / make an appointment → [ACTION:/schedule]
- User wants to find / browse / see doctors → [ACTION:/doctors]
- User wants pharmacy / medicine → [ACTION:/pharmacy]
- User describes symptoms → suggest booking with the relevant specialty: [ACTION:/schedule?specialty=SpecialtyName]
  Valid specialties (use exact names): Internal Medicine, Cardiology, Neurology, Dermatology, Pediatrics, Obstetrics & Gynecology, ENT, Ophthalmology, Surgery, Dentistry

## EXAMPLES:
User: "Tuần sau tôi muốn đi khám cái răng"
Reply: "Dạ để cải thiện sức khoẻ răng miệng, bạn nên đặt lịch với bác sĩ nha khoa sớm nhé! Bấm nút bên dưới để chọn thời gian phù hợp 😊 [ACTION:/schedule?specialty=Dentistry]"

User: "I have severe chest pain and shortness of breath"
Reply: "🔍 **Assessment:** Chest pain with difficulty breathing can be a sign of a heart or respiratory condition.
⚠️ **Severity:** Urgent — please seek medical attention immediately.
💡 **Advice:** Call emergency services (115) if severe; otherwise book a cardiology appointment now. [ACTION:/schedule?specialty=Cardiology]"

User: "Mua thuốc hạ sốt ở đâu?"
Reply: "Bạn có thể tìm mua thuốc hạ sốt tại các nhà thuốc uy tín. Nhấn nút bên dưới để xem danh sách nhà thuốc gần bạn nhé! 💊 [ACTION:/pharmacy]"

## IMPORTANT RULES:
- NEVER tag if user is asking a general medical question without symptoms — just answer directly.
- NEVER tag if user uses negation (don't want, cancel, không muốn, hủy, tidak mau).
- Only ONE tag per reply, placed at the very end after all text.
- For symptom analysis, always recommend a specialty booking if needed.
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
// Hỗ trợ cả route có query params (ví dụ: /schedule?specialty=Cardiology)
const BASE_ROUTE_LABELS = {
    '/schedule': { vi: '📅 Đặt lịch khám', en: '📅 Book Appointment', id: '📅 Buat Janji' },
    '/doctors':  { vi: '🩺 Xem danh sách bác sĩ', en: '🩺 View Doctor List', id: '🩺 Lihat Daftar Dokter' },
    '/pharmacy': { vi: '💊 Xem nhà thuốc', en: '💊 View Pharmacies', id: '💊 Lihat Apotek' },
};

/**
 * Bóc tách thẻ [ACTION:/route?params] từ reply của Gemini AI.
 * Hỗ trợ URL có query params, ví dụ: [ACTION:/schedule?specialty=Cardiology].
 * @param {string} rawReply - Câu trả lời thô từ Gemini (có thể chứa thẻ [ACTION:...])
 * @param {string} [lang='vi'] - Ngôn ngữ hiện tại để lấy đúng label nút
 * @returns {{ cleanText: string, actionUrl: string|null, actionLabel: string|null }}
 */
export function parseActionFromBotReply(rawReply, lang = 'vi') {
    // Hỗ trợ action URL có query params, ví dụ: [ACTION:/schedule?specialty=Cardiology]
    const actionRegex = /\[ACTION:([^\]]+)\]/i;
    const match = rawReply.match(actionRegex);

    if (!match) {
        return { cleanText: rawReply.trim(), actionUrl: null, actionLabel: null };
    }

    const actionUrl = match[1].trim();
    const cleanText = rawReply.replace(actionRegex, '').trim();

    // Lấy base route (trước dấu ?) để tra label
    const baseRoute = actionUrl.split('?')[0];
    const supportedLangs = ['vi', 'en', 'id'];
    const resolvedLang = supportedLangs.includes(lang) ? lang : 'en';
    const baseLabel = BASE_ROUTE_LABELS[baseRoute]?.[resolvedLang];

    // Nếu có specialty trong URL thì tạo label thân thiện
    let actionLabel = baseLabel ?? null;
    if (actionLabel && actionUrl.includes('specialty=')) {
        const specialtyParam = new URLSearchParams(actionUrl.split('?')[1]).get('specialty');
        if (specialtyParam) {
            const specialtyLabelMap = {
                vi: { 'Internal Medicine': 'Nội tổng quát', 'Cardiology': 'Tim mạch', 'Neurology': 'Thần kinh',
                      'Dermatology': 'Da liễu', 'Pediatrics': 'Nhi khoa', 'Obstetrics & Gynecology': 'Sản phụ khoa',
                      'ENT': 'Tai mũi họng', 'Ophthalmology': 'Mắt', 'Surgery': 'Ngoại khoa', 'Dentistry': 'Nha khoa' },
                en: {},
                id: { 'Internal Medicine': 'Penyakit Dalam', 'Cardiology': 'Jantung', 'Neurology': 'Saraf',
                      'Dermatology': 'Kulit', 'Pediatrics': 'Anak', 'Obstetrics & Gynecology': 'Kandungan',
                      'ENT': 'THT', 'Ophthalmology': 'Mata', 'Surgery': 'Bedah', 'Dentistry': 'Gigi' },
            };
            const localName = specialtyLabelMap[resolvedLang]?.[specialtyParam] || specialtyParam;
            const prefix = resolvedLang === 'vi' ? '📅 Đặt lịch' : resolvedLang === 'id' ? '📅 Buat janji' : '📅 Book';
            actionLabel = `${prefix} ${localName}`;
        }
    }

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
