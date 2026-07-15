import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/themes.dart';
import 'providers/auth_provider.dart';
import 'providers/chat/chat_provider.dart';
import 'providers/chat/chatbot_provider.dart';
import 'providers/video_call_provider.dart';
import 'providers/theme_provider.dart';
import 'providers/pharmacy/pharmacy_order_provider.dart';
import 'providers/pharmacy/pharmacy_request_provider.dart';
import 'providers/pharmacy/pharmacy_inventory_provider.dart';
import 'providers/pharmacy/pharmacy_revenue_provider.dart';
import 'providers/pharmacy/pharmacy_workflow_provider.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'l10n/app_localizations.dart';
import 'providers/locale_provider.dart';
import 'screens/welcome_screen.dart';
import 'screens/patient/patient_main_layout.dart';
import 'screens/doctor/doctor_main_layout.dart';
import 'screens/pharmacy/pharmacy_main_layout.dart';

import 'package:flutter_dotenv/flutter_dotenv.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");

  final authProvider = AuthProvider();
  final themeProvider = ThemeProvider();
  final localeProvider = LocaleProvider();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(
          value: authProvider,
        ),
        ChangeNotifierProvider<ThemeProvider>.value(
          value: themeProvider,
        ),
        ChangeNotifierProvider<LocaleProvider>.value(
          value: localeProvider,
        ),
        ChangeNotifierProvider<ChatProvider>(
          create: (_) => ChatProvider(),
        ),
        ChangeNotifierProvider<ChatbotProvider>(
          create: (_) => ChatbotProvider(),
        ),
        ChangeNotifierProvider<VideoCallProvider>(
          create: (_) => VideoCallProvider(),
          lazy: false,
        ),
        ChangeNotifierProvider<PharmacyOrderProvider>(
          create: (_) => PharmacyOrderProvider(),
        ),
        ChangeNotifierProvider<PharmacyRequestProvider>(
          create: (_) => PharmacyRequestProvider(),
        ),
        ChangeNotifierProvider<PharmacyInventoryProvider>(
          create: (_) => PharmacyInventoryProvider(),
        ),
        ChangeNotifierProvider<PharmacyRevenueProvider>(
          create: (_) => PharmacyRevenueProvider(),
        ),
        ChangeNotifierProvider<PharmacyWorkflowProvider>(
          create: (_) => PharmacyWorkflowProvider(),
        ),
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
    final localeProvider = context.watch<LocaleProvider>();
    
    return GestureDetector(
      onTap: () {
        FocusManager.instance.primaryFocus?.unfocus();
      },
      child: MaterialApp(
        title: 'HealthLink',
        debugShowCheckedModeBanner: false,
        theme: HealthLinkTheme.lightTheme,
        darkTheme: HealthLinkTheme.darkTheme,
        themeMode: themeProvider.themeMode,
        locale: localeProvider.locale,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        navigatorKey: navigatorKey,
        home: const _RootRouter(),
      ),
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
class _RootRouter extends StatefulWidget {
  const _RootRouter();

  @override
  State<_RootRouter> createState() => _RootRouterState();
}

class _RootRouterState extends State<_RootRouter> {
  bool _sessionLoadingStarted = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    if (_sessionLoadingStarted) return;

    _sessionLoadingStarted = true;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;

      context.read<AuthProvider>().loadSavedSession();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Selector<AuthProvider, (AuthStatus, List<String>)>(
      selector: (_, auth) => (auth.status, auth.roles),
      builder: (_, data, __) {
        final (status, roles) = data;

        if (status == AuthStatus.initial ||
            status == AuthStatus.loading) {
          return const _StartupLoadingScreen();
        }

        if (status == AuthStatus.authenticated) {
          // Phân luồng theo role DOCTOR
          if (roles.contains('DOCTOR')) {
            return const DoctorMainLayout();
          }

          // Phân luồng theo role PHARMACY
          if (roles.contains('PHARMACY')) {
            return const PharmacyMainLayout();
          }

          // Mặc định: Patient layout
          return const PatientMainLayout();
        }

        return const WelcomeScreen();
      },
    );
  }
}

class _StartupLoadingScreen extends StatelessWidget {
  const _StartupLoadingScreen();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colors.surface,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              'assets/images/logo.png',
              width: 130,
              height: 130,
              fit: BoxFit.contain,
            ),
            const SizedBox(height: 24),
            CircularProgressIndicator(
              color: colors.primary,
            ),
            const SizedBox(height: 16),
            Text(
              'Starting HealthLink...',
              style: TextStyle(
                color: colors.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}