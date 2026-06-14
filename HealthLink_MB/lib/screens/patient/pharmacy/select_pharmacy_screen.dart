import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/patient_pharmacy/pharmacy_service.dart';

class SelectPharmacyScreen extends StatefulWidget {
  final String? prescriptionHeaderId;
  final Function(Map<String, dynamic>)? onSelectRequest;
  final VoidCallback? onNextStep;
  final VoidCallback? onPreviousStep;

  const SelectPharmacyScreen({
    super.key,
    this.prescriptionHeaderId,
    this.onSelectRequest,
    this.onNextStep,
    this.onPreviousStep,
  });

  @override
  State<SelectPharmacyScreen> createState() => _SelectPharmacyScreenState();
}

class _SelectPharmacyScreenState extends State<SelectPharmacyScreen> {
  // Trạng thái cho nút gạt (Toggle) "Delivery only"
  bool _isDeliveryOnly = false;
  String _searchQuery = '';
  
  List<dynamic> _pharmacies = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadPharmacies();
    });
  }

  Future<void> _loadPharmacies() async {
    setState(() => _isLoading = true);
    
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.accessToken;
    
    if (token == null) {
      setState(() => _isLoading = false);
      return;
    }

    try {
      final data = await PharmacyService.getRecommendations(
        token,
        deliveryOnly: _isDeliveryOnly ? true : null,
        prescriptionHeaderId: widget.prescriptionHeaderId,
        // lat, lng có thể được truyền vào nếu có
      );
      setState(() {
        _pharmacies = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _consultPharmacy(Map<String, dynamic> pharmacy) async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.accessToken;
    final userId = authProvider.userId;
    
    if (token == null || userId == null) return;
    
    // Hiện loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final payload = {
        'patientId': userId,
        'pharmacyId': pharmacy['pharmacyId'],
        'symptoms': '',
        'description': 'Patient initiated pharmacy consultation',
        'allergies': '',
        'additionalNotes': '',
        'preferredDeliveryType': pharmacy['deliveryAvailable'] == true ? 'Delivery' : 'Pickup',
      };
      
      if (widget.prescriptionHeaderId != null) {
        payload['prescriptionHeaderIds'] = [int.tryParse(widget.prescriptionHeaderId!) ?? 0];
      }

      final created = await PharmacyService.createConsultationRequest(token, payload);
      
      // Đóng loading dialog
      if (mounted) Navigator.pop(context);
      
      // Chuyển sang bước kết nối
      if (widget.onSelectRequest != null) {
        widget.onSelectRequest!(created);
      }
    } catch (e) {
      // Đóng loading dialog
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create consultation request: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Container(
      color: colorScheme.background,
      child: SingleChildScrollView(
        padding: const EdgeInsets.only(left: 20.0, right: 20.0, top: 16.0, bottom: 48.0), // px-container-margin mt-md
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 672), // max-w-2xl
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // --- 2. Search and Filter ---
                _buildSearchAndFilter(colorScheme, textTheme),
                const SizedBox(height: 24),

                // --- 3. Pharmacy List ---
                Text(
                  'Nearby Pharmacies',
                  style: textTheme.titleMedium?.copyWith(color: colorScheme.onSurface),
                ),
                const SizedBox(height: 16),

                if (_isLoading)
                  const Padding(
                    padding: EdgeInsets.all(32.0),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (_pharmacies.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: colorScheme.surface,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.storefront_outlined, size: 48, color: colorScheme.outline),
                        const SizedBox(height: 16),
                        Text('No pharmacies found.', style: textTheme.bodyLarge),
                      ],
                    ),
                  )
                else
                  ..._pharmacies.where((p) {
                    if (_searchQuery.isEmpty) return true;
                    final q = _searchQuery.toLowerCase();
                    final name = (p['name'] ?? '').toLowerCase();
                    final address = (p['address'] ?? '').toLowerCase();
                    return name.contains(q) || address.contains(q);
                  }).map((p) {
                    final isFullyStocked = p['stockStatus'] == 'FULL';
                    final missingItems = p['missingItems'] as List<dynamic>?;
                    String? warning;
                    if (widget.prescriptionHeaderId != null && missingItems != null && missingItems.isNotEmpty) {
                      warning = 'Missing: ${missingItems.take(3).map((m) => m['medicationName']).join(', ')}';
                      if (missingItems.length > 3) warning += ' +${missingItems.length - 3} more';
                    }
                    
                    return Column(
                      children: [
                        _buildPharmacyCard(
                          pharmacy: p,
                          name: p['name'] ?? 'Unknown',
                          address: p['address'] ?? '',
                          distance: p['distanceLabel'] ?? '',
                          rating: p['averageRating']?.toStringAsFixed(1) ?? 'N/A',
                          isFullyStocked: isFullyStocked,
                          isDeliveryAvailable: p['deliveryAvailable'] == true,
                          warningText: warning,
                          colorScheme: colorScheme,
                          textTheme: textTheme,
                        ),
                        const SizedBox(height: 16),
                      ],
                    );
                  }),

                const SizedBox(height: 24),

                // --- 4. Map Preview Placeholder ---
                _buildMapPreview(colorScheme, textTheme),
                const SizedBox(height: 24),
                
                // Action Buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: widget.onPreviousStep,
                        child: const Text('Back'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
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
            onChanged: (val) {
              setState(() => _searchQuery = val);
            },
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
                  _loadPharmacies();
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
    required Map<String, dynamic> pharmacy,
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
                  _consultPharmacy(pharmacy);
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