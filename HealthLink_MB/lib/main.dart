import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/themes.dart';
import 'providers/auth_provider.dart';
import 'providers/chat/chat_provider.dart';
import 'providers/chat/chatbot_provider.dart';
import 'providers/video_call_provider.dart';
import 'providers/theme_provider.dart';
import 'screens/welcome_screen.dart';
import 'screens/patient/patient_main_layout.dart';
import 'screens/doctor/doctor_main_layout.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
  // Đảm bảo Flutter binding sẵn sàng trước khi gọi SharedPreferences
  WidgetsFlutterBinding.ensureInitialized();

  // Tạo AuthProvider và load session đã lưu trước đó
  final authProvider = AuthProvider();
  await authProvider.loadSavedSession();
  
  final themeProvider = ThemeProvider();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
        ChangeNotifierProvider<ThemeProvider>.value(value: themeProvider),
        ChangeNotifierProvider<ChatProvider>(create: (_) => ChatProvider()),
        ChangeNotifierProvider<ChatbotProvider>(create: (_) => ChatbotProvider()),
        ChangeNotifierProvider<VideoCallProvider>(create: (_) => VideoCallProvider()),
      ],
      child: const HealthLinkApp(),
    ),
  );
}

class HealthLinkApp extends StatelessWidget {
  const HealthLinkApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    
    return MaterialApp(
      title: 'HealthLink',
      debugShowCheckedModeBanner: false,
      theme: HealthLinkTheme.lightTheme,
      darkTheme: HealthLinkTheme.darkTheme,
      themeMode: themeProvider.themeMode,
      navigatorKey: navigatorKey,
      home: const _RootRouter(),
    );
  }
}

/// Widget quyết định màn hình khởi động dựa theo auth state và role.
///
/// Logic:
/// - [AuthStatus.authenticated] + role DOCTOR → DoctorMainLayout
/// - [AuthStatus.authenticated] + role khác → MainLayout (Patient)
/// - Còn lại (initial, unauthenticated, error) → WelcomeScreen
///
/// Lắng nghe [AuthProvider] để tự động điều hướng khi trạng thái thay đổi
/// (ví dụ: đăng nhập thành công từ WelcomeScreen, hoặc token hết hạn).
class _RootRouter extends StatelessWidget {
  const _RootRouter();

  @override
  Widget build(BuildContext context) {
    return Selector<AuthProvider, (AuthStatus, List<String>)>(
      // Rebuild khi status hoặc roles thay đổi
      selector: (_, auth) => (auth.status, auth.roles),
      builder: (_, data, __) {
        final (status, roles) = data;

        if (status == AuthStatus.authenticated) {
          // Phân luồng theo role DOCTOR
          if (roles.contains('DOCTOR')) {
            return const DoctorMainLayout();
          }

          // Phân luồng theo role PHARMACY
          // if (roles.contains('PHARMACY')) {
          //   return const DoctorMainLayout();
          // }

          // Mặc định: Patient layout
          return const PatientMainLayout();
        }
        return const WelcomeScreen();
      },
    );
  }
}