import 'package:flutter/material.dart';

import '../../../models/notification/notification_item.dart';
import '../../../services/notification/notification_service.dart';
import '../../../l10n/app_localizations.dart';

class NotificationCenterSheet extends StatefulWidget {
  const NotificationCenterSheet({
    super.key,
    required this.service,
    required this.onChanged,
  });

  final NotificationService service;
  final VoidCallback onChanged;

  @override
  State<NotificationCenterSheet> createState() =>
      _NotificationCenterSheetState();
}

class _NotificationCenterSheetState extends State<NotificationCenterSheet> {
  bool _loading = true;
  String? _error;
  List<NotificationItem> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final result = await widget.service.getNotifications(
        page: 0,
        size: 20,
      );

      if (!mounted) return;

      setState(() {
        _items = result.items;
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _markAsRead(NotificationItem item) async {
    if (item.read) return;

    try {
      await widget.service.markAsRead(item.notificationId);
      widget.onChanged();
      await _load();
    } catch (error) {
      _showMessage(
        error.toString().replaceFirst('Exception: ', ''),
        isError: true,
      );
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      await widget.service.markAllAsRead();
      widget.onChanged();
      await _load();
    } catch (error) {
      _showMessage(
        error.toString().replaceFirst('Exception: ', ''),
        isError: true,
      );
    }
  }

  void _showMessage(String message, {bool isError = false}) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        backgroundColor: isError ? Theme.of(context).colorScheme.error : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return SafeArea(
      top: false,
      child: Container(
        height: MediaQuery.of(context).size.height * 0.82,
        decoration: BoxDecoration(
          color: colors.surface,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(26),
          ),
        ),
        child: Column(
          children: [
            const SizedBox(height: 10),
            Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: colors.outlineVariant,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 12, 10),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      AppLocalizations.of(context)!.notificationsTitle,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: colors.primary,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: _items.isEmpty ? null : _markAllAsRead,
                    child: Text(AppLocalizations.of(context)!.notificationsMarkAllRead),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: colors.outlineVariant),
            Expanded(
              child: _buildBody(context),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            _error!,
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    if (_items.isEmpty) {
      return Center(
        child: Text(AppLocalizations.of(context)!.notificationsEmpty),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final item = _items[index];

          return _NotificationCard(
            item: item,
            onTap: () => _markAsRead(item),
          );
        },
      ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  const _NotificationCard({
    required this.item,
    required this.onTap,
  });

  final NotificationItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: item.read
              ? colors.surfaceContainerLow
              : colors.primaryContainer.withOpacity(0.55),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: item.read ? colors.outlineVariant : colors.primary,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildIcon(context),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.title,
                          style: TextStyle(
                            fontWeight:
                            item.read ? FontWeight.w600 : FontWeight.bold,
                          ),
                        ),
                      ),
                      if (!item.read)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: colors.error,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    item.message,
                    style: TextStyle(
                      color: colors.onSurfaceVariant,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Text(
                        item.displayType,
                        style: TextStyle(
                          color: colors.primary,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _formatTimeAgo(item.createdAt),
                        style: TextStyle(
                          color: colors.outline,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIcon(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    final icon = switch (item.type.toUpperCase()) {
      'APPOINTMENT_REMINDER' => Icons.event_available_outlined,
      'NEW_APPOINTMENT' => Icons.event_note_outlined,
      'PRESCRIPTION_ISSUED' => Icons.medication_outlined,
      'NEW_PRESCRIPTION' => Icons.medication_outlined,
      'INVOICE_PAID' => Icons.payments_outlined,
      _ => Icons.notifications_outlined,
    };

    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        color: item.isHighPriority
            ? colors.errorContainer
            : colors.primaryContainer,
        shape: BoxShape.circle,
      ),
      child: Icon(
        icon,
        color: item.isHighPriority ? colors.error : colors.primary,
      ),
    );
  }

  String _formatTimeAgo(DateTime value) {
    final diff = DateTime.now().difference(value);

    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
    if (diff.inHours < 24) return '${diff.inHours} hours ago';
    if (diff.inDays < 7) return '${diff.inDays} days ago';

    final day = value.day.toString().padLeft(2, '0');
    final month = value.month.toString().padLeft(2, '0');

    return '$day/$month/${value.year}';
  }
}