import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:HealthLink/l10n/app_localizations.dart';
import 'package:HealthLink/models/chat/conversation.dart';
import 'package:HealthLink/models/chat/message.dart';
import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/providers/chat/chat_provider.dart';
import 'package:HealthLink/screens/chat/chat_room_screen.dart';

class _MockAuthProvider extends AuthProvider {
  @override
  String? get accessToken => null;
  @override
  String? get userId => null;
  @override
  bool get isPatient => false;
}

class _EmptyChatProvider extends ChatProvider {
  @override
  List<Message> get messages => [];

  @override
  bool get isLoadingMessages => false;

  @override
  String? get messagesError => null;
}

Conversation _testConversation() => Conversation(
      id: 'room-1',
      partnerId: 'pat-1',
      partnerName: 'Test Patient',
      lastMessage: 'Hello',
      lastMessageTime: DateTime.now(),
    );

Widget _buildTestApp({
  required ChatRoomScreen screen,
}) {
  return MaterialApp(
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(
          value: _MockAuthProvider(),
        ),
        ChangeNotifierProvider<ChatProvider>.value(
          value: _EmptyChatProvider(),
        ),
      ],
      child: screen,
    ),
  );
}

void main() {
  group('ChatRoomScreen — read-only mode', () {
    testWidgets('shows supplied title in header', (tester) async {
      await tester.pumpWidget(_buildTestApp(
        screen: ChatRoomScreen(
          conversation: _testConversation(),
          readOnly: true,
          title: 'Chat history',
        ),
      ));

      expect(find.text('Chat history'), findsOneWidget);
    });

    testWidgets('shows read-only banner message', (tester) async {
      await tester.pumpWidget(_buildTestApp(
        screen: ChatRoomScreen(
          conversation: _testConversation(),
          readOnly: true,
          readOnlyMessage: 'This request has ended. Messages are view-only.',
        ),
      ));

      expect(
        find.text('This request has ended. Messages are view-only.'),
        findsOneWidget,
      );
    });

    testWidgets('suppresses message input', (tester) async {
      await tester.pumpWidget(_buildTestApp(
        screen: ChatRoomScreen(
          conversation: _testConversation(),
          readOnly: true,
        ),
      ));

      expect(find.byKey(const Key('chat-message-input')), findsNothing);
    });

    testWidgets('suppresses send button', (tester) async {
      await tester.pumpWidget(_buildTestApp(
        screen: ChatRoomScreen(
          conversation: _testConversation(),
          readOnly: true,
        ),
      ));

      expect(find.byKey(const Key('chat-send-button')), findsNothing);
    });

    testWidgets('suppresses video call button', (tester) async {
      await tester.pumpWidget(_buildTestApp(
        screen: ChatRoomScreen(
          conversation: _testConversation(),
          readOnly: true,
        ),
      ));

      expect(find.byKey(const Key('chat-video-call-button')), findsNothing);
    });

    testWidgets('readOnly: false shows video call button (control)', (tester) async {
      await tester.pumpWidget(_buildTestApp(
        screen: ChatRoomScreen(
          conversation: _testConversation(),
          readOnly: false,
        ),
      ));

      // Video call button should be present in non-read-only mode
      expect(find.byKey(const Key('chat-video-call-button')), findsOneWidget);
    });
  });
}
