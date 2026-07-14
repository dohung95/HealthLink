import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:HealthLink/l10n/app_localizations.dart';
import 'package:HealthLink/models/chat/conversation.dart';
import 'package:HealthLink/models/chat/message.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_work_item.dart';
import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/providers/chat/chat_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_workflow_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_request_provider.dart';
import 'package:HealthLink/screens/chat/chat_room_screen.dart';
import 'package:HealthLink/screens/pharmacy/pharmacy_request_detail_screen.dart';
import 'package:HealthLink/services/pharmacy/pharmacy_request_service.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

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

class _NoopWorkflow extends PharmacyWorkflowProvider {
  @override
  void startPolling(String token, String pharmacyId) {}
  @override
  void stopPolling() {}
}

class _WorkflowWithItems extends PharmacyWorkflowProvider {
  _WorkflowWithItems(this.items);
  final List<PharmacyWorkItem> items;

  @override
  List<PharmacyWorkItem> get workItems => items;
}

PharmacyWorkItem _consultationWorkItem({
  int requestId = 1,
  List<String> availableActions = const ['CHAT'],
  String? chatRoomId = 'room-1',
}) {
  return PharmacyWorkItem(
    id: 'wi-$requestId',
    pharmacyId: 'pharm-1',
    sourceId: requestId,
    sourceType: WorkItemSourceType.consultation,
    workflowStage: 'REVIEW',
    availableActions: availableActions,
    patientId: 'pat-1',
    patientName: 'Patient 1',
    requestId: requestId,
    requestType: 'CONSULTATION',
    chatRoomId: chatRoomId,
    createdAt: DateTime.now(),
  );
}

PharmacyWorkItem _revisionWorkItem({
  int requestId = 1,
  int orderId = 99,
  List<String> availableActions = const ['CHAT', 'UPDATE_QUOTE'],
}) {
  return PharmacyWorkItem(
    id: 'wi-r$requestId',
    pharmacyId: 'pharm-1',
    sourceId: requestId,
    sourceType: WorkItemSourceType.revision,
    workflowStage: 'REVISION_REQUESTED',
    availableActions: availableActions,
    patientId: 'pat-1',
    patientName: 'Patient 1',
    requestId: requestId,
    orderId: orderId,
    requestType: 'CONSULTATION',
    chatRoomId: 'room-1',
    createdAt: DateTime.now(),
  );
}

Widget _buildTestApp({
  required PharmacyRequestProvider requestProvider,
  PharmacyWorkflowProvider? workflowProvider,
  PharmacyWorkItem? workItem,
}) {
  return MaterialApp(
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(
          value: _MockAuth(),
        ),
        ChangeNotifierProvider<PharmacyWorkflowProvider>.value(
          value: workflowProvider ?? _NoopWorkflow(),
        ),
        ChangeNotifierProvider<PharmacyRequestProvider>.value(
          value: requestProvider,
        ),
      ],
      child: PharmacyRequestDetailScreen(
        requestId: '1',
        workItem: workItem,
      ),
    ),
  );
}

// ── ChatRoomScreen helpers ─────────────────────────────────────────────

class _PharmacyMockAuth extends AuthProvider {
  @override
  String? get accessToken => 'mock-token';
  @override
  String? get userId => 'pharm-1';
  @override
  bool get isPharmacy => true;
  @override
  bool get isPatient => false;
  @override
  bool get isDoctor => false;
}

class _DoctorMockAuth extends AuthProvider {
  @override
  String? get accessToken => 'mock-token';
  @override
  String? get userId => 'doc-1';
  @override
  bool get isDoctor => true;
  @override
  bool get isPatient => false;
  @override
  bool get isPharmacy => false;
}

class _GenericMockAuth extends AuthProvider {
  @override
  String? get accessToken => 'mock-token';
  @override
  String? get userId => 'user-1';
}

class _EmptyChatProvider extends ChatProvider {
  @override
  List<Message> get messages => [];
  @override
  bool get isLoadingMessages => false;
  @override
  String? get messagesError => null;
}

Conversation _pharmacyConversation() => Conversation(
      id: 'pharm-room-1',
      partnerId: 'pat-1',
      partnerName: 'Patient 1',
      appointmentId: null,
      lastMessage: 'Hello',
      lastMessageTime: DateTime.now(),
    );

Conversation _doctorAppointmentConversation() => Conversation(
      id: 'doc-room-1',
      partnerId: 'pat-1',
      partnerName: 'Patient 1',
      appointmentId: 1,
      appointmentStatus: 'SCHEDULED',
      lastMessage: 'Hello',
      lastMessageTime: DateTime.now(),
    );

Conversation _genericConversation() => Conversation(
      id: 'room-1',
      partnerId: 'pat-1',
      partnerName: 'Test Patient',
      lastMessage: 'Hello',
      lastMessageTime: DateTime.now(),
    );

Widget _buildChatTestApp({
  required ChatRoomScreen screen,
  required AuthProvider auth,
}) {
  return MaterialApp(
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: auth),
        ChangeNotifierProvider<ChatProvider>.value(
          value: _EmptyChatProvider(),
        ),
      ],
      child: screen,
    ),
  );
}

void main() {
  group('PharmacyRequestDetailScreen — chat visibility', () {
    testWidgets('IN_REVIEW status shows Chat button', (tester) async {
      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(
          client: MockClient((request) async {
            if (request.url.toString().contains('chat-room')) {
              return http.Response('{"chatRoomId":"room-1"}', 404);
            }
            return http.Response(
              '{"requestId":1,"patientId":"pat-1","patientName":"Patient 1",'
              '"status":"IN_REVIEW","pharmacyId":"pharm-1",'
              '"requestType":"CONSULTATION",'
              '"chatRoomId":"room-1",'
              '"createdAt":"2026-07-13T10:00:00"}',
              200,
            );
          }),
        ),
      );

      // Set current request to IN_REVIEW
      provider.clearCurrentRequest();
      // Manually set via internal path
      await provider.fetchRequestDetail('mock-token', '1');
      await tester.pumpWidget(_buildTestApp(
        requestProvider: provider,
        workItem: _consultationWorkItem(),
      ));
      await tester.pump();

      expect(find.text('Chat'), findsOneWidget);
      expect(find.text('Create Order'), findsOneWidget);
    });

    testWidgets('IN_REVIEW consultation without a chat room hides Chat',
        (tester) async {
      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(
          client: MockClient((request) async => http.Response(
                '{"requestId":1,"patientId":"pat-1","patientName":"Patient 1",'
                '"status":"IN_REVIEW","pharmacyId":"pharm-1",'
                '"requestType":"CONSULTATION",'
                '"createdAt":"2026-07-13T10:00:00"}',
                200,
              )),
        ),
      );

      await provider.fetchRequestDetail('mock-token', '1');
      await tester.pumpWidget(_buildTestApp(requestProvider: provider));
      await tester.pump();

      expect(find.text('Chat'), findsNothing);
      expect(find.text('Create Order'), findsOneWidget);
    });

    testWidgets('IN_REVIEW order request does not show Chat button', (tester) async {
      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(
          client: MockClient((request) async => http.Response(
                '{"requestId":1,"patientId":"pat-1","patientName":"Patient 1",'
                '"status":"IN_REVIEW","requestType":"ORDER_REQUEST",'
                '"pharmacyId":"pharm-1","createdAt":"2026-07-13T10:00:00"}',
                200,
              )),
        ),
      );

      await provider.fetchRequestDetail('mock-token', '1');
      await tester.pumpWidget(_buildTestApp(requestProvider: provider));
      await tester.pump();

      expect(find.text('Chat'), findsNothing);
    });

    testWidgets('PENDING status does not show Chat button', (tester) async {
      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(
          client: MockClient((request) async {
            return http.Response(
              '{"requestId":1,"patientId":"pat-1","patientName":"Patient 1",'
              '"status":"PENDING","pharmacyId":"pharm-1",'
              '"createdAt":"2026-07-13T10:00:00"}',
              200,
            );
          }),
        ),
      );

      await provider.fetchRequestDetail('mock-token', '1');
      await tester.pumpWidget(_buildTestApp(requestProvider: provider));
      await tester.pump();

      expect(find.text('Chat'), findsNothing);
      expect(find.text('Reject'), findsOneWidget);
      expect(find.text('Accept'), findsOneWidget);
    });

    testWidgets('ORDER_CREATED status does not show Chat button', (
      tester,
    ) async {
      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(
          client: MockClient((request) async {
            return http.Response(
              '{"requestId":1,"patientId":"pat-1","patientName":"Patient 1",'
              '"status":"ORDER_CREATED","pharmacyId":"pharm-1",'
              '"pharmacyOrderId":42,'
              '"createdAt":"2026-07-13T10:00:00"}',
              200,
            );
          }),
        ),
      );

      await provider.fetchRequestDetail('mock-token', '1');
      await tester.pumpWidget(_buildTestApp(requestProvider: provider));
      await tester.pump();

      expect(find.text('Chat'), findsNothing);
      expect(find.text('View Order'), findsOneWidget);
    });

    testWidgets('CANCELLED status does not show Chat button', (tester) async {
      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(
          client: MockClient((request) async {
            return http.Response(
              '{"requestId":1,"patientId":"pat-1","patientName":"Patient 1",'
              '"status":"CANCELLED","pharmacyId":"pharm-1",'
              '"createdAt":"2026-07-13T10:00:00"}',
              200,
            );
          }),
        ),
      );

      await provider.fetchRequestDetail('mock-token', '1');
      await tester.pumpWidget(_buildTestApp(requestProvider: provider));
      await tester.pump();

      expect(find.text('Chat'), findsNothing);
    });

    testWidgets('SnackBar shown when chat room not available', (tester) async {
      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(
          client: MockClient((request) async {
            if (request.url.toString().contains('chat-room')) {
              return http.Response('Not Found', 404);
            }
            return http.Response(
              '{"requestId":1,"patientId":"pat-1","patientName":"Patient 1",'
              '"status":"IN_REVIEW","pharmacyId":"pharm-1",'
              '"requestType":"CONSULTATION",'
              '"chatRoomId":"room-1",'
              '"createdAt":"2026-07-13T10:00:00"}',
              200,
            );
          }),
        ),
      );

      await provider.fetchRequestDetail('mock-token', '1');
      await tester.pumpWidget(_buildTestApp(
        requestProvider: provider,
        workItem: _consultationWorkItem(),
      ));
      await tester.pump();

      // Tap Chat button
      await tester.tap(find.text('Chat'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      expect(find.text('Exception: Failed to load chat room (404)'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('revision shows Chat and Update Quote', (tester) async {
      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(
          client: MockClient((request) async {
            if (request.url.toString().contains('chat-room')) {
              return http.Response('{"chatRoomId":"room-1"}', 404);
            }
            return http.Response(
              '{"requestId":1,"patientId":"pat-1","patientName":"Patient 1",'
              '"status":"IN_REVIEW","pharmacyId":"pharm-1",'
              '"requestType":"CONSULTATION",'
              '"pharmacyOrderId":99,'
              '"chatRoomId":"room-1",'
              '"createdAt":"2026-07-13T10:00:00"}',
              200,
            );
          }),
        ),
      );

      await provider.fetchRequestDetail('mock-token', '1');
      await tester.pumpWidget(_buildTestApp(
        requestProvider: provider,
        workItem: _revisionWorkItem(),
      ));
      await tester.pump();

      expect(find.text('Chat'), findsOneWidget);
      expect(find.text('Update Quote'), findsOneWidget);
      expect(find.text('Create Order'), findsNothing);
      expect(find.text('Video Call'), findsNothing);
    });

    testWidgets('work item without CHAT does not show Chat', (tester) async {
      final provider = PharmacyRequestProvider(
        requestService: PharmacyRequestService(
          client: MockClient((request) async => http.Response(
                '{"requestId":1,"patientId":"pat-1","patientName":"Patient 1",'
                '"status":"IN_REVIEW","pharmacyId":"pharm-1",'
                '"requestType":"CONSULTATION",'
                '"chatRoomId":"room-1",'
                '"createdAt":"2026-07-13T10:00:00"}',
                200,
              )),
        ),
      );

      await provider.fetchRequestDetail('mock-token', '1');
      await tester.pumpWidget(_buildTestApp(
        requestProvider: provider,
        workItem: _consultationWorkItem(
          availableActions: ['CREATE_ORDER'],
        ),
      ));
      await tester.pump();

      expect(find.text('Chat'), findsNothing);
      expect(find.text('Create Order'), findsOneWidget);
    });
  });

  group('ChatRoomScreen — pharmacy chat (no appointment)', () {
    testWidgets('shows composer for pharmacy conversation', (tester) async {
      await tester.pumpWidget(_buildChatTestApp(
        auth: _PharmacyMockAuth(),
        screen: ChatRoomScreen(
          conversation: _pharmacyConversation(),
          readOnly: false,
        ),
      ));
      await tester.pump();

      expect(find.byKey(const Key('chat-message-input')), findsOneWidget);
    });

    testWidgets('does not show doctor vitals wait message', (tester) async {
      await tester.pumpWidget(_buildChatTestApp(
        auth: _PharmacyMockAuth(),
        screen: ChatRoomScreen(
          conversation: _pharmacyConversation(),
          readOnly: false,
        ),
      ));
      await tester.pump();

      expect(
        find.text('Waiting for patient to fill medical information...'),
        findsNothing,
      );
    });
  });

  group('ChatRoomScreen — doctor appointment without vitals', () {
    testWidgets('shows vitals wait message for doctor', (tester) async {
      await tester.pumpWidget(_buildChatTestApp(
        auth: _DoctorMockAuth(),
        screen: ChatRoomScreen(
          conversation: _doctorAppointmentConversation(),
          readOnly: false,
        ),
      ));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(
        find.text('Waiting for patient to fill medical information...'),
        findsWidgets,
      );
    });
  });

  group('ChatRoomScreen — read-only mode', () {
    testWidgets('shows banner and suppresses composer', (tester) async {
      await tester.pumpWidget(_buildChatTestApp(
        auth: _GenericMockAuth(),
        screen: ChatRoomScreen(
          conversation: _genericConversation(),
          readOnly: true,
        ),
      ));
      await tester.pump();

      expect(
        find.text('This request has ended. Messages are view-only.'),
        findsOneWidget,
      );
      expect(find.byKey(const Key('chat-message-input')), findsNothing);
      expect(find.byKey(const Key('chat-send-button')), findsNothing);
      expect(find.byKey(const Key('chat-video-call-button')), findsNothing);
    });
  });
}
