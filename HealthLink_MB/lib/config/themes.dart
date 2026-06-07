import 'package:flutter/material.dart';

class HealthLinkTheme {
  // =========================================================
  // 1. NHÓM MÀU GIAO DIỆN SÁNG (LIGHT THEME)
  // Lấy chính xác từ file cấu hình YAML Theme Light
  // =========================================================

  static const Color lightPrimary = Color(0xFF00463B);
  static const Color lightOnPrimary = Color(0xFFFFFFFF);
  static const Color lightPrimaryContainer = Color(0xFF006051);
  static const Color lightOnPrimaryContainer = Color(0xFF8CD8C4);

  static const Color lightSecondary = Color(0xFF006C4F);
  static const Color lightOnSecondary = Color(0xFFFFFFFF);
  static const Color lightSecondaryContainer = Color(0xFF9DF4CF);
  static const Color lightOnSecondaryContainer = Color(0xFF0F7255);

  static const Color lightTertiary = Color(0xFF00463B);
  static const Color lightOnTertiary = Color(0xFFFFFFFF);
  static const Color lightTertiaryContainer = Color(0xFF006051);
  static const Color lightOnTertiaryContainer = Color(0xFF7CDAC4);

  static const Color lightError = Color(0xFFBA1A1A);
  static const Color lightOnError = Color(0xFFFFFFFF);
  static const Color lightErrorContainer = Color(0xFFFFDAD6);
  static const Color lightOnErrorContainer = Color(0xFF93000A);

  static const Color lightBackground = Color(0xFFF8FFFD);
  static const Color lightOnBackground = Color(0xFF071F1C);

  static const Color lightSurface = Color(0xFFF8FFFD);
  static const Color lightOnSurface = Color(0xFF071F1C);
  static const Color lightSurfaceVariant = Color(0xFFE0F2EF);
  static const Color lightOnSurfaceVariant = Color(0xFF3F4946);

  static const Color lightOutline = Color(0xFF6F7975);
  static const Color lightOutlineVariant = Color(0xFFBEC9C4);

  static const Color lightInverseSurface = Color(0xFF1D3531);
  static const Color lightOnInverseSurface = Color(0xFFDCF6F0);
  static const Color lightInversePrimary = Color(0xFF89D5C2);

  // Nhóm màu mở rộng (Surface Containers) cho thẻ Card/Nền
  static const Color lightSurfaceBright = Color(0xFFF8FFFD);
  static const Color lightSurfaceDim = Color(0xFFE8F5F2);
  static const Color lightSurfaceContainerLowest = Color(0xFFFFFFFF);
  static const Color lightSurfaceContainerLow = Color(0xFFF1FAF7);
  static const Color lightSurfaceContainer = Color(0xFFECF7F4);
  static const Color lightSurfaceContainerHigh = Color(0xFFE6F2EF);
  static const Color lightSurfaceContainerHighest = Color(0xFFE0F2EF);


  // =========================================================
  // 2. NHÓM MÀU GIAO DIỆN TỐI (DARK THEME)
  // Lấy chính xác từ file cấu hình YAML Theme Dark
  // =========================================================

  static const Color darkPrimary = Color(0xFF89D5C2);
  static const Color darkOnPrimary = Color(0xFF00382E);
  static const Color darkPrimaryContainer = Color(0xFF006051);
  static const Color darkOnPrimaryContainer = Color(0xFF8CD8C4);

  static const Color darkSecondary = Color(0xFF82D7B4);
  static const Color darkOnSecondary = Color(0xFF003827);
  static const Color darkSecondaryContainer = Color(0xFF006C4F);
  static const Color darkOnSecondaryContainer = Color(0xFF93EAC5);

  static const Color darkTertiary = Color(0xFF79D7C1);
  static const Color darkOnTertiary = Color(0xFF00382E);
  static const Color darkTertiaryContainer = Color(0xFF006051);
  static const Color darkOnTertiaryContainer = Color(0xFF7CDAC4);

  static const Color darkError = Color(0xFFFFB4AB);
  static const Color darkOnError = Color(0xFF690005);
  static const Color darkErrorContainer = Color(0xFF93000A);
  static const Color darkOnErrorContainer = Color(0xFFFFDAD6);

  static const Color darkBackground = Color(0xFF001714);
  static const Color darkOnBackground = Color(0xFFCDE8E2);

  static const Color darkSurface = Color(0xFF001714);
  static const Color darkOnSurface = Color(0xFFCDE8E2);
  static const Color darkSurfaceVariant = Color(0xFF213935);
  static const Color darkOnSurfaceVariant = Color(0xFFBEC9C4);

  static const Color darkOutline = Color(0xFF88938F);
  static const Color darkOutlineVariant = Color(0xFF3F4946);

  static const Color darkInverseSurface = Color(0xFFCDE8E2);
  static const Color darkOnInverseSurface = Color(0xFF1D3531);
  static const Color darkInversePrimary = Color(0xFF166A5B);

  // Nhóm màu mở rộng (Surface Containers) cho thẻ Card/Nền bản Dark
  static const Color darkSurfaceBright = Color(0xFF263D3A);
  static const Color darkSurfaceDim = Color(0xFF001714);
  static const Color darkSurfaceContainerLowest = Color(0xFF00110F);
  static const Color darkSurfaceContainerLow = Color(0xFF071F1C);
  static const Color darkSurfaceContainer = Color(0xFF0B2320);
  static const Color darkSurfaceContainerHigh = Color(0xFF162E2B);
  static const Color darkSurfaceContainerHighest = Color(0xFF213935);


  // =========================================================
  // 3. CẤU HÌNH THEME (ĐỂ GỌI TRONG MAIN.DART)
  // =========================================================

  /// Cấu hình cho Light Mode
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      fontFamily: 'Inter',
      brightness: Brightness.light,
      colorScheme: const ColorScheme.light(
        primary: lightPrimary,
        onPrimary: lightOnPrimary,
        primaryContainer: lightPrimaryContainer,
        onPrimaryContainer: lightOnPrimaryContainer,
        secondary: lightSecondary,
        onSecondary: lightOnSecondary,
        secondaryContainer: lightSecondaryContainer,
        onSecondaryContainer: lightOnSecondaryContainer,
        tertiary: lightTertiary,
        onTertiary: lightOnTertiary,
        tertiaryContainer: lightTertiaryContainer,
        onTertiaryContainer: lightOnTertiaryContainer,
        error: lightError,
        onError: lightOnError,
        errorContainer: lightErrorContainer,
        onErrorContainer: lightOnErrorContainer,
        background: lightBackground,
        onBackground: lightOnBackground,
        surface: lightSurface,
        onSurface: lightOnSurface,
        surfaceVariant: lightSurfaceVariant,
        onSurfaceVariant: lightOnSurfaceVariant,
        outline: lightOutline,
        outlineVariant: lightOutlineVariant,
        inverseSurface: lightInverseSurface,
        onInverseSurface: lightOnInverseSurface,
        inversePrimary: lightInversePrimary,
      ),
      scaffoldBackgroundColor: lightBackground,
    );
  }

  /// Cấu hình cho Dark Mode
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      fontFamily: 'Inter',
      brightness: Brightness.dark,
      colorScheme: const ColorScheme.dark(
        primary: darkPrimary,
        onPrimary: darkOnPrimary,
        primaryContainer: darkPrimaryContainer,
        onPrimaryContainer: darkOnPrimaryContainer,
        secondary: darkSecondary,
        onSecondary: darkOnSecondary,
        secondaryContainer: darkSecondaryContainer,
        onSecondaryContainer: darkOnSecondaryContainer,
        tertiary: darkTertiary,
        onTertiary: darkOnTertiary,
        tertiaryContainer: darkTertiaryContainer,
        onTertiaryContainer: darkOnTertiaryContainer,
        error: darkError,
        onError: darkOnError,
        errorContainer: darkErrorContainer,
        onErrorContainer: darkOnErrorContainer,
        background: darkBackground,
        onBackground: darkOnBackground,
        surface: darkSurface,
        onSurface: darkOnSurface,
        surfaceVariant: darkSurfaceVariant,
        onSurfaceVariant: darkOnSurfaceVariant,
        outline: darkOutline,
        outlineVariant: darkOutlineVariant,
        inverseSurface: darkInverseSurface,
        onInverseSurface: darkOnInverseSurface,
        inversePrimary: darkInversePrimary,
      ),
      scaffoldBackgroundColor: darkBackground,
    );
  }
}