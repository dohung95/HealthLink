import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:HealthLink/providers/auth_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_order_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_request_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_inventory_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_revenue_provider.dart';
import 'package:HealthLink/providers/pharmacy/pharmacy_workflow_provider.dart';
import 'package:HealthLink/screens/pharmacy/pharmacy_main_layout.dart';
import 'package:HealthLink/models/notification/notification_item.dart';
import 'package:HealthLink/services/notification/notification_service.dart';
import 'package:HealthLink/models/pharmacy/pharmacy_work_item.dart';
import 'package:HealthLink/widgets/pharmacy/notification_attention_card.dart';

class _MockAuthProvider extends AuthProvider {
  @override
  bool get isPharmacy => true;

  @override
  String? get accessToken => 'mock-token';

  @override
  String? get userId => 'pharm-1';

  @override
  Map<String, dynamic>? get pharmacyProfile => {
    'pharmacyId': 'pharm-1',
    'name': 'Test Pharmacy',
  };
}

class _NoopWorkflowProvider extends PharmacyWorkflowProvider {
  _NoopWorkflowProvider();

  int _overridePendingRequests = 0;
  int _overridePendingOrders = 0;

  set pendingRequestsCountOverride(int v) => _overridePendingRequests = v;
  set pendingOrdersCountOverride(int v) => _overridePendingOrders = v;

  @override
  int get pendingRequestsCount => _overridePendingRequests;

  @override
  int get pendingOrdersCount => _overridePendingOrders;

  @override
  int get totalBadgeCount => _overridePendingOrders + _overridePendingRequests;

  @override
  void startPolling(String token, String pharmacyId) {
    // no-op in tests to avoid pending timer
  }

  @override
  void stopPolling() {}
}

/// Tracks calls to load() and refresh() for revenue initialization testing.
class _TrackingRevenueProvider extends PharmacyRevenueProvider {
  int loadCallCount = 0;
  int refreshCallCount = 0;

  @override
  Future<void> load({
    required String token,
    required String pharmacyId,
    DateTime? now,
  }) async {
    loadCallCount++;
  }

  @override
  Future<void> refresh({
    required String token,
    required String pharmacyId,
    DateTime? now,
  }) async {
    refreshCallCount++;
  }
}

class _AttentionWorkflowProvider extends _NoopWorkflowProvider {
  @override
  List<PharmacyWorkItem> get workItems => [
    PharmacyWorkItem(
      id: 'work-101',
      pharmacyId: 'pharm-1',
      sourceId: 101,
      sourceType: WorkItemSourceType.consultation,
      workflowStage: 'REVIEW',
      availableActions: const [],
      patientId: 'patient-1',
      patientName: 'Patient One',
      requestId: 101,
      requestStatus: 'PENDING',
      createdAt: DateTime(2026, 7, 14),
    ),
  ];
}

class _RouteTracker extends NavigatorObserver {
  int pushes = 0;

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    pushes++;
    super.didPush(route, previousRoute);
  }
}

Widget _buildTestApp({
  _NoopWorkflowProvider? workflowProvider,
  _TrackingRevenueProvider? revenueProvider,
  NotificationService Function(String token)? notificationServiceFactory,
  NavigatorObserver? navigatorObserver,
}) {
  return MaterialApp(
    navigatorObservers: [if (navigatorObserver != null) navigatorObserver],
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: _MockAuthProvider()),
        ChangeNotifierProvider<PharmacyWorkflowProvider>.value(
          value: workflowProvider ?? _NoopWorkflowProvider(),
        ),
        ChangeNotifierProvider<PharmacyOrderProvider>(
          create: (_) => PharmacyOrderProvider(),
        ),
        ChangeNotifierProvider<PharmacyRequestProvider>(
          create: (_) => PharmacyRequestProvider(),
        ),
        ChangeNotifierProvider<PharmacyInventoryProvider>(
          create: (_) => PharmacyInventoryProvider(),
        ),
        ChangeNotifierProvider<PharmacyRevenueProvider>.value(
          value: revenueProvider ?? PharmacyRevenueProvider(),
        ),
      ],
      child: PharmacyMainLayout(
        notificationServiceFactory: notificationServiceFactory,
      ),
    ),
  );
}

class _FakeNotificationService extends NotificationService {
  _FakeNotificationService(this.items) : super(accessToken: 'mock-token');

  final List<NotificationItem> items;

  @override
  Future<PagedNotifications> getNotifications({int page = 0, int size = 20}) {
    return Future.value(
      PagedNotifications(
        items: items,
        page: 0,
        size: items.length,
        totalPages: 1,
        totalElements: items.length,
      ),
    );
  }

  @override
  Future<int> getUnreadCount() async =>
      items.where((item) => !item.read).length;

  @override
  Future<void> markAsRead(int notificationId) async {}
}

NotificationItem _notification({
  required int id,
  required String title,
  required String type,
  required int relatedId,
}) {
  return NotificationItem(
    notificationId: id,
    title: title,
    message: 'Notification message',
    type: type,
    priority: 'NORMAL',
    read: true,
    createdAt: DateTime(2026, 7, 14),
    relatedId: relatedId,
  );
}

ListTile _notificationTile(WidgetTester tester, NotificationItem notification) {
  return tester.widget<ListTile>(
    find.ancestor(
      of: find.text(notification.title),
      matching: find.byType(ListTile),
    ),
  );
}

void main() {
  group('PharmacyMainLayout shell', () {
    testWidgets('renders five navigation destinations', (tester) async {
      await tester.pumpWidget(_buildTestApp());

      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Requests'), findsOneWidget);
      expect(find.text('Orders'), findsOneWidget);
      expect(find.text('Inventory'), findsOneWidget);
      expect(find.text('More'), findsOneWidget);
    });

    testWidgets('default selected index is Home (0)', (tester) async {
      await tester.pumpWidget(_buildTestApp());

      final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.selectedIndex, 0);
    });

    testWidgets('tapping Requests switches to tab index 1', (tester) async {
      await tester.pumpWidget(_buildTestApp());

      await tester.tap(find.text('Requests'));
      await tester.pump();

      final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.selectedIndex, 1);
    });

    testWidgets('tapping Orders switches to tab index 2', (tester) async {
      await tester.pumpWidget(_buildTestApp());

      await tester.tap(find.text('Orders'));
      await tester.pump();

      final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.selectedIndex, 2);
    });

    testWidgets('tapping Inventory switches to tab index 3', (tester) async {
      await tester.pumpWidget(_buildTestApp());

      await tester.tap(find.text('Inventory'));
      await tester.pump();

      final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.selectedIndex, 3);
    });

    testWidgets('tapping More switches to tab index 4', (tester) async {
      await tester.pumpWidget(_buildTestApp());

      await tester.tap(find.text('More'));
      await tester.pump();

      final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
      expect(navBar.selectedIndex, 4);
    });
  });

  group('badge counts on tabs', () {
    testWidgets('shows Badge widget when counts > 0', (tester) async {
      final provider = _NoopWorkflowProvider();
      provider.pendingRequestsCountOverride = 2;
      provider.pendingOrdersCountOverride = 3;

      await tester.pumpWidget(_buildTestApp(workflowProvider: provider));

      expect(find.byType(Badge), findsAtLeast(1));
    });

    testWidgets('no Badge when all counts are zero', (tester) async {
      final provider = _NoopWorkflowProvider();
      provider.pendingRequestsCountOverride = 0;
      provider.pendingOrdersCountOverride = 0;

      await tester.pumpWidget(_buildTestApp(workflowProvider: provider));

      expect(find.byType(Badge), findsNothing);
    });
  });

  group('notification bell', () {
    testWidgets('appBar has notification bell icon', (tester) async {
      await tester.pumpWidget(_buildTestApp());

      expect(find.byIcon(Icons.notifications_outlined), findsOneWidget);
    });

    testWidgets('request notification closes sheet and selects Requests', (
      tester,
    ) async {
      final routeTracker = _RouteTracker();
      final notification = _notification(
        id: 1,
        title: 'Request notification',
        type: 'REQUEST',
        relatedId: 101,
      );
      await tester.pumpWidget(
        _buildTestApp(
          notificationServiceFactory: (_) =>
              _FakeNotificationService([notification]),
          navigatorObserver: routeTracker,
        ),
      );

      await tester.tap(find.byIcon(Icons.notifications_outlined));
      await tester.pump();
      await tester.pump();
      final pushesBeforeNotificationTap = routeTracker.pushes;
      _notificationTile(tester, notification).onTap!.call();
      await tester.pump();

      expect(find.text('Notifications'), findsNothing);
      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        1,
      );
      expect(routeTracker.pushes, pushesBeforeNotificationTap);
    });

    testWidgets('order notification closes sheet and selects Orders', (
      tester,
    ) async {
      final notification = _notification(
        id: 2,
        title: 'Order notification',
        type: 'ORDER',
        relatedId: 201,
      );
      await tester.pumpWidget(
        _buildTestApp(
          notificationServiceFactory: (_) =>
              _FakeNotificationService([notification]),
        ),
      );

      await tester.tap(find.byIcon(Icons.notifications_outlined));
      await tester.pump();
      await tester.pump();
      _notificationTile(tester, notification).onTap!.call();
      await tester.pump();

      expect(find.text('Notifications'), findsNothing);
      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        2,
      );
    });

    testWidgets('inventory notification closes sheet and selects Inventory', (
      tester,
    ) async {
      final notification = _notification(
        id: 3,
        title: 'Inventory notification',
        type: 'STOCK_WARNING',
        relatedId: 301,
      );
      await tester.pumpWidget(
        _buildTestApp(
          notificationServiceFactory: (_) =>
              _FakeNotificationService([notification]),
        ),
      );

      await tester.tap(find.byIcon(Icons.notifications_outlined));
      await tester.pump();
      await tester.pump();
      _notificationTile(tester, notification).onTap!.call();
      await tester.pump();

      expect(find.text('Notifications'), findsNothing);
      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        3,
      );
    });

    testWidgets('tapping the same notification twice resets attention', (
      tester,
    ) async {
      final notification = _notification(
        id: 4,
        title: 'Repeat request notification',
        type: 'REQUEST',
        relatedId: 101,
      );
      await tester.pumpWidget(
        _buildTestApp(
          workflowProvider: _AttentionWorkflowProvider(),
          notificationServiceFactory: (_) =>
              _FakeNotificationService([notification]),
        ),
      );

      await tester.tap(find.byIcon(Icons.notifications_outlined));
      await tester.pump();
      await tester.pump();
      _notificationTile(tester, notification).onTap!.call();
      await tester.pump(const Duration(seconds: 3));

      await tester.tap(find.byIcon(Icons.notifications_outlined));
      await tester.pump();
      await tester.pump();
      _notificationTile(tester, notification).onTap!.call();
      await tester.pump(const Duration(seconds: 2));

      final targetCards = tester.widgetList<NotificationAttentionCard>(
        find.byKey(const ValueKey('request-101')),
      );
      expect(targetCards.any((card) => card.highlighted), isTrue);
    });
  });

  group('revenue initialization', () {
    testWidgets('loads revenue once on startup', (tester) async {
      final revenue = _TrackingRevenueProvider();
      await tester.pumpWidget(_buildTestApp(revenueProvider: revenue));
      // Allow post-frame callback to fire
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(
        revenue.loadCallCount + revenue.refreshCallCount,
        1,
        reason: 'revenue must be loaded exactly once on startup',
      );
      // Refresh is more appropriate for shell-level initialization
      expect(
        revenue.refreshCallCount,
        1,
        reason: 'revenue refresh should be called on startup',
      );
    });

    testWidgets('does not reload revenue on tab switch', (tester) async {
      final revenue = _TrackingRevenueProvider();
      await tester.pumpWidget(_buildTestApp(revenueProvider: revenue));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Switch to Requests tab
      await tester.tap(find.text('Requests'));
      await tester.pump();

      // Switch back to Home
      await tester.tap(find.text('Home'));
      await tester.pump();

      // Count should remain 1 — no additional load on tab switch
      expect(
        revenue.loadCallCount + revenue.refreshCallCount,
        1,
        reason: 'revenue must not reload on tab switch',
      );
    });
  });
}
