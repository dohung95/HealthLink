import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/patient/patient_pharmacy/pharmacy_service.dart';
import '../../../l10n/app_localizations.dart';

class PharmacyOrderDetailScreen extends StatefulWidget {
  final Map<String, dynamic> order;

  const PharmacyOrderDetailScreen({super.key, required this.order});

  @override
  State<PharmacyOrderDetailScreen> createState() => _PharmacyOrderDetailScreenState();
}

class _PharmacyOrderDetailScreenState extends State<PharmacyOrderDetailScreen> {
  final _currencyFormat = NumberFormat.currency(locale: 'en_US', symbol: '\$');
  Map<String, dynamic>? _orderDetails;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadOrderDetails();
    });
  }

  Future<void> _loadOrderDetails() async {
    final token = Provider.of<AuthProvider>(context, listen: false).accessToken;
    if (token == null) return;

    final orderId = widget.order['orderId'] ?? widget.order['id'];
    if (orderId == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    try {
      final details = await PharmacyService.getOrderById(token, orderId.toString());
      if (mounted) {
        setState(() {
          _orderDetails = details;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error fetching order details: $e');
      if (mounted) {
        setState(() => _isLoading = false);
        // Fallback to widget.order if API fails or is not complete
        _orderDetails = widget.order;
      }
    }
  }

  String _getFilterLabel(String val, AppLocalizations l10n) {
    switch (val) {
      case 'PENDING': return l10n.orderStatusPending;
      case 'CONFIRMED': return l10n.orderStatusConfirmed;
      case 'PREPARING': return l10n.orderStatusPreparing;
      case 'SHIPPING': return l10n.orderStatusShipping;
      case 'DELIVERED': return l10n.orderStatusDelivered;
      case 'CANCELLED': return l10n.orderStatusCancelled;
      default: return val;
    }
  }

  String _displayName(Map<String, dynamic> item) {
    // Ưu tiên đối tượng lồng nhau nếu có (Cart format)
    if (item.containsKey('product') || item.containsKey('medicine')) {
      final m = item['product'] ?? item['medicine'];
      final brand = (m['brandName'] ?? '') as String;
      final generic = (m['genericName'] ?? m['name'] ?? '') as String;
      if (brand.isNotEmpty && generic.isNotEmpty && brand.toLowerCase() != generic.toLowerCase()) {
        return '$brand ($generic)';
      }
      if (brand.isNotEmpty) return brand;
      if (generic.isNotEmpty) return generic;
    }
    
    // Dữ liệu trả về từ API Order Detail (phẳng)
    final directName = (item['medicationName'] ?? item['name'] ?? '') as String;
    return directName.isNotEmpty ? directName : 'N/A';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    final data = _orderDetails ?? widget.order;
    final orderNumber = data['orderNumber'] ?? data['orderId'] ?? '#UNKNOWN';
    final pharmacyName = data['pharmacyName'] ?? 'Pharmacy';
    final totalAmount = (data['totalAmount'] as num? ?? 0).toDouble();
    final deliveryFee = (data['deliveryFee'] as num? ?? 0).toDouble();
    final status = data['status'] ?? 'PENDING';
    final paymentStatus = data['paymentStatus'] ?? 'UNPAID';
    final items = data['items'] as List<dynamic>? ?? [];

    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        backgroundColor: cs.surface,
        elevation: 0,
        scrolledUnderElevation: 1,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: cs.primary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          l10n.pharmacyOrdersTitle,
          style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600, color: cs.primary),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(orderNumber.toString(), style: tt.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text(pharmacyName, style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: status == 'CANCELLED' ? cs.errorContainer : cs.primaryContainer,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _getFilterLabel(status, l10n).toUpperCase(),
                          style: tt.labelSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: status == 'CANCELLED' ? cs.error : cs.onPrimaryContainer,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Order Details Card
                  Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: cs.outlineVariant.withOpacity(0.5)),
                    ),
                    color: cs.surfaceContainerLowest,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(l10n.orderDetails, style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                          const Divider(height: 24),
                          _buildDetailRow(
                            l10n.orderDeliveryType, 
                            data['deliveryType'] == 'Pickup' ? l10n.orderDeliveryTypePickup : l10n.orderDeliveryTypeDelivery, 
                            tt, cs
                          ),
                          if (data['deliveryAddress'] != null)
                            _buildDetailRow(l10n.retailDeliveryAddress, data['deliveryAddress'], tt, cs),
                          if (data['deliveryPhoneNumber'] != null)
                            _buildDetailRow(l10n.retailReceiverPhone, data['deliveryPhoneNumber'], tt, cs),
                          if (data['estimatedDeliveryTime'] != null)
                            _buildDetailRow(
                                l10n.orderEstDelivery, 
                                DateFormat('MMM dd, yyyy - HH:mm').format(DateTime.parse(data['estimatedDeliveryTime']).toLocal()), 
                                tt, cs),
                          _buildDetailRow(l10n.pharmacyStepPayment, paymentStatus == 'PAID' ? l10n.paymentStatusPaid : l10n.paymentStatusUnpaid, tt, cs),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Items Card
                  if (items.isNotEmpty) ...[
                    Card(
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: cs.outlineVariant.withOpacity(0.5)),
                      ),
                      color: cs.surfaceContainerLowest,
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(l10n.orderItems, style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                            const Divider(height: 24),
                            ...items.map((item) {
                              final price = (item['unitPrice'] as num? ?? item['price'] as num? ?? 0).toDouble();
                              final qty = item['quantity'] as int? ?? 1;
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: cs.surfaceContainerHigh,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Center(
                                        child: Text('${qty}x', style: tt.labelMedium?.copyWith(fontWeight: FontWeight.bold, color: cs.primary)),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(_displayName(item), style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w500)),
                                          if (qty > 1) // Hiển thị đơn giá để user dễ hiểu
                                            Text('${qty} x ${_currencyFormat.format(price)}', style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                                          if (item['instructions'] != null && item['instructions'].toString().isNotEmpty)
                                            Text(item['instructions'], style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                                        ],
                                      ),
                                    ),
                                    Text(_currencyFormat.format(price * qty), style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              );
                            }),
                            const Divider(height: 24),
                            _buildSummaryRow(l10n.retailMedicineSubtotal, _currencyFormat.format(totalAmount - deliveryFee), tt, cs),
                            _buildSummaryRow(l10n.retailDeliveryFeeLabel, _currencyFormat.format(deliveryFee), tt, cs),
                            const SizedBox(height: 8),
                            _buildSummaryRow(l10n.orderTotal, _currencyFormat.format(totalAmount), tt, cs, isBold: true),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildDetailRow(String label, String value, TextTheme tt, ColorScheme cs) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
          ),
          Expanded(
            child: Text(value, style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w500), textAlign: TextAlign.right),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, TextTheme tt, ColorScheme cs, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: tt.bodyMedium?.copyWith(color: isBold ? cs.onSurface : cs.onSurfaceVariant, fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
          Text(value, style: tt.titleSmall?.copyWith(fontWeight: isBold ? FontWeight.bold : FontWeight.w600, color: isBold ? cs.primary : cs.onSurface)),
        ],
      ),
    );
  }
}
