import 'package:flutter/foundation.dart';
import '../models/chat/conversation.dart';
import '../models/chat/message.dart';
import '../services/chat/chat_service.dart';
import '../services/chat/stomp_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Provider quản lý toàn bộ state của màn hình Chat.
class ChatProvider extends ChangeNotifier {
  // ── State: Chat Room List ──────────────────────────────────────────────────

  List<Conversation> _conversations = [];
  bool _isLoadingConversations = false;
  String? _conversationsError;

  // Local state for Mute and Block
  final List<String> _mutedRoomIds = [];
  final List<String> _blockedRoomIds = [];

  List<Conversation> get conversations          => _conversations;
  bool               get isLoadingConversations => _isLoadingConversations;
  String?            get conversationsError      => _conversationsError;
  List<String>       get blockedRoomIds          => _blockedRoomIds;

  ChatProvider() {
    _loadLocalSettings();
  }

  Future<void> _loadLocalSettings() async {
    final prefs = await SharedPreferences.getInstance();
    final muted = prefs.getStringList('muted_rooms') ?? [];
    final blocked = prefs.getStringList('blocked_rooms') ?? [];
    _chatThemeIndex = prefs.getInt('chat_theme_index') ?? 0;
    _mutedRoomIds.addAll(muted);
    _blockedRoomIds.addAll(blocked);
    notifyListeners();
  }

  bool isMuted(String roomId) => _mutedRoomIds.contains(roomId);
  bool isBlocked(String roomId) => _blockedRoomIds.contains(roomId);

  Future<void> toggleMute(String roomId) async {
    final prefs = await SharedPreferences.getInstance();
    if (_mutedRoomIds.contains(roomId)) {
      _mutedRoomIds.remove(roomId);
    } else {
      _mutedRoomIds.add(roomId);
    }
    await prefs.setStringList('muted_rooms', _mutedRoomIds);
    notifyListeners();
  }

  Future<void> toggleBlock(String roomId) async {
    final prefs = await SharedPreferences.getInstance();
    if (_blockedRoomIds.contains(roomId)) {
      _blockedRoomIds.remove(roomId);
    } else {
      _blockedRoomIds.add(roomId);
    }
    await prefs.setStringList('blocked_rooms', _blockedRoomIds);
    notifyListeners();
  }

  // ── State: Chat Theme ──────────────────────────────────────────────────────

  int _chatThemeIndex = 0;
  int get chatThemeIndex => _chatThemeIndex;

  Future<void> changeTheme(int index) async {
    if (index >= 0 && index <= 5) {
      _chatThemeIndex = index;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('chat_theme_index', _chatThemeIndex);
      notifyListeners();
    }
  }

  // ── State: Chat Room (tin nhắn) ───────────────────────────────────────────

  Conversation? _currentConversation;
  List<Message> _messages = [];
  bool          _isLoadingMessages = false;
  bool          _isSending = false;
  String?       _messagesError;

  Conversation? get currentConversation  => _currentConversation;
  List<Message> get messages             => _messages;
  bool          get isLoadingMessages    => _isLoadingMessages;
  bool          get isSending            => _isSending;
  String?       get messagesError        => _messagesError;

  // ── Conversations ──────────────────────────────────────────────────────────

  /// Tải danh sách phòng chat từ backend.
  Future<void> loadConversations(String accessToken, String userId) async {
    _isLoadingConversations = true;
    _conversationsError = null;
    notifyListeners();

    try {
      _conversations = await ChatService.getChatRooms(accessToken, userId);
      // Sắp xếp mới nhất lên đầu
      _conversations.sort((a, b) => b.lastMessageTime.compareTo(a.lastMessageTime));

      // Bắt đầu kết nối STOMP WebSocket
      StompService.instance.connect(accessToken, userId, _onStompMessage);
    } catch (e) {
      debugPrint('ChatProvider loadConversations error: $e');
      _conversationsError = _clean(e.toString());
    } finally {
      _isLoadingConversations = false;
      notifyListeners();
    }
  }

  /// Xử lý tin nhắn nhận được từ STOMP
  void _onStompMessage(Message msg) {
    // Nếu tin nhắn thuộc về phòng đang mở
    if (_currentConversation?.id == msg.conversationId) {
      // Bỏ qua tin nhắn do chính mình vừa gửi (đã được optimistic update)
      // Thường thì backend trả về sẽ không có isPending=true. Chúng ta thay thế tin nhắn có cùng nội dung.
      final pendingIdx = _messages.indexWhere((m) => m.isPending && m.content == msg.content && m.senderId == msg.senderId);
      if (pendingIdx != -1) {
        _messages[pendingIdx] = msg;
      } else {
        // Tránh bị duplicate do STOMP và REST gọi cùng lúc
        final exists = _messages.any((m) => m.id == msg.id);
        if (!exists) {
          _messages.add(msg);
          _messages.sort((a, b) => a.sentAt.compareTo(b.sentAt)); // Đảm bảo đúng thứ tự
        }
      }
    }

    // Cập nhật lastMessage cho phòng chat đó
    String preview = msg.content;
    if (preview.isEmpty) {
      if (msg.imageUrl != null) preview = '[Image]';
      else if (msg.videoUrl != null) preview = '[Video]';
      else if (msg.fileUrl != null) preview = '[File]';
    }
    
    _updateLastMessage(msg.conversationId, preview, time: msg.sentAt);

    // Tăng unreadCount nếu không phải phòng đang mở
    if (_currentConversation?.id != msg.conversationId && msg.senderId != currentConversation?.partnerId) {
       final idx = _conversations.indexWhere((c) => c.id == msg.conversationId);
       if (idx != -1) {
         final old = _conversations[idx];
         _conversations[idx] = Conversation(
            id: old.id,
            partnerId: old.partnerId,
            partnerName: old.partnerName,
            partnerAvatarUrl: old.partnerAvatarUrl,
            appointmentId: old.appointmentId,
            lastMessage: old.lastMessage,
            lastMessageTime: old.lastMessageTime,
            unreadCount: old.unreadCount + 1,
         );
       }
    }

    // Đẩy phòng chat lên đầu danh sách
    final convIdx = _conversations.indexWhere((c) => c.id == msg.conversationId);
    if (convIdx > 0) {
      final conv = _conversations.removeAt(convIdx);
      _conversations.insert(0, conv);
    }
    
    notifyListeners();
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  /// Mở một phòng chat và tải tin nhắn.
  Future<void> openConversation(
    String accessToken,
    String userId,
    Conversation conversation,
  ) async {
    // Reset nếu chuyển phòng
    if (_currentConversation?.id != conversation.id) {
      _messages = [];
      _currentConversation = conversation;
    }

    _isLoadingMessages = true;
    _messagesError = null;
    notifyListeners();

    try {
      final msgs = await ChatService.getMessages(accessToken, userId, conversation.id);
      // Sắp xếp cũ nhất → mới nhất để hiển thị đúng chiều
      _messages = msgs..sort((a, b) => a.sentAt.compareTo(b.sentAt));
      // Đánh dấu đã đọc ngầm
      ChatService.markAsRead(accessToken, conversation.id);
      // Cập nhật unreadCount về 0 trong danh sách
      _markConversationRead(conversation.id);
    } catch (e) {
      _messagesError = _clean(e.toString());
    } finally {
      _isLoadingMessages = false;
      notifyListeners();
    }
  }

  /// Gửi tin nhắn với Optimistic Update.
  Future<void> sendMessage(
    String accessToken,
    String userId,
    String content, {
    String? imagePath,
    String? videoPath,
    String? filePath,
  }) async {
    if (_currentConversation == null || (content.trim().isEmpty && imagePath == null && videoPath == null && filePath == null)) return;

    final conv = _currentConversation!;

    // Thêm tin nhắn tạm ngay lập tức (optimistic)
    final pending = Message(
      id: 'pending_${DateTime.now().millisecondsSinceEpoch}',
      conversationId: conv.id,
      senderId: userId,
      content: content.trim(),
      imageUrl: imagePath, // Tạm thời lưu path local để UI có thể (tuỳ chọn) hiển thị
      videoUrl: videoPath,
      fileUrl: filePath,
      sender: MessageSender.me,
      sentAt: DateTime.now(),
      isPending: true,
    );
    _messages.add(pending);
    _isSending = true;
    notifyListeners();

    try {
      String? imageUrl;
      String? videoUrl;
      String? fileUrl;

      // Upload media nếu có
      if (imagePath != null) {
        imageUrl = await ChatService.uploadMedia(accessToken, conv.id, 'image', imagePath);
      } else if (videoPath != null) {
        videoUrl = await ChatService.uploadMedia(accessToken, conv.id, 'video', videoPath);
      } else if (filePath != null) {
        fileUrl = await ChatService.uploadMedia(accessToken, conv.id, 'file', filePath);
      }

      final confirmed = await ChatService.sendMessage(
        accessToken,
        userId,
        conv.id,
        conv.partnerId, // receiverId = đối phương
        content.trim(),
        imageUrl: imageUrl,
        videoUrl: videoUrl,
        fileUrl: fileUrl,
      );

      // Thay thế tin nhắn pending
      final idx = _messages.indexWhere((m) => m.id == pending.id);
      if (idx != -1) _messages[idx] = confirmed;

      // Cập nhật lastMessage trong danh sách phòng
      String preview = content.trim();
      if (preview.isEmpty) {
        if (imageUrl != null) preview = '[Image]';
        else if (videoUrl != null) preview = '[Video]';
        else if (fileUrl != null) preview = '[File]';
      }
      _updateLastMessage(conv.id, preview);
    } catch (e) {
      // Xóa tin nhắn pending nếu thất bại
      _messages.removeWhere((m) => m.id == pending.id);
      _messagesError = _clean(e.toString());
    } finally {
      _isSending = false;
      notifyListeners();
    }
  }

  /// Đóng phòng chat hiện tại.
  void closeConversation() {
    _currentConversation = null;
    _messages = [];
    _messagesError = null;
    notifyListeners();
  }

  void clearError() {
    _messagesError = null;
    _conversationsError = null;
    notifyListeners();
  }

  // ── Helpers private ────────────────────────────────────────────────────────

  void _markConversationRead(String conversationId) {
    final idx = _conversations.indexWhere((c) => c.id == conversationId);
    if (idx != -1) {
      final old = _conversations[idx];
      _conversations[idx] = Conversation(
        id: old.id,
        partnerId: old.partnerId,
        partnerName: old.partnerName,
        partnerAvatarUrl: old.partnerAvatarUrl,
        appointmentId: old.appointmentId,
        lastMessage: old.lastMessage,
        lastMessageTime: old.lastMessageTime,
        unreadCount: 0,
      );
    }
  }

  void _updateLastMessage(String conversationId, String content, {DateTime? time}) {
    final idx = _conversations.indexWhere((c) => c.id == conversationId);
    if (idx != -1) {
      final old = _conversations[idx];
      _conversations[idx] = Conversation(
        id: old.id,
        partnerId: old.partnerId,
        partnerName: old.partnerName,
        partnerAvatarUrl: old.partnerAvatarUrl,
        appointmentId: old.appointmentId,
        lastMessage: content,
        lastMessageTime: time ?? DateTime.now(),
        unreadCount: old.unreadCount,
      );
    }
  }

  String _clean(String raw) =>
      raw.startsWith('Exception: ') ? raw.substring(11) : raw;
}
