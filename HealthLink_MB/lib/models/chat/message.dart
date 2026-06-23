/// Enum phân biệt vai trò gửi tin nhắn.
enum MessageSender { me, other }

/// Model đại diện cho một tin nhắn trong chat room.
/// Ánh xạ từ MessageDTO của backend.
class Message {
  /// ID duy nhất của tin nhắn (messageId)
  final String id;

  /// ID phòng chat (chatRoomId)
  final String conversationId;

  /// ID người gửi
  final String senderId;

  /// Nội dung tin nhắn
  final String content;

  /// URL ảnh đính kèm (nếu có)
  final String? imageUrl;

  /// URL video đính kèm (nếu có)
  final String? videoUrl;

  /// URL file đính kèm (nếu có)
  final String? fileUrl;

  /// URL audio đính kèm (nếu có)
  final String? audioUrl;

  /// Vai trò người gửi (me / other) – xác định sau khi biết currentUserId
  final MessageSender sender;

  /// Thời gian gửi
  final DateTime sentAt;

  /// true nếu đối phương đã đọc
  final bool isRead;

  /// true nếu đây là tin nhắn đang gửi (tạm thời chưa confirm server)
  final bool isPending;

  const Message({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.content,
    this.imageUrl,
    this.videoUrl,
    this.fileUrl,
    this.audioUrl,
    required this.sender,
    required this.sentAt,
    this.isRead = false,
    this.isPending = false,
  });

  /// Tạo Message từ MessageDTO của backend.
  /// [currentUserId] dùng để xác định sender là me hay other.
  factory Message.fromJson(Map<String, dynamic> json, String currentUserId) {
    final senderId = json['senderId']?.toString() ?? '';
    final sender = senderId == currentUserId ? MessageSender.me : MessageSender.other;

    return Message(
      id: json['messageId']?.toString() ?? '',
      conversationId: json['chatRoomId']?.toString() ?? '',
      senderId: senderId,
      content: json['content']?.toString() ?? '',
      imageUrl: json['imageUrl']?.toString(),
      videoUrl: json['videoUrl']?.toString(),
      fileUrl: json['fileUrl']?.toString(),
      audioUrl: json['audioUrl']?.toString(),
      sender: sender,
      sentAt: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'].toString()) ?? DateTime.now()
          : DateTime.now(),
      isRead: json['read'] as bool? ?? false,
    );
  }

  /// Tạo bản sao với isPending = false và id thực từ server.
  Message copyWithConfirmed({required String id, required bool isRead}) {
    return Message(
      id: id,
      conversationId: conversationId,
      senderId: senderId,
      content: content,
      imageUrl: imageUrl,
      sender: sender,
      sentAt: sentAt,
      isRead: isRead,
      isPending: false,
    );
  }
}
