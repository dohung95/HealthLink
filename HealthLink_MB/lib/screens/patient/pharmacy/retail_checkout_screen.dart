import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:geolocator/geolocator.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/patient_pharmacy/pharmacy_service.dart';
import '../../../l10n/app_localizations.dart';
import '../../../config/api_config.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

/// Checkout wizard 3 bước cho đơn bán lẻ.
/// Copy logic từ Web RetailCheckoutWizard.jsx.
class RetailCheckoutScreen extends StatefulWidget {
  final List<Map<String, dynamic>> cartItems;
  const RetailCheckoutScreen({super.key, required this.cartItems});

  @override
  State<RetailCheckoutScreen> createState() => _RetailCheckoutScreenState();
}

class _RetailCheckoutScreenState extends State<RetailCheckoutScreen> {
  final _currencyFormat = NumberFormat.currency(locale: 'en_US', symbol: '\$');
  final _steps = ['delivery', 'pharmacy', 'review'];
  String _currentStep = 'delivery';

  // Delivery
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  double? _lat;
  double? _lng;
  String _addressSource = 'PROFILE';
  bool _savingAddress = false;

  // Pharmacy
  List<dynamic> _pharmacies = [];
  bool _loadingPharmacies = false;
  Map<String, dynamic>? _selectedPharmacy;

  // Submit
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadProfile());
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  String? get _token =>
      Provider.of<AuthProvider>(context, listen: false).accessToken;

  String _displayName(Map<String, dynamic> m) {
    final brand = (m['brandName'] ?? '') as String;
    final generic = (m['genericName'] ?? m['name'] ?? '') as String;
    if (brand.isNotEmpty && generic.isNotEmpty && brand.toLowerCase() != generic.toLowerCase()) {
      return '$brand ($generic)';
    }
    return brand.isNotEmpty ? brand : generic.isNotEmpty ? generic : 'N/A';
  }

  double _cartSubtotal() {
    return widget.cartItems.fold(0.0, (sum, item) {
      return sum + (item['price'] as num? ?? 0).toDouble() * (item['quantity'] as int? ?? 0);
    });
  }

  List<Map<String, dynamic>> _toCartPayload() {
    return widget.cartItems.map((item) => {
      'medicineId': item['medicineId'],
      'quantity': item['quantity'] ?? 1,
    }).toList();
  }

  /// Tải thông tin profile để điền sẵn phone/address.
  Future<void> _loadProfile() async {
    final token = _token;
    if (token == null) return;
    try {
      final res = await http.get(
        Uri.parse(ApiConfig.patientProfile),
        headers: {'Accept': 'application/json', 'Authorization': 'Bearer $token'},
      ).timeout(ApiConfig.connectTimeout);
      if (res.statusCode == 200) {
        final profile = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
        final addr = [profile['address'], profile['city'], profile['country']]
            .where((s) => s != null && (s as String).isNotEmpty).join(', ');
        if (mounted) {
          setState(() {
            if (_phoneController.text.isEmpty) _phoneController.text = profile['phoneNumber'] ?? '';
            if (_addressController.text.isEmpty) _addressController.text = addr;
            _lat = (profile['latitude'] as num?)?.toDouble();
            _lng = (profile['longitude'] as num?)?.toDouble();
          });
        }
      }
    } catch (_) {}
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  // ── Geocoding ──

  Future<void> _useCurrentLocation() async {
    final l10n = AppLocalizations.of(context)!;
    final token = _token;
    if (token == null) return;

    setState(() => _savingAddress = true);
    try {
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.deniedForever || perm == LocationPermission.denied) {
        _snack(l10n.retailCannotAccessLocation);
        return;
      }
      final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      final result = await PharmacyService.reverseGeocode(token, latitude: pos.latitude, longitude: pos.longitude);
      if (mounted) {
        setState(() {
          _addressController.text = result['formattedAddress'] ?? '';
          _lat = (result['latitude'] as num?)?.toDouble();
          _lng = (result['longitude'] as num?)?.toDouble();
          _addressSource = 'DEVICE_LOCATION';
        });
        _snack(l10n.retailAddressUpdated);
      }
    } catch (e) {
      _snack(e.toString());
    } finally {
      if (mounted) setState(() => _savingAddress = false);
    }
  }

  Future<bool> _verifyAddress() async {
    final l10n = AppLocalizations.of(context)!;
    final token = _token;
    if (token == null) return false;
    if (_addressController.text.trim().isEmpty) {
      _snack(l10n.retailEnterAddress);
      return false;
    }
    setState(() => _savingAddress = true);
    try {
      final result = await PharmacyService.geocodeAddress(token, _addressController.text.trim());
      if (mounted) {
        setState(() {
          _addressController.text = result['formattedAddress'] ?? _addressController.text.trim();
          _lat = (result['latitude'] as num?)?.toDouble();
          _lng = (result['longitude'] as num?)?.toDouble();
          _addressSource = 'MANUAL';
        });
        _snack(l10n.retailAddressVerified);
      }
      return true;
    } catch (e) {
      _snack(e.toString());
      return false;
    } finally {
      if (mounted) setState(() => _savingAddress = false);
    }
  }

  Future<void> _goToPharmacyStep() async {
    final l10n = AppLocalizations.of(context)!;
    if (_phoneController.text.trim().isEmpty) {
      _snack(l10n.retailEnterPhone);
      return;
    }
    if (_addressController.text.trim().isEmpty) {
      _snack(l10n.retailEnterAddress);
      return;
    }
    if (_lat == null || _lng == null) {
      final ok = await _verifyAddress();
      if (!ok) return;
    }
    setState(() => _currentStep = 'pharmacy');
    _loadPharmacies();
  }

  Future<void> _loadPharmacies() async {
    final token = _token;
    if (token == null || _lat == null || _lng == null) return;
    setState(() => _loadingPharmacies = true);
    try {
      final result = await PharmacyService.getRetailRecommendations(token, {
        'lat': _lat,
        'lng': _lng,
        'deliveryOnly': true,
        'items': _toCartPayload(),
      });
      if (mounted) setState(() => _pharmacies = result);
    } catch (e) {
      _snack(e.toString());
      if (mounted) setState(() => _pharmacies = []);
    } finally {
      if (mounted) setState(() => _loadingPharmacies = false);
    }
  }

  void _selectPharmacy(Map<String, dynamic> pharmacy) {
    final l10n = AppLocalizations.of(context)!;
    if (pharmacy['stockStatus'] != 'FULL') {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(l10n.retailStepPharmacy),
          content: Text(l10n.retailPartialStockConfirm),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l10n.btnCancel)),
            FilledButton(onPressed: () {
              Navigator.pop(ctx);
              setState(() { _selectedPharmacy = pharmacy; _currentStep = 'review'; });
            }, child: Text(l10n.retailContinue)),
          ],
        ),
      );
    } else {
      setState(() { _selectedPharmacy = pharmacy; _currentStep = 'review'; });
    }
  }

  Future<void> _submitOrder() async {
    final l10n = AppLocalizations.of(context)!;
    final token = _token;
    if (token == null || _selectedPharmacy == null) {
      _snack(l10n.retailChoosePharmacy);
      return;
    }
    setState(() => _submitting = true);
    try {
      final order = await PharmacyService.createRetailOrder(token, {
        'pharmacyId': _selectedPharmacy!['pharmacyId'],
        'deliveryType': 'Delivery',
        'deliveryAddress': _addressController.text.trim(),
        'deliveryLatitude': _lat,
        'deliveryLongitude': _lng,
        'deliveryPhoneNumber': _phoneController.text.trim(),
        'deliveryAddressSource': _addressSource,
        'paymentMethod': 'EWallet',
        'items': _toCartPayload(),
      });
      _snack(l10n.retailOrderCreated);
      if (mounted) Navigator.pop(context, order);
    } catch (e) {
      String errMsg = e.toString();
      if (errMsg.contains('outside pharmacy delivery radius')) {
        final l10n = AppLocalizations.of(context)!;
        errMsg = Localizations.localeOf(context).languageCode == 'vi'
            ? 'Địa chỉ giao hàng nằm ngoài phạm vi giao hàng của nhà thuốc này. Vui lòng chọn nhà thuốc khác hoặc thay đổi địa chỉ.'
            : 'Delivery address is outside pharmacy delivery radius.';
      } else if (errMsg.contains('{"error"')) {
        try {
          final jsonStr = errMsg.substring(errMsg.indexOf('{'));
          final map = jsonDecode(jsonStr);
          if (map['message'] != null) errMsg = map['message'];
        } catch (_) {}
      }
      _snack(errMsg);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  // ── UI ──

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final stepIdx = _steps.indexOf(_currentStep);

    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        backgroundColor: cs.surface,
        elevation: 0,
        scrolledUnderElevation: 1,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: cs.primary),
          onPressed: () {
            if (stepIdx > 0) {
              setState(() => _currentStep = _steps[stepIdx - 1]);
            } else {
              Navigator.pop(context);
            }
          },
        ),
        title: Text(l10n.retailCheckoutTitle, style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600, color: cs.primary)),
      ),
      body: Column(
        children: [
          // Stepper
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Row(
              children: List.generate(_steps.length, (i) {
                final active = i == stepIdx;
                final completed = i < stepIdx;
                final label = i == 0 ? l10n.retailStepDelivery : i == 1 ? l10n.retailStepPharmacy : l10n.retailStepReview;
                return Expanded(
                  child: Row(
                    children: [
                      if (i > 0) Expanded(child: Container(height: 2, color: completed ? cs.primary : cs.outlineVariant)),
                      CircleAvatar(
                        radius: 14,
                        backgroundColor: active || completed ? cs.primary : cs.outlineVariant,
                        child: completed
                            ? Icon(Icons.check, size: 14, color: cs.onPrimary)
                            : Text('${i + 1}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: active ? cs.onPrimary : cs.onSurfaceVariant)),
                      ),
                      const SizedBox(width: 4),
                      Flexible(child: Text(label, style: tt.labelSmall?.copyWith(color: active ? cs.primary : cs.onSurfaceVariant), overflow: TextOverflow.ellipsis)),
                    ],
                  ),
                );
              }),
            ),
          ),
          Divider(height: 1, color: cs.outlineVariant),
          // Step body
          Expanded(
            child: _currentStep == 'delivery'
                ? _buildDeliveryStep(l10n, cs, tt)
                : _currentStep == 'pharmacy'
                    ? _buildPharmacyStep(l10n, cs, tt)
                    : _buildReviewStep(l10n, cs, tt),
          ),
        ],
      ),
    );
  }

  // ── Step 1: Delivery ──
  Widget _buildDeliveryStep(AppLocalizations l10n, ColorScheme cs, TextTheme tt) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.retailReceiverPhone, style: tt.labelMedium?.copyWith(fontWeight: FontWeight.w500)),
          const SizedBox(height: 6),
          TextField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(
              filled: true, fillColor: cs.surfaceContainerLow,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: 16),
          Text(l10n.retailDeliveryAddress, style: tt.labelMedium?.copyWith(fontWeight: FontWeight.w500)),
          const SizedBox(height: 6),
          TextField(
            controller: _addressController,
            maxLines: 3,
            onChanged: (_) { setState(() { _lat = null; _lng = null; _addressSource = 'MANUAL'; }); },
            decoration: InputDecoration(
              filled: true, fillColor: cs.surfaceContainerLow,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(spacing: 8, children: [
            OutlinedButton.icon(
              onPressed: _savingAddress ? null : _useCurrentLocation,
              icon: const Icon(Icons.my_location, size: 16),
              label: Text(l10n.retailUseCurrentLocation, style: const TextStyle(fontSize: 13)),
            ),
            OutlinedButton.icon(
              onPressed: _savingAddress ? null : _verifyAddress,
              icon: const Icon(Icons.location_on_outlined, size: 16),
              label: Text(l10n.retailVerifyAddress, style: const TextStyle(fontSize: 13)),
            ),
          ]),
          if (_lat != null && _lng != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
              child: Row(children: [
                Icon(Icons.check_circle, size: 16, color: Colors.green.shade700),
                const SizedBox(width: 8),
                Text('${l10n.retailLocationVerified}: ${_lat!.toStringAsFixed(5)}, ${_lng!.toStringAsFixed(5)}',
                    style: TextStyle(fontSize: 12, color: Colors.green.shade700)),
              ]),
            ),
          ],
          const SizedBox(height: 24),
          Row(mainAxisAlignment: MainAxisAlignment.end, children: [
            OutlinedButton(onPressed: () => Navigator.pop(context), child: Text(l10n.btnCancel)),
            const SizedBox(width: 12),
            FilledButton(
              onPressed: _savingAddress ? null : _goToPharmacyStep,
              child: Text(l10n.retailContinue),
            ),
          ]),
        ],
      ),
    );
  }

  // ── Step 2: Pharmacy ──
  Widget _buildPharmacyStep(AppLocalizations l10n, ColorScheme cs, TextTheme tt) {
    if (_loadingPharmacies) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_pharmacies.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(l10n.retailPharmacyNotFound, style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant), textAlign: TextAlign.center),
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _pharmacies.length + 1, // +1 for hint
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        if (i == 0) {
          return Text(l10n.retailSortedByHint, style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant));
        }
        final p = _pharmacies[i - 1] as Map<String, dynamic>;
        final total = (p['medicineSubtotal'] as num? ?? 0).toDouble() + (p['deliveryFee'] as num? ?? 0).toDouble();
        final stock = p['stockStatus'] as String? ?? '';
        final stockLabel = stock == 'FULL' ? l10n.retailStockFull : stock == 'PARTIAL' ? l10n.retailStockPartial : l10n.retailStockUnknown;
        final stockColor = stock == 'FULL' ? Colors.green : stock == 'PARTIAL' ? Colors.orange : Colors.grey;
        return Card(
          elevation: 1,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => _selectPharmacy(p),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(child: Text(p['name'] ?? '', style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w600))),
                      Text(_currencyFormat.format(total), style: tt.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(p['address'] ?? '', style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                  const SizedBox(height: 8),
                  Wrap(spacing: 8, children: [
                    Chip(label: Text(stockLabel, style: const TextStyle(fontSize: 11)), backgroundColor: stockColor.withOpacity(0.15), side: BorderSide.none, padding: EdgeInsets.zero, materialTapTargetSize: MaterialTapTargetSize.shrinkWrap),
                    Text('${l10n.retailDeliveryFeeLabel}: ${_currencyFormat.format((p['deliveryFee'] as num? ?? 0).toDouble())}',
                        style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                    Text(p['distanceLabel'] ?? l10n.retailDistanceUnavailable,
                        style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                  ]),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ── Step 3: Review ──
  Widget _buildReviewStep(AppLocalizations l10n, ColorScheme cs, TextTheme tt) {
    if (_selectedPharmacy == null) return const SizedBox.shrink();
    final subtotal = (_selectedPharmacy!['medicineSubtotal'] as num? ?? _cartSubtotal()).toDouble();
    final deliveryFee = (_selectedPharmacy!['deliveryFee'] as num? ?? 0).toDouble();
    final total = subtotal + deliveryFee;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_selectedPharmacy!['stockStatus'] != 'FULL')
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(8)),
              child: Text(l10n.retailStockWarning, style: TextStyle(color: Colors.orange.shade800, fontSize: 13)),
            ),
          // Pharmacy & Delivery cards
          Row(
            children: [
              Expanded(child: _infoCard(l10n.retailPharmacyLabel, _selectedPharmacy!['name'] ?? '', _selectedPharmacy!['address'] ?? '', cs, tt)),
              const SizedBox(width: 12),
              Expanded(child: _infoCard(l10n.retailDeliveryLabel, _phoneController.text, _addressController.text, cs, tt)),
            ],
          ),
          const SizedBox(height: 16),
          // Cart items
          Text(l10n.storeCart, style: tt.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ...widget.cartItems.map((item) {
            final itemTotal = (item['price'] as num? ?? 0).toDouble() * (item['quantity'] as int? ?? 0);
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(_displayName(item), style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w500)),
                  Text(l10n.retailQtyLabel(item['quantity'] as int? ?? 0), style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                ])),
                Text(_currencyFormat.format(itemTotal), style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w500)),
              ]),
            );
          }),
          const SizedBox(height: 16),
          // Summary
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: cs.surfaceContainerLow, borderRadius: BorderRadius.circular(12)),
            child: Column(children: [
              _summaryRow(l10n.retailMedicineSubtotal, _currencyFormat.format(subtotal), tt, cs),
              _summaryRow(l10n.retailDeliveryFeeLabel, _currencyFormat.format(deliveryFee), tt, cs),
              Divider(color: cs.outlineVariant, height: 16),
              _summaryRow(l10n.retailTotal, _currencyFormat.format(total), tt, cs, bold: true),
            ]),
          ),
          const SizedBox(height: 24),
          Row(mainAxisAlignment: MainAxisAlignment.end, children: [
            OutlinedButton(onPressed: () => setState(() => _currentStep = 'pharmacy'), child: Text(l10n.btnBack)),
            const SizedBox(width: 12),
            FilledButton(
              onPressed: _submitting ? null : _submitOrder,
              child: Text(_submitting ? l10n.retailSubmitting : l10n.retailSubmitOrder),
            ),
          ]),
        ],
      ),
    );
  }

  Widget _infoCard(String title, String line1, String line2, ColorScheme cs, TextTheme tt) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: cs.surfaceContainerLow, borderRadius: BorderRadius.circular(12)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: tt.labelMedium?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Text(line1, style: tt.bodySmall),
        Text(line2, style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant), maxLines: 2, overflow: TextOverflow.ellipsis),
      ]),
    );
  }

  Widget _summaryRow(String label, String value, TextTheme tt, ColorScheme cs, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label, style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
        Text(value, style: tt.bodyMedium?.copyWith(fontWeight: bold ? FontWeight.bold : FontWeight.w500)),
      ]),
    );
  }
}
