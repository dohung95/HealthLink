import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/notification/notification_item.dart';
import '../../providers/auth_provider.dart';
import '../../services/notification/notification_service.dart';
import '../../utils/pharmacy/pharmacy_notification_target.dart';

class PharmacyNotificationCenterSheet extends StatefulWidget {
  final ValueChanged<NotificationTarget>? onNavigate;
  final ValueChanged<int>? onUnreadCountChanged;
  final NotificationService Function(String token)? serviceFactory;

  const PharmacyNotificationCenterSheet({
    super.key,
    this.onNavigate,
    this.onUnreadCountChanged,
    this.serviceFactory,
  });

  @override
  State<PharmacyNotificationCenterSheet> createState() =>
      _PharmacyNotificationCenterSheetState();
}

class _PharmacyNotificationCenterSheetState
    extends State<PharmacyNotificationCenterSheet> {
  List<NotificationItem> _notifications = [];
  NotificationService? _service;
  bool _isLoading = false;
  int _page = 0;
  int _totalPages = 1;
  String? _firstPageError;
  String? _loadMoreError;
  final ScrollController _scrollController = ScrollController();

  bool get _hasMore => _page + 1 < _totalPages;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _loadMore();
    }
  }

  NotificationService? _getService() {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) return null;
    return _service ??=
        widget.serviceFactory?.call(token) ??
        NotificationService(accessToken: token);
  }

  Future<void> _loadNotifications() async {
    if (_isLoading) return;
    final service = _getService();
    if (service == null) return;

    setState(() {
      _isLoading = true;
      _firstPageError = null;
      _loadMoreError = null;
    });

    try {
      final result = await service.getNotifications(page: 0, size: 20);
      if (!mounted) return;
      setState(() {
        _notifications = result.items;
        _page = result.page;
        _totalPages = result.totalPages;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _firstPageError = _errorMessage(error);
        _isLoading = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_isLoading || !_hasMore) return;
    final service = _getService();
    if (service == null) return;

    final nextPage = _page + 1;
    setState(() {
      _isLoading = true;
      _loadMoreError = null;
    });

    try {
      final result = await service.getNotifications(page: nextPage, size: 20);
      if (!mounted) return;
      final existingIds = _notifications
          .map((item) => item.notificationId)
          .toSet();
      final newItems = result.items
          .where((item) => existingIds.add(item.notificationId))
          .toList();
      setState(() {
        _notifications = [..._notifications, ...newItems];
        _page = result.page;
        _totalPages = result.totalPages;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loadMoreError = _errorMessage(error);
        _isLoading = false;
      });
    }
  }

  Future<void> _markRead(NotificationItem item) async {
    final service = _getService();
    if (service == null) return;

    try {
      await service.markAsRead(item.notificationId);
      if (!mounted) return;
      final index = _notifications.indexWhere(
        (notification) => notification.notificationId == item.notificationId,
      );
      if (index >= 0) {
        setState(() {
          _notifications[index] = _withReadState(_notifications[index], true);
        });
      }
      _notifyUnreadCount();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_errorMessage(error))));
    }
  }

  Future<void> _markAllRead() async {
    final service = _getService();
    if (service == null) return;

    try {
      await service.markAllAsRead();
      if (!mounted) return;
      setState(() {
        _notifications = _notifications
            .map((item) => _withReadState(item, true))
            .toList();
      });
      _notifyUnreadCount();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_errorMessage(error))));
    }
  }

  NotificationItem _withReadState(NotificationItem item, bool read) {
    return NotificationItem(
      notificationId: item.notificationId,
      title: item.title,
      message: item.message,
      type: item.type,
      priority: item.priority,
      read: read,
      createdAt: item.createdAt,
      actionUrl: item.actionUrl,
      relatedId: item.relatedId,
    );
  }

  void _notifyUnreadCount() {
    final unread = _notifications.where((item) => !item.read).length;
    widget.onUnreadCountChanged?.call(unread);
  }

  void _onTap(NotificationItem item) {
    if (!item.read) _markRead(item);
    final type = item.type.toUpperCase();
    final target = PharmacyNotificationTarget.resolve(
      actionUrl: item.actionUrl,
      requestId: type.contains('REQUEST') ? item.relatedId : null,
      orderId: type.contains('ORDER') ? item.relatedId : null,
      type: item.type,
    );
    widget.onNavigate?.call(target);
  }

  String _errorMessage(Object error) {
    return error.toString().replaceFirst('Exception: ', '');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (_, scrollController) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 8, 0),
            child: Row(
              children: [
                Text(
                  'Notifications',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                if (_notifications.any((item) => !item.read))
                  TextButton(
                    onPressed: _markAllRead,
                    child: const Text('Mark all read'),
                  ),
              ],
            ),
          ),
          const Divider(),
          Expanded(
            child: _isLoading && _notifications.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : _notifications.isEmpty && _firstPageError != null
                ? _firstPageErrorView()
                : _notifications.isEmpty
                ? _emptyView(theme)
                : Column(
                    children: [
                      if (_firstPageError != null) _refreshErrorBanner(theme),
                      Expanded(
                        child: RefreshIndicator(
                          onRefresh: _loadNotifications,
                          child: ListView.builder(
                            controller: _scrollController,
                            itemCount:
                                _notifications.length + (_hasMore ? 1 : 0),
                            padding: EdgeInsets.only(bottom: bottomInset),
                            itemBuilder: (_, index) {
                              if (index == _notifications.length) {
                                return _loadMoreFooter(theme);
                              }
                              return _notificationTile(
                                _notifications[index],
                                theme,
                              );
                            },
                          ),
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _firstPageErrorView() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 48),
          const SizedBox(height: 8),
          Text(_firstPageError!),
          const SizedBox(height: 8),
          TextButton(
            key: const ValueKey('notification-first-page-retry'),
            onPressed: _loadNotifications,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _refreshErrorBanner(ThemeData theme) {
    return Material(
      color: theme.colorScheme.errorContainer,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            Expanded(child: Text(_firstPageError!)),
            TextButton(
              key: const ValueKey('notification-first-page-retry'),
              onPressed: _loadNotifications,
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _emptyView(ThemeData theme) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.notifications_none,
            size: 56,
            color: theme.colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 8),
          Text('No notifications', style: theme.textTheme.bodyLarge),
        ],
      ),
    );
  }

  Widget _loadMoreFooter(ThemeData theme) {
    if (_loadMoreError != null) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(
              _loadMoreError!,
              textAlign: TextAlign.center,
              style: TextStyle(color: theme.colorScheme.error),
            ),
            TextButton(
              key: const ValueKey('notification-load-more-retry'),
              onPressed: _loadMore,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }
    if (_isLoading) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    return const SizedBox(height: 16);
  }

  Widget _notificationTile(NotificationItem item, ThemeData theme) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: item.read
            ? theme.colorScheme.surfaceContainerHighest
            : theme.colorScheme.primaryContainer,
        child: Icon(
          _iconForType(item.type),
          size: 18,
          color: item.read
              ? theme.colorScheme.onSurfaceVariant
              : theme.colorScheme.primary,
        ),
      ),
      title: Text(
        item.title,
        style: TextStyle(
          fontWeight: item.read ? FontWeight.normal : FontWeight.w600,
        ),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(item.message, maxLines: 2, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 2),
          Text(
            _formatTime(item.createdAt),
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
      trailing: item.read
          ? null
          : Container(
              key: ValueKey('unread-indicator-${item.notificationId}'),
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary,
                shape: BoxShape.circle,
              ),
            ),
      onTap: () => _onTap(item),
    );
  }

  IconData _iconForType(String type) {
    switch (type.toUpperCase()) {
      case 'REQUEST':
      case 'NEW_PHARMACY_REQUEST':
        return Icons.assignment;
      case 'ORDER':
      case 'ORDER_STATUS':
        return Icons.receipt_long;
      case 'PAYMENT':
        return Icons.payment;
      case 'STOCK_WARNING':
        return Icons.inventory_2;
      case 'REVISION':
        return Icons.edit;
      default:
        return Icons.notifications;
    }
  }

  String _formatTime(DateTime dateTime) {
    final diff = DateTime.now().difference(dateTime);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
  }
}
