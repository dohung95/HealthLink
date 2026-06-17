import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pharmacy/pharmacy_request_provider.dart';
import '../../models/pharmacy/pharmacy_consultation_request.dart';
import '../../widgets/pharmacy/request_status_chip.dart';
import 'pharmacy_request_detail_screen.dart';

class PharmacyRequestsScreen extends StatefulWidget {
  const PharmacyRequestsScreen({super.key});

  @override
  State<PharmacyRequestsScreen> createState() =>
      _PharmacyRequestsScreenState();
}

class _PharmacyRequestsScreenState extends State<PharmacyRequestsScreen> {
  final List<String> _statusFilters = [
    'ALL',
    'PENDING',
    'IN_REVIEW',
    'ORDER_CREATED',
    'CANCELLED',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadRequests());
  }

  Future<void> _loadRequests() async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    final pharmacyId =
        auth.pharmacyProfile?['pharmacyId']?.toString() ?? auth.userId!;
    await context
        .read<PharmacyRequestProvider>()
        .fetchRequests(auth.accessToken!, pharmacyId);
  }

  Future<void> _updateStatus(String requestId, String status) async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    final success =
        await context.read<PharmacyRequestProvider>().updateRequestStatus(
              auth.accessToken!,
              requestId,
              status,
            );
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(
                status == 'IN_REVIEW' ? 'Request accepted' : 'Request rejected')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Consultation Requests'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          _buildFilterTabs(),
          Expanded(child: _buildRequestsList(theme)),
        ],
      ),
    );
  }

  Widget _buildFilterTabs() {
    final provider = context.watch<PharmacyRequestProvider>();
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: _statusFilters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 4),
        itemBuilder: (_, i) {
          final filter = _statusFilters[i];
          final isSelected = provider.activeFilter == filter;
          return ChoiceChip(
            label: Text(filter),
            selected: isSelected,
            onSelected: (_) {
              provider.setFilter(filter);
              final auth = context.read<AuthProvider>();
              if (auth.accessToken != null) {
                provider.fetchRequests(
                  auth.accessToken!,
                  auth.pharmacyProfile?['pharmacyId']?.toString() ??
                      auth.userId!,
                );
              }
            },
          );
        },
      ),
    );
  }

  Widget _buildRequestsList(ThemeData theme) {
    final provider = context.watch<PharmacyRequestProvider>();

    if (provider.isLoading && provider.requests.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (provider.error != null && provider.requests.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline,
                size: 48, color: theme.colorScheme.error),
            const SizedBox(height: 12),
            Text(provider.error!,
                style: TextStyle(color: theme.colorScheme.error)),
            FilledButton.tonal(
                onPressed: _loadRequests, child: const Text('Retry')),
          ],
        ),
      );
    }

    if (provider.requests.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.assignment,
                size: 64, color: theme.colorScheme.outlineVariant),
            const SizedBox(height: 12),
            Text('No requests found', style: theme.textTheme.titleMedium),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadRequests,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        itemCount: provider.requests.length,
        itemBuilder: (_, i) {
          final request = provider.requests[i];
          return _buildRequestCard(request, theme);
        },
      ),
    );
  }

  Widget _buildRequestCard(
      PharmacyConsultationRequest request, ThemeData theme) {
    final timeStr = _formatTimeAgo(request.createdAt);

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => PharmacyRequestDetailScreen(
                  requestId: request.requestId.toString()),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        const CircleAvatar(child: Icon(Icons.person),
                            radius: 16),
                        const SizedBox(width: 8),
                        Text(request.patientName,
                            style: theme.textTheme.titleSmall
                                ?.copyWith(fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  RequestStatusChip(status: request.status),
                ],
              ),
              const SizedBox(height: 8),
              if (request.symptoms != null)
                Text(request.symptoms!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodyMedium),
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(Icons.access_time,
                      size: 14, color: theme.colorScheme.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Text(timeStr, style: theme.textTheme.bodySmall),
                  if (request.prescriptionHeaderIds != null &&
                      request.prescriptionHeaderIds!.isNotEmpty) ...[
                    const SizedBox(width: 12),
                    Icon(Icons.description,
                        size: 14, color: theme.colorScheme.onSurfaceVariant),
                    const SizedBox(width: 2),
                    Text('${request.prescriptionHeaderIds!.length} prescription(s)',
                        style: theme.textTheme.bodySmall),
                  ],
                ],
              ),
              if (request.status == 'PENDING') ...[
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    OutlinedButton.icon(
                      onPressed: () => _updateStatus(
                          request.requestId.toString(), 'CANCELLED'),
                      icon: const Icon(Icons.close, size: 16),
                      label: const Text('Reject'),
                      style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red),
                    ),
                    const SizedBox(width: 8),
                    FilledButton.icon(
                      onPressed: () => _updateStatus(
                          request.requestId.toString(), 'IN_REVIEW'),
                      icon: const Icon(Icons.check, size: 16),
                      label: const Text('Accept'),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _formatTimeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
