import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../services/ai/bot_brain.dart';
import '../../../services/ai/gemini_service.dart';

/// Model nội bộ cho một tin nhắn trong cuộc trò chuyện với bot.
class BotMessage {
  final String text;
  final bool isBot;
  final DateTime time;

  /// Nếu là tin nhắn bot có action, lưu thêm thông tin action.
  final String? actionLabel;
  final String? actionRoute;

  const BotMessage({
    required this.text,
    required this.isBot,
    required this.time,
    this.actionLabel,
    this.actionRoute,
  });
}

/// Quản lý state cho màn hình chat bot.
///
/// Lịch sử chat tự động reset vào đầu mỗi ngày mới.
/// Ngày cuối cùng chat được lưu trong SharedPreferences.
class ChatbotProvider extends ChangeNotifier {
  static const String _lastDateKey = 'chatbot_last_date';

  final List<BotMessage> _messages = [];
  bool _isTyping = false;
  late final GeminiService _gemini;

  List<BotMessage> get messages => List.unmodifiable(_messages);
  bool get isTyping => _isTyping;

  ChatbotProvider() {
    _gemini = GeminiService();
    _init();
  }

  /// Khởi tạo: kiểm tra ngày và thêm tin nhắn chào.
  Future<void> _init() async {
    final isNewDay = await _checkAndUpdateDate();
    if (isNewDay) {
      // Ngày mới → reset Gemini session
      _gemini.reset();
    }
    _messages.add(BotMessage(
      text: 'Hi, how can I help you? 😊',
      isBot: true,
      time: DateTime.now(),
    ));
    notifyListeners();
  }

  /// Kiểm tra xem hôm nay có phải ngày mới so với lần dùng cuối không.
  /// Nếu là ngày mới → cập nhật ngày và trả về true.
  Future<bool> _checkAndUpdateDate() async {
    final prefs = await SharedPreferences.getInstance();
    final today = _todayString();
    final lastDate = prefs.getString(_lastDateKey);

    if (lastDate != today) {
      await prefs.setString(_lastDateKey, today);
      return true;
    }
    return false;
  }

  /// Format ngày hiện tại thành chuỗi 'yyyy-MM-dd'.
  String _todayString() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }

  /// Gửi tin nhắn từ user và xử lý phản hồi bot.
  Future<void> sendMessage(String text) async {
    if (text.trim().isEmpty) return;

    // Kiểm tra ngày mỗi khi gửi — bắt case app chạy qua đêm
    final isNewDay = await _checkAndUpdateDate();
    if (isNewDay) {
      _resetMessages();
      return; // Hiện tin nhắn chào mới, bỏ qua message cũ
    }

    // Thêm tin nhắn user
    _messages.add(BotMessage(
      text: text.trim(),
      isBot: false,
      time: DateTime.now(),
    ));
    _isTyping = true;
    notifyListeners();

    // Giả lập delay gõ
    await Future.delayed(const Duration(milliseconds: 600));

    String? reply;
    String? actionLabel;
    String? actionRoute;

    // 1. Thử keyword shortcut trước (0 token)
    final keywordResult = BotBrain.checkKeyword(text);
    if (keywordResult != null) {
      reply = keywordResult['reply'];
      actionLabel = keywordResult['actionLabel'];
      actionRoute = keywordResult['actionRoute'];
    }

    // 2. Gọi Gemini AI
    if (reply == null) {
      final geminiRes = await _gemini.sendMessage(text);
      if (geminiRes != null) {
        reply = geminiRes.text;
        actionLabel = geminiRes.actionLabel;
        actionRoute = geminiRes.actionUrl;
      }
    }

    // 3. Fallback: offline symptom matching nếu Gemini lỗi
    reply ??= BotBrain.getBotResponse(text);

    // 4. Fallback cuối cùng nếu cả Gemini và offline đều không có kết quả
    reply ??=
        "I don't understand yet 😅 Could you describe your symptoms more clearly or ask in English?";

    // 5. Thêm nút nếu cần (suy luận fallback)
    if (actionLabel == null) {
      final inferred = BotBrain.inferAction(text, reply);
      if (inferred != null) {
        actionLabel = inferred['actionLabel'];
        actionRoute = inferred['actionRoute'];
      }
    }

    _messages.add(BotMessage(
      text: reply,
      isBot: true,
      time: DateTime.now(),
      actionLabel: actionLabel,
      actionRoute: actionRoute,
    ));
    _isTyping = false;
    notifyListeners();
  }

  /// Reset messages về tin nhắn chào và reset Gemini session.
  void _resetMessages() {
    _messages.clear();
    _gemini.reset();
    _messages.add(BotMessage(
      text: 'Hi, how can I help you? 😊',
      isBot: true,
      time: DateTime.now(),
    ));
    notifyListeners();
  }

  /// Xóa thủ công toàn bộ lịch sử chat (do user bấm "Clear history").
  void clearHistory() {
    _resetMessages();
  }
}
