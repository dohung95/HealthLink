import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/patient_pharmacy/pharmacy_service.dart';

class ConsultationRequestsScreen extends StatefulWidget {
  const ConsultationRequestsScreen({super.key});

  @override
  State<ConsultationRequestsScreen> createState() => _ConsultationRequestsScreenState();
}

class _ConsultationRequestsScreenState extends State<ConsultationRequestsScreen> with AutomaticKeepAliveClientMixin {
  List<dynamic> _requests = [];
  bool _isLoading = true;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadRequests();
    });
  }

  Future<void> _loadRequests() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.accessToken;
    final userId = authProvider.userId;
    
    if (token == null || userId == null) {
      setState(() => _isLoading = false);
      return;
    }

    try {
      final data = await PharmacyService.getConsultationRequestsByPatient(token, userId);
      setState(() {
        _requests = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      debugPrint('Error loading consultation requests: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // Bắt buộc gọi cho AutomaticKeepAliveClientMixin
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Container(
      color: colorScheme.surface,
      child: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 768),
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _loadRequests,
                  child: _requests.isEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [
                            SizedBox(height: MediaQuery.of(context).size.height * 0.3),
                            Center(
                              child: Text(
                                'No consultation requests found.',
                                style: textTheme.bodyLarge?.copyWith(color: colorScheme.outline),
                              ),
                            ),
                          ],
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
                          physics: const AlwaysScrollableScrollPhysics(),
                          itemCount: _requests.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 16),
                          itemBuilder: (context, index) {
                            final req = _requests[index];
                            final pharmacyName = req['pharmacyName'] ?? 'Pharmacy';
                            
                            // Parse date
                            String dateStr = 'Unknown date';
                            if (req['createdAt'] != null) {
                              try {
                                final dt = DateTime.parse(req['createdAt']).toLocal();
                                dateStr = DateFormat('dd MMM yyyy, HH:mm').format(dt);
                              } catch (_) {}
                            }

                            final description = req['notes'] ?? 'No additional notes provided.';
                            final status = req['status'] ?? 'PENDING';

                            // Cấu hình UI theo status
                            Color statusBgColor;
                            Color statusTextColor;
                            IconData statusIcon;

                            if (status == 'ORDER_CREATED') {
                              statusBgColor = colorScheme.secondaryContainer;
                              statusTextColor = colorScheme.onSecondaryContainer;
                              statusIcon = Icons.check_circle;
                            } else if (status == 'IN_REVIEW' || status == 'ACCEPTED') {
                              statusBgColor = colorScheme.primaryContainer;
                              statusTextColor = colorScheme.onPrimaryContainer;
                              statusIcon = Icons.schedule;
                            } else if (status == 'CANCELLED' || status == 'REJECTED') {
                              statusBgColor = colorScheme.errorContainer;
                              statusTextColor = colorScheme.onErrorContainer;
                              statusIcon = Icons.cancel_outlined;
                            } else {
                              // PENDING or other
                              statusBgColor = colorScheme.surfaceVariant;
                              statusTextColor = colorScheme.onSurfaceVariant;
                              statusIcon = Icons.hourglass_empty;
                            }

                            final isCancelled = (status == 'CANCELLED' || status == 'REJECTED');
                            final hasViewAction = (status == 'ORDER_CREATED');

                            Widget card = _buildRequestCard(
                              context: context,
                              pharmacyName: pharmacyName,
                              date: dateStr,
                              description: description,
                              statusText: status,
                              statusIcon: statusIcon,
                              statusBgColor: statusBgColor,
                              statusTextColor: statusTextColor,
                              hasViewAction: hasViewAction,
                              colorScheme: colorScheme,
                              textTheme: textTheme,
                            );

                            if (isCancelled) {
                              return Opacity(opacity: 0.7, child: card);
                            }
                            return card;
                          },
                        ),
                ),
        ),
      ),
    );
  }

  // --- Widget Hỗ trợ: Thẻ Consultation Request ---
  Widget _buildRequestCard({
    required BuildContext context,
    required String pharmacyName,
    required String date,
    required String description,
    required String statusText,
    required IconData statusIcon,
    required Color statusBgColor,
    required Color statusTextColor,
    Color? pharmacyIconColor,
    bool hasViewAction = false,
    required ColorScheme colorScheme,
    required TextTheme textTheme,
  }) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: colorScheme.surface.withOpacity(0.9), // Tương đương glass-card
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.surfaceVariant),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Thanh màu đánh dấu bên trái
            Container(width: 6, color: statusBgColor),

            // Nội dung bên trong
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // --- Header: Tên nhà thuốc & Ngày ---
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                pharmacyName,
                                style: textTheme.titleMedium?.copyWith(color: colorScheme.onSurface),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(Icons.calendar_month_outlined, size: 14, color: colorScheme.outline),
                                  const SizedBox(width: 4),
                                  Text(date, style: textTheme.labelMedium?.copyWith(color: colorScheme.outline)),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Container(
                          width: 32, height: 32,
                          decoration: BoxDecoration(
                            color: colorScheme.surfaceVariant.withOpacity(0.5),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.local_pharmacy_outlined, size: 18, color: pharmacyIconColor ?? colorScheme.primary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // --- Body: Đoạn mô tả (Description) ---
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: colorScheme.surface, // bg-surface-container-lowest
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: colorScheme.surfaceVariant.withOpacity(0.5)),
                      ),
                      child: Text(
                        description.isNotEmpty ? description : 'No description',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // --- Footer: Trạng thái & Action Button ---
                    Padding(
                      padding: const EdgeInsets.only(top: 12.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          // Chip Trạng thái
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: statusBgColor,
                              borderRadius: BorderRadius.circular(100),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(statusIcon, size: 12, color: statusTextColor),
                                const SizedBox(width: 4),
                                Text(
                                  statusText,
                                  style: textTheme.labelSmall?.copyWith(color: statusTextColor, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),

                          // Nút Action (Chỉ hiện nếu hasViewAction = true)
                          if (hasViewAction)
                            InkWell(
                              onTap: () {
                                // Xử lý View Order
                              },
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    'View Order',
                                    style: textTheme.labelMedium?.copyWith(color: colorScheme.primary, fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(width: 4),
                                  Icon(Icons.arrow_forward, size: 16, color: colorScheme.primary),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}