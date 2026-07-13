import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../../config/api_config.dart';
import '../../providers/auth_provider.dart';
import '../../utils/pharmacy/pharmacy_notification_target.dart';

class PharmacyNotification {
  final int id;
  final String title;
  final String message;
  final String? type;
  final int? relatedId;
  final String? relatedType;
  final String? actionUrl;
  final bool read;
  final DateTime createdAt;

  const PharmacyNotification({
    required this.id,
    required this.title,
    required this.message,
    this.type,
    this.relatedId,
    this.relatedType,
    this.actionUrl,
    required this.read,
    required this.createdAt,
  });

  factory PharmacyNotification.fromJson(Map<String, dynamic> json) {
    return PharmacyNotification(
      id: json['id'] as int,
      title: json['title'] as String? ?? '',
      message: json['message'] as String? ?? '',
      type: json['type'] as String?,
      relatedId: json['relatedId'] as int?,
      relatedType: json['relatedType'] as String?,
      actionUrl: json['actionUrl'] as String?,
      read: json['read'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }
}

class PharmacyNotificationCenterSheet extends StatefulWidget {
  final void Function(NotificationTarget target)? onNavigate;

  const PharmacyNotificationCenterSheet({super.key, this.onNavigate});

  @override
  State<PharmacyNotificationCenterSheet> createState() =>
      _PharmacyNotificationCenterSheetState();
}

class _PharmacyNotificationCenterSheetState
    extends State<PharmacyNotificationCenterSheet> {
  List<PharmacyNotification> _notifications = [];
  bool _isLoading = false;
  bool _hasMore = true;
  int _page = 0;
  String? _error;
  final ScrollController _scrollController = ScrollController();

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
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _loadMore();
    }
  }

  String? get _token {
    final auth = context.read<AuthProvider>();
    return auth.accessToken;
  }

  Future<void> _loadNotifications() async {
    final token = _token;
    if (token == null) return;
    if (_isLoading) return;
    setState(() {
      _isLoading = true;
      _page = 0;
      _hasMore = true;
      _error = null;
    });

    try {
      final res = await http
          .get(
            Uri.parse('${ApiConfig.notifications}?page=0&size=20'),
            headers: {
              'Authorization': 'Bearer $token',
              'Accept': 'application/json',
            },
          )
          .timeout(ApiConfig.connectTimeout);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final List<dynamic> items;
        if (data is List) {
          items = data;
        } else if (data is Map<String, dynamic>) {
          items = data['content'] as List<dynamic>? ??
              data['data'] as List<dynamic>? ??
              [];
        } else {
          items = [];
        }
        _notifications = items
            .map((e) =>
                PharmacyNotification.fromJson(e as Map<String, dynamic>))
            .toList();
        _hasMore = _notifications.length >= 20;
        _page = 1;
      }
    } catch (e) {
      _error = e.toString();
    }

    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _loadMore() async {
    if (_isLoading || !_hasMore) return;
    final token = _token;
    if (token == null) return;
    setState(() => _isLoading = true);

    try {
      final res = await http
          .get(
            Uri.parse('${ApiConfig.notifications}?page=$_page&size=20'),
            headers: {
              'Authorization': 'Bearer $token',
              'Accept': 'application/json',
            },
          )
          .timeout(ApiConfig.connectTimeout);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final List<dynamic> items;
        if (data is List) {
          items = data;
        } else if (data is Map<String, dynamic>) {
          items = data['content'] as List<dynamic>? ??
              data['data'] as List<dynamic>? ??
              [];
        } else {
          items = [];
        }
        final newItems = items
            .map((e) =>
                PharmacyNotification.fromJson(e as Map<String, dynamic>))
            .toList();
        final existingIds = _notifications.map((n) => n.id).toSet();
        for (final item in newItems) {
          if (!existingIds.contains(item.id)) {
            _notifications.add(item);
          }
        }
        _hasMore = newItems.length >= 20;
        _page++;
      }
    } catch (_) {}

    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _markRead(int id) async {
    final token = _token;
    if (token == null) return;
    try {
      await http.patch(
        Uri.parse(ApiConfig.markNotificationAsRead(id)),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );
      final idx = _notifications.indexWhere((n) => n.id == id);
      if (idx >= 0 && mounted) {
        setState(() {
          _notifications[idx] = PharmacyNotification(
            id: _notifications[idx].id,
            title: _notifications[idx].title,
            message: _notifications[idx].message,
            type: _notifications[idx].type,
            relatedId: _notifications[idx].relatedId,
            relatedType: _notifications[idx].relatedType,
            actionUrl: _notifications[idx].actionUrl,
            read: true,
            createdAt: _notifications[idx].createdAt,
          );
        });
      }
    } catch (_) {}
  }

  Future<void> _markAllRead() async {
    final token = _token;
    if (token == null) return;
    try {
      await http.patch(
        Uri.parse(ApiConfig.markAllNotificationsAsRead),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );
      if (mounted) {
        setState(() {
          _notifications = _notifications
              .map((n) => PharmacyNotification(
                    id: n.id,
                    title: n.title,
                    message: n.message,
                    type: n.type,
                    relatedId: n.relatedId,
                    relatedType: n.relatedType,
                    actionUrl: n.actionUrl,
                    read: true,
                    createdAt: n.createdAt,
                  ))
              .toList();
        });
      }
    } catch (_) {}
  }

  void _onTap(PharmacyNotification n) {
    if (!n.read) _markRead(n.id);
    final target = PharmacyNotificationTarget.resolve(
      actionUrl: n.actionUrl,
      requestId: n.relatedType == 'REQUEST' ? n.relatedId : null,
      orderId: n.relatedType == 'ORDER' ? n.relatedId : null,
      type: n.type,
    );
    widget.onNavigate?.call(target);
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
            padding: EdgeInsets.fromLTRB(16, 12, 8, 0),
            child: Row(
              children: [
                Text('Notifications',
                    style: theme.textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.bold)),
                const Spacer(),
                if (_notifications.any((n) => !n.read))
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
                : _error != null && _notifications.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.error_outline,
                                size: 48, color: theme.colorScheme.error),
                            const SizedBox(height: 8),
                            TextButton(
                                onPressed: _loadNotifications,
                                child: const Text('Retry')),
                          ],
                        ),
                      )
                    : _notifications.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.notifications_none,
                                    size: 56,
                                    color: theme.colorScheme.onSurfaceVariant),
                                const SizedBox(height: 8),
                                Text('No notifications',
                                    style: theme.textTheme.bodyLarge),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _loadNotifications,
                            child: ListView.builder(
                              controller: _scrollController,
                              itemCount:
                                  _notifications.length + (_hasMore ? 1 : 0),
                              padding: EdgeInsets.only(bottom: bottomInset),
                              itemBuilder: (_, i) {
                                if (i == _notifications.length) {
                                  return const Padding(
                                    padding: EdgeInsets.all(16),
                                    child: Center(
                                        child:
                                            CircularProgressIndicator()),
                                  );
                                }
                                final n = _notifications[i];
                                return _notificationTile(n, theme);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _notificationTile(PharmacyNotification n, ThemeData theme) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: n.read
            ? theme.colorScheme.surfaceContainerHighest
            : theme.colorScheme.primaryContainer,
        child: Icon(
          _iconForType(n.type),
          size: 18,
          color: n.read
              ? theme.colorScheme.onSurfaceVariant
              : theme.colorScheme.primary,
        ),
      ),
      title: Text(n.title,
          style: TextStyle(
            fontWeight: n.read ? FontWeight.normal : FontWeight.w600,
          )),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(n.message, maxLines: 2, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 2),
          Text(
            _formatTime(n.createdAt),
            style: theme.textTheme.labelSmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ],
      ),
      trailing: n.read
          ? null
          : Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary,
                shape: BoxShape.circle,
              ),
            ),
      onTap: () => _onTap(n),
    );
  }

  IconData _iconForType(String? type) {
    switch (type) {
      case 'REQUEST':
        return Icons.assignment;
      case 'ORDER':
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

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}
