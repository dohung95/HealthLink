import 'package:flutter/material.dart';

/// Doctor Module Color System
/// Bảng màu chuyên nghiệp cho giao diện bác sĩ
/// Tương thích với cả Light và Dark theme
class DoctorColors {
  final BuildContext context;
  late final ColorScheme _scheme;
  late final bool _isDark;

  DoctorColors(this.context) {
    _scheme = Theme.of(context).colorScheme;
    _isDark = Theme.of(context).brightness == Brightness.dark;
  }

  // ============================================
  // PRIMARY COLORS (từ theme chính)
  // ============================================
  Color get primary => _scheme.primary;
  Color get onPrimary => _scheme.onPrimary;
  Color get primaryContainer => _scheme.primaryContainer;
  Color get onPrimaryContainer => _scheme.onPrimaryContainer;

  // ============================================
  // SURFACE COLORS
  // ============================================
  Color get surface => _scheme.surface;
  Color get onSurface => _scheme.onSurface;
  Color get surfaceVariant => _scheme.surfaceVariant;
  Color get onSurfaceVariant => _scheme.onSurfaceVariant;
  Color get surfaceContainer => _isDark
      ? _scheme.surfaceContainerHigh
      : _scheme.surfaceContainerHighest.withOpacity(0.5);

  // ============================================
  // STATUS COLORS - Appointment Status
  // ============================================

  /// PENDING - Chờ xác nhận (Amber/Gold tone)
  Color get statusPending => _isDark
      ? const Color(0xFFFFB74D)  // Amber 300
      : const Color(0xFFFF8F00); // Amber 800
  Color get statusPendingBg => _isDark
      ? const Color(0xFFFFB74D).withOpacity(0.15)
      : const Color(0xFFFFF8E1); // Amber 50

  /// CONFIRMED - Đã xác nhận (Blue tone)
  Color get statusConfirmed => _isDark
      ? const Color(0xFF64B5F6)  // Blue 300
      : const Color(0xFF1976D2); // Blue 700
  Color get statusConfirmedBg => _isDark
      ? const Color(0xFF64B5F6).withOpacity(0.15)
      : const Color(0xFFE3F2FD); // Blue 50

  /// IN_PROGRESS - Đang diễn ra (Teal/Primary tone)
  Color get statusInProgress => _isDark
      ? const Color(0xFF4DB6AC)  // Teal 300
      : const Color(0xFF00796B); // Teal 700
  Color get statusInProgressBg => _isDark
      ? const Color(0xFF4DB6AC).withOpacity(0.15)
      : const Color(0xFFE0F2F1); // Teal 50

  /// COMPLETED - Hoàn thành (Green tone)
  Color get statusCompleted => _isDark
      ? const Color(0xFF81C784)  // Green 300
      : const Color(0xFF388E3C); // Green 700
  Color get statusCompletedBg => _isDark
      ? const Color(0xFF81C784).withOpacity(0.15)
      : const Color(0xFFE8F5E9); // Green 50

  /// CANCELLED / NO_SHOW - Hủy/Vắng mặt (Red tone)
  Color get statusCancelled => _isDark
      ? const Color(0xFFE57373)  // Red 300
      : const Color(0xFFD32F2F); // Red 700
  Color get statusCancelledBg => _isDark
      ? const Color(0xFFE57373).withOpacity(0.15)
      : const Color(0xFFFFEBEE); // Red 50

  /// DEFAULT - Mặc định (Grey tone)
  Color get statusDefault => _isDark
      ? const Color(0xFF9E9E9E)  // Grey 500
      : const Color(0xFF757575); // Grey 600
  Color get statusDefaultBg => _isDark
      ? const Color(0xFF9E9E9E).withOpacity(0.15)
      : const Color(0xFFFAFAFA); // Grey 50

  // ============================================
  // STAT CARD COLORS - Dashboard Statistics
  // ============================================

  /// Appointments Today
  Color get statAppointments => _isDark
      ? const Color(0xFF64B5F6)  // Blue 300
      : const Color(0xFF1565C0); // Blue 800
  Color get statAppointmentsBg => _isDark
      ? const Color(0xFF64B5F6).withOpacity(0.12)
      : const Color(0xFFE3F2FD); // Blue 50

  /// Completed Count
  Color get statCompleted => _isDark
      ? const Color(0xFF81C784)  // Green 300
      : const Color(0xFF2E7D32); // Green 800
  Color get statCompletedBg => _isDark
      ? const Color(0xFF81C784).withOpacity(0.12)
      : const Color(0xFFE8F5E9); // Green 50

  /// Pending Count
  Color get statPending => _isDark
      ? const Color(0xFFFFB74D)  // Amber 300
      : const Color(0xFFEF6C00); // Orange 800
  Color get statPendingBg => _isDark
      ? const Color(0xFFFFB74D).withOpacity(0.12)
      : const Color(0xFFFFF3E0); // Orange 50

  /// Rating/Reviews
  Color get statRating => _isDark
      ? const Color(0xFFFFD54F)  // Amber 300
      : const Color(0xFFF9A825); // Yellow 800
  Color get statRatingBg => _isDark
      ? const Color(0xFFFFD54F).withOpacity(0.12)
      : const Color(0xFFFFFDE7); // Yellow 50

  /// Years Experience
  Color get statExperience => _isDark
      ? const Color(0xFF4DB6AC)  // Teal 300
      : const Color(0xFF00695C); // Teal 800
  Color get statExperienceBg => _isDark
      ? const Color(0xFF4DB6AC).withOpacity(0.12)
      : const Color(0xFFE0F2F1); // Teal 50

  // ============================================
  // SEMANTIC COLORS
  // ============================================

  /// Success
  Color get success => statusCompleted;
  Color get successBg => statusCompletedBg;

  /// Warning
  Color get warning => statusPending;
  Color get warningBg => statusPendingBg;

  /// Error
  Color get error => statusCancelled;
  Color get errorBg => statusCancelledBg;

  /// Info
  Color get info => statusConfirmed;
  Color get infoBg => statusConfirmedBg;

  // ============================================
  // SPECIAL COLORS
  // ============================================

  /// Money/Fee color
  Color get money => _isDark
      ? const Color(0xFF81C784)  // Green 300
      : const Color(0xFF2E7D32); // Green 800

  /// Blood type badge
  Color get bloodType => _isDark
      ? const Color(0xFFEF5350)  // Red 400
      : const Color(0xFFC62828); // Red 800
  Color get bloodTypeBg => _isDark
      ? const Color(0xFFEF5350).withOpacity(0.15)
      : const Color(0xFFFFEBEE); // Red 50

  /// Card border
  Color get cardBorder => _scheme.outlineVariant;

  /// Card shadow
  Color get cardShadow => _isDark
      ? Colors.black.withOpacity(0.3)
      : Colors.black.withOpacity(0.05);

  /// Divider
  Color get divider => _scheme.outlineVariant.withOpacity(0.5);

  /// Disabled
  Color get disabled => _isDark
      ? const Color(0xFF616161)
      : const Color(0xFFBDBDBD);

  // ============================================
  // HELPER METHODS
  // ============================================

  /// Lấy màu theo appointment status
  Color getStatusColor(String? status) {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return statusPending;
      case 'CONFIRMED':
        return statusConfirmed;
      case 'IN_PROGRESS':
        return statusInProgress;
      case 'COMPLETED':
        return statusCompleted;
      case 'CANCELLED':
      case 'NO_SHOW':
        return statusCancelled;
      default:
        return statusDefault;
    }
  }

  /// Lấy màu nền theo appointment status
  Color getStatusBgColor(String? status) {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return statusPendingBg;
      case 'CONFIRMED':
        return statusConfirmedBg;
      case 'IN_PROGRESS':
        return statusInProgressBg;
      case 'COMPLETED':
        return statusCompletedBg;
      case 'CANCELLED':
      case 'NO_SHOW':
        return statusCancelledBg;
      default:
        return statusDefaultBg;
    }
  }
}

/// Extension để dễ dàng truy cập DoctorColors từ BuildContext
extension DoctorColorsExtension on BuildContext {
  DoctorColors get doctorColors => DoctorColors(this);
}
