import 'package:HealthLink/screens/patient/patient_prescriptions_screen.dart';
import 'package:flutter/material.dart';
import '../../widgets/tab_menu/tab_menu.dart';
import 'patient_home_screen.dart';
import '../chat/chat_list_screen.dart';
import '../../widgets/tab_menu/patient_drawer.dart';
import 'booking/booking_screen.dart';
import 'appointments/appointment_screen.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/chat/chat_provider.dart';
import '../../providers/video_call_provider.dart';
import '../../services/video_audio/webrtc_stomp_service.dart';

class PatientMainLayout extends StatefulWidget {
  const PatientMainLayout({super.key});

  @override
  State<PatientMainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<PatientMainLayout> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    // Khởi tạo tab mặc định là "Home" bằng cách tìm index của label "Home"
    _currentIndex = TabMenu.defaultItems.indexWhere((item) => item.label == 'Home');
    if (_currentIndex == -1) _currentIndex = 0; // Fallback
    
    // Connect STOMP for WebRTC/Chat incoming signals globally
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      if (auth.isAuthenticated && auth.accessToken != null && auth.userId != null) {
        context.read<ChatProvider>().loadConversations(auth.accessToken!, auth.userId!);
        context.read<VideoCallProvider>().updateUserId(auth.userId);
        WebrtcStompService.instance.connect(auth.accessToken!, auth.userId!);
      }
    });
  }

  void _onTabChanged(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  void _openAppointmentsTab() {
    final appointmentIndex = TabMenu.defaultItems.indexWhere(
          (item) => item.label == 'Appointments',
    );

    if (appointmentIndex != -1) {
      _onTabChanged(appointmentIndex);
    }
  }

  /// Ánh xạ Label của Tab sang màn hình tương ứng
  Widget _getScreenForLabel(String label) {
    switch (label) {
      case 'Home':
        return PatientHomeScreen(
          onOpenAppointments: _openAppointmentsTab,
        );

      case 'Chat':
        return const MessagesScreen();

      case 'prescription':
        return const PrescriptionsScreen();

      case 'Booking':
        return const BookingScreen();

      case 'Appointments':
        return AppointmentScreen(
          onBookNew: () {
            final bookingIndex = TabMenu.defaultItems.indexWhere(
                  (item) => item.label == 'Booking',
            );

            if (bookingIndex != -1) {
              _onTabChanged(bookingIndex);
            }
          },
        );

      default:
        return Scaffold(
          body: Center(
            child: Text(
              'The $label feature is under development...',
              style: const TextStyle(fontSize: 18, color: Colors.grey),
            ),
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isDesktop = MediaQuery.of(context).size.width >= 768;

    final currentLabel = TabMenu.defaultItems[_currentIndex].label;
    final bodyContent = _getScreenForLabel(currentLabel);

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      drawer: const PatientDrawer(),
      body: Row(
        children: [
          if (isDesktop)
            DesktopTabMenu(
              currentIndex: _currentIndex,
              onTabChanged: _onTabChanged,
            ),
          Expanded(child: bodyContent),
        ],
      ),
      bottomNavigationBar: isDesktop
          ? null
          : MobileTabMenu(
        currentIndex: _currentIndex,
        onTabChanged: _onTabChanged,
      ),
    );
  }
}
