import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/booking/booking_service.dart';
import 'dart:async';
import 'package:app_links/app_links.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../l10n/app_localizations.dart';
import 'package:geolocator/geolocator.dart';
import '../../../models/booking/home_visit_booking_draft.dart';
import '../../../models/booking/home_visit_doctor_option.dart';
import '../../../models/booking/home_visit_extra_service.dart';
import '../../../models/booking/home_visit_session_slot.dart';
import '../../../services/booking/home_visit_service.dart';
import '../../../utils/localization_utils.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../models/booking/recommended_doctor.dart';
part 'parts/booking_actions.dart';
part 'parts/booking_home_visit_actions.dart';
part 'parts/booking_home_visit_steps.dart';
part 'parts/booking_normal_steps.dart';
part 'parts/booking_payment_actions.dart';
part 'parts/booking_shared_widgets.dart';
part 'parts/booking_utils.dart';

const String _pendingPayPalOrderKey = 'pending_paypal_order_id';
const String _pendingPayPalAppointmentTimeKey = 'pending_paypal_appointment_time';

enum BookingStepKey {
  specialty,
  visitType,
  doctorOption,
  doctor,
  dateTime,
  medicalInfo,
  homeVisitLocation,
  homeVisitDoctor,
  homeVisitServices,
  homeVisitSession,
  confirm,
  payment,
}

class BookingScreen extends StatefulWidget {
  final String? initialDoctorId;
  const BookingScreen({super.key, this.initialDoctorId});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  List<BookingStepKey> get _stepKeys {
    if (_consultationType == 'HomeVisit') {
      return const [
        BookingStepKey.specialty,
        BookingStepKey.visitType,
        BookingStepKey.homeVisitLocation,
        BookingStepKey.homeVisitDoctor,
        BookingStepKey.homeVisitServices,
        BookingStepKey.homeVisitSession,
        BookingStepKey.confirm,
        BookingStepKey.payment,
      ];
    }

    final normalSteps = <BookingStepKey>[
      BookingStepKey.specialty,
      BookingStepKey.visitType,
      BookingStepKey.doctorOption,
    ];

    if (_doctorSelectionMode == 'MANUAL_SELECTED') {
      normalSteps.add(BookingStepKey.doctor);
    }

    normalSteps.addAll([
      BookingStepKey.dateTime,
      BookingStepKey.medicalInfo,
      BookingStepKey.confirm,
      BookingStepKey.payment,
    ]);

    return normalSteps;
  }

  BookingStepKey get _currentStepKey => _stepKeys[_step];

  List<String> _getSteps(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return _stepKeys.map((key) {
      switch (key) {
        case BookingStepKey.specialty:
          return l10n.bookingStepSpecialty;
        case BookingStepKey.visitType:
          return 'Visit Type';
        case BookingStepKey.doctorOption:
          return 'Doctor Option';
        case BookingStepKey.doctor:
          return l10n.bookingStepDoctor;
        case BookingStepKey.dateTime:
          return l10n.bookingStepDateTime;
        case BookingStepKey.medicalInfo:
          return l10n.bookingStepMedicalInfo;
        case BookingStepKey.homeVisitLocation:
          return l10n.bookingHomeVisitInfo;
        case BookingStepKey.homeVisitDoctor:
          return l10n.bookingHomeVisitDoctor;
        case BookingStepKey.homeVisitServices:
          return l10n.bookingAdditionalServices;
        case BookingStepKey.homeVisitSession:
          return l10n.bookingSelectSession;
        case BookingStepKey.confirm:
          return l10n.bookingStepConfirm;
        case BookingStepKey.payment:
          return l10n.bookingStepPayment;
      }
    }).toList();
  }

  final _searchCtrl = TextEditingController();
  final _symptomsCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  final _visitAddressCtrl = TextEditingController();
  final _contactPhoneCtrl = TextEditingController();
  final _reasonCtrl = TextEditingController();
  final _specialNotesCtrl = TextEditingController();

  BookingService? _service;
  int _step = 0;
  int _doctorPage = 1;
  int _totalDoctorPages = 1;
  int _bookingWindowDays = 30;
  int _weekIndex = 0;

  bool _loading = true;
  bool _loadingDoctors = false;
  bool _loadingSlots = false;
  bool _submitting = false;

  String? _error;
  String? _selectedSpecialty;
  BookingDoctor? _selectedDoctor;
  DateTime _selectedDate = DateTime.now();
  BookingSlot? _selectedSlot;

  List<String> _specialties = [];
  List<BookingDoctor> _doctors = [];
  List<BookingSlot> _slots = [];
  List<DoctorWorkingSchedule> _doctorSchedules = [];
  List<_BookingDocumentDraft> _documents = [];

  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _paypalLinkSub;

  String? _pendingPayPalOrderId;
  String? _pendingAppointmentTime;

  //Home Visit
  String? _consultationType; // Online, HomeVisit
  String _doctorSelectionMode = ''; // AUTO_ASSIGNED, MANUAL_SELECTED
  RecommendedDoctor? _recommendedDoctor;
  double _manualSelectionFee = 0;
  bool _loadingRecommendedDoctor = false;
  HomeVisitBookingDraft _homeVisitDraft = const HomeVisitBookingDraft();
  HomeVisitService? _homeVisitService;

  bool _loadingHomeVisitDoctors = false;
  bool _loadingHomeVisitServices = false;
  bool _loadingHomeVisitSlots = false;
  bool _selectingHomeVisitSession = false;

  bool get _isHomeVisit => _consultationType == 'HomeVisit';
  final MapController _homeVisitMapController = MapController();

  LatLng get _homeVisitSelectedPoint {
    return LatLng(
      _homeVisitDraft.visitLatitude ?? 10.7769,
      _homeVisitDraft.visitLongitude ?? 106.7009,
    );
  }

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) => _loadInitialData());

    _paypalLinkSub = _appLinks.uriLinkStream.listen((uri) {
      _handlePayPalDeepLink(uri);
    });
  }

  @override
  void dispose() {
    _paypalLinkSub?.cancel();
    _releaseHoldSilently();
    _searchCtrl.dispose();
    _symptomsCtrl.dispose();
    _notesCtrl.dispose();
    _visitAddressCtrl.dispose();
    _contactPhoneCtrl.dispose();
    _reasonCtrl.dispose();
    _specialNotesCtrl.dispose();

    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final colors = Theme.of(context).colorScheme;

    if (!auth.isAuthenticated) return _authWall(colors);

    return Scaffold(
      backgroundColor: colors.surface,
      body: SafeArea(
        bottom: false,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _header(colors),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 104),
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 920),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (_error != null) _errorBanner(colors),
                              _stepper(colors),
                              const SizedBox(height: 16),
                              _card(colors),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _BookingDocumentDraft {
  _BookingDocumentDraft({required this.file, this.documentDate});

  final PlatformFile file;
  DateTime? documentDate;
}
