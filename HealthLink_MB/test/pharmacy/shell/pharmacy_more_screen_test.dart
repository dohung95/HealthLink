import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/screens/pharmacy/pharmacy_more_screen.dart';

class _MockAuth extends AuthProvider {
  @override
  bool get isPharmacy => true;
  @override
  String? get accessToken => 'mock-token';
  @override
  String? get userId => 'pharm-1';
  @override
  Map<String, dynamic>? get pharmacyProfile =>
      {'pharmacyId': 'pharm-1', 'name': 'Test Pharmacy'};
}

Widget _buildTestApp() {
  return MaterialApp(
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(
          value: _MockAuth(),
        ),
      ],
      child: const Scaffold(body: PharmacyMoreScreen()),
    ),
  );
}

void main() {
  group('PharmacyMoreScreen', () {
    testWidgets('renders wallet, profile, security, and logout', (
      tester,
    ) async {
      await tester.pumpWidget(_buildTestApp());

      expect(find.text('Wallet'), findsOneWidget);
      expect(find.text('Profile'), findsOneWidget);
      expect(find.text('Security'), findsOneWidget);
      expect(find.text('Logout'), findsOneWidget);
    });

    testWidgets('does not contain chat entry', (tester) async {
      await tester.pumpWidget(_buildTestApp());

      // No Chat tile
      expect(find.text('Chat'), findsNothing);
      // No chat_bubble_outline icon
      expect(find.byIcon(Icons.chat_bubble_outline), findsNothing);
    });

    testWidgets('does not contain Support section', (tester) async {
      await tester.pumpWidget(_buildTestApp());

      expect(find.text('Support'), findsNothing);
    });
  });
}
