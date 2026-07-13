import '../../models/pharmacy/pharmacy_order.dart';
import '../../models/pharmacy/pharmacy_work_item.dart';
import '../../models/pharmacy/pharmacy_inventory_item.dart';

class PharmacyOverviewMetrics {
  PharmacyOverviewMetrics._();

  static const _terminalStatuses = {'COMPLETED', 'CANCELLED'};

  static int activeOrdersCount(List<PharmacyOrder> orders) {
    return orders.where((o) => !_terminalStatuses.contains(o.status)).length;
  }

  static int attentionRequestsCount(List<PharmacyWorkItem> workItems) {
    return workItems.where((w) => w.requestStatus == 'PENDING').length;
  }

  static ({int lowStock, int expiring}) inventoryRiskCounts(
      List<PharmacyInventoryItem> items) {
    int lowStock = 0, expiring = 0;
    for (final item in items) {
      if (item.isLowStock) lowStock++;
      if (item.isExpiringSoon) expiring++;
    }
    return (lowStock: lowStock, expiring: expiring);
  }

  static int inventoryRiskTotal(List<PharmacyInventoryItem> items) {
    final counts = inventoryRiskCounts(items);
    return counts.lowStock + counts.expiring;
  }

  static ({int completed, int cancelled}) terminalOrderCounts(
      List<PharmacyOrder> orders) {
    int completed = 0, cancelled = 0;
    for (final o in orders) {
      if (o.status == 'COMPLETED') completed++;
      if (o.status == 'CANCELLED') cancelled++;
    }
    return (completed: completed, cancelled: cancelled);
  }

  static double completionRate(List<PharmacyOrder> orders) {
    final counts = terminalOrderCounts(orders);
    final total = counts.completed + counts.cancelled;
    if (total == 0) return 0;
    return counts.completed / total;
  }

  static double revenueTotal(List<PharmacyOrder> orders) {
    double total = 0;
    for (final o in orders) {
      if (o.paymentStatus == 'PAID') {
        total += o.pharmacyEarning ?? o.totalAmount;
      }
    }
    return total;
  }

  static Map<String, double> revenueByWeek(List<PharmacyOrder> orders) {
    return _bucketRevenue(orders, (d) {
      final weekDay = d.weekday;
      final weekStart = d.subtract(Duration(days: weekDay - 1));
      return '${weekStart.year}-${weekStart.month.toString().padLeft(2, '0')}-${weekStart.day.toString().padLeft(2, '0')}';
    });
  }

  static Map<String, double> revenueByMonth(List<PharmacyOrder> orders) {
    return _bucketRevenue(
        orders, (d) => '${d.year}-${d.month.toString().padLeft(2, '0')}');
  }

  static Map<String, double> revenueByYear(List<PharmacyOrder> orders) {
    return _bucketRevenue(orders, (d) => d.year.toString());
  }

  static Map<String, double> _bucketRevenue(
    List<PharmacyOrder> orders,
    String Function(DateTime) keyFn,
  ) {
    final buckets = <String, double>{};
    for (final o in orders) {
      if (o.paymentStatus != 'PAID') continue;
      final date = o.paidAt ?? o.createdAt;
      final key = keyFn(date);
      buckets.update(
        key,
        (v) => v + (o.pharmacyEarning ?? o.totalAmount),
        ifAbsent: () => o.pharmacyEarning ?? o.totalAmount,
      );
    }
    return buckets;
  }

  static List<PharmacyWorkItem> workflowQueue(
      List<PharmacyWorkItem> workItems) {
    final sorted = List<PharmacyWorkItem>.from(workItems);
    sorted.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return sorted;
  }

  static List<String> operationalInsights({
    required List<PharmacyOrder> orders,
    required List<PharmacyWorkItem> workItems,
    required List<PharmacyInventoryItem> inventoryItems,
  }) {
    final insights = <String>[];
    final active = activeOrdersCount(orders);
    final pending = attentionRequestsCount(workItems);
    final risk = inventoryRiskCounts(inventoryItems);
    final rate = completionRate(orders);
    final total = revenueTotal(orders);

    if (active > 0) {
      insights.add('$active active orders in progress.');
    }
    if (pending > 0) {
      insights.add('$pending requests await your attention.');
    }
    if (risk.lowStock > 0) {
      insights.add('${risk.lowStock} items are low on stock.');
    }
    if (risk.expiring > 0) {
      insights.add('${risk.expiring} items expire within 30 days.');
    }
    if (rate > 0) {
      insights.add(
          'Completion rate: ${(rate * 100).toStringAsFixed(0)}%.');
    }
    if (total > 0) {
      insights.add(
          'Total collected revenue: \$${total.toStringAsFixed(2)}.');
    }
    if (insights.isEmpty) {
      insights.add('No data yet. Start by processing requests.');
    }
    return insights;
  }
}
