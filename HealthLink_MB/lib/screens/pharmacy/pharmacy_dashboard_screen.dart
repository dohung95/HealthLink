import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;
import '../../providers/auth_provider.dart';
import '../../config/api_config.dart';

class PharmacyDashboardScreen extends StatefulWidget {
  const PharmacyDashboardScreen({super.key});

  @override
  State<PharmacyDashboardScreen> createState() =>
      _PharmacyDashboardScreenState();
}

class _PharmacyDashboardScreenState extends State<PharmacyDashboardScreen> {
  bool _isLoading = true;
  String? _error;
  List<Map<String, dynamic>> _workItems = [];
  int _pendingOrders = 0;
  int _pendingRequests = 0;
  String? _pharmacyName;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) throw Exception('Not authenticated');

      final pharmacyProfile = auth.pharmacyProfile;
      _pharmacyName =
          pharmacyProfile?['name']?.toString() ?? 'Pharmacy';
      final pharmacyId =
          pharmacyProfile?['pharmacyId']?.toString() ?? auth.userId!;

      final headers = {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      };

      final workRes = await http
          .get(Uri.parse(ApiConfig.pharmacyWorkItems(pharmacyId)),
              headers: headers)
          .timeout(ApiConfig.connectTimeout);

      if (workRes.statusCode == 200) {
        final data = jsonDecode(workRes.body);
        if (data is List) {
          _workItems = data.cast<Map<String, dynamic>>();
        } else if (data is Map<String, dynamic>) {
          final items = data['data'] as List<dynamic>? ??
              data['content'] as List<dynamic>? ??
              [];
          _workItems = items.cast<Map<String, dynamic>>();
        }
      }

      _pendingOrders = _workItems
          .where((w) =>
              w['sourceType'] == 'DIRECT_ORDER' &&
              (w['orderStatus'] == 'PENDING' ||
                  w['orderStatus'] == 'CONFIRMED'))
          .length;
      _pendingRequests = _workItems
          .where((w) =>
              w['sourceType'] == 'CONSULTATION_REQUEST' &&
              w['requestStatus'] == 'PENDING')
          .length;

      if (mounted) setState(() => _isLoading = false);
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorWidget(theme)
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome, $_pharmacyName',
                          style: theme.textTheme.headlineSmall
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          DateFormat('EEEE, dd MMMM yyyy')
                              .format(DateTime.now()),
                          style: theme.textTheme.bodyMedium?.copyWith(
                              color:
                                  theme.colorScheme.onSurfaceVariant),
                        ),
                        const SizedBox(height: 24),

                        Row(
                          children: [
                            Expanded(
                                child: _statCard(
                                    theme,
                                    'Pending Orders',
                                    _pendingOrders.toString(),
                                    Icons.receipt_long,
                                    Colors.orange)),
                            const SizedBox(width: 12),
                            Expanded(
                                child: _statCard(
                                    theme,
                                    'Pending Requests',
                                    _pendingRequests.toString(),
                                    Icons.assignment,
                                    Colors.blue)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                                child: _statCard(
                                    theme,
                                    'Work Items',
                                    _workItems.length.toString(),
                                    Icons.work_history,
                                    Colors.teal)),
                          ],
                        ),
                        const SizedBox(height: 24),

                        Text('RECENT ITEMS',
                            style: theme.textTheme.labelLarge?.copyWith(
                                color: theme.colorScheme.primary)),
                        const SizedBox(height: 8),
                        ..._workItems
                            .take(5)
                            .map((item) => _workItemCard(theme, item)),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _statCard(ThemeData theme, String title, String value,
      IconData icon, MaterialColor color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 20),
                const Spacer(),
                Text(value,
                    style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold, color: color)),
              ],
            ),
            const SizedBox(height: 4),
            Text(title, style: theme.textTheme.bodySmall),
          ],
        ),
      ),
    );
  }

  Widget _workItemCard(
      ThemeData theme, Map<String, dynamic> item) {
    final sourceType =
        item['sourceType'] as String? ?? '';
    final patientName =
        item['patientName'] as String? ?? 'Unknown';
    final stage =
        item['workflowStage'] as String? ?? '';
    final sourceIcon = sourceType == 'CONSULTATION_REQUEST'
        ? Icons.assignment
        : Icons.receipt_long;

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: ListTile(
        leading: CircleAvatar(child: Icon(sourceIcon, size: 18)),
        title: Text(patientName,
            style: theme.textTheme.bodyMedium
                ?.copyWith(fontWeight: FontWeight.w500)),
        subtitle: Text('$sourceType  •  $stage',
            style: theme.textTheme.bodySmall),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }

  Widget _buildErrorWidget(ThemeData theme) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.error_outline,
              size: 48, color: theme.colorScheme.error),
          const SizedBox(height: 12),
          Text(_error!,
              style: TextStyle(color: theme.colorScheme.error)),
          const SizedBox(height: 12),
          FilledButton.tonal(
              onPressed: _loadData, child: const Text('Retry')),
        ],
      ),
    );
  }
}
