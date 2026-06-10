import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../main.dart';
import '../models/chat/conversation.dart';
import '../models/chat/message.dart';
import '../services/chat/chat_service.dart';
import '../services/chat/stomp_service.dart';
import '../utils/notification_helper.dart';
import '../screens/chat/chat_room_screen.dart';
import '../screens/video_audio/video_call_screen.dart';
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

  Conversation? get currentConversation  => _currentConversation;
  List<Message> get messages             => _messages;
  bool          get isLoadingMessages    => _isLoadingMessages;
  bool          get isSending            => _isSending;
  String?       get messagesError        => _messagesError;

  // ── Conversations ──────────────────────────────────────────────────────────

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
        onWebRTCSignalReceived: _onWebRTCSignal,
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

  // ── Call State Guard ───────────────────────────────────────────────────────
  bool _isInCall = false;
  bool get isInCall => _isInCall;

  /// Xử lý tín hiệu WebRTC từ STOMP (Video Call)
  void _onWebRTCSignal(Map<String, dynamic> signal) {
    debugPrint('[ChatProvider] ⚡️ WebRTC signal received: $signal');
    final type = signal['type'];
    final senderId = signal['senderId'];
    final senderName = signal['senderName'];
    final roomId = signal['data'];
    
    debugPrint('[ChatProvider] type=$type, senderId=$senderId, senderName=$senderName, roomId=$roomId');
    
    if (type == 'CALL_REQUEST') {
      // Issue #5: Guard chồng chéo cuộc gọi
      if (_isInCall) {
        debugPrint('[ChatProvider] Automatically declining because already in a call.');
        StompService.instance.sendWebRTCSignal({
          'type': 'CALL_DECLINED',
          'senderId': _lastUserId ?? '',
          'senderName': 'Patient',
          'receiverId': senderId,
          'data': roomId,
        });
        return;
      }

      debugPrint('[ChatProvider] 📲 Incoming call from $senderName - showing dialog...');
      final context = navigatorKey.currentContext;
      
      if (context != null) {
        showDialog(
          context: context,
          barrierDismissible: false, // Bắt buộc user phải chọn Accept hoặc Decline
          routeSettings: const RouteSettings(name: '/incoming_call'),
          builder: (BuildContext dialogContext) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: Row(
                children: [
                  const Icon(Icons.videocam, color: Colors.green, size: 28),
                  const SizedBox(width: 8),
                  const Text('Incoming Video Call'),
                ],
              ),
              content: Text('${senderName ?? 'A doctor'} is calling you for a consultation.'),
              actions: [
                TextButton(
                  onPressed: () {
                    Navigator.pop(dialogContext);
                    // Báo từ chối cuộc gọi
                    StompService.instance.sendWebRTCSignal({
                      'type': 'CALL_DECLINED',
                      'senderId': _lastUserId ?? '',
                      'senderName': 'Patient',
                      'receiverId': senderId,
                      'data': roomId,
                    });
                  },
                  child: const Text('Decline', style: TextStyle(color: Colors.red)),
                ),
                  FilledButton(
                  onPressed: () {
                    Navigator.pop(dialogContext);
                    // Báo chấp nhận cuộc gọi
                    StompService.instance.sendWebRTCSignal({
                      'type': 'CALL_ACCEPTED',
                      'senderId': _lastUserId ?? '',
                      'senderName': 'Patient',
                      'receiverId': senderId,
                      'data': roomId,
                    });
                    
                    _isInCall = true;

                    // Vào màn hình Video Call với ĐÚNG roomId của bác sĩ
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        settings: const RouteSettings(name: '/video_call'),
                        builder: (_) => VideoCallScreen(
                          partnerName: senderName ?? 'Unknown',
                          partnerRole: 'Doctor',
                          partnerId: senderId,
                          roomId: roomId,
                        ),
                      ),
                    ).then((_) {
                      _isInCall = false; // Khi đóng màn hình thì reset
                    });
                  },
                  child: const Text('Accept'),
                ),
              ],
            );
          }
        );
      }
    } else if (type == 'HANGUP' || type == 'CALL_DECLINED') {
      debugPrint('[ChatProvider] 📞 Call ended/declined by $senderName');
      _isInCall = false;
      // Đóng hộp thoại gọi đến hoặc màn hình VideoCall nếu đang mở
      navigatorKey.currentState?.popUntil((route) {
        final name = route.settings.name;
        if (name == '/video_call' || name == '/incoming_call') {
          return false; // Pop route này đi
        }
        return true; // Dừng lại ở màn hình bình thường
      });
    }
  }

  void sendCallRequest({
    required String receiverId,
    required String roomId,
    required String myId,
    required String myName,
  }) {
    if (_isInCall) {
      debugPrint('[ChatProvider] Blocked: Already in a call');
      return;
    }

    _isInCall = true;

    StompService.instance.sendWebRTCSignal({
      'type': 'CALL_REQUEST',
      'senderId': myId,
      'senderName': myName,
      'receiverId': receiverId,
      'data': roomId,
    });
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
