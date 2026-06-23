import 'package:flutter/material.dart';

/// Design tokens matching Next.js Tailwind exactly
/// Sử dụng như CSS variables trong React
class DoctorStyles {
  DoctorStyles._();

  // ============================================
  // CORE COLORS (Tailwind equivalents)
  // ============================================
  static const primary = Color(0xFF0D7377);
  static const primaryForeground = Colors.white;

  static const background = Color(0xFFF8FAFB);
  static const foreground = Color(0xFF111827); // gray-900

  static const card = Colors.white;
  static const cardBorder = Color(0xFFE5E7EB); // gray-200

  static const secondary = Color(0xFFF3F4F6); // gray-100
  static const secondaryForeground = Color(0xFF374151); // gray-700

  static const muted = Color(0xFFF3F4F6); // gray-100
  static const mutedForeground = Color(0xFF6B7280); // gray-500

  static const border = Color(0xFFE5E7EB); // gray-200

  static const destructive = Color(0xFFDC2626); // red-600

  // ============================================
  // AMBER (for pending, warnings)
  // ============================================
  static const amber50 = Color(0xFFFFFBEB);
  static const amber100 = Color(0xFFFEF3C7);
  static const amber200 = Color(0xFFFDE68A);
  static const amber400 = Color(0xFFFBBF24);
  static const amber500 = Color(0xFFF59E0B);
  static const amber600 = Color(0xFFD97706);
  static const amber700 = Color(0xFFB45309);

  // ============================================
  // EMERALD (for success, completed)
  // ============================================
  static const emerald50 = Color(0xFFECFDF5);
  static const emerald100 = Color(0xFFD1FAE5);
  static const emerald200 = Color(0xFFA7F3D0);
  static const emerald500 = Color(0xFF10B981);
  static const emerald600 = Color(0xFF059669);
  static const emerald700 = Color(0xFF047857);

  // ============================================
  // SKY (for info, confirmed)
  // ============================================
  static const sky100 = Color(0xFFE0F2FE);
  static const sky200 = Color(0xFFBAE6FD);
  static const sky500 = Color(0xFF0EA5E9);
  static const sky600 = Color(0xFF0284C7);
  static const sky700 = Color(0xFF0369A1);

  // ============================================
  // ROSE (for cancelled, errors)
  // ============================================
  static const rose100 = Color(0xFFFFE4E6);
  static const rose200 = Color(0xFFFECDD3);
  static const rose500 = Color(0xFFF43F5E);
  static const rose600 = Color(0xFFE11D48);
  static const rose700 = Color(0xFFBE123C);

  // ============================================
  // STATUS HELPERS
  // ============================================

  static Color getStatusColor(String? status) {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return amber600;
      case 'CONFIRMED':
        return sky600;
      case 'IN_PROGRESS':
        return primary;
      case 'COMPLETED':
      case 'ELIGIBLE':
        return emerald600;
      case 'CANCELLED':
      case 'REJECTED':
      case 'NO_SHOW':
        return rose600;
      case 'PROCESSING':
      case 'WITHDRAWN':
        return sky600;
      default:
        return mutedForeground;
    }
  }

  static Color getStatusBgColor(String? status) {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return amber100;
      case 'CONFIRMED':
        return sky100;
      case 'IN_PROGRESS':
        return Color(0xFF0D7377).withOpacity(0.15);
      case 'COMPLETED':
      case 'ELIGIBLE':
        return emerald100;
      case 'CANCELLED':
      case 'REJECTED':
      case 'NO_SHOW':
        return rose100;
      case 'PROCESSING':
      case 'WITHDRAWN':
        return sky100;
      default:
        return secondary;
    }
  }

  static String getStatusLabel(String? status) {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'Pending';
      case 'CONFIRMED':
        return 'Confirmed';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      case 'ELIGIBLE':
        return 'Eligible';
      case 'WITHDRAWN':
        return 'Withdrawn';
      case 'PROCESSING':
        return 'Processing';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status ?? 'Unknown';
    }
  }

  // ============================================
  // DECORATIONS
  // ============================================

  static BoxDecoration get cardDecoration => BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cardBorder),
      );

  static BoxDecoration get headerDecoration => const BoxDecoration(
        color: primary,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
      );

  static InputDecoration inputDecoration({
    String? hintText,
    String? labelText,
    Widget? prefixIcon,
    Widget? suffixIcon,
  }) =>
      InputDecoration(
        hintText: hintText,
        labelText: labelText,
        hintStyle: const TextStyle(color: mutedForeground),
        prefixIcon: prefixIcon,
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: background,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: cardBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: cardBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: primary),
        ),
      );

  // ============================================
  // BUTTON STYLES
  // ============================================

  static ButtonStyle get primaryButtonStyle => ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: primaryForeground,
        disabledBackgroundColor: primary.withOpacity(0.5),
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      );

  static ButtonStyle get outlineButtonStyle => OutlinedButton.styleFrom(
        foregroundColor: foreground,
        side: const BorderSide(color: cardBorder),
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      );

  static ButtonStyle get destructiveButtonStyle => OutlinedButton.styleFrom(
        foregroundColor: destructive,
        side: const BorderSide(color: cardBorder),
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      );
}

/// Shorthand alias
typedef DS = DoctorStyles;

// ============================================
// LEGACY SUPPORT - Keep old API working
// ============================================

class DoctorColors {
  final BuildContext context;

  DoctorColors(this.context);

  Color get primary => DS.primary;
  Color get onPrimary => DS.primaryForeground;
  Color get surface => DS.card;
  Color get onSurface => DS.foreground;
  Color get onSurfaceVariant => DS.mutedForeground;
  Color get surfaceContainer => DS.secondary;
  Color get cardBorder => DS.cardBorder;
  Color get cardShadow => Colors.black.withOpacity(0.05);
  Color get divider => DS.border;

  Color get success => DS.emerald600;
  Color get successBg => DS.emerald100;
  Color get warning => DS.amber600;
  Color get warningBg => DS.amber100;
  Color get error => DS.rose600;
  Color get errorBg => DS.rose100;
  Color get info => DS.sky600;
  Color get infoBg => DS.sky100;
  Color get money => DS.emerald600;

  Color getStatusColor(String? status) => DS.getStatusColor(status);
  Color getStatusBgColor(String? status) => DS.getStatusBgColor(status);
}

extension DoctorColorsExtension on BuildContext {
  DoctorColors get doctorColors => DoctorColors(this);
}
