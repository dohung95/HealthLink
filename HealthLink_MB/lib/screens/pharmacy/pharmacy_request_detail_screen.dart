import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pharmacy/pharmacy_request_provider.dart';
import '../../models/pharmacy/pharmacy_consultation_request.dart';
import '../../widgets/pharmacy/request_status_chip.dart';
import '../chat/chat_list_screen.dart' show MessagesScreen;

class PharmacyRequestDetailScreen extends StatefulWidget {
  final String requestId;
  const PharmacyRequestDetailScreen({super.key, required this.requestId});

  @override
  State<PharmacyRequestDetailScreen> createState() =>
      _PharmacyRequestDetailScreenState();
}

class _PharmacyRequestDetailScreenState
    extends State<PharmacyRequestDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadDetail());
  }

  Future<void> _loadDetail() async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken != null) {
      await context
          .read<PharmacyRequestProvider>()
          .fetchRequestDetail(auth.accessToken!, widget.requestId);
      await context
          .read<PharmacyRequestProvider>()
          .fetchPrescriptions(auth.accessToken!, widget.requestId);
    }
  }

  Future<void> _updateStatus(String status) async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    final success =
        await context.read<PharmacyRequestProvider>().updateRequestStatus(
              auth.accessToken!,
              widget.requestId,
              status,
            );
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(
                status == 'IN_REVIEW' ? 'Accepted' : 'Rejected')),
      );
    }
  }

  void _showCreateOrderDialog() {
    final provider = context.read<PharmacyRequestProvider>();
    final prescriptions = provider.prescriptions;
    final selectedItems = <Map<String, dynamic>>[];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Create Order from Request'),
          content: SizedBox(
            width: double.maxFinite,
            child: prescriptions.isEmpty
                ? const Text(
                    'No attached prescriptions. Add items manually from the order.')
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                          'Select items to include in the order:'),
                      const SizedBox(height: 8),
                      Expanded(
                        child: ListView.builder(
                          shrinkWrap: true,
                          itemCount: prescriptions.length,
                          itemBuilder: (_, i) {
                            final rx = prescriptions[i];
                            final rxItems = rx['items']
                                    as List<dynamic>? ??
                                [];
                            return ExpansionTile(
                              title: Text(
                                  'Rx: ${rx['prescriptionNumber'] ?? rx['prescriptionHeaderId'] ?? ''}'),
                              children: rxItems.map((item) {
                                final itemMap =
                                    item as Map<String, dynamic>;
                                final itemKey =
                                    '${rx['prescriptionHeaderId']}_${itemMap['prescriptionItemId']}';
                                return StatefulBuilder(
                                  builder: (ctx, setItemState) =>
                                      CheckboxListTile(
                                    title: Text(itemMap[
                                                'medicationName']
                                            ?.toString() ??
                                        ''),
                                    subtitle: Text(
                                        'Qty: ${itemMap['quantity']}'),
                                    value: selectedItems.any(
                                        (s) => s['_key'] == itemKey),
                                    onChanged: (checked) {
                                      setItemState(() {
                                        if (checked == true) {
                                          selectedItems.add({
                                            '_key': itemKey,
                                            'medicineId':
                                                itemMap['medicineId'],
                                            'quantity':
                                                itemMap['quantity'] ?? 1,
                                            'unitPrice': 0,
                                            'totalSupplyDays':
                                                itemMap['totalSupplyDays'] ??
                                                    30,
                                            'medicationName':
                                                itemMap['medicationName'],
                                            'sourcePrescriptionHeaderId':
                                                rx['prescriptionHeaderId'],
                                            'sourcePrescriptionItemId':
                                                itemMap[
                                                    'prescriptionItemId'],
                                          });
                                        } else {
                                          selectedItems
                                              .removeWhere((s) =>
                                                  s['_key'] == itemKey);
                                        }
                                      });
                                    },
                                  ),
                                );
                              }).toList(),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                Navigator.pop(ctx);
                _submitCreateOrder(selectedItems);
              },
              child: const Text('Create Order'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submitCreateOrder(
      List<Map<String, dynamic>> items) async {
    // Remove the _key helper before sending
    final cleanedItems = items
        .map((item) =>
            Map<String, dynamic>.from(item)..remove('_key'))
        .toList();

    if (cleanedItems.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Select at least one item')),
        );
      }
      return;
    }

    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;

    final success = await context
        .read<PharmacyRequestProvider>()
        .createOrderFromRequest(
          auth.accessToken!,
          widget.requestId,
          cleanedItems,
        );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Order created successfully')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<PharmacyRequestProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Request Detail'),
      ),
      body: provider.isLoading && provider.currentRequest == null
          ? const Center(child: CircularProgressIndicator())
          : provider.currentRequest == null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(provider.error ?? 'Request not found'),
                      FilledButton.tonal(
                          onPressed: _loadDetail,
                          child: const Text('Retry')),
                    ],
                  ),
                )
              : _buildContent(provider.currentRequest!, theme),
      bottomNavigationBar:
          _buildActions(provider.currentRequest!, theme),
    );
  }

  Widget _buildContent(
      PharmacyConsultationRequest request, ThemeData theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Request #${request.requestId}',
                  style: theme.textTheme.titleLarge
                      ?.copyWith(fontWeight: FontWeight.bold)),
              RequestStatusChip(status: request.status),
            ],
          ),
          const Divider(height: 24),

          Text('PATIENT',
              style: theme.textTheme.labelLarge
                  ?.copyWith(color: theme.colorScheme.primary)),
          const SizedBox(height: 4),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const CircleAvatar(child: Icon(Icons.person)),
            title: Text(request.patientName),
            subtitle: request.deliveryPhoneNumber != null
                ? Text(request.deliveryPhoneNumber!)
                : null,
          ),
          const Divider(height: 16),

          if (request.symptoms != null) ...[
            Text('SYMPTOMS',
                style: theme.textTheme.labelLarge
                    ?.copyWith(color: theme.colorScheme.primary)),
            const SizedBox(height: 4),
            Text(request.symptoms!, style: theme.textTheme.bodyMedium),
            const SizedBox(height: 12),
          ],

          if (request.description != null) ...[
            Text('DESCRIPTION',
                style: theme.textTheme.labelLarge
                    ?.copyWith(color: theme.colorScheme.primary)),
            const SizedBox(height: 4),
            Text(request.description!,
                style: theme.textTheme.bodyMedium),
            const SizedBox(height: 12),
          ],

          if (request.allergies != null) ...[
            Text('ALLERGIES',
                style: theme.textTheme.labelLarge
                    ?.copyWith(color: theme.colorScheme.primary)),
            const SizedBox(height: 4),
            Text(request.allergies!,
                style: theme.textTheme.bodyMedium),
            const SizedBox(height: 12),
          ],

          if (request.attachments != null &&
              request.attachments!.isNotEmpty) ...[
            Text('ATTACHMENTS (${request.attachments!.length})',
                style: theme.textTheme.labelLarge
                    ?.copyWith(color: theme.colorScheme.primary)),
            const SizedBox(height: 4),
            ...request.attachments!.map((url) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      const Icon(Icons.attach_file, size: 16),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(url,
                            style: theme.textTheme.bodySmall,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                      ),
                    ],
                  ),
                )),
            const SizedBox(height: 12),
          ],

          if (request.prescriptionHeaderIds != null &&
              request.prescriptionHeaderIds!.isNotEmpty) ...[
            Text('ATTACHED PRESCRIPTIONS',
                style: theme.textTheme.labelLarge
                    ?.copyWith(color: theme.colorScheme.primary)),
            const SizedBox(height: 4),
            ...request.prescriptionHeaderIds!.map((id) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      const Icon(Icons.description, size: 16),
                      const SizedBox(width: 4),
                      Text('Prescription #$id',
                          style: theme.textTheme.bodyMedium),
                    ],
                  ),
                )),
            const SizedBox(height: 12),
          ],

          if (request.pharmacyNotes != null) ...[
            Text('YOUR NOTES',
                style: theme.textTheme.labelLarge
                    ?.copyWith(color: theme.colorScheme.primary)),
            const SizedBox(height: 4),
            Text(request.pharmacyNotes!,
                style: theme.textTheme.bodyMedium),
            const SizedBox(height: 12),
          ],

          const Divider(),
          Text(
              'Created: ${DateFormat('dd/MM/yyyy HH:mm').format(request.createdAt)}',
              style: theme.textTheme.bodySmall),
          if (request.updatedAt != null)
            Text(
                'Updated: ${DateFormat('dd/MM/yyyy HH:mm').format(request.updatedAt!)}',
                style: theme.textTheme.bodySmall),

          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget? _buildActions(
      PharmacyConsultationRequest? request, ThemeData theme) {
    if (request == null) return null;

    final actions = <Widget>[];

    if (request.status == 'PENDING') {
      actions.addAll([
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => _updateStatus('CANCELLED'),
            icon: const Icon(Icons.close),
            label: const Text('Reject'),
            style:
                OutlinedButton.styleFrom(foregroundColor: Colors.red),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: FilledButton.icon(
            onPressed: () => _updateStatus('IN_REVIEW'),
            icon: const Icon(Icons.check),
            label: const Text('Accept'),
          ),
        ),
      ]);
    } else if (request.status == 'IN_REVIEW') {
      actions.addAll([
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => const MessagesScreen()),
              );
            },
            icon: const Icon(Icons.chat),
            label: const Text('Chat'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: FilledButton.icon(
            onPressed: _showCreateOrderDialog,
            icon: const Icon(Icons.add_shopping_cart),
            label: const Text('Create Order'),
          ),
        ),
      ]);
    } else if (request.status == 'ORDER_CREATED' &&
        request.pharmacyOrderId != null) {
      actions.add(
        Expanded(
          child: FilledButton.icon(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => Scaffold(
                    appBar: AppBar(
                        title: const Text('Order Detail')),
                    body: const Center(
                        child: Text('Navigate to order detail')),
                  ),
                ),
              );
            },
            icon: const Icon(Icons.receipt_long),
            label: const Text('View Order'),
          ),
        ),
      );
    }

    if (actions.isEmpty) return null;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: actions),
      ),
    );
  }
}
