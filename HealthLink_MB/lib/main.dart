import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/themes.dart';
import 'providers/auth_provider.dart';
import 'screens/welcome_screen.dart';
import 'screens/patient_home_screen.dart';

Future<void> main() async {
  // Đảm bảo Flutter binding sẵn sàng trước khi gọi SharedPreferences
  WidgetsFlutterBinding.ensureInitialized();

  // Tạo AuthProvider và load session đã lưu trước đó
  final authProvider = AuthProvider();
  await authProvider.loadSavedSession();

  runApp(
    ChangeNotifierProvider<AuthProvider>.value(
      value: authProvider,
      child: const HealthLinkApp(),
    ),
  );
}

class HealthLinkApp extends StatelessWidget {
  const HealthLinkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HealthLink',
      debugShowCheckedModeBanner: false,
      theme: HealthLinkTheme.lightTheme,
      darkTheme: HealthLinkTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: const _RootRouter(),
    );
  }
}

/// Widget quyết định màn hình khởi động dựa theo auth state.
///
/// Logic:
/// - [AuthStatus.authenticated] → PatientHomeScreen (đã có token hợp lệ)
/// - Còn lại (initial, unauthenticated, error) → WelcomeScreen
///
/// Lắng nghe [AuthProvider] để tự động điều hướng khi trạng thái thay đổi
/// (ví dụ: đăng nhập thành công từ WelcomeScreen, hoặc token hết hạn).
class _RootRouter extends StatelessWidget {
  const _RootRouter();

  @override
  Widget build(BuildContext context) {
    return Selector<AuthProvider, AuthStatus>(
      // Chỉ rebuild khi status thay đổi, tránh re-render không cần thiết
      selector: (_, auth) => auth.status,
      builder: (_, status, __) {
        if (status == AuthStatus.authenticated) {
          return const PatientHomeScreen();
        }
        return const WelcomeScreen();
      },
    );
  }
}