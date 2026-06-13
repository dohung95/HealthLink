import 'package:flutter/material.dart';

class SelectPharmacyScreen extends StatefulWidget {
  const SelectPharmacyScreen({super.key});

  @override
  State<SelectPharmacyScreen> createState() => _SelectPharmacyScreenState();
}

class _SelectPharmacyScreenState extends State<SelectPharmacyScreen> {
  // Trạng thái cho nút gạt (Toggle) "Delivery only"
  bool _isDeliveryOnly = false;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: colorScheme.background,

      // Top App Bar
      appBar: AppBar(
        backgroundColor: colorScheme.surface.withOpacity(0.9), // Tương đương glass-header
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: colorScheme.primary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Order Prescription',
          style: textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurface,
          ),
        ),
      ),

      body: SingleChildScrollView(
        padding: const EdgeInsets.only(left: 20.0, right: 20.0, top: 16.0, bottom: 48.0), // px-container-margin mt-md
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 672), // max-w-2xl
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // --- 1. Progress Wizard ---
                _buildProgressWizard(colorScheme, textTheme),
                const SizedBox(height: 24), // space-y-lg

                // --- 2. Search and Filter ---
                _buildSearchAndFilter(colorScheme, textTheme),
                const SizedBox(height: 24),

                // --- 3. Pharmacy List ---
                Text(
                  'Nearby Pharmacies',
                  style: textTheme.titleMedium?.copyWith(color: colorScheme.onSurface),
                ),
                const SizedBox(height: 16),

                // Pharmacy Card 1 (Fully Stocked)
                _buildPharmacyCard(
                  name: 'City Central Pharmacy',
                  address: '123 Medical Way',
                  distance: '1.2 km away',
                  rating: '4.8',
                  isFullyStocked: true,
                  isDeliveryAvailable: true,
                  colorScheme: colorScheme,
                  textTheme: textTheme,
                ),
                const SizedBox(height: 16),

                // Pharmacy Card 2 (Partially Stocked)
                _buildPharmacyCard(
                  name: 'Green Cross Apothecary',
                  address: '45 Health St',
                  distance: '2.5 km away',
                  rating: '4.5',
                  isFullyStocked: false,
                  isDeliveryAvailable: true,
                  warningText: 'Missing: Amoxicillin. Substitutes might be available upon professional consultation.',
                  colorScheme: colorScheme,
                  textTheme: textTheme,
                ),
                const SizedBox(height: 24),

                // --- 4. Map Preview Placeholder ---
                _buildMapPreview(colorScheme, textTheme),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // --- Widget: Thanh tiến trình (Progress Wizard) ---
  Widget _buildProgressWizard(ColorScheme colorScheme, TextTheme textTheme) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16.0),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Đường kẻ nền (Màu xám)
          Positioned(
            left: 16,
            right: 16,
            child: Container(height: 2, color: colorScheme.outlineVariant),
          ),
          // Đường kẻ đang chạy (Màu primary) - Chạy từ step 1 đến step 2
          Positioned(
            left: 16,
            right: MediaQuery.of(context).size.width * 0.6, // Tạm tính chiếm khoảng 1/3
            child: Container(height: 2, color: colorScheme.primary),
          ),

          // Các Step
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Step 1: Hoàn thành
              _buildStepItem('1', 'Prescription', isCompleted: true, isActive: false, colorScheme: colorScheme, textTheme: textTheme),
              // Step 2: Đang thực hiện
              _buildStepItem('2', 'Pharmacy', isCompleted: false, isActive: true, colorScheme: colorScheme, textTheme: textTheme),
              // Step 3: Chưa tới
              _buildStepItem('3', 'Connect', isCompleted: false, isActive: false, colorScheme: colorScheme, textTheme: textTheme),
              // Step 4: Chưa tới
              _buildStepItem('4', 'Payment', isCompleted: false, isActive: false, colorScheme: colorScheme, textTheme: textTheme),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStepItem(String step, String title, {required bool isCompleted, required bool isActive, required ColorScheme colorScheme, required TextTheme textTheme}) {
    Color circleColor;
    Color textColor;
    Color iconColor;

    if (isCompleted) {
      circleColor = colorScheme.primary;
      textColor = colorScheme.primary;
      iconColor = colorScheme.onPrimary;
    } else if (isActive) {
      circleColor = colorScheme.primary;
      textColor = colorScheme.primary;
      iconColor = colorScheme.onPrimary;
    } else {
      circleColor = colorScheme.surfaceVariant; // Dùng thay thế cho surface-container-highest
      textColor = colorScheme.outline; // Dùng thay cho secondary để tương phản tốt hơn
      iconColor = colorScheme.outline;
    }

    return Column(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: circleColor,
            shape: BoxShape.circle,
            border: isActive ? Border.all(color: colorScheme.primaryContainer, width: 4) : null,
          ),
          child: Center(
            child: isCompleted
                ? Icon(Icons.check, color: iconColor, size: 20)
                : Text(step, style: TextStyle(color: iconColor, fontWeight: FontWeight.bold, fontSize: 14)),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          title,
          style: textTheme.labelMedium?.copyWith(
            color: textColor,
            fontWeight: isCompleted || isActive ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  // --- Widget: Thanh tìm kiếm và Filter ---
  Widget _buildSearchAndFilter(ColorScheme colorScheme, TextTheme textTheme) {
    return Column(
      children: [
        // Search bar
        Container(
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: colorScheme.outlineVariant),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 12, offset: const Offset(0, 4)),
            ],
          ),
          child: TextField(
            style: textTheme.bodyLarge?.copyWith(color: colorScheme.onSurface),
            decoration: InputDecoration(
              hintText: 'Search pharmacies...',
              hintStyle: textTheme.bodyLarge?.copyWith(color: colorScheme.outline),
              prefixIcon: Icon(Icons.search, color: colorScheme.outline),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 16),
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Filter: Delivery only
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(8),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 12, offset: const Offset(0, 4)),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.local_shipping_outlined, color: colorScheme.primary),
                  const SizedBox(width: 8),
                  Text(
                    'Delivery only',
                    style: textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600, color: colorScheme.onSurface),
                  ),
                ],
              ),
              Switch(
                value: _isDeliveryOnly,
                activeColor: Colors.white,
                activeTrackColor: colorScheme.primary,
                inactiveThumbColor: Colors.white,
                inactiveTrackColor: colorScheme.outlineVariant,
                onChanged: (value) {
                  setState(() {
                    _isDeliveryOnly = value;
                  });
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  // --- Widget: Card Thông tin Nhà thuốc ---
  Widget _buildPharmacyCard({
    required String name,
    required String address,
    required String distance,
    required String rating,
    required bool isFullyStocked,
    required bool isDeliveryAvailable,
    String? warningText,
    required ColorScheme colorScheme,
    required TextTheme textTheme,
  }) {
    // Nếu thiếu hàng thì viền vàng (tương đương amber-200), ngược lại viền bình thường
    final Color borderColor = isFullyStocked ? colorScheme.outlineVariant.withOpacity(0.3) : Colors.amber.shade200;

    return Container(
      padding: const EdgeInsets.all(24), // p-lg
      decoration: BoxDecoration(
        color: colorScheme.surface, // bg-surface-container-lowest
        borderRadius: BorderRadius.circular(16), // md
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Tên & Đánh giá
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: textTheme.titleMedium?.copyWith(color: colorScheme.onSurface),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.location_on_outlined, size: 16, color: colorScheme.outline),
                        const SizedBox(width: 4),
                        Text(
                          address,
                          style: textTheme.bodyMedium?.copyWith(color: colorScheme.outline),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: colorScheme.surfaceVariant.withOpacity(0.5), // bg-surface-container
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.star, color: Colors.amber, size: 18),
                    const SizedBox(width: 4),
                    Text(
                      rating,
                      style: textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600, color: colorScheme.onSurface),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Tags: Stock Status & Delivery
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (isDeliveryAvailable)
                _buildTagChip(
                  icon: Icons.check_circle_outline,
                  label: 'Delivery Available',
                  bgColor: colorScheme.primaryContainer,
                  textColor: colorScheme.onPrimaryContainer,
                  textTheme: textTheme,
                ),
              if (isFullyStocked)
                _buildTagChip(
                  icon: Icons.inventory_2_outlined,
                  label: 'Fully Stocked',
                  bgColor: colorScheme.primaryContainer,
                  textColor: colorScheme.onPrimaryContainer,
                  textTheme: textTheme,
                )
              else
                _buildTagChip(
                  icon: Icons.warning_amber_rounded,
                  label: 'Partially Stocked',
                  bgColor: Colors.amber.shade100,
                  textColor: Colors.amber.shade900,
                  textTheme: textTheme,
                ),
            ],
          ),

          // Warning Box (nếu thiếu thuốc)
          if (!isFullyStocked && warningText != null)
            Container(
              margin: const EdgeInsets.only(top: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                border: Border.all(color: Colors.amber.shade200),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline, color: Colors.amber.shade700, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      warningText,
                      style: textTheme.bodyMedium?.copyWith(color: Colors.amber.shade900),
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 16),

          // Footer: Distance & Action Button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                distance,
                style: textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500, color: colorScheme.outline),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: isFullyStocked ? colorScheme.primary : colorScheme.surfaceVariant.withOpacity(0.5),
                  foregroundColor: isFullyStocked ? colorScheme.onPrimary : colorScheme.onSurface,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(100),
                    side: isFullyStocked ? BorderSide.none : BorderSide(color: colorScheme.outlineVariant),
                  ),
                ),
                onPressed: () {
                  // Xử lý khi nhấn Select / Consult
                },
                child: Text(
                  isFullyStocked ? 'Select' : 'Consult',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTagChip({required IconData icon, required String label, required Color bgColor, required Color textColor, required TextTheme textTheme}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(100),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: textColor),
          const SizedBox(width: 6),
          Text(
            label,
            style: textTheme.labelMedium?.copyWith(color: textColor, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  // --- Widget: Map Preview ---
  Widget _buildMapPreview(ColorScheme colorScheme, TextTheme textTheme) {
    return Container(
      height: 192, // h-48
      width: double.infinity,
      decoration: BoxDecoration(
        color: colorScheme.surfaceVariant,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Opacity(
            opacity: 0.5,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.asset(
                'assets/images/map_placeholder.png', // Thay ảnh bản đồ vào đây
                fit: BoxFit.cover,
                colorBlendMode: BlendMode.saturation,
                color: Colors.grey, // Làm đen trắng giả lập grayscale
                errorBuilder: (context, error, stackTrace) =>
                    Center(child: Icon(Icons.map, size: 64, color: colorScheme.outlineVariant)),
              ),
            ),
          ),
          Container(
            color: colorScheme.primary.withOpacity(0.05), // bg-primary/5
          ),
          Center(
            child: Material(
              color: colorScheme.surface.withOpacity(0.9), // bg-white/90 backdrop-blur
              borderRadius: BorderRadius.circular(100),
              elevation: 4,
              child: InkWell(
                onTap: () {},
                borderRadius: BorderRadius.circular(100),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.map_outlined, color: colorScheme.primary),
                      const SizedBox(width: 8),
                      Text(
                        'View full map',
                        style: textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600, color: colorScheme.onSurface),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}