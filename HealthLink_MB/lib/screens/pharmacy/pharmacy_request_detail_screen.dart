import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pharmacy/pharmacy_request_provider.dart';
import '../../providers/pharmacy/pharmacy_workflow_provider.dart';
import '../../models/pharmacy/pharmacy_consultation_request.dart';
import '../../models/pharmacy/pharmacy_work_item.dart';
import '../../utils/pharmacy/pharmacy_chat_policy.dart';
import '../../widgets/pharmacy/request_status_chip.dart';
import '../../widgets/pharmacy/delivery_contact_review_sheet.dart';
import '../chat/chat_room_screen.dart';
import 'pharmacy_quote_editor_screen.dart';
import 'pharmacy_order_detail_screen.dart';

class PharmacyRequestDetailScreen extends StatefulWidget {
  final String requestId;
  final PharmacyWorkItem? workItem;
  const PharmacyRequestDetailScreen({
    super.key,
    required this.requestId,
    this.workItem,
  });

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
      final provider = context.read<PharmacyRequestProvider>();
      await provider.fetchRequestDetail(auth.accessToken!, widget.requestId);
      if (!mounted) return;
      await provider.fetchPrescriptions(auth.accessToken!, widget.requestId);
    }
  }

  Future<bool> _confirmAction(String title, String message) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Confirm')),
        ],
      ),
    );
    return result ?? false;
  }

  Future<void> _updateStatus(String status) async {
    final confirmed = await _confirmAction(
      status == 'IN_REVIEW' ? 'Accept Request' : 'Reject Request',
      status == 'IN_REVIEW'
          ? 'Accept this consultation request and move it to review?'
          : 'Reject and cancel this consultation request?',
    );
    if (!confirmed) return;
    if (!mounted) return;

    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    final provider = context.read<PharmacyRequestProvider>();
    final success = await provider.updateRequestStatus(
              auth.accessToken!,
              widget.requestId,
              status,
            );
    if (!mounted) return;
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(
                status == 'IN_REVIEW' ? 'Accepted' : 'Rejected')),
      );
    }
  }

  Future<void> _openChat() async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken == null) return;
    final provider = context.read<PharmacyRequestProvider>();
    await provider.fetchChatRoom(
        auth.accessToken!, widget.requestId, auth.userId!);
    if (!mounted) return;
    final room = provider.chatRoom;
    if (room != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ChatRoomScreen(
            conversation: room,
          ),
        ),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.chatError ?? 'Chat room is not available'),
          action: SnackBarAction(label: 'Retry', onPressed: _openChat),
        ),
      );
    }
  }

  PharmacyWorkItem? _matchingWorkflowItem(BuildContext context) {
    final request = context.read<PharmacyRequestProvider>().currentRequest;
    if (request == null) return widget.workItem;
    final fromProvider =
        context.read<PharmacyWorkflowProvider>().getItemByRequestId(request.requestId);
    return fromProvider ?? widget.workItem;
  }

  Future<void> _showCreateOrderDialog() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PharmacyQuoteEditorScreen(
          mode: QuoteEditorMode.createFromRequest,
          requestId: widget.requestId,
        ),
      ),
    );
    await _refreshWorkflow();
  }

  Future<void> _refreshWorkflow() async {
    final auth = context.read<AuthProvider>();
    if (auth.accessToken != null) {
      final pharmacyId =
          auth.pharmacyProfile?['pharmacyId']?.toString() ?? auth.userId!;
      await context.read<PharmacyWorkflowProvider>().refresh(
        auth.accessToken!,
        pharmacyId,
      );
    }
  }

  void _showDeliveryReviewSheet() {
    final request = context.read<PharmacyRequestProvider>().currentRequest;
    if (request == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => DeliveryContactReviewSheet(
        workItem: PharmacyWorkItem(
          id: 'review-${request.requestId}',
          pharmacyId: request.pharmacyId ?? '',
          sourceId: request.requestId,
          sourceType: WorkItemSourceType.deliveryContactReview,
          workflowStage: 'CONTACT_REVIEW',
          availableActions: ['APPROVE', 'UPDATE_CONTACT'],
          patientId: request.patientId,
          patientName: request.patientName,
          requestId: request.requestId,
          deliveryType: request.deliveryType,
          deliveryAddress: request.deliveryAddress,
          deliveryPhoneNumber: request.deliveryPhoneNumber,
          notes: request.additionalNotes,
          createdAt: request.createdAt,
        ),
        onSubmit: ({required approved, String? notes}) async {
          final auth = context.read<AuthProvider>();
          if (auth.accessToken == null) return;
          // ponytail: delivery contact review handled at order-level;
          // request-level review logs the decision
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                    approved
                        ? 'Delivery contact approved'
                        : 'Delivery contact changes requested',
                    style: const TextStyle(color: Colors.white)),
                backgroundColor: approved ? Colors.green : Colors.orange,
              ),
            );
          }
        },
      ),
    );
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
          _buildActions(provider.currentRequest!, theme, provider),
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

  bool _hasChatRoom(
    PharmacyConsultationRequest request,
    PharmacyRequestProvider provider,
  ) {
    final requestRoomId = request.chatRoomId?.trim();
    if (requestRoomId != null && requestRoomId.isNotEmpty) return true;

    final loadedRoomId = provider.chatRoomId?.trim() ?? provider.chatRoom?.id.trim();
    return loadedRoomId != null && loadedRoomId.isNotEmpty;
  }

  Widget? _buildActions(
      PharmacyConsultationRequest? request,
      ThemeData theme,
      PharmacyRequestProvider provider) {
    if (request == null) return null;

    final actions = <Widget>[];

    if (request.status == 'PENDING') {
      if (request.requestType?.toUpperCase() == 'ORDER_REQUEST') {
        actions.addAll([
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => _updateStatus('CANCELLED'),
              icon: const Icon(Icons.close),
              label: const Text('Reject'),
              style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
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
      } else {
        actions.addAll([
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => _updateStatus('CANCELLED'),
              icon: const Icon(Icons.close),
              label: const Text('Reject'),
              style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
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
      }
    } else if (request.status == 'IN_REVIEW' &&
        request.requestType?.toUpperCase() == 'CONSULTATION') {
      final workflowItem = _matchingWorkflowItem(context);
      final canChat = workflowItem != null &&
          PharmacyChatPolicy.canEditWorkItem(workflowItem);
      final isRevision = workflowItem?.workflowStage.toUpperCase() ==
          'REVISION_REQUESTED';

      if (_hasChatRoom(request, provider) && canChat) {
        actions.add(
          Expanded(
            child: OutlinedButton.icon(
              onPressed: _openChat,
              icon: const Icon(Icons.chat),
              label: const Text('Chat'),
            ),
          ),
        );
        actions.add(const SizedBox(width: 12));
      }

      if (isRevision && request.pharmacyOrderId != null) {
        actions.add(
          Expanded(
            child: FilledButton.icon(
              onPressed: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => PharmacyQuoteEditorScreen(
                      mode: QuoteEditorMode.updateQuote,
                      orderId: request.pharmacyOrderId.toString(),
                    ),
                  ),
                );
                await _refreshWorkflow();
              },
              icon: const Icon(Icons.edit),
              label: const Text('Update Quote'),
            ),
          ),
        );
      } else if (!isRevision) {
        actions.add(
          Expanded(
            child: FilledButton.icon(
              onPressed: _showCreateOrderDialog,
              icon: const Icon(Icons.add_shopping_cart),
              label: const Text('Create Order'),
            ),
          ),
        );
      }
    } else if (request.status == 'NEED_MORE_INFO' ||
        request.requestType == 'DELIVERY_CONTACT_REVIEW') {
      actions.add(
        Expanded(
          child: FilledButton.icon(
            onPressed: _showDeliveryReviewSheet,
            icon: const Icon(Icons.contact_page),
            label: const Text('Review Contact'),
          ),
        ),
      );
    } else if (request.status == 'ORDER_CREATED' &&
        request.pharmacyOrderId != null) {
      actions.add(
        Expanded(
          child: FilledButton.icon(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => PharmacyOrderDetailScreen(
                    orderId: request.pharmacyOrderId.toString(),
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
