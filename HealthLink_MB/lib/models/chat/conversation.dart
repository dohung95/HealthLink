/// Model đại diện cho một phòng chat (chat room).
/// Ánh xạ từ ChatRoomDTO của backend.
class Conversation {
  /// ID phòng chat (chatRoomId)
  final String id;

  /// ID user đang chat cùng (partner)
  final String partnerId;

  /// Tên hiển thị của người còn lại
  final String partnerName;

  /// Chuyên khoa/vai trò của partner (nếu biết, ví dụ từ profile bác sĩ)
  final String? partnerSpecialty;

  /// Avatar URL của partner
  final String? partnerAvatarUrl;

  /// Partner có đang online không (backend chưa hỗ trợ – mặc định false)
  final bool isOnline;

  /// true nếu đây là kênh hỗ trợ (Clinic Support)
  final bool isSupport;

  /// ID cuộc hẹn liên kết (nếu có)
  final int? appointmentId;

  /// Nội dung tin nhắn cuối cùng
  final String lastMessage;

  /// Thời gian tin nhắn cuối cùng
  final DateTime lastMessageTime;

  /// Số tin nhắn chưa đọc
  final int unreadCount;

  /// true nếu tin nhắn cuối đã được đọc
  final bool isLastMessageRead;

  /// ID của người dùng đã chặn phòng chat (nếu có)
  final String? blockedBy;

  const Conversation({
    required this.id,
    required this.partnerId,
    required this.partnerName,
    this.partnerSpecialty,
    this.partnerAvatarUrl,
    this.isOnline = false,
    this.isSupport = false,
    this.appointmentId,
    required this.lastMessage,
    required this.lastMessageTime,
    this.unreadCount = 0,
    this.isLastMessageRead = true,
    this.blockedBy,
  });

  /// Tạo Conversation từ ChatRoomDTO trả về từ backend.
  /// [currentUserId] dùng để xác định ai là "partner" (user còn lại).
  factory Conversation.fromJson(Map<String, dynamic> json, String currentUserId) {
    // Xác định partner: nếu user1 là mình thì partner là user2 và ngược lại
    final user1Id = json['user1Id']?.toString() ?? '';
    final isUser1 = user1Id == currentUserId;

    final partnerId = isUser1
        ? (json['user2Id']?.toString() ?? '')
        : user1Id;
    final partnerName = isUser1
        ? (json['user2DisplayName']?.toString() ?? 'Unknown')
        : (json['user1DisplayName']?.toString() ?? 'Unknown');
    final partnerAvatarUrl = isUser1
        ? json['user2PhotoURL']?.toString()
        : json['user1PhotoURL']?.toString();

    final unreadCount = (json['unreadCount'] as num?)?.toInt() ?? 0;

    final partnerSpecialty = isUser1
        ? json['user2Specialty']?.toString()
        : json['user1Specialty']?.toString();

    return Conversation(
      id: json['chatRoomId']?.toString() ?? '',
      partnerId: partnerId,
      partnerName: partnerName,
      partnerSpecialty: partnerSpecialty,
      partnerAvatarUrl: partnerAvatarUrl,
      isOnline: false,          // Backend chưa hỗ trợ realtime presence
      isSupport: false,
      appointmentId: json['appointmentId'] as int?,
      lastMessage: json['lastMessage']?.toString() ?? '',
      lastMessageTime: json['lastMessageAt'] != null
          ? DateTime.tryParse(json['lastMessageAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      unreadCount: unreadCount,
      isLastMessageRead: unreadCount == 0,
      blockedBy: json['blockedBy']?.toString(),
    );
  }
}
