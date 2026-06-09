import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../../providers/auth_provider.dart';
import '../../services/booking/booking_service.dart';

class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  static const _steps = [
    'Specialty',
    'Doctor',
    'Type',
    'Date & Time',
    'Medical Info',
    'Confirm',
  ];
  static const _fallbackTypes = ['Video', 'Chat', 'Audio', 'Offline'];

  final _searchCtrl = TextEditingController();
  final _symptomsCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  BookingService? _service;
  int _step = 0;
  int _doctorPage = 1;
  int _totalDoctorPages = 1;
  int _bookingWindowDays = 30;

  bool _loading = true;
  bool _loadingDoctors = false;
  bool _loadingSlots = false;
  bool _submitting = false;

  String? _error;
  String? _selectedSpecialty;
  BookingDoctor? _selectedDoctor;
  String? _selectedType;
  DateTime _selectedDate = DateTime.now();
  BookingSlot? _selectedSlot;

  List<String> _specialties = [];
  List<BookingDoctor> _doctors = [];
  List<BookingSlot> _slots = [];
  List<_BookingDocumentDraft> _documents = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadInitialData());
  }

  @override
  void dispose() {
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
        _loading = false;
      });
      await _loadDoctors(reset: true);
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
    if (_service == null || _selectedDoctor == null || _selectedType == null) return;

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
        consultationType: _selectedType!,
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
    if (!slot.selectable || _service == null || _selectedDoctor == null || _selectedType == null) return;

    final auth = context.read<AuthProvider>();
    final patientId = auth.userId;
    if (patientId == null || patientId.isEmpty) {
      _snack('Can not find patient information. Please login again.', error: true);
      return;
    }

    if (_selectedSlot?.startTime == slot.startTime) {
      await _releaseHoldSilently();
      _markSlotAvailable(slot.startTime);
      return;
    }

    await _releaseHoldSilently();

    try {
      final hold = await _service!.holdSlot(
        doctorId: _selectedDoctor!.doctorId,
        patientId: patientId,
        appointmentTime: _appointmentDateTime(_selectedDate, slot.startTime),
        consultationType: _selectedType!,
      );
      if (!mounted) return;
      setState(() {
        _selectedSlot = slot.copyWith(status: 'HELD', selectable: false, holdId: hold.holdId);
        _slots = _slots
            .map((item) => item.startTime == slot.startTime
                ? item.copyWith(status: 'HELD', selectable: false, holdId: hold.holdId)
                : item)
            .toList();
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
          .map((item) => item.startTime == startTime
              ? item.copyWith(status: 'AVAILABLE', selectable: true, clearHold: true)
              : item)
          .toList();
      _selectedSlot = null;
    });
  }

  Future<void> _next() async {
    if (!_validateCurrentStep()) return;
    if (_step == 2) await _loadSlots();
    setState(() => _step = (_step + 1).clamp(0, _steps.length - 1).toInt());
  }

  Future<void> _back() async {
    if (_step == 0) return;

    // Neu quay lai tu buoc Medical Info, giai phong slot dang hold giong web.
    if (_step == 4 && _selectedSlot != null) {
      final start = _selectedSlot!.startTime;
      await _releaseHoldSilently();
      if (mounted) _markSlotAvailable(start);
    }

    if (mounted) setState(() => _step = (_step - 1).clamp(0, _steps.length - 1).toInt());
  }

  bool _validateCurrentStep() {
    if (_step == 0 && _selectedSpecialty == null) return _warn('Please select a specialty.');
    if (_step == 1 && _selectedDoctor == null) return _warn('Please select a doctor.');
    if (_step == 2 && _selectedType == null) return _warn('Please select a consultation type.');
    if (_step == 3 && _selectedSlot == null) return _warn('Please select an available time slot.');
    if (_step == 4 && _documents.any((item) => item.documentDate == null)) {
      return _warn('Please select Date Performed for all uploaded documents.');
    }
    return true;
  }

  bool _warn(String message) {
    _snack(message);
    return false;
  }

  Future<void> _submit() async {
    if (_service == null || _selectedDoctor == null || _selectedType == null || _selectedSlot == null) return;

    final patientId = context.read<AuthProvider>().userId;
    if (patientId == null || patientId.isEmpty) {
      _snack('Can not find patient information. Please login again.', error: true);
      return;
    }

    setState(() => _submitting = true);
    try {
      final appointment = await _service!.createAppointment(
        patientId: patientId,
        doctorId: _selectedDoctor!.doctorId,
        appointmentTime: _appointmentDateTime(_selectedDate, _selectedSlot!.startTime),
        consultationType: _selectedType!,
        symptoms: _symptomsCtrl.text.trim(),
        notes: _notesCtrl.text.trim(),
      );
      if (!mounted) return;
      final id = appointment['appointmentId'] ?? appointment['appointmentID'];
      final appointmentId = id is int ? id : int.tryParse(id?.toString() ?? '');

      if (_documents.isNotEmpty) {
        final uploadedByRecord = <int, List<int>>{};

        for (final item in _documents) {
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

      await _showSuccess(id?.toString() ?? '');
      _reset();
    } catch (e) {
      _snack(_cleanError(e), error: true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _reset() {
    setState(() {
      _step = 0;
      _selectedSpecialty = null;
      _selectedDoctor = null;
      _selectedType = null;
      _selectedDate = DateTime.now();
      _selectedSlot = null;
      _slots = [];
      _symptomsCtrl.clear();
      _notesCtrl.clear();
      _documents.clear();
    });
    _loadDoctors(reset: true);
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
                  const Text('Login required', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 8),
                  Text('Please login before booking an appointment.', style: TextStyle(color: colors.onSurfaceVariant)),
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
          color: colors.surfaceVariant.withValues(alpha: 0.55),
          border: Border(bottom: BorderSide(color: colors.outlineVariant)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Book an appointment',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 6),
            Text('Select a specialty, doctor and time that suits you.', style: TextStyle(color: colors.onSurfaceVariant)),
          ],
        ),
      );

  Widget _stepper(ColorScheme colors) => SizedBox(
        height: 76,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: _steps.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (_, index) {
            final active = index == _step;
            final done = index < _step;
            return Container(
              width: 110,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: active || done ? colors.primary : colors.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: active || done ? colors.primary : colors.outlineVariant),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(done ? Icons.check_circle : Icons.circle_outlined,
                      color: active || done ? colors.onPrimary : colors.outline),
                  const Spacer(),
                  Text(
                    _steps[index],
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: active || done ? colors.onPrimary : colors.onSurfaceVariant,
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
                      child: const Text('Back'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: _submitting ? null : (_step == _steps.length - 1 ? _submit : _next),
                      child: _submitting
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : Text(_step == _steps.length - 1 ? 'Confirm booking' : 'Next'),
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
        return _typeStep(colors);
      case 3:
        return _dateTimeStep(colors);
      case 4:
        return _medicalInfoStep(colors);
      default:
        return _confirmStep(colors);
    }
  }

  Widget _title(String title, String subtitle) {
    final colors = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
        const SizedBox(height: 6),
        Text(subtitle, style: TextStyle(color: colors.onSurfaceVariant)),
      ],
    );
  }

  Widget _specialtyStep(ColorScheme colors) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _title('Choose a specialty', 'Start by selecting the care area you need.'),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: _specialties.map((name) {
              return ChoiceChip(
                label: Text(name),
                selected: _selectedSpecialty == name,
                onSelected: (_) async {
                  await _releaseHoldSilently();
                  setState(() {
                    _selectedSpecialty = name;
                    _selectedDoctor = null;
                    _selectedType = null;
                    _selectedSlot = null;
                    _slots = [];
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
          _title('Choose a doctor', 'Only doctors matching your selected specialty are shown.'),
          const SizedBox(height: 14),
          TextField(
            controller: _searchCtrl,
            decoration: InputDecoration(
              hintText: 'Search doctor by name',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: IconButton(icon: const Icon(Icons.tune), onPressed: () => _loadDoctors(reset: true)),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(18)),
            ),
            onSubmitted: (_) => _loadDoctors(reset: true),
          ),
          const SizedBox(height: 16),
          if (_loadingDoctors)
            const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
          else if (_doctors.isEmpty)
            _empty(colors, Icons.person_search, 'No doctors found for this specialty.')
          else
            Column(children: _doctors.map((doctor) => _doctorCard(colors, doctor)).toList()),
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
                Text('Page $_doctorPage of $_totalDoctorPages'),
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
            _selectedType = null;
            _selectedSlot = null;
            _slots = [];
          });
        },
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: selected ? colors.primary.withValues(alpha: 0.08) : colors.surfaceContainerLow,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: selected ? colors.primary : colors.outlineVariant, width: selected ? 1.8 : 1),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: colors.primary,
                child: Text(doctor.initials, style: TextStyle(color: colors.onPrimary, fontWeight: FontWeight.w900)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(doctor.fullName, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                    Text(doctor.specialtyName, style: TextStyle(color: colors.primary, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        _chip(colors, Icons.star, doctor.averageRating > 0 ? doctor.averageRating.toStringAsFixed(1) : 'New'),
                        _chip(colors, Icons.work_outline, '${doctor.yearsOfExperience} yrs'),
                        if (doctor.location.isNotEmpty) _chip(colors, Icons.location_on_outlined, doctor.location),
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

  Widget _typeStep(ColorScheme colors) {
    final types = _selectedDoctor?.availableTypes.isNotEmpty == true ? _selectedDoctor!.availableTypes : _fallbackTypes;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _title('Choose consultation type', 'Pick how you want to meet your doctor.'),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: types.map((type) => _typeCard(colors, type)).toList(),
        ),
      ],
    );
  }

  Widget _typeCard(ColorScheme colors, String type) {
    final selected = _selectedType == type;
    return SizedBox(
      width: 170,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () async {
          await _releaseHoldSilently();
          setState(() {
            _selectedType = type;
            _selectedSlot = null;
            _slots = [];
          });
        },
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: selected ? colors.primary.withValues(alpha: 0.08) : colors.surfaceContainerLow,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: selected ? colors.primary : colors.outlineVariant),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(_typeIcon(type), color: selected ? colors.primary : colors.outline),
              const SizedBox(height: 12),
              Text(type, style: const TextStyle(fontWeight: FontWeight.w900)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _dateTimeStep(ColorScheme colors) {
    final days = List.generate(
      _bookingWindowDays.clamp(7, 30).toInt(),
      (i) => _dayStart(DateTime.now()).add(Duration(days: i)),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _title('Choose date & time', 'Select one available slot. Tap again to cancel your selection.'),
        const SizedBox(height: 16),
        SizedBox(
          height: 82,
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
                    border: Border.all(color: selected ? colors.primary : colors.outlineVariant),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_dayLabel(day), style: TextStyle(color: selected ? colors.onPrimary : colors.onSurface, fontWeight: FontWeight.w900)),
                      Text('${day.day}/${day.month}', style: TextStyle(color: selected ? colors.onPrimary : colors.onSurfaceVariant)),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 22),
        Text('Available slots', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900)),
        const SizedBox(height: 12),
        if (_loadingSlots)
          const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
        else if (_slots.isEmpty)
          _empty(colors, Icons.event_busy_outlined, 'No available slots on this day.')
        else
          Wrap(spacing: 10, runSpacing: 10, children: _slots.map((slot) => _slotButton(colors, slot)).toList()),
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
          backgroundColor: selected ? colors.primary : (enabled ? colors.inverseSurface : colors.surfaceContainerHighest),
          foregroundColor: selected ? colors.onPrimary : (enabled ? colors.onInverseSurface : colors.outline),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        child: Text(_shortTime(slot.startTime), style: const TextStyle(fontWeight: FontWeight.w900)),
      ),
    );
  }

  Widget _medicalInfoStep(ColorScheme colors) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _title('Symptoms & medical information', 'Describe your condition so the doctor can prepare better.'),
          const SizedBox(height: 16),
          TextField(
            controller: _symptomsCtrl,
            minLines: 5,
            maxLines: 8,
            decoration: InputDecoration(
              labelText: 'Symptoms / reason for examination *',
              hintText: 'Example: mild chest pain for the past 2 days...',
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
              labelText: 'Additional notes',
              hintText: 'Anything else you want the doctor to know.',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(18)),
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 14),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: _pickDocuments,
            icon: const Icon(Icons.attach_file),
            label: const Text('Upload medical documents'),
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
                        'Date Performed *',
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
                              ? 'Select date performed'
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
            'Documents will be uploaded and shared with the doctor after the appointment is confirmed.',
          ),        ],
      );

  Widget _confirmStep(ColorScheme colors) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _title('Confirm appointment', 'Review your booking before submitting.'),
          const SizedBox(height: 16),
          _summary(colors, 'Doctor', _selectedDoctor?.fullName ?? '-'),
          _summary(colors, 'Specialty', _selectedDoctor?.specialtyName ?? _selectedSpecialty ?? '-'),
          _summary(colors, 'Consultation type', _selectedType ?? '-'),
          _summary(colors, 'Date', _friendlyDate(_selectedDate)),
          _summary(colors, 'Time', _selectedSlot == null ? '-' : _shortTime(_selectedSlot!.startTime)),
          _summary(colors, 'Fee', _selectedDoctor == null ? '-' : '\$${_selectedDoctor!.consultationFee.toStringAsFixed(2)}'),
          const SizedBox(height: 12),
          _note(colors, 'Payment note: mobile PayPal checkout still needs an approval URL/native SDK. This version confirms booking through the current appointment endpoint.'),
        ],
      );

  Widget _chip(ColorScheme colors, IconData icon, String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(color: colors.surfaceContainerHighest, borderRadius: BorderRadius.circular(100)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 14, color: colors.primary),
          const SizedBox(width: 4),
          Text(text, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
        ]),
      );

  Widget _summary(ColorScheme colors, String label, String value) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: colors.surfaceContainerLow,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: colors.outlineVariant),
        ),
        child: Row(children: [
          Expanded(child: Text(label, style: TextStyle(color: colors.onSurfaceVariant))),
          Flexible(child: Text(value, textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w900))),
        ]),
      );

  Widget _note(ColorScheme colors, String text) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: colors.secondaryContainer.withValues(alpha: 0.45), borderRadius: BorderRadius.circular(16)),
        child: Text(text, style: TextStyle(color: colors.onSurfaceVariant)),
      );

  Widget _empty(ColorScheme colors, IconData icon, String text) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: colors.surfaceContainerLow, borderRadius: BorderRadius.circular(18)),
        child: Column(children: [
          Icon(icon, color: colors.outline, size: 38),
          const SizedBox(height: 8),
          Text(text, textAlign: TextAlign.center, style: TextStyle(color: colors.onSurfaceVariant)),
        ]),
      );

  Widget _errorBanner(ColorScheme colors) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: colors.errorContainer, borderRadius: BorderRadius.circular(14)),
        child: Text(_error!, style: TextStyle(color: colors.onErrorContainer, fontWeight: FontWeight.w700)),
      );

  Future<void> _showSuccess(String id) => showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          icon: Icon(Icons.check_circle, color: Theme.of(context).colorScheme.primary, size: 48),
          title: const Text('Booking successful'),
          content: Text(id.isEmpty ? 'Your appointment has been created.' : 'Appointment #$id has been created.'),
          actions: [
            FilledButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Done')),
          ],
        ),
      );

  void _snack(String message, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: error ? Theme.of(context).colorScheme.error : null),
    );
  }

  IconData _typeIcon(String type) {
    switch (type.toLowerCase()) {
      case 'video':
        return Icons.videocam_outlined;
      case 'audio':
        return Icons.call_outlined;
      case 'chat':
        return Icons.chat_bubble_outline;
      case 'offline':
        return Icons.local_hospital_outlined;
      default:
        return Icons.medical_services_outlined;
    }
  }

  String _cleanError(Object error) {
    final raw = error.toString();
    return raw.startsWith('Exception: ') ? raw.substring(11) : raw;
  }

  DateTime _dayStart(DateTime value) => DateTime(value.year, value.month, value.day);
  bool _sameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

  String _formatDate(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  String _appointmentDateTime(DateTime date, String time) {
    final clean = time.length >= 5 ? time : '00:00';
    final withSeconds = clean.length == 5 ? '$clean:00' : clean.split('.').first;
    return '${_formatDate(date)}T$withSeconds';
  }

  String _shortTime(String time) => time.length >= 5 ? time.substring(0, 5) : time;

  String _dayLabel(DateTime date) {
    if (_sameDay(date, DateTime.now())) return 'Today';
    final tomorrow = _dayStart(DateTime.now()).add(const Duration(days: 1));
    if (_sameDay(date, tomorrow)) return 'Tomorrow';
    return const ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][date.weekday - 1];
  }

  String _friendlyDate(DateTime date) => '${_dayLabel(date)}, ${date.day}/${date.month}/${date.year}';
}

class _BookingDocumentDraft {
  _BookingDocumentDraft({
    required this.file,
    this.documentDate,
  });

  final PlatformFile file;
  DateTime? documentDate;
}
