import 'package:flutter/foundation.dart';
import 'package:google_generative_ai/google_generative_ai.dart';

class GeminiResponse {
  final String text;
  final String? actionUrl;
  final String? actionLabel;

  GeminiResponse({required this.text, this.actionUrl, this.actionLabel});
}

/// Wrapper gọi Gemini AI — fallback khi offline bot không khớp.
class GeminiService {
  static const String _apiKey = ''; // TODO: Move to .env file
  static const String _modelName = 'gemini-3.5-flash';

  static const String _systemPrompt = '''
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
- User wants pharmacy / medicine → [ACTION:/patient-dashboard/pharmacy]
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
Reply: "Bạn có thể tìm mua thuốc hạ sốt tại các nhà thuốc uy tín. Nhấn nút bên dưới để xem danh sách nhà thuốc gần bạn nhé! 💊 [ACTION:/patient-dashboard/pharmacy]"

## IMPORTANT RULES:
- NEVER tag if user is asking a general medical question without symptoms — just answer directly.
- NEVER tag if user uses negation (don't want, cancel, không muốn, hủy, tidak mau).
- Only ONE tag per reply, placed at the very end after all text.
- For symptom analysis, always recommend a specialty booking if needed.
''';

  late GenerativeModel _model;
  ChatSession? _chat;

  GeminiService() {
    _initModel();
  }

  void _initModel() {
    _model = GenerativeModel(
      model: _modelName,
      apiKey: _apiKey,
      systemInstruction: Content.system(_systemPrompt),
      generationConfig: GenerationConfig(maxOutputTokens: 2000),
    );
    _chat = _model.startChat();
  }

  /// Bóc tách thẻ [ACTION:/route?params] từ reply của Gemini AI.
  GeminiResponse _parseActionFromBotReply(String rawReply) {
    final actionRegex = RegExp(r'\[ACTION:([^\]]+)\]', caseSensitive: false);
    final match = actionRegex.firstMatch(rawReply);

    if (match == null) {
      return GeminiResponse(text: rawReply.trim());
    }

    final actionUrl = match.group(1)!.trim();
    final cleanText = rawReply.replaceAll(actionRegex, '').trim();

    // Mapping base routes to labels (mặc định lấy tiếng Việt cho app)
    final baseRoute = actionUrl.split('?').first;
    String? actionLabel;
    
    if (baseRoute == '/schedule' || baseRoute == '/booking') {
      actionLabel = '📅 Đặt lịch khám';
      // Nếu có specialty
      if (actionUrl.contains('specialty=')) {
        final uri = Uri.parse(actionUrl);
        final specialtyParam = uri.queryParameters['specialty'];
        if (specialtyParam != null) {
           final map = {
             'Internal Medicine': 'Nội tổng quát', 'Cardiology': 'Tim mạch', 'Neurology': 'Thần kinh',
             'Dermatology': 'Da liễu', 'Pediatrics': 'Nhi khoa', 'Obstetrics & Gynecology': 'Sản phụ khoa',
             'ENT': 'Tai mũi họng', 'Ophthalmology': 'Mắt', 'Surgery': 'Ngoại khoa', 'Dentistry': 'Nha khoa'
           };
           final localName = map[specialtyParam] ?? specialtyParam;
           actionLabel = '📅 Đặt lịch \$localName';
        }
      }
    } else if (baseRoute == '/doctors') {
      actionLabel = '🩺 Xem danh sách bác sĩ';
    } else if (baseRoute == '/patient-dashboard/pharmacy') {
      actionLabel = '💊 Xem nhà thuốc';
    }

    // App mobile hiện tại dùng '/booking' thay vì '/schedule', tự động map lại
    final finalRoute = (baseRoute == '/schedule') ? '/booking' : baseRoute;

    return GeminiResponse(
      text: cleanText,
      actionUrl: finalRoute, // Đưa route chuẩn vào
      actionLabel: actionLabel ?? '📅 Thực hiện',
    );
  }

  /// Gửi tin nhắn và nhận phản hồi từ Gemini.
  /// Trả về đối tượng GeminiResponse hoặc null nếu có lỗi.
  Future<GeminiResponse?> sendMessage(String userMessage) async {
    try {
      _chat ??= _model.startChat();
      final response = await _chat!.sendMessage(Content.text(userMessage));
      if (response.text == null) return null;
      return _parseActionFromBotReply(response.text!);
    } catch (e) {
      debugPrint('Gemini API Error: \$e');
      return null;
    }
  }

  /// Reset lịch sử chat bằng cách tạo session mới.
  void reset() {
    _initModel();
  }
}
