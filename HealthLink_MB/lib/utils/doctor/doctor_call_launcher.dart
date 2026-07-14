import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/doctor/doctor_appointment.dart';
import '../../providers/auth_provider.dart';
import '../../providers/video_call_provider.dart';
import '../../screens/chat/chat_room_screen.dart';
import '../../screens/video_audio/video_call_screen.dart';
import '../../services/chat/chat_service.dart';
import '../../widgets/doctor/doctor_widgets.dart';

/// Mở phòng khám (video call hoặc chat) cho một appointment, dùng chung
/// giữa Home, Appointments list và Appointment Detail để tránh lặp logic.
Future<void> joinDoctorConsultationRoom(BuildContext context, DoctorAppointment appointment) {
  final isChat = appointment.consultationType?.toUpperCase() == 'CHAT';
  return isChat ? _joinChatRoom(context, appointment) : _joinVideoCall(context, appointment);
}

Future<void> _joinChatRoom(BuildContext context, DoctorAppointment appointment) async {
  final auth = context.read<AuthProvider>();
  final token = auth.accessToken;
  final myId = auth.userId;
  final patientId = appointment.patientId;
  if (token == null || myId == null || patientId == null) {
    showDoctorNotice(context, 'Cannot open chat room.', isError: true);
    return;
  }

  try {
    final conversation = await ChatService.getOrCreateRoom(
      token,
      myId,
      patientId,
      appointmentId: appointment.appointmentId,
    );

    if (context.mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => ChatRoomScreen(conversation: conversation)),
      );
    }
  } catch (e) {
    if (context.mounted) {
      showDoctorNotice(context, e.toString().replaceFirst('Exception: ', ''), isError: true);
    }
  }
}

Future<void> _joinVideoCall(BuildContext context, DoctorAppointment appointment) async {
  final auth = context.read<AuthProvider>();
  final videoCallProvider = context.read<VideoCallProvider>();
  final myId = auth.userId;
  final patientId = appointment.patientId;
  final patientName = appointment.patientName ?? 'Patient';

  if (!auth.isAuthenticated || myId == null || patientId == null) {
    showDoctorNotice(context, 'Cannot start video call.', isError: true);
    return;
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  final rnd = math.Random();
  final roomId = String.fromCharCodes(
    Iterable.generate(45, (_) => chars.codeUnitAt(rnd.nextInt(chars.length))),
  );

  final myName = (auth.displayName != null && auth.displayName!.trim().isNotEmpty)
      ? 'Dr. ${auth.displayName}'
      : 'Doctor';

  final success = videoCallProvider.sendCallRequest(
    receiverId: patientId,
    roomId: roomId,
    myId: myId,
    myName: myName,
    receiverName: patientName,
    receiverRole: 'Patient',
  );

  if (!success) {
    showDoctorNotice(context, 'You are already in a call.', isError: true);
    return;
  }

  if (!context.mounted) return;
  Navigator.push(
    context,
    MaterialPageRoute(
      settings: const RouteSettings(name: '/video_call'),
      builder: (_) => VideoCallScreen(
        partnerName: patientName,
        partnerRole: 'Patient',
        partnerId: patientId,
        roomId: roomId,
        isCaller: true,
      ),
    ),
  );
}
