import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/chat/conversation.dart';
import '../../providers/auth_provider.dart';
import '../../providers/chat/chat_provider.dart';
import '../../config/api_config.dart';
import 'chat_room_screen.dart';
import './chatbot/chatbot_screen.dart';
import '../../l10n/app_localizations.dart';
import '../../utils/localization_utils.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      if (auth.accessToken != null && auth.userId != null) {
        context.read<ChatProvider>().loadConversations(
          auth.accessToken!,
          auth.userId!,
        );
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }


  @override
  Widget build(BuildContext context) {
    final bool isDesktop = MediaQuery.of(context).size.width >= 768;

    return Column(
      children: [
        _buildHeader(isDesktop),
        Expanded(
          child: Consumer<ChatProvider>(
            builder: (context, chat, _) {
              // Loading state
              if (chat.isLoadingConversations) {
                return const Center(child: CircularProgressIndicator());
              }
              // Error state
              if (chat.conversationsError != null) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.wifi_off, size: 48, color: Theme.of(context).colorScheme.onSurfaceVariant),
                      const SizedBox(height: 16),
                      Text(
                        chat.conversationsError!,
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                      ),
                      const SizedBox(height: 24),
                      FilledButton.tonal(
                        onPressed: () {
                          final auth = context.read<AuthProvider>();
                          if (auth.accessToken != null && auth.userId != null) {
                            chat.loadConversations(auth.accessToken!, auth.userId!);
                          }
                        },
                        child: Text(AppLocalizations.of(context)!.chatTryAgain),
                      ),
                    ],
                  ),
                );
              }

              // Lọc theo search query
              final filtered = _searchQuery.isEmpty
                  ? chat.conversations
                  : chat.conversations.where((c) {
                      final q = _searchQuery.toLowerCase();
                      return c.partnerName.toLowerCase().contains(q) ||
                          (c.partnerSpecialty ?? '').toLocalizedSpecialty(context).toLowerCase().contains(q) ||
                          c.lastMessage.toLowerCase().contains(q);
                    }).toList();

              // Danh sách conversation
              return RefreshIndicator(
                color: Theme.of(context).colorScheme.primary,
                onRefresh: () async {
                  final auth = context.read<AuthProvider>();
                  if (auth.accessToken != null && auth.userId != null) {
                    await chat.loadConversations(auth.accessToken!, auth.userId!);
                  }
                },
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: EdgeInsets.symmetric(
                    horizontal: isDesktop ? 32.0 : 16.0,
                    vertical: isDesktop ? 32.0 : 8.0,
                  ),
                  child: Center(
                    child: Container(
                      constraints: const BoxConstraints(maxWidth: 896),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildSearchBar(),
                          const SizedBox(height: 16),
                          // AI Bot item — luôn hiển thị đầu danh sách (chỉ dành cho Patient)
                          if (context.watch<AuthProvider>().isPatient) ...[
                            _buildBotItem(),
                            const SizedBox(height: 8),
                          ],
                          if (filtered.isEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 64.0),
                              child: Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.chat_bubble_outline, size: 64, color: Theme.of(context).colorScheme.outlineVariant),
                                    const SizedBox(height: 16),
                                    Text(
                                      _searchQuery.isEmpty ? AppLocalizations.of(context)!.chatNoConversations : AppLocalizations.of(context)!.chatNoResults,
                                      style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 16),
                                    ),
                                  ],
                                ),
                              ),
                            )
                          else
                            ...filtered.map((conv) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: _buildChatListItem(
                                conversation: conv,
                                onTap: () => _openChatRoom(conv),
                              ),
                            )),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  /// Điều hướng sang ChatRoomScreen với đúng conversation.
  void _openChatRoom(Conversation conv) {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken != null && auth.userId != null) {
      context.read<ChatProvider>().openConversation(
        auth.accessToken!,
        auth.userId!,
        conv,
      );
    }
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChatRoomScreen(conversation: conv),
      ),
    );
  }

  void _showBlockedUsersDialog(BuildContext context) {
    final chatProvider = context.read<ChatProvider>();
    final auth = context.read<AuthProvider>();
    final currentUserId = auth.userId;
    
    final blockedConvs = chatProvider.conversations.where((c) => c.blockedBy == currentUserId).toList();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(AppLocalizations.of(context)!.chatBlockedUsers),
          content: SizedBox(
            width: double.maxFinite,
            height: 300,
            child: blockedConvs.isEmpty
                ? Center(child: Text(AppLocalizations.of(context)!.chatNoBlockedUsers))
                : ListView.builder(
                    itemCount: blockedConvs.length,
                    itemBuilder: (context, index) {
                      final conv = blockedConvs[index];
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundImage: conv.partnerAvatarUrl != null
                              ? NetworkImage(ApiConfig.normalizeUrl(conv.partnerAvatarUrl!) ?? '')
                              : null,
                          child: conv.partnerAvatarUrl == null ? const Icon(Icons.person) : null,
                        ),
                        title: Text(conv.partnerName, style: TextStyle(color: Colors.red.shade400)),
                        trailing: TextButton(
                          onPressed: () async {
                            try {
                              await chatProvider.toggleBlock(auth.accessToken!, auth.userId!, conv.id);
                              if (context.mounted) {
                                Navigator.pop(context); // Đóng hộp thoại
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(AppLocalizations.of(context)!.chatUnblockedSuccess)),
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
                          child: Text(AppLocalizations.of(context)!.chatUnblock, style: const TextStyle(color: Colors.green)),
                        ),
                      );
                    },
                  ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(AppLocalizations.of(context)!.chatClose),
            ),
          ],
        );
      },
    );
  }

  // --- 1. Header Component (Phân biệt Mobile / Desktop) ---
  Widget _buildHeader(bool isDesktop) {
    if (isDesktop) {
      // Header cho Desktop
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 32.0, vertical: 20.0),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          boxShadow: [
            BoxShadow(color: Theme.of(context).colorScheme.shadow.withValues(alpha: 0.05), blurRadius: 2, offset: const Offset(0, 1)),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.monitor_heart, color: Theme.of(context).colorScheme.primary, size: 28),
                ),
                const SizedBox(width: 16),
                Text(
                  'HealthLink',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: Theme.of(context).colorScheme.primary,
                    letterSpacing: -0.5,
                  ),
                ),
              ],
            ),
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.block),
                  color: Colors.red.shade400,
                  tooltip: 'Blocked users',
                  onPressed: () => _showBlockedUsersDialog(context),
                ),
                const SizedBox(width: 16),
                _buildAvatarWidget(context, true),
              ],
            ),
          ],
        ),
      );
    }

    // Header cho Mobile
    return SafeArea(
      bottom: false,
      child: Container(
        padding: const EdgeInsets.all(16.0),
        color: Theme.of(context).colorScheme.surface,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                _buildAvatarWidget(context, false),
                const SizedBox(width: 12),
                Text(
                  AppLocalizations.of(context)!.chatMessagesTitle,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ],
            ),
            IconButton(
              icon: const Icon(Icons.block),
              color: Colors.red.shade400,
              tooltip: 'Blocked users',
              onPressed: () => _showBlockedUsersDialog(context),
            ),
          ],
        ),
      ),
    );
  }

  // --- 2. Thanh tìm kiếm ---
  Widget _buildSearchBar() {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
      ),
      child: TextField(
        controller: _searchController,
        onChanged: (value) => setState(() => _searchQuery = value),
        style: TextStyle(fontFamily: 'Inter', color: Theme.of(context).colorScheme.onSurface),
        decoration: InputDecoration(
          hintText: AppLocalizations.of(context)!.chatSearchPrompt,
          hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
          prefixIcon: Padding(
            padding: const EdgeInsets.only(left: 8.0),
            child: Icon(Icons.search, color: Theme.of(context).colorScheme.onSurfaceVariant),
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
        ),
      ),
    );
  }

  // --- 3. Item trong danh sách Chat ---
  Widget _buildChatListItem({
    required Conversation conversation,
    required VoidCallback onTap,
  }) {
    final hasUnread = conversation.unreadCount > 0;
    final isRead = conversation.isLastMessageRead;
    final isSupport = conversation.isSupport;
    final isOnline = conversation.isOnline;
    final avatarUrl = conversation.partnerAvatarUrl ?? '';

    // Format thời gian hiển thị
    final now = DateTime.now();
    final msgTime = conversation.lastMessageTime;
    String timeLabel;
    if (now.difference(msgTime).inDays == 0) {
      timeLabel = '${msgTime.hour.toString().padLeft(2, '0')}:${msgTime.minute.toString().padLeft(2, '0')}';
    } else if (now.difference(msgTime).inDays == 1) {
      timeLabel = 'Yesterday';
    } else {
      timeLabel = '${msgTime.day}/${msgTime.month}';
    }

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.transparent),
          boxShadow: [
            BoxShadow(
              color: Theme.of(context).colorScheme.shadow.withValues(alpha: 0.05),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Opacity(
          opacity: isRead && !hasUnread ? 0.8 : 1.0,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar & Online Indicator
              Stack(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isSupport
                          ? Theme.of(context).colorScheme.secondaryContainer
                          : Theme.of(context).colorScheme.surfaceContainerHighest,
                    ),
                    child: isSupport
                        ? Icon(Icons.support_agent, color: Theme.of(context).colorScheme.onSecondaryContainer, size: 32)
                        : (ApiConfig.normalizeUrl(avatarUrl) != null)
                            ? ClipRRect(
                                borderRadius: BorderRadius.circular(28),
                                child: Image.network(
                                  ApiConfig.normalizeUrl(avatarUrl)!,
                                  fit: BoxFit.cover,
                                  width: 56,
                                  height: 56,
                                  errorBuilder: (context, error, stackTrace) =>
                                      Icon(Icons.person, color: Theme.of(context).colorScheme.onSurfaceVariant),
                                ),
                              )
                            : Icon(Icons.person, color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                  if (isOnline)
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        width: 16,
                        height: 16,
                        decoration: BoxDecoration(
                          color: Colors.green.shade500,
                          shape: BoxShape.circle,
                          border: Border.all(color: Theme.of(context).colorScheme.surface, width: 2),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 16),

              // Nội dung Chat
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Flexible(
                                child: Text(
                                  conversation.partnerName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 16,
                                    fontWeight: hasUnread ? FontWeight.w600 : FontWeight.w500,
                                    color: context.watch<ChatProvider>().isBlocked(conversation.id)
                                        ? Colors.red.shade400
                                        : (hasUnread
                                            ? Theme.of(context).colorScheme.onSurface
                                            : Theme.of(context).colorScheme.onSurfaceVariant),
                                  ),
                                ),
                              ),
                              if (context.watch<ChatProvider>().isBlocked(conversation.id))
                                Padding(
                                  padding: const EdgeInsets.only(left: 4),
                                  child: Icon(Icons.block, size: 14, color: Colors.red.shade400),
                                ),
                            ],
                          ),
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (context.watch<ChatProvider>().isMuted(conversation.id))
                              Padding(
                                padding: const EdgeInsets.only(right: 4),
                                child: Icon(Icons.notifications_off, size: 14, color: Theme.of(context).colorScheme.outline),
                              ),
                            Text(
                              timeLabel,
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: hasUnread
                                    ? Theme.of(context).colorScheme.primary
                                    : Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    if (conversation.partnerSpecialty != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        conversation.partnerSpecialty!.toLocalizedSpecialty(context),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: hasUnread
                              ? Theme.of(context).colorScheme.primary
                              : Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                    const SizedBox(height: 4),
                    Text(
                      conversation.lastMessage,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: hasUnread
                            ? Theme.of(context).colorScheme.onSurface
                            : Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),

              // Badge chưa đọc
              if (hasUnread)
                Container(
                  margin: const EdgeInsets.only(left: 12, top: 12),
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      conversation.unreadCount > 99 ? '99+' : conversation.unreadCount.toString(),
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onPrimary,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  // --- Bot Item: AI Chatbot pinned ở đầu danh sách ---
  Widget _buildBotItem() {
    return InkWell(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => const ChatbotScreen(),
          ),
        );
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Colors.purple.shade50,
              Colors.teal.shade50,
            ],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Colors.purple.shade100,
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.purple.withValues(alpha: 0.08),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Avatar gradient
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [Colors.purple.shade400, Colors.teal.shade400],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.purple.withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: const Icon(Icons.auto_awesome, color: Colors.white, size: 28),
            ),
            const SizedBox(width: 16),
            // Nội dung
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        AppLocalizations.of(context)!.chatHealthLinkAI,
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Colors.purple.shade800,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Colors.purple.shade400, Colors.teal.shade400],
                          ),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          'AI',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    AppLocalizations.of(context)!.chatAIAssistantDesc,
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: Colors.teal.shade700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    AppLocalizations.of(context)!.chatAIPrompt,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 13,
                      color: Colors.purple.shade400,
                    ),
                  ),
                ],
              ),
            ),
            // Online dot
            Column(
              mainAxisAlignment: MainAxisAlignment.start,
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                    color: Colors.green,
                    shape: BoxShape.circle,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // --- Helper: Avatar widget ---
  Widget _buildAvatarWidget(BuildContext context, bool isDesktop) {
    final avatarUrl = context.watch<AuthProvider>().avatarUrl;
    final normalizedUrl = ApiConfig.normalizeUrl(avatarUrl);
    const size = 40.0;

    Widget avatar;
    if (normalizedUrl != null) {
      avatar = Image.network(
        normalizedUrl,
        fit: BoxFit.cover,
        width: size,
        height: size,
        errorBuilder: (_, __, ___) => Icon(
          Icons.person,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      );
    } else {
      avatar = Icon(
        Icons.person,
        color: Theme.of(context).colorScheme.onSurfaceVariant,
      );
    }

    return GestureDetector(
      onTap: () {
        Scaffold.of(context).openDrawer();
      },
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: isDesktop ? Border.all(color: Theme.of(context).colorScheme.surface, width: 2) : null,
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(size / 2),
          child: avatar,
        ),
      ),
    );
  }
}
