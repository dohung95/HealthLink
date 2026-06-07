import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../models/chat/conversation.dart';
import '../../models/chat/message.dart';

/// Service gọi REST API cho tính năng Chat.
/// Ánh xạ đúng theo ChatController.java của backend.
class ChatService {
  ChatService._();

  /// Headers JSON kèm Bearer token.
  static Map<String, String> _headers(String token) => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      };

  /// Parse thông báo lỗi từ response body backend.
  static String _parseError(http.Response res, String fallback) {
    try {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return (data['message'] ?? data['Message'] ?? fallback).toString();
    } catch (_) {
      return fallback;
    }
  }

  // ── Chat Rooms ──────────────────────────────────────────────────────────────

  /// GET /api/chat/rooms/me
  /// Lấy danh sách phòng chat của user hiện tại.
  /// [currentUserId] dùng để xác định ai là "partner" trong mỗi phòng.
  static Future<List<Conversation>> getChatRooms(
    String token,
    String currentUserId,
  ) async {
    final res = await http
        .get(
          Uri.parse(ApiConfig.chatRooms),
          headers: _headers(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final List<dynamic> data = jsonDecode(res.body) as List<dynamic>;
      return data
          .map((e) => Conversation.fromJson(e as Map<String, dynamic>, currentUserId))
          .toList();
    }

    throw Exception(_parseError(res, 'Không thể tải danh sách phòng chat.'));
  }

  /// POST /api/chat/rooms
  /// Tạo hoặc lấy phòng chat với một user khác.
  static Future<Conversation> getOrCreateRoom(
    String token,
    String currentUserId,
    String user2Id, {
    int? appointmentId,
  }) async {
    final body = <String, dynamic>{
      'user1Id': currentUserId, // sẽ bị override bởi JWT trên server
      'user2Id': user2Id,
      if (appointmentId != null) 'appointmentId': appointmentId,
    };

    final res = await http
        .post(
          Uri.parse(ApiConfig.chatRoomCreate),
          headers: _headers(token),
          body: jsonEncode(body),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200 || res.statusCode == 201) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return Conversation.fromJson(data, currentUserId);
    }

    throw Exception(_parseError(res, 'Không thể tạo phòng chat.'));
  }

  // ── Messages ────────────────────────────────────────────────────────────────

  /// GET /api/chat/rooms/{chatRoomId}/messages
  /// Lấy toàn bộ lịch sử tin nhắn trong phòng.
  static Future<List<Message>> getMessages(
    String token,
    String currentUserId,
    String chatRoomId,
  ) async {
    final res = await http
        .get(
          Uri.parse(ApiConfig.chatMessages(chatRoomId)),
          headers: _headers(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final List<dynamic> data = jsonDecode(res.body) as List<dynamic>;
      return data
          .map((e) => Message.fromJson(e as Map<String, dynamic>, currentUserId))
          .toList();
    }

    throw Exception(_parseError(res, 'Không thể tải tin nhắn.'));
  }

  /// POST /api/chat/messages
  /// Gửi tin nhắn mới.
  /// Backend yêu cầu: chatRoomId, receiverId, content.
  static Future<Message> sendMessage(
    String token,
    String currentUserId,
    String chatRoomId,
    String receiverId,
    String content,
  ) async {
    final body = {
      'chatRoomId': chatRoomId,
      'receiverId': receiverId,
      'content': content,
    };

    final res = await http
        .post(
          Uri.parse(ApiConfig.chatSendMessage),
          headers: _headers(token),
          body: jsonEncode(body),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200 || res.statusCode == 201) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return Message.fromJson(data, currentUserId);
    }

    throw Exception(_parseError(res, 'Không thể gửi tin nhắn.'));
  }

  /// PATCH /api/chat/rooms/{chatRoomId}/read
  /// Đánh dấu toàn bộ tin nhắn chưa đọc là đã đọc.
  static Future<void> markAsRead(String token, String chatRoomId) async {
    try {
      await http
          .patch(
            Uri.parse(ApiConfig.chatMarkAsRead(chatRoomId)),
            headers: _headers(token),
          )
          .timeout(ApiConfig.connectTimeout);
    } catch (_) {
      // Không throw – lỗi đánh dấu đọc không nên làm crash UX
    }
  }
}
