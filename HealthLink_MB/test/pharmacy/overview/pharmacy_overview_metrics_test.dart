import 'package:flutter_test/flutter_test.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_order.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_work_item.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_inventory_item.dart';
import 'package:HealthLink/utils/pharmacy/pharmacy_overview_metrics.dart';

PharmacyOrder _order({
  required String status,
  String? paymentStatus,
  double? pharmacyEarning,
  double totalAmount = 100,
  String? paidAt,
  String createdAt = '2026-06-01',
}) {
  return PharmacyOrder(
    orderId: 1,
    orderNumber: 'ORD-001',
    pharmacyId: 'pharm-1',
    pharmacyName: 'Pharmacy',
    patientId: 'pat-1',
    patientName: 'Patient',
    status: status,
    paymentStatus: paymentStatus,
    pharmacyEarning: pharmacyEarning,
    totalAmount: totalAmount,
    medicineAmount: totalAmount,
    items: [],
    createdAt: paidAt != null
        ? DateTime.parse(paidAt)
        : DateTime.parse(createdAt),
    paidAt: paidAt != null ? DateTime.parse(paidAt) : null,
  );
}

PharmacyWorkItem _workItem({
  required String requestStatus,
}) {
  return PharmacyWorkItem(
    id: 'wi-1',
    pharmacyId: 'pharm-1',
    sourceId: 1,
    sourceType: WorkItemSourceType.consultation,
    workflowStage: 'REVIEW',
    availableActions: const ['ACCEPT'],
    patientId: 'pat-1',
    patientName: 'Patient',
    requestStatus: requestStatus,
    createdAt: DateTime.now(),
  );
}

PharmacyInventoryItem _inventoryItem({
  int quantity = 50,
  int? minimumStock,
  String? expiryDate,
}) {
  return PharmacyInventoryItem(
    inventoryId: 1,
    medicineId: 1,
    medicineName: 'Test Med',
    quantity: quantity,
    reservedQuantity: 0,
    minimumStock: minimumStock,
    expiryDate: expiryDate,
    active: true,
  );
}

void main() {
  group('activeOrdersCount', () {
    test('returns count of non-terminal orders', () {
      final orders = [
        _order(status: 'PENDING'),
        _order(status: 'CONFIRMED'),
        _order(status: 'COMPLETED'),
        _order(status: 'CANCELLED'),
        _order(status: 'PREPARING'),
      ];
      expect(PharmacyOverviewMetrics.activeOrdersCount(orders), 3);
    });

    test('returns 0 for empty list', () {
      expect(PharmacyOverviewMetrics.activeOrdersCount([]), 0);
    });

    test('returns 0 when all orders are terminal', () {
      final orders = [
        _order(status: 'COMPLETED'),
        _order(status: 'CANCELLED'),
      ];
      expect(PharmacyOverviewMetrics.activeOrdersCount(orders), 0);
    });
  });

  group('attentionRequestsCount', () {
    test('counts work items with PENDING request status', () {
      final items = [
        _workItem(requestStatus: 'PENDING'),
        _workItem(requestStatus: 'PENDING'),
        _workItem(requestStatus: 'RESOLVED'),
      ];
      expect(PharmacyOverviewMetrics.attentionRequestsCount(items), 2);
    });

    test('returns 0 for empty list', () {
      expect(PharmacyOverviewMetrics.attentionRequestsCount([]), 0);
    });
  });

  group('inventoryRiskCounts', () {
    test('returns lowStock and expiring counts', () {
      final items = [
        _inventoryItem(quantity: 5, minimumStock: 10),
        _inventoryItem(quantity: 20, minimumStock: 10),
        _inventoryItem(
            quantity: 10,
            expiryDate:
                DateTime.now().add(const Duration(days: 15)).toIso8601String()),
      ];
      final counts = PharmacyOverviewMetrics.inventoryRiskCounts(items);
      expect(counts.lowStock, 1);
      expect(counts.expiring, 1);
    });

    test('inventoryRiskTotal sums lowStock + expiring', () {
      final items = [
        _inventoryItem(quantity: 5, minimumStock: 10),
        _inventoryItem(
            quantity: 10,
            expiryDate:
                DateTime.now().add(const Duration(days: 15)).toIso8601String()),
      ];
      expect(PharmacyOverviewMetrics.inventoryRiskTotal(items), 2);
    });

    test('returns zeros for items with no risk', () {
      final items = [
        _inventoryItem(quantity: 50, minimumStock: 10),
        _inventoryItem(
            quantity: 10,
            expiryDate:
                DateTime.now().add(const Duration(days: 90)).toIso8601String()),
      ];
      final counts = PharmacyOverviewMetrics.inventoryRiskCounts(items);
      expect(counts.lowStock, 0);
      expect(counts.expiring, 0);
    });

    test('handles empty list', () {
      final counts = PharmacyOverviewMetrics.inventoryRiskCounts([]);
      expect(counts.lowStock, 0);
      expect(counts.expiring, 0);
      expect(PharmacyOverviewMetrics.inventoryRiskTotal([]), 0);
    });
  });

  group('terminalOrderCounts', () {
    test('counts completed and cancelled orders', () {
      final orders = [
        _order(status: 'COMPLETED'),
        _order(status: 'COMPLETED'),
        _order(status: 'CANCELLED'),
        _order(status: 'PENDING'),
      ];
      final counts = PharmacyOverviewMetrics.terminalOrderCounts(orders);
      expect(counts.completed, 2);
      expect(counts.cancelled, 1);
    });
  });

  group('completionRate', () {
    test('returns ratio of completed to total terminal orders', () {
      final orders = [
        _order(status: 'COMPLETED'),
        _order(status: 'COMPLETED'),
        _order(status: 'COMPLETED'),
        _order(status: 'CANCELLED'),
      ];
      expect(PharmacyOverviewMetrics.completionRate(orders), 0.75);
    });

    test('returns 0 when no terminal orders', () {
      final orders = [_order(status: 'PENDING')];
      expect(PharmacyOverviewMetrics.completionRate(orders), 0);
    });

    test('returns 1 when all terminal orders are completed', () {
      final orders = [
        _order(status: 'COMPLETED'),
        _order(status: 'COMPLETED'),
      ];
      expect(PharmacyOverviewMetrics.completionRate(orders), 1);
    });

    test('returns 0 when all terminal orders are cancelled', () {
      final orders = [
        _order(status: 'CANCELLED'),
        _order(status: 'CANCELLED'),
      ];
      expect(PharmacyOverviewMetrics.completionRate(orders), 0);
    });

    test('returns 0 for empty list', () {
      expect(PharmacyOverviewMetrics.completionRate([]), 0);
    });
  });

  group('revenueTotal', () {
    test('sums pharmacyEarning for PAID orders', () {
      final orders = [
        _order(status: 'COMPLETED', paymentStatus: 'PAID', pharmacyEarning: 50),
        _order(status: 'COMPLETED', paymentStatus: 'PAID', pharmacyEarning: 30),
        _order(status: 'PENDING', paymentStatus: 'UNPAID'),
      ];
      expect(PharmacyOverviewMetrics.revenueTotal(orders), 80);
    });

    test('falls back to totalAmount when pharmacyEarning is null', () {
      final orders = [
        _order(status: 'COMPLETED', paymentStatus: 'PAID', totalAmount: 100),
      ];
      expect(PharmacyOverviewMetrics.revenueTotal(orders), 100);
    });

    test('returns 0 for orders with no PAID payment status', () {
      final orders = [
        _order(status: 'PENDING', paymentStatus: 'UNPAID'),
        _order(status: 'COMPLETED', paymentStatus: 'REFUNDED'),
      ];
      expect(PharmacyOverviewMetrics.revenueTotal(orders), 0);
    });

    test('returns 0 for empty list', () {
      expect(PharmacyOverviewMetrics.revenueTotal([]), 0);
    });
  });

  group('revenueByWeek', () {
    test('buckets paid orders by week-start date', () {
      final orders = [
        _order(
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            pharmacyEarning: 100,
            paidAt: '2026-06-01'),
        _order(
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            pharmacyEarning: 50,
            paidAt: '2026-06-01'),
        _order(
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            paidAt: '2026-06-01'),
      ];
      final byWeek = PharmacyOverviewMetrics.revenueByWeek(orders);
      expect(byWeek.length, 1);
      final key = byWeek.keys.first;
      expect(byWeek[key], 150);
    });

    test('returns empty map for no paid orders', () {
      expect(PharmacyOverviewMetrics.revenueByWeek([]), isEmpty);
    });
  });

  group('revenueByMonth', () {
    test('buckets paid orders by year-month', () {
      final orders = [
        _order(
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            pharmacyEarning: 100,
            paidAt: '2026-06-15'),
        _order(
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            pharmacyEarning: 200,
            paidAt: '2026-07-01'),
      ];
      final byMonth = PharmacyOverviewMetrics.revenueByMonth(orders);
      expect(byMonth['2026-06'], 100);
      expect(byMonth['2026-07'], 200);
    });

    test('returns empty map for no paid orders', () {
      expect(PharmacyOverviewMetrics.revenueByMonth([]), isEmpty);
    });
  });

  group('revenueByYear', () {
    test('buckets paid orders by year', () {
      final orders = [
        _order(
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            pharmacyEarning: 300,
            paidAt: '2025-01-01'),
        _order(
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            pharmacyEarning: 400,
            paidAt: '2026-06-15'),
      ];
      final byYear = PharmacyOverviewMetrics.revenueByYear(orders);
      expect(byYear['2025'], 300);
      expect(byYear['2026'], 400);
    });
  });

  group('workflowQueue', () {
    test('sorts work items by createdAt descending', () {
      final items = [
        _workItem(requestStatus: 'PENDING'),
      ];
      final sorted = PharmacyOverviewMetrics.workflowQueue(items);
      expect(sorted.length, 1);
    });

    test('handles empty list', () {
      expect(PharmacyOverviewMetrics.workflowQueue([]), isEmpty);
    });
  });

  group('operationalInsights', () {
    test('generates insights from available data', () {
      final orders = [
        _order(status: 'PENDING'),
        _order(status: 'COMPLETED', paymentStatus: 'PAID',
            pharmacyEarning: 50),
      ];
      final workItems = [
        _workItem(requestStatus: 'PENDING'),
        _workItem(requestStatus: 'PENDING'),
      ];
      final inventory = [
        _inventoryItem(quantity: 5, minimumStock: 10),
        _inventoryItem(
            quantity: 10,
            expiryDate:
                DateTime.now().add(const Duration(days: 15)).toIso8601String()),
      ];

      final insights = PharmacyOverviewMetrics.operationalInsights(
        orders: orders,
        workItems: workItems,
        inventoryItems: inventory,
      );

      expect(insights, isNotEmpty);
      expect(insights.any((i) => i.contains('active orders')), isTrue);
      expect(insights.any((i) => i.contains('await your attention')), isTrue);
      expect(insights.any((i) => i.contains('low on stock')), isTrue);
      expect(insights.any((i) => i.contains('expire within 30 days')), isTrue);
    });

    test('returns fallback insight when no data', () {
      final insights = PharmacyOverviewMetrics.operationalInsights(
        orders: [],
        workItems: [],
        inventoryItems: [],
      );
      expect(insights.length, 1);
      expect(insights[0], contains('No data yet'));
    });
  });
}
