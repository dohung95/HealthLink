import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:HealthLink/main.dart';
import 'package:HealthLink/providers/video_call_provider.dart';
import 'package:HealthLink/services/video_audio/webrtc_stomp_service.dart';

void main() {
  group('Pharmacy foreground video calls', () {
    setUp(() {
      WebrtcStompService.instance.disconnect();
    });

    test('disconnected pharmacy call does not enter call state', () async {
      final provider = VideoCallProvider();

      final sent = await provider.sendPharmacyCallRequest(
        receiverId: 'patient-1',
        roomId: 'room-1',
        myId: 'pharmacy-user-1',
        myName: 'Central Pharmacy',
      );

      expect(sent, isFalse);
      expect(provider.isInCall, isFalse);
      expect(provider.currentRoomId, isNull);
    });

    test('service reports disconnected sends without publishing', () async {
      final service = WebrtcStompService.instance;

      expect(service.connectionState, WebrtcConnectionState.disconnected);
      expect(
        await service.sendWebRTCSignal(const {
          'type': 'CALL_REQUEST',
          'receiverId': 'patient-1',
        }),
        isFalse,
      );
    });

    testWidgets('incoming pharmacy call shows pharmacy caller identity', (
      tester,
    ) async {
      final provider = VideoCallProvider();
      await tester.pumpWidget(
        MaterialApp(
          navigatorKey: navigatorKey,
          home: ChangeNotifierProvider<VideoCallProvider>.value(
            value: provider,
            child: const Scaffold(body: SizedBox.shrink()),
          ),
        ),
      );

      WebrtcStompService.instance.onWebRTCSignalReceived!({
        'type': 'CALL_REQUEST',
        'senderId': 'pharmacy-user-1',
        'senderName': 'Central Pharmacy',
        'senderRole': 'PHARMACY',
        'receiverId': 'patient-1',
        'data': 'room-1',
      });
      await tester.pump();

      expect(find.textContaining('Central Pharmacy'), findsOneWidget);
      expect(find.textContaining('(Pharmacy)'), findsOneWidget);

      await tester.tap(find.text('Decline'));
      await tester.pump();
    });
  });
}
