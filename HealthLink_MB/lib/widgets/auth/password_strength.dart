import 'package:flutter/material.dart';

/// Widget hiển thị checklist độ mạnh mật khẩu real-time.
/// Truyền vào [password] – tự động cập nhật khi password thay đổi.
class PasswordStrengthWidget extends StatelessWidget {
  final String password;

  const PasswordStrengthWidget({super.key, required this.password});

  static const _checks = [
    ('minLength',    'At least 6 characters'),
    ('hasUppercase', 'Uppercase letter (A-Z)'),
    ('hasLowercase', 'Lowercase letter (a-z)'),
    ('hasNumber',    'Number (0-9)'),
    ('hasSpecial',   'Special character (!@#\$...)'),
  ];

  bool _check(String key) => switch (key) {
    'minLength'    => password.length >= 6,
    'hasUppercase' => RegExp(r'[A-Z]').hasMatch(password),
    'hasLowercase' => RegExp(r'[a-z]').hasMatch(password),
    'hasNumber'    => RegExp(r'[0-9]').hasMatch(password),
    'hasSpecial'   => RegExp(r'[^a-zA-Z0-9\s]').hasMatch(password),
    _              => false,
  };

  @override
  Widget build(BuildContext context) {
    if (password.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: _checks.map((entry) {
          final ok = _check(entry.$1);
          return Padding(
            padding: const EdgeInsets.only(bottom: 3),
            child: Row(
              children: [
                Icon(
                  ok ? Icons.check_circle : Icons.radio_button_unchecked,
                  size: 13,
                  color: ok ? const Color(0xFF4CAF50) : Colors.grey,
                ),
                const SizedBox(width: 5),
                Text(
                  entry.$2,
                  style: TextStyle(
                    fontSize: 12,
                    fontFamily: 'Inter',
                    color: ok ? const Color(0xFF4CAF50) : Colors.grey.shade500,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}
