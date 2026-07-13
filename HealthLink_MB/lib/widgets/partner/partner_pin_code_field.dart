import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// A six-slot PIN code input field.
///
/// Uses a single transparent text input with [FilteringTextInputFormatter.digitsOnly]
/// and [LengthLimitingTextInputFormatter(6)]. Visual slots display digits or bullets
/// depending on the [obscure] state. Tapping any slot focuses the hidden input.
/// An optional reveal button toggles visibility.
class PartnerPinCodeField extends StatefulWidget {
  const PartnerPinCodeField({
    super.key,
    required this.controller,
    this.enabled = true,
    this.errorText,
    this.autofocus = false,
    this.onCompleted,
  });

  /// Text editing controller for the underlying input.
  final TextEditingController controller;

  /// Whether the field is enabled.
  final bool enabled;

  /// Error message to display below the slots.
  final String? errorText;

  /// Whether to autofocus the hidden input on mount.
  final bool autofocus;

  /// Called when the user completes a six-digit PIN.
  final ValueChanged<String>? onCompleted;

  @override
  State<PartnerPinCodeField> createState() => _PartnerPinCodeFieldState();
}

class _PartnerPinCodeFieldState extends State<PartnerPinCodeField> {
  bool _obscured = true;
  final _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onValueChanged);
    if (widget.autofocus) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _focusNode.requestFocus());
    }
  }

  @override
  void didUpdateWidget(PartnerPinCodeField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.controller != oldWidget.controller) {
      oldWidget.controller.removeListener(_onValueChanged);
      widget.controller.addListener(_onValueChanged);
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onValueChanged);
    _focusNode.dispose();
    super.dispose();
  }

  void _onValueChanged() {
    setState(() {});
    if (widget.controller.text.length == 6) {
      widget.onCompleted?.call(widget.controller.text);
    }
  }

  void _toggleObscured() {
    setState(() => _obscured = !_obscured);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final value = widget.controller.text;
    final hasError = widget.errorText != null && widget.errorText!.isNotEmpty;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Hidden text input (zero height, invisible)
        SizedBox(
          height: 0,
          child: TextField(
            controller: widget.controller,
            focusNode: _focusNode,
            enabled: widget.enabled,
            autofocus: widget.autofocus,
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(6),
            ],
            decoration: const InputDecoration(
              border: InputBorder.none,
              isDense: true,
            ),
            style: const TextStyle(fontSize: 1, color: Colors.transparent),
          ),
        ),
        const SizedBox(height: 4),
        // Six visual slots + reveal button
        Row(
          children: [
            Expanded(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: List.generate(6, (index) {
                  final filled = index < value.length;
                  final char = filled ? value[index] : '';
                  final display = filled && !_obscured ? char : (filled ? '•' : '');
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => _focusNode.requestFocus(),
                      child: Container(
                        height: 48,
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        decoration: BoxDecoration(
                          color: filled
                              ? theme.colorScheme.primary.withOpacity(0.08)
                              : theme.colorScheme.surfaceContainerHighest
                                  .withOpacity(0.5),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: hasError
                                ? theme.colorScheme.error
                                : filled
                                    ? theme.colorScheme.primary
                                    : theme.colorScheme.outlineVariant,
                            width: hasError ? 1.5 : 1,
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          display,
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
            // Reveal toggle button next to slots
            if (widget.enabled)
              Padding(
                padding: const EdgeInsets.only(left: 4),
                child: IconButton(
                  icon: Icon(
                    _obscured
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                    size: 20,
                  ),
                  onPressed: _toggleObscured,
                  tooltip: _obscured ? 'Show PIN' : 'Hide PIN',
                  visualDensity: VisualDensity.compact,
                ),
              ),
          ],
        ),
        if (hasError) ...[
          const SizedBox(height: 4),
          Text(
            widget.errorText!,
            style: TextStyle(
              fontSize: 12,
              color: theme.colorScheme.error,
            ),
          ),
        ],
      ],
    );
  }
}
