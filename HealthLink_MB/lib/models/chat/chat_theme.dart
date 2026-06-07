import 'package:flutter/material.dart';

class ChatTheme {
  final String name;
  final Color primary;
  final Color secondary;
  final Color background;
  final Color bubbleUser;
  final Color bubbleUserText;
  final Color bubbleOther;
  final Color bubbleOtherText;

  const ChatTheme({
    required this.name,
    required this.primary,
    required this.secondary,
    required this.background,
    required this.bubbleUser,
    required this.bubbleUserText,
    required this.bubbleOther,
    required this.bubbleOtherText,
  });
}

const List<ChatTheme> chatThemes = [
  // 1. Clinical Serenity
  ChatTheme(
    name: 'Clinical Serenity',
    primary: Color(0xFF006051),
    secondary: Color(0xFF1F7A69),
    background: Color(0xFFE0ECE9), // Sâu hơn (bớt chói)
    bubbleUser: Color(0xFF006051),
    bubbleUserText: Colors.white,
    bubbleOther: Color(0xFFFFFFFF),
    bubbleOtherText: Color(0xFF006051),
  ),
  // 2. Midnight Neon (Cyberpunk)
  ChatTheme(
    name: 'Midnight Neon',
    primary: Color(0xFFFF2D78),
    secondary: Color(0xFF00F2FF),
    background: Color(0xFF0A0A12),
    bubbleUser: Color(0xFFFF2D78),
    bubbleUserText: Colors.white,
    bubbleOther: Color(0xFF161625),
    bubbleOtherText: Color(0xFFFF2D78),
  ),
  // 3. Healing Lavender (Soothing)
  ChatTheme(
    name: 'Healing Lavender',
    primary: Color(0xFF6750A4),
    secondary: Color(0xFF958DA5),
    background: Color(0xFFE8DEF2), // Sâu hơn (bớt chói)
    bubbleUser: Color(0xFF6750A4),
    bubbleUserText: Colors.white,
    bubbleOther: Color(0xFFFFFFFF),
    bubbleOtherText: Color(0xFF6750A4),
  ),
  // 4. Ocean Breeze (Refreshing)
  ChatTheme(
    name: 'Ocean Breeze',
    primary: Color(0xFF0061A4),
    secondary: Color(0xFF3B608D),
    background: Color(0xFFDFEAF7), // Sâu hơn (bớt chói)
    bubbleUser: Color(0xFF0061A4),
    bubbleUserText: Colors.white,
    bubbleOther: Color(0xFFFFFFFF),
    bubbleOtherText: Color(0xFF0061A4),
  ),
  // 5. Earthy Wellness (Natural)
  ChatTheme(
    name: 'Earthy Wellness',
    primary: Color(0xFF3E6837),
    secondary: Color(0xFF55624C),
    background: Color(0xFFE6EFE1), // Sâu hơn (bớt chói)
    bubbleUser: Color(0xFF3E6837),
    bubbleUserText: Colors.white,
    bubbleOther: Color(0xFFFFFFFF),
    bubbleOtherText: Color(0xFF3E6837),
  ),
];

// Lấy theme hiển thị thực tế
ChatTheme getActiveChatTheme(BuildContext context, int index) {
  if (index == 0) {
    // 0 = System Default
    final colors = Theme.of(context).colorScheme;
    return ChatTheme(
      name: 'System Default',
      primary: colors.primary,
      secondary: colors.secondary,
      background: colors.surfaceContainerHigh.withValues(alpha: 0.3),
      bubbleUser: colors.primary,
      bubbleUserText: colors.onPrimary,
      bubbleOther: colors.surfaceContainerHigh,
      bubbleOtherText: colors.onSurface,
    );
  }
  // Các theme cố định (index 1 -> 5)
  if (index > 0 && index <= chatThemes.length) {
    return chatThemes[index - 1];
  }
  // Fallback
  return chatThemes[0];
}

// Tổng số lượng theme = 1 (System Default) + Số lượng theme cố định
int get totalChatThemes => chatThemes.length + 1;
