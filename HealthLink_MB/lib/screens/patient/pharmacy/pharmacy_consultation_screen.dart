import 'package:flutter/material.dart';
import 'select_pharmacy_screen.dart';
import 'consultation_requests.dart';
import 'pharmacy_orders_list_screen.dart';
import 'connecting_pharmacy_screen.dart';
import 'order_payment_screen.dart';
import 'retail_store_screen.dart';
import 'package:provider/provider.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/patient_service.dart';
import '../../../l10n/app_localizations.dart';

class PharmacyConsultationScreen extends StatefulWidget {
  const PharmacyConsultationScreen({super.key});

  @override
  State<PharmacyConsultationScreen> createState() => _PharmacyConsultationScreenState();
}

class _PharmacyConsultationScreenState extends State<PharmacyConsultationScreen> {
  int _selectedIndex = 0;
  late PageController _pageController;
  
  int _currentWizardStep = 0;
  late PageController _wizardPageController;

  // --- Pharmacy Workflow State ---
  List<dynamic> _prescriptions = [];
  bool _isLoadingPrescriptions = true;
  String? _selectedPrescriptionId;
  Map<String, dynamic>? _currentRequest;
  Map<String, dynamic>? _currentOrder;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: _selectedIndex);
    _wizardPageController = PageController(initialPage: _currentWizardStep);
    
    // Defer loading so we have access to context for Provider
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadPrescriptions();
    });
  }

  Future<void> _loadPrescriptions() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.accessToken;
    final userId = authProvider.userId;
    
    if (token == null || userId == null) {
      setState(() => _isLoadingPrescriptions = false);
      return;
    }

    try {
      final data = await PatientService.getPrescriptions(token, userId);
      setState(() {
        _prescriptions = data;
        _isLoadingPrescriptions = false;
      });
    } catch (e) {
      setState(() => _isLoadingPrescriptions = false);
      // Optional: Handle error gracefully
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    _wizardPageController.dispose();
    super.dispose();
  }

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
          AppLocalizations.of(context)!.pharmacyPortalTitle,
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
                      _buildTopTab(AppLocalizations.of(context)!.pharmacyTabStore, isActive: _selectedIndex == 0, colorScheme: colorScheme, textTheme: textTheme, onTap: () {
                        _pageController.animateToPage(0, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                      }),
                      const SizedBox(width: 32),
                      _buildTopTab(AppLocalizations.of(context)!.pharmacyTabPharmacies, isActive: _selectedIndex == 1, colorScheme: colorScheme, textTheme: textTheme, onTap: () {
                        _pageController.animateToPage(1, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                      }),
                      const SizedBox(width: 32),
                      _buildTopTab(AppLocalizations.of(context)!.pharmacyTabRequests, isActive: _selectedIndex == 2, colorScheme: colorScheme, textTheme: textTheme, onTap: () {
                        _pageController.animateToPage(2, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                      }),
                      const SizedBox(width: 32),
                      _buildTopTab(AppLocalizations.of(context)!.pharmacyTabOrders, isActive: _selectedIndex == 3, colorScheme: colorScheme, textTheme: textTheme, onTap: () {
                        _pageController.animateToPage(3, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                      }),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),

      body: PageView(
        controller: _pageController,
        physics: const BouncingScrollPhysics(),
        onPageChanged: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        children: [
          const _KeepAlivePage(child: RetailStoreScreen()),
          _KeepAlivePage(child: _buildPharmacyWizard(context, colorScheme, textTheme)),
          const _KeepAlivePage(child: ConsultationRequestsScreen()),
          const _KeepAlivePage(child: PharmacyOrdersListScreen()),
        ],
      ),
    );
  }

  Widget _buildPharmacyWizard(BuildContext context, ColorScheme colorScheme, TextTheme textTheme) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: _buildProgressStepper(colorScheme, textTheme),
        ),
        Expanded(
          child: PageView(
            controller: _wizardPageController,
            physics: const NeverScrollableScrollPhysics(), // Vô hiệu hóa vuốt bằng tay
            onPageChanged: (index) {
              setState(() {
                _currentWizardStep = index;
              });
            },
            children: [
              _buildPrescriptionStepBody(context, colorScheme, textTheme),
              SelectPharmacyScreen(
                prescriptionHeaderId: _selectedPrescriptionId,
                onSelectRequest: (request) {
                  setState(() {
                    _currentRequest = request;
                  });
                  _wizardPageController.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                },
                onNextStep: () {
                  _wizardPageController.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                },
                onPreviousStep: () {
                  _wizardPageController.previousPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                },
              ),
              ConnectingPharmacyScreen(
                currentRequest: _currentRequest,
                onOrderCreated: (order) {
                  setState(() {
                    _currentOrder = order;
                  });
                },
                onNextStep: () {
                  _wizardPageController.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                },
                onPreviousStep: () {
                  _wizardPageController.previousPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                },
              ),
              OrderPaymentScreen(
                currentOrder: _currentOrder,
                onPreviousStep: () {
                  _wizardPageController.previousPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPrescriptionStepBody(BuildContext context, ColorScheme colorScheme, TextTheme textTheme) {
    return SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0), // py-lg md:py-xl
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 768), // max-w-3xl
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const SizedBox(height: 16),

                // --- 2. Header Section ---
                Text(
                  AppLocalizations.of(context)!.pharmacyAskPrescription,
                  textAlign: TextAlign.center,
                  style: textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: colorScheme.onBackground,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  AppLocalizations.of(context)!.pharmacyAskPrescriptionDesc,
                  textAlign: TextAlign.center,
                  style: textTheme.bodyLarge?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 48),

                // --- 3. Content ---
                if (_isLoadingPrescriptions)
                  const Padding(
                    padding: EdgeInsets.all(32.0),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (_prescriptions.isNotEmpty)
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _prescriptions.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final rx = _prescriptions[index];
                      // Sửa lại thành các trường tương ứng với API mobile. (Tạm giả định các trường là prescriptionHeaderID, doctorName, issueDate, diagnosis)
                      final rxId = rx['prescriptionHeaderID']?.toString();
                      return ListTile(
                        onTap: () {
                          setState(() => _selectedPrescriptionId = rxId);
                          _wizardPageController.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                        },
                        tileColor: colorScheme.surface,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(color: colorScheme.surfaceVariant),
                        ),
                        title: Text(rx['doctorName'] ?? AppLocalizations.of(context)!.labelDoctor, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(
                          "${rx['issueDate'] != null ? DateTime.parse(rx['issueDate']).toLocal().toString().split(' ')[0] : ''} - ${rx['diagnosis'] ?? AppLocalizations.of(context)!.labelNA}",
                          style: textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
                        ),
                        trailing: Icon(Icons.chevron_right, color: colorScheme.outline),
                      );
                    },
                  )
                else
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
                          AppLocalizations.of(context)!.pharmacyNoPrescriptions,
                          style: textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: colorScheme.onBackground,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          AppLocalizations.of(context)!.pharmacyNoPrescriptionsDesc,
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
                      setState(() => _selectedPrescriptionId = null);
                      _wizardPageController.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                    },
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          AppLocalizations.of(context)!.pharmacySkipPrescription,
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
    );
  }

  // --- Widget hỗ trợ: Top Navigation Tab ---
  Widget _buildTopTab(String title, {required bool isActive, required ColorScheme colorScheme, required TextTheme textTheme, VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
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
      ),
    );
  }

  Widget _buildProgressStepper(ColorScheme colorScheme, TextTheme textTheme) {
    return Stack(
      alignment: Alignment.center,
      children: [
        Positioned(
          left: 16,
          right: 16,
          child: Container(height: 2, color: colorScheme.surfaceVariant),
        ),
        Positioned(
          left: 16,
          right: MediaQuery.of(context).size.width - 16 - (MediaQuery.of(context).size.width - 32) * ((_currentWizardStep + 1) / 4),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            height: 2,
            color: colorScheme.primary,
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildStepperNode('1', AppLocalizations.of(context)!.pharmacyStepPrescription, isCompleted: _currentWizardStep >= 0, isActive: _currentWizardStep == 0, colorScheme: colorScheme, textTheme: textTheme),
            _buildStepperNode('2', AppLocalizations.of(context)!.pharmacyStepPharmacy, isCompleted: _currentWizardStep >= 1, isActive: _currentWizardStep == 1, colorScheme: colorScheme, textTheme: textTheme),
            _buildStepperNode('3', AppLocalizations.of(context)!.pharmacyStepConnect, isCompleted: _currentWizardStep >= 2, isActive: _currentWizardStep == 2, colorScheme: colorScheme, textTheme: textTheme),
            _buildStepperNode('4', AppLocalizations.of(context)!.pharmacyStepPayment, isCompleted: _currentWizardStep >= 3, isActive: _currentWizardStep == 3, colorScheme: colorScheme, textTheme: textTheme),
          ],
        ),
      ],
    );
  }

  Widget _buildStepperNode(String stepNum, String label, {required bool isCompleted, required bool isActive, required ColorScheme colorScheme, required TextTheme textTheme}) {
    final bgColor = isCompleted || isActive ? colorScheme.primary : colorScheme.surfaceVariant;
    final textColor = isCompleted || isActive ? colorScheme.onPrimary : colorScheme.onSurfaceVariant;
    final labelColor = isCompleted || isActive ? colorScheme.primary : colorScheme.onSurfaceVariant;

    return Container(
      color: colorScheme.background,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Column(
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: bgColor,
              shape: BoxShape.circle,
              boxShadow: isActive ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)] : [],
              border: isActive ? Border.all(color: colorScheme.primaryContainer, width: 4) : null,
            ),
            child: Center(
              child: isCompleted && !isActive
                  ? Icon(Icons.check, color: textColor, size: 20)
                  : Text(
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

// --- Widget hỗ trợ: Giữ trạng thái của các tab ---
class _KeepAlivePage extends StatefulWidget {
  final Widget child;

  const _KeepAlivePage({required this.child});

  @override
  State<_KeepAlivePage> createState() => _KeepAlivePageState();
}

class _KeepAlivePageState extends State<_KeepAlivePage> with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return widget.child;
  }
}