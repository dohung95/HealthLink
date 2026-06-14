import 'package:flutter/material.dart';

class ConsultationRequestsScreen extends StatelessWidget {
  const ConsultationRequestsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Container(
      color: colorScheme.surface,
      child: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 768),
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
            children: [
              // --- Card 1: ORDER_CREATED ---
              _buildRequestCard(
                context: context,
                pharmacyName: 'Apex Care Pharmacy',
                date: '14 Jun 2026',
                description: '"Dry cough and runny nose for 3 days. Patient requests consultation for potential antihistamine or cough suppressant recommendation."',
                statusText: 'ORDER_CREATED',
                statusIcon: Icons.check_circle,
                statusBgColor: colorScheme.secondaryContainer,
                statusTextColor: colorScheme.onSecondaryContainer,
                hasViewAction: true,
                colorScheme: colorScheme,
                textTheme: textTheme,
              ),
              const SizedBox(height: 16),

              // --- Card 2: IN_REVIEW ---
              _buildRequestCard(
                context: context,
                pharmacyName: 'City Central Pharmacy',
                date: '12 Jun 2026',
                description: '"Migraine and light sensitivity. Currently taking sumatriptan but needs advice on supplementary management or dosage adjustment."',
                statusText: 'IN_REVIEW',
                statusIcon: Icons.schedule,
                statusBgColor: colorScheme.primaryContainer, // Tương đương primary-fixed trong HTML
                statusTextColor: colorScheme.onPrimaryContainer,
                colorScheme: colorScheme,
                textTheme: textTheme,
              ),
              const SizedBox(height: 16),

              // --- Card 3: PENDING ---
              _buildRequestCard(
                context: context,
                pharmacyName: 'Green Cross Apothecary',
                date: '10 Jun 2026',
                description: '"Skin rash on left arm spreading to chest. Mildly itchy. No known allergies. Seeking over-the-counter topical recommendation."',
                statusText: 'PENDING',
                statusIcon: Icons.hourglass_empty,
                statusBgColor: colorScheme.surfaceVariant,
                statusTextColor: colorScheme.onSurfaceVariant,
                colorScheme: colorScheme,
                textTheme: textTheme,
              ),
              const SizedBox(height: 16),

              // --- Card 4: CANCELLED ---
              Opacity(
                opacity: 0.8, // Làm mờ đi một chút cho trạng thái Cancelled
                child: _buildRequestCard(
                  context: context,
                  pharmacyName: 'HealthFirst Pharmacy',
                  date: '08 Jun 2026',
                  description: '"Follow-up for prescription refill. Patient missed previous appointment."',
                  statusText: 'CANCELLED',
                  statusIcon: Icons.cancel_outlined,
                  statusBgColor: colorScheme.errorContainer,
                  statusTextColor: colorScheme.onErrorContainer,
                  pharmacyIconColor: colorScheme.outline,
                  colorScheme: colorScheme,
                  textTheme: textTheme,
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  // --- Widget Hỗ trợ: Tab điều hướng ---
  Widget _buildTopTab(String title, {required bool isActive, required ColorScheme colorScheme, required TextTheme textTheme}) {
    return Container(
      padding: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: isActive ? colorScheme.primary : Colors.transparent,
            width: 2,
          ),
        ),
      ),
      child: Text(
        title,
        style: textTheme.titleMedium?.copyWith(
          color: isActive ? colorScheme.primary : colorScheme.outline,
          fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
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
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: colorScheme.surface, // bg-surface-container-lowest
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: colorScheme.surfaceVariant.withOpacity(0.5)),
                      ),
                      child: Text(
                        description,
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