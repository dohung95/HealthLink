import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/doctor_theme.dart';
import '../../config/api_config.dart';
import '../../providers/auth_provider.dart';
import '../../providers/chat/chat_provider.dart';
import '../../providers/video_call_provider.dart';
import '../../services/video_audio/webrtc_stomp_service.dart';
import '../../services/notification/notification_service.dart';
import '../../services/notification/notification_realtime_service.dart';
import '../../models/notification/notification_item.dart';

import 'doctor_home_screen.dart';
import 'doctor_patients_screen.dart';
import 'doctor_prescriptions_screen.dart';
import 'doctor_schedule_screen.dart' hide DS;
import 'doctor_profile_screen.dart';
import 'doctor_notification_center_sheet.dart';
import 'doctor_chat_screen.dart';
import '../../services/doctor/doctor_schedule_service.dart';
import '../../models/doctor/doctor_schedule.dart';

// ─── Tab model ────────────────────────────────────────────────────────────────
class _TabItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _TabItem(
      {required this.icon, required this.activeIcon, required this.label});
}

// ─── Main layout ──────────────────────────────────────────────────────────────
class DoctorMainLayout extends StatefulWidget {
  const DoctorMainLayout({super.key});

  @override
  State<DoctorMainLayout> createState() => _DoctorMainLayoutState();
}

class _DoctorMainLayoutState extends State<DoctorMainLayout> {
  int _currentIndex = 0;
  int _notifUnread = 0;
  NotificationService? _notifService;
  StreamSubscription<NotificationItem>? _notifSub;

  ComplianceStatus? _compliance;

  late final List<Widget> _screens;

  static const _tabs = [
    _TabItem(
        icon: Icons.home_outlined,
        activeIcon: Icons.home_rounded,
        label: 'Home'),
    _TabItem(
        icon: Icons.chat_bubble_outline_rounded,
        activeIcon: Icons.chat_bubble_rounded,
        label: 'Chat'),
    _TabItem(
        icon: Icons.people_outline,
        activeIcon: Icons.people_alt,
        label: 'Patients'),
    _TabItem(
        icon: Icons.medication_sharp,
        activeIcon: Icons.medication,
        label: 'Prescriptions'),
    _TabItem(
        icon: Icons.schedule_outlined,
        activeIcon: Icons.watch_later,
        label: 'Schedule'),
  ];

  @override
  void initState() {
    super.initState();
    _screens = [
      DoctorHomeScreen(
          onViewAllAppointments: () => setState(() => _currentIndex = 1)),
      const DoctorChatScreen(),
      const DoctorPatientsScreen(),
      const DoctorPrescriptionsScreen(),
      DoctorScheduleScreen(onScheduleSaved: _loadCompliance),
    ];

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      if (auth.isAuthenticated &&
          auth.accessToken != null &&
          auth.userId != null) {
        context
            .read<ChatProvider>()
            .loadConversations(auth.accessToken!, auth.userId!);
        context.read<VideoCallProvider>().updateUserId(auth.userId);
        WebrtcStompService.instance.connect(auth.accessToken!, auth.userId!);
        _initNotifications(auth.accessToken!);
        _loadCompliance();
      }
    });
  }

  Future<void> _loadCompliance() async {
    final token = context.read<AuthProvider>().accessToken ?? '';
    if (token.isEmpty) return;
    try {
      final c = await DoctorScheduleService.getComplianceStatus(token);
      if (mounted) setState(() => _compliance = c);
    } catch (e) {
      debugPrint('[Compliance] load failed: $e');
      // Fallback: hiển thị trạng thái chưa xếp lịch
      if (mounted) {
        setState(() => _compliance = ComplianceStatus(
          requiredHours: 0,
          scheduledHours: 0,
          compliancePercentage: 0,
          status: 'PENDING',
          scheduleActive: false,
          statusMessage: 'Schedule not available — tap to set up',
        ));
      }
    }
  }

  void _initNotifications(String token) {
    _notifService = NotificationService(accessToken: token);
    _notifService!.getUnreadCount().then((c) {
      if (mounted) setState(() => _notifUnread = c);
    }).catchError((_) {});
    NotificationRealtimeService.instance.connect(token: token);
    _notifSub = NotificationRealtimeService.instance.stream.listen((_) {
      if (mounted) setState(() => _notifUnread++);
    });
  }

  @override
  void dispose() {
    _notifSub?.cancel();
    super.dispose();
  }

  void _openNotifications() {
    if (_notifService == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DoctorNotificationCenterSheet(
        service: _notifService!,
        onChanged: () async {
          final c = await _notifService!.getUnreadCount().catchError((_) => 0);
          if (mounted) setState(() => _notifUnread = c);
        },
      ),
    );
  }

  void _openProfile() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const DoctorProfileScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: DoctorStyles.background,
      body: Column(
        children: [
          _DoctorAppBar(
            avatarUrl: auth.avatarUrl,
            displayName: auth.displayName,
            rating: (auth.doctorProfile?['averageRating'] as num?)?.toDouble(),
            notifBadge: _notifUnread,
            compliance: _compliance,
            onAvatarTap: _openProfile,
            onNotifTap: _openNotifications,
            onSettingsTap: _openProfile,
            onGoToSchedule: () => setState(() => _currentIndex = 4),
          ),
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              switchInCurve: Curves.easeIn,
              switchOutCurve: Curves.easeOut,
              transitionBuilder: (child, animation) => FadeTransition(
                opacity: animation,
                child: child,
              ),
              child: IndexedStack(
                key: ValueKey(_currentIndex),
                index: _currentIndex,
                children: _screens,
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _BottomNav(
        tabs: _tabs,
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
      ),
    );
  }
}

// ─── Custom AppBar ─────────────────────────────────────────────────────────────
class _DoctorAppBar extends StatelessWidget {
  final String? avatarUrl;
  final String? displayName;
  final double? rating;
  final int notifBadge;
  final ComplianceStatus? compliance;
  final VoidCallback onAvatarTap;
  final VoidCallback onNotifTap;
  final VoidCallback onSettingsTap;
  final VoidCallback onGoToSchedule;

  const _DoctorAppBar({
    required this.avatarUrl,
    required this.displayName,
    this.rating,
    required this.notifBadge,
    this.compliance,
    required this.onAvatarTap,
    required this.onNotifTap,
    required this.onSettingsTap,
    required this.onGoToSchedule,
  });

  static String _formatDate(DateTime d) {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${weekdays[d.weekday % 7]}, ${d.day} ${months[d.month - 1]} ${d.year}';
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    final resolvedUrl =
        avatarUrl != null ? ApiConfig.normalizeUrl(avatarUrl!) : null;
    final now = DateTime.now();

    return Container(
      width: double.infinity,
      padding: EdgeInsets.only(top: top + 15, left: 24, right: 20, bottom: 22),
      decoration: const BoxDecoration(
        color: DoctorStyles.primary,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row: avatar + name + action icons
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              GestureDetector(
                onTap: onAvatarTap,
                child: Row(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: Colors.white.withValues(alpha: 0.4), width: 2.5),
                      ),
                      child: CircleAvatar(
                        radius: 27,
                        backgroundColor: Colors.white.withValues(alpha: 0.2),
                        backgroundImage:
                            resolvedUrl != null && resolvedUrl.isNotEmpty
                                ? NetworkImage(resolvedUrl)
                                : null,
                        child: resolvedUrl == null || resolvedUrl.isEmpty
                            ? const Icon(Icons.person,
                                color: Colors.white, size: 29)
                            : null,
                      ),
                    ),
                    const SizedBox(width: 15),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          displayName ?? 'Doctor',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text(
                              'Physician',
                              style: TextStyle(fontSize: 15, color: Colors.white70),
                            ),
                            if (rating != null && rating! > 0) ...[
                              const SizedBox(width: 10),
                              const Icon(Icons.star_rounded, size: 17, color: DoctorStyles.amber400),
                              const SizedBox(width: 4),
                              Text(
                                rating!.toStringAsFixed(1),
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white70),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(width: 7),
                  ],
                ),
              ),
              const Spacer(),
              _WhiteIconButton(
                icon: Icons.settings_outlined,
                badge: 0,
                onTap: onSettingsTap,
              ),
              const SizedBox(width: 9),
              _WhiteIconButton(
                icon: Icons.notifications_none_rounded,
                badge: notifBadge,
                onTap: onNotifTap,
              ),
            ],
          ),
          const SizedBox(height: 13),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                _formatDate(now),
                style: TextStyle(fontSize: 16, color: Colors.white.withValues(alpha: 0.75)),
              ),
              const Spacer(),
              if (compliance != null)
                _ComplianceChip(compliance: compliance!, onTap: onGoToSchedule),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Compliance chip in AppBar ────────────────────────────────────────────────
class _ComplianceChip extends StatelessWidget {
  final ComplianceStatus compliance;
  final VoidCallback onTap;
  const _ComplianceChip({required this.compliance, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final status = compliance.status;
    final isOk        = status == 'COMPLIANT' || status == 'EXEMPTED';
    final noSchedule  = (status == 'PENDING' || status == 'IN_PROGRESS')
                        && compliance.scheduledHours == 0;

    // ── Compliant ──────────────────────────────────────────────────────────
    if (isOk) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xEF5ACF6E),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.check_circle_rounded, size: 16, color: Colors.white),
          const SizedBox(width: 6),
          const Text('Schedule compliant',
              style: TextStyle(fontSize: 15, color: Colors.white,
                  fontWeight: FontWeight.w900)),
        ]),
      );
    }

    // ── Chưa có lịch nào ──────────────────────────────────────────────────
    if (noSchedule) {
      return GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.95),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.calendar_today_outlined, size: 16, color: Colors.black87),
            const SizedBox(width: 6),
            const Text('No schedule yet',
                style: TextStyle(fontSize: 15, color: Colors.black,
                    fontWeight: FontWeight.w400)),
            const SizedBox(width: 6),
            const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: Colors.black54),
          ]),
        ),
      );
    }

    // ── Non-compliant ─────────────────────────────────────────────────────
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: const Color(0xFFDA7135),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.warning_amber_rounded, size: 16, color: Colors.white),
          const SizedBox(width: 6),
          const Text('Non-compliant',
              style: TextStyle(fontSize: 15, color: Colors.white,
                  fontWeight: FontWeight.w900)),
          const SizedBox(width: 6),
          const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: Colors.white70),
        ]),
      ),
    );
  }
}

// Icon button màu trắng dùng trên nền primary
class _WhiteIconButton extends StatelessWidget {
  final IconData icon;
  final int badge;
  final VoidCallback onTap;

  const _WhiteIconButton(
      {required this.icon, required this.badge, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.all(7),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Icon(icon, size: 27, color: Colors.white),
            if (badge > 0)
              Positioned(
                right: -6,
                top: -6,
                child: Container(
                  padding: const EdgeInsets.all(3),
                  constraints:
                      const BoxConstraints(minWidth: 19, minHeight: 19),
                  decoration: const BoxDecoration(
                    color: Color(0xFFFF4444),
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    badge > 99 ? '99+' : '$badge',
                    style: const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: Colors.white),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ─── Bottom Navigation ─────────────────────────────────────────────────────────
class _BottomNav extends StatelessWidget {
  final List<_TabItem> tabs;
  final int currentIndex;
  final ValueChanged<int> onTap;

  const _BottomNav({
    required this.tabs,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Container(
      height: 65 + bottomPadding,
      decoration: BoxDecoration(
        color: DoctorStyles.card,
        border: const Border(
            top: BorderSide(color: DoctorStyles.cardBorder, width: 1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Padding(
        padding: EdgeInsets.only(bottom: bottomPadding),
        child: Row(
          children: List.generate(tabs.length, (index) {
            final tab = tabs[index];
            final isActive = currentIndex == index;

            return Expanded(
              child: GestureDetector(
                onTap: () => onTap(index),
                behavior: HitTestBehavior.opaque,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      isActive ? tab.activeIcon : tab.icon,
                      size: 33,
                      color: isActive
                          ? DoctorStyles.primary
                          : DoctorStyles.mutedForeground,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      tab.label,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                        color: isActive
                            ? DoctorStyles.primary
                            : DoctorStyles.mutedForeground,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}
