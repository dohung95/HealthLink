import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../services/ai/bot_brain.dart';
import '../../../services/ai/gemini_service.dart';
import '../../../services/booking/booking_service.dart';

/// Model nội bộ cho một tin nhắn trong cuộc trò chuyện với bot.
class BotMessage {
  final String text;
  final bool isBot;
  final DateTime time;

  /// Nếu là tin nhắn bot có action, lưu thêm thông tin action.
  final String? actionLabel;
  final String? actionRoute;
  final List<BookingDoctor>? suggestedDoctors;

  const BotMessage({
    required this.text,
    required this.isBot,
    required this.time,
    this.actionLabel,
    this.actionRoute,
    this.suggestedDoctors,
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

  List<BookingDoctor> _availableDoctors = [];
  bool _doctorsFetched = false;

  List<BotMessage> get messages => List.unmodifiable(_messages);
  bool get isTyping => _isTyping;

  ChatbotProvider() {
    _gemini = GeminiService();
    _init();
  }

  Future<void> _ensureDoctorsLoaded(String? accessToken) async {
    if (_doctorsFetched || accessToken == null || accessToken.isEmpty) return;
    try {
      final bookingService = BookingService(accessToken: accessToken);
      final paged = await bookingService.searchDoctors(pageSize: 200);
      _availableDoctors = paged.items;
      _doctorsFetched = true;
    } catch (e) {
      debugPrint('Failed to load doctors: $e');
    }
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
  Future<void> sendMessage(String text, {String? accessToken}) async {
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

    // Load all doctors if not loaded
    await _ensureDoctorsLoaded(accessToken);

    // Xác định location từ text (nếu có - offline fallback)
    String? targetLocation;
    final uniqueLocations = _availableDoctors
        .map((d) => d.location)
        .where((l) => l.isNotEmpty)
        .toSet()
        .toList();
    for (final loc in uniqueLocations) {
      if (text.toLowerCase().contains(loc.toLowerCase())) {
        targetLocation = loc;
        break;
      }
    }

    // 1. Gọi Gemini AI trước tiên
    try {
      final geminiRes = await _gemini.sendMessage(text);
      if (geminiRes != null && geminiRes.text.isNotEmpty) {
        reply = geminiRes.text;
        actionLabel = geminiRes.actionLabel;
        actionRoute = geminiRes.actionUrl;
      }
    } catch (e) {
      debugPrint('Gemini failed: $e');
    }

    final isVi = !text.toLowerCase().contains('doctor') && !text.toLowerCase().contains('dokter');

    // 2. Fallback: offline symptom matching nếu Gemini lỗi
    if (reply == null || reply.isEmpty) {
      final specialtyMatch = BotBrain.checkSymptomAndGetSpecialty(text);
      if (specialtyMatch != null) {
        final specName = specialtyMatch.label[isVi ? 'vi' : 'en'] ?? specialtyMatch.specialty;
        reply = isVi 
            ? "${specialtyMatch.icon} Dựa trên triệu chứng bạn mô tả, mình gợi ý bạn nên khám chuyên khoa **$specName**! Dưới đây là một số bác sĩ phù hợp:"
            : "${specialtyMatch.icon} Based on your symptoms, I recommend seeing a **$specName** specialist! Here are some available doctors:";
        actionRoute = "/booking?specialty=${Uri.encodeComponent(specialtyMatch.specialty)}";
        actionLabel = isVi ? "📅 Xem tất cả bác sĩ $specName" : "📅 View all $specName doctors";
      }
    }

    // 3. Fallback: Thử keyword shortcut nếu không bắt được triệu chứng
    if (reply == null || reply.isEmpty) {
      final keywordResult = BotBrain.checkKeyword(text);
      if (keywordResult != null) {
        reply = keywordResult['reply'];
        actionLabel = keywordResult['actionLabel'];
        actionRoute = keywordResult['actionRoute'];
      }
    }

    // 4. Fallback cuối cùng nếu cả 3 đều không có kết quả
    if (reply == null || reply.isEmpty) {
      reply = BotBrain.getBotResponse(text); // This function might also need bilingual updates if it's hardcoded
    }
    
    reply ??= isVi 
        ? "Xin lỗi, mình chưa hiểu câu hỏi của bạn. Bạn có thể mô tả rõ hơn triệu chứng không?"
        : "Sorry, I didn't quite understand. Could you describe your symptoms more clearly?";

    // 5. Thêm nút nếu cần (suy luận fallback)
    if (actionLabel == null && reply != null) {
      final inferred = BotBrain.inferAction(text, reply);
      if (inferred != null) {
        actionLabel = inferred['actionLabel'];
        actionRoute = inferred['actionRoute'];
      }
    }

    // 6. Xây dựng danh sách bác sĩ gợi ý từ local data (giống web)
    List<BookingDoctor> suggestedDoctors = [];
    if (actionRoute != null) {
      final matchedSpecialties = <String>{};
      
      // Override location if AI provided one in the URL
      if (actionRoute!.contains('location=')) {
        final locMatch = RegExp(r'location=([^&]+)').firstMatch(actionRoute!);
        if (locMatch != null) {
          try {
            targetLocation = Uri.decodeComponent(locMatch.group(1)!);
          } catch (_) {
            targetLocation = locMatch.group(1);
          }
        }
      }

      final availableByLocation = targetLocation != null
          ? _availableDoctors
              .where((d) => d.location.toLowerCase().contains(targetLocation!.toLowerCase()))
              .toList()
          : _availableDoctors;

      if (actionRoute!.contains('specialty=')) {
        final specMatch = RegExp(r'specialty=([^&]+)').firstMatch(actionRoute!);
        if (specMatch != null) {
          try {
            final specialty = Uri.decodeComponent(specMatch.group(1)!);
            if (specialty.isNotEmpty) {
              matchedSpecialties.add(specialty.toLowerCase());
            }
          } catch (_) {
            matchedSpecialties.add(specMatch.group(1)!.toLowerCase());
          }
        }
      }

      final allSymptoms = BotBrain.checkSymptomsAndGetAllSpecialties(text);
      for (final symp in allSymptoms) {
        matchedSpecialties.add(symp.specialty.toLowerCase());
      }

      if (matchedSpecialties.isNotEmpty) {
        for (final spec in matchedSpecialties) {
          final docs = availableByLocation.where((d) => d.specialtyName.toLowerCase() == spec).toList();
          suggestedDoctors.addAll(docs);
        }
        // Deduplicate
        final seen = <String>{};
        suggestedDoctors = suggestedDoctors.where((d) => seen.add(d.doctorId)).toList();
      }

      // If no specific specialty was requested but we have a valid actionRoute
      // If we filtered by location and found NO ONE, we SHOULD NOT fallback to all doctors.
      if (suggestedDoctors.isEmpty && targetLocation == null && matchedSpecialties.isEmpty) {
        suggestedDoctors = List.from(availableByLocation);
      } else if (suggestedDoctors.isEmpty && targetLocation != null && matchedSpecialties.isEmpty) {
         suggestedDoctors = List.from(availableByLocation); // Might be empty if no doctors in that location
      }

      // Sort by rating
      suggestedDoctors.sort((a, b) => b.averageRating.compareTo(a.averageRating));
      
      // Giới hạn hiển thị 50 bác sĩ
      if (suggestedDoctors.length > 50) {
        suggestedDoctors = suggestedDoctors.take(50).toList();
      }
    }

    // 7. Ghi đè phản hồi của AI nếu có bộ lọc nhưng không tìm thấy bác sĩ nào
    if (actionRoute != null && suggestedDoctors.isEmpty && (targetLocation != null || (actionRoute!.contains('specialty=') || BotBrain.checkSymptomsAndGetAllSpecialties(text).isNotEmpty))) {
      reply = isVi 
          ? "Xin lỗi bạn, hiện tại HealthLink chưa có bác sĩ nào phù hợp với khu vực hoặc chuyên khoa bạn tìm kiếm."
          : "Sorry, HealthLink currently doesn't have any doctors available for that specific location or specialty.";
      actionRoute = null;
      actionLabel = null;
    }

    _messages.add(BotMessage(
      text: reply,
      isBot: true,
      time: DateTime.now(),
      actionLabel: actionLabel,
      actionRoute: actionRoute,
      suggestedDoctors: suggestedDoctors,
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
