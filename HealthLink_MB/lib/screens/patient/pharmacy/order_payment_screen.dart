import 'package:flutter/material.dart';

class OrderPaymentScreen extends StatelessWidget {
  final Map<String, dynamic>? currentOrder;
  final VoidCallback? onPreviousStep;

  const OrderPaymentScreen({super.key, this.currentOrder, this.onPreviousStep});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Container(
      color: colorScheme.background,
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 672), // max-w-2xl
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 16),

                // --- 2. Header Information ---
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      currentOrder != null ? 'Order #${currentOrder!['orderNumber']}' : 'Order #ORD-9982',
                      style: textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    TextButton.icon(
                      style: TextButton.styleFrom(
                        foregroundColor: colorScheme.primary,
                        backgroundColor: colorScheme.primary.withOpacity(0.05),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () {},
                      icon: const Icon(Icons.picture_as_pdf_outlined, size: 20),
                      label: const Text('Download PDF', style: TextStyle(fontWeight: FontWeight.w500)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8, height: 8,
                        decoration: BoxDecoration(color: colorScheme.primary, shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Ready',
                        style: textTheme.labelSmall?.copyWith(color: colorScheme.onPrimaryContainer),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // --- 3. Order Details Card ---
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: _cardDecoration(colorScheme),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(child: _buildDetailField('Pharmacy', 'City Central', colorScheme, textTheme)),
                          Expanded(child: _buildDetailField('Delivery', 'Home Delivery', colorScheme, textTheme)),
                        ],
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(child: _buildDetailField('Address', '456 Patient Rd, Medical District, NY 10012', colorScheme, textTheme)),
                        ],
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Est. Delivery'.toUpperCase(), style: textTheme.labelSmall?.copyWith(color: colorScheme.outline, letterSpacing: 1.0)),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(Icons.schedule, size: 18, color: colorScheme.primary),
                                    const SizedBox(width: 4),
                                    Text('25-30 mins', style: textTheme.bodyMedium?.copyWith(color: colorScheme.primary, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // --- 4. Items List & Price Breakdown ---
                Container(
                  decoration: _cardDecoration(colorScheme),
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                        color: colorScheme.surfaceVariant.withOpacity(0.3), // bg-surface-container-low
                        width: double.infinity,
                        child: Text('Order Items', style: textTheme.titleSmall?.copyWith(color: colorScheme.onSurface)),
                      ),
                      _buildOrderItem('Paracetamol 500mg', 'Quantity: x2', '\$10.00', colorScheme, textTheme),
                      Divider(height: 1, color: colorScheme.outlineVariant.withOpacity(0.3)),
                      _buildOrderItem('Vitamin C', 'Quantity: x1', '\$5.50', colorScheme, textTheme),

                      // Price Breakdown
                      Container(
                        padding: const EdgeInsets.all(24),
                        color: colorScheme.surfaceVariant.withOpacity(0.3),
                        child: Column(
                          children: [
                            _buildPriceRow('Subtotal', '\$15.50', colorScheme, textTheme),
                            const SizedBox(height: 8),
                            _buildPriceRow('Delivery Fee', '\$2.00', colorScheme, textTheme),
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              child: Divider(height: 1, color: colorScheme.outlineVariant.withOpacity(0.5)),
                            ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Total', style: textTheme.titleMedium?.copyWith(color: colorScheme.onSurface)),
                                Text('\$17.50', style: textTheme.titleMedium?.copyWith(color: colorScheme.onSurface, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // --- 5. Request Changes Section ---
                Text('Request Changes (Optional)', style: textTheme.titleSmall?.copyWith(color: colorScheme.onSurface)),
                const SizedBox(height: 8),
                TextField(
                  maxLines: 3,
                  style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurface),
                  decoration: InputDecoration(
                    hintText: 'Need to change delivery time or add instructions?',
                    hintStyle: textTheme.bodyMedium?.copyWith(color: colorScheme.outlineVariant),
                    filled: true,
                    fillColor: colorScheme.surfaceVariant.withOpacity(0.3),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: colorScheme.primaryContainer, width: 2),
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // --- 6. Payment Actions ---
                // Nút thanh toán Paypal (giữ màu thương hiệu chuẩn của Paypal)
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFFC439),
                      foregroundColor: const Color(0xFF003087),
                      elevation: 2,
                      shadowColor: Colors.black.withOpacity(0.1),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                    ),
                    onPressed: () {
                      // Xử lý thanh toán
                    },
                    icon: const Icon(Icons.payment, size: 24), // Thay thế tạm icon payment
                    label: const Text('Pay with PayPal', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                ),
                const SizedBox(height: 16),

                TextButton.icon(
                  style: TextButton.styleFrom(
                    foregroundColor: colorScheme.primary,
                    minimumSize: const Size(double.infinity, 56),
                  ),
                  onPressed: () {},
                  icon: const Icon(Icons.edit_note),
                  label: const Text('Request Changes', style: TextStyle(fontWeight: FontWeight.w600)),
                ),

                TextButton.icon(
                  style: TextButton.styleFrom(
                    foregroundColor: colorScheme.error,
                    minimumSize: const Size(double.infinity, 56),
                  ),
                  onPressed: () {},
                  icon: const Icon(Icons.cancel_outlined),
                  label: const Text('Cancel Order', style: TextStyle(fontWeight: FontWeight.w600)),
                ),

                const SizedBox(height: 8),

                TextButton.icon(
                  style: TextButton.styleFrom(
                    foregroundColor: colorScheme.outline,
                    minimumSize: const Size(double.infinity, 56),
                  ),
                  onPressed: onPreviousStep,
                  icon: const Icon(Icons.arrow_back),
                  label: const Text('Back to Connection', style: TextStyle(fontWeight: FontWeight.w600)),
                ),

                const SizedBox(height: 48), // Spacing đáy
              ],
            ),
          ),
        ),
      ),
    );
  }



  // --- Hỗ trợ: Hiển thị trường thông tin chi tiết ---
  Widget _buildDetailField(String label, String value, ColorScheme colorScheme, TextTheme textTheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: textTheme.labelSmall?.copyWith(color: colorScheme.outline, letterSpacing: 1.0)),
        const SizedBox(height: 4),
        Text(value, style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurface, fontWeight: FontWeight.w600)),
      ],
    );
  }

  // --- Hỗ trợ: Dòng sản phẩm ---
  Widget _buildOrderItem(String name, String qty, String price, ColorScheme colorScheme, TextTheme textTheme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name, style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurface, fontWeight: FontWeight.w500)),
              Text(qty, style: textTheme.bodySmall?.copyWith(color: colorScheme.outline)),
            ],
          ),
          Text(price, style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurface, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  // --- Hỗ trợ: Dòng giá tiền (Subtotal / Delivery) ---
  Widget _buildPriceRow(String label, String value, ColorScheme colorScheme, TextTheme textTheme) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant)),
        Text(value, style: textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant)),
      ],
    );
  }

  // --- Box Decoration dùng chung ---
  BoxDecoration _cardDecoration(ColorScheme colorScheme) {
    return BoxDecoration(
      color: colorScheme.surface,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: colorScheme.outlineVariant.withOpacity(0.3)),
      boxShadow: [
        BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 12, offset: const Offset(0, 4)),
      ],
    );
  }
}