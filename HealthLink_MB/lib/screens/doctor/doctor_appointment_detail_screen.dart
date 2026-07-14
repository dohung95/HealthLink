import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';
import '../../services/doctor/doctor_clinical_result_service.dart';
import '../../services/doctor/doctor_follow_up_service.dart';
import '../../services/patient/patient_service.dart';
import '../../services/patient/vitals/vital_sign_service.dart';
import '../../models/doctor/doctor_appointment.dart';
import '../../models/doctor/doctor_clinical_result.dart';
import '../../models/doctor/doctor_follow_up.dart';
import '../../models/patient/patient_profile.dart';
import '../../config/api_config.dart';
import '../../config/doctor_theme.dart';
import '../../utils/doctor/doctor_call_launcher.dart';
import '../../widgets/doctor/doctor_widgets.dart';
import '../../widgets/doctor/complete_appointment_sheet.dart';
import '../../widgets/doctor/clinical_results_section.dart';
import '../../widgets/doctor/clinical_result_detail_sheet.dart';
import '../../widgets/doctor/clinical_result_editor_sheet.dart';
import '../../widgets/doctor/follow_up_section.dart';
import '../../widgets/doctor/follow_up_editor_sheet.dart';
import '../../widgets/doctor/document_viewer_screen.dart';

List<String> _splitList(String? raw) {
  if (raw == null || raw.trim().isEmpty) return [];
  return raw.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
}

String _ageFromDob(DateTime? dob) {
  if (dob == null) return '';
  final now = DateTime.now();
  int age = now.year - dob.year;
  if (now.month < dob.month || (now.month == dob.month && now.day < dob.day)) age--;
  return '$age';
}

class DoctorAppointmentDetailScreen extends StatefulWidget {
  final DoctorAppointment appointment;

  const DoctorAppointmentDetailScreen({super.key, required this.appointment});

  @override
  State<DoctorAppointmentDetailScreen> createState() => _DoctorAppointmentDetailScreenState();
}

class _DoctorAppointmentDetailScreenState extends State<DoctorAppointmentDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _historyMode = false;
  late DoctorAppointment _appointment;
  PatientProfile? _profile;
  Map<String, dynamic>? _vitals;

  bool _isLoading = true;
  String? _error;

  List<DoctorClinicalResult> _clinicalResults = const [];
  bool _isLoadingClinicalResults = false;
  String? _clinicalResultsError;

  FollowUpStatus? _followUpStatus;
  bool _isLoadingFollowUp = false;
  String? _followUpError;

  // ── Medical History / Notes (dùng chung dữ liệu patient history) ─────────
  Map<String, dynamic>? _patientHistory;
  bool _isLoadingPatientHistory = false;
  String? _patientHistoryError;
  bool _notesInitialized = false;

  final _diagnosisCtrl = TextEditingController();
  final _doctorNotesCtrl = TextEditingController();
  final _treatmentPlanCtrl = TextEditingController();
  bool _isSavingNotes = false;

  // ── Vitals Gate (khớp `DoctorVitalsGate.jsx` bên web) — bắt buộc bác sĩ
  // nhập sinh hiệu trước khi được vào workspace / start consultation.
  final _heartRateCtrl = TextEditingController();
  final _bpSystolicCtrl = TextEditingController();
  final _bpDiastolicCtrl = TextEditingController();
  final _temperatureCtrl = TextEditingController();
  final _oxygenSaturationCtrl = TextEditingController();
  final _respiratoryRateCtrl = TextEditingController();
  final _vitalsNotesCtrl = TextEditingController();
  Map<String, String> _vitalsErrors = {};
  bool _savingVitals = false;
  bool _vitalsFormInitialized = false;

  // ── Shared Records ─────────────────────────────────────────────────────
  List<Map<String, dynamic>> _sharedRecords = const [];
  bool _isLoadingSharedRecords = false;
  String? _sharedRecordsError;

  @override
  void initState() {
    super.initState();
    _appointment = widget.appointment;
    _historyMode = _isCompleted || _isCancelled;
    _tabController = TabController(length: _historyMode ? 3 : 5, vsync: this);
    _load();
    _loadPatientHistory();
    _loadSharedRecords();
  }

  /// Đồng bộ lại số lượng tab nếu trạng thái lịch hẹn đổi giữa
  /// "đang diễn ra" (5 tab) và "đã xong/huỷ" (3 tab, giống trang History bên web).
  void _syncTabModeWithStatus() {
    final newMode = _isCompleted || _isCancelled;
    if (newMode == _historyMode) return;
    final oldController = _tabController;
    setState(() {
      _historyMode = newMode;
      _tabController = TabController(length: _historyMode ? 3 : 5, vsync: this);
    });
    oldController.dispose();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _diagnosisCtrl.dispose();
    _doctorNotesCtrl.dispose();
    _treatmentPlanCtrl.dispose();
    _heartRateCtrl.dispose();
    _bpSystolicCtrl.dispose();
    _bpDiastolicCtrl.dispose();
    _temperatureCtrl.dispose();
    _oxygenSaturationCtrl.dispose();
    _respiratoryRateCtrl.dispose();
    _vitalsNotesCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final token = context.read<AuthProvider>().accessToken;
      if (token == null) throw Exception('Not authenticated');

      final patientId = _appointment.patientId;
      final results = await Future.wait<dynamic>([
        DoctorService.getAppointmentDetail(token, _appointment.appointmentId),
        patientId != null
            ? PatientService.getPatientProfileById(token, patientId)
            : Future.value(null),
        VitalSignService.getLatestAppointmentVitalSign(token, _appointment.appointmentId),
      ]);

      if (mounted) {
        setState(() {
          _appointment = results[0] as DoctorAppointment;
          _profile = results[1] as PatientProfile?;
          _vitals = results[2] as Map<String, dynamic>?;
          _isLoading = false;
        });
        _syncTabModeWithStatus();
        _initVitalsFormFromLatest();
        // Load riêng, không chặn toàn bộ appointment detail nếu API này lỗi.
        _loadClinicalResults();
        _loadFollowUpStatus();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _loadClinicalResults() async {
    setState(() {
      _isLoadingClinicalResults = true;
      _clinicalResultsError = null;
    });

    try {
      final token = context.read<AuthProvider>().accessToken;
      if (token == null) throw Exception('Not authenticated');
      final results = await DoctorClinicalResultService(accessToken: token)
          .getAppointmentResults(_appointment.appointmentId);
      if (mounted) {
        setState(() {
          _clinicalResults = results;
          _isLoadingClinicalResults = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _clinicalResultsError = e.toString().replaceFirst('Exception: ', '');
          _isLoadingClinicalResults = false;
        });
      }
    }
  }

  Future<void> _loadFollowUpStatus() async {
    final hasExistingFollowUp = _appointment.followUpDate != null || _appointment.followUpAppointmentId != null;
    if (!hasExistingFollowUp) {
      if (mounted) setState(() => _followUpStatus = FollowUpStatus(status: 'NONE'));
      return;
    }

    setState(() {
      _isLoadingFollowUp = true;
      _followUpError = null;
    });

    try {
      final token = context.read<AuthProvider>().accessToken;
      if (token == null) throw Exception('Not authenticated');
      final status = await DoctorFollowUpService(accessToken: token).getStatus(_appointment.appointmentId);
      if (mounted) {
        setState(() {
          _followUpStatus = status;
          _isLoadingFollowUp = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _followUpError = e.toString().replaceFirst('Exception: ', '');
          _isLoadingFollowUp = false;
        });
      }
    }
  }

  // ── Medical History (dùng chung cho tab Notes prefill + Medical History) ──

  Future<void> _loadPatientHistory() async {
    final patientId = _appointment.patientId;
    if (patientId == null) return;

    setState(() {
      _isLoadingPatientHistory = true;
      _patientHistoryError = null;
    });

    try {
      final token = context.read<AuthProvider>().accessToken;
      if (token == null) throw Exception('Not authenticated');
      final history = await DoctorService.getPatientHistory(token, patientId);
      if (mounted) {
        setState(() {
          _patientHistory = history;
          _isLoadingPatientHistory = false;
        });
        _initNotesFromHistory();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _patientHistoryError = e.toString().replaceFirst('Exception: ', '');
          _isLoadingPatientHistory = false;
        });
      }
    }
  }

  /// Tìm bản ghi lịch hẹn hiện tại trong patient history — nguồn duy nhất có
  /// diagnosis/doctorNotes/treatmentPlan (endpoint GET /appointments/{id} không trả các field này).
  Map<String, dynamic>? get _currentHistoryEntry {
    final appointments = _patientHistory?['appointments'] as List<dynamic>?;
    if (appointments == null) return null;
    for (final e in appointments) {
      final m = Map<String, dynamic>.from(e as Map);
      final id = m['appointmentId'] ?? m['appointmentID'];
      if (id != null && int.tryParse(id.toString()) == _appointment.appointmentId) return m;
    }
    return null;
  }

  /// Đơn thuốc gắn với lịch hẹn hiện tại (nếu có) — dùng cho tab Prescriptions
  /// khi xem lại lịch hẹn đã hoàn thành/huỷ, giống `selectedPrescription` bên web.
  Map<String, dynamic>? get _currentPrescription {
    final prescriptions = _patientHistory?['prescriptions'] as List<dynamic>?;
    if (prescriptions == null) return null;
    for (final e in prescriptions) {
      final m = Map<String, dynamic>.from(e as Map);
      final id = m['appointmentId'] ?? m['appointmentID'];
      if (id != null && id.toString() == _appointment.appointmentId.toString()) return m;
    }
    return null;
  }

  List<Map<String, dynamic>> get _completedHistoryEntries {
    final appointments = _patientHistory?['appointments'] as List<dynamic>? ?? [];
    final list = appointments
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((m) => m['status']?.toString().toLowerCase() == 'completed')
        .where((m) {
      final id = m['appointmentId'] ?? m['appointmentID'];
      return id == null || int.tryParse(id.toString()) != _appointment.appointmentId;
    }).toList();
    list.sort((a, b) {
      final da = DateTime.tryParse(a['appointmentTime']?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
      final db = DateTime.tryParse(b['appointmentTime']?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
      return db.compareTo(da);
    });
    return list;
  }

  void _initNotesFromHistory() {
    if (_notesInitialized) return;
    final entry = _currentHistoryEntry;
    _diagnosisCtrl.text = entry?['diagnosis']?.toString() ?? '';
    _doctorNotesCtrl.text = entry?['doctorNotes']?.toString() ?? '';
    _treatmentPlanCtrl.text = entry?['treatmentPlan']?.toString() ?? '';
    _notesInitialized = true;
  }

  Future<void> _saveNotes() async {
    setState(() => _isSavingNotes = true);
    try {
      final token = context.read<AuthProvider>().accessToken;
      if (token == null) throw Exception('Not authenticated');
      await DoctorService.updateConsultationNotes(
        token,
        _appointment.appointmentId,
        diagnosis: _diagnosisCtrl.text.trim(),
        doctorNotes: _doctorNotesCtrl.text.trim(),
        treatmentPlan: _treatmentPlanCtrl.text.trim(),
      );
      if (mounted) {
        setState(() => _isSavingNotes = false);
        showDoctorNotice(context, 'Notes saved.');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSavingNotes = false);
        showDoctorNotice(context, e.toString().replaceFirst('Exception: ', ''), isError: true);
      }
    }
  }

  // ── Shared Records ─────────────────────────────────────────────────────

  Future<void> _loadSharedRecords() async {
    setState(() {
      _isLoadingSharedRecords = true;
      _sharedRecordsError = null;
    });
    try {
      final token = context.read<AuthProvider>().accessToken;
      if (token == null) throw Exception('Not authenticated');
      final records = await DoctorService.getSharedWithMe(token, appointmentId: _appointment.appointmentId);
      if (mounted) {
        setState(() {
          _sharedRecords = records;
          _isLoadingSharedRecords = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _sharedRecordsError = e.toString().replaceFirst('Exception: ', '');
          _isLoadingSharedRecords = false;
        });
      }
    }
  }

  void _viewSharedDocument(Map<String, dynamic> document) {
    final rawLocation = document['fileLocation']?.toString();
    final url = ApiConfig.normalizeUrl(rawLocation);
    if (url == null || url.isEmpty) {
      showDoctorNotice(context, 'Document file is not available.', isError: true);
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => DocumentViewerScreen(
          url: url,
          title: document['documentName']?.toString() ?? 'Document',
          mimeType: document['mimeType']?.toString(),
        ),
      ),
    );
  }

  // ── Status helpers ─────────────────────────────────────────────────────
  // Status thật từ BE chỉ có: SCHEDULED, IN_CONSULTATION, COMPLETED, CANCELLED.

  String get _status => _appointment.status?.toUpperCase() ?? 'SCHEDULED';
  bool get _isCompleted => _status == 'COMPLETED';
  bool get _isCancelled => _status == 'CANCELLED';
  bool get _hasStarted => _status == 'IN_CONSULTATION' || _appointment.consultationStartTime != null;
  bool get _hasTimeArrived {
    final t = _appointment.appointmentTime;
    return t != null && !t.isAfter(DateTime.now());
  }

  /// Khớp `showVitalsGate` bên web (useAppointmentDetail hasn't started + scheduled):
  /// bắt buộc nhập vitals trước khi vào được workspace/start consultation.
  /// Mobile giữ thêm điều kiện đã tới giờ hẹn để tránh hiện gate quá sớm.
  bool get _showVitalsGate => !_isCompleted && !_isCancelled && !_hasStarted && _hasTimeArrived;

  /// Khớp `joinDisabled` bên web: Join Room luôn dùng được trừ khi đã completed/cancelled,
  /// không phụ thuộc đã start hay chưa.
  bool get _canJoinRoom => !_isCompleted && !_isCancelled;
  bool get _canComplete => _hasStarted && !_isCompleted && !_isCancelled;

  /// Khớp `canManageClinicalResults` bên web (useAppointmentDetail.js): không cancelled,
  /// có patientId, và consultation đã start hoặc appointment đã completed.
  bool get _canManageClinicalResults =>
      !_isCancelled && _appointment.patientId != null && (_hasStarted || _isCompleted);

  /// Khớp `canEditFollowUp` bên web: chỉ sửa được khi consultation đang diễn ra
  /// (đã start, chưa completed, chưa cancelled) — khác Clinical Results (cho phép cả completed).
  bool get _canManageFollowUp => _hasStarted && !_isCompleted && !_isCancelled && _appointment.patientId != null;

  /// Khớp `canEditClinical` bên web (useAppointmentDetail.js): giống canManageFollowUp
  /// — chỉ sửa được notes khi consultation đang diễn ra.
  bool get _canEditNotes => _hasStarted && !_isCompleted && !_isCancelled;

  String? get _joinRoomHint {
    if (_isCompleted) return 'Appointment already completed';
    if (_isCancelled) return 'Appointment was cancelled';
    return null;
  }

  String? get _completeHint {
    if (_isCompleted) return 'Appointment already completed';
    if (_isCancelled) return 'Appointment was cancelled';
    if (!_hasStarted) return 'Start consultation first';
    return null;
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  // ── Vitals Gate ─────────────────────────────────────────────────────────

  void _initVitalsFormFromLatest() {
    if (_vitalsFormInitialized) return;
    final v = _vitals;
    if (v != null) {
      _heartRateCtrl.text = v['heartRate']?.toString() ?? '';
      _bpSystolicCtrl.text = v['bloodPressureSystolic']?.toString() ?? '';
      _bpDiastolicCtrl.text = v['bloodPressureDiastolic']?.toString() ?? '';
      _temperatureCtrl.text = v['temperature']?.toString() ?? '';
      _oxygenSaturationCtrl.text = v['oxygenSaturation']?.toString() ?? '';
      _respiratoryRateCtrl.text = v['respiratoryRate']?.toString() ?? '';
      _vitalsNotesCtrl.text = v['notes']?.toString() ?? '';
    }
    _vitalsFormInitialized = true;
  }

  /// Khớp `validateDoctorVitalsForm` (vitalsFormModel.js) bên web.
  Map<String, String> _validateVitals() {
    final errors = <String, String>{};

    final heartRate = double.tryParse(_heartRateCtrl.text.trim());
    if (heartRate == null) {
      errors['heartRate'] = 'Heart rate is required.';
    } else if (heartRate < 30 || heartRate > 220) {
      errors['heartRate'] = 'Heart rate must be between 30 and 220 bpm.';
    }

    final sysText = _bpSystolicCtrl.text.trim();
    final diaText = _bpDiastolicCtrl.text.trim();
    final systolic = double.tryParse(sysText);
    final diastolic = double.tryParse(diaText);

    if (sysText.isNotEmpty != diaText.isNotEmpty) {
      errors['bloodPressure'] = 'Enter both systolic and diastolic blood pressure.';
    }
    if (systolic != null && (systolic < 70 || systolic > 250)) {
      errors['bloodPressureSystolic'] = 'Systolic pressure must be between 70 and 250 mmHg.';
    }
    if (diastolic != null && (diastolic < 40 || diastolic > 150)) {
      errors['bloodPressureDiastolic'] = 'Diastolic pressure must be between 40 and 150 mmHg.';
    }
    if (systolic != null && diastolic != null && diastolic >= systolic) {
      errors['bloodPressure'] = 'Diastolic pressure must be lower than systolic pressure.';
    }

    final temperature = double.tryParse(_temperatureCtrl.text.trim());
    if (temperature != null && (temperature < 30 || temperature > 45)) {
      errors['temperature'] = 'Temperature must be between 30 and 45°C.';
    }

    final oxygenSaturation = double.tryParse(_oxygenSaturationCtrl.text.trim());
    if (oxygenSaturation != null && (oxygenSaturation < 50 || oxygenSaturation > 100)) {
      errors['oxygenSaturation'] = 'SpO2 must be between 50 and 100%.';
    }

    final respiratoryRate = double.tryParse(_respiratoryRateCtrl.text.trim());
    if (respiratoryRate != null && (respiratoryRate < 5 || respiratoryRate > 60)) {
      errors['respiratoryRate'] = 'Respiratory rate must be between 5 and 60 breaths/min.';
    }

    return errors;
  }

  /// Khớp `handleSaveVitalsAndEnterWorkspace` bên web: lưu vitals rồi mới start
  /// consultation — gộp lại thành 1 hành động duy nhất, không có nút "Start" riêng.
  Future<void> _handleSaveVitalsAndStart() async {
    final errors = _validateVitals();
    setState(() => _vitalsErrors = errors);
    if (errors.isNotEmpty) return;

    if (_appointment.patientId == null) {
      showDoctorNotice(context, 'Patient information is missing. Please refresh and try again.', isError: true);
      return;
    }

    setState(() => _savingVitals = true);
    try {
      final token = context.read<AuthProvider>().accessToken;
      if (token == null) throw Exception('Not authenticated');

      await VitalSignService.createVitalSign(token, {
        'patientId': _appointment.patientId,
        'appointmentId': _appointment.appointmentId,
        'heartRate': double.tryParse(_heartRateCtrl.text.trim()),
        'bloodPressureSystolic': double.tryParse(_bpSystolicCtrl.text.trim()),
        'bloodPressureDiastolic': double.tryParse(_bpDiastolicCtrl.text.trim()),
        'temperature': double.tryParse(_temperatureCtrl.text.trim()),
        'oxygenSaturation': double.tryParse(_oxygenSaturationCtrl.text.trim()),
        'respiratoryRate': double.tryParse(_respiratoryRateCtrl.text.trim()),
        'source': 'Manual',
        'deviceName': null,
        'notes': _vitalsNotesCtrl.text.trim().isEmpty ? null : _vitalsNotesCtrl.text.trim(),
      });

      if (!_hasStarted) {
        await DoctorService.startConsultation(token, _appointment.appointmentId);
      }

      if (mounted) {
        await showDoctorNotice(context, 'Vitals saved. Consultation started.');
        _load();
      }
    } catch (e) {
      if (mounted) {
        showDoctorNotice(context, e.toString().replaceFirst('Exception: ', ''), isError: true);
      }
    } finally {
      if (mounted) setState(() => _savingVitals = false);
    }
  }

  void _handleJoinRoom() {
    joinDoctorConsultationRoom(context, _appointment);
  }

  void _handleComplete() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CompleteAppointmentSheet(
        appointmentId: _appointment.appointmentId,
        patientName: _appointment.patientName,
        onCompleted: _load,
      ),
    );
  }

  // ── Clinical Results ───────────────────────────────────────────────────

  void _openCreateClinicalResult() {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) return;
    showClinicalResultEditorSheet(
      context,
      appointmentId: _appointment.appointmentId,
      accessToken: token,
      onSaved: _loadClinicalResults,
    );
  }

  void _openEditClinicalResult(DoctorClinicalResult result) {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) return;
    showClinicalResultEditorSheet(
      context,
      appointmentId: _appointment.appointmentId,
      accessToken: token,
      existing: result,
      onSaved: _loadClinicalResults,
    );
  }

  void _openClinicalResultDetail(DoctorClinicalResult result) {
    showClinicalResultDetailSheet(
      context,
      result: result,
      canManage: _canManageClinicalResults,
      onEdit: () => _openEditClinicalResult(result),
      onPublish: () => _handlePublishClinicalResult(result),
      onDelete: () => _handleDeleteClinicalResult(result),
    );
  }

  Future<void> _handlePublishClinicalResult(DoctorClinicalResult result) async {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) return;
    try {
      await DoctorClinicalResultService(accessToken: token).publishResult(result.documentId);
      if (mounted) {
        await showDoctorNotice(context, 'Clinical result published.');
        _loadClinicalResults();
      }
    } catch (e) {
      if (mounted) {
        showDoctorNotice(context, e.toString().replaceFirst('Exception: ', ''), isError: true);
      }
    }
  }

  Future<void> _handleDeleteClinicalResult(DoctorClinicalResult result) async {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) return;
    try {
      await DoctorClinicalResultService(accessToken: token).deleteResult(result.documentId);
      if (mounted) {
        await showDoctorNotice(context, 'Clinical result deleted.');
        _loadClinicalResults();
      }
    } catch (e) {
      if (mounted) {
        showDoctorNotice(context, e.toString().replaceFirst('Exception: ', ''), isError: true);
      }
    }
  }

  // ── Follow-up ───────────────────────────────────────────────────────────

  void _openScheduleFollowUp({bool isReschedule = false}) {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) return;
    final status = _followUpStatus;
    showFollowUpEditorSheet(
      context,
      appointmentId: _appointment.appointmentId,
      accessToken: token,
      initialDate: status?.followUpDate ?? _appointment.followUpDate,
      initialType: status?.consultationType ?? _appointment.followUpConsultationType,
      initialNotes: status?.followUpNotes ?? _appointment.followUpNotes,
      isReschedule: isReschedule,
      onSaved: () {
        _load();
      },
    );
  }

  Future<void> _sendFollowUpPaymentRequest() async {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) return;
    try {
      await DoctorFollowUpService(accessToken: token).sendPaymentRequest(_appointment.appointmentId);
      if (mounted) {
        await showDoctorNotice(context, 'Payment request sent to patient.');
        _loadFollowUpStatus();
      }
    } catch (e) {
      if (mounted) {
        showDoctorNotice(context, e.toString().replaceFirst('Exception: ', ''), isError: true);
      }
    }
  }

  Future<void> _cancelFollowUpPending() async {
    final token = context.read<AuthProvider>().accessToken;
    if (token == null) return;
    try {
      await DoctorFollowUpService(accessToken: token).denyFollowUp(_appointment.appointmentId);
      if (mounted) {
        await showDoctorNotice(context, 'Payment request cancelled.');
        _loadFollowUpStatus();
      }
    } catch (e) {
      if (mounted) {
        showDoctorNotice(context, e.toString().replaceFirst('Exception: ', ''), isError: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DS.background,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            DoctorBackHeader(
              title: _appointment.patientName ?? 'Appointment',
              onBack: () => Navigator.pop(context),
            ),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
      bottomNavigationBar: (_isLoading || _error != null || _historyMode)
          ? null
          : SafeArea(top: false, child: _buildActionBar()),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: DS.primary));
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(color: DS.rose100, shape: BoxShape.circle),
                child: const Icon(Icons.error_outline, size: 28, color: DS.rose700),
              ),
              const SizedBox(height: 16),
              const Text('Failed to load appointment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: DS.foreground)),
              const SizedBox(height: 4),
              Text(_error!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: DS.mutedForeground)),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _load,
                style: DS.primaryButtonStyle,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_showVitalsGate) {
      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const SizedBox(height: 16),
            _buildVitalsGate(),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: DS.primary,
      onRefresh: () => Future.wait([_load(), _loadPatientHistory(), _loadSharedRecords()]),
      child: NestedScrollView(
      headerSliverBuilder: (context, innerBoxIsScrolled) => [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: _historyMode
                ? _buildHistoryHero()
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildHeader(),
                      const SizedBox(height: 16),
                      _buildStatusPanel(),
                      const SizedBox(height: 16),
                      _buildInfoCard(),
                      const SizedBox(height: 16),
                      _buildAllergiesCard(),
                      const SizedBox(height: 16),
                      _buildVitalsCard(),
                      const SizedBox(height: 16),
                      _buildEmergencyContactCard(),
                    ],
                  ),
          ),
        ),
        SliverPersistentHeader(
          pinned: true,
          delegate: _TabBarDelegate(
            TabBar(
              controller: _tabController,
              isScrollable: true,
              labelColor: DS.primary,
              unselectedLabelColor: DS.mutedForeground,
              indicatorColor: DS.primary,
              labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              tabs: _historyMode
                  ? const [
                      Tab(text: 'Clinical Results'),
                      Tab(text: 'Prescriptions'),
                      Tab(text: 'Documents'),
                    ]
                  : const [
                      Tab(text: 'Notes'),
                      Tab(text: 'Medical History'),
                      Tab(text: 'Shared Records'),
                      Tab(text: 'Clinical Results'),
                      Tab(text: 'Follow-up'),
                    ],
            ),
          ),
        ),
      ],
      body: TabBarView(
        controller: _tabController,
        children: _historyMode
            ? [
                _buildClinicalResultsTab(),
                _buildPrescriptionsTab(),
                _buildSharedRecordsTab(),
              ]
            : [
                _buildNotesTab(),
                _buildMedicalHistoryTab(),
                _buildSharedRecordsTab(),
                _buildClinicalResultsTab(),
                _buildFollowUpTab(),
              ],
      ),
      ),
    );
  }

  // ── Tab: Notes ──────────────────────────────────────────────────────────

  Widget _buildNotesTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _notesField(label: 'Diagnosis', controller: _diagnosisCtrl),
          const SizedBox(height: 16),
          _notesField(label: 'Doctor Notes', controller: _doctorNotesCtrl),
          const SizedBox(height: 16),
          _notesField(label: 'Treatment Plan', controller: _treatmentPlanCtrl),
          if (_canEditNotes) ...[
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isSavingNotes ? null : _saveNotes,
                style: DS.primaryButtonStyle,
                icon: _isSavingNotes
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.save_outlined, size: 18),
                label: Text(_isSavingNotes ? 'Saving...' : 'Save Notes'),
              ),
            ),
          ] else ...[
            const SizedBox(height: 10),
            Text(
              _isCompleted
                  ? 'Appointment already completed — notes are read-only.'
                  : _isCancelled
                      ? 'Appointment was cancelled — notes are read-only.'
                      : 'Start the consultation to edit notes.',
              style: const TextStyle(fontSize: 12, color: DS.mutedForeground),
            ),
          ],
        ],
      ),
    );
  }

  Widget _notesField({required String label, required TextEditingController controller}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DoctorSectionLabel(label),
          const SizedBox(height: 8),
          TextField(
            controller: controller,
            enabled: _canEditNotes,
            minLines: 3,
            maxLines: 6,
            style: const TextStyle(fontSize: 14, color: DS.foreground),
            decoration: InputDecoration(
              hintText: _canEditNotes ? 'Enter $label'.toLowerCase() : 'Not recorded',
              hintStyle: const TextStyle(fontSize: 13, color: DS.mutedForeground),
              filled: true,
              fillColor: _canEditNotes ? DS.background : DS.secondary.withValues(alpha: 0.4),
              contentPadding: const EdgeInsets.all(12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: DS.cardBorder)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: DS.cardBorder)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: DS.primary)),
              disabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: DS.cardBorder)),
            ),
          ),
        ],
      ),
    );
  }

  // ── Tab: Medical History ────────────────────────────────────────────────

  Widget _buildMedicalHistoryTab() {
    if (_isLoadingPatientHistory) {
      return const Center(child: CircularProgressIndicator(color: DS.primary));
    }
    if (_patientHistoryError != null) {
      return _tabErrorState(_patientHistoryError!, _loadPatientHistory);
    }

    final entries = _completedHistoryEntries;
    if (entries.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: DoctorEmptyState(
            icon: Icons.history,
            title: 'No completed appointments found',
            subtitle: 'Completed visits for this patient will appear here once they become available.',
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: entries.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final entry = entries[index];
        final dt = DateTime.tryParse(entry['appointmentTime']?.toString() ?? '');
        return GestureDetector(
          onTap: () => _showHistorySnapshot(entry),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: DS.cardDecoration,
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        dt != null ? DateFormat('MMM d, yyyy · h:mm a').format(dt) : 'Unknown date',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: DS.foreground),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        entry['symptoms']?.toString().isNotEmpty == true ? entry['symptoms'].toString() : 'Completed appointment',
                        style: const TextStyle(fontSize: 12, color: DS.mutedForeground),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, size: 20, color: DS.mutedForeground),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showHistorySnapshot(Map<String, dynamic> entry) {
    final dt = DateTime.tryParse(entry['appointmentTime']?.toString() ?? '');
    final prescriptions = (_patientHistory?['prescriptions'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((p) {
      final id = p['appointmentId'] ?? p['appointmentID'];
      final entryId = entry['appointmentId'] ?? entry['appointmentID'];
      return id != null && entryId != null && id.toString() == entryId.toString();
    }).toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => Container(
          decoration: const BoxDecoration(
            color: DS.card,
            borderRadius: BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20)),
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(20),
            children: [
              Center(
                child: Container(width: 40, height: 4, decoration: BoxDecoration(color: DS.cardBorder, borderRadius: BorderRadius.circular(2))),
              ),
              const SizedBox(height: 16),
              const Text('Medical Record', style: TextStyle(fontSize: 12, color: DS.mutedForeground, fontWeight: FontWeight.w600)),
              Text(
                dt != null ? DateFormat('MMM d, yyyy · h:mm a').format(dt) : 'Unknown date',
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: DS.foreground),
              ),
              const SizedBox(height: 16),
              _snapshotSection('Diagnosis', entry['diagnosis']?.toString()),
              const SizedBox(height: 12),
              _snapshotSection('Clinical Notes', entry['doctorNotes']?.toString()),
              const SizedBox(height: 12),
              _snapshotSection('Treatment Plan', entry['treatmentPlan']?.toString()),
              if (prescriptions.isNotEmpty) ...[
                const SizedBox(height: 16),
                const DoctorSectionLabel('Prescribed Medications'),
                const SizedBox(height: 8),
                ...prescriptions.expand((p) => (p['items'] as List<dynamic>? ?? [])).map((item) {
                  final m = Map<String, dynamic>.from(item as Map);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(children: [
                      const Icon(Icons.medication_outlined, size: 16, color: DS.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          m['medicineName']?.toString() ?? m['name']?.toString() ?? 'Medication',
                          style: const TextStyle(fontSize: 13, color: DS.foreground),
                        ),
                      ),
                    ]),
                  );
                }),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _snapshotSection(String label, String? value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        DoctorSectionLabel(label),
        const SizedBox(height: 4),
        Text(
          (value != null && value.isNotEmpty) ? value : 'No $label recorded.'.toLowerCase(),
          style: const TextStyle(fontSize: 14, color: DS.foreground),
        ),
      ],
    );
  }

  // ── Tab: Shared Records ─────────────────────────────────────────────────

  Widget _buildSharedRecordsTab() {
    if (_isLoadingSharedRecords) {
      return const Center(child: CircularProgressIndicator(color: DS.primary));
    }
    if (_sharedRecordsError != null) {
      return _tabErrorState(_sharedRecordsError!, _loadSharedRecords);
    }

    final documents = <Map<String, dynamic>>[];
    for (final share in _sharedRecords) {
      final docs = (share['documents'] as List<dynamic>? ?? []).map((e) => Map<String, dynamic>.from(e as Map));
      documents.addAll(docs);
    }

    if (documents.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: DoctorEmptyState(
            icon: Icons.folder_off_outlined,
            title: 'No shared documents for this appointment',
            subtitle: 'The patient has not shared any health records for this appointment.',
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: documents.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final doc = documents[index];
        return GestureDetector(
          onTap: () => _viewSharedDocument(doc),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: DS.cardDecoration,
            child: Row(children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: DS.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.description_outlined, color: DS.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      doc['documentName']?.toString() ?? 'Document',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: DS.foreground),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if ((doc['category']?.toString() ?? '').isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(doc['category'].toString(), style: const TextStyle(fontSize: 12, color: DS.mutedForeground)),
                      ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, size: 20, color: DS.mutedForeground),
            ]),
          ),
        );
      },
    );
  }

  // ── Tab: Prescriptions (chỉ dùng khi xem lịch hẹn đã hoàn thành/huỷ) ──────

  Widget _buildPrescriptionsTab() {
    if (_isCancelled) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: DoctorEmptyState(
            icon: Icons.cancel_outlined,
            title: 'Appointment Cancelled',
            subtitle: 'Prescriptions are not available for cancelled appointments.',
          ),
        ),
      );
    }
    if (_isLoadingPatientHistory) {
      return const Center(child: CircularProgressIndicator(color: DS.primary));
    }
    if (_patientHistoryError != null) {
      return _tabErrorState(_patientHistoryError!, _loadPatientHistory);
    }

    final prescription = _currentPrescription;
    if (prescription == null) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: DoctorEmptyState(
            icon: Icons.medication_outlined,
            title: 'No Prescription',
            subtitle: 'No prescription was issued for this appointment.',
          ),
        ),
      );
    }

    final entry = _currentHistoryEntry;
    final items = (prescription['items'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    final validUntil = DateTime.tryParse(prescription['validUntil']?.toString() ?? '');
    final status = _prescriptionStatus(prescription, validUntil);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.event_available, size: 16, color: DS.mutedForeground),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Valid until: ${validUntil != null ? DateFormat('MMM d, yyyy').format(validUntil) : 'N/A'}',
                  style: const TextStyle(fontSize: 13, color: DS.mutedForeground),
                ),
              ),
              _statusPill(status),
            ],
          ),
          const SizedBox(height: 16),
          _prescriptionInfoCard(Icons.biotech_outlined, 'Diagnosis', (prescription['diagnosis'] ?? entry?['diagnosis'])?.toString()),
          const SizedBox(height: 12),
          _prescriptionInfoCard(Icons.description_outlined, 'Doctor Notes', (prescription['notes'] ?? entry?['doctorNotes'])?.toString()),
          if ((entry?['treatmentPlan']?.toString() ?? '').isNotEmpty) ...[
            const SizedBox(height: 12),
            _prescriptionInfoCard(Icons.assignment_outlined, 'Treatment Plan', entry!['treatmentPlan'].toString()),
          ],
          const SizedBox(height: 20),
          Row(children: [
            const Icon(Icons.medication_outlined, size: 16, color: DS.mutedForeground),
            const SizedBox(width: 6),
            const DoctorSectionLabel('Medications'),
          ]),
          const SizedBox(height: 8),
          if (items.isEmpty)
            const Text('No medication details available', style: TextStyle(fontSize: 13, color: DS.mutedForeground))
          else
            ...items.asMap().entries.map((e) {
              final index = e.key;
              final item = e.value;
              return Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    margin: const EdgeInsets.only(bottom: 10, top: 6, left: 6),
                    padding: const EdgeInsets.fromLTRB(14, 16, 14, 14),
                    decoration: DS.cardDecoration,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                item['medicationName']?.toString() ?? item['medicineName']?.toString() ?? 'Medication',
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: DS.foreground),
                              ),
                            ),
                            if ((item['dosage']?.toString() ?? '').isNotEmpty)
                              Text(item['dosage'].toString(), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: DS.primary)),
                          ],
                        ),
                        const Divider(height: 16, color: DS.border),
                        Wrap(spacing: 6, runSpacing: 6, children: [
                          if ((item['route']?.toString() ?? '').isNotEmpty) _pill('Route: ${item['route']}'),
                          if ((item['frequency']?.toString() ?? '').isNotEmpty) _pill('Frequency: ${item['frequency']}'),
                          if (item['totalSupplyDays'] != null) _pill('${item['totalSupplyDays']} day(s) supply'),
                          if (item['quantity'] != null) _pill('Qty: ${item['quantity']}${item['unit'] != null ? ' ${item['unit']}' : ''}'),
                          if ((item['timing']?.toString() ?? '').isNotEmpty) _pill('Timing: ${item['timing']}'),
                        ]),
                        if ((item['notes']?.toString() ?? '').isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(item['notes'].toString(), style: const TextStyle(fontSize: 12, color: DS.mutedForeground)),
                        ],
                      ],
                    ),
                  ),
                  Positioned(
                    top: -2,
                    left: -2,
                    child: Container(
                      width: 22,
                      height: 22,
                      alignment: Alignment.center,
                      decoration: const BoxDecoration(color: DS.primary, shape: BoxShape.circle),
                      child: Text('${index + 1}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white)),
                    ),
                  ),
                ],
              );
            }),
        ],
      ),
    );
  }

  /// Khớp `getValidStatus` bên web: hết hạn khi vượt quá cuối ngày validUntil.
  String _prescriptionStatus(Map<String, dynamic> prescription, DateTime? validUntil) {
    if (validUntil == null) return prescription['status']?.toString().toUpperCase() ?? 'ISSUED';
    final endOfDay = DateTime(validUntil.year, validUntil.month, validUntil.day, 23, 59, 59);
    return DateTime.now().isAfter(endOfDay) ? 'EXPIRED' : 'ACTIVE';
  }

  Widget _statusPill(String status) {
    late final Color bg, fg, dot;
    switch (status) {
      case 'ACTIVE':
        bg = DS.emerald100;
        fg = DS.emerald700;
        dot = DS.emerald600;
        break;
      case 'ISSUED':
        bg = DS.amber100;
        fg = DS.amber700;
        dot = DS.amber600;
        break;
      default:
        bg = DS.secondary;
        fg = DS.mutedForeground;
        dot = DS.mutedForeground;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 6, height: 6, decoration: BoxDecoration(color: dot, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: fg, letterSpacing: 0.5)),
      ]),
    );
  }

  Widget _prescriptionInfoCard(IconData icon, String label, String? value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          Icon(icon, size: 14, color: DS.mutedForeground),
          const SizedBox(width: 6),
          DoctorSectionLabel(label),
        ]),
        const SizedBox(height: 6),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: DS.cardDecoration,
          child: Text(
            (value != null && value.isNotEmpty) ? value : 'Not recorded',
            style: const TextStyle(fontSize: 14, color: DS.foreground, height: 1.4),
          ),
        ),
      ],
    );
  }

  Widget _pill(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: DS.secondary, borderRadius: BorderRadius.circular(6)),
      child: Text(text, style: const TextStyle(fontSize: 11, color: DS.mutedForeground)),
    );
  }

  // ── Tab: Clinical Results / Follow-up (bọc lại section đã có) ────────────

  Widget _buildClinicalResultsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: ClinicalResultsSection(
        results: _clinicalResults,
        isLoading: _isLoadingClinicalResults,
        error: _clinicalResultsError,
        // Khớp web: trong History không cho thêm mới, chỉ xem/sửa kết quả đã có
        // (renderClinicalResults không truyền `action` cho list header khi ở History).
        canManage: _historyMode ? false : _canManageClinicalResults,
        onRetry: _loadClinicalResults,
        onAdd: _openCreateClinicalResult,
        onOpen: _openClinicalResultDetail,
      ),
    );
  }

  Widget _buildFollowUpTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: FollowUpSection(
        isLoading: _isLoadingFollowUp,
        error: _followUpError,
        canManage: _canManageFollowUp,
        status: _followUpStatus,
        draftDate: _appointment.followUpDate,
        draftType: _appointment.followUpConsultationType,
        onRetry: _loadFollowUpStatus,
        onSchedule: () => _openScheduleFollowUp(),
        onSendPaymentRequest: _sendFollowUpPaymentRequest,
        onCancelPending: _cancelFollowUpPending,
        onReschedule: () => _openScheduleFollowUp(isReschedule: true),
      ),
    );
  }

  Widget _tabErrorState(String message, VoidCallback onRetry) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 32, color: DS.rose600),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, color: DS.mutedForeground)),
            const SizedBox(height: 12),
            ElevatedButton.icon(onPressed: onRetry, style: DS.primaryButtonStyle, icon: const Icon(Icons.refresh, size: 16), label: const Text('Retry')),
          ],
        ),
      ),
    );
  }

  // ── Sections ────────────────────────────────────────────────────────────

  Widget _buildHeader() {
    final name = _appointment.patientName ?? _profile?.fullName ?? 'Patient';
    final age = _ageFromDob(_profile?.dateOfBirth);
    final gender = _profile?.gender;
    final avatarUrl = _appointment.patientAvatar ?? _profile?.avatarUrl;
    final metaParts = [
      if (gender != null && gender.isNotEmpty) gender,
      if (age.isNotEmpty) '$age yrs',
    ];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Row(
        children: [
          DoctorPersonAvatar(
            name: name,
            imageUrl: avatarUrl != null ? ApiConfig.normalizeUrl(avatarUrl) : null,
            size: 56,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: DS.foreground)),
                if (metaParts.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(metaParts.join(' · '), style: const TextStyle(fontSize: 13, color: DS.mutedForeground)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Hero tối giản khớp `renderDetail()` bên `DoctorAppointmentHistory.jsx`:
  /// chỉ avatar + tên + ngày giờ — không có status panel/info card nào khác.
  Widget _buildHistoryHero() {
    final name = _appointment.patientName ?? _profile?.fullName ?? 'Patient';
    final avatarUrl = _appointment.patientAvatar ?? _profile?.avatarUrl;
    final dt = _appointment.appointmentTime;

    return Row(
      children: [
        DoctorPersonAvatar(
          name: name,
          imageUrl: avatarUrl != null ? ApiConfig.normalizeUrl(avatarUrl) : null,
          size: 56,
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: DS.foreground)),
              const SizedBox(height: 2),
              Text(
                dt != null ? DateFormat('EEE, MMM d, yyyy \'at\' hh:mm a').format(dt) : 'Unknown date',
                style: const TextStyle(fontSize: 13, color: DS.mutedForeground),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatusPanel() {
    late final IconData icon;
    late final Color color;
    late final String title;
    late final String subtitle;

    if (_isCompleted) {
      icon = Icons.check_circle;
      color = DS.emerald600;
      title = 'Consultation Completed';
      subtitle = 'This appointment has been completed.';
    } else if (_isCancelled) {
      icon = Icons.cancel;
      color = DS.rose600;
      title = 'Appointment Cancelled';
      subtitle = (_appointment.cancelReason?.isNotEmpty ?? false)
          ? _appointment.cancelReason!
          : 'This appointment was cancelled.';
    } else if (_hasStarted) {
      icon = Icons.play_circle_fill;
      color = DS.primary;
      title = 'Consultation In Progress';
      subtitle = 'Use Join Room to connect, or Complete when you are done.';
    } else {
      // _hasTimeArrived==true && !_hasStarted rơi vào _showVitalsGate ở _buildBody(),
      // nên nhánh còn lại ở đây chỉ là appointment chưa tới giờ.
      icon = Icons.lock_outline;
      color = DS.mutedForeground;
      title = 'Appointment Not Yet Started';
      subtitle = 'The consultation workspace will be available once the appointment time arrives.';
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
      decoration: DS.cardDecoration,
      child: Column(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
            child: Icon(icon, size: 24, color: color),
          ),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: DS.foreground), textAlign: TextAlign.center),
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(fontSize: 13, color: DS.mutedForeground), textAlign: TextAlign.center),
        ],
      ),
    );
  }

  // ── Vitals Gate (khớp DoctorVitalsGate.jsx bên web) ────────────────────

  Widget _vitalsField({
    required String label,
    required TextEditingController controller,
    required String unit,
    bool required = false,
    String? errorText,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        RichText(
          text: TextSpan(
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: DS.mutedForeground),
            children: [
              TextSpan(text: label),
              TextSpan(text: ' ($unit)', style: const TextStyle(fontWeight: FontWeight.w400)),
              if (required) const TextSpan(text: ' *', style: TextStyle(color: DS.rose600)),
            ],
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: const TextStyle(fontSize: 14, color: DS.foreground),
          decoration: InputDecoration(
            isDense: true,
            filled: true,
            fillColor: DS.background,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            errorText: errorText,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: DS.cardBorder)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: errorText != null ? DS.rose600 : DS.cardBorder)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: DS.primary)),
          ),
        ),
      ],
    );
  }

  Widget _buildVitalsGate() {
    final patientName = _appointment.patientName ?? _profile?.fullName ?? 'the patient';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('PRE-CONSULTATION VITALS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: DS.primary, letterSpacing: 0.5)),
          const SizedBox(height: 6),
          const Text('Record patient readings', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: DS.foreground)),
          const SizedBox(height: 6),
          Text(
            'Ask $patientName for the readings prepared before the appointment, then save to open the consultation workspace.',
            style: const TextStyle(fontSize: 13, color: DS.mutedForeground, height: 1.4),
          ),
          const SizedBox(height: 20),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: _vitalsField(label: 'Blood pressure SYS', controller: _bpSystolicCtrl, unit: 'mmHg', errorText: _vitalsErrors['bloodPressureSystolic'])),
              const SizedBox(width: 12),
              Expanded(child: _vitalsField(label: 'Blood pressure DIA', controller: _bpDiastolicCtrl, unit: 'mmHg', errorText: _vitalsErrors['bloodPressureDiastolic'])),
            ],
          ),
          if (_vitalsErrors['bloodPressure'] != null) ...[
            const SizedBox(height: 6),
            Text(_vitalsErrors['bloodPressure']!, style: const TextStyle(fontSize: 12, color: DS.rose600)),
          ],
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: _vitalsField(label: 'Heart rate', controller: _heartRateCtrl, unit: 'bpm', required: true, errorText: _vitalsErrors['heartRate'])),
              const SizedBox(width: 12),
              Expanded(child: _vitalsField(label: 'Temperature', controller: _temperatureCtrl, unit: '°C', errorText: _vitalsErrors['temperature'])),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: _vitalsField(label: 'SpO2', controller: _oxygenSaturationCtrl, unit: '%', errorText: _vitalsErrors['oxygenSaturation'])),
              const SizedBox(width: 12),
              Expanded(child: _vitalsField(label: 'Respiratory rate', controller: _respiratoryRateCtrl, unit: 'br/min', errorText: _vitalsErrors['respiratoryRate'])),
            ],
          ),
          const SizedBox(height: 14),
          const Text('Notes', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: DS.mutedForeground)),
          const SizedBox(height: 6),
          TextField(
            controller: _vitalsNotesCtrl,
            minLines: 2,
            maxLines: 3,
            style: const TextStyle(fontSize: 14, color: DS.foreground),
            decoration: InputDecoration(
              hintText: 'Example: readings provided verbally during video call',
              hintStyle: const TextStyle(fontSize: 12, color: DS.mutedForeground),
              filled: true,
              fillColor: DS.background,
              contentPadding: const EdgeInsets.all(12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: DS.cardBorder)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: DS.cardBorder)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: DS.primary)),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Chat and video call remain available while collecting these values.',
            style: const TextStyle(fontSize: 12, color: DS.mutedForeground),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _savingVitals ? null : _handleSaveVitalsAndStart,
              style: DS.primaryButtonStyle,
              icon: _savingVitals
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.save_outlined, size: 18),
              label: Text(_savingVitals ? 'Saving...' : 'Save vitals and open workspace'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard() {
    final reason = _appointment.symptoms;
    final phone = _appointment.patientPhone ?? _profile?.phoneNumber;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DoctorSectionLabel('Visit Reason'),
          const SizedBox(height: 6),
          Text(
            (reason != null && reason.isNotEmpty) ? reason : 'Not provided',
            style: const TextStyle(fontSize: 14, color: DS.foreground),
          ),
          const SizedBox(height: 14),
          const Divider(height: 1, color: DS.border),
          const SizedBox(height: 14),
          const DoctorSectionLabel('Phone'),
          const SizedBox(height: 6),
          Text(phone ?? 'Not provided', style: const TextStyle(fontSize: 14, color: DS.foreground)),
        ],
      ),
    );
  }

  Widget _buildAllergiesCard() {
    final list = _splitList(_profile?.allergies);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DoctorSectionLabel('Allergies'),
          const SizedBox(height: 8),
          if (list.isEmpty)
            const Text('No known allergies', style: TextStyle(fontSize: 14, color: DS.mutedForeground))
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: list
                  .map((allergy) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: DS.amber50,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: DS.amber200),
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          const Icon(Icons.warning_amber, size: 12, color: DS.amber700),
                          const SizedBox(width: 4),
                          Text(allergy, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: DS.amber700)),
                        ]),
                      ))
                  .toList(),
            ),
        ],
      ),
    );
  }

  Widget _buildVitalsCard() {
    final v = _vitals;
    final heightCm = _profile?.heightCm;
    final weightKg = _profile?.weightKg;
    final bmi = (heightCm != null && weightKg != null && heightCm > 0)
        ? (weightKg / ((heightCm / 100) * (heightCm / 100))).toStringAsFixed(1)
        : null;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DoctorSectionLabel('Vitals'),
          const SizedBox(height: 10),
          if (v == null)
            const Text('No vitals recorded', style: TextStyle(fontSize: 13, color: DS.mutedForeground))
          else
            Wrap(spacing: 8, runSpacing: 8, children: [
              if (v['heartRate'] != null) DoctorVitalBadge(icon: Icons.favorite_border, value: '${v['heartRate']}', unit: 'bpm'),
              if (v['bloodPressureSystolic'] != null)
                DoctorVitalBadge(
                  icon: Icons.monitor_heart_outlined,
                  value: '${v['bloodPressureSystolic']}/${v['bloodPressureDiastolic'] ?? '?'}',
                  unit: 'mmHg',
                ),
              if (v['oxygenSaturation'] != null) DoctorVitalBadge(icon: Icons.air, value: '${v['oxygenSaturation']}', unit: '%'),
              if (v['temperature'] != null) DoctorVitalBadge(icon: Icons.thermostat_outlined, value: '${v['temperature']}', unit: '°C'),
              if (v['respiratoryRate'] != null) DoctorVitalBadge(icon: Icons.waves, value: '${v['respiratoryRate']}', unit: 'br/pm'),
            ]),
          if (heightCm != null || weightKg != null) ...[
            const SizedBox(height: 12),
            const Divider(height: 1, color: DS.border),
            const SizedBox(height: 8),
            const Text('BODY METRICS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: DS.mutedForeground, letterSpacing: 0.5)),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: [
              if (heightCm != null) DoctorVitalBadge(icon: Icons.height, value: heightCm.toStringAsFixed(0), unit: 'cm'),
              if (weightKg != null) DoctorVitalBadge(icon: Icons.monitor_weight_outlined, value: weightKg.toStringAsFixed(0), unit: 'kg'),
              if (bmi != null) DoctorVitalBadge(icon: Icons.calculate_outlined, value: bmi),
            ]),
          ],
        ],
      ),
    );
  }

  Widget _buildEmergencyContactCard() {
    final profile = _profile;
    final hasContact = (profile?.emergencyContactName ?? '').isNotEmpty;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DoctorSectionLabel('Emergency Contact'),
          const SizedBox(height: 10),
          if (!hasContact)
            Row(children: [
              Icon(Icons.person_off_outlined, color: DS.mutedForeground.withValues(alpha: 0.5), size: 24),
              const SizedBox(width: 12),
              const Expanded(
                child: Text('No emergency contact on file', style: TextStyle(fontSize: 13, color: DS.mutedForeground)),
              ),
            ])
          else ...[
            DoctorInfoRow(icon: Icons.person_outline, label: 'Name', value: profile!.emergencyContactName!),
            if ((profile.emergencyContactRelationship ?? '').isNotEmpty) ...[
              const Divider(height: 1, color: DS.border),
              DoctorInfoRow(icon: Icons.badge_outlined, label: 'Relationship', value: profile.emergencyContactRelationship!),
            ],
            const Divider(height: 1, color: DS.border),
            DoctorInfoRow(icon: Icons.phone_outlined, label: 'Phone', value: profile.emergencyContactPhone ?? 'Not provided'),
          ],
        ],
      ),
    );
  }

  // ── Action bar ──────────────────────────────────────────────────────────

  Widget _buildActionBar() {
    if (_isCompleted || _isCancelled) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(color: DS.card, border: Border(top: BorderSide(color: DS.cardBorder))),
        child: Row(children: [
          Icon(_isCompleted ? Icons.check_circle : Icons.cancel, size: 18, color: _isCompleted ? DS.emerald600 : DS.rose600),
          const SizedBox(width: 8),
          Text(
            _isCompleted ? 'This appointment is completed' : 'This appointment was cancelled',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: DS.mutedForeground),
          ),
        ]),
      );
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: const BoxDecoration(color: DS.card, border: Border(top: BorderSide(color: DS.cardBorder))),
      child: Row(
        children: [
          Expanded(
            child: _actionSlot(
              label: 'Join Room',
              icon: Icons.meeting_room_outlined,
              color: DS.sky600,
              enabled: _canJoinRoom,
              hint: _joinRoomHint,
              onTap: _handleJoinRoom,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _actionSlot(
              label: 'Complete',
              icon: Icons.check_circle_outline,
              color: DS.emerald600,
              enabled: _canComplete,
              hint: _completeHint,
              onTap: _handleComplete,
            ),
          ),
        ],
      ),
    );
  }

  Widget _actionSlot({
    required String label,
    required IconData icon,
    required Color color,
    required bool enabled,
    String? hint,
    required VoidCallback onTap,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: double.infinity,
          child: DoctorActionButton(
            label: label,
            icon: icon,
            color: enabled ? color : DS.mutedForeground,
            filled: enabled,
            onTap: enabled ? onTap : () {},
          ),
        ),
        if (!enabled && hint != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              hint,
              style: const TextStyle(fontSize: 10, color: DS.mutedForeground),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
      ],
    );
  }
}

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;

  _TabBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(color: DS.background, child: tabBar);
  }

  @override
  bool shouldRebuild(covariant _TabBarDelegate oldDelegate) => oldDelegate.tabBar != tabBar;
}
