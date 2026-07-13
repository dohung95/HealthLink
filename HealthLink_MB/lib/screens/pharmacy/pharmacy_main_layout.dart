import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../../config/api_config.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pharmacy/pharmacy_workflow_provider.dart';
import '../../providers/pharmacy/pharmacy_revenue_provider.dart';
import 'pharmacy_dashboard_screen.dart';
import 'pharmacy_orders_screen.dart';
import 'pharmacy_requests_screen.dart';
import 'pharmacy_inventory_screen.dart';
import 'pharmacy_more_screen.dart';
import 'pharmacy_notification_center_sheet.dart';

class PharmacyMainLayout extends StatefulWidget {
  const PharmacyMainLayout({super.key});

  @override
  State<PharmacyMainLayout> createState() => _PharmacyMainLayoutState();
}

class _PharmacyMainLayoutState extends State<PharmacyMainLayout> {
  int _currentIndex = 0;
  int _unreadCount = 0;
  int? _lastNotifiedBadgeTotal;
  Timer? _notifPollTimer;
  PharmacyWorkflowProvider? _workflowProvider;
  bool _revenueInitialized = false;

  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      PharmacyDashboardScreen(
        onNavigate: (i) => setState(() => _currentIndex = i),
      ),
      const PharmacyRequestsScreen(),
      const PharmacyOrdersScreen(),
      const PharmacyInventoryScreen(),
      const PharmacyMoreScreen(),
    ];

    WidgetsBinding.instance
        .addPostFrameCallback((_) => _startPolling());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _workflowProvider ??= context.read<PharmacyWorkflowProvider>();
  }

  void _startPolling() {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null || !auth.isPharmacy) return;
    final pharmacyId =
        auth.pharmacyProfile?['pharmacyId']?.toString() ?? auth.userId!;

    _workflowProvider?.startPolling(auth.accessToken!, pharmacyId);

    // Load revenue once on startup. Guard prevents re-fetching
    // on widget rebuilds or tab switches.
    if (!_revenueInitialized) {
      _revenueInitialized = true;
      context.read<PharmacyRevenueProvider>().refresh(
        token: auth.accessToken!,
        pharmacyId: pharmacyId,
      );
    }

    _pollUnreadCount(auth.accessToken!);
    _notifPollTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _pollUnreadCount(auth.accessToken!),
    );
  }

  Future<void> _pollUnreadCount(String token) async {
    try {
      final res = await http
          .get(
            Uri.parse(ApiConfig.notificationUnreadCount),
            headers: {
              'Authorization': 'Bearer $token',
              'Accept': 'application/json',
            },
          )
          .timeout(ApiConfig.connectTimeout);
      if (res.statusCode == 200) {
        final count = jsonDecode(res.body)['count'] as int? ?? 0;
        if (mounted) setState(() => _unreadCount = count);
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _notifPollTimer?.cancel();
    _workflowProvider?.stopPolling();
    super.dispose();
  }

  void _showNotificationCenter() {
    final auth = context.read<AuthProvider>();
    final token = auth.accessToken;
    if (token == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => PharmacyNotificationCenterSheet(
        onNavigate: (target) {
          Navigator.pop(context);
          setState(() => _currentIndex = target.tabIndex);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final workflow = context.watch<PharmacyWorkflowProvider>();
    final totalBadge = workflow.totalBadgeCount;

    if (_lastNotifiedBadgeTotal != null && totalBadge > _lastNotifiedBadgeTotal!) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('New work items available')),
          );
        }
      });
    }
    if (_lastNotifiedBadgeTotal == null && totalBadge > 0) {
      _lastNotifiedBadgeTotal = totalBadge;
    } else if (_lastNotifiedBadgeTotal != null && totalBadge > _lastNotifiedBadgeTotal!) {
      _lastNotifiedBadgeTotal = totalBadge;
    } else if (_lastNotifiedBadgeTotal != null && totalBadge < _lastNotifiedBadgeTotal!) {
      _lastNotifiedBadgeTotal = totalBadge;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pharmacy'),
        actions: [
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined),
                onPressed: _showNotificationCenter,
              ),
              if (_unreadCount > 0)
                Positioned(
                  right: 6,
                  top: 6,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                    child: Text(
                      '$_unreadCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Home',
          ),
          NavigationDestination(
            icon: workflow.pendingRequestsCount > 0
                ? Badge(
                    label: Text('${workflow.pendingRequestsCount}'),
                    child: const Icon(Icons.assignment_outlined),
                  )
                : const Icon(Icons.assignment_outlined),
            selectedIcon: workflow.pendingRequestsCount > 0
                ? Badge(
                    label: Text('${workflow.pendingRequestsCount}'),
                    child: const Icon(Icons.assignment),
                  )
                : const Icon(Icons.assignment),
            label: 'Requests',
          ),
          NavigationDestination(
            icon: workflow.pendingOrdersCount > 0
                ? Badge(
                    label: Text('${workflow.pendingOrdersCount}'),
                    child: const Icon(Icons.receipt_long_outlined),
                  )
                : const Icon(Icons.receipt_long_outlined),
            selectedIcon: workflow.pendingOrdersCount > 0
                ? Badge(
                    label: Text('${workflow.pendingOrdersCount}'),
                    child: const Icon(Icons.receipt_long),
                  )
                : const Icon(Icons.receipt_long),
            label: 'Orders',
          ),
          const NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2),
            label: 'Inventory',
          ),
          const NavigationDestination(
            icon: Icon(Icons.more_horiz_outlined),
            selectedIcon: Icon(Icons.more_horiz),
            label: 'More',
          ),
        ],
      ),
    );
  }
}
