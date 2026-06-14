import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/patient_pharmacy/pharmacy_service.dart';

class ConnectingPharmacyScreen extends StatefulWidget {
  final Map<String, dynamic>? currentRequest;
  final Function(Map<String, dynamic>)? onOrderCreated;
  final VoidCallback? onNextStep;
  final VoidCallback? onPreviousStep;

  const ConnectingPharmacyScreen({
    super.key,
    this.currentRequest,
    this.onOrderCreated,
    this.onNextStep,
    this.onPreviousStep,
  });

  @override
  State<ConnectingPharmacyScreen> createState() => _ConnectingPharmacyScreenState();
}
class _ConnectingPharmacyScreenState extends State<ConnectingPharmacyScreen> with SingleTickerProviderStateMixin {
  late Timer _timer;

  // Bỏ thời gian còn lại (bởi vì web đếm tiến độ lên, ta có thể đếm giây từ 0)
  int _elapsedSeconds = 0;
  Timer? _pollingTimer;

  // Animation xoay tròn cho icon Sync
  late AnimationController _spinController;

  @override
  void initState() {
    super.initState();

    // Khởi tạo Animation xoay liên tục
    _spinController = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    )..repeat();

    // Khởi tạo Timer đếm tới
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _elapsedSeconds++;
      });
    });

    _startPolling();
  }

  void _startPolling() {
    final requestId = widget.currentRequest?['requestId'];
    if (requestId == null) return;

    _pollingTimer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final token = authProvider.accessToken;
      if (token == null) return;

      try {
        final updated = await PharmacyService.getConsultationRequestById(token, requestId.toString());
        if (updated['status'] != 'PENDING') {
          timer.cancel();
          if (updated['status'] == 'ORDER_CREATED' && updated['pharmacyOrderId'] != null) {
            // Lấy order
            final order = await PharmacyService.getOrderById(token, updated['pharmacyOrderId'].toString());
            if (widget.onOrderCreated != null) {
              widget.onOrderCreated!(order);
            }
            if (widget.onNextStep != null) {
              widget.onNextStep!();
            }
          }
        }
      } catch (e) {
        // Có thể bỏ qua nếu lỗi mạng nhỏ
      }
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    _pollingTimer?.cancel();
    _spinController.dispose();
    super.dispose();
  }

  // Format giây thành dạng MM:SS
  String get _formattedTime {
    final int minutes = _elapsedSeconds ~/ 60;
    final int seconds = _elapsedSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Container(
      color: colorScheme.background,
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 672), // max-w-2xl
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 16),

                // --- 2. Status Card ---
                _buildStatusCard(colorScheme, textTheme),
                const SizedBox(height: 24),

                // --- 3. Vertical Timeline/Stepper ---
                _buildVerticalTimeline(colorScheme, textTheme),
                const SizedBox(height: 24),

                // --- 4. Illustration Box ---
                _buildIllustrationBox(colorScheme, textTheme),
                const SizedBox(height: 24),

                // --- 5. Action Buttons ---
                _buildActionButtons(colorScheme, textTheme),
                const SizedBox(height: 48), // Padding đáy
              ],
            ),
          ),
        ),
      ),
    );
  }

  // --- Widget: Status Card (Nhà thuốc đang kết nối) ---
  Widget _buildStatusCard(ColorScheme colorScheme, TextTheme textTheme) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.surfaceVariant.withOpacity(0.5)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 64, height: 64,
            decoration: BoxDecoration(
              color: colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.local_pharmacy_outlined, color: colorScheme.onPrimaryContainer, size: 32),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.currentRequest?['pharmacyName'] ?? 'Pharmacy', style: textTheme.titleMedium?.copyWith(color: colorScheme.onSurface, fontSize: 20)),
                const SizedBox(height: 4),
                Text(widget.currentRequest?['pharmacyAddress'] ?? '', style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.near_me_outlined, size: 18, color: colorScheme.outline),
                    const SizedBox(width: 4),
                    Text('1.2 km away', style: textTheme.labelMedium?.copyWith(color: colorScheme.onSurface)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- Widget: Vertical Timeline ---
  Widget _buildVerticalTimeline(ColorScheme colorScheme, TextTheme textTheme) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.surfaceVariant.withOpacity(0.5)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: IntrinsicHeight(
        child: Stack(
          children: [
            // Đường line dọc xuyên suốt
            Positioned(
              left: 15, top: 16, bottom: 16,
              child: Container(width: 2, color: colorScheme.surfaceVariant),
            ),
            Column(
              children: [
                // Bước 1: Request Sent (Hoàn thành)
                _buildTimelineItem(
                  icon: Icons.done_all,
                  iconBg: colorScheme.primaryContainer,
                  iconColor: colorScheme.primary,
                  title: 'Request Sent',
                  subtitle: 'Successfully transmitted to the pharmacy',
                  colorScheme: colorScheme,
                  textTheme: textTheme,
                ),
                const SizedBox(height: 32),

                // Bước 2: Waiting for acceptance (Đang chờ - Có Timer & Animation)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Icon xoay vòng
                    Container(
                      width: 32, height: 32,
                      decoration: BoxDecoration(color: colorScheme.primary, shape: BoxShape.circle),
                      child: RotationTransition(
                        turns: _spinController,
                        child: Icon(Icons.sync, color: colorScheme.onPrimary, size: 18),
                      ),
                    ),
                    const SizedBox(width: 24),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Waiting for acceptance', style: textTheme.labelMedium?.copyWith(color: colorScheme.onSurface, fontSize: 14)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                decoration: BoxDecoration(
                                  color: colorScheme.primaryContainer,
                                  borderRadius: BorderRadius.circular(100),
                                ),
                                child: Text(_formattedTime, style: textTheme.labelMedium?.copyWith(color: colorScheme.onPrimaryContainer)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text('A pharmacist is reviewing your prescription', style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                // Bước 3: Connected (Vô hiệu hóa)
                _buildTimelineItem(
                  icon: Icons.link,
                  iconBg: colorScheme.surfaceVariant.withOpacity(0.5),
                  iconColor: colorScheme.outline,
                  title: 'Connected',
                  subtitle: 'Direct channel established',
                  titleColor: colorScheme.outline,
                  subtitleColor: colorScheme.outlineVariant,
                  colorScheme: colorScheme,
                  textTheme: textTheme,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineItem({
    required IconData icon, required Color iconBg, required Color iconColor,
    required String title, required String subtitle,
    Color? titleColor, Color? subtitleColor,
    required ColorScheme colorScheme, required TextTheme textTheme,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32, height: 32,
          decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
          child: Icon(icon, color: iconColor, size: 18),
        ),
        const SizedBox(width: 24),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: textTheme.labelMedium?.copyWith(color: titleColor ?? colorScheme.onSurface, fontSize: 14)),
              const SizedBox(height: 4),
              Text(subtitle, style: textTheme.bodyMedium?.copyWith(color: subtitleColor ?? colorScheme.onSurfaceVariant)),
            ],
          ),
        ),
      ],
    );
  }

  // --- Widget: Box Minh họa (Illustration) ---
  Widget _buildIllustrationBox(ColorScheme colorScheme, TextTheme textTheme) {
    return Container(
      width: double.infinity,
      height: 192,
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.surfaceVariant),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [colorScheme.primary.withOpacity(0.05), Colors.transparent],
                begin: Alignment.topRight, end: Alignment.bottomLeft,
              ),
            ),
          ),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.sensors, size: 48, color: colorScheme.primary.withOpacity(0.4)),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32.0),
                child: Text(
                  'Ensuring a secure and encrypted connection to your healthcare provider.',
                  textAlign: TextAlign.center,
                  style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- Widget: Các nút chức năng (Chat / Refresh) ---
  Widget _buildActionButtons(ColorScheme colorScheme, TextTheme textTheme) {
    return Column(
      children: [
        // Nút Refresh
        SizedBox(
          width: double.infinity,
          height: 56,
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              backgroundColor: colorScheme.surface,
              foregroundColor: colorScheme.onSurface,
              side: BorderSide(color: colorScheme.outlineVariant),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              // Action làm mới (polling vẫn chạy ngầm)
            },
            icon: const Icon(Icons.refresh, size: 20),
            label: const Text('Refresh', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 56,
          child: TextButton(
            onPressed: widget.onPreviousStep,
            child: const Text('Cancel Request & Go Back', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.redAccent)),
          ),
        ),
      ],
    );
  }
}