import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pharmacy/pharmacy_request_provider.dart';
import '../../models/pharmacy/pharmacy_consultation_request.dart';
import '../../models/pharmacy/pharmacy_work_item.dart';
import '../../widgets/pharmacy/request_status_chip.dart';
import '../../utils/pharmacy/pharmacy_workflow.dart';
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

  final List<_WorkTypeChip> _workTypeChips = [
    _WorkTypeChip('All', null),
    _WorkTypeChip('Consultation', 'CONSULTATION'),
    _WorkTypeChip('Revision', 'REVISION'),
    _WorkTypeChip('Delivery Quote', 'DELIVERY_QUOTE'),
    _WorkTypeChip('Contact Review', 'DELIVERY_CONTACT_REVIEW'),
    _WorkTypeChip('Pickup', 'PICKUP_ORDER'),
    _WorkTypeChip('Delivery', 'DELIVERY_ORDER'),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadRequests());
  }

  Future<void> _loadRequests() async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    if (auth.pharmacyProfile == null) {
      await auth.fetchProfile();
    }
    final pharmacyId =
        auth.pharmacyProfile?['pharmacyId']?.toString() ?? auth.userId!;
    final provider = context.read<PharmacyRequestProvider>();
    await Future.wait([
      provider.fetchRequests(auth.accessToken!, pharmacyId),
      provider.fetchWorkItems(auth.accessToken!, pharmacyId),
    ]);
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
        title: const Text('Requests & Work Items'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          _buildStatusFilterTabs(),
          _buildWorkTypeFilterTabs(),
          Expanded(child: _buildRequestsList(theme)),
        ],
      ),
    );
  }

  Widget _buildStatusFilterTabs() {
    final provider = context.watch<PharmacyRequestProvider>();
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
        itemCount: _statusFilters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 4),
        itemBuilder: (_, i) {
          final filter = _statusFilters[i];
          final isSelected =
              provider.activeFilter == filter && provider.sourceTypeFilter == null;
          return ChoiceChip(
            label: Text(filter),
            selected: isSelected,
            visualDensity: VisualDensity.compact,
            onSelected: (_) async {
              provider.setFilter(filter);
              final auth = context.read<AuthProvider>();
              if (auth.accessToken != null) {
                if (auth.pharmacyProfile == null) {
                  await auth.fetchProfile();
                }
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

  Widget _buildWorkTypeFilterTabs() {
    final provider = context.watch<PharmacyRequestProvider>();
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(12, 4, 12, 4),
        itemCount: _workTypeChips.length,
        separatorBuilder: (_, __) => const SizedBox(width: 4),
        itemBuilder: (_, i) {
          final chip = _workTypeChips[i];
          final isSelected = provider.sourceTypeFilter == chip.sourceType;
          return ChoiceChip(
            label: Text(chip.label),
            selected: isSelected,
            visualDensity: VisualDensity.compact,
            onSelected: (_) {
              provider.setSourceTypeFilter(chip.sourceType);
            },
          );
        },
      ),
    );
  }

  Widget _buildRequestsList(ThemeData theme) {
    final provider = context.watch<PharmacyRequestProvider>();
    final showWorkItems = provider.sourceTypeFilter != null;
    final items = showWorkItems ? provider.filteredWorkItems : provider.requests;
    final loading = showWorkItems
        ? provider.workItemsLoading && items.isEmpty
        : provider.isLoading && items.isEmpty;

    if (loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (provider.error != null && items.isEmpty) {
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

    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.assignment,
                size: 64, color: theme.colorScheme.outlineVariant),
            const SizedBox(height: 12),
            Text('No items found', style: theme.textTheme.titleMedium),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadRequests,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        itemCount: items.length,
        itemBuilder: (_, i) {
          if (showWorkItems) {
            return _buildWorkItemCard(items[i] as PharmacyWorkItem, theme);
          }
          return _buildRequestCard(
              items[i] as PharmacyConsultationRequest, theme);
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

  Widget _buildWorkItemCard(PharmacyWorkItem item, ThemeData theme) {
    final timeStr = _formatTimeAgo(item.createdAt);
    final workflow = PharmacyWorkflow.workflowLabel(item.workflowStage);
    final payment = item.paymentStatus != null
        ? PharmacyWorkflow.paymentLabel(item.paymentStatus!)
        : null;
    final fulfillment = item.deliveryType != null
        ? PharmacyWorkflow.fulfillmentLabel(item.deliveryType!)
        : null;

    String? subtitle;
    if (item.sourceType == WorkItemSourceType.revision) {
      subtitle = item.revisionReason;
    } else if (item.sourceType == WorkItemSourceType.deliveryQuote) {
      subtitle =
          'Total: \$${item.totalAmount?.toStringAsFixed(2) ?? '—'}';
    }

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          if (item.requestId != null) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => PharmacyRequestDetailScreen(
                    requestId: item.requestId!.toString()),
              ),
            );
          }
          // ponytail: order detail navigation from work item when no requestId
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
                        Text(item.patientName,
                            style: theme.textTheme.titleSmall
                                ?.copyWith(fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  _workTypeChip(item.sourceType),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  if (workflow.isNotEmpty) ...[
                    _miniChip(theme, workflow, theme.colorScheme.primary),
                    const SizedBox(width: 4),
                  ],
                  if (payment != null) ...[
                    _miniChip(theme, payment, Colors.green),
                    const SizedBox(width: 4),
                  ],
                  if (fulfillment != null)
                    _miniChip(theme, fulfillment, Colors.indigo),
                ],
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 6),
                Text(subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall),
              ],
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(Icons.access_time,
                      size: 14, color: theme.colorScheme.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Text(timeStr, style: theme.textTheme.bodySmall),
                  if (item.availableActions.isNotEmpty) ...[
                    const SizedBox(width: 12),
                    Text(item.availableActions.join(', '),
                        style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant)),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _workTypeChip(WorkItemSourceType sourceType) {
    final (label, color) = switch (sourceType) {
      WorkItemSourceType.consultation => ('Consultation', Colors.blue),
      WorkItemSourceType.revision => ('Revision', Colors.orange),
      WorkItemSourceType.deliveryQuote => ('Quote', Colors.teal),
      WorkItemSourceType.deliveryContactReview =>
        ('Contact Review', Colors.purple),
      WorkItemSourceType.pickupOrder => ('Pickup', Colors.brown),
      WorkItemSourceType.deliveryOrder => ('Delivery', Colors.indigo),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(label,
          style: TextStyle(
              fontSize: 10, fontWeight: FontWeight.w600, color: color)),
    );
  }

  Widget _miniChip(ThemeData theme, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(label,
          style: TextStyle(fontSize: 9, color: color)),
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

class _WorkTypeChip {
  final String label;
  final String? sourceType;
  const _WorkTypeChip(this.label, this.sourceType);
}
