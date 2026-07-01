import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/chat/conversation.dart';
import '../../models/chat/message.dart';
import '../../providers/chat/chat_provider.dart';
import '../../config/api_config.dart';
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';
import 'chat_room_screen.dart'; // for FullScreenImageViewer
import '../../providers/auth_provider.dart';
import '../../services/chat/chat_service.dart';

/// Màn hình xem toàn bộ phương tiện (ảnh, video, file) được chia sẻ trong phòng chat.
class ChatMediaScreen extends StatefulWidget {
  final Conversation conversation;

  const ChatMediaScreen({super.key, required this.conversation});

  @override
  State<ChatMediaScreen> createState() => _ChatMediaScreenState();
}

class _ChatMediaScreenState extends State<ChatMediaScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Message> _roomMedia = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchMedia();
    });
  }

  Future<void> _fetchMedia() async {
    try {
      final auth = context.read<AuthProvider>();
      if (auth.accessToken != null && auth.userId != null) {
        final data = await ChatService.getMediaMessages(
          auth.accessToken!,
          auth.userId!,
          widget.conversation.id,
        );
        if (mounted) {
          setState(() {
            _roomMedia = data;
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final chat = context.watch<ChatProvider>();
    
    // Gộp media lịch sử với tin nhắn hiện tại (để lấy realtime updates)
    final combined = [..._roomMedia, ...chat.messages];
    final unique = <String, Message>{};
    for (var m in combined) {
      unique[m.id] = m;
    }
    final allMediaMessages = unique.values.toList()
      ..sort((a, b) => b.sentAt.compareTo(a.sentAt));

    final imageMessages = allMediaMessages.where(
      (m) => (m.imageUrl != null && m.imageUrl!.isNotEmpty) ||
             m.content.startsWith('data:image'),
    ).toList();

    final videoMessages = allMediaMessages.where(
      (m) => m.videoUrl != null && m.videoUrl!.isNotEmpty,
    ).toList();

    final fileMessages = allMediaMessages.where(
      (m) => m.fileUrl != null && m.fileUrl!.isNotEmpty,
    ).toList();

    return Scaffold(
      backgroundColor: colors.surface,
      appBar: AppBar(
        title: const Text('Media & Files'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: colors.primary,
          labelColor: colors.primary,
          unselectedLabelColor: colors.onSurfaceVariant,
          tabs: [
            Tab(
              icon: const Icon(Icons.image_outlined),
              text: 'Images (${imageMessages.length})',
            ),
            Tab(
              icon: const Icon(Icons.videocam_outlined),
              text: 'Videos (${videoMessages.length})',
            ),
            Tab(
              icon: const Icon(Icons.insert_drive_file_outlined),
              text: 'Files (${fileMessages.length})',
            ),
          ],
        ),
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : TabBarView(
            controller: _tabController,
            children: [
              _buildImageGrid(context, colors, imageMessages),
              _buildVideoGrid(context, colors, videoMessages),
              _buildFileList(context, colors, fileMessages),
            ],
          ),
    );
  }

  // ── Tab ảnh ──────────────────────────────────────────────────────────────
  Widget _buildImageGrid(
      BuildContext context, ColorScheme colors, List<Message> messages) {
    if (messages.isEmpty) {
      return _buildEmpty(colors, Icons.image_not_supported_outlined, 'No images shared yet');
    }
    return GridView.builder(
      padding: const EdgeInsets.all(4),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 4,
        mainAxisSpacing: 4,
      ),
      itemCount: messages.length,
      itemBuilder: (context, index) {
        final msg = messages[index];
        final url = msg.imageUrl?.isNotEmpty == true ? msg.imageUrl! : msg.content;

        Widget imageWidget;
        if (url.startsWith('data:image')) {
          try {
            final bytes = base64Decode(url.split(',').last);
            imageWidget = Image.memory(bytes, fit: BoxFit.cover);
          } catch (e) {
            imageWidget = _errorTile(colors);
          }
        } else {
          final normalized = ApiConfig.normalizeUrl(url);
          imageWidget = normalized != null
              ? Image.network(
                  normalized,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _errorTile(colors),
                )
              : _errorTile(colors);
        }

        return GestureDetector(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => FullScreenImageViewer(imageUrl: url),
            ),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: imageWidget,
          ),
        );
      },
    );
  }

  // ── Tab video ─────────────────────────────────────────────────────────────
  Widget _buildVideoGrid(
      BuildContext context, ColorScheme colors, List<Message> messages) {
    if (messages.isEmpty) {
      return _buildEmpty(colors, Icons.videocam_off_outlined, 'No videos shared yet');
    }
    return GridView.builder(
      padding: const EdgeInsets.all(4),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 4,
        mainAxisSpacing: 4,
      ),
      itemCount: messages.length,
      itemBuilder: (context, index) {
        final msg = messages[index];
        final url = msg.videoUrl!;
        final normalized = ApiConfig.normalizeUrl(url);

        return GestureDetector(
          onTap: () async {
            if (normalized != null) {
              final uri = Uri.parse(normalized);
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            }
          },
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: Stack(
              fit: StackFit.expand,
              children: [
                Container(color: colors.surfaceContainerHighest),
                Center(
                  child: Icon(Icons.play_circle_fill,
                      size: 48, color: colors.primary),
                ),
                Positioned(
                  bottom: 4,
                  left: 4,
                  right: 4,
                  child: Text(
                    url.split('/').last,
                    style: TextStyle(color: colors.onSurface, fontSize: 10),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ── Tab file ──────────────────────────────────────────────────────────────
  Widget _buildFileList(
      BuildContext context, ColorScheme colors, List<Message> messages) {
    if (messages.isEmpty) {
      return _buildEmpty(colors, Icons.folder_off_outlined, 'No files shared yet');
    }
    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: messages.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final msg = messages[index];
        final url = msg.fileUrl!;
        final normalized = ApiConfig.normalizeUrl(url);

        // Lấy tên file thực (bỏ timestamp prefix)
        String rawName = url.split('/').last;
        final parts = rawName.split('_');
        final displayName = parts.length > 1 ? parts.sublist(1).join('_') : rawName;

        // Chọn icon theo extension
        final ext = displayName.split('.').last.toLowerCase();
        final icon = _fileIcon(ext, colors);

        return ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          leading: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: colors.primaryContainer,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: colors.primary),
          ),
          title: Text(
            displayName,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontWeight: FontWeight.w500, color: colors.onSurface),
          ),
          subtitle: Text(
            ext.toUpperCase(),
            style: TextStyle(color: colors.outline, fontSize: 12),
          ),
          trailing: Icon(Icons.download_outlined, color: colors.primary),
          onTap: () async {
            if (normalized != null) {
              final uri = Uri.parse(normalized);
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            }
          },
        );
      },
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  Widget _buildEmpty(ColorScheme colors, IconData icon, String text) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 64, color: colors.outlineVariant),
          const SizedBox(height: 12),
          Text(text, style: TextStyle(color: colors.outline)),
        ],
      ),
    );
  }

  Widget _errorTile(ColorScheme colors) => Container(
        color: colors.surfaceContainerHighest,
        child: Icon(Icons.broken_image_outlined, color: colors.outline),
      );

  IconData _fileIcon(String ext, ColorScheme colors) {
    switch (ext) {
      case 'pdf': return Icons.picture_as_pdf;
      case 'doc':
      case 'docx': return Icons.description;
      case 'xls':
      case 'xlsx': return Icons.table_chart;
      case 'ppt':
      case 'pptx': return Icons.slideshow;
      case 'zip':
      case 'rar':
      case '7z': return Icons.folder_zip;
      case 'mp3':
      case 'wav':
      case 'aac': return Icons.audio_file;
      default: return Icons.insert_drive_file;
    }
  }
}
