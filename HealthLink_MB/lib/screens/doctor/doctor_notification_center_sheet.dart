import 'package:flutter/material.dart';

import '../../config/doctor_theme.dart';
import '../../models/notification/notification_item.dart';
import '../../services/notification/notification_service.dart';

/// Bottom sheet hiển thị notifications cho Doctor
/// Reuse logic từ Patient app với UI customize cho Doctor theme
class DoctorNotificationCenterSheet extends StatefulWidget {
  const DoctorNotificationCenterSheet({
    super.key,
    required this.service,
    required this.onChanged,
  });

  final NotificationService service;
  final VoidCallback onChanged;

  @override
  State<DoctorNotificationCenterSheet> createState() =>
      _DoctorNotificationCenterSheetState();
}

class _DoctorNotificationCenterSheetState
    extends State<DoctorNotificationCenterSheet> {
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
    final colors = context.doctorColors;
    final scheme = Theme.of(context).colorScheme;

    return SafeArea(
      top: false,
      child: Container(
        height: MediaQuery.of(context).size.height * 0.82,
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(26),
          ),
        ),
        child: Column(
          children: [
            const SizedBox(height: 10),
            // Handle bar
            Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: colors.divider,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 12, 10),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Notifications',
                      style:
                          Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: colors.primary,
                              ),
                    ),
                  ),
                  TextButton(
                    onPressed: _items.isEmpty ? null : _markAllAsRead,
                    child: const Text('Mark all read'),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: colors.divider),
            // Body
            Expanded(
              child: _buildBody(context),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(BuildContext context) {
    final colors = context.doctorColors;

    if (_loading) {
      return Center(
        child: CircularProgressIndicator(color: colors.primary),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 48, color: colors.error),
              const SizedBox(height: 12),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: TextStyle(color: colors.onSurfaceVariant),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.notifications_off_outlined,
              size: 64,
              color: colors.onSurfaceVariant.withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            Text(
              'No notifications yet',
              style: TextStyle(
                fontSize: 16,
                color: colors.onSurfaceVariant,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      color: colors.primary,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final item = _items[index];

          return _DoctorNotificationCard(
            item: item,
            onTap: () => _markAsRead(item),
          );
        },
      ),
    );
  }
}

class _DoctorNotificationCard extends StatelessWidget {
  const _DoctorNotificationCard({
    required this.item,
    required this.onTap,
  });

  final NotificationItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.doctorColors;
    final scheme = Theme.of(context).colorScheme;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: item.read
              ? scheme.surfaceContainerLow
              : colors.primary.withOpacity(0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: item.read ? colors.cardBorder : colors.primary,
            width: item.read ? 1 : 1.5,
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
                            color: colors.onSurface,
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
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: colors.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          item.displayType,
                          style: TextStyle(
                            color: colors.primary,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _formatTimeAgo(item.createdAt),
                        style: TextStyle(
                          color: colors.onSurfaceVariant.withOpacity(0.7),
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
    final colors = context.doctorColors;

    final icon = switch (item.type.toUpperCase()) {
      'APPOINTMENT_REMINDER' => Icons.event_available_outlined,
      'NEW_APPOINTMENT' => Icons.event_note_outlined,
      'APPOINTMENT_CONFIRMED' => Icons.check_circle_outline,
      'APPOINTMENT_CANCELLED' => Icons.cancel_outlined,
      'PRESCRIPTION_ISSUED' => Icons.medication_outlined,
      'NEW_PRESCRIPTION' => Icons.medication_outlined,
      'INVOICE_PAID' => Icons.payments_outlined,
      'NEW_REVIEW' => Icons.star_outline,
      'NEW_MESSAGE' => Icons.chat_outlined,
      _ => Icons.notifications_outlined,
    };

    final isHighPriority = item.isHighPriority;

    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        color: isHighPriority ? colors.errorBg : colors.infoBg,
        shape: BoxShape.circle,
      ),
      child: Icon(
        icon,
        color: isHighPriority ? colors.error : colors.info,
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
