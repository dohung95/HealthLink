// This is a basic Flutter widget test for HealthLink.
import 'dart:ui';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:HealthLink/main.dart';
import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/providers/chat/chat_provider.dart';

void main() {
  testWidgets('HealthLink smoke test', (WidgetTester tester) async {
    // Set a larger surface size to avoid overflow issues in test environment (default is 800x600)
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;

    // Reset surface size after test
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    // Build our app and trigger a frame.
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>(create: (_) => AuthProvider()),
          ChangeNotifierProvider<ChatProvider>(create: (_) => ChatProvider()),
        ],
        child: const HealthLinkApp(),
      ),
    );

    // Verify that our welcome screen is shown
    expect(find.text('Your health journey starts here'), findsOneWidget);
    expect(find.text('Get Started'), findsOneWidget);

    // Tap the 'Get Started' button and trigger a frame.
    await tester.tap(find.text('Get Started'));
    await tester.pumpAndSettle();

    // Verify that we are navigated to the RegisterScreen
    expect(find.text('Create Account'), findsOneWidget);
  });
}
