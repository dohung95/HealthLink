import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pharmacy/pharmacy_workflow_provider.dart';

class PharmacyDashboardScreen extends StatefulWidget {
  const PharmacyDashboardScreen({super.key});

  @override
  State<PharmacyDashboardScreen> createState() =>
      _PharmacyDashboardScreenState();
}

class _PharmacyDashboardScreenState extends State<PharmacyDashboardScreen> {
  String? _pharmacyName;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final pharmacy = context.read<AuthProvider>().pharmacyProfile;
      _pharmacyName = pharmacy?['name']?.toString() ?? 'Pharmacy';
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final workflow = context.watch<PharmacyWorkflowProvider>();
    final items = workflow.workItems;
    final isLoading = workflow.isLoading;
    final error = workflow.error;

    if (error != null && items.isEmpty) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline,
                  size: 48, color: theme.colorScheme.error),
              const SizedBox(height: 12),
              Text(error,
                  style: TextStyle(color: theme.colorScheme.error)),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          final auth = context.read<AuthProvider>();
          if (auth.accessToken != null) {
            final pharmacyId =
                auth.pharmacyProfile?['pharmacyId']?.toString() ?? auth.userId!;
            await workflow.refresh(auth.accessToken!, pharmacyId);
          }
        },
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
                DateFormat('EEEE, dd MMMM yyyy').format(DateTime.now()),
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: _statCard(
                      theme,
                      'Pending Orders',
                      workflow.pendingOrdersCount.toString(),
                      Icons.receipt_long,
                      Colors.orange,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _statCard(
                      theme,
                      'Pending Requests',
                      workflow.pendingRequestsCount.toString(),
                      Icons.assignment,
                      Colors.blue,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _statCard(
                      theme,
                      'Work Items',
                      items.length.toString(),
                      Icons.work_history,
                      Colors.teal,
                    ),
                  ),
                ],
              ),
              if (isLoading && items.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 24),
                  child: Center(child: CircularProgressIndicator()),
                ),
              const SizedBox(height: 24),
              Text('RECENT ITEMS',
                  style: theme.textTheme.labelLarge
                      ?.copyWith(color: theme.colorScheme.primary)),
              const SizedBox(height: 8),
              ...items.take(5).map((item) => _workItemCard(theme, item)),
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
      ThemeData theme, dynamic item) {
    final sourceType = item.sourceType?.value ?? '';
    final patientName = item.patientName ?? 'Unknown';
    final stage = item.workflowStage ?? '';
    final sourceIcon = sourceType == 'CONSULTATION'
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
}
