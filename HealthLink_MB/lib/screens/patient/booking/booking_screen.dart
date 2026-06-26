import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/booking/booking_service.dart';
import 'dart:async';
import 'package:app_links/app_links.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../l10n/app_localizations.dart';

import '../../../utils/localization_utils.dart';

class BookingScreen extends StatefulWidget {
  final String? initialDoctorId;
  const BookingScreen({super.key, this.initialDoctorId});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  List<String> _getSteps(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return [
      l10n.bookingStepSpecialty,
      l10n.bookingStepDoctor,
      l10n.bookingStepDateTime,
      l10n.bookingStepMedicalInfo,
      l10n.bookingStepConfirm,
      l10n.bookingStepPayment,
    ];
  }

  final _searchCtrl = TextEditingController();
  final _symptomsCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

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
  static const String _pendingPayPalOrderKey = 'pending_paypal_order_id';
  static const String _pendingPayPalAppointmentTimeKey = 'pending_paypal_appointment_time';

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
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated || auth.accessToken == null) {
      setState(() => _loading = false);
      return;
    }

    _service = BookingService(accessToken: auth.accessToken!);

    try {
      final specialties = await _service!.getSpecialties();
      if (!mounted) return;
      setState(() {
        _specialties = specialties;
      });

      if (widget.initialDoctorId != null) {
        // If coming from Doctor Profile, fetch that doctor specifically
        final doctor = await _service!.getDoctorById(widget.initialDoctorId!);
        final schedules = await _service!.getDoctorSchedules(widget.initialDoctorId!);

        if (!mounted) return;

        if (schedules.isNotEmpty) {
          setState(() {
            _selectedDoctor = doctor;
            _selectedSpecialty = doctor.specialtyName;
            _doctors = [doctor]; // Ensure Step 1 is not empty
            _doctorSchedules = schedules;
            _step = 2; // Jump to Date & Time
            _loading = false;
          });
        } else {
          setState(() {
            _selectedSpecialty = doctor.specialtyName;
            _selectedDoctor = doctor;
            _step = 0; // Jump back to Step 1
            _loading = false;
          });
          // Tải danh sách bác sĩ cùng chuyên khoa để người dùng có thể chọn người khác
          await _loadDoctors(reset: true);
        }
      } else {
        setState(() {
          _loading = false;
        });
        await _loadDoctors(reset: true);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = _cleanError(e);
        _loading = false;
      });
    }
  }

  Future<void> _loadDoctors({bool reset = false}) async {
    if (_service == null) return;
    if (reset) _doctorPage = 1;

    setState(() {
      _loadingDoctors = true;
      _error = null;
    });

    try {
      final page = await _service!.searchDoctors(
        specialty: _selectedSpecialty,
        name: _searchCtrl.text,
        page: _doctorPage,
        pageSize: 8,
      );
      if (!mounted) return;
      setState(() {
        _doctors = page.items;
        _doctorPage = page.page;
        _totalDoctorPages = page.totalPages == 0 ? 1 : page.totalPages;
      });
    } catch (e) {
      if (mounted) setState(() => _error = _cleanError(e));
    } finally {
      if (mounted) setState(() => _loadingDoctors = false);
    }
  }

  Future<void> _loadSlots() async {
    if (_service == null || _selectedDoctor == null) return;

    setState(() {
      _loadingSlots = true;
      _slots = [];
      _selectedSlot = null;
      _error = null;
    });

    try {
      final result = await _service!.getAvailableSlots(
        doctorId: _selectedDoctor!.doctorId,
        date: _formatDate(_selectedDate),
      );
      if (!mounted) return;
      setState(() {
        _bookingWindowDays = result.bookingWindowDays;
        _slots = result.slots;
      });
    } catch (e) {
      if (mounted) setState(() => _error = _cleanError(e));
    } finally {
      if (mounted) setState(() => _loadingSlots = false);
    }
  }

  Future<void> _selectSlot(BookingSlot slot) async {
    if (_service == null || _selectedDoctor == null) {
      return;
    }

    final isSelectedSlot = _selectedSlot?.startTime == slot.startTime;

    // Chỉ chặn slot không chọn được nếu nó KHÔNG PHẢI slot đang được chọn.
    // Nếu là slot đang chọn thì vẫn cho bấm lại để hủy chọn.
    if (!slot.selectable && !isSelectedSlot) {
      return;
    }

    final auth = context.read<AuthProvider>();
    final patientId = auth.userId;

    if (patientId == null || patientId.isEmpty) {
      _snack(
        AppLocalizations.of(context)!.bookingErrPatientNotFound,
        error: true,
      );
      return;
    }

    // Bấm lại chính slot đang chọn => release hold và trả UI về available.
    if (isSelectedSlot) {
      final oldStartTime = slot.startTime;

      await _releaseHoldSilently();

      if (!mounted) return;

      _markSlotAvailable(oldStartTime);
      return;
    }

    // Nếu đang có slot cũ, release hold cũ trước.
    final previousStartTime = _selectedSlot?.startTime;

    await _releaseHoldSilently();

    if (!mounted) return;

    // Trả slot cũ về trạng thái available trên UI.
    if (previousStartTime != null) {
      setState(() {
        _slots = _slots.map((item) {
          if (item.startTime == previousStartTime) {
            return item.copyWith(
              status: 'AVAILABLE',
              selectable: true,
              clearHold: true,
            );
          }

          return item;
        }).toList();

        _selectedSlot = null;
      });
    }

    try {
      final hold = await _service!.holdSlot(
        doctorId: _selectedDoctor!.doctorId,
        patientId: patientId,
        appointmentTime: _appointmentDateTime(_selectedDate, slot.startTime),
      );

      if (!mounted) return;

      setState(() {
        _selectedSlot = slot.copyWith(
          status: 'HELD',
          selectable: false,
          holdId: hold.holdId,
        );

        _slots = _slots.map((item) {
          if (item.startTime == slot.startTime) {
            return item.copyWith(
              status: 'HELD',
              selectable: false,
              holdId: hold.holdId,
            );
          }

          return item;
        }).toList();
      });
    } catch (e) {
      _snack(_cleanError(e), error: true);
      await _loadSlots();
    }
  }

  Future<void> _releaseHoldSilently() async {
    final holdId = _selectedSlot?.holdId;
    if (holdId == null || holdId == 0 || _service == null) return;
    try {
      await _service!.releaseHold(holdId);
    } catch (_) {
      // Khong chan UI neu hold da het han hoac backend da xoa.
    }
  }

  Future<void> _pickDocuments() async {
    final result = await FilePicker.pickFiles(
      allowMultiple: true,
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
      withData: true,
    );

    if (result == null || result.files.isEmpty) return;

    setState(() {
      _documents.addAll(
        result.files.map((file) => _BookingDocumentDraft(file: file)),
      );
    });
  }

  void _markSlotAvailable(String startTime) {
    setState(() {
      _slots = _slots
          .map(
            (item) => item.startTime == startTime
                ? item.copyWith(
                    status: 'AVAILABLE',
                    selectable: true,
                    clearHold: true,
                  )
                : item,
          )
          .toList();
      _selectedSlot = null;
    });
  }

  Future<void> _next() async {
    if (!_validateCurrentStep()) return;
    if (_step == 1) await _loadSlots();
    setState(() => _step = (_step + 1).clamp(0, _getSteps(context).length - 1).toInt());
  }

  Future<void> _back() async {
    if (_step == 0) return;

    // Neu quay lai tu buoc Medical Info, giai phong slot dang hold giong web.
    if (_step == 3 && _selectedSlot != null) {
      final start = _selectedSlot!.startTime;
      await _releaseHoldSilently();
      if (mounted) _markSlotAvailable(start);
    }

    if (mounted)
      setState(() => _step = (_step - 1).clamp(0, _getSteps(context).length - 1).toInt());
  }

  bool _validateCurrentStep() {
    if (_step == 0) {
      if (_selectedSpecialty == null) {
        return _warn(AppLocalizations.of(context)!.bookingErrSelectSpecialty);
      }
    } else if (_step == 1) {
      if (_selectedDoctor == null) {
        return _warn(AppLocalizations.of(context)!.bookingErrSelectDoctor);
      }

      if (_doctorSchedules.isEmpty) {
        return _warn(
          AppLocalizations.of(context)!.bookingNoSchedule,
        );
      }
    } else if (_step == 2) {
      if (_selectedSlot == null) {
        return _warn(AppLocalizations.of(context)!.bookingErrSelectSlot);
      }
    } else if (_step == 3) {
      if (_symptomsCtrl.text.trim().isEmpty) {
        return _warn(AppLocalizations.of(context)!.bookingErrMissingSymptoms);
      }

      if (_documents.any((item) => item.documentDate == null)) {
        return _warn(AppLocalizations.of(context)!.bookingErrMissingDocDate);
      }
    }

    return true;
  }

  bool _warn(String message) {
    _snack(message);
    return false;
  }

  Future<void> _handlePayPalDeepLink(Uri uri) async {
    if (uri.scheme != 'healthlink') return;

    if (uri.host == 'paypal-cancel') {
      _snack(AppLocalizations.of(context)!.bookingErrPaymentCancelled);
      setState(() {
        _pendingPayPalOrderId = null;
        _pendingAppointmentTime = null;
      });
      return;
    }

    if (uri.host != 'paypal-success') return;

    if (_pendingPayPalOrderId == null) {
      _snack(AppLocalizations.of(context)!.bookingErrPendingOrderNotFound, error: true);
      return;
    }

    await _capturePendingPayPalPayment();
  }

  Future<void> _capturePendingPayPalPayment() async {
    if (_service == null ||
        _selectedDoctor == null ||
        _selectedSlot == null ||
        _pendingPayPalOrderId == null) {
      return;
    }

    final patientId = context.read<AuthProvider>().userId;

    if (patientId == null || patientId.isEmpty) {
      _snack(AppLocalizations.of(context)!.bookingErrPatientNotFound, error: true);
      return;
    }

    setState(() => _submitting = true);

    try {
      final appointmentTime = _pendingAppointmentTime ??
          _appointmentDateTime(_selectedDate, _selectedSlot!.startTime);

      final invoice = await _service!.captureAppointmentPayPalPayment(
        orderId: _pendingPayPalOrderId!,
        patientId: patientId,
        doctorId: _selectedDoctor!.doctorId,
        appointmentTime: appointmentTime,
        symptoms: _symptomsCtrl.text.trim(),
        notes: _notesCtrl.text.trim(),
      );

      if (!mounted) return;

      final id = invoice['appointmentId'] ?? invoice['appointmentID'];
      final appointmentId = id is int ? id : int.tryParse(id?.toString() ?? '');

      if (appointmentId == null) {
        throw Exception(AppLocalizations.of(context)!.bookingErrNoAppointmentReturned);
      }

      final rejectedDocuments = <String>[];

      if (_documents.isNotEmpty) {
        final uploadedByRecord = <int, List<int>>{};

        for (final item in _documents) {
          try {
            final uploaded = await _service!.uploadDocumentAutoRecord(
              patientId: patientId,
              file: item.file,
              category: 'Consultation-Notes',
              description: _symptomsCtrl.text.trim(),
              documentDate: _formatDate(item.documentDate!),
            );

            if (uploaded.healthRecordId == 0 || uploaded.documentId == 0) {
              continue;
            }

            uploadedByRecord.putIfAbsent(uploaded.healthRecordId, () => []);
            uploadedByRecord[uploaded.healthRecordId]!.add(uploaded.documentId);
          } catch (e) {
            rejectedDocuments.add(
              _friendlyDocumentUploadError(item.file.name, e),
            );
          }
        }

        for (final entry in uploadedByRecord.entries) {
          await _service!.shareHealthRecordWithDoctor(
            recordId: entry.key,
            patientId: patientId,
            doctorId: _selectedDoctor!.doctorId,
            documentIds: entry.value,
            appointmentId: appointmentId,
          );
        }
      }

      if (rejectedDocuments.isNotEmpty) {
        await _showDocumentModerationWarning(rejectedDocuments);
      }

      await _showSuccess(appointmentId.toString());

      setState(() {
        _pendingPayPalOrderId = null;
        _pendingAppointmentTime = null;
      });

      _reset();
    } catch (e) {
      _snack(_cleanError(e), error: true);
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  Future<void> _submit() async {
    if (_service == null ||
        _selectedDoctor == null ||
        _selectedSlot == null) {
      return;
    }

    final patientId = context.read<AuthProvider>().userId;

    if (patientId == null || patientId.isEmpty) {
      _snack(AppLocalizations.of(context)!.bookingErrPatientNotFound, error: true);
      return;
    }

    final appointmentTime = _appointmentDateTime(
      _selectedDate,
      _selectedSlot!.startTime,
    );

    setState(() => _submitting = true);

    try {
      final order = await _service!.createAppointmentPayPalOrder(
        patientId: patientId,
        doctorId: _selectedDoctor!.doctorId,
        appointmentTime: appointmentTime,
        symptoms: _symptomsCtrl.text.trim(),
        notes: _notesCtrl.text.trim(),
      );

      final orderId = order['orderId']?.toString();
      final approvalUrl = order['approvalUrl']?.toString();

      if (order == null || order['orderId'] == null) {
        throw Exception(AppLocalizations.of(context)!.bookingErrCannotCreatePayPalOrder);
      }

      if (approvalUrl == null) {
        throw Exception(AppLocalizations.of(context)!.bookingErrCannotOpenPayPalApproval);
      }

      setState(() {
        _pendingPayPalOrderId = orderId;
        _pendingAppointmentTime = appointmentTime;
      });

      await _savePendingPayPalPayment(
        orderId: orderId!,
        appointmentTime: appointmentTime,
      );

      final launched = await launchUrl(
        Uri.parse(approvalUrl),
        mode: LaunchMode.inAppBrowserView,
      );

      if (!launched) {
        throw Exception(AppLocalizations.of(context)!.bookingErrCannotOpenPayPal);
      }
    } catch (e) {
      _snack(_cleanError(e), error: true);
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  void _reset() {
    setState(() {
      _step = 0;
      _selectedSpecialty = null;
      _selectedDoctor = null;
      _selectedDate = DateTime.now();
      _selectedSlot = null;
      _slots = [];
      _weekIndex = 0;
      _symptomsCtrl.clear();
      _notesCtrl.clear();
      _documents.clear();
    });
    _loadDoctors(reset: true);
  }

  Future<void> _savePendingPayPalPayment({
    required String orderId,
    required String appointmentTime,
  }) async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.setString(_pendingPayPalOrderKey, orderId);
    await prefs.setString(_pendingPayPalAppointmentTimeKey, appointmentTime);
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

  Widget _authWall(ColorScheme colors) => Scaffold(
    backgroundColor: colors.surface,
    body: Center(
      child: Card(
        color: colors.surfaceContainerHighest,
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.lock_outline, color: colors.primary, size: 48),
              const SizedBox(height: 12),
              Text(
                AppLocalizations.of(context)!.bookingLoginRequiredTitle,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              Text(
                AppLocalizations.of(context)!.bookingLoginRequiredDesc,
                style: TextStyle(color: colors.onSurfaceVariant),
              ),
            ],
          ),
        ),
      ),
    ),
  );

  Widget _header(ColorScheme colors) => Container(
    width: double.infinity,
    padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
    decoration: BoxDecoration(
      color: colors.surfaceContainerHighest.withValues(alpha: 0.55),
      border: Border(bottom: BorderSide(color: colors.outlineVariant)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          AppLocalizations.of(context)!.bookingTitle,
          style: Theme.of(
            context,
          ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        Text(
          AppLocalizations.of(context)!.bookingSubtitle,
          style: TextStyle(color: colors.onSurfaceVariant),
        ),
      ],
    ),
  );

  Widget _stepper(ColorScheme colors) => SizedBox(
    height: 76,
    child: ListView.separated(
      scrollDirection: Axis.horizontal,
      itemCount: _getSteps(context).length,
      separatorBuilder: (_, __) => const SizedBox(width: 8),
      itemBuilder: (_, index) {
        final active = index == _step;
        final done = index < _step;
        return Container(
          width: 110,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: active || done
                ? colors.primary
                : colors.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: active || done ? colors.primary : colors.outlineVariant,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                done ? Icons.check_circle : Icons.circle_outlined,
                color: active || done ? colors.onPrimary : colors.outline,
              ),
              const Spacer(),
              Text(
                _getSteps(context)[index],
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: active || done
                      ? colors.onPrimary
                      : colors.onSurfaceVariant,
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        );
      },
    ),
  );

  Widget _card(ColorScheme colors) => Card(
    elevation: 0,
    color: colors.surfaceContainerLowest,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(24),
      side: BorderSide(color: colors.outlineVariant),
    ),
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _stepContent(colors),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _step == 0 || _submitting ? null : _back,
                  child: Text(AppLocalizations.of(context)!.btnBack),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: _submitting
                      ? null
                      : (_step == _getSteps(context).length - 1 ? _submit : _next),
                  child: _submitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(
                          _step == _getSteps(context).length - 1 ? AppLocalizations.of(context)!.bookingBtnPayConfirm : AppLocalizations.of(context)!.btnNext,
                        ),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );

  Widget _stepContent(ColorScheme colors) {
    switch (_step) {
      case 0:
        return _specialtyStep(colors);
      case 1:
        return _doctorStep(colors);
      case 2:
        return _dateTimeStep(colors);
      case 3:
        return _medicalInfoStep(colors);
      case 4:
        return _confirmStep(colors);
      case 5:
        return _paymentStep(colors);
      default:
        return _specialtyStep(colors);
    }
  }

  Widget _title(String title, String subtitle) {
    final colors = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        Text(subtitle, style: TextStyle(color: colors.onSurfaceVariant)),
      ],
    );
  }

  Widget _specialtyStep(ColorScheme colors) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _title(
        AppLocalizations.of(context)!.bookingChooseSpecialty,
        AppLocalizations.of(context)!.bookingChooseSpecialtyDesc,
      ),
      const SizedBox(height: 16),
      Wrap(
        spacing: 10,
        runSpacing: 10,
        children: _specialties.map((name) {
          return ChoiceChip(
            label: Text(name.toLocalizedSpecialty(context)),
            selected: _selectedSpecialty == name,
            onSelected: (_) async {
              await _releaseHoldSilently();
              setState(() {
                _selectedSpecialty = name;
                _selectedDoctor = null;
                _selectedDate = DateTime.now();
                _selectedSlot = null;
                _slots = [];
                _weekIndex = 0;
              });
              await _loadDoctors(reset: true);
            },
          );
        }).toList(),
      ),
    ],
  );

  Widget _doctorStep(ColorScheme colors) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _title(
        AppLocalizations.of(context)!.bookingChooseDoctor,
        AppLocalizations.of(context)!.bookingChooseDoctorDesc,
      ),
      const SizedBox(height: 14),
      TextField(
        controller: _searchCtrl,
        decoration: InputDecoration(
          hintText: AppLocalizations.of(context)!.bookingSearchDoctor,
          prefixIcon: const Icon(Icons.search),
          suffixIcon: IconButton(
            icon: const Icon(Icons.tune),
            onPressed: () => _loadDoctors(reset: true),
          ),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(18)),
        ),
        onSubmitted: (_) => _loadDoctors(reset: true),
      ),
      const SizedBox(height: 16),
      if (_loadingDoctors)
        const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: CircularProgressIndicator(),
          ),
        )
      else if (_doctors.isEmpty)
        _empty(
          colors,
          Icons.person_search,
          AppLocalizations.of(context)!.bookingNoDoctorsFound,
        )
      else
        Column(
          children: _doctors
              .map((doctor) => _doctorCard(colors, doctor))
              .toList(),
        ),
      if (_totalDoctorPages > 1)
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconButton(
              onPressed: _doctorPage > 1
                  ? () {
                      _doctorPage--;
                      _loadDoctors();
                    }
                  : null,
              icon: const Icon(Icons.chevron_left),
            ),
            Text(AppLocalizations.of(context)!.paginationPage('$_doctorPage', '$_totalDoctorPages')),
            IconButton(
              onPressed: _doctorPage < _totalDoctorPages
                  ? () {
                      _doctorPage++;
                      _loadDoctors();
                    }
                  : null,
              icon: const Icon(Icons.chevron_right),
            ),
          ],
        ),
    ],
  );

  Widget _doctorCard(ColorScheme colors, BookingDoctor doctor) {
    final selected = _selectedDoctor?.doctorId == doctor.doctorId;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () async {
          await _releaseHoldSilently();
          setState(() {
            _selectedDoctor = doctor;
            _selectedDate = DateTime.now();
            _selectedSlot = null;
            _slots = [];
            _doctorSchedules = [];
            _weekIndex = 0;
          });

          try {
            final schedules = await _service!.getDoctorSchedules(doctor.doctorId);

            if (!mounted) return;

            setState(() {
              _doctorSchedules = schedules;
            });
          } catch (e) {
            _snack(_cleanError(e), error: true);
          }
        },
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: selected
                ? colors.primary.withValues(alpha: 0.08)
                : colors.surfaceContainerLow,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: selected ? colors.primary : colors.outlineVariant,
              width: selected ? 1.8 : 1,
            ),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: colors.primary,
                child: Text(
                  doctor.initials,
                  style: TextStyle(
                    color: colors.onPrimary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      doctor.fullName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                      ),
                    ),
                    Text(
                      doctor.specialtyName.toLocalizedSpecialty(context),
                      style: TextStyle(
                        color: colors.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        _chip(
                          colors,
                          Icons.star,
                          doctor.averageRating > 0
                              ? doctor.averageRating.toStringAsFixed(1)
                              : AppLocalizations.of(context)!.labelNew,
                        ),
                        _chip(
                          colors,
                          Icons.work_outline,
                          AppLocalizations.of(context)!.labelYearsExp(doctor.yearsOfExperience.toString()),
                        ),
                        if (doctor.location.isNotEmpty)
                          _chip(
                            colors,
                            Icons.location_on_outlined,
                            doctor.location,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              if (selected) Icon(Icons.check_circle, color: colors.primary),
            ],
          ),
        ),
      ),
    );
  }

  Widget _dateTimeStep(ColorScheme colors) {
    final today = _dayStart(DateTime.now());
    final maxDate = today.add(Duration(days: _bookingWindowDays));

    DateTime mondayOfWeek(DateTime value) {
      final start = _dayStart(value);
      return start.subtract(Duration(days: start.weekday - 1));
    }

    final weekStart = mondayOfWeek(today).add(Duration(days: _weekIndex * 7));
    final weekEnd = weekStart.add(const Duration(days: 6));

    final workingDayNumbers = _doctorSchedules
        .where((schedule) => schedule.isBookable)
        .map((schedule) => schedule.dayOfWeek)
        .toSet();

    final days = List.generate(7, (index) {
      return weekStart.add(Duration(days: index));
    }).where((day) {
      if (day.isBefore(today)) return false;
      if (day.isAfter(maxDate)) return false;

      final backendDay = day.weekday % 7; // Sunday = 0
      return workingDayNumbers.contains(backendDay);
    }).toList();

    final nextWeekStart = weekStart.add(const Duration(days: 7));
    final canGoPreviousWeek = _weekIndex > 0;
    final canGoNextWeek = !nextWeekStart.isAfter(maxDate);

    final weekLabel = AppLocalizations.of(context)!.labelWeek('${weekStart.day}/${weekStart.month} - ${weekEnd.day}/${weekEnd.month}');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _title(
          AppLocalizations.of(context)!.bookingChooseDateTime,
          AppLocalizations.of(context)!.bookingChooseDateTimeDesc,
        ),

        SizedBox(height: 16),

        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: canGoPreviousWeek
                    ? () {
                  setState(() {
                    _weekIndex--;
                    _selectedSlot = null;
                    _slots = [];
                  });
                }
                    : null,
                child: Text(AppLocalizations.of(context)!.actionPrevious),
              ),
            ),
            const SizedBox(width: 10),
            Text(
              weekLabel,
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton(
                onPressed: canGoNextWeek
                    ? () {
                  setState(() {
                    _weekIndex++;
                    _selectedSlot = null;
                    _slots = [];
                  });
                }
                    : null,
                child: Text(AppLocalizations.of(context)!.actionNext),
              ),
            ),
          ],
        ),

        const SizedBox(height: 14),

        if (days.isEmpty)
          _empty(
            colors,
            Icons.event_busy_outlined,
            AppLocalizations.of(context)!.bookingNoDoctorScheduleThisWeek,
          )
        else
          SizedBox(
            height: 86,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: days.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (_, index) {
                final day = days[index];
                final selected = _sameDay(day, _selectedDate);

                return InkWell(
                  borderRadius: BorderRadius.circular(18),
                  onTap: () async {
                    await _releaseHoldSilently();

                    setState(() {
                      _selectedDate = day;
                      _selectedSlot = null;
                      _slots = [];
                    });

                    await _loadSlots();
                  },
                  child: Container(
                    width: 96,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: selected ? colors.primary : colors.surfaceContainerHigh,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: selected ? colors.primary : colors.outlineVariant,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _dayLabel(day),
                          style: TextStyle(
                            color: selected ? colors.onPrimary : colors.onSurface,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${day.day}/${day.month}',
                          style: TextStyle(
                            color: selected
                                ? colors.onPrimary
                                : colors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

        const SizedBox(height: 22),
        Text(
          AppLocalizations.of(context)!.bookingAvailableSlots,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 12),
        if (_loadingSlots)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: CircularProgressIndicator(),
            ),
          )
        else if (_slots.isEmpty)
          _empty(
            colors,
            Icons.event_busy_outlined,
            AppLocalizations.of(context)!.bookingNoSlotsOnThisDay,
          )
        else
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: _slots.map((slot) => _slotButton(colors, slot)).toList(),
          ),
      ],
    );
  }

  Widget _slotButton(ColorScheme colors, BookingSlot slot) {
    final selected = _selectedSlot?.startTime == slot.startTime;
    final enabled = slot.selectable || selected;
    return SizedBox(
      width: 104,
      child: FilledButton.tonal(
        onPressed: enabled ? () => _selectSlot(slot) : null,
        style: FilledButton.styleFrom(
          backgroundColor: selected
              ? const Color(0xFFFFE6A3)
              : (enabled
                    ? colors.inverseSurface
                    : colors.surfaceContainerHighest),
          foregroundColor: selected
              ? const Color(0xFF003B35)
              : (enabled ? colors.onInverseSurface : colors.outline),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
        child: Text(
          _shortTime(slot.startTime),
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
      ),
    );
  }

  Widget _medicalInfoStep(ColorScheme colors) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _title(
        AppLocalizations.of(context)!.bookingSymptomsTitle,
        AppLocalizations.of(context)!.bookingSymptomsDesc,
      ),
      const SizedBox(height: 16),
      TextField(
        controller: _symptomsCtrl,
        minLines: 5,
        maxLines: 8,
        decoration: InputDecoration(
          labelText: AppLocalizations.of(context)!.bookingSymptomsInput,
          hintText: AppLocalizations.of(context)!.bookingSymptomsHint,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(18)),
          alignLabelWithHint: true,
        ),
      ),
      const SizedBox(height: 14),
      TextField(
        controller: _notesCtrl,
        minLines: 3,
        maxLines: 5,
        decoration: InputDecoration(
          labelText: AppLocalizations.of(context)!.bookingNotesInput,
          hintText: AppLocalizations.of(context)!.bookingNotesHint,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(18)),
          alignLabelWithHint: true,
        ),
      ),
      const SizedBox(height: 14),
      OutlinedButton.icon(
        onPressed: _pickDocuments,
        icon: const Icon(Icons.attach_file),
        label: Text(AppLocalizations.of(context)!.bookingUploadDocs),
      ),

      if (_documents.isNotEmpty) ...[
        const SizedBox(height: 14),
        Column(
          children: _documents.asMap().entries.map((entry) {
            final index = entry.key;
            final item = entry.value;

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: colors.surfaceContainerLow,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: colors.outlineVariant),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.description_outlined),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          item.file.name,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          setState(() {
                            _documents.removeAt(index);
                          });
                        },
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    AppLocalizations.of(context)!.bookingDatePerformed,
                    style: TextStyle(
                      color: colors.onSurface,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: item.documentDate ?? DateTime.now(),
                        firstDate: DateTime(1900),
                        lastDate: DateTime.now(),
                      );

                      if (picked != null) {
                        setState(() {
                          item.documentDate = picked;
                        });
                      }
                    },
                    icon: const Icon(Icons.calendar_today_outlined),
                    label: Text(
                      item.documentDate == null
                          ? AppLocalizations.of(context)!.bookingSelectDatePerformed
                          : _formatDate(item.documentDate!),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ],

      _note(
        colors,
        AppLocalizations.of(context)!.bookingUploadDocNote,
      ),
    ],
  );

  Widget _confirmStep(ColorScheme colors) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _title(AppLocalizations.of(context)!.bookingConfirmTitle, AppLocalizations.of(context)!.bookingConfirmDesc),
      const SizedBox(height: 16),
      _summary(colors, AppLocalizations.of(context)!.bookingLabelDoctor, _selectedDoctor?.fullName ?? '-'),
      _summary(
        colors,
        AppLocalizations.of(context)!.bookingLabelSpecialty,
        _selectedDoctor != null ? _selectedDoctor!.specialtyName.toLocalizedSpecialty(context) : (_selectedSpecialty?.toLocalizedSpecialty(context) ?? '-'),
      ),
      _summary(colors, AppLocalizations.of(context)!.bookingLabelDate, _friendlyDate(_selectedDate)),
      _summary(
        colors,
        AppLocalizations.of(context)!.bookingLabelTime,
        _selectedSlot == null ? '-' : _shortTime(_selectedSlot!.startTime),
      ),
      _summary(
        colors,
        AppLocalizations.of(context)!.bookingLabelFee,
        _selectedDoctor == null
            ? '-'
            : '\$${_selectedDoctor!.consultationFee.toStringAsFixed(2)}',
      ),
      const SizedBox(height: 12),
      _note(
        colors,
        AppLocalizations.of(context)!.bookingPaymentNote,
      ),
    ],
  );

  Widget _paymentStep(ColorScheme colors) {
    final fee = _selectedDoctor?.consultationFee ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _title(AppLocalizations.of(context)!.bookingPaymentTitle, AppLocalizations.of(context)!.bookingPaymentDesc),
        const SizedBox(height: 16),

        _summary(colors, AppLocalizations.of(context)!.bookingLabelDoctor, _selectedDoctor?.fullName ?? '-'),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingLabelSpecialty,
          _selectedDoctor != null ? _selectedDoctor!.specialtyName.toLocalizedSpecialty(context) : (_selectedSpecialty?.toLocalizedSpecialty(context) ?? '-'),
        ),
        _summary(colors, AppLocalizations.of(context)!.bookingLabelDate, _friendlyDate(_selectedDate)),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingLabelTime,
          _selectedSlot == null ? '-' : _shortTime(_selectedSlot!.startTime),
        ),
        _summary(colors, AppLocalizations.of(context)!.bookingLabelTotalAmount, '\$${fee.toStringAsFixed(2)}'),

        const SizedBox(height: 12),
        _note(
          colors,
          AppLocalizations.of(context)!.bookingPaymentNote2,
        ),
      ],
    );
  }

  Widget _chip(ColorScheme colors, IconData icon, String text) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
    decoration: BoxDecoration(
      color: colors.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(100),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: colors.primary),
        const SizedBox(width: 4),
        Text(
          text,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
        ),
      ],
    ),
  );

  Widget _summary(ColorScheme colors, String label, String value) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: colors.surfaceContainerLow,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: colors.outlineVariant),
    ),
    child: Row(
      children: [
        Expanded(
          child: Text(label, style: TextStyle(color: colors.onSurfaceVariant)),
        ),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
        ),
      ],
    ),
  );

  Widget _note(ColorScheme colors, String text) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: colors.secondaryContainer.withValues(alpha: 0.45),
      borderRadius: BorderRadius.circular(16),
    ),
    child: Text(text, style: TextStyle(color: colors.onSurfaceVariant)),
  );

  Widget _empty(ColorScheme colors, IconData icon, String text) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: colors.surfaceContainerLow,
      borderRadius: BorderRadius.circular(18),
    ),
    child: Column(
      children: [
        Icon(icon, color: colors.outline, size: 38),
        const SizedBox(height: 8),
        Text(
          text,
          textAlign: TextAlign.center,
          style: TextStyle(color: colors.onSurfaceVariant),
        ),
      ],
    ),
  );

  Widget _errorBanner(ColorScheme colors) => Container(
    width: double.infinity,
    margin: const EdgeInsets.only(bottom: 12),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: colors.errorContainer,
      borderRadius: BorderRadius.circular(14),
    ),
    child: Text(
      _error!,
      style: TextStyle(
        color: colors.onErrorContainer,
        fontWeight: FontWeight.w700,
      ),
    ),
  );

  Future<void> _showSuccess(String id) => showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (context) => AlertDialog(
      icon: Icon(
        Icons.check_circle,
        color: Theme.of(context).colorScheme.primary,
        size: 48,
      ),
      title: Text(AppLocalizations.of(context)!.bookingSuccessTitle),
      content: Text(AppLocalizations.of(context)!.bookingSuccessMsg),
      actions: [
        FilledButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(AppLocalizations.of(context)!.actionDone),
        ),
      ],
    ),
  );

  Future<void> _showDocumentModerationWarning(List<String> messages) async {
    if (!mounted) return;

    await showDialog<void>(
      context: context,
      builder: (context) {
        final colors = Theme.of(context).colorScheme;

        return AlertDialog(
          icon: Icon(
            Icons.shield_outlined,
            color: colors.error,
            size: 34,
          ),
          title: Text(AppLocalizations.of(context)!.bookingUploadWarnTitle),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                AppLocalizations.of(context)!.bookingUploadWarnDesc,
              ),
              const SizedBox(height: 12),
              ...messages.map(
                    (message) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text('• $message'),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(AppLocalizations.of(context)!.actionGotIt),
            ),
          ],
        );
      },
    );
  }

  void _snack(String message, {bool error = false}) {
    if (!mounted) return;

    final colors = Theme.of(context).colorScheme;

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          margin: const EdgeInsets.all(16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          backgroundColor: error ? colors.error : colors.primary,
          content: Row(
            children: [
              Icon(
                error ? Icons.error_outline : Icons.check_circle_outline,
                color: error ? colors.onError : colors.onPrimary,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  message,
                  style: TextStyle(
                    color: error ? colors.onError : colors.onPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
  }

  String _cleanError(Object error) {
    final raw = error.toString();
    var cleaned = raw.startsWith('Exception: ') ? raw.substring(11) : raw;
    
    if (cleaned.startsWith('Doctor does not support consultation type: ')) {
      final type = cleaned.substring('Doctor does not support consultation type: '.length).trim();
      return AppLocalizations.of(context)!.bookingErrUnsupportedConsultationType(type.toLocalizedConsultationType(context));
    }
    
    return cleaned;
  }

  bool _isImageModerationError(String message) {
    final lower = message.toLowerCase();

    return lower.contains('sensitive content') ||
        lower.contains('explicit') ||
        lower.contains('moderation') ||
        lower.contains('scan image') ||
        lower.contains('unable to scan image');
  }

  String _friendlyDocumentUploadError(String fileName, Object error) {
    final message = _cleanError(error);

    if (_isImageModerationError(message)) {
      return AppLocalizations.of(context)!.bookingErrSensitiveContent(fileName);
    }

    return AppLocalizations.of(context)!.bookingErrUploadFailed(fileName, message);
  }

  DateTime _dayStart(DateTime value) =>
      DateTime(value.year, value.month, value.day);
  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  String _formatDate(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  String _appointmentDateTime(DateTime date, String time) {
    final clean = time.length >= 5 ? time : '00:00';
    final withSeconds = clean.length == 5
        ? '$clean:00'
        : clean.split('.').first;
    return '${_formatDate(date)}T$withSeconds';
  }

  String _shortTime(String time) =>
      time.length >= 5 ? time.substring(0, 5) : time;

  String _dayLabel(DateTime date) {
    if (_sameDay(date, DateTime.now())) return AppLocalizations.of(context)!.labelToday;
    final tomorrow = _dayStart(DateTime.now()).add(const Duration(days: 1));
    if (_sameDay(date, tomorrow)) return AppLocalizations.of(context)!.labelTomorrow;
    return [
      AppLocalizations.of(context)!.labelMon,
      AppLocalizations.of(context)!.labelTue,
      AppLocalizations.of(context)!.labelWed,
      AppLocalizations.of(context)!.labelThu,
      AppLocalizations.of(context)!.labelFri,
      AppLocalizations.of(context)!.labelSat,
      AppLocalizations.of(context)!.labelSun,
    ][date.weekday - 1];
  }

  String _friendlyDate(DateTime date) =>
      '${_dayLabel(date)}, ${date.day}/${date.month}/${date.year}';
}

class _BookingDocumentDraft {
  _BookingDocumentDraft({required this.file, this.documentDate});

  final PlatformFile file;
  DateTime? documentDate;
}
