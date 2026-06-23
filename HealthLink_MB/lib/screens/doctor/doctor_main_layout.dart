import 'package:flutter/material.dart';
import '../../config/doctor_theme.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/chat/chat_provider.dart';
import '../../providers/video_call_provider.dart';
import '../../services/video_audio/webrtc_stomp_service.dart';

import 'doctor_home_screen.dart';
import 'doctor_appointments_screen.dart';
import 'doctor_patients_screen.dart';
import 'doctor_profile_screen.dart';
import '../chat/chat_list_screen.dart' show MessagesScreen;

class DoctorMainLayout extends StatefulWidget {
  const DoctorMainLayout({super.key});

  @override
  State<DoctorMainLayout> createState() => _DoctorMainLayoutState();
}

class _DoctorMainLayoutState extends State<DoctorMainLayout> {
  int _currentIndex = 0;
  int _chatBadge = 0;

  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      DoctorHomeScreen(onViewAllAppointments: () => setState(() => _currentIndex = 1)),
      const DoctorAppointmentsScreen(),
      const DoctorPatientsScreen(),
      const MessagesScreen(),
      const DoctorProfileScreen(),
    ];

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      if (auth.isAuthenticated && auth.accessToken != null && auth.userId != null) {
        context.read<ChatProvider>().loadConversations(auth.accessToken!, auth.userId!);
        context.read<VideoCallProvider>().updateUserId(auth.userId);
        WebrtcStompService.instance.connect(auth.accessToken!, auth.userId!);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _screens),
      bottomNavigationBar: _BottomNav(
        currentIndex: _currentIndex,
        chatBadge: _chatBadge,
        onTap: (index) => setState(() => _currentIndex = index),
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  final int currentIndex;
  final int chatBadge;
  final ValueChanged<int> onTap;

  const _BottomNav({required this.currentIndex, required this.chatBadge, required this.onTap});

  static const _tabs = [
    _TabItem(icon: Icons.home_outlined, activeIcon: Icons.home, label: 'Home'),
    _TabItem(icon: Icons.calendar_today_outlined, activeIcon: Icons.calendar_today, label: 'Appointments'),
    _TabItem(icon: Icons.people_outline, activeIcon: Icons.people, label: 'Patients'),
    _TabItem(icon: Icons.chat_bubble_outline, activeIcon: Icons.chat_bubble, label: 'Chat'),
    _TabItem(icon: Icons.person_outline, activeIcon: Icons.person, label: 'Profile'),
  ];

  String _badgeCount(int count) => count > 99 ? '99+' : '$count';

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Container(
      decoration: BoxDecoration(
        color: DS.card.withOpacity(0.95),
        border: const Border(top: BorderSide(color: DS.cardBorder)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.only(left: 8, right: 8, top: 8, bottom: bottomPadding > 0 ? 0 : 8),
          child: Row(
            children: List.generate(_tabs.length, (index) {
              final tab = _tabs[index];
              final isActive = currentIndex == index;
              final showBadge = index == 3 && chatBadge > 0;

              return Expanded(
                child: GestureDetector(
                  onTap: () => onTap(index),
                  behavior: HitTestBehavior.opaque,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Icon(isActive ? tab.activeIcon : tab.icon, size: 24, color: isActive ? DS.primary : DS.mutedForeground),
                            if (showBadge)
                              Positioned(
                                right: -8,
                                top: -6,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                  constraints: const BoxConstraints(minWidth: 16),
                                  decoration: BoxDecoration(color: DS.destructive, borderRadius: BorderRadius.circular(10)),
                                  child: Text(_badgeCount(chatBadge), style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white), textAlign: TextAlign.center),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(tab.label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: isActive ? DS.primary : DS.mutedForeground)),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _TabItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;

  const _TabItem({required this.icon, required this.activeIcon, required this.label});
}
