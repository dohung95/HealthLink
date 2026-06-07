import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/chat/conversation.dart';
import '../../models/chat/message.dart';
import '../../providers/auth_provider.dart';
import '../../providers/chat_provider.dart';
import '../../config/api_config.dart';
import 'chat_search_screen.dart';
import 'chat_media_screen.dart';
/// Màn hình Chat Room – hiển thị tin nhắn và cho phép gửi tin nhắn.
class ChatRoomScreen extends StatefulWidget {
  /// Thông tin conversation đến từ ChatListScreen
  final Conversation conversation;

  const ChatRoomScreen({super.key, required this.conversation});

  @override
  State<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends State<ChatRoomScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isTextEmpty = true;

  ColorScheme _colors(BuildContext context) => Theme.of(context).colorScheme;

  @override
  void initState() {
    super.initState();
    _messageController.addListener(() {
      final isEmpty = _messageController.text.trim().isEmpty;
      if (isEmpty != _isTextEmpty) {
        setState(() => _isTextEmpty = isEmpty);
      }
    });
    // Load tin nhắn - openConversation đã được gọi từ ChatListScreen rồi
    // Nếu vào trực tiếp (deeplink...) thì load lại ở đây
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      final chat = context.read<ChatProvider>();
      // Chỉ load nếu chưa load phòng này
      if (chat.currentConversation?.id != widget.conversation.id) {
        if (auth.accessToken != null && auth.userId != null) {
          chat.openConversation(auth.accessToken!, auth.userId!, widget.conversation);
        }
      }
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  /// Cuộn xuống tin nhắn mới nhất
  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          0.0, // Với reverse: true, 0.0 là đáy màn hình
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  /// Gửi tin nhắn
  Future<void> _sendMessage() async {
    final content = _messageController.text.trim();
    if (content.isEmpty) return;

    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null || auth.userId == null) return;

    _messageController.clear();
    await context.read<ChatProvider>().sendMessage(
      auth.accessToken!,
      auth.userId!,
      content,
    );
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    final colors = _colors(context);

    return Scaffold(
      backgroundColor: colors.surface,
      body: SafeArea(
        child: Column(
          children: [
            _buildAppBar(context),
            Expanded(
              child: Consumer<ChatProvider>(
                builder: (context, chat, _) {
                  if (chat.isLoadingMessages) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  if (chat.messagesError != null) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.wifi_off, size: 48, color: colors.onSurfaceVariant),
                          const SizedBox(height: 16),
                          Text(chat.messagesError!, style: TextStyle(color: colors.onSurfaceVariant)),
                          const SizedBox(height: 24),
                          FilledButton.tonal(
                            onPressed: () {
                              final auth = context.read<AuthProvider>();
                              if (auth.accessToken != null && auth.userId != null) {
                                chat.openConversation(
                                  auth.accessToken!,
                                  auth.userId!,
                                  widget.conversation,
                                );
                              }
                            },
                            child: const Text('Thử lại'),
                          ),
                        ],
                      ),
                    );
                  }

                  return Container(
                    color: colors.surfaceContainerHigh.withValues(alpha: 0.3),
                    child: chat.messages.isEmpty
                        ? Center(
                            child: Text(
                              'Chưa có tin nhắn nào.\nHãy bắt đầu cuộc trò chuyện!',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: colors.onSurfaceVariant, fontSize: 15),
                            ),
                          )
                        : ListView.separated(
                            reverse: true,
                            controller: _scrollController,
                            padding: const EdgeInsets.fromLTRB(16, 24, 16, 16),
                            itemCount: chat.messages.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 16),
                            itemBuilder: (context, index) {
                              final reverseIndex = chat.messages.length - 1 - index;
                              final msg = chat.messages[reverseIndex];
                              final showDate = reverseIndex == 0 ||
                                  !_isSameDay(chat.messages[reverseIndex - 1].sentAt, msg.sentAt);
                              return Column(
                                children: [
                                  if (showDate) ...[
                                    _buildDateSeparator(context, _formatDate(msg.sentAt)),
                                    const SizedBox(height: 16),
                                  ],
                                  _buildMessageBubble(context, msg),
                                ],
                              );
                            },
                          ),
                  );
                },
              ),
            ),
            _buildInputArea(),
          ],
        ),
      ),
    );
  }

  // ── Helper: Kiểm tra cùng ngày ──────────────────────────────────────────────

  bool _isSameDay(DateTime a, DateTime b) =>
      a.day == b.day && a.month == b.month && a.year == b.year;

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    if (_isSameDay(dt, now)) return 'Hôm nay';
    if (_isSameDay(dt, now.subtract(const Duration(days: 1)))) return 'Hôm qua';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  String _formatTime(DateTime dt) =>
      '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

  // ── 1. App Bar ─────────────────────────────────────────────────────────────

  Widget _buildAppBar(BuildContext context) {
    final colors = _colors(context);
    final conv = widget.conversation;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: colors.surface,
        border: Border(bottom: BorderSide(color: colors.surfaceContainerHighest)),
      ),
      child: Row(
        children: [
          IconButton(
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            icon: Icon(Icons.arrow_back, color: colors.primary),
            onPressed: () => Navigator.pop(context),
          ),
          const SizedBox(width: 12),

          // Avatar
          Stack(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: conv.isSupport ? colors.secondaryContainer : colors.surfaceContainerHighest,
                ),
                child: conv.isSupport
                    ? Icon(Icons.support_agent, color: colors.onSecondaryContainer)
                    : _buildNetworkAvatar(
                        conv.partnerAvatarUrl,
                        size: 40,
                        colors: colors,
                      ),
              ),
              if (conv.isOnline)
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: Colors.green.shade500,
                      shape: BoxShape.circle,
                      border: Border.all(color: colors.surface, width: 2),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),

          // Tên & trạng thái
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  conv.partnerName,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: colors.primary,
                  ),
                ),
                Text(
                  [
                    if (conv.partnerSpecialty != null) conv.partnerSpecialty!,
                    if (conv.isOnline) 'Online' else 'Offline',
                  ].join(' • '),
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 12,
                    color: conv.isOnline ? Colors.green.shade600 : colors.outline,
                  ),
                ),
              ],
            ),
          ),

          IconButton(
            icon: const Icon(Icons.info),
            color: colors.primary,
            onPressed: () => _showChatDetails(context, conv, colors),
          ),
        ],
      ),
    );
  }

  // ── 2. Nhãn ngày ───────────────────────────────────────────────────────────

  Widget _buildDateSeparator(BuildContext context, String text) {
    final colors = _colors(context);
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: colors.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(100),
        ),
        child: Text(
          text,
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: colors.onSurfaceVariant,
          ),
        ),
      ),
    );
  }

  // ── 3. Bong bóng tin nhắn ─────────────────────────────────────────────────

  Widget _buildMessageBubble(BuildContext context, Message msg) {
    final isMe = msg.sender == MessageSender.me;
    return isMe
        ? _buildPatientBubble(context, msg)
        : _buildDoctorBubble(context, msg);
  }

  Widget _buildDoctorBubble(BuildContext context, Message msg) {
    final colors = _colors(context);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32,
          height: 32,
          margin: const EdgeInsets.only(top: 4),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: colors.surfaceContainerHighest,
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: _buildNetworkAvatar(
              widget.conversation.partnerAvatarUrl,
              size: 32,
              colors: colors,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (msg.imageUrl != null && msg.imageUrl!.isNotEmpty)
                _buildImageMessage(msg.imageUrl!, colors),
              if (msg.content.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: colors.surfaceContainerHigh,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(4),
                      topRight: Radius.circular(16),
                      bottomLeft: Radius.circular(16),
                      bottomRight: Radius.circular(16),
                    ),
                    border: Border.all(color: colors.surfaceContainerHighest),
                  ),
                  child: Text(
                    msg.content,
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 14,
                      color: colors.onSurface,
                      height: 1.4,
                    ),
                  ),
                ),
              const SizedBox(height: 4),
              Padding(
                padding: const EdgeInsets.only(left: 4),
                child: Text(
                  _formatTime(msg.sentAt),
                  style: TextStyle(fontFamily: 'Inter', fontSize: 10, color: colors.outline),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 48),
      ],
    );
  }

  Widget _buildPatientBubble(BuildContext context, Message msg) {
    final colors = _colors(context);
    final isPending = msg.isPending;

    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        const SizedBox(width: 48),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Opacity(
                opacity: isPending ? 0.7 : 1.0,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    if (msg.imageUrl != null && msg.imageUrl!.isNotEmpty)
                      _buildImageMessage(msg.imageUrl!, colors),
                    if (msg.content.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: colors.primary,
                          borderRadius: const BorderRadius.only(
                            topLeft: Radius.circular(16),
                            topRight: Radius.circular(4),
                            bottomLeft: Radius.circular(16),
                            bottomRight: Radius.circular(16),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: colors.primary.withValues(alpha: 0.2),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Text(
                          msg.content,
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 14,
                            color: colors.onPrimary,
                            height: 1.4,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _formatTime(msg.sentAt),
                    style: TextStyle(fontFamily: 'Inter', fontSize: 10, color: colors.outline),
                  ),
                  const SizedBox(width: 4),
                  if (isPending)
                    SizedBox(
                      width: 12,
                      height: 12,
                      child: CircularProgressIndicator(
                        strokeWidth: 1.5,
                        color: colors.outline,
                      ),
                    )
                  else
                    Icon(
                      msg.isRead ? Icons.done_all : Icons.check,
                      size: 14,
                      color: msg.isRead ? colors.primary : colors.outline,
                    ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }


  // ── 4. Khu vực nhập tin nhắn ──────────────────────────────────────────────

  Widget _buildInputArea() {
    final colors = _colors(context);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.surface,
        border: Border(top: BorderSide(color: colors.surfaceContainerHighest)),
        boxShadow: [
          BoxShadow(
            color: colors.shadow.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Nút đính kèm
          IconButton(
            icon: const Icon(Icons.add),
            color: colors.primary,
            onPressed: () {},
          ),

          // Ô nhập tin nhắn
          Expanded(
            child: Container(
              constraints: const BoxConstraints(maxHeight: 120),
              decoration: BoxDecoration(
                color: colors.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: colors.surfaceContainerHighest),
              ),
              child: TextField(
                controller: _messageController,
                maxLines: null,
                keyboardType: TextInputType.multiline,
                textInputAction: TextInputAction.newline,
                style: TextStyle(fontFamily: 'Inter', fontSize: 14, color: colors.onSurface),
                decoration: InputDecoration(
                  hintText: 'Nhập tin nhắn...',
                  hintStyle: TextStyle(color: colors.outline),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),

          // Nút gửi (ẩn khi chưa nhập)
          AnimatedScale(
            scale: _isTextEmpty ? 0.0 : 1.0,
            duration: const Duration(milliseconds: 200),
            curve: Curves.elasticOut,
            child: Container(
              decoration: BoxDecoration(
                color: colors.primary,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: colors.primary.withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Consumer<ChatProvider>(
                builder: (context, chat, _) => IconButton(
                  icon: chat.isSending
                      ? SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: colors.onPrimary),
                        )
                      : const Icon(Icons.send, size: 20),
                  color: colors.onPrimary,
                  onPressed: chat.isSending ? null : _sendMessage,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /// Hiển thị avatar từ URL. Nếu URL null/rỗng thì show icon thay thế.
  Widget _buildNetworkAvatar(
    String? url, {
    required double size,
    required ColorScheme colors,
  }) {
    final normalizedUrl = ApiConfig.normalizeUrl(url);
    if (normalizedUrl != null) {
      return Image.network(
        normalizedUrl,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Icon(
          Icons.person,
          size: size * 0.6,
          color: colors.outline,
        ),
      );
    }
    return Icon(
      Icons.person,
      size: size * 0.6,
      color: colors.outline,
    );
  }

  /// Render ảnh đính kèm trong bubble tin nhắn.
  Widget _buildImageMessage(String imageUrl, ColorScheme colors) {
    Widget imageWidget;
    
    if (imageUrl.startsWith('data:image')) {
      try {
        final base64String = imageUrl.split(',').last;
        final bytes = base64Decode(base64String);
        imageWidget = Image.memory(
          bytes,
          width: 200,
          height: 200,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildErrorImage(colors),
        );
      } catch (e) {
        imageWidget = _buildErrorImage(colors);
      }
    } else {
      final normalizedImageUrl = ApiConfig.normalizeUrl(imageUrl);
      if (normalizedImageUrl != null) {
        imageWidget = Image.network(
          normalizedImageUrl,
          width: 200,
          height: 200,
          fit: BoxFit.cover,
          loadingBuilder: (_, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return Container(
              width: 200,
              height: 200,
              color: colors.surfaceContainerHighest,
              child: const Center(child: CircularProgressIndicator()),
            );
          },
          errorBuilder: (_, __, ___) => _buildErrorImage(colors),
        );
      } else {
        imageWidget = _buildErrorImage(colors);
      }
    }

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => FullScreenImageViewer(imageUrl: imageUrl),
          ),
        );
      },
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: imageWidget,
      ),
    );
  }

  Widget _buildErrorImage(ColorScheme colors) {
    return Container(
      width: 200,
      height: 80,
      decoration: BoxDecoration(
        color: colors.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.broken_image_outlined, color: colors.outline),
          const SizedBox(width: 8),
          Text('Không tải được ảnh', style: TextStyle(color: colors.outline, fontSize: 12)),
        ],
      ),
    );
  }

  // --- Bottom Sheet Phong cách Messenger ---
  void _showChatDetails(BuildContext context, Conversation conv, ColorScheme colors) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: colors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.6,
          minChildSize: 0.4,
          maxChildSize: 0.9,
          expand: false,
          builder: (context, scrollController) {
            return ListView(
              controller: scrollController,
              padding: const EdgeInsets.symmetric(vertical: 24),
              children: [
                // Avatar
                Center(
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: colors.surfaceContainerHighest,
                    ),
                    child: conv.partnerAvatarUrl != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(50),
                            child: Image.network(
                              ApiConfig.normalizeUrl(conv.partnerAvatarUrl!) ?? '',
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Icon(Icons.person, size: 50, color: colors.onSurfaceVariant),
                            ),
                          )
                        : Icon(Icons.person, size: 50, color: colors.onSurfaceVariant),
                  ),
                ),
                const SizedBox(height: 16),
                // Name
                Center(
                  child: Text(
                    conv.partnerName,
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: colors.onSurface),
                  ),
                ),
                const SizedBox(height: 8),
                Center(
                  child: Text(
                    conv.partnerSpecialty ?? 'HealthLink User',
                    style: TextStyle(fontSize: 14, color: colors.outline),
                  ),
                ),
                const SizedBox(height: 24),
                // Quick Actions
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildQuickAction(Icons.person, 'Profile', colors, () {
                      Navigator.pop(context); // Đóng BottomSheet
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Profile feature is under development')),
                      );
                    }),
                    _buildQuickAction(Icons.notifications, 'Mute', colors, () {
                      Navigator.pop(context); // Đóng BottomSheet
                      _showMuteDialog(context);
                    }),
                  ],
                ),
                const SizedBox(height: 24),
                const Divider(),
                // Settings List
                ListTile(
                  leading: Icon(Icons.search, color: colors.onSurfaceVariant),
                  title: const Text('Search in Conversation'),
                  onTap: () {
                    Navigator.pop(context); // Đóng BottomSheet
                    Navigator.push(context, MaterialPageRoute(
                      builder: (_) => ChatSearchScreen(conversation: conv),
                    ));
                  },
                ),
                ListTile(
                  leading: Icon(Icons.photo, color: colors.onSurfaceVariant),
                  title: const Text('View Media & Files'),
                  onTap: () {
                    Navigator.pop(context); // Đóng BottomSheet
                    Navigator.push(context, MaterialPageRoute(
                      builder: (_) => ChatMediaScreen(conversation: conv),
                    ));
                  },
                ),
                const Divider(),
                ListTile(
                  leading: Icon(Icons.block, color: Colors.red.shade400),
                  title: Text('Block', style: TextStyle(color: Colors.red.shade400)),
                  onTap: () {
                    Navigator.pop(context); // Đóng BottomSheet
                    _showBlockDialog(context);
                  },
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showMuteDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Mute Notifications'),
        content: const Text('Mute notifications for this conversation?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('CANCEL'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // Lấy SharedPreferences ở đây (sẽ implement trong _saveMuteState)
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Notifications muted')),
              );
            },
            child: const Text('MUTE'),
          ),
        ],
      ),
    );
  }

  void _showBlockDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Block User'),
        content: const Text('You won\'t receive messages or calls from this person anymore.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('CANCEL'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('User blocked')),
              );
            },
            child: const Text('BLOCK'),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickAction(IconData icon, String label, ColorScheme colors, VoidCallback onPressed) {
    return Column(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: colors.surfaceContainerHighest,
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: Icon(icon, color: colors.onSurface),
            onPressed: onPressed,
          ),
        ),
        const SizedBox(height: 8),
        Text(label, style: TextStyle(fontSize: 12, color: colors.onSurfaceVariant)),
      ],
    );
  }
}

/// Màn hình xem ảnh full-screen với khả năng zoom
class FullScreenImageViewer extends StatefulWidget {
  final String imageUrl;

  const FullScreenImageViewer({super.key, required this.imageUrl});

  @override
  State<FullScreenImageViewer> createState() => _FullScreenImageViewerState();
}

class _FullScreenImageViewerState extends State<FullScreenImageViewer> with SingleTickerProviderStateMixin {
  late TransformationController _transformationController;
  late AnimationController _animationController;
  Animation<Matrix4>? _animation;
  TapDownDetails? _doubleTapDetails;

  @override
  void initState() {
    super.initState();
    _transformationController = TransformationController();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    )..addListener(() {
        if (_animation != null) {
          _transformationController.value = _animation!.value;
        }
      });
  }

  @override
  void dispose() {
    _transformationController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  void _handleDoubleTapDown(TapDownDetails details) {
    _doubleTapDetails = details;
  }

  void _handleDoubleTap() {
    if (_animationController.isAnimating) return;

    final position = _doubleTapDetails!.localPosition;
    
    // Nếu đang zoom, thì reset về 1.0 (Matrix4.identity)
    if (_transformationController.value != Matrix4.identity()) {
      _animateTo(Matrix4.identity());
    } else {
      // Zoom in tại vị trí double tap
      final scale = 2.5; // Mức độ zoom
      final x = -position.dx * (scale - 1);
      final y = -position.dy * (scale - 1);
      final zoomed = Matrix4.identity()
        ..translate(x, y)
        ..scale(scale);
      _animateTo(zoomed);
    }
  }

  void _animateTo(Matrix4 targetMatrix) {
    _animation = Matrix4Tween(
      begin: _transformationController.value,
      end: targetMatrix,
    ).animate(CurveTween(curve: Curves.easeOut).animate(_animationController));
    _animationController.forward(from: 0);
  }

  @override
  Widget build(BuildContext context) {
    Widget imageWidget;
    
    if (widget.imageUrl.startsWith('data:image')) {
      try {
        final base64String = widget.imageUrl.split(',').last;
        final bytes = base64Decode(base64String);
        imageWidget = Image.memory(bytes, fit: BoxFit.contain);
      } catch (e) {
        imageWidget = const Icon(Icons.broken_image_outlined, color: Colors.white, size: 50);
      }
    } else {
      final normalizedUrl = ApiConfig.normalizeUrl(widget.imageUrl);
      if (normalizedUrl != null) {
        imageWidget = Image.network(
          normalizedUrl,
          fit: BoxFit.contain,
          loadingBuilder: (_, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return const Center(child: CircularProgressIndicator(color: Colors.white));
          },
          errorBuilder: (_, __, ___) => const Icon(Icons.broken_image_outlined, color: Colors.white, size: 50),
        );
      } else {
        imageWidget = const Icon(Icons.broken_image_outlined, color: Colors.white, size: 50);
      }
    }

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      extendBodyBehindAppBar: true,
      body: GestureDetector(
        onDoubleTapDown: _handleDoubleTapDown,
        onDoubleTap: _handleDoubleTap,
        child: InteractiveViewer(
          transformationController: _transformationController,
          panEnabled: true,
          clipBehavior: Clip.none,
          minScale: 0.5,
          maxScale: 4.0,
          child: SizedBox.expand(
            child: Center(
              child: imageWidget,
            ),
          ),
        ),
      ),
    );
  }
}
