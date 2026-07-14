import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_inventory_item.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_order.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_work_item.dart';
import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_inventory_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_order_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_workflow_provider.dart';
import 'package:HealthLink/screens/pharmacy/pharmacy_inventory_screen.dart';
import 'package:HealthLink/screens/pharmacy/pharmacy_orders_screen.dart';
import 'package:HealthLink/screens/pharmacy/pharmacy_requests_screen.dart';
import 'package:HealthLink/utils/pharmacy/pharmacy_notification_target.dart';
import 'package:HealthLink/widgets/pharmacy/notification_attention_card.dart';

class _Auth extends AuthProvider {
  @override
  String? get accessToken => 'token';

  @override
  String? get userId => 'pharmacy-1';

  @override
  Map<String, dynamic>? get pharmacyProfile => const {
    'pharmacyId': 'pharmacy-1',
  };
}

class _Workflow extends PharmacyWorkflowProvider {
  _Workflow(this._items);

  final List<PharmacyWorkItem> _items;
  int refreshCalls = 0;

  @override
  List<PharmacyWorkItem> get workItems => _items;

  @override
  Future<void> refresh(String token, String pharmacyId) async {
    refreshCalls++;
    notifyListeners();
  }
}

class _Orders extends PharmacyOrderProvider {
  _Orders(this._items);

  final List<PharmacyOrder> _items;
  bool _flowView = true;

  @override
  List<PharmacyOrder> get orders => _items;

  @override
  Map<String, List<PharmacyOrder>> get flowGroupedOrders {
    final grouped = <String, List<PharmacyOrder>>{};
    for (final order in _items.where(
      (item) => const {
        'PENDING',
        'CONFIRMED',
        'PREPARING',
        'READY',
        'SHIPPING',
        'DELIVERED',
      }.contains(item.status),
    )) {
      grouped.putIfAbsent(order.status, () => []).add(order);
    }
    return grouped;
  }

  @override
  bool get flowView => _flowView;

  @override
  void setFlowView(bool flowView) {
    _flowView = flowView;
    notifyListeners();
  }

  @override
  Future<void> fetchOrders(String token, String pharmacyId) async {}
}

class _Inventory extends PharmacyInventoryProvider {
  _Inventory(this._items);

  final List<PharmacyInventoryItem> _items;
  InventoryFilter _filter = const InventoryFilter();
  int refreshCalls = 0;

  @override
  List<PharmacyInventoryItem> get items => _items;

  @override
  InventoryFilter get filter => _filter;

  @override
  void setFilter(InventoryFilter filter) {
    _filter = filter;
    notifyListeners();
  }

  @override
  Future<void> refresh(String token) async {
    refreshCalls++;
    notifyListeners();
  }
}

PharmacyWorkItem _workItem({int? requestId, int? orderId}) => PharmacyWorkItem(
  id: 'work-${requestId ?? orderId}',
  pharmacyId: 'pharmacy-1',
  sourceId: requestId ?? orderId ?? 0,
  sourceType: orderId == null
      ? WorkItemSourceType.consultation
      : WorkItemSourceType.revision,
  workflowStage: 'REVIEW',
  availableActions: const [],
  patientId: 'patient-1',
  patientName: 'Patient One',
  requestId: requestId,
  orderId: orderId,
  requestStatus: requestId == null ? null : 'PENDING',
  orderStatus: orderId == null ? null : 'REVISION_REQUESTED',
  createdAt: DateTime(2026, 7, 14),
);

PharmacyOrder _order({required int id, required String status}) =>
    PharmacyOrder(
      orderId: id,
      orderNumber: 'ORD-$id',
      pharmacyId: 'pharmacy-1',
      pharmacyName: 'Pharmacy One',
      patientId: 'patient-1',
      patientName: 'Patient One',
      status: status,
      totalAmount: 10,
      createdAt: DateTime(2026, 7, 14),
    );

PharmacyInventoryItem _inventory(int id) => PharmacyInventoryItem(
  inventoryId: id,
  medicineId: id,
  medicineName: 'Medicine $id',
  quantity: 2,
  minimumStock: 5,
);

NotificationAttention _attention({
  required int tabIndex,
  required String detailType,
  String? detailId,
  required int sequence,
}) => NotificationAttention(
  target: NotificationTarget(
    tabIndex: tabIndex,
    detailType: detailType,
    detailId: detailId,
  ),
  sequence: sequence,
);

Widget _requestsApp(
  _Workflow workflow,
  ValueNotifier<NotificationAttention?> attention,
) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<AuthProvider>.value(value: _Auth()),
      ChangeNotifierProvider<PharmacyWorkflowProvider>.value(value: workflow),
    ],
    child: MaterialApp(
      home: PharmacyRequestsScreen(notificationAttention: attention),
    ),
  );
}

Widget _ordersApp(
  _Orders orders,
  ValueNotifier<NotificationAttention?> attention,
) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<AuthProvider>.value(value: _Auth()),
      ChangeNotifierProvider<PharmacyOrderProvider>.value(value: orders),
    ],
    child: MaterialApp(
      home: PharmacyOrdersScreen(notificationAttention: attention),
    ),
  );
}

Widget _inventoryApp(
  _Inventory inventory,
  ValueNotifier<NotificationAttention?> attention,
) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<AuthProvider>.value(value: _Auth()),
      ChangeNotifierProvider<PharmacyInventoryProvider>.value(value: inventory),
    ],
    child: MaterialApp(
      home: PharmacyInventoryScreen(notificationAttention: attention),
    ),
  );
}

NotificationAttentionCard _card(WidgetTester tester, String key) {
  return tester.widget<NotificationAttentionCard>(find.byKey(ValueKey(key)));
}

void main() {
  testWidgets('requests highlights request and revision order matches', (
    tester,
  ) async {
    final attention = ValueNotifier<NotificationAttention?>(null);
    final workflow = _Workflow([
      _workItem(requestId: 11),
      _workItem(orderId: 21),
    ]);
    await tester.pumpWidget(_requestsApp(workflow, attention));

    attention.value = _attention(
      tabIndex: PharmacyNotificationTarget.tabRequests,
      detailType: 'request',
      detailId: '11',
      sequence: 1,
    );
    await tester.pump();
    expect(_card(tester, 'request-11').highlighted, isTrue);

    attention.value = _attention(
      tabIndex: PharmacyNotificationTarget.tabRequests,
      detailType: 'request-order',
      detailId: '21',
      sequence: 2,
    );
    await tester.pump();
    expect(_card(tester, 'request-order-21').highlighted, isTrue);
  });

  testWidgets(
    'attention remains for four seconds and each sequence resets it',
    (tester) async {
      final attention = ValueNotifier<NotificationAttention?>(null);
      final workflow = _Workflow([_workItem(requestId: 11)]);
      await tester.pumpWidget(_requestsApp(workflow, attention));

      attention.value = _attention(
        tabIndex: PharmacyNotificationTarget.tabRequests,
        detailType: 'request',
        detailId: '11',
        sequence: 1,
      );
      await tester.pump(const Duration(seconds: 3));
      attention.value = _attention(
        tabIndex: PharmacyNotificationTarget.tabRequests,
        detailType: 'request',
        detailId: '11',
        sequence: 2,
      );
      await tester.pump(const Duration(seconds: 2));
      expect(_card(tester, 'request-11').highlighted, isTrue);

      await tester.pump(const Duration(seconds: 2));
      expect(_card(tester, 'request-11').highlighted, isFalse);
    },
  );

  testWidgets('missing request after refresh displays inactive item message', (
    tester,
  ) async {
    final attention = ValueNotifier<NotificationAttention?>(null);
    final workflow = _Workflow([]);
    await tester.pumpWidget(_requestsApp(workflow, attention));

    attention.value = _attention(
      tabIndex: PharmacyNotificationTarget.tabRequests,
      detailType: 'request',
      detailId: '404',
      sequence: 1,
    );
    await tester.pump();
    await tester.pump();

    expect(workflow.refreshCalls, 1);
    expect(find.text('Related item is no longer active'), findsOneWidget);
  });

  testWidgets('orders switches from Flow to History before highlighting', (
    tester,
  ) async {
    final attention = ValueNotifier<NotificationAttention?>(null);
    final orders = _Orders([_order(id: 31, status: 'COMPLETED')]);
    await tester.pumpWidget(_ordersApp(orders, attention));

    attention.value = _attention(
      tabIndex: PharmacyNotificationTarget.tabOrders,
      detailType: 'order',
      detailId: '31',
      sequence: 1,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(orders.flowView, isFalse);
    expect(_card(tester, 'order-31').highlighted, isTrue);
  });

  testWidgets(
    'inventory targets an item and low stock preserves refresh behavior',
    (tester) async {
      final attention = ValueNotifier<NotificationAttention?>(null);
      final inventory = _Inventory([_inventory(41)]);
      await tester.pumpWidget(_inventoryApp(inventory, attention));

      attention.value = _attention(
        tabIndex: PharmacyNotificationTarget.tabInventory,
        detailType: 'inventory',
        detailId: '41',
        sequence: 1,
      );
      await tester.pump();
      expect(_card(tester, 'inventory-41').highlighted, isTrue);

      attention.value = _attention(
        tabIndex: PharmacyNotificationTarget.tabInventory,
        detailType: 'inventory-low-stock',
        sequence: 2,
      );
      await tester.pump();
      await tester.pump();

      expect(inventory.filter.lowStock, isTrue);
      expect(inventory.refreshCalls, greaterThanOrEqualTo(1));
    },
  );
}
