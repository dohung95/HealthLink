import 'package:flutter/material.dart';

class HealthLinkTheme {
  static const Color background = Color(0xFFF5F8F7);
  static const Color onBackground = Color(0xFF00201D);
  static const Color onSurface = Color(0xFF00201D);
  static const Color outline = Color(0xFF6E7975);
  static const Color outlineVariant = Color(0xFFBEC9C6);
  static const Color surfaceContainerLowest = Color(0xFFFFFFFF);
  static const Color surfaceContainerLow = Color(0xFFEAF1EF);
  static const Color surfaceContainer = Color(0xFFD1F5EF);
  static const Color tertiaryContainer = Color(0xFF007B68);

  // Hệ màu mới cập nhật từ HTML Sign Up
  static const Color primary = Color(0xFF1F7A69);
  static const Color primaryContainer = Color(0xFFA6F3E0);
  static const Color onPrimaryContainer = Color(0xFF00201A);
  static const Color surfaceBright = Color(0xFFF8FAF9);
  static const Color surface = Color(0xFFF0F3F2);
  static const Color onSurfaceVariant = Color(0xFF495551);
  static const Color surfaceContainerHigh = Color(0xFFE6EBE9);
  static const Color surfaceDim = Color(0xFFD8DEDC);
  static const Color onPrimary = Color(0xFFFFFFFF);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: const ColorScheme.light(
        primary: primary,
        onPrimary: onPrimary,
        primaryContainer: primaryContainer,
        onPrimaryContainer: onPrimaryContainer,
        surface: surface,
        onSurface: onSurface,
        surfaceVariant: surfaceBright,
        onSurfaceVariant: onSurfaceVariant,
        outline: outline,
        outlineVariant: outlineVariant,
        tertiaryContainer: tertiaryContainer,
        background: background,
        onBackground: onBackground,
      ),
    );
  }
}