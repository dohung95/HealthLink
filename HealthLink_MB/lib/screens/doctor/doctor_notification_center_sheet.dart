import 'package:flutter/material.dart';
import '../../models/notification/notification_item.dart';
import '../../services/notification/notification_service.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';

class DoctorNotificationCenterSheet extends StatefulWidget {
  const DoctorNotificationCenterSheet({super.key, required this.service, required this.onChanged});

  final NotificationService service;
  final VoidCallback onChanged;

  @override
  State<DoctorNotificationCenterSheet> createState() => _DoctorNotificationCenterSheetState();
}

class _DoctorNotificationCenterSheetState extends State<DoctorNotificationCenterSheet> {
  bool _loading = true;
  String? _error;
  List<NotificationItem> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });

    try {
      final result = await widget.service.getNotifications(page: 0, size: 50);
      if (!mounted) return;
      setState(() { _items = result.items; });
    } catch (error) {
      if (!mounted) return;
      setState(() { _error = error.toString().replaceFirst('Exception: ', ''); });
    } finally {
      if (mounted) setState(() { _loading = false; });
    }
  }

  Future<void> _markAsRead(NotificationItem item) async {
    if (item.read) return;
    try {
      await widget.service.markAsRead(item.notificationId);
      widget.onChanged();
      await _load();
    } catch (error) {
      _showMessage(error.toString().replaceFirst('Exception: ', ''), isError: true);
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      await widget.service.markAllAsRead();
      widget.onChanged();
      await _load();
    } catch (error) {
      _showMessage(error.toString().replaceFirst('Exception: ', ''), isError: true);
    }
  }

  void _showMessage(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), behavior: SnackBarBehavior.floating, backgroundColor: isError ? Colors.red : null));
  }

  String _groupOf(DateTime date) {
    final now = DateTime.now();
    final startToday = DateTime(now.year, now.month, now.day);
    final startYesterday = startToday.subtract(const Duration(days: 1));
    if (date.isAfter(startToday) || date.isAtSameMomentAs(startToday)) return 'Today';
    if (date.isAfter(startYesterday) || date.isAtSameMomentAs(startYesterday)) return 'Yesterday';
    return 'Earlier';
  }

  Map<String, List<NotificationItem>> _groupItems() {
    final map = <String, List<NotificationItem>>{};
    for (final item in _items) {
      final group = _groupOf(item.createdAt);
      (map[group] ??= []).add(item);
    }
    return map;
  }

  String _timeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${diff.inDays ~/ 7}w ago';
  }

  @override
  Widget build(BuildContext context) {
    final hasUnread = _items.any((n) => !n.read);

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(color: DS.card, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      child: Column(children: [
        Container(
          padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
          decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: DS.border))),
          child: Row(children: [
            const Icon(Icons.notifications, size: 18, color: DS.primary),
            const SizedBox(width: 8),
            const Expanded(child: Text('Notifications', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: DS.foreground))),
            if (hasUnread)
              TextButton.icon(
                onPressed: _markAllAsRead,
                icon: const Icon(Icons.done_all, size: 16),
                label: const Text('Mark all read'),
                style: TextButton.styleFrom(foregroundColor: DS.primary, textStyle: const TextStyle(fontSize: 14)),
              ),
          ]),
        ),
        Expanded(child: _buildBody()),
      ]),
    );
  }

  Widget _buildBody() {
    if (_loading) return const Center(child: CircularProgressIndicator(color: DS.primary));

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Container(width: 64, height: 64, decoration: const BoxDecoration(color: DS.secondary, shape: BoxShape.circle), child: Icon(Icons.error_outline, size: 28, color: DS.mutedForeground.withOpacity(0.6))),
            const SizedBox(height: 16),
            Text(_error!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: DS.mutedForeground)),
            const SizedBox(height: 16),
            ElevatedButton.icon(onPressed: _load, icon: const Icon(Icons.refresh, size: 18), label: const Text('Retry'), style: DS.primaryButtonStyle),
          ]),
        ),
      );
    }

    if (_items.isEmpty) return const DoctorEmptyState(icon: Icons.notifications_off_outlined, title: 'No notifications', subtitle: "You're all caught up. New alerts will show here.");

    final grouped = _groupItems();
    final order = ['Today', 'Yesterday', 'Earlier'];

    return RefreshIndicator(
      onRefresh: _load,
      color: DS.primary,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          for (final group in order)
            if (grouped[group]?.isNotEmpty ?? false) ...[
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(group.toUpperCase(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 0.5, color: DS.mutedForeground)),
              ),
              ...grouped[group]!.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _NotificationCard(item: item, timeAgo: _timeAgo(item.createdAt), onTap: () => _markAsRead(item)),
              )),
              const SizedBox(height: 12),
            ],
        ],
      ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  final NotificationItem item;
  final String timeAgo;
  final VoidCallback onTap;

  const _NotificationCard({required this.item, required this.timeAgo, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isRead = item.read;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isRead ? DS.card : DS.primary.withOpacity(0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isRead ? DS.border : DS.primary.withOpacity(0.2)),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _buildIcon(),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(item.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: DS.foreground), overflow: TextOverflow.ellipsis)),
                const SizedBox(width: 8),
                Text(timeAgo, style: const TextStyle(fontSize: 11, color: DS.mutedForeground)),
              ]),
              const SizedBox(height: 2),
              Text(item.message, style: const TextStyle(fontSize: 12, color: DS.mutedForeground)),
            ]),
          ),
          if (!isRead) ...[
            const SizedBox(width: 8),
            Container(width: 8, height: 8, margin: const EdgeInsets.only(top: 4), decoration: const BoxDecoration(color: DS.primary, shape: BoxShape.circle)),
          ],
        ]),
      ),
    );
  }

  Widget _buildIcon() {
    final type = item.type.toUpperCase();
    Color bgColor;
    Color iconColor;
    IconData icon;

    switch (type) {
      case 'APPOINTMENT_REMINDER':
      case 'NEW_APPOINTMENT':
      case 'APPOINTMENT_CONFIRMED':
      case 'APPOINTMENT_CANCELLED':
        bgColor = DS.primary.withOpacity(0.15);
        iconColor = DS.primary;
        icon = Icons.calendar_today_outlined;
        break;
      case 'INVOICE_PAID':
      case 'PAYMENT':
        bgColor = DS.emerald100;
        iconColor = DS.emerald600;
        icon = Icons.payment_outlined;
        break;
      case 'NEW_MESSAGE':
      case 'CHAT':
        bgColor = DS.sky100;
        iconColor = DS.sky600;
        icon = Icons.chat_bubble_outline;
        break;
      default:
        bgColor = DS.secondary;
        iconColor = DS.mutedForeground;
        icon = Icons.info_outline;
    }

    return Container(width: 36, height: 36, decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(8)), child: Icon(icon, size: 16, color: iconColor));
  }
}
