part of '../booking_screen.dart';

extension _BookingHomeVisitSteps on _BookingScreenState {
  Widget _homeVisitMapPicker(ColorScheme colors) {
    final selectedPoint = _homeVisitSelectedPoint;
    final hasPinnedLocation = _homeVisitDraft.hasLocation;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: Container(
            height: 280,
            decoration: BoxDecoration(
              border: Border.all(color: colors.outlineVariant),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _homeVisitMapController,
                  options: MapOptions(
                    initialCenter: selectedPoint,
                    initialZoom: hasPinnedLocation ? 16 : 3,
                    minZoom: 2,
                    maxZoom: 18,
                    onTap: (tapPosition, point) {
                      _setHomeVisitPin(point.latitude, point.longitude);
                    },
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'fpt.HealthLink.mobile',
                    ),

                    if (hasPinnedLocation)
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: selectedPoint,
                            width: 44,
                            height: 44,
                            child: Icon(
                              Icons.location_pin,
                              color: colors.error,
                              size: 42,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),

                Positioned(
                  right: 12,
                  top: 12,
                  child: Column(
                    children: [
                      _mapZoomButton(
                        icon: Icons.add,
                        onTap: () {
                          final camera = _homeVisitMapController.camera;
                          _homeVisitMapController.move(
                            camera.center,
                            camera.zoom + 1,
                          );
                        },
                      ),
                      const SizedBox(height: 8),
                      _mapZoomButton(
                        icon: Icons.remove,
                        onTap: () {
                          final camera = _homeVisitMapController.camera;
                          _homeVisitMapController.move(
                            camera.center,
                            camera.zoom - 1,
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          AppLocalizations.of(context)!.bookingTapMapToPin,
          style: TextStyle(
            color: colors.onSurfaceVariant,
            fontWeight: FontWeight.w600,
          ),
        ),
        if (hasPinnedLocation) ...[
          const SizedBox(height: 6),
          Text(
            'Pinned: ${_homeVisitDraft.visitLatitude!.toStringAsFixed(5)}, '
            '${_homeVisitDraft.visitLongitude!.toStringAsFixed(5)}',
            style: TextStyle(
              color: colors.primary,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ],
    );
  }

  Widget _mapZoomButton({required IconData icon, required VoidCallback onTap}) {
    final colors = Theme.of(context).colorScheme;

    return Material(
      color: colors.surface,
      shape: const CircleBorder(),
      elevation: 2,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 38,
          height: 38,
          child: Icon(icon, size: 20, color: colors.onSurface),
        ),
      ),
    );
  }

  Widget _homeVisitLocationStep(ColorScheme colors) {
    final d = _homeVisitDraft;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _title(
          AppLocalizations.of(context)!.bookingHomeVisitInfo,
          AppLocalizations.of(context)!.bookingHomeVisitInfoDesc,
        ),
        const SizedBox(height: 16),

        SegmentedButton<bool>(
          segments: [
            ButtonSegment(
              value: true,
              label: Text(AppLocalizations.of(context)!.bookingForMe),
              icon: const Icon(Icons.person),
            ),
            ButtonSegment(
              value: false,
              label: Text(AppLocalizations.of(context)!.bookingSomeoneElse),
              icon: const Icon(Icons.group),
            ),
          ],
          selected: {d.isForSelf},
          onSelectionChanged: (value) {
            final isForSelf = value.first;

            setState(() {
              _homeVisitDraft = d.copyWith(isForSelf: isForSelf);
            });

            if (isForSelf) {
              _prefillHomeVisitFromPatientProfile();
            } else {
              setState(() {
                _homeVisitDraft = _homeVisitDraft.copyWith(
                  receiverName: '',
                  receiverAge: '',
                  receiverGender: '',
                  receiverRelationship: '',
                  receiverPhone: '',
                );
              });
            }
          },
        ),

        const SizedBox(height: 14),

        if (!d.isForSelf) ...[
          _textInput(
            AppLocalizations.of(context)!.bookingRecipientName,
            d.receiverName,
            (v) {
              setState(
                () =>
                    _homeVisitDraft = _homeVisitDraft.copyWith(receiverName: v),
              );
            },
            required: true,
          ),
          _textInput(
            AppLocalizations.of(context)!.bookingAge,
            d.receiverAge,
            (v) {
              setState(
                () =>
                    _homeVisitDraft = _homeVisitDraft.copyWith(receiverAge: v),
              );
            },
            keyboardType: TextInputType.number,
            required: true,
          ),
          _textInput(
            AppLocalizations.of(context)!.bookingGender,
            d.receiverGender,
            (v) {
              setState(
                () => _homeVisitDraft = _homeVisitDraft.copyWith(
                  receiverGender: v,
                ),
              );
            },
          ),
          _textInput(
            AppLocalizations.of(context)!.bookingRelationship,
            d.receiverRelationship,
            (v) {
              setState(
                () => _homeVisitDraft = _homeVisitDraft.copyWith(
                  receiverRelationship: v,
                ),
              );
            },
            required: true,
          ),
          _textInput(
            AppLocalizations.of(context)!.bookingRecipientPhone,
            d.receiverPhone,
            (v) {
              setState(
                () => _homeVisitDraft = _homeVisitDraft.copyWith(
                  receiverPhone: v,
                ),
              );
            },
            keyboardType: TextInputType.phone,
          ),
        ],

        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: TextField(
            controller: _visitAddressCtrl,
            onChanged: (v) {
              setState(() {
                _homeVisitDraft = _homeVisitDraft.copyWith(
                  visitAddress: v,
                  doctorOptions: const [],
                  clearSelectedDoctor: true,
                  availableSlots: const [],
                  clearSelectedSlot: true,
                  clearSessionDraftId: true,
                );
              });
            },
            decoration: InputDecoration(
              label: _requiredLabel(
                AppLocalizations.of(context)!.bookingAddressStar,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(18),
              ),
            ),
          ),
        ),
        _textInput(AppLocalizations.of(context)!.bookingCity, d.visitCity, (v) {
          setState(
            () => _homeVisitDraft = _homeVisitDraft.copyWith(visitCity: v),
          );
        }),
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: TextField(
            controller: _contactPhoneCtrl,
            keyboardType: TextInputType.phone,
            onChanged: (v) {
              setState(() {
                _homeVisitDraft = _homeVisitDraft.copyWith(
                  contactPhone: v,
                  doctorOptions: const [],
                  clearSelectedDoctor: true,
                  availableSlots: const [],
                  clearSelectedSlot: true,
                  clearSessionDraftId: true,
                );
              });
            },
            decoration: InputDecoration(
              label: _requiredLabel(
                AppLocalizations.of(context)!.bookingContactPhoneStar,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(18),
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: TextField(
            controller: _reasonCtrl,
            minLines: 3,
            maxLines: 5,
            textInputAction: TextInputAction.newline,
            onChanged: (v) {
              setState(() {
                _homeVisitDraft = _homeVisitDraft.copyWith(
                  reasonForHomeVisit: v,
                  doctorOptions: const [],
                  clearSelectedDoctor: true,
                  availableSlots: const [],
                  clearSelectedSlot: true,
                  clearSessionDraftId: true,
                );
              });
            },
            decoration: InputDecoration(
              label: _requiredLabel(
                AppLocalizations.of(context)!.bookingReasonForHomeVisitStar,
              ),
              alignLabelWithHint: true,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(18),
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: TextField(
            controller: _specialNotesCtrl,
            minLines: 2,
            maxLines: 4,
            textInputAction: TextInputAction.newline,
            onChanged: (v) {
              setState(() {
                _homeVisitDraft = _homeVisitDraft.copyWith(specialNotes: v);
              });
            },
            decoration: InputDecoration(
              labelText: AppLocalizations.of(context)!.bookingNotesOpt,
              alignLabelWithHint: true,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(18),
              ),
            ),
          ),
        ),

        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _useCurrentHomeVisitLocation,
          icon: const Icon(Icons.my_location),
          label: Text(AppLocalizations.of(context)!.bookingUseCurrentLocation),
        ),

        const SizedBox(height: 12),
        _homeVisitMapPicker(colors),
      ],
    );
  }

  Widget _textInput(
    String label,
    String value,
    ValueChanged<String> onChanged, {
    int maxLines = 1,
    TextInputType? keyboardType,
    bool required = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: TextEditingController(text: value)
          ..selection = TextSelection.collapsed(offset: value.length),
        onChanged: onChanged,
        maxLines: maxLines,
        keyboardType: keyboardType,
        decoration: InputDecoration(
          label: required ? _requiredLabel(label) : Text(label),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(18)),
        ),
      ),
    );
  }

  Widget _homeVisitDoctorStep(ColorScheme colors) {
    final doctors = _homeVisitDraft.doctorOptions;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _title(
          AppLocalizations.of(context)!.bookingSelectHomeVisitDoctor,
          AppLocalizations.of(context)!.bookingSelectHomeVisitDoctorDesc,
        ),
        const SizedBox(height: 16),
        if (_loadingHomeVisitDoctors)
          const Center(child: CircularProgressIndicator())
        else if (doctors.isEmpty)
          _empty(
            colors,
            Icons.person_search,
            AppLocalizations.of(context)!.bookingNoSuitableDoctors,
          )
        else
          ...doctors.map((doctor) => _homeVisitDoctorCard(colors, doctor)),
      ],
    );
  }

  Widget _homeVisitDoctorCard(
    ColorScheme colors,
    HomeVisitDoctorOption doctor,
  ) {
    final selected =
        _homeVisitDraft.selectedDoctor?.doctorId == doctor.doctorId;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () {
          setState(() {
            _homeVisitDraft = _homeVisitDraft.copyWith(
              selectedDoctor: doctor,
              availableSlots: const [],
              clearSelectedSlot: true,
              clearSessionDraftId: true,
            );
          });
          _loadHomeVisitServices();
        },
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: selected
                ? colors.primary.withValues(alpha: 0.08)
                : colors.surfaceContainerLow,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: selected ? colors.primary : colors.outlineVariant,
            ),
          ),
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
              const SizedBox(height: 4),
              Text(
                doctor.specialtyName.toLocalizedSpecialty(context),
                style: TextStyle(color: colors.primary),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  _chip(
                    colors,
                    Icons.route,
                    '${doctor.distanceKm.toStringAsFixed(1)} km',
                  ),
                  _chip(
                    colors,
                    Icons.schedule,
                    '${doctor.estimatedTravelMinutes} minutes',
                  ),
                  _chip(
                    colors,
                    Icons.payments,
                    '\$${doctor.temporaryTotal.toStringAsFixed(2)}',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _homeVisitServicesStep(ColorScheme colors) {
    final services = _homeVisitDraft.availableServices;
    final selectedIds = _homeVisitDraft.selectedServiceIds.toSet();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _title(
          AppLocalizations.of(context)!.bookingAdditionalServices,
          AppLocalizations.of(context)!.bookingAdditionalServicesDesc,
        ),
        const SizedBox(height: 16),
        if (_loadingHomeVisitServices)
          const Center(child: CircularProgressIndicator())
        else if (services.isEmpty)
          _empty(
            colors,
            Icons.medical_services_outlined,
            AppLocalizations.of(context)!.bookingNoAdditionalServices,
          )
        else
          ...services.map((service) {
            final selected = selectedIds.contains(service.serviceId);
            return CheckboxListTile(
              value: selected,
              title: Text(
                service.serviceName.toLocalizedServiceName(context),
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              subtitle: Text(
                service.description.toLocalizedServiceDescription(context),
              ),
              secondary: Text('\$${service.price.toStringAsFixed(2)}'),
              onChanged: (_) {
                final next = [..._homeVisitDraft.selectedServices];
                if (selected) {
                  next.removeWhere(
                    (item) => item.serviceId == service.serviceId,
                  );
                } else {
                  next.add(service);
                }

                setState(() {
                  _homeVisitDraft = _homeVisitDraft.copyWith(
                    selectedServices: next,
                    availableSlots: const [],
                    clearSelectedSlot: true,
                    clearSessionDraftId: true,
                  );
                });
              },
            );
          }),
        const SizedBox(height: 8),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingTotalServices,
          '\$${_homeVisitDraft.servicesTotal.toStringAsFixed(2)}',
        ),
      ],
    );
  }

  Widget _homeVisitSessionStep(ColorScheme colors) {
    final days = _homeVisitAvailableDays();
    final slotsForDay = _homeVisitSlotsForSelectedDate();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _title(
          AppLocalizations.of(context)!.bookingSelectHomeVisitSession,
          AppLocalizations.of(context)!.bookingSelectHomeVisitSessionDesc,
        ),
        const SizedBox(height: 16),

        if (_loadingHomeVisitSlots || _selectingHomeVisitSession)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: CircularProgressIndicator(),
            ),
          )
        else if (_homeVisitDraft.availableSlots.isEmpty)
          _empty(
            colors,
            Icons.event_busy_outlined,
            AppLocalizations.of(context)!.bookingNoSuitableSessions,
          )
        else ...[

          const SizedBox(height: 14),

          if (days.isEmpty)
            _empty(
              colors,
              Icons.event_busy_outlined,
              AppLocalizations.of(context)!.bookingNoDoctorScheduleThisWeek,
            )
          else
            SizedBox(
              height: 104,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: days.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (_, index) {
                  final day = days[index];
                  final selected = _sameDay(day, _selectedDate);

                  final slotCount = _homeVisitDraft.availableSlots
                      .where((slot) => slot.bookingDate == _formatDate(day))
                      .length;

                  return InkWell(
                    borderRadius: BorderRadius.circular(18),
                    onTap: () {
                      setState(() {
                        _selectedDate = day;
                        _homeVisitDraft = _homeVisitDraft.copyWith(
                          clearSelectedSlot: true,
                          clearSessionDraftId: true,
                        );
                      });
                    },
                    child: Container(
                      width: 112,
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
                              color: selected ? colors.onPrimary : colors.onSurface,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _homeVisitMonthDayLabel(day),
                            style: TextStyle(
                              color: selected ? colors.onPrimary : colors.onSurfaceVariant,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$slotCount slots',
                            style: TextStyle(
                              color: selected ? colors.onPrimary : colors.onSurfaceVariant,
                              fontSize: 11,
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
            'Available Home Visit Sessions',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
          ),

          const SizedBox(height: 12),

          if (slotsForDay.isEmpty)
            _empty(
              colors,
              Icons.event_busy_outlined,
              AppLocalizations.of(context)!.bookingNoSlotsOnThisDay,
            )
          else
            Column(
              children: slotsForDay
                  .map(
                    (slot) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _homeVisitSlotButton(colors, slot),
                    ),
                  )
                  .toList(),
            ),
        ],
      ],
    );
  }

  List<DateTime> _homeVisitAvailableDaysForWeek(DateTime weekStart) {
    final today = _dayStart(DateTime.now());
    final maxDate = today.add(Duration(days: _bookingWindowDays));

    final uniqueDates =
        _homeVisitDraft.availableSlots
            .map((slot) => DateTime.tryParse(slot.bookingDate))
            .whereType<DateTime>()
            .map(_dayStart)
            .where((date) => !date.isBefore(today))
            .where((date) => !date.isAfter(maxDate))
            .toSet()
            .toList()
          ..sort();

    final weekEnd = weekStart.add(const Duration(days: 6));

    return uniqueDates.where((date) {
      return !date.isBefore(weekStart) && !date.isAfter(weekEnd);
    }).toList();
  }

  List<DateTime> _homeVisitAvailableDays() {
    final today = _dayStart(DateTime.now());
    final maxDate = today.add(Duration(days: _bookingWindowDays));

    final uniqueDates =
    _homeVisitDraft.availableSlots
        .map((slot) => DateTime.tryParse(slot.bookingDate))
        .whereType<DateTime>()
        .map(_dayStart)
        .where((date) => !date.isBefore(today))
        .where((date) => !date.isAfter(maxDate))
        .toSet()
        .toList()
      ..sort();

    return uniqueDates;
  }

  List<HomeVisitSessionSlot> _homeVisitSlotsForSelectedDate() {
    final selectedDateText = _formatDate(_selectedDate);

    return _homeVisitDraft.availableSlots
        .where((slot) => slot.bookingDate == selectedDateText)
        .toList();
  }

  String _homeVisitMonthDayLabel(DateTime date) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    final month = months[date.month - 1];
    final day = date.day.toString().padLeft(2, '0');

    return '$month $day';
  }

  Widget _homeVisitConfirmStep(ColorScheme colors) {
    final d = _homeVisitDraft;
    final doctor = d.selectedDoctor;
    final slot = d.selectedSlot;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _title(
          AppLocalizations.of(context)!.bookingConfirmHomeVisit,
          AppLocalizations.of(context)!.bookingConfirmHomeVisitDesc,
        ),
        const SizedBox(height: 16),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingLabelDoctor,
          doctor?.fullName ?? '-',
        ),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingLabelSpecialty,
          doctor?.specialtyName.toLocalizedSpecialty(context) ??
              (_selectedSpecialty ?? '-'),
        ),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingAddressStar.replaceAll(' *', ''),
          d.visitAddress,
        ),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingRecipient,
          d.isForSelf
              ? AppLocalizations.of(context)!.bookingForMe
              : d.receiverName,
        ),
        _summary(
          colors,
          AppLocalizations.of(
            context,
          )!.bookingContactPhoneStar.replaceAll(' *', ''),
          d.contactPhone,
        ),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingReasonForVisit,
          d.reasonForHomeVisit,
        ),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingLabelDate,
          slot?.bookingDate ?? '-',
        ),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingLabelTime,
          slot == null
              ? '-'
              : '${_shortTime(slot.startTime)} - ${_shortTime(slot.endTime)}',
        ),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingDoctorFee,
          '\$${d.doctorFee.toStringAsFixed(2)}',
        ),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingHomeVisitFee,
          '\$${d.homeVisitFee.toStringAsFixed(2)}',
        ),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingAdditionalServices,
          '\$${d.servicesTotal.toStringAsFixed(2)}',
        ),
        _summary(
          colors,
          AppLocalizations.of(context)!.bookingTotalAmount,
          '\$${d.grandTotal.toStringAsFixed(2)}',
        ),
      ],
    );
  }

  Widget _homeVisitPaymentStep(ColorScheme colors) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _title(
          'Home Visit Payment',
          'Complete payment to confirm home visit appointment.',
        ),
        const SizedBox(height: 16),
        _summary(
          colors,
          'Total Amount',
          '\$${_homeVisitDraft.grandTotal.toStringAsFixed(2)}',
        ),
        _note(colors, AppLocalizations.of(context)!.bookingPaymentNote2),
      ],
    );
  }

  Widget _homeVisitSlotButton(ColorScheme colors, HomeVisitSessionSlot slot) {
    final selected =
        _homeVisitDraft.selectedSlot?.scheduleId == slot.scheduleId &&
        _homeVisitDraft.selectedSlot?.bookingDate == slot.bookingDate &&
        _homeVisitDraft.selectedSlot?.startTime == slot.startTime &&
        _homeVisitDraft.selectedSlot?.endTime == slot.endTime;

    final travelRoundTrip = slot.estimatedTravelMinutes * 2;

    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () {
        final slotDate = DateTime.tryParse(slot.bookingDate);

        setState(() {
          if (slotDate != null) {
            _selectedDate = _dayStart(slotDate);
          }

          _homeVisitDraft = _homeVisitDraft.copyWith(
            selectedSlot: slot,
            clearSessionDraftId: true,
          );
        });
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected
              ? colors.primaryContainer
              : colors.surfaceContainerLow,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: selected ? colors.primary : colors.outlineVariant,
            width: selected ? 1.8 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${_shortTime(slot.startTime)} - ${_shortTime(slot.endTime)}',
              style: TextStyle(
                color: selected ? colors.onPrimaryContainer : colors.onSurface,
                fontWeight: FontWeight.w900,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '${slot.totalBlockMinutes} min total',
              style: TextStyle(
                color: selected ? colors.primary : colors.onSurfaceVariant,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Travel round trip ${travelRoundTrip}m · '
              'Visit ${slot.visitDurationMinutes}m · '
              'Services ${slot.servicesDurationMinutes}m · '
              'Total block ${slot.totalBlockMinutes}m',
              style: TextStyle(
                color: selected
                    ? colors.onPrimaryContainer
                    : colors.onSurfaceVariant,
                height: 1.35,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
