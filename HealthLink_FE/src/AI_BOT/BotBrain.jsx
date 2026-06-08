// ─── Hệ thống 10 chuyên khoa thực tế của HealthLink (khớp với DB) ─────────────
// Mỗi chuyên khoa có danh sách từ khóa triệu chứng tương ứng (offline, 0 token)
export const SPECIALTY_SYMPTOM_MAP = [
    {
        specialty: 'Internal Medicine',
        label: { vi: 'Nội tổng quát', en: 'Internal Medicine', id: 'Penyakit Dalam' },
        icon: '🩺',
        keywords: [
            // VI
            'mệt mỏi', 'sốt kéo dài', 'sụt cân', 'thiếu máu', 'tiểu đường', 'huyết áp cao',
            'huyết áp thấp', 'tăng huyết áp', 'suy nhược', 'viêm gan', 'vàng da', 'lao phổi',
            'nhiễm trùng', 'sốt xuất huyết', 'sốt rét', 'bệnh nội khoa', 'nội tổng quát',
            // EN
            'fatigue', 'prolonged fever', 'weight loss', 'anemia', 'diabetes', 'hypertension',
            'high blood pressure', 'low blood pressure', 'weakness', 'hepatitis', 'jaundice',
            'tuberculosis', 'infection', 'dengue', 'malaria', 'internal medicine',
            // ID
            'kelelahan', 'demam berkepanjangan', 'penurunan berat', 'kurang darah', 'gula darah',
            'hipertensi', 'lemas', 'liver', 'kuning', 'tbc', 'infeksi', 'demam berdarah', 'malaria',
        ],
    },
    {
        specialty: 'Cardiology',
        label: { vi: 'Tim mạch', en: 'Cardiology', id: 'Jantung' },
        icon: '❤️',
        keywords: [
            // VI
            'đau ngực', 'tức ngực', 'nhồi máu cơ tim', 'đánh trống ngực', 'tim đập nhanh',
            'hở van tim', 'hẹp van tim', 'rối loạn nhịp tim', 'suy tim', 'động mạch vành',
            'tim mạch', 'huyết áp', 'cholesterol', 'mỡ máu',
            // EN
            'chest pain', 'heart attack', 'palpitation', 'heart disease', 'arrhythmia',
            'heart failure', 'coronary', 'angina', 'cardiac', 'cholesterol',
            // ID
            'nyeri dada', 'serangan jantung', 'jantung berdebar', 'penyakit jantung', 'aritmia',
        ],
    },
    {
        specialty: 'Neurology',
        label: { vi: 'Thần kinh', en: 'Neurology', id: 'Saraf' },
        icon: '🧠',
        keywords: [
            // VI
            'đau đầu', 'nhức đầu', 'đau nửa đầu', 'migraine', 'chóng mặt', 'hoa mắt',
            'tê tay', 'tê chân', 'run tay', 'đột quỵ', 'liệt', 'động kinh', 'mất trí nhớ',
            'alzheimer', 'parkinson', 'bppv', 'thần kinh tọa', 'mất ngủ', 'rối loạn giấc ngủ',
            // EN
            'headache', 'migraine', 'dizziness', 'vertigo', 'numbness', 'stroke', 'seizure',
            'memory loss', 'tremor', 'epilepsy', 'parkinson', 'alzheimer', 'neuropathy',
            // ID
            'sakit kepala', 'pusing', 'vertigo', 'kebas', 'stroke', 'kejang', 'lupa',
        ],
    },
    {
        specialty: 'Dermatology',
        label: { vi: 'Da liễu', en: 'Dermatology', id: 'Kulit' },
        icon: '🌿',
        keywords: [
            // VI
            'ngứa', 'nổi mẩn', 'mề đay', 'dị ứng da', 'phát ban', 'mụn', 'mụn trứng cá',
            'rụng tóc', 'hói đầu', 'viêm da', 'chàm', 'vẩy nến', 'nấm da', 'lang ben',
            'da liễu', 'da khô', 'nám', 'tàn nhang',
            // EN
            'itchy', 'rash', 'hives', 'urticaria', 'allergy skin', 'acne', 'pimple',
            'hair loss', 'alopecia', 'eczema', 'psoriasis', 'fungal', 'dermatitis',
            // ID
            'gatal', 'ruam', 'biduran', 'alergi kulit', 'jerawat', 'rambut rontok', 'eksem',
        ],
    },
    {
        specialty: 'Pediatrics',
        label: { vi: 'Nhi khoa', en: 'Pediatrics', id: 'Anak' },
        icon: '👶',
        keywords: [
            // VI
            'trẻ em', 'trẻ nhỏ', 'em bé', 'bé', 'con', 'nhi khoa', 'trẻ sốt', 'trẻ ho',
            'bé khóc', 'trẻ biếng ăn', 'trẻ chậm phát triển', 'tiêm chủng trẻ em',
            'bé sơ sinh', 'vàng da sơ sinh',
            // EN
            'child', 'baby', 'infant', 'toddler', 'kid', 'pediatric', 'child fever', 'child cough',
            'newborn', 'vaccination child',
            // ID
            'anak', 'bayi', 'balita', 'anak sakit', 'bayi demam', 'anak batuk',
        ],
    },
    {
        specialty: 'Obstetrics & Gynecology',
        label: { vi: 'Sản phụ khoa', en: 'Obstetrics & Gynecology', id: 'Kandungan' },
        icon: '🤰',
        keywords: [
            // VI
            'mang thai', 'thai kỳ', 'sinh con', 'đau bụng kinh', 'rong kinh', 'kinh nguyệt',
            'phụ khoa', 'sản khoa', 'khí hư', 'viêm âm đạo', 'u xơ tử cung', 'buồng trứng',
            'lạc nội mạc', 'tránh thai', 'vô sinh', 'hiếm muộn', 'siêu âm thai',
            // EN
            'pregnant', 'pregnancy', 'period pain', 'menstrual', 'gynecology', 'obstetrics',
            'vaginal discharge', 'fibroids', 'ovarian', 'contraception', 'infertility',
            // ID
            'hamil', 'kehamilan', 'sakit haid', 'menstruasi', 'kandungan', 'keputihan',
            'kontrasepsi', 'program hamil',
        ],
    },
    {
        specialty: 'ENT',
        label: { vi: 'Tai mũi họng', en: 'ENT', id: 'THT' },
        icon: '👂',
        keywords: [
            // VI
            'đau tai', 'ù tai', 'viêm tai giữa', 'sổ mũi', 'nghẹt mũi', 'viêm xoang',
            'chảy máu mũi', 'đau họng', 'viêm họng', 'amidan', 'khàn tiếng', 'tai mũi họng',
            'nhiệt miệng', 'loét miệng', 'polyp mũi',
            // EN
            'ear pain', 'tinnitus', 'otitis', 'runny nose', 'sinusitis', 'nosebleed',
            'sore throat', 'tonsil', 'hoarse', 'ent', 'nasal polyp', 'mouth ulcer',
            // ID
            'sakit telinga', 'telinga berdenging', 'hidung meler', 'sinusitis', 'mimisan',
            'sakit tenggorokan', 'amandel', 'suara serak', 'tht',
        ],
    },
    {
        specialty: 'Ophthalmology',
        label: { vi: 'Mắt', en: 'Ophthalmology', id: 'Mata' },
        icon: '👁️',
        keywords: [
            // VI
            'đau mắt', 'mắt đỏ', 'lẹo mắt', 'chắp mắt', 'khô mắt', 'nhìn mờ', 'mờ mắt',
            'mất thị lực', 'đục thủy tinh thể', 'glôcôm', 'cận thị', 'viễn thị', 'loạn thị',
            'kết mạc', 'viêm kết mạc', 'mắt lé',
            // EN
            'eye pain', 'red eye', 'stye', 'dry eye', 'blurry vision', 'vision loss',
            'cataract', 'glaucoma', 'myopia', 'conjunctivitis', 'ophthalmology',
            // ID
            'mata merah', 'mata kering', 'pandangan kabur', 'katarak', 'glaukoma', 'rabun',
        ],
    },
    {
        specialty: 'Surgery',
        label: { vi: 'Ngoại khoa', en: 'Surgery', id: 'Bedah' },
        icon: '🔬',
        keywords: [
            // VI
            'phẫu thuật', 'mổ', 'u bướu', 'sỏi mật', 'sỏi thận', 'viêm ruột thừa', 'thoát vị',
            'trĩ nặng', 'bướu cổ', 'ngoại khoa', 'vết thương', 'chấn thương nặng',
            // EN
            'surgery', 'operation', 'tumor', 'gallstone', 'appendicitis', 'hernia',
            'hemorrhoid surgery', 'wound', 'trauma surgery',
            // ID
            'operasi', 'bedah', 'tumor', 'batu empedu', 'usus buntu', 'hernia', 'wasir parah',
        ],
    },
    {
        specialty: 'Dentistry',
        label: { vi: 'Nha khoa', en: 'Dentistry', id: 'Gigi' },
        icon: '🦷',
        keywords: [
            // VI
            'đau răng', 'sâu răng', 'viêm nướu', 'mất răng', 'nhổ răng', 'trám răng',
            'niềng răng', 'răng khôn', 'nha khoa', 'nướu chảy máu', 'hàm răng',
            // EN
            'toothache', 'cavity', 'gum disease', 'tooth extraction', 'braces',
            'wisdom tooth', 'dentistry', 'dental', 'bleeding gum',
            // ID
            'sakit gigi', 'gigi berlubang', 'gusi berdarah', 'cabut gigi', 'behel', 'gigi bungsu',
        ],
    },
];

/**
 * Phân tích triệu chứng và gợi ý chuyên khoa phù hợp (OFFLINE, 0 token Gemini).
 * So khớp từ khóa triệu chứng với bảng SPECIALTY_SYMPTOM_MAP.
 * @param {string} text - Tin nhắn người dùng.
 * @returns {{ specialty: string, label: object, icon: string } | null} - Chuyên khoa phù hợp hoặc null.
 */
export function checkSymptomAndGetSpecialty(text) {
    const lower = text.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const entry of SPECIALTY_SYMPTOM_MAP) {
        let score = 0;
        for (const kw of entry.keywords) {
            if (lower.includes(kw)) {
                // Ưu tiên từ khóa dài hơn (chính xác hơn)
                score += kw.length > 5 ? 2 : 1;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = entry;
        }
    }

    // Chỉ trả về nếu có ít nhất 1 từ khóa khớp
    return bestScore > 0 ? bestMatch : null;
}

/**
 * Lọc danh sách bác sĩ theo tên chuyên khoa (OFFLINE, dùng data đã load từ API một lần).
 * @param {Array} allDoctors - Mảng bác sĩ đã load (từ state trong Schedule/Chat).
 * @param {string} specialtyName - Tên chuyên khoa cần lọc (khớp với DB, ví dụ: 'Cardiology').
 * @param {number} [limit=3] - Số bác sĩ tối đa trả về.
 * @returns {Array} - Danh sách bác sĩ thuộc chuyên khoa, sắp xếp theo rating giảm dần.
 */
export function getDoctorsBySpecialty(allDoctors, specialtyName, limit = 3) {
    if (!Array.isArray(allDoctors) || !specialtyName) return [];
    return allDoctors
        .filter(d => {
            const ds = (d.specialtyName || d.specialty || '').toLowerCase();
            return ds === specialtyName.toLowerCase();
        })
        .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
        .slice(0, limit);
}

// ─── Keyword map: từ khóa → bot reply cố định (không gọi Gemini API) ─────────
// reply và actionLabel hỗ trợ 3 ngôn ngữ: en / vi / id
export const KEYWORD_REPLIES = [
    {
        keywords: ['đặt lịch khám', 'dat lich kham', 'book appointment', 'book', 'dat lich', 'appointment', 'schedule', 'lịch khám', 'lich kham'],
        reply: {
            en: '📅 Want to book an appointment? Click the button below to schedule right away!',
            vi: '📅 Bạn muốn đặt lịch khám? Nhấn nút bên dưới để đặt lịch ngay nhé!',
            id: '📅 Mau buat janji dokter? Klik tombol di bawah untuk jadwalkan sekarang!',
        },
        actionLabel: {
            en: '📅 Book Appointment',
            vi: '📅 Đặt lịch khám',
            id: '📅 Buat Janji',
        },
        actionUrl: '/schedule',
    },
    {
        keywords: ['doctor', 'bác sĩ', 'bac si', 'bs', 'find doctor', 'find a doctor', 'tim bac si', 'tìm bác sĩ', 'danh sách bác sĩ', 'danh sach bac si', 'dokter', 'cari dokter'],
        reply: {
            en: '🩺 Looking for a doctor? Click the button below to browse our doctor list!',
            vi: '🩺 Bạn muốn tìm bác sĩ? Nhấn nút bên dưới để xem danh sách bác sĩ!',
            id: '🩺 Mau cari dokter? Klik tombol di bawah untuk lihat daftar dokter!',
        },
        actionLabel: {
            en: '🩺 View Doctor List',
            vi: '🩺 Xem danh sách bác sĩ',
            id: '🩺 Lihat Daftar Dokter',
        },
        actionUrl: '/doctors',
    },
    {
        keywords: ['thuốc', 'thuc', 'pharmacy', 'nhà thuốc', 'nha thuoc', 'medicine', 'medication', 'mua thuốc', 'mua thuoc', 'apotek', 'obat'],
        reply: {
            en: '💊 Need a pharmacy or medicine info? Click the button below!',
            vi: '💊 Bạn cần tìm nhà thuốc hoặc thông tin thuốc? Nhấn nút bên dưới!',
            id: '💊 Butuh apotek atau info obat? Klik tombol di bawah!',
        },
        actionLabel: {
            en: '💊 View Pharmacies',
            vi: '💊 Xem nhà thuốc',
            id: '💊 Lihat Apotek',
        },
        actionUrl: '/patient-dashboard/pharmacy',
    },
    {
        keywords: ['khẩn cấp', 'khan cap', 'cấp cứu', 'cap cuu', 'emergency', 'urgent', 'darurat', 'gawat'],
        reply: {
            en: '🚨 In an emergency, call 115 immediately or go to the nearest hospital! You can also book the earliest available appointment.',
            vi: '🚨 Trường hợp khẩn cấp, hãy gọi ngay 115 hoặc đến cơ sở y tế gần nhất! Bạn cũng có thể đặt lịch khám sớm nhất có thể.',
            id: '🚨 Darurat? Langsung telepon 119 atau pergi ke IGD terdekat! Kamu juga bisa booking jadwal dokter paling cepat.',
        },
        actionLabel: {
            en: '📅 Book Urgent Appointment',
            vi: '📅 Đặt lịch khám khẩn',
            id: '📅 Buat Janji Darurat',
        },
        actionUrl: '/schedule',
    },
];

/**
 * Kiểm tra text có chứa từ khóa nội bộ không.
 * Nếu match → trả về bot reply cố định đúng ngôn ngữ (KHÔNG gọi Gemini API để tiết kiệm token).
 * Logic detect ngôn ngữ tương tự getBotResponse: VI → ID → EN (fallback).
 * @param {string} text - Tin nhắn của user.
 * @returns {{ reply: string, actionLabel: string, actionUrl: string } | null}
 */
// ─── Cấu hình từ chỉ câu hỏi/tư vấn chuyên sâu (sẽ chuyển cho Gemini AI trả lời) ───
const QUESTION_INDICATORS = {
    vi: ['gì', 'sao', 'thế nào', 'tại sao', 'được không', 'tư vấn', 'hỏi', 'chữa', 'điều trị', 'triệu chứng', 'bệnh', 'giúp', 'như thế nào'],
    en: ['what', 'how', 'why', 'who', 'where', 'query', 'question', 'consult', 'advice', 'symptom', 'disease', 'treat', 'cure', 'should i', 'help me with'],
    id: ['apa', 'bagaimana', 'kenapa', 'mengapa', 'siapa', 'tanya', 'konsultasi', 'gejala', 'penyakit', 'bisa tidak', 'tolong', 'cara']
};

// ─── Cấu hình từ phủ định/hủy bỏ (nếu đứng trước từ khóa sẽ bỏ qua bot nội bộ) ───
const NEGATION_INDICATORS = {
    vi: ['không', 'đừng', 'hủy', 'chả', 'chưa', 'từ chối', 'không muốn'],
    en: ['no', 'not', 'dont', "don't", 'cancel', 'never', 'without', 'deny', 'refuse', 'cannot'],
    id: ['tidak', 'jangan', 'batal', 'belum', 'ga', 'gak', 'bukan', 'tanpa']
};

/**
 * Kiểm tra text có chứa từ khóa nội bộ không.
 * Nếu match → trả về bot reply cố định đúng ngôn ngữ (KHÔNG gọi Gemini API để tiết kiệm token).
 * Logic detect ngôn ngữ tương tự getBotResponse: VI → ID → EN (fallback).
 * @param {string} text - Tin nhắn của user.
 * @returns {{ reply: string, actionLabel: string, actionUrl: string } | null}
 */
export function checkKeywordAndGetBotReply(text) {
    const lowerText = text.toLowerCase().trim();

    // Detect ngôn ngữ (tái sử dụng logic từ getBotResponse)
    const hasVietnamese = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text);
    const hasIndonesian = /saya|aku|sakit|demam|batuk|pusing|dokter|obat|rumah sakit|mau|tolong|terima kasih|halo|hai|selamat|ya|tidak|berapa|biaya|asuransi|booking|janji/i.test(lowerText);
    const lang = hasVietnamese ? 'vi' : hasIndonesian ? 'id' : 'en';

    // 1. [BỘ LỌC CÂU HỎI]: Nếu là câu hỏi chuyên sâu hoặc chứa dấu hỏi (?) -> Chuyển cho Gemini AI trả lời
    if (lowerText.includes('?')) {
        return null;
    }
    const isQuestion = QUESTION_INDICATORS[lang].some(indicator => {
        // Đảm bảo khớp nguyên từ để tránh match nhầm (vd: "gì" khác "gìn giữ")
        const regex = new RegExp(`\\b${indicator}\\b`, 'i');
        return regex.test(lowerText);
    });
    if (isQuestion) {
        return null; 
    }

    let earliestMatch = null;
    let earliestIndex = Infinity;
    let matchedKeyword = '';

    // 2. Tìm từ khóa xuất hiện sớm nhất trong câu
    for (const item of KEYWORD_REPLIES) {
        for (const kw of item.keywords) {
            const index = lowerText.indexOf(kw);
            if (index !== -1 && index < earliestIndex) {
                earliestIndex = index;
                earliestMatch = item;
                matchedKeyword = kw;
            }
        }
    }

    // 3. [BỘ LỌC PHỦ ĐỊNH]: Kiểm tra xem trước từ khóa đó có từ phủ định không
    if (earliestMatch && matchedKeyword) {
        const textBefore = lowerText.substring(0, earliestIndex).trim();
        if (textBefore) {
            const wordsBefore = textBefore.split(/\s+/);
            const lastThreeWords = wordsBefore.slice(-3); // Lấy tối đa 3 từ ngay trước từ khóa

            const isNegated = lastThreeWords.some(word => 
                NEGATION_INDICATORS[lang].includes(word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ""))
            );

            if (isNegated) {
                return null; // Bỏ qua bot nội bộ, nhường cho Gemini AI
            }
        }

        return {
            reply: earliestMatch.reply[lang],
            actionLabel: earliestMatch.actionLabel[lang],
            actionUrl: earliestMatch.actionUrl,
        };
    }

    return null;
}

export default function getBotResponse(messageText) {
    const text = messageText.trim();
    if (!text) return "Có gì cần mình giúp không ạ? 😊 / Ada yang bisa dibantu? / How can I help?";

    const lower = text.toLowerCase();

    // =================== PHÁT HIỆN NGÔN NGỮ ===================
    const hasVietnamese = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text);
    const hasIndonesian = /saya|aku|sakit|demam|batuk|pusing|dokter|obat|rumah sakit|mau|tolong|terima kasih|halo|hai|selamat|ya|tidak|berapa|biaya|asuransi|booking|janji/i.test(lower);
    const lang = hasVietnamese ? "vi" : hasIndonesian ? "id" : "en";

    // =================== TỪ KHÓA MỞ RỘNG ===================
    const kw = {
        // 1-20 (cũ)
        headache: ["headache", "migraine", "tension", "cluster", "sinus headache", "đau đầu", "nhức đầu", "đau nửa đầu", "đầu như búa bổ", "đầu ong ong", "sakit kepala", "pusing"],
        severe_headache: ["worst headache", "thunderclap", "exploding head", "đau đầu kinh khủng", "đầu muốn nổ", "đau đầu đột ngột"],
        fever: ["fever", "high fever", "chills", "shivering", "body hot", "sốt", "sốt cao", "rét run", "nóng sốt", "demam tinggi", "menggigil"],
        cough_throat: ["cough", "dry cough", "wet cough", "whooping", "sore throat", "phlegm", "ho", "ho khan", "ho có đờm", "ho gà", "đau họng", "rát họng", "viêm họng", "batuk", "sakit tenggorokan"],
        runny_nose: ["runny nose", "stuffy nose", "sinusitis", "allergies", "sổ mũi", "nghẹt mũi", "viêm xoang", "dị ứng mũi", "hidung meler", "pilek"],
        stomach: ["stomach ache", "abdominal pain", "diarrhea", "dysentery", "vomiting", "nausea", "food poisoning", "đau bụng", "tiêu chảy", "ỉa chảy", "nôn", "buồn nôn", "ngộ độc", "sakit perut", "diare", "muntah"],
        chest_pain: ["chest pain", "heart attack", "angina", "palpitation", "đau ngực", "tức ngực", "nhồi máu cơ tim", "đau tim", "đánh trống ngực", "dada sesak"],
        dizzy: ["dizzy", "vertigo", "lightheaded", "faint", "spinning", "chóng mặt", "hoa mắt", "choáng", "ngất", "pusing berputar"],
        rash_allergy: ["rash", "itchy", "hives", "urticaria", "eczema", "dermatitis", "ngứa", "nổi mẩn", "mề đay", "dị ứng", "phát ban", "gatal", "biduran", "alergi"],
        back_pain: ["back pain", "lower back", "sciatica", "slipped disc", "đau lưng", "đau lưng dưới", "thoát vị đĩa đệm", "đau thần kinh tọa", "sakit pinggang"],
        joint_pain: ["joint pain", "arthritis", "gout", "rheumatoid", "osteoarthritis", "đau khớp", "viêm khớp", "gout", "thoái hóa khớp", "sakit sendi"],
        muscle_pain: ["muscle pain", "body ache", "fibromyalgia", "cramps", "đau cơ", "nhức mỏi người", "chuột rút", "sakit otot"],
        fatigue: ["tired", "fatigue", "chronic fatigue", "weak", "mệt mỏi", "yếu người", "lelah terus", "mệt"],
        insomnia: ["insomnia", "can't sleep", "sleep apnea", "mất ngủ", "khó ngủ", "ngáy ngủ", "susah tidur"],
        anxiety_stress: ["anxiety", "stress", "panic attack", "depression", "lo âu", "căng thẳng", "trầm cảm", "hoảng loạn", "stres berat"],
        toothache: ["toothache", "cavity", "gum disease", "đau răng", "sâu răng", "viêm nướu", "sakit gigi"],
        eye_pain: ["eye pain", "conjunctivitis", "stye", "dry eye", "glaucoma", "đau mắt", "mắt đỏ", "lẹo mắt", "khô mắt", "glôcôm", "mata merah"],
        ear_pain: ["ear pain", "otitis", "tinnitus", "earwax", "đau tai", "viêm tai giữa", "ù tai", "ráy tai", "sakit telinga"],
        urinary: ["painful urination", "uti", "kidney stone", "blood in urine", "tiểu buốt", "nhiễm trùng tiểu", "sỏi thận", "tiểu máu", "sakit kencing"],
        period_pain: ["period pain", "pms", "endometriosis", "heavy period", "đau bụng kinh", "rong kinh", "lạc nội mạc", "kinh nguyệt nhiều", "sakit haid"],

        // 21-52 (20 nhóm mới – siêu chi tiết)
        acne: ["acne", "pimples", "cystic acne", "oily skin", "mụn trứng cá", "mụn viêm", "mụn mủ", "mụn nội tiết", "jerawat"],
        hair_loss: ["hair loss", "alopecia", "balding", "rụng tóc", "hói đầu", "tóc rụng nhiều", "kebotakan"],
        constipation: ["constipation", "hard stool", "bloating", "táo bón", "đầy hơi", "đi ngoài khó", "susah bab"],
        hemorrhoid: ["hemorrhoid", "piles", "anal pain", "trĩ", "trĩ nội", "trĩ ngoại", "wasir", "ambeien"],
        acid_reflux: ["heartburn", "gerd", "acid reflux", "ợ nóng", "ợ chua", "trào ngược", "maag kronis"],
        high_blood_pressure: ["hypertension", "high bp", "huyết áp cao", "tăng huyết áp", "hipertensi"],
        diabetes: ["diabetes", "high sugar", "low sugar", "tiểu đường", "đái tháo đường", "gula darah tinggi"],
        asthma: ["asthma", "wheezing", "breathless", "hen suyễn", "khó thở hen", "khò khè", "asma"],
        covid_symptom: ["covid", "lost taste", "lost smell", "corona", "mất vị giác", "mất khứu giác", "positif covid", "covid", "mất mùi", "mất taste", "mất smell", "corona", "positif covid", "hilang rasa", "hilang bau"],
        flu_vaccine: ["vaccine", "flu shot", "tiêm ngừa", "vắc xin cúm", "vaksin"],
        pregnancy: ["pregnant", "morning sickness", "missed period", "mang thai", "trễ kinh", "hamil"],
        contraception: ["birth control", "contraceptive", "avoid pregnancy", "tránh thai", "thuốc tránh thai", "kb", "kontrasepsi"],
        erectile_dysfunction: ["erectile", "impotence", "can't get hard", "yếu sinh lý", "bất lực", "disfungsi ereksi"],
        premature_ejaculation: ["premature", "early ejaculation", "xuất sớm", "xuất tinh sớm", "ejakulasi dini"],
        vaginal_discharge: ["vaginal discharge", "abnormal discharge", "khí hư", "keputihan", "keputihan tidak normal"],
        std: ["std", "sti", "herpes", "gonorrhea", "chlamydia", "bệnh lậu", "bệnh herpes", "bệnh xã hội", "penyakit kelamin"],
        thyroid: ["thyroid", "hypothyroid", "hyperthyroid", "bướu cổ", "cường giáp", "suy giáp", "tiroid"],
        anemia: ["anemia", "low hemoglobin", "pale", "thiếu máu", "da xanh xao", "kurang darah"],
        hepatitis: ["hepatitis", "liver pain", "jaundice", "viêm gan", "vàng da", "sakit hati"],
        kidney_stone: ["kidney stone", "renal colic", "đau quặn thận", "sỏi thận", "batu ginjal"],
        gallstone: ["gallstone", "đau túi mật", "sỏi mật", "batu empedu"],
        vertigo_bppv: ["bppv", "vertigo positional", "chóng mặt tư thế", "pusing berputar saat bangun"],
        migraine_aura: ["migraine with aura", "see lights", "đau nửa đầu có hào quang", "migrain dengan aura"],
        nosebleed: ["nosebleed", "epistaxis", "chảy máu mũi", "mimisan"],
        hemorrhoids_pregnant: ["hemorrhoid pregnant", "trĩ khi mang thai", "wasir hamil"],
        breastfeeding: ["breastfeeding", "lactation", "painful nipple", "cho con bú", "nyeri puting saat menyusui"],
        baby_fever: ["baby fever", "infant fever", "trẻ sốt", "bayi demam", "bé sốt", "trẻ sốt", "con sốt"],
        child_cough: ["child cough", "cough in kids", "trẻ ho", "batuk anak", "con ho", "ho kéo dài"],
        dengue: ["dengue", "dengue fever", "sốt xuất huyết", "demam berdarah"],
        malaria: ["malaria", "sốt rét", "malaria"],
        tuberculosis: ["tb", "tuberculosis", "lao phổi", "tuberkulosis"],
        cancer_symptom: ["cancer", "lump", "weight loss", "ung thư", "khối u", "sụt cân không rõ lý do"],

        appointment: ["đặt lịch", "book", "booking", "lịch khám", "đặt bác sĩ", "đặt khám", "muốn khám", "đặt chỗ", "lịch hẹn", "đặt cuộc hẹn", "appointment", "schedule", "booking", "janji dokter", "buat janji", "reservasi", "appointment", "appointment", "schedule", "book doctor", "make appointment", "booking"],
        cost: ["bao nhiêu tiền", "giá", "phí", "chi phí", "tiền khám", "hết bao nhiêu", "mấy tiền", "cost", "price", "how much", "fee", "miễn phí", "miễn phí không", "có mất tiền không", "free", "biaya", "berapa", "harga", "ongkos", "gratis", "bayar", "mahal", "cost", "price", "how much", "fee", "free", "charge", "expensive"],
        insurance: ["bảo hiểm", "bh", "bảo hiểm y tế", "bảo hiểm tư nhân", "có bảo hiểm", "dùng bảo hiểm", "thanh toán bảo hiểm", "insurance", "bhyt", "asuransi", "bpjs", "insurance", "jaminan kesehatan", "insurance", "health insurance", "bpjs", "coverage"],
        greeting: ["hi", "hello", "hey", "morning", "chào", "xin chào", "halo", "hai", "selamat pagi", "hê lô", "lô", "alo", "chèo", "selamat siang"],
        thanks: ["thanks", "thank you", "cảm ơn", "cám ơn", "terima kasih", "makasih", "tks", "ok", "okie", "kém ơn", "kẻm ơn", "ơn"],
        bye: ["bye", "goodbye", "see you", "tạm biệt", "hẹn gặp lại", "dadah", "sampai jumpa", "thôi nha"],
        
    };

    const has = (keys) => keys.some(k => lower.includes(k));
    const t = (en, vi, id) => lang === "vi" ? vi : lang === "id" ? id : en;
    
    if (has(kw.appointment)) return t(
        "Want to see a doctor? Open 📅 Schedule or 👤 Doctor List → choose your doctor & available slot! Super easy 😊",
        "Muốn khám hả? Vào 📅 Lịch hẹn hoặc 👤 Danh sách bác sĩ → chọn bác sĩ + giờ trống là xong liền nha, dễ lắm luôn! 😍",
        "Mau ketemu dokter? Buka 📅 Jadwal atau 👤 Daftar Dokter → pilih dokter & jam kosong aja, gampang banget!"
    );
    if (has(kw.cost)) return t(
        "Each doctor has their own consultation fee. Check their profile 👤 – price is clearly shown there!",
        "Phí khám mỗi bác sĩ còn tùy vào bệnh lý nữa nha. Nhắn tin với bác sĩ ngay thôi! 💰",
        "Biaya konsultasi tiap dokter beda-beda. Cek profil di 👤 Daftar Dokter ya, harga sudah tercantum jelas!"
    );
    if (has(kw.insurance)) return t(
        "We accept almost all insurance (including BHYT & private). Upload your card in profile after booking – we’ll handle the rest!",
        "Bên mình nhận hầu hết bảo hiểm luôn á! Đặt lịch xong → vào Hồ sơ → up thẻ bảo hiểm là tự động áp dụng nha 🥰",
        "Kami terima hampir semua asuransi (BPJS & swasta)! Upload kartu di profil setelah booking ya."
    );



    // =================== CẤP CỨU TRƯỚC ===================
    if (has(kw.severe_headache))
        return t("⚡ Sudden “worst headache of my life” → this can be brain hemorrhage → GO TO ER IMMEDIATELY!!!",
            "⚡ Đau đầu đột ngột kinh khủng nhất từ trước tới giờ → có thể XUẤT HUYẾT NÃO → ĐI CẤP CỨU NGAY LẬP TỨC NHA!!!",
            "⚡ Sakit kepala mendadak paling parah seumur hidup → bisa PERDARAHAN OTAK → LANGSUNG KE IGD SEKARANG!!!");

    if (has(kw.chest_pain))
        return t("⚡ CHEST PAIN + HARD TO BREATHE → CALL 115 RIGHT NOW!!! ❤️", "⚡ ĐAU NGỰC + KHÓ THỞ → GỌI 115 NGAY LẬP TỨC ĐI ỦA!!! ĐỪNG CHỜ NỮA!!! ❤️", "⚡ Dada sesak → TELEPON 119/112 SEKARANG JUGA!!!");

    // =================== 32 NHÓM BỆNH – SIÊU TỰ NHIÊN ===================

    // =================== CẤP CỨU TRƯỚC ===================
    

    // 1. Đau đầu thông thường
    if (has(kw.headache))
        return t("Headache sucks huh? 😣 Lie down in a dark quiet room, drink lots of water, take paracetamol. If it keeps coming back, let’s book you a neuro doc okay?",
            "Đau đầu khó chịu quá haaa 😣 Nằm nghỉ chỗ tối + yên tĩnh, uống thật nhiều nước nha, thêm viên paracetamol là đỡ hẳn. Còn đau hoài thì mình đặt bác sĩ thần kinh cho bạn nha?",
            "Sakit kepala ya? Istirahat di tempat gelap & tenang, minum air banyak + paracetamol. Kalau sering kambuh booking dokter saraf yuk!");        

    // 3. Sốt
    if (has(kw.fever))
        return t("Got a fever? Drink tons of water, take paracetamol every 6 hours. If >38.5°C for more than 3 days → we need a doctor!",
            "Sốt hả? Uống nước thật thật nhiều + hạ sốt paracetamol mỗi 6 tiếng nha. Sốt cao ≥38.5°C kéo dài quá 3 ngày là phải đi khám liền đó nha!",
            "Demam? Minum air banyak banget + paracetamol tiap 6 jam. Kalau >38.5°C lebih dari 3 hari harus ke dokter ya!");

    // 4. Ho + đau họng + cảm cúm
    if (has(kw.cough_throat))
        return t("Cough & sore throat? Warm honey-lemon water is pure magic 😋 Rest well, stay hydrated. If >7–10 days or hard to breathe → doctor time!",
            "Ho + đau họng đúng không? Nước ấm + chanh + mật ong là “thần dược” luôn á 😋 Nghỉ ngơi nhiều vào nha. Kéo dài hơn tuần hoặc khó thở thì đi khám liền nhe!",
            "Batuk + tenggorokan sakit? Air hangat + madu lemon mantap banget 😋 Istirahat ya. Kalau lebih dari seminggu atau sesak → ke dokter!");

    // 5. Sổ mũi / nghẹt mũi / viêm xoang
    if (has(kw.runny_nose))
        return t("Runny or stuffy nose? Steam inhalation + saline spray helps a lot. If green/yellow mucus >10 days → sinus infection, let’s see ENT doc.",
            "Sổ mũi hoặc nghẹt mũi hả? Xông hơi + xịt nước muối sinh lý là đỡ liền. Mũi có đờm xanh/vàng kéo dài quá 10 ngày thì bị viêm xoang rồi đó, đi khám TAI MŨI HỌNG nha!",
            "Hidung meler atau tersumbat? Uap air panas + semprot saline. Kalau ingus kuning/hijau >10 hari → sinusitis, ke dokter THT yuk!");

    // 6. Đau bụng / tiêu chảy / nôn ói
    if (has(kw.stomach))
        return t("Tummy trouble? Sip ORS slowly every few minutes. If blood, severe pain or can’t keep water down → hospital right now!",
            "Đau bụng + tiêu chảy + nôn hả? Uống Oresol từng ngụm nhỏ thôi nha, đừng uống ực một hơi. Có máu, đau dữ dội hoặc nôn mãi không giữ được nước → đi viện liền nhé!",
            "Sakit perut + diare + muntah? Minum Oralit sedikit-sedikit tiap beberapa menit. Ada darah atau parah banget → langsung RS ya!");

    // 7. Chóng mặt / choáng váng
    if (has(kw.dizzy))
        return t("Feeling dizzy? Sit or lie down immediately to avoid falling. Drink water, eat something light. Happens often → we should check!",
            "Chóng mặt hả? Ngồi hoặc nằm xuống ngay kẻo ngã nha! Uống nước + ăn nhẹ tí. Nếu hay bị thế này thì đi khám cho chắc nhé, đừng chủ quan!",
            "Pusing sampai kliyengan? Duduk/duduk dulu ya biar ga jatuh. Minum air + makan sedikit. Sering gini harus periksa dokter!");

    // 8. Ngứa / nổi mẩn / dị ứng
    if (has(kw.rash_allergy))
        return t("Itchy rash? Try not to scratch! Take antihistamine. If face/lips swell or hard to breathe → EMERGENCY!!!",
            "Ngứa + nổi mẩn tùm lum hả? Cố đừng gãi nha! Uống thuốc kháng histamine thử xem. Mà nếu sưng mặt, sưng môi, khó thở → CẤP CỨU LIỀN ĐÓ!!!",
            "Gatal + bentol-bentol? Jangan digaruk ya! Minum obat alergi dulu. Kalau bengkak muka/bibir atau susah napas → DARURAT!!!");

    // 9. Đau lưng
    if (has(kw.back_pain))
        return t("Back pain? Rest + warm compress + gentle stretching. If pain shoots down leg → possible slipped disc, let’s book ortho!",
            "Đau lưng khó chịu quá ha? Nghỉ ngơi + chườm ấm + tập nhẹ nhàng nha. Đau lan xuống chân thì khả năng cao thoát vị đĩa đệm rồi, đặt bác sĩ cơ xương khớp liền nha!",
            "Sakit punggung? Istirahat + kompres hangat + peregangan ringan. Nyeri ke kaki → mungkin hernia nukleus pulposus, booking dokter tulang yuk!");

    // 10. Đau khớp / viêm khớp / gout
    if (has(kw.joint_pain))
        return t("Joint pain? Rest the joint, ice it, elevate. If red/hot/swollen (especially big toe) → probably gout attack!",
            "Đau khớp, sưng đỏ (nhất là ngón chân cái) hả? Nghỉ ngơi + chườm đá + kê cao nha. Khả năng cao bị gout đó, cần đi khám nội cơ xương khớp liền!",
            "Nyeri sendi + bengkak merah (terutama jempol kaki) → kemungkinan besar asam urat naik! Periksa dokter rematik ya.");

    // 11. Đau cơ / nhức mỏi người
    if (has(kw.muscle_pain))
        return t("Whole body aching? Could be viral fever or just overwork. Rest + hydrate + light massage helps a ton.",
            "Nhức mỏi toàn thân hả? Có thể đang bị virus hoặc làm việc nặng quá đó. Nghỉ ngơi + uống nước nhiều + xoa bóp nhẹ là đỡ liền nha!",
            "Badan pegal semua? Bisa lagi kena virus atau kecapekan. Istirahat + minum air banyak + pijat ringan.");

    // 12. Mệt mỏi kéo dài
    if (has(kw.fatigue))
        return t("Always tired even after sleep? Could be anemia, thyroid, or vitamin D deficiency → let’s do a blood test!",
            "Mệt mỏi hoài dù ngủ đủ hả? Có thể thiếu máu, suy giáp hoặc thiếu vitamin D đó → đi xét nghiệm máu cho chắc nha, mình đặt lịch giúp luôn!",
            "Selalu lemas padahal tidur cukup? Bisa anemia/tiroid/vit D kurang → cek darah yuk!");

    // 13. Mất ngủ
    if (has(kw.insomnia))
        return t("Can’t sleep? Try no phone 1h before bed, warm milk, deep breathing. Still bad after 2 weeks → sleep specialist or psych?",
            "Mất ngủ triền miên hả? Tắt điện thoại trước khi ngủ 1 tiếng, uống sữa ấm, hít thở sâu nha. Vẫn không ngủ được 2 tuần thì đi khám tâm thần hoặc chuyên gia giấc ngủ nha!",
            "Susah tidur terus? Matikan HP 1 jam sebelum tidur, minum susu hangat, tarik napas dalam. Kalau >2 minggu tetap gitu → ke dokter tidur ya.");

    // 14. Lo âu / căng thẳng / panic
    if (has(kw.anxiety_stress))
        return t("Feeling anxious or stressed? Try 4-7-8 breathing. It’s okay to ask for help – I can book a psychologist for you right now ❤️",
            "Lo lắng, căng thẳng quá hả? Thử hít thở 4-7-8 nha (hít 4s, giữ 7s, thở ra 8s). Không sao đâu, cần nói chuyện thì mình đặt lịch bác sĩ tâm lý cho bạn liền nè ❤️",
            "Cemas/stres banget? Coba teknik napas 4-7-8. Gak apa-apa minta tolong, aku bantu booking psikolog sekarang juga ❤️");

    // 15. Đau răng
    if (has(kw.toothache))
        return t("Toothache is the worst! Rinse with warm salt water, take painkiller, book dentist ASAP – don’t wait until it swells!",
            "Đau răng kinh khủng luôn đúng không! Súc miệng nước muối ấm + uống giảm đau tạm, nhưng phải đặt nha sĩ liền nha, để lâu sưng mặt đó!",
            "Sakit gigi parah ya! Kumur air garam hangat + obat nyeri, tapi harus booking dokter gigi sekarang juga!");

    // 16. Đau mắt / đỏ mắt
    if (has(kw.eye_pain))
        return t("Red or painful eyes? Wash with saline, NO rubbing! If vision blurry or light hurts → eye doctor today!",
            "Mắt đỏ + đau + ngứa hả? Rửa nước muối sinh lý, ĐỪNG DỤI MẮT nha! Nhìn mờ hoặc sợ ánh sáng thì đi khám mắt ngay hôm nay luôn đó!",
            "Mata merah + perih + gatal? Cuci air garam, JANGAN DIGOSOK! Pandangan kabur atau takut cahaya → ke dokter mata hari ini juga!");

    // 17. Đau tai / ù tai
    if (has(kw.ear_pain))
        return t("Ear pain or ringing? Don’t put anything in → see ENT doctor soon, could be infection!",
            "Đau tai hoặc ù ù hả? Tuyệt đối đừng nhỏ gì lung tung → đi khám Tai Mũi Họng nha, có thể bị viêm tai giữa đó!",
            "Sakit telinga atau dengung? Jangan masukin apa-apa → ke dokter THT ya, bisa infeksi!");

    // 18. Tiểu buốt / tiểu rát / nhiễm trùng tiểu
    if (has(kw.urinary))
        return t("Burning when peeing? Drink tons of water + cranberry juice → book urologist fast!",
            "Tiểu buốt/tiểu rát kinh khủng hả? Uống thật thật nhiều nước + nước nam việt quất → đặt lịch tiết niệu liền nha, đừng để lâu!",
            "Kencing perih banget? Minum air banyak + jus cranberry → booking dokter urologi cepet!");

    // 19. Đau bụng kinh / rong kinh
    if (has(kw.period_pain))
        return t("Period cramps? Warm compress on tummy + ibuprofen works wonders. Very heavy/painful every month → see gynae ❤️",
            "Đau bụng kinh hành hạ hả? Chườm ấm bụng + uống ibuprofen là đỡ nhiều lắm luôn. Mỗi tháng đau kinh khủng hoặc ra máu nhiều → đi khám phụ khoa nha ❤️",
            "Sakit haid parah? Kompres hangat perut + ibuprofen. Tiap bulan begitu atau darah banjir → ke dokter kandungan ya ❤️");

    // 20. Mụn trứng cá nặng
    if (has(kw.acne))
        return t("Bad acne? Gentle cleanser 2x/day, no picking! Book dermatologist – they have magic creams & pills!",
            "Mụn nổi tùm lum luôn hả? Rửa mặt nhẹ nhàng 2 lần/ngày, ĐỪNG NẶN nha! Đặt bác sĩ da liễu đi, họ có thuốc bôi + uống siêu hiệu quả luôn!",
            "Jerawat parah? Cuci muka 2x sehari, JANGAN DIPENCET! Booking dokter kulit, ada obat ajaib!");

    // 21. Rụng tóc
    if (has(kw.hair_loss))
        return t("Losing a lot of hair? Could be stress, hormones, or deficiency. Book dermatologist – early treatment works best!",
            "Tóc rụng cả nắm luôn hả? Có thể do stress, nội tiết hoặc thiếu chất → đặt bác sĩ da liễu sớm nha, chữa sớm là mọc lại đẹp lắm!",
            "Rambut rontok banyak? Bisa stres/hormon/kurang gizi → booking dokter kulit cepet ya, diatasi dini bisa tumbuh lagi!");

    // 22. Táo bón
    if (has(kw.constipation))
        return t("Constipated? Drink warm water + eat papaya/kiwi + walk around. Still stuck after 3 days → we need meds!",
            "Táo bón khổ sở hả? Uống nước ấm + ăn đu đủ/chuối/kiwi + đi bộ nha. 3 ngày vẫn không đi được thì cần uống thuốc rồi đó!",
            "Susah bab? Minum air hangat + makan pepaya/pisang/kiwi + jalan-jalan. 3 hari masih gak keluar → butuh obat!");

    // 23. Bệnh trĩ
    if (has(kw.hemorrhoid))
        return t("Hemorrhoids? Sitz bath 3x/day + fiber + plenty of water. Bleeding or very painful → book colorectal surgeon!",
            "Trĩ hành hạ đúng không? Ngâm nước ấm 3 lần/ngày + ăn nhiều rau + uống nước nhiều nha. Chảy máu hoặc đau quá → đặt bác sĩ hậu môn trực tràng nha!",
            "Wasir? Rendam air hangat 3x sehari + serat tinggi. Berdarah atau sakit banget → ke dokter bedah kolorektal!");

    // 24. Ợ nóng / trào ngược
    if (has(kw.acid_reflux))
        return t("Heartburn? Avoid spicy/fatty food, eat small meals, don’t lie down right after eating. Still bad → gastroenterologist!",
            "Ợ nóng/ợ chua triền miên hả? Tránh đồ cay + dầu mỡ, ăn ít một, ăn xong đừng nằm liền. Vẫn không đỡ → đi khám tiêu hóa nha!",
            "Maag/gerd? Hindari pedas + berminyak, makan sedikit-sedikit, jangan langsung tidur. Masih sering → ke dokter penyakit dalam ya.");

    // 25. Huyết áp cao
    if (has(kw.high_blood_pressure))
        return t("High blood pressure? Low salt, exercise, take meds regularly. Let’s book a cardiologist for check-up!",
            "Huyết áp cao hả? Ăn nhạt + tập thể dục đều + uống thuốc đúng giờ nha. Đặt lịch tim mạch kiểm tra cho chắc nhé!",
            "Tekanan darah tinggi? Kurangi garam + olahraga + minum obat rutin. Booking dokter jantung yuk!");

    // 26. Tiểu đường
    if (has(kw.diabetes))
        return t("Diabetes? Check sugar regularly, low sugar diet, exercise. Book endocrinologist for best control!",
            "Tiểu đường hả? Đo đường huyết đều đặn + ăn ít tinh bột đường + tập thể dục nha. Đặt bác sĩ nội tiết để kiểm soát tốt nhất nè!",
            "Diabetes? Cek gula rutin + diet rendah gula + olahraga. Booking dokter endokrin ya.");

    // 27. Hen suyễn
    if (has(kw.asthma))
        return t("Asthma acting up? Use your blue inhaler. If not better in 15 mins → hospital now!",
            "Hen lên cơn hả? Xịt thuốc cắt cơn (màu xanh) ngay nha. 15 phút vẫn không đỡ → đi bệnh viện liền nhé!",
            "Asma kambuh? Semprot inhaler biru. 15 menit gak membaik → langsung RS!");

    // 28. Sốt xuất huyết / nghi sốt xuất huyết
    if (has(kw.dengue))
        return t("⚡ High fever + severe body pain + rash → suspect dengue → hospital immediately for blood test!!!",
            "⚡ Sốt cao + đau nhức toàn thân + phát ban → NGHI SỐT XUẤT HUYẾT → ĐI VIỆN XÉT NGHIỆM MÁU NGAY LẬP TỨC!!!",
            "⚡ Demam tinggi + nyeri hebat + ruam → CURIGA DBD → LANGSUNG RS CEK DARAH!!!");

    // 29. Mang thai / nghi mang thai
    if (has(kw.pregnancy))
        return t("Pregnant or think you might be? Take a test → book OBGYN for first check-up! Congratulations ❤️",
            "Nghi mang thai hả? Thử que 2 vạch chưa? → Đặt lịch sản phụ khoa khám thai lần đầu nha! Chúc mừng bạn sắp làm mẹ rồi ❤️",
            "Hamil atau curiga hamil? Tes dulu → booking dokter kandungan untuk USG pertama! Selamat ya ❤️");

    // 30. Tránh thai / kế hoạch hóa
    if (has(kw.contraception))
        return t("Want birth control? Many options: pill, IUD, implant… Book OBGYN – they’ll find the best for you!",
            "Muốn tránh thai hả? Có rất nhiều cách: uống thuốc, vòng, cấy que… Đặt bác sĩ phụ khoa tư vấn loại phù hợp nhất nha!",
            "Mau KB? Banyak pilihan: pil, spiral, implan… Booking dokter kandungan biar dicarikan yang cocok!");

    // 31. Yếu sinh lý / rối loạn cương
    if (has(kw.erectile_dysfunction))
        return t("Erectile issues? Super common, nothing to be shy about! Book andrologist – modern meds work wonders ❤️",
            "Yếu sinh lý hả anh? Rất nhiều người gặp mà, đừng ngại nha! Đặt bác sĩ nam khoa đi, thuốc mới giờ hiệu quả cực kỳ luôn ❤️",
            "Susah ereksi? Biasa banget kok, gak usah malu! Booking dokter andrologi – obat sekarang ampuh banget ❤️");

    // 32. Xuất tinh sớm
    if (has(kw.premature_ejaculation))
        return t("Premature ejaculation? Happens to many guys. Techniques + meds can help a lot – book andrologist!",
            "Xuất tinh sớm hả? Nhiều anh bị lắm, có kỹ thuật + thuốc cải thiện cực tốt luôn → đặt nam khoa nha anh!",
            "Ejakulasi dini? Banyak cowok ngalamin, ada teknik + obat membantu banget → booking andrologi ya!");

    // 33. Khí hư / ra nhiều dịch âm đạo bất thường vaginal_discharge
    if (has(kw.vaginal_discharge))
        return t("Abnormal discharge? Color/smell changed? Could be infection → book gynecologist today ❤️",
            "Khí hư ra nhiều + màu lạ + mùi hôi hả? Có thể bị viêm nhiễm → đặt phụ khoa khám liền nha chị/em ❤️",
            "Keputihan abnormal + warna/baauk aneh? Bisa infeksi → booking dokter kandungan hari ini ya ❤️");

    // 34. Bệnh xã hội / lo STD
    if (has(kw.std))
        return t("Worried about STD? No judgment here – early test & treatment is best. I’ll book you a discreet appointment ❤️",
            "Lo bệnh xã hội hả? Không phán xét gì hết nha, xét nghiệm + điều trị sớm là khỏi hẳn. Mình đặt lịch khám kín đáo cho bạn liền ❤️",
            "Takut PMS? Gak ada judge di sini, tes dini + pengobatan cepet sembuh total. Aku booking janji rahasia ya ❤️");

    // 35. Sỏi thận / đau quặn thận
    if (has(kw.kidney_stone))
        return t("Kidney stone pain is brutal! Drink 3–4L water/day + painkiller → book urologist for ultrasound!",
            "Đau quặn thận kinh khủng luôn đúng không! Uống 3–4 lít nước/ngày + giảm đau → đặt tiết niệu siêu âm gấp nha!",
            "Batu ginjal nyeri banget ya! Minum 3–4 liter/hari + obat nyeri → booking urologi USG cepet!");

    // 36. Thiếu máu / thiếu sắt
    if (has(kw.anemia))
        return t("Always pale & tired? Probably anemia. Blood test + iron supplement → book internal medicine!",
            "Da xanh xao + mệt hoài hả? 90% là thiếu máu thiếu sắt đó → xét nghiệm máu + uống sắt → đặt nội tổng quát nha!",
            "Pucat + lemas terus? Kemungkinan besar anemia. Cek darah + suplemen zat besi → booking dokter penyakit dalam!");

    // 37. Cường giáp / suy giáp
    if (has(kw.thyroid))
        return t("Heart racing or always cold? Could be thyroid issue → blood test TSH is key! Book endocrinologist.",
            "Tim đập nhanh/rụng tóc/mệt mỏi/lạnh tay chân → nghi tuyến giáp đó → xét nghiệm TSH là biết liền! Đặt bác sĩ nội tiết nha!",
            "Jantung berdegup kencang atau selalu dingin? Bisa tiroid → cek TSH. Booking endokrin ya!");

    // 38. Viêm gan / vàng da
    if (has(kw.hepatitis))
        return t("Yellow skin/eyes? Possible hepatitis → hospital now for liver tests!",
            "Da/vàng mắt hả? Có thể viêm gan → đi viện xét nghiệm chức năng gan ngay nha!",
            "Kulit/mata kuning? Bisa hepatitis → langsung RS cek fungsi hati!");

    // 39. Lao phổi / nghi lao
    if (has(kw.tuberculosis))
        return t("Cough >3 weeks + night sweats + weight loss → possible TB → chest X-ray + sputum test urgently!",
            "Ho trên 3 tuần + đổ mồ hôi trộm + sụt cân → nghi lao phổi → chụp X-quang phổi + xét nghiệm đờm gấp nha!",
            "Batuk >3 minggu + keringat malam + turun berat badan → curiga TBC → rontgen + tes dahak segera!");

    // 40. Ung thư / lo có khối u
    if (has(kw.cancer_symptom))
        return t("Found a lump or unexplained weight loss? Don’t panic – early check saves lives. Book oncologist or related specialist now ❤️",
            "Sờ thấy cục lạ hoặc sụt cân không rõ lý do → đừng hoảng nha, phát hiện sớm là chữa khỏi được! Mình đặt bác sĩ ung bướu hoặc chuyên khoa liên quan liền ❤️",
            "Ada benjolan atau turun BB tanpa sebab → jangan panik, deteksi dini sembuh total! Aku booking onkologi ya ❤️");

    // 41. Chóng mặt tư thế (BPPV)
    if (has(kw.vertigo_bppv))
        return t("Room spinning when you turn head? Classic BPPV – very treatable with Epley maneuver. Book ENT or neuro!",
            "Xoay đầu là trời đất quay cuồng hả? 99% là BPPV – chữa siêu đơn giản bằng động tác Epley thôi! Đặt TAI MŨI HỌNG hoặc thần kinh nha!",
            "Kepala diputar dunia berputar? Khas BPPV – sembuh dengan gerakan Epley aja! Booking THT atau saraf ya!");

    // 42. Đau nửa đầu có hào quang (migraine with aura)
    if (has(kw.migraine_aura))
        return t("Seeing flashing lights before headache? Migraine with aura – preventive meds work great. Book neurologist!",
            "Thấy đèn nhấp nháy trước khi đau nửa đầu hả? Đây là migraine có triệu chứng → có thuốc dự phòng cực hiệu quả! Đặt thần kinh nha!",
            "Sebelum pusing lihat lampu berkilat-kilat? Migrain dengan aura – ada obat pencegahan top! Booking saraf!");

    // 43. Chảy máu mũi
    if (has(kw.nosebleed))
        return t("Frequent nosebleeds? Pinch nose 10 mins + ice. If keeps happening → ENT check for vessel cauterization.",
            "Chảy máu mũi hoài hả? Bóp mũi 10 phút + chườm lạnh. Lặp lại nhiều thì đi TAI MŨI HỌNG đốt mạch nha!",
            "Mimisan sering? Jepit hidung 10 menit + es. Kalau sering kambuh → ke THT buat koagulasi!");

    // 44. Trĩ khi mang thai
    if (has(kw.hemorrhoids_pregnant))
        return t("Hemorrhoids during pregnancy? Totally normal but painful. Sitz bath + fiber → ask OBGYN for safe cream ❤️",
            "Trĩ khi mang thai khổ lắm đúng không mẹ bầu? Ngâm nước ấm + ăn nhiều rau → hỏi bác sĩ sản cho kem bôi an toàn nha ❤️",
            "Wasir pas hamil? Wajar banget tapi sakit ya. Rendam air hangat + serat tinggi → tanya dokter kandungan krim yang aman ❤️");

    // 45. Đau núm vú khi cho con bú
    if (has(kw.breastfeeding))
        return t("Sore nipples from breastfeeding? Correct latch + lanolin cream. Still cracked/bleeding → lactation consultant!",
            "Cho con bú đau đầu ti quá hả mẹ? Bé ngậm đúng chưa + bôi kem lanolin nha. Vẫn nứt chảy máu thì gặp chuyên gia tư vấn sữa mẹ nha!",
            "Nyeri puting saat menyusui? Pastikan pelekatan benar + oles lanolin. Masih luka berdarah → ketemu konselor laktasi ya!");

    // 46. Bé bị sốt (trẻ em)
    if (has(kw.baby_fever))
        return t("Baby has fever? Undress to cool down + paracetamol syrup (dose by weight). >38.5°C or baby <3mo → pediatric ER now!",
            "Bé sốt hả ba mẹ? Cởi bớt áo + hạ sốt paracetamol siro (liều theo cân nặng). >38.5°C hoặc bé dưới 3 tháng tuổi → cấp cứu nhi ngay nha!!!",
            "Bayi demam? Buka baju + paracetamol sirup (dosis sesuai BB). >38.5°C atau bayi <3 bulan → langsung UGD anak ya!!!");

    // 47. Trẻ ho lâu ngày
    if (has(kw.child_cough))
        return t("Child coughing >2 weeks? Could be whooping cough or asthma. Book pediatrician + chest check!",
            "Bé ho kéo dài quá 2 tuần hả? Có thể ho gà hoặc hen → đặt bác sĩ nhi + khám phổi gấp nha ba mẹ!",
            "Anak batuk >2 minggu? Bisa batuk rejan atau asma → booking dokter anak + cek paru ya!");

    // 48. Sốt rét / nghi malaria
    if (has(kw.malaria))
        return t("⚡ Cyclic fever + chills every 48–72h → suspect malaria → hospital for blood smear NOW!",
            "⚡ Sốt theo cơn rét run cách 48–72h → NGHI SỐT RÉT → ĐI VIỆN LẤY MÁU XÉT NGHIỆM NGAY!!!",
            "⚡ Demam berulang tiap 48–72 jam + menggigil → CURIGA MALARIA → RS CEK DARAH SEKARANG!!!");

    // COVID / mất vị giác, mất khứu giác
    if (has(kw.covid_symptom))
        return t("Lost taste/smell + fever/cough? Very likely COVID right now 😷 Test immediately (PCR/antigen) & isolate! I can help book a test center near you ❤️",
            "Mất vị giác + khứu giác + sốt/ho → 99% là COVID đó bạn ơi 😷 Đi test PCR hoặc test nhanh NGAY VÀ LUÔN nha, đồng thời cách ly liền! Mình đặt lịch test gần nhà cho bạn luôn nè ❤️",
            "Hilang rasa/bau + demam/batuk → hampir pasti COVID nih 😷 Tes PCR/antigen SEKARANG & isolasi dulu ya! Aku bantu booking tempat tes terdekat ❤️");

    // Muốn tiêm vắc-xin cúm / vắc-xin khác
    if (has(kw.flu_vaccine))
        return t("Want flu vaccine or other vaccines? We have influenza, pneumonia, shingles… Book vaccination service 📅 – super quick & safe!",
            "Muốn tiêm vắc-xin cúm hay vắc-xin khác hả? Bên mình có cúm, phế cầu, zona, HPV… Đặt lịch tiêm chủng 📅 là xong liền, an toàn & nhanh lắm luôn nha!",
            "Mau vaksin flu atau vaksin lain? Ada influenza, pneumonia, herpes zoster, HPV… Booking layanan vaksinasi 📅 aja, cepet & aman banget!");

    // Sỏi mật / đau túi mật
    if (has(kw.gallstone))
        return t("Sudden severe pain under right ribs + nausea after fatty meal → classic gallstone attack! Book gastroenterologist or surgeon for ultrasound!",
            "Đau dữ dội hạ sườn phải + buồn nôn sau khi ăn đồ dầu mỡ → 99% là sỏi mật hành hạ đó! Đặt bác sĩ tiêu hóa hoặc ngoại tiêu hóa siêu âm gấp nha!!!",
            "Nyeri hebat bawah rusuk kanan + mual setelah makan berlemak → khas serangan batu empedu! Booking dokter gastro atau bedah cerna untuk USG cepet ya!!!");

    // 49. Viêm kết mạc (đau mắt đỏ lây)
    if (has(["đau mắt đỏ", "viêm kết mạc", "conjunctivitis", "pink eye"]))
        return t("Pink eye? Super contagious! Antibiotic drops + no school 48h. Wash hands like crazy!",
            "Đau mắt đỏ lây kinh khủng luôn! Nhỏ kháng sinh + nghỉ học 48h nha. Rửa tay liên tục kẻo lây cả nhà đó!",
            "Mata merah menular banget! Tetes antibiotik + libur sekolah 2 hari. Cuci tangan terus ya!");

    // 50. Ngộ độc thực phẩm
    if (has(["ngộ độc", "ngộ độc thực phẩm", "ăn phải bậy", "food poisoning"]))
        return t("Food poisoning? Vomit + diarrhea = body getting rid of toxin. Hydrate + ORS. Can’t stop vomiting → hospital!",
            "Ngộ độc thực phẩm hả? Nôn + tiêu chảy là cơ thể đang thải độc đó. Uống Oresol bù nước. Nôn mãi không ngừng → đi viện truyền nước biển nha!",
            "Keracunan makanan? Muntah + diare = tubuh buang racun. Oralit terus. Muntah gak berhenti → RS infus!");

    // 51. Đau cổ / vai gáy (thoái hóa, vẹo cổ)
    if (has(["đau cổ", "đau vai gáy", "cứng cổ", "stiff neck", "leher kaku"]))
        return t("Stiff neck? Could be muscle strain or cervical issue. Warm compress + gentle stretch. Can’t turn head → ortho or neuro!",
            "Cứng cổ + đau vai gáy hả? Có thể do thoái hóa hoặc sai tư thế. Chườm ấm + xoay nhẹ. Không quay đầu được → đi cơ xương khớp hoặc thần kinh nha!",
            "Leher kaku + nyeri? Bisa salah posisi atau spondilosis. Kompres hangat + regangan. Gak bisa muter → ke dokter tulang/saraf!");

    // 52. Loét miệng / nhiệt miệng liên tục
    if (has(["nhiệt miệng", "loét miệng", "mouth ulcer", "aphtous", "sariawan berulang"]))
        return t("Recurrent mouth ulcers? Vitamin B + zinc + laser therapy works fast. Book ENT or dentist!",
            "Nhiệt miệng hoài không khỏi hả? Bổ sung vitamin B + kẽm + bắn laser là hết liền. Đặt TAI MŨI HỌNG hoặc nha sĩ nha!",
            "Sariawan terus-terusan? Vitamin B + zinc + laser cepet sembuh. Booking THT atau dokter gigi ya!");

    // =================== CHÀO & KẾT THÚC ===================
    if (has(kw.greeting)) return t(
        "Hey there! How can I help you today? 😊",
        "Chào bạn nè! Hôm nay đang khó chịu gì kể mình nghe nào 🥰",
        "Halo bro/sis! Ada keluhan apa hari ini? 😄"
    );
    if (has(kw.thanks)) return t("Anytime! 💕", "Có gì đâu mà 🫶", "Sama-sama ya! 😊");
    if (has(kw.bye)) return t("Take care & get well soon! ❤️", "Mau khỏe nha, có gì nhắn mình liền nhé! ❤️", "Cepet sembuh ya! 💕");

    // Không hiểu → vẫn rất thân thiện
    return t(
        "Hmm I didn’t catch that 😅 Tell me your symptoms or question in any language – I got you!",
        "Ủa mình chưa hiểu lắm á 😅 Bạn cứ nói tiếng Việt, tiếng Anh hay tiếng Indo gì cũng được, mô tả triệu chứng hay hỏi gì mình hỗ trợ liền nha!",
        "Aduh aku belum ngerti 😅 Ceritain aja pakai bahasa apa pun, aku bantu sebisanya ya!"
    );
}
