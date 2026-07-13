import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../config/doctor_theme.dart';

/// Popup (Dialog) hiển thị QR card của bác sĩ, đặt giữa màn hình.
///
/// Trước khi hiện QR, bác sĩ chọn thiết bị sẽ dùng để quét:
/// - "iPhone": mã QR encode vCard chuẩn — Camera iPhone tự nhận diện và
///   gợi ý lưu danh bạ.
/// - "Other device" (Zalo, Android, ...): mã QR encode text thuần, hiển thị
///   giống nhau trên mọi app quét vì các app này không tự parse vCard.
///
/// Thông tin (tên, chuyên khoa, kinh nghiệm, sđt, email, châm ngôn) chỉ hiện
/// ra khi quét mã — không liệt kê lại trong app.
class DoctorQrCodeScreen extends StatelessWidget {
  static const String _motto = 'Dedicated to your health, committed to your care.';

  final String? fullName;
  final String? specialty;
  final int? yearsOfExperience;
  final String? phoneNumber;
  final String? email;
  final bool useVCard;

  const DoctorQrCodeScreen({
    super.key,
    this.fullName,
    this.specialty,
    this.yearsOfExperience,
    this.phoneNumber,
    this.email,
    required this.useVCard,
  });

  static String _vEscape(String value) => value
      .replaceAll('\\', '\\\\')
      .replaceAll(',', '\\,')
      .replaceAll(';', '\\;')
      .replaceAll('\n', '\\n');

  String get _trimmedName => fullName?.trim().isNotEmpty == true ? fullName!.trim() : 'Doctor';

  /// Text thuần — hiển thị giống nhau ở mọi app quét không hỗ trợ vCard.
  String get _plainText {
    final hasSpecialty = specialty != null && specialty!.trim().isNotEmpty;
    final hasExperience = yearsOfExperience != null && yearsOfExperience! > 0;
    final hasPhone = phoneNumber != null && phoneNumber!.trim().isNotEmpty;
    final hasEmail = email != null && email!.trim().isNotEmpty;

    final buffer = StringBuffer()..writeln('Name: $_trimmedName');
    if (hasSpecialty) buffer.writeln('Specialty: ${specialty!.trim()}');
    if (hasExperience) buffer.writeln('Experience: $yearsOfExperience years of experience');
    if (hasPhone) buffer.writeln('Phone: ${phoneNumber!.trim()}');
    if (hasEmail) buffer.writeln('Email: ${email!.trim()}');

    buffer.writeln();
    buffer.write('"$_motto"');

    return buffer.toString().trim();
  }

  /// vCard chuẩn — Camera iPhone (và app hỗ trợ vCard) tự nhận diện danh bạ.
  String get _vCardText {
    final hasSpecialty = specialty != null && specialty!.trim().isNotEmpty;
    final hasExperience = yearsOfExperience != null && yearsOfExperience! > 0;

    final buffer = StringBuffer()
      ..writeln('BEGIN:VCARD')
      ..writeln('VERSION:3.0')
      ..writeln('FN:${_vEscape(_trimmedName)}');

    if (hasSpecialty) {
      buffer.writeln('TITLE:${_vEscape(specialty!.trim())}');
    }
    if (phoneNumber != null && phoneNumber!.trim().isNotEmpty) {
      buffer.writeln('TEL:${_vEscape(phoneNumber!.trim())}');
    }
    if (email != null && email!.trim().isNotEmpty) {
      buffer.writeln('EMAIL:${_vEscape(email!.trim())}');
    }

    final noteParts = <String>[
      if (hasExperience) '$yearsOfExperience years of experience',
      '"$_motto"',
    ];
    buffer.writeln('NOTE:${_vEscape(noteParts.join(' — '))}');

    buffer.writeln('END:VCARD');
    return buffer.toString();
  }

  String get _qrData => useVCard ? _vCardText : _plainText;

  /// Hỏi bác sĩ dùng thiết bị nào để quét, rồi hiện popup QR tương ứng.
  static Future<void> show(
    BuildContext context, {
    String? fullName,
    String? specialty,
    int? yearsOfExperience,
    String? phoneNumber,
    String? email,
  }) async {
    final useVCard = await showDialog<bool>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.6),
      builder: (_) => const _ScanDeviceChooser(),
    );

    if (useVCard == null || !context.mounted) return;

    await showDialog(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.6),
      builder: (_) => DoctorQrCodeScreen(
        fullName: fullName,
        specialty: specialty,
        yearsOfExperience: yearsOfExperience,
        phoneNumber: phoneNumber,
        email: email,
        useVCard: useVCard,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasSpecialty = specialty != null && specialty!.trim().isNotEmpty;

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 28),
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.22),
              blurRadius: 36,
              offset: const Offset(0, 16),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // ── Header band ─────────────────────────────────────────────
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(22, 16, 14, 20),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [DS.primary, Color(0xFF0A5A5D)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.qr_code_2_rounded, color: Colors.white, size: 19),
                      ),
                      const Spacer(),
                      InkWell(
                        onTap: () => Navigator.of(context).pop(),
                        borderRadius: BorderRadius.circular(20),
                        child: const Padding(
                          padding: EdgeInsets.all(4),
                          child: Icon(Icons.close_rounded, size: 20, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'My QR Card',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    useVCard ? 'Optimized for iPhone Camera' : 'Universal — works with any scanner',
                    style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.8)),
                  ),
                ],
              ),
            ),

            // ── Body ─────────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 26, 24, 22),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _QrFrame(data: _qrData),
                  const SizedBox(height: 22),
                  Text(
                    _trimmedName,
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: DS.foreground),
                    textAlign: TextAlign.center,
                  ),
                  if (hasSpecialty) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(
                        color: DS.primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        specialty!.trim(),
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: DS.primary),
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  Container(height: 1, color: DS.cardBorder),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.camera_alt_outlined, size: 14, color: DS.mutedForeground.withValues(alpha: 0.8)),
                      const SizedBox(width: 6),
                      Text(
                        'Scan to save contact details',
                        style: TextStyle(fontSize: 12, color: DS.mutedForeground.withValues(alpha: 0.9)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'HealthLink',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: DS.primary, letterSpacing: 0.5),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Khung QR có 4 góc bấm (bracket) kiểu khung ngắm — tạo cảm giác "scan
/// target" chuyên nghiệp thay vì chỉ 1 khối vuông đơn điệu.
class _QrFrame extends StatelessWidget {
  final String data;
  const _QrFrame({required this.data});

  Widget _bracket({required bool top, required bool left}) {
    const side = BorderSide(color: DS.primary, width: 3.5);
    const radius = Radius.circular(14);
    return Positioned(
      top: top ? -4 : null,
      bottom: top ? null : -4,
      left: left ? -4 : null,
      right: left ? null : -4,
      child: SizedBox(
        width: 28,
        height: 28,
        child: DecoratedBox(
          decoration: BoxDecoration(
            border: Border(
              top: top ? side : BorderSide.none,
              bottom: !top ? side : BorderSide.none,
              left: left ? side : BorderSide.none,
              right: !left ? side : BorderSide.none,
            ),
            borderRadius: BorderRadius.only(
              topLeft: top && left ? radius : Radius.zero,
              topRight: top && !left ? radius : Radius.zero,
              bottomLeft: !top && left ? radius : Radius.zero,
              bottomRight: !top && !left ? radius : Radius.zero,
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      alignment: Alignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: DS.cardBorder),
            boxShadow: [
              BoxShadow(
                color: DS.primary.withValues(alpha: 0.08),
                blurRadius: 18,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: QrImageView(
            data: data,
            version: QrVersions.auto,
            size: 208,
            gapless: false,
            eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: DS.foreground),
            dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.square, color: DS.foreground),
            errorCorrectionLevel: QrErrorCorrectLevel.M,
          ),
        ),
        _bracket(top: true, left: true),
        _bracket(top: true, left: false),
        _bracket(top: false, left: true),
        _bracket(top: false, left: false),
      ],
    );
  }
}

/// Popup nhỏ hỏi bác sĩ sẽ được quét bằng iPhone hay thiết bị khác.
class _ScanDeviceChooser extends StatelessWidget {
  const _ScanDeviceChooser();

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 28),
      child: Container(
        padding: const EdgeInsets.fromLTRB(24, 26, 24, 24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.22),
              blurRadius: 36,
              offset: const Offset(0, 16),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: DS.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.qr_code_2_rounded, size: 28, color: DS.primary),
            ),
            const SizedBox(height: 16),
            const Text(
              'Choose your scanning device',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: DS.foreground),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              'We\'ll format the QR code so it displays\ncorrectly on that device',
              style: TextStyle(fontSize: 12.5, color: DS.mutedForeground.withValues(alpha: 0.9), height: 1.4),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: _ChooserOption(
                    icon: Icons.phone_iphone_rounded,
                    label: 'iPhone',
                    subtitle: 'Native Camera preview',
                    onTap: () => Navigator.of(context).pop(true),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _ChooserOption(
                    icon: Icons.qr_code_scanner_rounded,
                    label: 'Other device',
                    subtitle: 'Android, Zalo, etc.',
                    onTap: () => Navigator.of(context).pop(false),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ChooserOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;

  const _ChooserOption({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: DS.background,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: DS.cardBorder),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: DS.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(icon, color: DS.primary, size: 22),
              ),
              const SizedBox(height: 12),
              Text(
                label,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: DS.foreground),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 3),
              Text(
                subtitle,
                style: TextStyle(fontSize: 11, color: DS.mutedForeground.withValues(alpha: 0.85)),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
