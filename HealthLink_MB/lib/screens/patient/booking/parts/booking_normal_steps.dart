part of '../booking_screen.dart';

extension _BookingNormalSteps on _BookingScreenState {
  Widget _visitTypeStep(ColorScheme colors) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _title(
          'Select Examination Type',
          'Choose how you want to consult with a doctor.',
        ),
        const SizedBox(height: 16),
        _visitTypeCard(
          colors,
          'Online',
          Icons.video_call_outlined,
          'Online Consultation',
        ),
        _visitTypeCard(
          colors,
          'HomeVisit',
          Icons.home_work_outlined,
          'Doctor Visits Home',
        ),
      ],
    );
  }

  Widget _doctorOptionStep(ColorScheme colors) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _title(
          'Choose Doctor Option',
          'Let the system choose a suitable doctor, or select one manually with an extra fee.',
        ),
        const SizedBox(height: 16),

        _doctorOptionCard(
          colors,
          mode: 'AUTO_ASSIGNED',
          icon: Icons.auto_awesome,
          title: 'System chooses doctor',
          subtitle: _recommendedDoctor == null
              ? 'The fastest way to book. Instantly assigned to a qualified specialist on duty.'
              : 'Recommended: Dr. ${_recommendedDoctor!.doctorName}',
        ),

        _doctorOptionCard(
          colors,
          mode: 'MANUAL_SELECTED',
          icon: Icons.person_search,
          title: 'I choose doctor myself',
          subtitle:
              'Browse doctors and choose manually. Extra fee: \$${_manualSelectionFee.toStringAsFixed(2)}',
        ),

        if (_loadingRecommendedDoctor)
          const Padding(
            padding: EdgeInsets.only(top: 12),
            child: LinearProgressIndicator(),
          ),
      ],
    );
  }

  Widget _doctorOptionCard(
    ColorScheme colors, {
    required String mode,
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    final selected = _doctorSelectionMode == mode;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () async {
          await _releaseHoldSilently();

          setState(() {
            _doctorSelectionMode = mode;
            _selectedDoctor = null;
            _selectedDate = DateTime.now();
            _selectedSlot = null;
            _slots = [];
            _doctorSchedules = [];
            _weekIndex = 0;
          });

          if (mode == 'AUTO_ASSIGNED') {
            await _loadRecommendedDoctor();
          } else {
            setState(() {
              _recommendedDoctor = null;
            });

            await _loadManualSelectionFee();
            await _loadDoctors(reset: true);
          }
        },
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: selected
                ? colors.primary.withValues(alpha: 0.08)
                : colors.surfaceContainerLow,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: selected ? colors.primary : colors.outlineVariant,
              width: selected ? 1.8 : 1,
            ),
          ),
          child: Row(
            children: [
              Icon(icon, color: selected ? colors.primary : colors.outline),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(color: colors.onSurfaceVariant),
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

  Widget _visitTypeCard(
    ColorScheme colors,
    String type,
    IconData icon,
    String title,
  ) {
    final selected = _consultationType == type;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () async {
          await _releaseHoldSilently();

          setState(() {
            _consultationType = type;
            _selectedDoctor = null;
            _selectedDate = DateTime.now();
            _selectedSlot = null;
            _slots = [];
            _doctorSelectionMode = '';
            _recommendedDoctor = null;
            _manualSelectionFee = 0;
            _loadingRecommendedDoctor = false;
            _doctorSchedules = [];
            _weekIndex = 0;
            _homeVisitDraft = const HomeVisitBookingDraft();

            _visitAddressCtrl.clear();
            _contactPhoneCtrl.clear();
            _reasonCtrl.clear();
            _specialNotesCtrl.clear();
          });

          if (type == 'HomeVisit') {
            _prefillHomeVisitFromPatientProfile();
          } else {
            await _loadDoctors(reset: true);
          }
        },
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: selected
                ? colors.primary.withValues(alpha: 0.08)
                : colors.surfaceContainerLow,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: selected ? colors.primary : colors.outlineVariant,
            ),
          ),
          child: Row(
            children: [
              Icon(icon, color: selected ? colors.primary : colors.outline),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
              ),
              if (selected) Icon(Icons.check_circle, color: colors.primary),
            ],
          ),
        ),
      ),
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
                _doctorSelectionMode = '';
                _recommendedDoctor = null;
                _manualSelectionFee = 0;
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
            Text(
              AppLocalizations.of(
                context,
              )!.paginationPage('$_doctorPage', '$_totalDoctorPages'),
            ),
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
            final schedules = await _service!.getDoctorSchedules(
              doctor.doctorId,
            );

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
                          AppLocalizations.of(
                            context,
                          )!.labelYearsExp(doctor.yearsOfExperience.toString()),
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

    final days =
        List.generate(7, (index) {
          return weekStart.add(Duration(days: index));
        }).where((day) {
          if (day.isBefore(today)) return false;
          if (day.isAfter(maxDate)) return false;

          final backendDay = day.weekday % 7; // Sunday = 0
          return workingDayNumbers.contains(backendDay);
        }).toList();

    final selectedDateIsVisible = days.any(
          (day) => _sameDay(day, _selectedDate),
    );

    final visibleSlots = selectedDateIsVisible ? _slots : <BookingSlot>[];

    final nextWeekStart = weekStart.add(const Duration(days: 7));
    final canGoPreviousWeek = _weekIndex > 0;
    final canGoNextWeek = !nextWeekStart.isAfter(maxDate);

    final weekLabel = AppLocalizations.of(context)!.labelWeek(
      '${weekStart.day}/${weekStart.month} - ${weekEnd.day}/${weekEnd.month}',
    );

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

                    await _loadSlots(jumpToFirstAvailable: false);
                  },
                  child: Container(
                    width: 96,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: selected
                          ? colors.primary
                          : colors.surfaceContainerHigh,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: selected
                            ? colors.primary
                            : colors.outlineVariant,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _dayLabel(day),
                          style: TextStyle(
                            color: selected
                                ? colors.onPrimary
                                : colors.onSurface,
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
        else if (visibleSlots.isEmpty)
          _empty(
            colors,
            Icons.event_busy_outlined,
            AppLocalizations.of(context)!.bookingNoSlotsOnThisDay,
          )
        else
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: visibleSlots.map((slot) => _slotButton(colors, slot)).toList(),
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
                          ? AppLocalizations.of(
                              context,
                            )!.bookingSelectDatePerformed
                          : _formatDate(item.documentDate!),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ],

      _note(colors, AppLocalizations.of(context)!.bookingUploadDocNote),
    ],
  );

  Widget _confirmStep(ColorScheme colors) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _title(
        AppLocalizations.of(context)!.bookingConfirmTitle,
        AppLocalizations.of(context)!.bookingConfirmDesc,
      ),
      const SizedBox(height: 16),
      _summary(
        colors,
        AppLocalizations.of(context)!.bookingLabelDoctor,
        _selectedDoctor?.fullName ?? '-',
      ),
      _summary(
        colors,
        AppLocalizations.of(context)!.bookingLabelSpecialty,
        _selectedDoctor != null
            ? _selectedDoctor!.specialtyName.toLocalizedSpecialty(context)
            : (_selectedSpecialty?.toLocalizedSpecialty(context) ?? '-'),
      ),
      _summary(
        colors,
        AppLocalizations.of(context)!.bookingLabelDate,
        _friendlyDate(_selectedDate),
      ),
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
      _summary(
        colors,
        'Doctor selection',
        _doctorSelectionMode == 'MANUAL_SELECTED'
            ? 'Manual selected'
            : 'System recommended',
      ),
      if (_doctorSelectionMode == 'MANUAL_SELECTED')
        _summary(
          colors,
          'Manual selection fee',
          '\$${_manualSelectionFee.toStringAsFixed(2)}',
        ),
      const SizedBox(height: 12),
      _note(colors, AppLocalizations.of(context)!.bookingPaymentNote),
    ],
  );

  Widget _paymentStep(ColorScheme colors) {
    final baseFee = _selectedDoctor?.consultationFee ?? 0;
    final manualFee = _doctorSelectionMode == 'MANUAL_SELECTED'
        ? _manualSelectionFee
        : 0;
    final fee = baseFee + manualFee;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _title(
          AppLocalizations.of(context)!.bookingPaymentTitle,
          AppLocalizations.of(context)!.bookingPaymentDesc,
        ),
        const SizedBox(height: 16),

        _summary(
          colors,
          AppLocalizations.of(context)!.bookingLabelDoctor,
          _selectedDoctor?.fullName ?? '-',
        ),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingLabelSpecialty,
          _selectedDoctor != null
              ? _selectedDoctor!.specialtyName.toLocalizedSpecialty(context)
              : (_selectedSpecialty?.toLocalizedSpecialty(context) ?? '-'),
        ),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingLabelDate,
          _friendlyDate(_selectedDate),
        ),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingLabelTime,
          _selectedSlot == null ? '-' : _shortTime(_selectedSlot!.startTime),
        ),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingLabelTotalAmount,
          '\$${fee.toStringAsFixed(2)}',
        ),

        const SizedBox(height: 12),
        _note(colors, AppLocalizations.of(context)!.bookingPaymentNote2),
      ],
    );
  }
}
