import 'package:flutter/material.dart';

class OrderStatusChip extends StatelessWidget {
  final String status;
  const OrderStatusChip({super.key, required this.status});

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
      case 'CONFIRMED':
        return _StatusChipConfig('CONFIRMED', Colors.blue);
      case 'PREPARING':
        return _StatusChipConfig('PREPARING', Colors.indigo);
      case 'READY':
        return _StatusChipConfig('READY', Colors.teal);
      case 'SHIPPING':
        return _StatusChipConfig('SHIPPING', Colors.cyan);
      case 'DELIVERED':
        return _StatusChipConfig('DELIVERED', Colors.green);
      case 'COMPLETED':
        return _StatusChipConfig('COMPLETED', Colors.green.shade700);
      case 'CANCELLED':
        return _StatusChipConfig('CANCELLED', Colors.red);
      case 'REVISION_REQUESTED':
        return _StatusChipConfig('REVISION REQ.', Colors.deepPurple);
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
