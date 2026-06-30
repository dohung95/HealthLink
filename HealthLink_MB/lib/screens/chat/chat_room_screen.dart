import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import '../../models/chat/conversation.dart';
import '../../models/chat/message.dart';
import '../../providers/auth_provider.dart';
import '../../providers/chat/chat_provider.dart';
import '../../config/api_config.dart';
import 'chat_search_screen.dart';
import 'chat_media_screen.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/chat/chat_theme.dart';
import 'profile_patient_normal_forChar_screen.dart';
import 'profile_doctor_normal_forChat_screen.dart';
import '../../providers/video_call_provider.dart';
import '../video_audio/video_call_screen.dart';
import '../../services/patient/vitals/vital_sign_service.dart';
import '../../widgets/patient/vitals_bottom_sheet.dart';
import '../../l10n/app_localizations.dart';

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
  
  // State cuộn xuống dưới
  bool _showScrollToBottom = false;
  bool _hasUnreadInView = false;
  String? _lastMessageId;

  // Trạng thái đính kèm
  File? _attachedImage;
  File? _attachedVideo;
  File? _attachedFile;
  String? _attachedFileName;

  // Recording state
  final AudioRecorder _audioRecorder = AudioRecorder();
  bool _isRecording = false;
  int _recordingDuration = 0;
  Timer? _recordingTimer;
  String? _audioPath;

  // Vitals state
  bool _hasFilledVitals = false;
  bool _checkingVitals = false;
  int? _checkedAppointmentId;

  ColorScheme _colors(BuildContext context) => Theme.of(context).colorScheme;

  late ChatProvider _chatProvider;

  @override
  void initState() {
    super.initState();
    _chatProvider = Provider.of<ChatProvider>(context, listen: false);
    _messageController.addListener(() {
      final isEmpty = _messageController.text.trim().isEmpty;
      if (isEmpty != _isTextEmpty) {
        setState(() => _isTextEmpty = isEmpty);
      }
    });

    _scrollController.addListener(() {
      // 1. Phân trang
      if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
        final auth = context.read<AuthProvider>();
        if (auth.accessToken != null && auth.userId != null) {
          _chatProvider.loadMoreMessages(auth.accessToken!, auth.userId!);
        }
      }

      // 2. Ẩn/Hiện nút cuộn xuống dưới
      if (_scrollController.hasClients) {
        final isScrolledUp = _scrollController.position.pixels > 100;
        if (isScrolledUp != _showScrollToBottom) {
          setState(() => _showScrollToBottom = isScrolledUp);
        }
        if (!isScrolledUp && _hasUnreadInView) {
          setState(() => _hasUnreadInView = false);
        }
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

  void _checkVitals(String token, int appointmentId) {
    if (_checkingVitals) return;
    setState(() => _checkingVitals = true);
    
    VitalSignService.getLatestAppointmentVitalSign(token, appointmentId)
        .then((data) {
      if (mounted) {
        setState(() {
          _hasFilledVitals = data != null && data['vitalSignId'] != null;
          _checkingVitals = false;
        });
      }
    }).catchError((e) {
      if (mounted) {
        setState(() {
          _hasFilledVitals = false;
          _checkingVitals = false;
        });
      }
    });
  }

  @override
  void dispose() {
    _recordingTimer?.cancel();
    _audioRecorder.dispose();
    _messageController.dispose();
    _scrollController.dispose();
    // Xoá thông tin phòng chat hiện tại để nhận thông báo push top-down
    Future.microtask(() => _chatProvider.clearCurrentConversation());
    super.dispose();
  }

  Future<void> _startRecording() async {
    try {
      if (await _audioRecorder.hasPermission()) {
        final dir = await getApplicationDocumentsDirectory();
        final filePath = '${dir.path}/audio_${DateTime.now().millisecondsSinceEpoch}.m4a';
        
        await _audioRecorder.start(
          const RecordConfig(encoder: AudioEncoder.aacLc),
          path: filePath,
        );

        setState(() {
          _isRecording = true;
          _recordingDuration = 0;
          _audioPath = filePath;
        });

        _recordingTimer = Timer.periodic(const Duration(seconds: 1), (Timer t) {
          setState(() => _recordingDuration++);
        });
      }
    } catch (e) {
      debugPrint('Error starting recording: $e');
    }
  }

  Future<void> _stopRecording() async {
    try {
      _recordingTimer?.cancel();
      final path = await _audioRecorder.stop();
      
      setState(() {
        _isRecording = false;
        _recordingDuration = 0;
      });

      if (path != null) {
        final auth = context.read<AuthProvider>();
        if (auth.accessToken != null && auth.userId != null) {
          await context.read<ChatProvider>().sendMessage(
            auth.accessToken!,
            auth.userId!,
            '',
            audioPath: path,
          );
          _scrollToBottom();
        }
      }
    } catch (e) {
      debugPrint('Error stopping recording: $e');
    }
  }

  Future<void> _cancelRecording() async {
    try {
      _recordingTimer?.cancel();
      await _audioRecorder.stop();
      if (_audioPath != null) {
        final file = File(_audioPath!);
        if (await file.exists()) {
          await file.delete();
        }
      }
      setState(() {
        _isRecording = false;
        _recordingDuration = 0;
        _audioPath = null;
      });
    } catch (e) {
      debugPrint('Error canceling recording: $e');
    }
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

  void _handleVideoCall(BuildContext context, Conversation conv) {
    if (conv.isSupport) return;
    final auth = context.read<AuthProvider>();
    final videoCallProvider = context.read<VideoCallProvider>();

    if (auth.isAuthenticated && auth.userId != null) {
      final success = videoCallProvider.sendCallRequest(
        receiverId: conv.partnerId,
        roomId: conv.id,
        myId: auth.userId!,
        myName: auth.displayName ?? 'User',
      );

      if (!success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('You are already in a call!', style: TextStyle(color: Colors.white)), backgroundColor: Colors.red),
        );
        return;
      }

      Navigator.push(
        context,
        MaterialPageRoute(
          settings: const RouteSettings(name: '/video_call'),
          builder: (_) => VideoCallScreen(
            partnerName: conv.partnerName,
            partnerRole: conv.partnerSpecialty ?? 'User',
            partnerId: conv.partnerId,
            roomId: conv.id,
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cannot start video call, please login.', style: TextStyle(color: Colors.white)), backgroundColor: Colors.red),
      );
    }
  }

  /// Xoá đính kèm
  void _clearAttachment() {
    setState(() {
      _attachedImage = null;
      _attachedVideo = null;
      _attachedFile = null;
      _attachedFileName = null;
    });
  }

  /// Chụp ảnh từ camera
  Future<void> _takePicture() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.camera);
    if (picked != null) {
      final file = File(picked.path);
      // Hiển thị dialog xác nhận
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Confirm Photo'),
          content: Image.file(file, height: 300, fit: BoxFit.cover),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Confirm'),
            ),
          ],
        ),
      );

      if (confirmed == true) {
        setState(() {
          _clearAttachment();
          _attachedImage = file;
        });
      }
    }
  }

  /// Mở menu đính kèm
  void _showAttachmentMenu() {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Photo/Video Library'),
              onTap: () async {
                Navigator.pop(context);
                final picker = ImagePicker();
                final picked = await picker.pickMedia();
                if (picked != null) {
                  setState(() {
                    _clearAttachment();
                    if (picked.path.endsWith('.mp4') || picked.path.endsWith('.mov')) {
                      _attachedVideo = File(picked.path);
                    } else {
                      _attachedImage = File(picked.path);
                    }
                  });
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.insert_drive_file),
                title: const Text('Document/File'),
              onTap: () async {
                Navigator.pop(context);
                final result = await FilePicker.pickFiles();
                if (result != null && result.files.single.path != null) {
                  setState(() {
                    _clearAttachment();
                    _attachedFile = File(result.files.single.path!);
                    _attachedFileName = result.files.single.name;
                  });
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  /// Gửi tin nhắn
  Future<void> _sendMessage() async {
    final content = _messageController.text.trim();
    if (content.isEmpty && _attachedImage == null && _attachedVideo == null && _attachedFile == null) return;

    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null || auth.userId == null) return;

    final imagePath = _attachedImage?.path;
    final videoPath = _attachedVideo?.path;
    final filePath = _attachedFile?.path;

    _messageController.clear();
    _clearAttachment();

    await context.read<ChatProvider>().sendMessage(
      auth.accessToken!,
      auth.userId!,
      content,
      imagePath: imagePath,
      videoPath: videoPath,
      filePath: filePath,
    );
    _scrollToBottom();
  }

  String? _highlightedMessageId;

  final GlobalKey _targetMessageKey = GlobalKey();

  Future<void> _scrollToMessageId(String msgId) async {
    final chat = context.read<ChatProvider>();
    final auth = context.read<AuthProvider>();
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: Card(
          child: Padding(
            padding: EdgeInsets.all(20.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Going to the message...'),
              ],
            ),
          ),
        ),
      ),
    );
    
    bool isMessageLoaded() {
      return chat.messages.any((m) => m.id == msgId);
    }

    // 1. Tải dữ liệu cho đến khi tin nhắn có trong bộ nhớ
    for (int i = 0; i < 20; i++) {
      if (isMessageLoaded()) break;
      if (!chat.hasMoreMessages) break;
      
      if (chat.isLoadingMoreMessages) {
        await Future.delayed(const Duration(milliseconds: 500));
        continue;
      }
      
      await chat.loadMoreMessages(auth.accessToken!, auth.userId!);
      await Future.delayed(const Duration(milliseconds: 200)); // Đợi render
    }

    if (!isMessageLoaded()) {
      if (mounted) {
        Navigator.pop(context); // Đóng dialog
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Message too old, please load more.')),
        );
      }
      return;
    }

    // 2. Gắn cờ highlight để ListView gán GlobalKey (nếu nó được render)
    setState(() => _highlightedMessageId = msgId);
    await Future.delayed(const Duration(milliseconds: 100)); // Đợi React/Flutter build frame

    // 3. Crawler: Ép thanh cuộn chạy lên từng đoạn cho đến khi GlobalKey xuất hiện trong Widget Tree
    bool scrolled = false;
    for (int i = 0; i < 50; i++) {
      if (!mounted) break;
      
      // Nếu tin nhắn đã vào tầm ngắm (được render)
      if (_targetMessageKey.currentContext != null) {
        Scrollable.ensureVisible(
          _targetMessageKey.currentContext!,
          duration: const Duration(milliseconds: 500),
          curve: Curves.easeInOut,
          alignment: 0.5, // Cuộn sao cho tin nhắn nằm giữa màn hình
        );
        scrolled = true;
        break;
      }

      // Nếu chưa thấy, ép cuộn lên 800px để ép ListView vẽ tiếp các tin nhắn cũ hơn
      if (_scrollController.hasClients) {
        final pos = _scrollController.position;
        if (pos.pixels + 800 < pos.maxScrollExtent) {
          _scrollController.jumpTo(pos.pixels + 800);
        } else {
          _scrollController.jumpTo(pos.maxScrollExtent); // Nhảy tới giới hạn hiện tại để nới rộng thêm
        }
        await Future.delayed(const Duration(milliseconds: 100)); // Chờ ListView layout các widget mới
      }
    }

    // 4. Kết thúc
    if (mounted) {
      Navigator.pop(context); // Đóng dialog
      if (scrolled) {
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted && _highlightedMessageId == msgId) {
            setState(() => _highlightedMessageId = null);
          }
        });
      } else {
        // Fallback nếu crawler bị lỗi
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Can not accurately scroll to the message.')),
        );
        setState(() => _highlightedMessageId = null);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = _colors(context);
    final chat = context.watch<ChatProvider>();
    final auth = context.read<AuthProvider>();
    
    final conv = chat.currentConversation ?? widget.conversation;
    
    // Check vitals dynamically if appointmentId is present and hasn't been checked yet
    if (auth.isPatient && 
        conv.appointmentId != null && 
        _checkedAppointmentId != conv.appointmentId && 
        conv.appointmentStatus?.toUpperCase() != 'COMPLETED') {
      _checkedAppointmentId = conv.appointmentId;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (auth.accessToken != null) {
          _checkVitals(auth.accessToken!, conv.appointmentId!);
        }
      });
    }

    final chatTheme = getActiveChatTheme(context, chat.chatThemeIndex);

    // Phát hiện tin nhắn mới (phải kiểm tra .last thay vì .first vì tin cũ được chèn vào đầu mảng)
    if (chat.messages.isNotEmpty) {
      final latestId = chat.messages.last.id;
      if (_lastMessageId != null && latestId != _lastMessageId) {
        if (_showScrollToBottom) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              setState(() {
                _hasUnreadInView = true;
                _lastMessageId = latestId;
              });
            }
          });
        } else {
          _lastMessageId = latestId;
        }
      } else if (_lastMessageId == null) {
        _lastMessageId = latestId;
      }
    }

    return Scaffold(
      backgroundColor: chatTheme.background,
            // Bạn có thể tùy chỉnh độ cao của nút bằng tham số bottom ở đây
      floatingActionButton: _showScrollToBottom
          ? Padding(
              padding: const EdgeInsets.only(bottom: 40.0), // <-- CHỈNH ĐỘ CAO (BOTTOM) Ở ĐÂY (tăng số để nút bay cao hơn)
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  SizedBox(
                    width: 40,
                    height: 40,
                    child: FloatingActionButton(
                      onPressed: () {
                        _scrollController.animateTo(
                          0.0,
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeOut,
                        );
                        setState(() => _hasUnreadInView = false);
                      },
                      backgroundColor: chatTheme.primary,
                      shape: const CircleBorder(),
                      elevation: 4,
                      child: const Icon(Icons.keyboard_arrow_down, color: Colors.white),
                    ),
                  ),
                  // Dấu chấm đỏ báo tin nhắn mới
                  if (_hasUnreadInView)
                    Positioned(
                      right: 0, // <-- CHỈNH VỊ TRÍ CHẤM ĐỎ (Sang trái/phải)
                      top: 0,   // <-- CHỈNH VỊ TRÍ CHẤM ĐỎ (Lên/xuống)
                      child: Container(
                        width: 12,  // <-- CHỈNH KÍCH THƯỚC CHẤM ĐỎ
                        height: 12,
                        decoration: BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                          // Nếu muốn bỏ viền trắng thì xóa dòng border bên dưới đi
                          border: Border.all(color: chatTheme.background, width: 2), 
                        ),
                      ),
                    ),
                ],
              ),
            )
          : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
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
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    );
                  }

                  final chatThemeIndex = chat.chatThemeIndex;
                  final chatTheme = getActiveChatTheme(context, chatThemeIndex);
                  return Container(
                    color: chatTheme.background,
                    child: chat.messages.isEmpty
                        ? Center(
                            child: Text(
                              'No messages yet.\nStart the conversation!',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: colors.onSurfaceVariant, fontSize: 15),
                            ),
                          )
                        : ListView.separated(
                            reverse: true,
                            controller: _scrollController,
                            padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
                            itemCount: chat.messages.length + (chat.isLoadingMoreMessages ? 1 : 0),
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              if (index == chat.messages.length) {
                                return const Center(
                                  child: Padding(
                                    padding: EdgeInsets.all(8.0),
                                    child: CircularProgressIndicator(),
                                  ),
                                );
                              }
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
    if (_isSameDay(dt, now)) return 'Today';
    if (_isSameDay(dt, now.subtract(const Duration(days: 1)))) return 'Yesterday';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  String _formatTime(DateTime dt) =>
      '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

  // ── 1. App Bar ─────────────────────────────────────────────────────────────

  Widget _buildAppBar(BuildContext context) {
    final colors = _colors(context);
    final chat = context.watch<ChatProvider>();
    final conv = chat.currentConversation ?? widget.conversation;
    final chatThemeIndex = chat.chatThemeIndex;
    final chatTheme = getActiveChatTheme(context, chatThemeIndex);
    final auth = context.read<AuthProvider>();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: chatTheme.background,
        border: Border(bottom: BorderSide(color: colors.surfaceContainerHighest)),
      ),
      child: Row(
        children: [
          IconButton(
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            icon: Icon(Icons.arrow_back, color: chatTheme.primary),
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
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        conv.partnerName,
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: context.watch<ChatProvider>().isBlocked(conv.id)
                              ? Colors.red.shade400
                              : chatTheme.primary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (context.watch<ChatProvider>().isBlocked(conv.id))
                      Padding(
                        padding: const EdgeInsets.only(left: 4),
                        child: Icon(Icons.block, size: 14, color: Colors.red.shade400),
                      ),
                  ],
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

          if (context.watch<ChatProvider>().isMuted(conv.id))
            Icon(Icons.notifications_off, color: colors.outline, size: 20),

          if (!conv.isSupport)
            Builder(
              builder: (context) {
                final isBlocked = context.watch<ChatProvider>().isBlocked(conv.id);
                final isCompleted = conv.appointmentStatus == 'COMPLETED';
                final isMissingVitals = auth.isPatient && !_hasFilledVitals && !isCompleted;
                final isCallDisabled = isBlocked || isCompleted || isMissingVitals;
                
                return IconButton(
                  icon: const Icon(Icons.videocam),
                  color: isCallDisabled ? colors.outline : chatTheme.primary,
                  onPressed: isCallDisabled
                      ? null
                      : () => _handleVideoCall(context, conv),
                );
              }
            ),
            
          IconButton(
            icon: const Icon(Icons.info),
            color: chatTheme.primary,
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
    final isHighlighted = msg.id == _highlightedMessageId;
    
    return AnimatedContainer(
      key: isHighlighted ? _targetMessageKey : null,
      duration: const Duration(milliseconds: 500),
      decoration: BoxDecoration(
        color: isHighlighted ? Colors.yellow.withValues(alpha: 0.3) : Colors.transparent,
        borderRadius: BorderRadius.circular(16),
      ),
      padding: EdgeInsets.all(isHighlighted ? 4.0 : 0.0),
      child: isMe
          ? _buildPatientBubble(context, msg)
          : _buildDoctorBubble(context, msg),
    );
  }

  Widget _buildCallHistoryBubble(BuildContext context, Message msg, bool isMe) {
    final colors = _colors(context);
    final chatTheme = getActiveChatTheme(context, context.watch<ChatProvider>().chatThemeIndex);
    
    int duration = 0;
    String status = 'UNKNOWN';
    try {
      final parts = msg.content.substring('[CALL_HISTORY] '.length).split(' ');
      for (var part in parts) {
        final kv = part.split(':');
        if (kv.length == 2) {
          if (kv[0] == 'duration') duration = int.tryParse(kv[1]) ?? 0;
          if (kv[0] == 'status') status = kv[1];
        }
      }
    } catch (e) {
      debugPrint('Error parsing call history: $e');
    }

    final isMissedOrDeclined = status == 'MISSED' || status == 'DECLINED';
    final iconColor = isMissedOrDeclined ? Colors.red : (isMe ? chatTheme.bubbleUserText : chatTheme.bubbleOtherText);
    final bgColor = isMe ? Colors.white.withValues(alpha: 0.2) : Colors.green.withValues(alpha: 0.1);
    final iconData = isMissedOrDeclined ? Icons.phone_missed : Icons.videocam;
    final titleText = isMissedOrDeclined ? 'Missed Call' : 'Video Call';
    
    String formatDuration(int seconds) {
      if (seconds == 0 && !isMissedOrDeclined) return '0:00';
      final m = seconds ~/ 60;
      final s = seconds % 60;
      return '$m:${s.toString().padLeft(2, '0')}';
    }

    return GestureDetector(
      onTap: () {
        if (isMissedOrDeclined) {
          _handleVideoCall(context, widget.conversation);
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
        color: isMe ? chatTheme.bubbleUser : chatTheme.bubbleOther,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(isMe ? 16 : 4),
          topRight: Radius.circular(isMe ? 4 : 16),
          bottomLeft: const Radius.circular(16),
          bottomRight: const Radius.circular(16),
        ),
        boxShadow: isMe ? [
          BoxShadow(
            color: chatTheme.bubbleUser.withValues(alpha: 0.2),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ] : null,
        border: isMe ? null : Border.all(color: colors.surfaceContainerHighest),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: bgColor,
            ),
            child: Icon(iconData, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                titleText,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isMissedOrDeclined ? (isMe ? Colors.red.shade100 : Colors.red) : (isMe ? chatTheme.bubbleUserText : chatTheme.bubbleOtherText),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                isMissedOrDeclined ? 'Tap icon to call back' : formatDuration(duration),
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 12,
                  color: isMe ? chatTheme.bubbleUserText.withValues(alpha: 0.7) : chatTheme.bubbleOtherText.withValues(alpha: 0.7),
                ),
              ),
            ],
          ),
        ],
      ),
      ),
    );
  }

  Widget _buildDoctorBubble(BuildContext context, Message msg) {
    final colors = _colors(context);
    final chat = context.watch<ChatProvider>();
    final chatThemeIndex = chat.chatThemeIndex;
    final chatTheme = getActiveChatTheme(context, chatThemeIndex);

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
              if (msg.videoUrl != null && msg.videoUrl!.isNotEmpty)
                _buildVideoMessage(msg.videoUrl!, colors),
              if (msg.fileUrl != null && msg.fileUrl!.isNotEmpty)
                _buildFileMessage(msg.fileUrl!, colors),
              if (msg.audioUrl != null && msg.audioUrl!.isNotEmpty)
                _buildAudioMessage(msg.audioUrl!, colors),
              if (msg.content.startsWith('[CALL_HISTORY]'))
                _buildCallHistoryBubble(context, msg, false)
              else if (msg.content.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: chatTheme.bubbleOther,
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
                      color: chatTheme.bubbleOtherText,
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
    final chat = context.watch<ChatProvider>();
    final chatThemeIndex = chat.chatThemeIndex;
    final chatTheme = getActiveChatTheme(context, chatThemeIndex);

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
                    if (msg.videoUrl != null && msg.videoUrl!.isNotEmpty)
                      _buildVideoMessage(msg.videoUrl!, colors),
                    if (msg.fileUrl != null && msg.fileUrl!.isNotEmpty)
                      _buildFileMessage(msg.fileUrl!, colors),
                    if (msg.audioUrl != null && msg.audioUrl!.isNotEmpty)
                      _buildAudioMessage(msg.audioUrl!, colors),
                    if (msg.content.startsWith('[CALL_HISTORY]'))
                      _buildCallHistoryBubble(context, msg, true)
                    else if (msg.content.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: chatTheme.bubbleUser,
                          borderRadius: const BorderRadius.only(
                            topLeft: Radius.circular(16),
                            topRight: Radius.circular(4),
                            bottomLeft: Radius.circular(16),
                            bottomRight: Radius.circular(16),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: chatTheme.bubbleUser.withValues(alpha: 0.2),
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
                            color: chatTheme.bubbleUserText,
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
    final chat = context.watch<ChatProvider>();
    final conv = chat.currentConversation ?? widget.conversation;
    final chatTheme = getActiveChatTheme(context, chat.chatThemeIndex);
    
    final auth = context.read<AuthProvider>();
    final l10n = AppLocalizations.of(context)!;
    final blockedBy = chat.getBlockedBy(conv.id);

    // ── Ưu tiên 1: Kiểm tra cuộc hẹn đã COMPLETED chưa ─────────────────────
    // Nếu conversation này gắn với một appointment đã COMPLETED, khóa chat:
    // chỉ cho xem tin nhắn cũ, không cho gửi thêm. Điều này xảy ra khi
    // bác sĩ bấm "Complete Consultation" → appointment status chuyển sang COMPLETED.
    final isAppointmentCompleted =
        conv.appointmentStatus?.toUpperCase() == 'COMPLETED';

    if (isAppointmentCompleted) {
      // Hiển thị banner thông báo chat đã bị khóa
      return _buildReadOnlyBanner(
        colors: colors,
        chatTheme: chatTheme,
        icon: Icons.lock_outline,
        // Thông báo tiếng Anh hiển thị trên màn hình
        message: 'This consultation has been completed. Chat is now read-only.',
      );
    }

    // ── Ưu tiên 2: Kiểm tra xem phòng chat có bị block không ────────────────
    // Block có thể do bác sĩ hoặc bệnh nhân chủ động block qua tính năng Block.
    if (blockedBy != null) {
      final isBlockedByMe = blockedBy == auth.userId;
      return _buildReadOnlyBanner(
        colors: colors,
        chatTheme: chatTheme,
        icon: Icons.block,
        // Phân biệt thông báo: bạn block người kia hay bị người kia block
        message: isBlockedByMe
            ? 'You blocked this user.'
            : 'You cannot reply to this conversation.',
      );
    }

    // Checking vitals in progress
    if (_checkingVitals && auth.isPatient && !isAppointmentCompleted) {
      return const Padding(
        padding: EdgeInsets.all(16.0),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    // Missing Vitals (Patient only)
    if (auth.isPatient && !_hasFilledVitals && !isAppointmentCompleted) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.orange.shade50,
          border: Border(top: BorderSide(color: Colors.orange.shade200)),
        ),
        child: Column(
          children: [
            Row(
              children: [
                Icon(Icons.warning_amber_rounded, color: Colors.orange.shade700),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    l10n.chatBlockedVitalsWarning,
                    style: TextStyle(color: Colors.orange.shade900, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () {
                showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  backgroundColor: colors.surface,
                  shape: const RoundedRectangleBorder(
                    borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                  ),
                  builder: (_) => VitalsBottomSheet(
                    appointmentId: conv.appointmentId!,
                    onSaved: () {
                      setState(() => _hasFilledVitals = true);
                    },
                  ),
                );
              },
              child: Text(l10n.fillHealthInfoBtn),
            ),
          ],
        ),
      );
    }

    // ── Trường hợp bình thường: hiển thị input area đầy đủ ─────────────────
    final hasAttachment = _attachedImage != null || _attachedVideo != null || _attachedFile != null;
    final canSend = !_isTextEmpty || hasAttachment;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: chatTheme.background,
        border: Border(top: BorderSide(color: colors.surfaceContainerHighest)),
        boxShadow: [
          BoxShadow(
            color: colors.shadow.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Preview đính kèm (nếu có)
          if (hasAttachment)
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: colors.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_attachedImage != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.file(_attachedImage!, width: 50, height: 50, fit: BoxFit.cover),
                    ),
                  if (_attachedVideo != null)
                    const Icon(Icons.videocam, size: 40),
                  if (_attachedFile != null)
                    const Icon(Icons.insert_drive_file, size: 40),
                  const SizedBox(width: 8),
                  if (_attachedFile != null)
                    Expanded(
                      child: Text(
                        _attachedFileName ?? 'File',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: _clearAttachment,
                  ),
                ],
              ),
            ),
          
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (_isRecording)
                Expanded(
                  child: Container(
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Row(
                      children: [
                        const SizedBox(width: 16),
                        const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.red),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'Recording... ${_recordingDuration ~/ 60}:${(_recordingDuration % 60).toString().padLeft(2, '0')}',
                          style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.cancel, color: Colors.red),
                          onPressed: _cancelRecording,
                        ),
                      ],
                    ),
                  ),
                )
              else ...[
                // Nút đính kèm
                IconButton(
                  icon: const Icon(Icons.add),
                  color: chatTheme.primary,
                  onPressed: _showAttachmentMenu,
                ),
                // Nút Camera
                IconButton(
                  icon: const Icon(Icons.camera_alt),
                  color: chatTheme.primary,
                  onPressed: _takePicture,
                ),

                // Ô nhập tin nhắn
                Expanded(
                  child: Container(
                    constraints: const BoxConstraints(maxHeight: 120),
                    decoration: BoxDecoration(
                      color: chatTheme.bubbleOther, // Nền ô chữ
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: chatTheme.primary.withValues(alpha: 0.2)),
                    ),
                    child: TextField(
                      controller: _messageController,
                      maxLines: null,
                      keyboardType: TextInputType.multiline,
                      textInputAction: TextInputAction.newline,
                      style: TextStyle(fontFamily: 'Inter', fontSize: 14, color: chatTheme.bubbleOtherText),
                      decoration: InputDecoration(
                        hintText: 'Type message...',
                        hintStyle: TextStyle(color: chatTheme.bubbleOtherText.withValues(alpha: 0.5)),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                      ),
                    ),
                  ),
                ),
              ],
              const SizedBox(width: 8),

              // Nút gửi / ghi âm
              if (_isRecording)
                Container(
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.send, size: 20),
                    color: Colors.white,
                    onPressed: _stopRecording,
                  ),
                )
              else if (canSend)
                AnimatedOpacity(
                  opacity: 1.0,
                  duration: const Duration(milliseconds: 200),
                  child: Container(
                    decoration: BoxDecoration(
                      color: chatTheme.primary,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: chatTheme.primary.withValues(alpha: 0.3),
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
                        onPressed: !chat.isSending ? _sendMessage : null,
                      ),
                    ),
                  ),
                )
              else
                Container(
                  decoration: BoxDecoration(
                    color: chatTheme.primary.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.mic, size: 24),
                    color: chatTheme.primary,
                    onPressed: _startRecording,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  /// Widget banner thông báo "read-only" — dùng chung cho 2 trường hợp:
  /// (1) Appointment đã COMPLETED → chat khóa.
  /// (2) Phòng chat bị block → không gửi được tin.
  ///
  /// [icon]    : icon hiển thị bên trái banner.
  /// [message] : nội dung thông báo (tiếng Anh, hiển thị cho người dùng).
  Widget _buildReadOnlyBanner({
    required ColorScheme colors,
    required dynamic chatTheme,
    required IconData icon,
    required String message,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        // Nền hơi mờ để phân biệt với vùng tin nhắn bình thường
        color: colors.surfaceContainerHighest.withValues(alpha: 0.85),
        border: Border(top: BorderSide(color: colors.outlineVariant)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 18, color: colors.outline),
          const SizedBox(width: 10),
          Flexible(
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 13,
                color: colors.outline,
                fontStyle: FontStyle.italic,
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
      return ClipOval(
        child: Image.network(
          normalizedUrl,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Icon(
            Icons.person,
            size: size * 0.6,
            color: colors.outline,
          ),
        ),
      );
    }
    return ClipOval(
      child: Icon(
        Icons.person,
        size: size * 0.6,
        color: colors.outline,
      ),
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
    } else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/uploads')) {
      // Local file path
      imageWidget = Image.file(
        File(imageUrl),
        width: 200,
        height: 200,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _buildErrorImage(colors),
      );
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
          errorBuilder: (context, error, stackTrace) {
              debugPrint('[Chat] Image.network error: $error | url=$normalizedImageUrl');
              return _buildErrorImage(colors);
            },
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
          Text("Can't load image", style: TextStyle(color: colors.outline, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildVideoMessage(String videoUrl, ColorScheme colors) {
    return GestureDetector(
      onTap: () async {
        final normalizedUrl = ApiConfig.normalizeUrl(videoUrl);
        if (normalizedUrl != null) {
          final uri = Uri.parse(normalizedUrl);
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          } else {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Can not play this video.')),
              );
            }
          }
        }
      },
      child: Container(
        width: 200,
        height: 120,
        margin: const EdgeInsets.only(bottom: 4),
        decoration: BoxDecoration(
          color: colors.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: colors.surfaceContainerHighest),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.play_circle_fill, size: 48, color: colors.primary),
            const SizedBox(height: 8),
            Text(
              'Video',
              style: TextStyle(color: colors.onSurfaceVariant, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFileMessage(String fileUrl, ColorScheme colors) {
    // Trích xuất tên file từ URL nếu có thể, hoặc dùng nội dung mặc định
    String fileName = 'File';
    if (fileUrl.isNotEmpty) {
      fileName = fileUrl.split('/').last;
      // Lấy phần tên thực sự sau timestamp (ví dụ: 123456789_file.pdf -> file.pdf)
      final parts = fileName.split('_');
      if (parts.length > 1) {
        fileName = parts.sublist(1).join('_');
      }
    }

    return GestureDetector(
      onTap: () async {
        final normalizedUrl = ApiConfig.normalizeUrl(fileUrl);
        if (normalizedUrl != null) {
          final uri = Uri.parse(normalizedUrl);
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          } else {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Can not open this file.')),
              );
            }
          }
        }
      },
      child: Container(
        width: 200,
        padding: const EdgeInsets.all(12),
        margin: const EdgeInsets.only(bottom: 4),
        decoration: BoxDecoration(
          color: colors.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: colors.surfaceContainerHighest),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: colors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.insert_drive_file, color: colors.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                fileName,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: colors.onSurface,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAudioMessage(String audioUrl, ColorScheme colors) {
    return AudioPlayerBubble(audioUrl: audioUrl, colors: colors);
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
                        final specialty = conv.partnerSpecialty?.toLowerCase().trim() ?? '';
                        
                        final isPharmacy = specialty.contains('nhà thuốc') || 
                                           specialty.contains('pharmacy') || 
                                           specialty.contains('pharmacist') ||
                                           specialty.contains('phòng khám') ||
                                           specialty.contains('clinic');
                                           
                        final isDoctor = specialty.isNotEmpty && 
                                         !isPharmacy && 
                                         specialty != 'bệnh nhân' && 
                                         specialty != 'patient';

                        if (isDoctor) {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => DoctorInfoScreen(
                                doctorId: conv.partnerId,
                                initialName: conv.partnerName,
                              ),
                            ),
                          );
                        } else if (isPharmacy) {
                          showDialog(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Notifications'),
                              content: const Text('Profile viewing for this role is being developed. Please come back later!'),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context),
                                  child: const Text('Close'),
                                ),
                              ],
                            ),
                          );
                        } else {
                          // Mặc định các trường hợp còn lại (người dùng thường/bệnh nhân)
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => PatientInfoScreen(
                                patientId: conv.partnerId,
                                initialName: conv.partnerName,
                              ),
                            ),
                          );
                        }
                      }),

                    _buildQuickAction(
                      context.watch<ChatProvider>().isMuted(conv.id) ? Icons.notifications_off : Icons.notifications, 
                      context.watch<ChatProvider>().isMuted(conv.id) ? 'Unmute' : 'Mute', 
                      colors, () {
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
                  onTap: () async {
                    Navigator.pop(context); // Đóng BottomSheet
                    final messageId = await Navigator.push<String?>(context, MaterialPageRoute(
                      builder: (_) => ChatSearchScreen(conversation: conv),
                    ));
                    if (messageId != null) {
                      _scrollToMessageId(messageId);
                    }
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
                ListTile(
                  leading: Icon(Icons.palette, color: colors.onSurfaceVariant),
                  title: const Text('Change Theme'),
                  onTap: () {
                    Navigator.pop(context); // Đóng BottomSheet
                    _showThemeSelectionDialog(context);
                  },
                ),
                const Divider(),
                if (context.watch<ChatProvider>().getBlockedBy(conv.id) == null || context.watch<ChatProvider>().getBlockedBy(conv.id) == context.read<AuthProvider>().userId)
                  ListTile(
                    enabled: conv.appointmentStatus != 'COMPLETED',
                    leading: Icon(Icons.block, color: conv.appointmentStatus == 'COMPLETED' ? Colors.grey : (context.watch<ChatProvider>().isBlocked(conv.id) ? Colors.green : Colors.red.shade400)),
                    title: Text(context.watch<ChatProvider>().isBlocked(conv.id) ? 'Unblock' : 'Block', style: TextStyle(color: conv.appointmentStatus == 'COMPLETED' ? Colors.grey : (context.watch<ChatProvider>().isBlocked(conv.id) ? Colors.green : Colors.red.shade400))),
                    onTap: conv.appointmentStatus == 'COMPLETED' ? null : () {
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

  void _showThemeSelectionDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.all(16.0),
                child: Text(
                  'Select Chat Theme',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, fontFamily: 'Inter'),
                ),
              ),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: totalChatThemes,
                  itemBuilder: (context, index) {
                    final theme = getActiveChatTheme(context, index);
                    final isSelected = context.watch<ChatProvider>().chatThemeIndex == index;
                    return ListTile(
                      leading: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: theme.primary,
                          border: Border.all(color: theme.bubbleOther, width: 2),
                        ),
                      ),
                      title: Text(theme.name, style: const TextStyle(fontFamily: 'Inter')),
                      trailing: isSelected ? Icon(Icons.check_circle, color: theme.primary) : null,
                      onTap: () {
                        context.read<ChatProvider>().changeTheme(index);
                        Navigator.pop(context);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showMuteDialog(BuildContext context) {
    final chat = context.read<ChatProvider>();
    final isMuted = chat.isMuted(widget.conversation.id);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isMuted ? 'Unmute Notifications' : 'Mute Notifications'),
        content: Text(isMuted 
            ? 'Receive notifications for this conversation again?' 
            : 'Mute notifications for this conversation?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('CANCEL'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              chat.toggleMute(widget.conversation.id);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(isMuted ? 'Notifications unmuted' : 'Notifications muted')),
              );
            },
            child: Text(isMuted ? 'UNMUTE' : 'MUTE'),
          ),
        ],
      ),
    );
  }

  void _showBlockDialog(BuildContext context) {
    final chat = context.read<ChatProvider>();
    final isBlocked = chat.isBlocked(widget.conversation.id);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isBlocked ? 'Unblock User' : 'Block User'),
        content: Text(isBlocked
            ? 'You will receive messages and calls from this person again.'
            : 'You won\'t receive messages or calls from this person anymore.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('CANCEL'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: isBlocked ? Colors.green : Colors.red),
            onPressed: () async {
              Navigator.pop(context);
              final auth = context.read<AuthProvider>();
              try {
                await chat.toggleBlock(auth.accessToken!, auth.userId!, widget.conversation.id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(isBlocked ? 'User unblocked' : 'User blocked')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e')),
                  );
                }
              }
            },
            child: Text(isBlocked ? 'UNBLOCK' : 'BLOCK'),
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

/// Widget cho hiển thị và phát tin nhắn âm thanh
class AudioPlayerBubble extends StatefulWidget {
  final String audioUrl;
  final ColorScheme colors;

  const AudioPlayerBubble({
    super.key,
    required this.audioUrl,
    required this.colors,
  });

  @override
  State<AudioPlayerBubble> createState() => _AudioPlayerBubbleState();
}

class _AudioPlayerBubbleState extends State<AudioPlayerBubble> {
  final AudioPlayer _audioPlayer = AudioPlayer();
  bool _isPlaying = false;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;
  bool _isDisposed = false;

  @override
  void initState() {
    super.initState();
    _setupAudioListeners();
    _loadAudioSource(widget.audioUrl);
  }

  void _setupAudioListeners() {
    _audioPlayer.onPlayerStateChanged.listen((state) {
      if (!_isDisposed && mounted) {
        setState(() {
          _isPlaying = state == PlayerState.playing;
        });
      }
    });

    _audioPlayer.onDurationChanged.listen((newDuration) {
      if (!_isDisposed && mounted) {
        setState(() {
          _duration = newDuration;
        });
      }
    });

    _audioPlayer.onPositionChanged.listen((newPosition) {
      if (!_isDisposed && mounted) {
        setState(() {
          _position = newPosition;
        });
      }
    });
  }

  Future<void> _loadAudioSource(String url) async {
    if (url.isEmpty) return;
    try {
      bool isLocalFile = false;
      if (url.startsWith('/')) {
         isLocalFile = await File(url).exists();
      }
      if (_isDisposed) return;

      if (isLocalFile) {
         await _audioPlayer.setSourceDeviceFile(url);
      } else {
         final normalizedUrl = ApiConfig.normalizeUrl(url);
         if (normalizedUrl != null && normalizedUrl.isNotEmpty) {
            await _audioPlayer.setSourceUrl(normalizedUrl);
         }
      }
    } catch (e) {
      debugPrint("Error loading audio: $e");
    }
  }

  @override
  void didUpdateWidget(covariant AudioPlayerBubble oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.audioUrl != widget.audioUrl) {
      _loadAudioSource(widget.audioUrl);
    }
  }

  @override
  void dispose() {
    _isDisposed = true;
    _audioPlayer.dispose();
    super.dispose();
  }

  String _formatDuration(Duration d) {
    final minutes = d.inMinutes;
    final seconds = d.inSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 250,
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      margin: const EdgeInsets.only(bottom: 0),
      decoration: BoxDecoration(
        color: widget.colors.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: widget.colors.surfaceContainerHighest),
      ),
      child: Row(
        children: [
          IconButton(
            icon: Icon(
              _isPlaying ? Icons.pause_circle_filled : Icons.play_circle_fill,
              size: 32,
              color: widget.colors.primary,
            ),
            onPressed: () async {
              if (_isPlaying) {
                await _audioPlayer.pause();
              } else {
                await _audioPlayer.resume();
              }
            },
          ),
          Expanded(
            child: Slider(
              value: _position.inSeconds.toDouble(),
              max: _duration.inSeconds > 0 ? _duration.inSeconds.toDouble() : 1.0,
              onChanged: (value) async {
                final position = Duration(seconds: value.toInt());
                await _audioPlayer.seek(position);
              },
              activeColor: widget.colors.primary,
              inactiveColor: widget.colors.outlineVariant,
            ),
          ),
          Text(
            _formatDuration(_position.inSeconds > 0 ? _position : _duration),
            style: TextStyle(
              fontSize: 12,
              color: widget.colors.onSurfaceVariant,
              fontFamily: 'Inter',
            ),
          ),
          const SizedBox(width: 12),
        ],
      ),
    );
  }
}

