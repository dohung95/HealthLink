import 'package:flutter/material.dart';

class PharmacyConsultationScreen extends StatelessWidget {
  const PharmacyConsultationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: colorScheme.background,

      // Top App Bar kèm Top Navigation Tabs
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: colorScheme.primary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Healthcare Portal',
          style: textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w600,
            color: colorScheme.primary,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            width: double.infinity,
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: colorScheme.surfaceVariant)),
            ),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 768), // max-w-3xl
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Row(
                    children: [
                      _buildTopTab('Pharmacies', isActive: true, colorScheme: colorScheme, textTheme: textTheme),
                      const SizedBox(width: 32),
                      _buildTopTab('Requests', isActive: false, colorScheme: colorScheme, textTheme: textTheme),
                      const SizedBox(width: 32),
                      _buildTopTab('Orders', isActive: false, colorScheme: colorScheme, textTheme: textTheme),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),

      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 32.0), // py-lg md:py-xl
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 768), // max-w-3xl
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // --- 1. Progress Stepper ---
                _buildProgressStepper(colorScheme, textTheme),
                const SizedBox(height: 48), // mb-xl

                // --- 2. Header Section ---
                Text(
                  'Do you have a prescription?',
                  textAlign: TextAlign.center,
                  style: textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: colorScheme.onBackground,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Select an existing prescription or skip to browse pharmacies without one.',
                  textAlign: TextAlign.center,
                  style: textTheme.bodyLarge?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 48),

                // --- 3. Empty State Content ---
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(32), // p-xl
                  constraints: const BoxConstraints(minHeight: 300),
                  decoration: BoxDecoration(
                    color: colorScheme.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: colorScheme.surfaceVariant),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 2)),
                    ],
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 96,
                        height: 96,
                        decoration: BoxDecoration(
                          color: colorScheme.surfaceVariant.withOpacity(0.5), // bg-surface-container
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.receipt_long_outlined, // Thay thế cho icon prescriptions
                          size: 48,
                          color: colorScheme.primary.withOpacity(0.8),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'No prescriptions found',
                        style: textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: colorScheme.onBackground,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        "We couldn't find any recent prescriptions linked to your account.",
                        textAlign: TextAlign.center,
                        style: textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 48),

                // --- 4. Actions (Skip Button) ---
                SizedBox(
                  width: double.infinity, // Mobile: full width, Desktop có thể bọc Row
                  height: 56,
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: colorScheme.primary,
                      side: BorderSide(color: colorScheme.primary, width: 2),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                    ).copyWith(
                      overlayColor: WidgetStateProperty.resolveWith<Color?>((states) {
                        if (states.contains(WidgetState.pressed)) {
                          return colorScheme.primary.withOpacity(0.1); // hover:bg-surface-container-low
                        }
                        return null;
                      }),
                    ),
                    onPressed: () {
                      // Xử lý khi nhấn bỏ qua
                    },
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          "Skip, I don't have a prescription",
                          style: textTheme.titleMedium?.copyWith(
                            color: colorScheme.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Icon(Icons.arrow_forward, size: 20, color: colorScheme.primary),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // --- Widget hỗ trợ: Top Navigation Tab ---
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

  // --- Widget hỗ trợ: Progress Stepper ---
  Widget _buildProgressStepper(ColorScheme colorScheme, TextTheme textTheme) {
    return Stack(
      alignment: Alignment.center,
      children: [
        // Đường line xám nằm dưới
        Positioned(
          left: 0,
          right: 0,
          child: Container(height: 2, color: colorScheme.surfaceVariant),
        ),
        // Các Node của Stepper
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildStepperNode('1', 'Prescription', isActive: true, colorScheme: colorScheme, textTheme: textTheme),
            _buildStepperNode('2', 'Pharmacy', isActive: false, colorScheme: colorScheme, textTheme: textTheme),
            _buildStepperNode('3', 'Review', isActive: false, colorScheme: colorScheme, textTheme: textTheme),
            _buildStepperNode('4', 'Confirm', isActive: false, colorScheme: colorScheme, textTheme: textTheme),
          ],
        ),
      ],
    );
  }

  Widget _buildStepperNode(String stepNum, String label, {required bool isActive, required ColorScheme colorScheme, required TextTheme textTheme}) {
    final bgColor = isActive ? colorScheme.primary : colorScheme.surfaceVariant;
    final textColor = isActive ? colorScheme.onPrimary : colorScheme.onSurfaceVariant;
    final labelColor = isActive ? colorScheme.primary : colorScheme.onSurfaceVariant;

    return Container(
      color: colorScheme.background, // Tạo background để che đi đường line xám (giống lớp px-2 bg-background trong HTML)
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Column(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: bgColor,
              shape: BoxShape.circle,
              boxShadow: isActive ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)] : [],
            ),
            child: Center(
              child: Text(
                stepNum,
                style: TextStyle(
                  color: textColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          // Chỉ ẩn label trên mobile nếu cần thiết, trong Flutter ta để nguyên hoặc bọc MediaQuery
          Text(
            label,
            style: textTheme.labelMedium?.copyWith(
              color: labelColor,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}