import 'package:flutter/material.dart';

class RequestStatusChip extends StatelessWidget {
  final String status;
  const RequestStatusChip({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final config = _getConfig(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: config.color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: config.color.withOpacity(0.3)),
      ),
      child: Text(
        config.label,
        style: TextStyle(
          color: config.color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  _StatusChipConfig _getConfig(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return _StatusChipConfig('PENDING', Colors.orange);
      case 'IN_REVIEW':
        return _StatusChipConfig('IN REVIEW', Colors.blue);
      case 'ORDER_CREATED':
        return _StatusChipConfig('ORDER CREATED', Colors.green);
      case 'CANCELLED':
        return _StatusChipConfig('CANCELLED', Colors.red);
      case 'NEED_MORE_INFO':
        return _StatusChipConfig('NEED INFO', Colors.deepPurple);
      default:
        return _StatusChipConfig(status, Colors.grey);
    }
  }
}

class _StatusChipConfig {
  final String label;
  final Color color;
  const _StatusChipConfig(this.label, this.color);
}
