import 'package:flutter/material.dart';

class PharmacyOrdersListScreen extends StatelessWidget {
  const PharmacyOrdersListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: colorScheme.background,

      // Top App Bar kèm Tabs
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleSpacing: 16.0,
        title: Text(
          'HealthLink',
          style: textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
            color: colorScheme.primary,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            color: colorScheme.onSurfaceVariant,
            onPressed: () {},
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16.0, left: 8.0),
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: colorScheme.surfaceVariant,
                border: Border.all(color: colorScheme.outlineVariant),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.asset(
                  'assets/images/doctor_avatar.png', // Thay ảnh user
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) =>
                      Icon(Icons.person, size: 20, color: colorScheme.outline),
                ),
              ),
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            width: double.infinity,
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: colorScheme.surfaceVariant)),
            ),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 768),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Row(
                    children: [
                      _buildTopTab('Dashboard', isActive: false, colorScheme: colorScheme, textTheme: textTheme),
                      const SizedBox(width: 32),
                      _buildTopTab('Orders', isActive: true, colorScheme: colorScheme, textTheme: textTheme),
                      const SizedBox(width: 32),
                      _buildTopTab('Pharmacy', isActive: false, colorScheme: colorScheme, textTheme: textTheme),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),

      // Nội dung chính
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 24.0), // px-margin-mobile py-lg
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 768), // max-w-3xl
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header (Tiêu đề & Filter)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Pharmacy Orders',
                            style: textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: colorScheme.onBackground,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Track your recent prescription deliveries and history.',
                            style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ),
                    // Nút Filter ẩn trên màn hình nhỏ, hiện trên Desktop (Dùng MediaQuery hoặc đơn giản dùng OutlinedButton)
                    if (MediaQuery.of(context).size.width > 600)
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: colorScheme.primary,
                          backgroundColor: colorScheme.surfaceVariant.withOpacity(0.3), // bg-surface-container-low
                          side: BorderSide(color: colorScheme.outlineVariant),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: () {},
                        icon: const Icon(Icons.filter_list, size: 18),
                        label: const Text('Filter'),
                      ),
                  ],
                ),
                const SizedBox(height: 24),

                // Danh sách Order Cards
                Column(
                  children: [
                    // Card 1: Delivered
                    _buildOrderCard(
                      context,
                      orderId: '#HL-9821',
                      pharmacyName: 'St. Jude Pharmacy',
                      price: '\$35.40',
                      status1Text: 'Delivered',
                      status1Icon: Icons.check_circle,
                      status1Color: const Color(0xFF2E7D32), // Màu xanh lá cây
                      status1BgColor: const Color(0xFFE8F5E9),
                      status2Text: 'PAID',
                      status2Color: const Color(0xFF2E7D32),
                      status2BgColor: const Color(0xFFE8F5E9),
                      hoverAccentColor: colorScheme.secondary,
                      colorScheme: colorScheme,
                      textTheme: textTheme,
                    ),
                    const SizedBox(height: 16),

                    // Card 2: Shipping
                    _buildOrderCard(
                      context,
                      orderId: '#HL-9755',
                      pharmacyName: 'City Central Pharmacy',
                      price: '\$12.00',
                      status1Text: 'Shipping',
                      status1Icon: Icons.local_shipping,
                      status1Color: const Color(0xFF1565C0), // Màu xanh dương
                      status1BgColor: const Color(0xFFE3F2FD),
                      status2Text: 'PAID',
                      status2Color: const Color(0xFF2E7D32),
                      status2BgColor: const Color(0xFFE8F5E9),
                      hoverAccentColor: colorScheme.primary,
                      colorScheme: colorScheme,
                      textTheme: textTheme,
                    ),
                    const SizedBox(height: 16),

                    // Card 3: Preparing
                    _buildOrderCard(
                      context,
                      orderId: '#HL-9642',
                      pharmacyName: 'Apex Care Pharmacy',
                      price: '\$45.25',
                      status1Text: 'Preparing',
                      status1Icon: Icons.inventory_2,
                      status1Color: const Color(0xFF1565C0),
                      status1BgColor: const Color(0xFFE3F2FD),
                      status2Text: 'PAID',
                      status2Color: const Color(0xFF2E7D32),
                      status2BgColor: const Color(0xFFE8F5E9),
                      hoverAccentColor: colorScheme.primary,
                      colorScheme: colorScheme,
                      textTheme: textTheme,
                    ),
                    const SizedBox(height: 16),

                    // Card 4: Pending / Unpaid
                    _buildOrderCard(
                      context,
                      orderId: '#HL-9510',
                      pharmacyName: 'Green Cross Apothecary',
                      price: '\$22.50',
                      status1Text: 'Pending',
                      status1Icon: Icons.schedule,
                      status1Color: const Color(0xFFF57F17), // Màu cam
                      status1BgColor: const Color(0xFFFFF8E1),
                      status2Text: 'UNPAID',
                      status2Color: const Color(0xFFF57F17),
                      status2BgColor: const Color(0xFFFFF8E1),
                      hoverAccentColor: const Color(0xFFF57F17),
                      isUnpaid: true,
                      colorScheme: colorScheme,
                      textTheme: textTheme,
                    ),
                  ],
                ),

                const SizedBox(height: 48), // Spacing đáy
              ],
            ),
          ),
        ),
      ),
    );
  }

  // --- Widget: Top Nav Tab ---
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
          color: isActive ? colorScheme.primary : colorScheme.onSurfaceVariant,
          fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
        ),
      ),
    );
  }

  // --- Widget: Order Card ---
  Widget _buildOrderCard(
      BuildContext context, {
        required String orderId,
        required String pharmacyName,
        required String price,
        required String status1Text,
        required IconData status1Icon,
        required Color status1Color,
        required Color status1BgColor,
        required String status2Text,
        required Color status2Color,
        required Color status2BgColor,
        required Color hoverAccentColor,
        bool isUnpaid = false,
        required ColorScheme colorScheme,
        required TextTheme textTheme,
      }) {
    return InkWell(
      onTap: () {
        // Điều hướng sang màn hình Chi tiết Đơn hàng
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: colorScheme.surface, // bg-surface-container-lowest
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: colorScheme.outlineVariant),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 2)),
          ],
        ),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Thanh line màu sắc ở cạnh trái (Trong HTML dùng group-hover, ở đây mình cho hiển thị luôn một viền mờ)
              Container(width: 4, color: hoverAccentColor.withOpacity(0.5)),

              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header Card
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: colorScheme.surfaceVariant.withOpacity(0.5), // bg-surface-container
                                    borderRadius: BorderRadius.circular(100),
                                  ),
                                  child: Text(
                                    orderId,
                                    style: textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  pharmacyName,
                                  style: textTheme.titleMedium?.copyWith(color: colorScheme.onBackground),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            price,
                            style: textTheme.titleLarge?.copyWith(
                              color: isUnpaid ? colorScheme.onSurfaceVariant : colorScheme.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Footer Card (Status Chips & Button)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              // Status Chip 1
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(color: status1BgColor, borderRadius: BorderRadius.circular(4)),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(status1Icon, size: 12, color: status1Color),
                                    const SizedBox(width: 4),
                                    Text(status1Text, style: textTheme.labelSmall?.copyWith(color: status1Color, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                              // Status Chip 2
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(color: status2BgColor, borderRadius: BorderRadius.circular(4)),
                                child: Text(status2Text, style: textTheme.labelSmall?.copyWith(color: status2Color, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: colorScheme.surfaceVariant.withOpacity(0.2),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(Icons.chevron_right, size: 20, color: colorScheme.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}