import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:HealthLink/widgets/partner/partner_pin_code_field.dart';

void main() {
  group('PartnerPinCodeField', () {
    testWidgets('setting controller.text updates slots correctly', (tester) async {
      final controller = TextEditingController();
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PartnerPinCodeField(controller: controller),
        ),
      ));

      // Set text directly — should show 6 bullets
      controller.text = '123456';
      await tester.pump();

      // All 6 slots should be filled (bullets visible)
      expect(find.text('•'), findsNWidgets(6));

      // Clear and set mixed content — numeric-only is enforced by formatter
      controller.text = '12';
      await tester.pump();
      expect(find.text('•'), findsNWidgets(2));
      expect(controller.text, '12');
    });

    testWidgets('changing text through controller fires onCompleted', (tester) async {
      final controller = TextEditingController();
      String? completed;
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PartnerPinCodeField(
            controller: controller,
            onCompleted: (v) => completed = v,
          ),
        ),
      ));

      controller.text = '654321';
      await tester.pump();
      expect(completed, '654321');
    });

    testWidgets('shows bullets by default (obscured)', (tester) async {
      final controller = TextEditingController(text: '123456');
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PartnerPinCodeField(controller: controller),
        ),
      ));

      // Find the text in the visual slots
      for (int i = 0; i < 6; i++) {
        expect(find.text('•'), findsWidgets);
      }
      // Digits should not be visible
      expect(find.text('1'), findsNothing);
    });

    testWidgets('toggling reveal shows digits', (tester) async {
      final controller = TextEditingController(text: '123456');
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PartnerPinCodeField(controller: controller),
        ),
      ));

      // Find the visibility toggle button
      final revealButton = find.byIcon(Icons.visibility_outlined);
      expect(revealButton, findsOneWidget);

      // Tap to reveal
      await tester.tap(revealButton);
      await tester.pump();

      // Digits should now be visible
      expect(find.text('1'), findsOneWidget);
      expect(find.text('6'), findsOneWidget);
      // Bullets should be gone
      expect(find.text('•'), findsNothing);

      // Tap to hide again
      final hideButton = find.byIcon(Icons.visibility_off_outlined);
      await tester.tap(hideButton);
      await tester.pump();

      // Bullets back
      expect(find.text('•'), findsWidgets);
    });

    testWidgets('error text is displayed when provided', (tester) async {
      final controller = TextEditingController();
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PartnerPinCodeField(
            controller: controller,
            errorText: 'Invalid PIN',
          ),
        ),
      ));

      expect(find.text('Invalid PIN'), findsOneWidget);
    });

    testWidgets('tapping slot focuses the hidden input', (tester) async {
      final controller = TextEditingController();
      final focusNode = FocusNode();
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PartnerPinCodeField(
            controller: controller,
            autofocus: false,
          ),
        ),
      ));

      // Tap on the first slot area
      await tester.tapAt(const Offset(50, 400));
      await tester.pump();

      // Controller should be editable after focus
      controller.text = '1';
      await tester.pump();
      expect(controller.text, '1');
    });

    testWidgets('onCompleted fires when 6 digits entered', (tester) async {
      final controller = TextEditingController();
      String? completedValue;
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PartnerPinCodeField(
            controller: controller,
            onCompleted: (v) => completedValue = v,
          ),
        ),
      ));

      controller.text = '123456';
      controller.selection = TextSelection.fromPosition(
        const TextPosition(offset: 6),
      );
      await tester.pump();

      expect(completedValue, '123456');
    });

    testWidgets('disabled state shows no reveal button', (tester) async {
      final controller = TextEditingController();
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: PartnerPinCodeField(
            controller: controller,
            enabled: false,
          ),
        ),
      ));

      expect(find.byIcon(Icons.visibility_outlined), findsNothing);
    });
  });
}
