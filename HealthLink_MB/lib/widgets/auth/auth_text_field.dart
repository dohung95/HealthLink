import 'package:flutter/material.dart';

/// TextField tái sử dụng cho các form Auth.
/// Hỗ trợ: validate state (touched/error/success), toggle password, prefix icon.
class AuthTextField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hintText;
  final IconData prefixIcon;
  final bool isRequired;
  final bool isObscure;
  final VoidCallback? onToggleObscure;
  final TextInputType keyboardType;
  final bool touched;
  final String errorText;
  final String? successText;
  final void Function(String)? onChanged;
  final void Function()? onBlur;
  final Widget? extraWidget; // Ví dụ: password strength indicator

  const AuthTextField({
    super.key,
    required this.controller,
    required this.label,
    required this.hintText,
    required this.prefixIcon,
    this.isRequired = false,
    this.isObscure = false,
    this.onToggleObscure,
    this.keyboardType = TextInputType.text,
    this.touched = false,
    this.errorText = '',
    this.successText,
    this.onChanged,
    this.onBlur,
    this.extraWidget,
  });

  // ── Màu border theo trạng thái validate (dựa trên Theme hiện tại)
  Color _borderColor(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    if (!touched) return colorScheme.outlineVariant;
    return errorText.isEmpty ? colorScheme.primary : colorScheme.error;
  }

  Color _iconColor(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    if (!touched) return colorScheme.outline;
    return errorText.isEmpty ? colorScheme.primary : colorScheme.error;
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      onFocusChange: (hasFocus) {
        if (!hasFocus && onBlur != null) onBlur!();
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Label
          Row(
            children: [
              Text(
                label,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              if (isRequired)
                Text(' *', style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 14)),
            ],
          ),
          const SizedBox(height: 6),

          // Input
          TextField(
            controller: controller,
            obscureText: isObscure,
            keyboardType: keyboardType,
            onChanged: onChanged,
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 15,
              color: Theme.of(context).colorScheme.onSurface,
            ),
            decoration: InputDecoration(
              hintText: hintText,
              hintStyle: TextStyle(color: Theme.of(context).colorScheme.outline.withOpacity(0.7), fontSize: 15),
              fillColor: Theme.of(context).colorScheme.surface,
              filled: true,
              contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
              prefixIcon: Icon(prefixIcon, color: _iconColor(context), size: 20),
              suffixIcon: onToggleObscure != null
                  ? IconButton(
                      icon: Icon(
                        isObscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                        color: Theme.of(context).colorScheme.outline,
                        size: 20,
                      ),
                      onPressed: onToggleObscure,
                    )
                  : null,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: _borderColor(context)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: _borderColor(context)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(
                  color: touched && errorText.isNotEmpty
                      ? Theme.of(context).colorScheme.error
                      : Theme.of(context).colorScheme.primary,
                  width: 2,
                ),
              ),
            ),
          ),

          // Error text
          if (touched && errorText.isNotEmpty)
            _buildFeedbackRow(
              icon: Icons.cancel_outlined,
              text: errorText,
              color: Theme.of(context).colorScheme.error,
            )
          // Success text
          else if (touched && errorText.isEmpty && successText != null)
            _buildFeedbackRow(
              icon: Icons.check_circle_outline,
              text: successText!,
              color: Theme.of(context).colorScheme.secondary,
            ),

          // Widget extra (ví dụ: password strength)
          if (extraWidget != null) extraWidget!,
        ],
      ),
    );
  }

  Widget _buildFeedbackRow({
    required IconData icon,
    required String text,
    required Color color,
  }) {
    return Padding(
      padding: const EdgeInsets.only(top: 5),
      child: Row(
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4),
          Expanded(
            child: Text(
              text,
              style: TextStyle(fontSize: 12, color: color, fontFamily: 'Inter'),
            ),
          ),
        ],
      ),
    );
  }
}
