import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/patient_pharmacy/pharmacy_service.dart';

class PharmacyOrdersListScreen extends StatefulWidget {
  const PharmacyOrdersListScreen({super.key});

  @override
  State<PharmacyOrdersListScreen> createState() => _PharmacyOrdersListScreenState();
}

class _PharmacyOrdersListScreenState extends State<PharmacyOrdersListScreen> with AutomaticKeepAliveClientMixin {
  List<dynamic> _orders = [];
  bool _isLoading = true;
  String _currentFilter = 'ALL';

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadOrders();
    });
  }

  Future<void> _loadOrders() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.accessToken;
    final userId = authProvider.userId;
    
    if (token == null || userId == null) {
      setState(() => _isLoading = false);
      return;
    }

    try {
      final data = await PharmacyService.getOrdersByPatient(token, userId, status: _currentFilter);
      setState(() {
        _orders = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      debugPrint('Error loading orders: $e');
    }
  }

  void _onFilterChanged(String? newValue) {
    if (newValue != null && newValue != _currentFilter) {
      setState(() {
        _currentFilter = newValue;
        _isLoading = true;
      });
      _loadOrders();
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Container(
      color: colorScheme.surface, // changed from background
      child: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 768), // max-w-3xl
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header (Tiêu đề & Filter)
              Padding(
                padding: const EdgeInsets.fromLTRB(16.0, 24.0, 16.0, 16.0),
                child: Row(
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
                              color: colorScheme.onSurface,
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
                    // Nút Filter
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceContainerHighest.withOpacity(0.3),
                        border: Border.all(color: colorScheme.outlineVariant),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _currentFilter,
                          icon: const Icon(Icons.filter_list, size: 18),
                          isDense: true,
                          items: const [
                            DropdownMenuItem(value: 'ALL', child: Text('All')),
                            DropdownMenuItem(value: 'PENDING', child: Text('Pending')),
                            DropdownMenuItem(value: 'CONFIRMED', child: Text('Confirmed')),
                            DropdownMenuItem(value: 'PREPARING', child: Text('Preparing')),
                            DropdownMenuItem(value: 'SHIPPING', child: Text('Shipping')),
                            DropdownMenuItem(value: 'DELIVERED', child: Text('Delivered')),
                            DropdownMenuItem(value: 'CANCELLED', child: Text('Cancelled')),
                          ],
                          onChanged: _onFilterChanged,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Danh sách Order Cards
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : RefreshIndicator(
                        onRefresh: _loadOrders,
                        child: _orders.isEmpty
                            ? ListView(
                                physics: const AlwaysScrollableScrollPhysics(),
                                children: [
                                  SizedBox(height: MediaQuery.of(context).size.height * 0.2),
                                  Center(
                                    child: Text(
                                      'No orders found.',
                                      style: textTheme.bodyLarge?.copyWith(color: colorScheme.outline),
                                    ),
                                  ),
                                ],
                              )
                            : ListView.separated(
                                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                                physics: const AlwaysScrollableScrollPhysics(),
                                itemCount: _orders.length,
                                separatorBuilder: (context, index) => const SizedBox(height: 16),
                                itemBuilder: (context, index) {
                                  final order = _orders[index];
                                  final orderId = order['orderNumber'] ?? '#ORD-UNKNOWN';
                                  final pharmacyName = order['pharmacyName'] ?? 'Pharmacy';
                                  
                                  // Giá tiền
                                  final amount = order['totalAmount'] ?? 0;
                                  final priceStr = '\$${amount.toStringAsFixed(2)}';

                                  // Status order
                                  final status = order['status'] ?? 'PENDING';
                                  final paymentStatus = order['paymentStatus'] ?? 'UNPAID';

                                  // Setup Colors/Icons dựa trên Status
                                  Color status1Color;
                                  Color status1BgColor;
                                  IconData status1Icon;
                                  String status1Text = status;

                                  if (status == 'DELIVERED' || status == 'COMPLETED') {
                                    status1Color = const Color(0xFF2E7D32);
                                    status1BgColor = const Color(0xFFE8F5E9);
                                    status1Icon = Icons.check_circle;
                                  } else if (status == 'SHIPPING') {
                                    status1Color = const Color(0xFF1565C0);
                                    status1BgColor = const Color(0xFFE3F2FD);
                                    status1Icon = Icons.local_shipping;
                                  } else if (status == 'PREPARING') {
                                    status1Color = const Color(0xFF1565C0);
                                    status1BgColor = const Color(0xFFE3F2FD);
                                    status1Icon = Icons.inventory_2;
                                  } else if (status == 'CANCELLED') {
                                    status1Color = colorScheme.error;
                                    status1BgColor = colorScheme.errorContainer;
                                    status1Icon = Icons.cancel;
                                  } else {
                                    status1Color = const Color(0xFFF57F17); // Cam
                                    status1BgColor = const Color(0xFFFFF8E1);
                                    status1Icon = Icons.schedule;
                                  }

                                  // Setup Colors/Icons dựa trên Payment
                                  Color status2Color;
                                  Color status2BgColor;
                                  String status2Text = paymentStatus;
                                  bool isUnpaid = paymentStatus != 'PAID';

                                  if (paymentStatus == 'PAID') {
                                    status2Color = const Color(0xFF2E7D32);
                                    status2BgColor = const Color(0xFFE8F5E9);
                                  } else {
                                    status2Color = const Color(0xFFF57F17);
                                    status2BgColor = const Color(0xFFFFF8E1);
                                  }

                                  return _buildOrderCard(
                                    context,
                                    orderId: orderId,
                                    pharmacyName: pharmacyName,
                                    price: priceStr,
                                    status1Text: status1Text,
                                    status1Icon: status1Icon,
                                    status1Color: status1Color,
                                    status1BgColor: status1BgColor,
                                    status2Text: status2Text,
                                    status2Color: status2Color,
                                    status2BgColor: status2BgColor,
                                    hoverAccentColor: status1Color,
                                    isUnpaid: isUnpaid,
                                    colorScheme: colorScheme,
                                    textTheme: textTheme,
                                  );
                                },
                              ),
                      ),
              ),
            ],
          ),
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
              // Thanh line màu sắc ở cạnh trái
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
                                    color: colorScheme.surfaceContainerHighest.withOpacity(0.5), // bg-surface-container
                                    borderRadius: BorderRadius.circular(100),
                                  ),
                                  child: Text(
                                    '#$orderId',
                                    style: textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  pharmacyName,
                                  style: textTheme.titleMedium?.copyWith(color: colorScheme.onSurface),
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
                              color: colorScheme.surfaceContainerHighest.withOpacity(0.2),
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