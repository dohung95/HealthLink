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

  /// POST /api/chat/rooms/{roomId}/block
  /// Bật/Tắt chặn phòng chat.
  static Future<void> toggleBlock(
    String token,
    String roomId,
  ) async {
    final res = await http
        .post(
          Uri.parse('${ApiConfig.baseUrl}/chat/rooms/$roomId/block'),
          headers: _headers(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      return;
    }
    throw Exception(_parseError(res, 'Can not toggle block room.'));
  }

  // ── Messages ────────────────────────────────────────────────────────────────

  /// GET /api/chat/rooms/{chatRoomId}/messages
  /// Lấy toàn bộ lịch sử tin nhắn trong phòng.
  static Future<List<Message>> getMessages(
    String token,
    String currentUserId,
    String chatRoomId, {
    int page = 0,
    int size = 25,
  }) async {
    final res = await http
        .get(
          Uri.parse(ApiConfig.chatMessages(chatRoomId, page: page, size: size)),
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

  /// GET /api/chat/rooms/{chatRoomId}/messages/search
  /// Tìm kiếm tin nhắn.
  static Future<List<Message>> searchMessages(
    String token,
    String currentUserId,
    String chatRoomId,
    String query,
  ) async {
    final res = await http
        .get(
          Uri.parse(ApiConfig.chatMessagesSearch(chatRoomId, query)),
          headers: _headers(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final List<dynamic> data = jsonDecode(res.body) as List<dynamic>;
      return data
          .map((e) => Message.fromJson(e as Map<String, dynamic>, currentUserId))
          .toList();
    }

    throw Exception(_parseError(res, 'Can not search messages.'));
  }

  /// GET /api/chat/rooms/{chatRoomId}/media
  /// Lấy toàn bộ media trong phòng (không phân trang).
  static Future<List<Message>> getMediaMessages(
    String token,
    String currentUserId,
    String chatRoomId,
  ) async {
    final res = await http
        .get(
          Uri.parse(ApiConfig.chatMedia(chatRoomId)),
          headers: _headers(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final List<dynamic> data = jsonDecode(res.body) as List<dynamic>;
      return data
          .map((e) => Message.fromJson(e as Map<String, dynamic>, currentUserId))
          .toList();
    }

    throw Exception(_parseError(res, 'Can not fetch media messages.'));
  }

  /// POST /api/chat/messages
  /// Gửi tin nhắn mới.
  /// Backend yêu cầu: chatRoomId, receiverId, content.
  static Future<Message> sendMessage(
    String token,
    String currentUserId,
    String chatRoomId,
    String receiverId,
    String content, {
    String? imageUrl,
    String? videoUrl,
    String? fileUrl,
    String? audioUrl,
  }) async {
    final body = {
      'chatRoomId': chatRoomId,
      'receiverId': receiverId,
      'content': content,
      if (imageUrl != null) 'imageUrl': imageUrl,
      if (videoUrl != null) 'videoUrl': videoUrl,
      if (fileUrl != null) 'fileUrl': fileUrl,
      if (audioUrl != null) 'audioUrl': audioUrl,
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

  /// POST /api/chat/upload
  /// Upload file media và trả về đường dẫn URL.
  static Future<String> uploadMedia(
    String token,
    String chatRoomId,
    String type,
    String filePath,
  ) async {
    var request = http.MultipartRequest('POST', Uri.parse(ApiConfig.chatMediaUpload));
    request.headers.addAll({'Authorization': 'Bearer $token'});
    request.fields['chatRoomId'] = chatRoomId;
    request.fields['type'] = type;
    request.files.add(await http.MultipartFile.fromPath('file', filePath));

    final streamedResponse = await request.send().timeout(const Duration(seconds: 30));
    final res = await http.Response.fromStream(streamedResponse);

    if (res.statusCode == 200 || res.statusCode == 201) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['url'] as String;
    }

    throw Exception(_parseError(res, 'Can not upload media file.'));
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
