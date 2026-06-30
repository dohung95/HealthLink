import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../l10n/app_localizations.dart';
import '../../../providers/auth_provider.dart';
import '../../../models/patient/medicine_reminder/medicine_reminder_settings.dart';
import '../../../models/patient/medicine_reminder/medicine_reminder_checklist.dart';
import '../../../services/patient/medicine_reminder/medicine_reminder_service.dart';

/// Các buổi uống thuốc
const _timings = ['MORNING', 'AFTERNOON', 'EVENING'];

class MedicineReminderScreen extends StatefulWidget {
  const MedicineReminderScreen({super.key});

  @override
  State<MedicineReminderScreen> createState() => _MedicineReminderScreenState();
}

class _MedicineReminderScreenState extends State<MedicineReminderScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  MedicineReminderSettings? _settings;
  MedicineReminderSettings? _draftSettings;
  MedicineReminderChecklist? _checklist;

  bool _loadingData = true;
  bool _savingSettings = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        _loadChecklist(_timings[_tabController.index]);
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadAll());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  MedicineReminderService _service() {
    final token = context.read<AuthProvider>().accessToken ?? '';
    return MedicineReminderService(accessToken: token);
  }

  Future<void> _loadAll() async {
    if (!mounted) return;
    setState(() {
      _loadingData = true;
      _error = null;
    });
    try {
      final svc = _service();
      final results = await Future.wait([
        svc.getSettings(),
        svc.getTodayChecklist(_timings[_tabController.index]),
      ]);
      if (!mounted) return;
      setState(() {
        _settings = results[0] as MedicineReminderSettings;
        _draftSettings = _settings;
        _checklist = results[1] as MedicineReminderChecklist;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = AppLocalizations.of(context)!.medicineReminderErrLoad;
      });
    } finally {
      if (mounted) setState(() => _loadingData = false);
    }
  }

  Future<void> _loadChecklist(String timing) async {
    if (!mounted) return;
    setState(() {
      _checklist = null;
      _error = null;
    });
    try {
      final updated = await _service().getTodayChecklist(timing);
      if (!mounted) return;
      setState(() => _checklist = updated);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = AppLocalizations.of(context)!.medicineReminderErrLoad;
      });
    }
  }

  Future<void> _handleCheck(ReminderItem item, bool checked) async {
    if (_checklist == null) return;
    try {
      final updated = await _service().updateIntakeCheck(
        prescriptionItemId: item.prescriptionItemId,
        timing: _timings[_tabController.index],
        intakeDate: _checklist!.date,
        checked: checked,
      );
      if (!mounted) return;
      setState(() => _checklist = updated);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context)!.medicineReminderErrCheck),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }
  }

  Future<void> _handleComplete() async {
    try {
      final updated =
          await _service().completeTiming(_timings[_tabController.index]);
      if (!mounted) return;
      setState(() => _checklist = updated);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content:
              Text(AppLocalizations.of(context)!.medicineReminderErrComplete),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }
  }

  Future<void> _handleSaveSettings() async {
    if (_draftSettings == null) return;
    setState(() => _savingSettings = true);
    try {
      final updated = await _service().updateSettings(_draftSettings!);
      if (!mounted) return;
      setState(() {
        _settings = updated;
        _draftSettings = updated;
      });
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              AppLocalizations.of(context)!.medicineReminderSettingsSaved),
          backgroundColor: Theme.of(context).colorScheme.primary,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content:
              Text(AppLocalizations.of(context)!.medicineReminderErrSettings),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _savingSettings = false);
    }
  }

  /// Lấy giờ nhắc cho một buổi từ settings
  String _timeForTiming(String timing) {
    if (_settings == null) return '--:--';
    switch (timing) {
      case 'MORNING':
        return _settings!.morningTime;
      case 'AFTERNOON':
        return _settings!.afternoonTime;
      case 'EVENING':
        return _settings!.eveningTime;
      default:
        return '--:--';
    }
  }

  String _timingLabel(String timing, AppLocalizations l10n) {
    switch (timing) {
      case 'MORNING':
        return l10n.medicineReminderMorning;
      case 'AFTERNOON':
        return l10n.medicineReminderAfternoon;
      case 'EVENING':
        return l10n.medicineReminderEvening;
      default:
        return timing;
    }
  }

  IconData _timingIcon(String timing) {
    switch (timing) {
      case 'MORNING':
        return Icons.wb_sunny_outlined;
      case 'AFTERNOON':
        return Icons.wb_cloudy_outlined;
      case 'EVENING':
        return Icons.nights_stay_outlined;
      default:
        return Icons.schedule;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colors = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.medicineReminderTitle),
        centerTitle: false,
        actions: [
          // Nút cài đặt giờ nhắc
          IconButton(
            tooltip: l10n.medicineReminderSettings,
            icon: const Icon(Icons.settings_outlined),
            onPressed: _settings == null ? null : _openSettingsSheet,
          ),
          // Badge ON/OFF thông báo
          if (_settings != null)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Chip(
                label: Text(
                  _settings!.enabled
                      ? l10n.medicineReminderNotificationsOn
                      : l10n.medicineReminderNotificationsOff,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: _settings!.enabled
                        ? colors.onPrimary
                        : colors.onSurfaceVariant,
                  ),
                ),
                backgroundColor: _settings!.enabled
                    ? colors.primary
                    : colors.surfaceContainerHighest,
                padding: EdgeInsets.zero,
                visualDensity: VisualDensity.compact,
              ),
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: _timings.map((timing) {
            return Tab(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _timingLabel(timing, l10n),
                    style: const TextStyle(fontSize: 13),
                  ),
                  Text(
                    _timeForTiming(timing),
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ),
      body: _loadingData
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: _timings
                  .map((_) => _buildChecklistPanel(l10n, colors))
                  .toList(),
            ),
    );
  }

  // ─── Checklist Panel ──────────────────────────────────────────────────────

  Widget _buildChecklistPanel(AppLocalizations l10n, ColorScheme colors) {
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          if (_error != null)
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: colors.errorContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_error!,
                    style: TextStyle(color: colors.onErrorContainer)),
              ),
            ),
          if (_checklist == null && _error == null)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_checklist != null) ...[
            // Header: Tên buổi + progress
            SliverToBoxAdapter(
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    Icon(_timingIcon(_timings[_tabController.index]),
                        color: colors.primary),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.medicineReminderToday,
                            style: TextStyle(
                              fontSize: 11,
                              color: colors.outline,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            l10n.medicineReminderMedicines(
                                _timingLabel(
                                    _timings[_tabController.index], l10n)),
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: colors.onSurface,
                            ),
                          ),
                          Text(
                            _timeForTiming(_timings[_tabController.index]),
                            style: TextStyle(
                              fontSize: 12,
                              color: colors.outline,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Progress badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _checklist!.complete
                            ? colors.primaryContainer
                            : colors.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        l10n.medicineReminderProgress(
                          _checklist!.checkedCount,
                          _checklist!.totalCount,
                        ),
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: _checklist!.complete
                              ? colors.onPrimaryContainer
                              : colors.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(
                child: Divider(height: 1, indent: 16, endIndent: 16)),

            // Danh sách thuốc
            if (_checklist!.totalCount == 0)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(40),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.medication_outlined,
                            size: 56, color: colors.outline),
                        const SizedBox(height: 12),
                        Text(
                          l10n.medicineReminderNoMedicines,
                          style: TextStyle(
                            color: colors.onSurfaceVariant,
                            fontSize: 14,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else ...[
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final group = _checklist!.prescriptions[index];
                    return _buildPrescriptionGroup(group, l10n, colors);
                  },
                  childCount: _checklist!.prescriptions.length,
                ),
              ),
              // Nút "Đánh dấu đã uống tất cả" hoặc thông báo hoàn thành
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                  child: _checklist!.complete
                      ? Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: colors.primaryContainer,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.check_circle_outline,
                                  color: colors.onPrimaryContainer),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  l10n.medicineReminderAllTaken(_timingLabel(
                                      _timings[_tabController.index], l10n)),
                                  style: TextStyle(
                                      color: colors.onPrimaryContainer,
                                      fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                        )
                      : SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: colors.primary,
                              foregroundColor: colors.onPrimary,
                              padding:
                                  const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            onPressed: _handleComplete,
                            icon: const Icon(Icons.done_all),
                            label: Text(l10n.medicineReminderMarkAllTaken),
                          ),
                        ),
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildPrescriptionGroup(
    ReminderPrescriptionGroup group,
    AppLocalizations l10n,
    ColorScheme colors,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header nhóm đơn thuốc
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              children: [
                Icon(Icons.receipt_long_outlined,
                    size: 16, color: colors.primary),
                const SizedBox(width: 6),
                Text(
                  'Đơn thuốc #${group.prescriptionHeaderId}',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: colors.primary,
                    fontSize: 13,
                  ),
                ),
                if (group.doctorName != null) ...[
                  const SizedBox(width: 8),
                  Text(
                    '· ${group.doctorName}',
                    style: TextStyle(
                      color: colors.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                ],
              ],
            ),
          ),
          // Danh sách thuốc trong đơn
          ...group.items.map((item) => _buildMedicineCheckRow(item, colors)),
          const SizedBox(height: 4),
        ],
      ),
    );
  }

  Widget _buildMedicineCheckRow(ReminderItem item, ColorScheme colors) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () => _handleCheck(item, !item.checked),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Checkbox(
              value: item.checked,
              onChanged: (val) => _handleCheck(item, val ?? false),
              shape:
                  RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
              activeColor: colors.primary,
            ),
            const SizedBox(width: 4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.medicationName,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: item.checked
                          ? colors.onSurfaceVariant
                          : colors.onSurface,
                      decoration:
                          item.checked ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  if (item.subtitle.isNotEmpty)
                    Text(
                      item.subtitle,
                      style: TextStyle(
                        fontSize: 12,
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Settings Bottom Sheet ────────────────────────────────────────────────

  void _openSettingsSheet() {
    if (_draftSettings == null) return;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        return _SettingsSheet(
          initial: _draftSettings!,
          saving: _savingSettings,
          onSave: (updated) {
            setState(() => _draftSettings = updated);
            _handleSaveSettings();
          },
        );
      },
    );
  }
}

// ─── Settings Bottom Sheet Widget ─────────────────────────────────────────────

class _SettingsSheet extends StatefulWidget {
  final MedicineReminderSettings initial;
  final bool saving;
  final void Function(MedicineReminderSettings updated) onSave;

  const _SettingsSheet({
    required this.initial,
    required this.saving,
    required this.onSave,
  });

  @override
  State<_SettingsSheet> createState() => _SettingsSheetState();
}

class _SettingsSheetState extends State<_SettingsSheet> {
  late MedicineReminderSettings _draft;

  @override
  void initState() {
    super.initState();
    _draft = widget.initial;
  }

  /// Chuyển chuỗi "HH:mm" sang TimeOfDay
  TimeOfDay _parseTime(String t) {
    final parts = t.split(':');
    return TimeOfDay(
      hour: int.tryParse(parts[0]) ?? 0,
      minute: int.tryParse(parts.length > 1 ? parts[1] : '0') ?? 0,
    );
  }

  /// Chuyển TimeOfDay về chuỗi "HH:mm"
  String _formatTime(TimeOfDay t) {
    final h = t.hour.toString().padLeft(2, '0');
    final m = t.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  Future<void> _pickTime(String field) async {
    final current = _parseTime(switch (field) {
      'morning' => _draft.morningTime,
      'afternoon' => _draft.afternoonTime,
      _ => _draft.eveningTime,
    });
    final picked = await showTimePicker(
      context: context,
      initialTime: current,
    );
    if (picked == null || !mounted) return;
    final formatted = _formatTime(picked);
    setState(() {
      _draft = switch (field) {
        'morning' => _draft.copyWith(morningTime: formatted),
        'afternoon' => _draft.copyWith(afternoonTime: formatted),
        _ => _draft.copyWith(eveningTime: formatted),
      };
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colors = Theme.of(context).colorScheme;

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: colors.outlineVariant,
                borderRadius: BorderRadius.circular(99),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            l10n.medicineReminderSettings,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: colors.onSurface,
            ),
          ),
          const SizedBox(height: 20),

          // Giờ sáng
          _buildTimePicker(
            label: l10n.medicineReminderMorning,
            icon: Icons.wb_sunny_outlined,
            value: _draft.morningTime,
            onTap: () => _pickTime('morning'),
            colors: colors,
          ),
          const SizedBox(height: 12),

          // Giờ chiều
          _buildTimePicker(
            label: l10n.medicineReminderAfternoon,
            icon: Icons.wb_cloudy_outlined,
            value: _draft.afternoonTime,
            onTap: () => _pickTime('afternoon'),
            colors: colors,
          ),
          const SizedBox(height: 12),

          // Giờ tối
          _buildTimePicker(
            label: l10n.medicineReminderEvening,
            icon: Icons.nights_stay_outlined,
            value: _draft.eveningTime,
            onTap: () => _pickTime('evening'),
            colors: colors,
          ),
          const SizedBox(height: 16),

          // Toggle bật thông báo
          Container(
            decoration: BoxDecoration(
              color: colors.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(10),
            ),
            child: SwitchListTile(
              title: Text(l10n.medicineReminderEnableNotifications),
              value: _draft.enabled,
              onChanged: (val) => setState(() {
                _draft = _draft.copyWith(enabled: val);
              }),
              activeTrackColor: colors.primary,
            ),
          ),
          const SizedBox(height: 20),

          // Nút lưu
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: colors.primary,
                foregroundColor: colors.onPrimary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              onPressed: widget.saving ? null : () => widget.onSave(_draft),
              child: widget.saving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(l10n.medicineReminderSaveSettings),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimePicker({
    required String label,
    required IconData icon,
    required String value,
    required VoidCallback onTap,
    required ColorScheme colors,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          border: Border.all(color: colors.outlineVariant),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: colors.primary),
            const SizedBox(width: 12),
            Text(label,
                style: TextStyle(color: colors.onSurface, fontSize: 14)),
            const Spacer(),
            Text(
              value,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 15,
                color: colors.primary,
              ),
            ),
            const SizedBox(width: 6),
            Icon(Icons.access_time_outlined,
                size: 18, color: colors.onSurfaceVariant),
          ],
        ),
      ),
    );
  }
}
