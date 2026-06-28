import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/patient_pharmacy/medicine_service.dart';
import '../../../l10n/app_localizations.dart';
import 'retail_checkout_screen.dart';

/// Màn hình Cửa hàng thuốc bán lẻ (tab Store).
/// Copy logic từ Web RetailPharmacyStore.jsx.
class RetailStoreScreen extends StatefulWidget {
  const RetailStoreScreen({super.key});

  @override
  State<RetailStoreScreen> createState() => _RetailStoreScreenState();
}

class _RetailStoreScreenState extends State<RetailStoreScreen>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  List<dynamic> _products = [];
  List<String> _categories = [];
  List<String> _dosageForms = [];
  bool _loading = true;
  String _keyword = '';
  String _category = '';
  String _dosageForm = '';

  // Giỏ hàng: danh sách Map {medicine, quantity}
  final List<Map<String, dynamic>> _cartItems = [];

  final _searchController = TextEditingController();
  final _currencyFormat = NumberFormat.currency(locale: 'en_US', symbol: '\$');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadCatalogOptions();
      _loadProducts();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  String? get _token =>
      Provider.of<AuthProvider>(context, listen: false).accessToken;

  /// Tải danh mục và dạng bào chế để hiển thị bộ lọc.
  Future<void> _loadCatalogOptions() async {
    final token = _token;
    if (token == null) return;
    try {
      final data = await MedicineService.searchMedicines(token);
      final cats = <String>{};
      final forms = <String>{};
      for (final item in data) {
        if (item['category'] != null) cats.add(item['category'] as String);
        if (item['dosageForm'] != null) forms.add(item['dosageForm'] as String);
      }
      if (mounted) {
        setState(() {
          _categories = cats.toList()..sort();
          _dosageForms = forms.toList()..sort();
        });
      }
    } catch (_) {}
  }

  /// Tải danh sách thuốc với bộ lọc hiện tại.
  Future<void> _loadProducts() async {
    final token = _token;
    if (token == null) return;
    setState(() => _loading = true);
    try {
      final data = await MedicineService.searchMedicines(
        token,
        keyword: _keyword.isNotEmpty ? _keyword : null,
        category: _category.isNotEmpty ? _category : null,
        dosageForm: _dosageForm.isNotEmpty ? _dosageForm : null,
      );
      if (mounted) setState(() => _products = data);
    } catch (_) {
      if (mounted) setState(() => _products = []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Giỏ hàng helpers ──

  String _displayName(Map<String, dynamic> m) {
    final brand = (m['brandName'] ?? '') as String;
    final generic = (m['genericName'] ?? m['name'] ?? '') as String;
    if (brand.isNotEmpty &&
        generic.isNotEmpty &&
        brand.toLowerCase() != generic.toLowerCase()) {
      return '$brand ($generic)';
    }
    return brand.isNotEmpty ? brand : generic.isNotEmpty ? generic : 'N/A';
  }

  String _shortDesc(Map<String, dynamic> m) {
    return (m['description'] ?? m['activeIngredients'] ?? m['indications'] ?? '')
        as String;
  }

  double _cartSubtotal() {
    return _cartItems.fold(0.0, (sum, item) {
      return sum +
          (item['price'] as num? ?? 0).toDouble() *
              (item['quantity'] as int? ?? 0);
    });
  }

  int _inCartQty(int medicineId) {
    final found = _cartItems.where((i) => i['medicineId'] == medicineId);
    return found.isEmpty ? 0 : found.first['quantity'] as int;
  }

  void _addToCart(Map<String, dynamic> medicine) {
    final l10n = AppLocalizations.of(context)!;
    if (medicine['prescriptionRequired'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.storePrescriptionRequiredMsg)),
      );
      return;
    }
    setState(() {
      final idx = _cartItems
          .indexWhere((i) => i['medicineId'] == medicine['medicineId']);
      if (idx >= 0) {
        _cartItems[idx]['quantity'] = (_cartItems[idx]['quantity'] as int) + 1;
      } else {
        _cartItems.add({...medicine, 'quantity': 1});
      }
    });
  }

  void _incrementItem(int medicineId) {
    setState(() {
      final idx = _cartItems.indexWhere((i) => i['medicineId'] == medicineId);
      if (idx >= 0) {
        _cartItems[idx]['quantity'] = (_cartItems[idx]['quantity'] as int) + 1;
      }
    });
  }

  void _decrementItem(int medicineId) {
    setState(() {
      final idx = _cartItems.indexWhere((i) => i['medicineId'] == medicineId);
      if (idx >= 0) {
        final q = _cartItems[idx]['quantity'] as int;
        if (q > 1) _cartItems[idx]['quantity'] = q - 1;
      }
    });
  }

  void _removeItem(int medicineId) {
    setState(() {
      _cartItems.removeWhere((i) => i['medicineId'] == medicineId);
    });
  }

  // ── UI Builders ──

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final l10n = AppLocalizations.of(context)!;
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: cs.surface,
      // FAB giỏ hàng
      floatingActionButton: _cartItems.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: _showCartSheet,
              icon: Badge(
                label: Text('${_cartItems.length}'),
                child: const Icon(Icons.shopping_cart_outlined),
              ),
              label: Text(_currencyFormat.format(_cartSubtotal())),
              backgroundColor: cs.primary,
              foregroundColor: cs.onPrimary,
            )
          : null,
      body: RefreshIndicator(
        onRefresh: _loadProducts,
        child: CustomScrollView(
          slivers: [
            // Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(l10n.storeTitle,
                                  style: tt.titleLarge?.copyWith(
                                      fontWeight: FontWeight.bold,
                                      color: cs.onSurface)),
                              const SizedBox(height: 4),
                              Text(l10n.storeSubtitle,
                                  style: tt.bodySmall
                                      ?.copyWith(color: cs.onSurfaceVariant)),
                            ],
                          ),
                        ),
                        Text(
                          '${l10n.storeSubtotalLabel}: ${_currencyFormat.format(_cartSubtotal())}',
                          style: tt.bodySmall
                              ?.copyWith(color: cs.onSurfaceVariant),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    // Search + Filters
                    _buildFilters(l10n, cs, tt),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
            // Product grid
            if (_loading)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_products.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.search_off, size: 48, color: cs.outline),
                      const SizedBox(height: 8),
                      Text(l10n.storeNoResults,
                          style: tt.bodyMedium
                              ?.copyWith(color: cs.onSurfaceVariant)),
                    ],
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.62,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) => _buildProductCard(_products[i], l10n, cs, tt),
                    childCount: _products.length,
                  ),
                ),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 80)),
          ],
        ),
      ),
    );
  }

  Widget _buildFilters(AppLocalizations l10n, ColorScheme cs, TextTheme tt) {
    return Column(
      children: [
        // Search bar
        TextField(
          controller: _searchController,
          decoration: InputDecoration(
            hintText: l10n.storeSearchHint,
            prefixIcon: const Icon(Icons.search),
            filled: true,
            fillColor: cs.surfaceContainerLow,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(vertical: 12),
          ),
          onSubmitted: (v) {
            _keyword = v.trim();
            _loadProducts();
          },
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            // Category dropdown
            Expanded(
              child: _buildDropdown(
                value: _category.isEmpty ? null : _category,
                hint: l10n.storeAllCategories,
                items: _categories,
                onChanged: (v) {
                  _category = v ?? '';
                  _loadProducts();
                },
                cs: cs,
              ),
            ),
            const SizedBox(width: 12),
            // Dosage form dropdown
            Expanded(
              child: _buildDropdown(
                value: _dosageForm.isEmpty ? null : _dosageForm,
                hint: l10n.storeAllForms,
                items: _dosageForms,
                onChanged: (v) {
                  _dosageForm = v ?? '';
                  _loadProducts();
                },
                cs: cs,
              ),
            ),
          ],
        ),
      ],
    );
  }

  String _translateOption(String option) {
    if (Localizations.localeOf(context).languageCode != 'vi') return option;
    final map = {
      'Tablet': 'Viên nén', 'Capsule': 'Viên nang', 'Syrup': 'Si-rô', 'Suspension': 'Hỗn dịch',
      'Cream': 'Kem bôi', 'Ointment': 'Thuốc mỡ', 'Gel': 'Gel', 'Drops': 'Thuốc nhỏ',
      'Injection': 'Thuốc tiêm', 'Suppository': 'Thuốc đạn', 'Inhaler': 'Thuốc hít',
      'Powder': 'Thuốc bột', 'Solution': 'Dung dịch', 'Spray': 'Thuốc xịt',
      'Lotion': 'Sữa dưỡng', 'Patch': 'Miếng dán',
      'Pain Relief': 'Giảm đau', 'Analgesics': 'Giảm đau', 'Antibiotics': 'Kháng sinh',
      'Vitamins & Supplements': 'Vitamin & Bổ sung', 'Cough & Cold': 'Ho & Cảm lạnh',
      'Digestive Health': 'Tiêu hóa', 'Skin Care': 'Da liễu', 'Dermatology': 'Da liễu',
      'Eye Care': 'Chăm sóc mắt', 'First Aid': 'Sơ cứu', 'Allergy': 'Dị ứng',
      'Cardiovascular': 'Tim mạch', 'Diabetes': 'Tiểu đường', 'Respiratory': 'Hô hấp',
      'Mental Health': 'Sức khỏe tâm thần', 'Women\'s Health': 'Sức khỏe phụ nữ',
      'Men\'s Health': 'Sức khỏe nam giới', 'Children\'s Health': 'Sức khỏe trẻ em',
    };
    return map[option] ?? option;
  }

  String _getUnitName(String? unit) {
    if (unit == null || unit.isEmpty) return 'N/A';
    if (Localizations.localeOf(context).languageCode != 'vi') return unit;
    final map = {
      'Box': 'Hộp', 'Tablet': 'Viên', 'Pill': 'Viên', 'Capsule': 'Viên',
      'Bottle': 'Chai', 'Tube': 'Tuýp', 'Blister': 'Vỉ', 'Pack': 'Gói',
      'Vial': 'Lọ', 'Ampoule': 'Ống', 'Piece': 'Cái', 'Roll': 'Cuộn',
      'Unit': 'Đơn vị',
    };
    return map[unit] ?? unit;
  }

  String _translateUnit(String? unit) {
    final l10n = AppLocalizations.of(context)!;
    if (unit == null || unit.isEmpty) return ' ${l10n.storeEach}';
    if (Localizations.localeOf(context).languageCode != 'vi') return ' / ${unit.toLowerCase()}';
    final map = {
      'Box': 'hộp', 'Tablet': 'viên', 'Pill': 'viên', 'Capsule': 'viên',
      'Bottle': 'chai', 'Tube': 'tuýp', 'Blister': 'vỉ', 'Pack': 'gói',
      'Vial': 'lọ', 'Ampoule': 'ống', 'Piece': 'cái', 'Roll': 'cuộn',
      'Unit': 'đơn vị',
    };
    return ' / ${map[unit] ?? unit.toLowerCase()}';
  }

  Widget _buildDropdown({
    required String? value,
    required String hint,
    required List<String> items,
    required ValueChanged<String?> onChanged,
    required ColorScheme cs,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          hint: Text(hint, style: TextStyle(color: cs.onSurfaceVariant, fontSize: 13)),
          isExpanded: true,
          icon: Icon(Icons.keyboard_arrow_down, color: cs.onSurfaceVariant),
          items: [
            DropdownMenuItem<String>(value: null, child: Text(hint)),
            ...items.map((e) => DropdownMenuItem(value: e, child: Text(_translateOption(e), style: const TextStyle(fontSize: 13)))),
          ],
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _buildProductCard(
      Map<String, dynamic> medicine, AppLocalizations l10n, ColorScheme cs, TextTheme tt) {
    final name = _displayName(medicine);
    final price = (medicine['price'] as num?)?.toDouble() ?? 0;
    final isPrescription = medicine['prescriptionRequired'] == true;
    final dosageForm = medicine['dosageForm'] as String? ?? '';
    final category = medicine['category'] as String? ?? '';
    final desc = _shortDesc(medicine);
    final inCart = _inCartQty(medicine['medicineId'] as int);

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: cs.surfaceContainerLowest,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showDetailSheet(medicine),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon placeholder
              Container(
                height: 70,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: cs.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(Icons.medication_outlined, size: 32, color: cs.outline),
              ),
              const SizedBox(height: 8),
              // Title
              Text(name, style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w600, color: cs.onSurface),
                  maxLines: 2, overflow: TextOverflow.ellipsis),
              if (isPrescription) ...[
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade100,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(l10n.storePrescriptionRequired,
                      style: TextStyle(fontSize: 10, color: Colors.orange.shade800, fontWeight: FontWeight.w600)),
                ),
              ],
              const SizedBox(height: 4),
              Text([dosageForm, category].where((s) => s.isNotEmpty).join(' • '),
                  style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant, fontSize: 11),
                  maxLines: 1, overflow: TextOverflow.ellipsis),
              if (desc.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(desc, style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant, fontSize: 11),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
              const Spacer(),
              // Price + Actions
              Row(
                children: [
                  Text(_currencyFormat.format(price),
                      style: tt.titleSmall?.copyWith(fontWeight: FontWeight.bold, color: cs.onSurface)),
                  const Spacer(),
                  SizedBox(
                    height: 30,
                    child: FilledButton(
                      onPressed: isPrescription ? null : () => _addToCart(medicine),
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        textStyle: const TextStyle(fontSize: 12),
                      ),
                      child: Text(inCart > 0 ? l10n.storeInCart(inCart) : l10n.storeAdd),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Bottom Sheets ──

  void _showDetailSheet(Map<String, dynamic> medicine) {
    final l10n = AppLocalizations.of(context)!;
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final name = _displayName(medicine);
    final price = (medicine['price'] as num?)?.toDouble() ?? 0;
    final isPrescription = medicine['prescriptionRequired'] == true;
    final desc = _shortDesc(medicine);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.55,
        minChildSize: 0.3,
        maxChildSize: 0.85,
        builder: (_, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: cs.outline.withOpacity(0.3), borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(child: Text(name, style: tt.titleLarge?.copyWith(fontWeight: FontWeight.bold))),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              Text([medicine['dosageForm'], medicine['category']].where((s) => s != null).join(' • '),
                  style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
              const SizedBox(height: 16),
              // Icon placeholder lớn
              Container(
                height: 120, width: double.infinity,
                decoration: BoxDecoration(color: cs.surfaceContainerLow, borderRadius: BorderRadius.circular(12)),
                child: Icon(Icons.medication_outlined, size: 48, color: cs.outline),
              ),
              const SizedBox(height: 16),
              Text(_currencyFormat.format(price), style: tt.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              if (isPrescription) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(8)),
                  child: Text(l10n.storePrescriptionWarning, style: TextStyle(color: Colors.orange.shade800, fontSize: 13)),
                ),
              ],
              const SizedBox(height: 12),
              Text(desc.isNotEmpty ? desc : l10n.storeNoDescription, style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
              const SizedBox(height: 16),
              _detailRow(l10n.storeBrand, medicine['brandName'] as String? ?? 'N/A', tt, cs),
              _detailRow(l10n.storeGeneric, medicine['genericName'] as String? ?? 'N/A', tt, cs),
              _detailRow(l10n.storeUnit, _getUnitName(medicine['unit'] as String?), tt, cs),
              const SizedBox(height: 20),
              if (!isPrescription)
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () {
                      _addToCart(medicine);
                      Navigator.pop(ctx);
                    },
                    icon: const Icon(Icons.add_shopping_cart),
                    label: Text(l10n.storeAdd),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value, TextTheme tt, ColorScheme cs) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Text('$label: ', style: tt.bodySmall?.copyWith(fontWeight: FontWeight.w600, color: cs.onSurface)),
          Expanded(child: Text(value, style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant))),
        ],
      ),
    );
  }

  void _showCartSheet() {
    final l10n = AppLocalizations.of(context)!;
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          final subtotal = _cartSubtotal();
          return Padding(
            padding: EdgeInsets.only(
              left: 20, right: 20, top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: cs.outline.withOpacity(0.3), borderRadius: BorderRadius.circular(2)))),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(l10n.storeCart, style: tt.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                      Text(l10n.storeItemsCount(_cartItems.length), style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                    ]),
                    Text(_currencyFormat.format(subtotal), style: tt.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 12),
                if (_cartItems.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Column(children: [
                      Icon(Icons.shopping_bag_outlined, size: 36, color: cs.outline),
                      const SizedBox(height: 8),
                      Text(l10n.storeCartEmpty, style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant), textAlign: TextAlign.center),
                    ]),
                  )
                else ...[
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 300),
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: _cartItems.length,
                      separatorBuilder: (_, __) => Divider(color: cs.outlineVariant, height: 16),
                      itemBuilder: (_, i) {
                        final item = _cartItems[i];
                        final mid = item['medicineId'] as int;
                        return Row(
                          children: [
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(_displayName(item), style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w500)),
                                Text('${_currencyFormat.format((item['price'] as num?)?.toDouble() ?? 0)}${_translateUnit(item['unit'] as String?)}',
                                    style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                              ]),
                            ),
                            // Qty controls
                            Row(children: [
                              IconButton(icon: const Icon(Icons.remove, size: 18), onPressed: () {
                                _decrementItem(mid);
                                setSheetState(() {});
                                setState(() {});
                              }),
                              Text('${item['quantity']}', style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                              IconButton(icon: const Icon(Icons.add, size: 18), onPressed: () {
                                _incrementItem(mid);
                                setSheetState(() {});
                                setState(() {});
                              }),
                            ]),
                            IconButton(
                              icon: Icon(Icons.delete_outline, size: 18, color: cs.error),
                              onPressed: () {
                                _removeItem(mid);
                                setSheetState(() {});
                                setState(() {});
                                if (_cartItems.isEmpty) Navigator.pop(ctx);
                              },
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 12),
                  Divider(color: cs.outlineVariant),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Text(l10n.storeSubtotalLabel, style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                    Text(_currencyFormat.format(subtotal), style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.bold)),
                  ]),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () {
                        Navigator.pop(ctx);
                        Navigator.push(context, MaterialPageRoute(
                          builder: (_) => RetailCheckoutScreen(cartItems: List.from(_cartItems)),
                        )).then((result) {
                          if (result is Map<String, dynamic>) {
                            setState(() => _cartItems.clear());
                          }
                        });
                      },
                      child: Text(l10n.storeCheckout),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
