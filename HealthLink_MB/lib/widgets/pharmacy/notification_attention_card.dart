import 'package:flutter/material.dart';

class NotificationAttentionCard extends StatelessWidget {
  const NotificationAttentionCard({
    super.key,
    required this.highlighted,
    required this.onTap,
    required this.child,
  });

  final bool highlighted;
  final VoidCallback? onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    const radius = BorderRadius.all(Radius.circular(12));

    return Card(
      margin: EdgeInsets.zero,
      color: highlighted ? theme.colorScheme.primaryContainer : null,
      shape: RoundedRectangleBorder(
        borderRadius: radius,
        side: highlighted
            ? BorderSide(color: theme.colorScheme.primary, width: 2)
            : BorderSide.none,
      ),
      child: InkWell(borderRadius: radius, onTap: onTap, child: child),
    );
  }
}
