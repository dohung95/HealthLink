import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../../main.dart';
import '../../models/chat/conversation.dart';
import '../../models/chat/message.dart';
import '../../services/chat/chat_service.dart';
import '../../services/chat/stomp_service.dart';
import '../../utils/notification_helper.dart';
import '../../screens/chat/chat_room_screen.dart';
import '../../screens/video_audio/video_call_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Provider quản lý toàn bộ state của màn hình Chat.
class ChatProvider extends ChangeNotifier {
  // ── State: Chat Room List ──────────────────────────────────────────────────

  List<Conversation> _conversations = [];
  bool _isLoadingConversations = false;
  String? _conversationsError;

  // Local state for Mute and Block
  final List<String> _mutedRoomIds = [];

  List<Conversation> get conversations          => _conversations;
  bool               get isLoadingConversations => _isLoadingConversations;
  String?            get conversationsError      => _conversationsError;

  ChatProvider() {
    _loadLocalSettings();
  }

  Future<void> _loadLocalSettings() async {
    final prefs = await SharedPreferences.getInstance();
    final muted = prefs.getStringList('muted_rooms') ?? [];
    _chatThemeIndex = prefs.getInt('chat_theme_index') ?? 0;
    _mutedRoomIds.addAll(muted);
    notifyListeners();
  }

  bool isMuted(String roomId) => _mutedRoomIds.contains(roomId);
  
  /// Trả về ID của người chặn phòng chat (nếu có)
  String? getBlockedBy(String roomId) {
    try {
      final conv = _conversations.firstWhere((c) => c.id == roomId);
      return conv.blockedBy;
    } catch (_) {
      return null;
    }
  }

  bool isBlocked(String roomId) => getBlockedBy(roomId) != null;

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

  Future<void> toggleBlock(String accessToken, String userId, String roomId) async {
    try {
      await ChatService.toggleBlock(accessToken, roomId);
      // Reload danh sách phòng chat sau khi đổi trạng thái block
      await loadConversations(accessToken, userId);
    } catch (e) {
      debugPrint('[ChatProvider] toggleBlock error: $e');
      rethrow;
    }
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

  int _currentPage = 0;
  bool _hasMoreMessages = true;
  bool _isLoadingMoreMessages = false;

  Conversation? get currentConversation  => _currentConversation;
  List<Message> get messages             => _messages;
  bool          get isLoadingMessages    => _isLoadingMessages;
  bool          get isSending            => _isSending;
  String?       get messagesError        => _messagesError;
  bool          get hasMoreMessages      => _hasMoreMessages;
  bool          get isLoadingMoreMessages => _isLoadingMoreMessages;

  // ── WebSocket ──────────────────────────────────────────────────────────────

  String? _lastToken;
  String? _lastUserId;

  /// Tải danh sách phòng chat từ backend.
  Future<void> loadConversations(String accessToken, String userId) async {
    _isLoadingConversations = true;
    _conversationsError = null;
    _lastToken = accessToken;
    _lastUserId = userId;
    notifyListeners();

    try {
      _conversations = await ChatService.getChatRooms(accessToken, userId);
      // Sắp xếp mới nhất lên đầu
      _conversations.sort((a, b) => b.lastMessageTime.compareTo(a.lastMessageTime));

      // Bắt đầu kết nối STOMP WebSocket
      StompService.instance.connect(
        accessToken, 
        userId, 
        _onStompMessage,
      );
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
    if (msg.content == '[SYSTEM_BLOCK_UPDATE]') {
      if (_lastToken != null && _lastUserId != null) {
        loadConversations(_lastToken!, _lastUserId!);
      }
      return;
    }

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

    // Tăng unreadCount nếu không phải phòng đang mở và không phải tin nhắn do chính mình gửi
    if (_currentConversation?.id != msg.conversationId && msg.senderId != _lastUserId) {
       final idx = _conversations.indexWhere((c) => c.id == msg.conversationId);
       if (idx != -1) {
         final old = _conversations[idx];
         _conversations[idx] = Conversation(
            id: old.id,
            partnerId: old.partnerId,
            partnerName: old.partnerName,
            partnerSpecialty: old.partnerSpecialty,
            partnerAvatarUrl: old.partnerAvatarUrl,
            isOnline: old.isOnline,
            isSupport: old.isSupport,
            appointmentId: old.appointmentId,
            appointmentStatus: old.appointmentStatus,
            lastMessage: old.lastMessage,
            lastMessageTime: old.lastMessageTime,
            unreadCount: old.unreadCount + 1,
            isLastMessageRead: old.isLastMessageRead,
            blockedBy: old.blockedBy,
         );
       }

       // Hiển thị thông báo Notification chạy từ trên xuống
       if (msg.senderId != _lastUserId) {
         final context = navigatorKey.currentContext;
         final overlay = navigatorKey.currentState?.overlay;
         if (overlay != null && context != null) {
           if (!isMuted(msg.conversationId)) {
             final title = idx != -1 ? _conversations[idx].partnerName : 'New Message';
             final conv = idx != -1 ? _conversations[idx] : null;
             NotificationHelper.showTopNotification(
               overlay,
               title: title,
               message: preview,
               onTap: conv != null ? () {
                 Navigator.push(
                   context,
                   MaterialPageRoute(
                     builder: (_) => ChatRoomScreen(conversation: conv),
                   ),
                 );
               } : null,
             );
           }
         }
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
      _currentPage = 0;
      _hasMoreMessages = true;
    }

    _isLoadingMessages = true;
    _messagesError = null;
    notifyListeners();

    try {
      final msgs = await ChatService.getMessages(accessToken, userId, conversation.id, page: 0, size: 25);
      // Sắp xếp cũ nhất → mới nhất để hiển thị đúng chiều
      _messages = msgs..sort((a, b) => a.sentAt.compareTo(b.sentAt));
      _currentPage = 0;
      _hasMoreMessages = msgs.length >= 25;
      
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

  Future<void> loadMoreMessages(String accessToken, String userId) async {
    if (_currentConversation == null || _isLoadingMoreMessages || !_hasMoreMessages) return;

    _isLoadingMoreMessages = true;
    notifyListeners();

    try {
      final nextPage = _currentPage + 1;
      final msgs = await ChatService.getMessages(
        accessToken, 
        userId, 
        _currentConversation!.id, 
        page: nextPage, 
        size: 25,
      );

      if (msgs.isNotEmpty) {
        msgs.sort((a, b) => a.sentAt.compareTo(b.sentAt));
        // Lọc bỏ tin nhắn trùng lặp để tránh lỗi UI
        final existingIds = _messages.map((m) => m.id).toSet();
        final uniqueMsgs = msgs.where((m) => !existingIds.contains(m.id)).toList();
        _messages.insertAll(0, uniqueMsgs);
        _currentPage = nextPage;
        if (msgs.length < 25) {
          _hasMoreMessages = false;
        }
      } else {
        _hasMoreMessages = false;
      }
    } catch (e) {
      debugPrint('[ChatProvider] loadMoreMessages error: $e');
    } finally {
      _isLoadingMoreMessages = false;
      notifyListeners();
    }
  }

  /// Xoá conversation hiện tại khi rời khỏi màn hình chat
  void clearCurrentConversation() {
    _currentConversation = null;
    _messages = [];
    notifyListeners();
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
        partnerSpecialty: old.partnerSpecialty,
        partnerAvatarUrl: old.partnerAvatarUrl,
        isOnline: old.isOnline,
        isSupport: old.isSupport,
        appointmentId: old.appointmentId,
        appointmentStatus: old.appointmentStatus,
        lastMessage: old.lastMessage,
        lastMessageTime: old.lastMessageTime,
        unreadCount: 0,
        isLastMessageRead: true,
        blockedBy: old.blockedBy,
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
        partnerSpecialty: old.partnerSpecialty,
        partnerAvatarUrl: old.partnerAvatarUrl,
        isOnline: old.isOnline,
        isSupport: old.isSupport,
        appointmentId: old.appointmentId,
        appointmentStatus: old.appointmentStatus,
        lastMessage: content,
        lastMessageTime: time ?? DateTime.now(),
        unreadCount: old.unreadCount,
        isLastMessageRead: old.isLastMessageRead,
        blockedBy: old.blockedBy,
      );
    }
  }

  String _clean(String raw) =>
      raw.startsWith('Exception: ') ? raw.substring(11) : raw;
}
