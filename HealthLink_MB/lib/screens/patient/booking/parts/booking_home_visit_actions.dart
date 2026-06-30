part of '../booking_screen.dart';

extension _BookingHomeVisitActions on _BookingScreenState {

  void _setHomeVisitPin(
      double latitude,
      double longitude, {
        bool moveMap = false,
      }) {
    setState(() {
      _homeVisitDraft = _homeVisitDraft.copyWith(
        visitLatitude: latitude,
        visitLongitude: longitude,
        doctorOptions: const [],
        clearSelectedDoctor: true,
        availableSlots: const [],
        clearSelectedSlot: true,
        clearSessionDraftId: true,
      );
    });

    if (moveMap) {
      _homeVisitMapController.move(LatLng(latitude, longitude), 16);
    }
  }

  Future<void> _searchHomeVisitDoctors() async {
    if (_homeVisitService == null || !_homeVisitDraft.hasLocation) return;

    setState(() => _loadingHomeVisitDoctors = true);

    try {
      final doctors = await _homeVisitService!.searchDoctors(
        visitLatitude: _homeVisitDraft.visitLatitude!,
        visitLongitude: _homeVisitDraft.visitLongitude!,
        specialtyName: _selectedSpecialty,
      );

      if (!mounted) return;
      setState(() {
        _homeVisitDraft = _homeVisitDraft.copyWith(
          doctorOptions: doctors,
          clearSelectedDoctor: true,
          availableSlots: const [],
          clearSelectedSlot: true,
          clearSessionDraftId: true,
        );
      });

      if (doctors.isEmpty) {
        _snack('No HomeVisit doctors available at this location.', error: true);
      }
    } catch (e) {
      print('_searchHomeVisitDoctors error: ${e.runtimeType}: $e');
      _snack(_cleanError(e), error: true);
    } finally {
      if (mounted) setState(() => _loadingHomeVisitDoctors = false);
    }
  }

  Future<void> _loadHomeVisitServices() async {
    if (_homeVisitService == null ||
        _homeVisitDraft.availableServices.isNotEmpty)
      return;

    setState(() => _loadingHomeVisitServices = true);

    try {
      final services = await _homeVisitService!.getServices();
      if (!mounted) return;
      setState(() {
        _homeVisitDraft = _homeVisitDraft.copyWith(availableServices: services);
      });
    } catch (e) {
      _snack(_cleanError(e), error: true);
    } finally {
      if (mounted) setState(() => _loadingHomeVisitServices = false);
    }
  }

  Future<void> _loadHomeVisitSlots() async {
    final doctor = _homeVisitDraft.selectedDoctor;
    if (_homeVisitService == null ||
        doctor == null ||
        !_homeVisitDraft.hasLocation)
      return;

    setState(() => _loadingHomeVisitSlots = true);

    try {
      final slots = await _homeVisitService!.getSlots(
        doctorId: doctor.doctorId,
        visitLatitude: _homeVisitDraft.visitLatitude!,
        visitLongitude: _homeVisitDraft.visitLongitude!,
        homeVisitServiceIds: _homeVisitDraft.selectedServiceIds,
      );

      if (!mounted) return;
      setState(() {
        final firstSlotDates = slots
            .map((slot) => DateTime.tryParse(slot.bookingDate))
            .whereType<DateTime>()
            .map(_dayStart)
            .toList()
          ..sort();

        final initialDate = firstSlotDates.isNotEmpty
            ? firstSlotDates.first
            : DateTime.now();

        _selectedDate = initialDate;
        _weekIndex = _weekIndexForDate(initialDate);

        _homeVisitDraft = _homeVisitDraft.copyWith(
          availableSlots: slots,
          clearSelectedSlot: true,
          clearSessionDraftId: true,
        );
      });

      if (slots.isEmpty) {
        _snack('Doctor has no suitable HomeVisit sessions.', error: true);
      }
    } catch (e) {
      _snack(_cleanError(e), error: true);
    } finally {
      if (mounted) setState(() => _loadingHomeVisitSlots = false);
    }
  }

  Future<void> _selectHomeVisitSessionDraft() async {
    final doctor = _homeVisitDraft.selectedDoctor;
    final slot = _homeVisitDraft.selectedSlot;
    if (_homeVisitService == null || doctor == null || slot == null) return;

    setState(() => _selectingHomeVisitSession = true);

    try {
      final draftId = await _homeVisitService!.selectSession(
        doctorId: doctor.doctorId,
        scheduleId: slot.scheduleId,
        bookingDate: slot.bookingDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        homeVisitServiceIds: _homeVisitDraft.selectedServiceIds,
        visitAddress: _homeVisitDraft.visitAddress,
        visitLatitude: _homeVisitDraft.visitLatitude!,
        visitLongitude: _homeVisitDraft.visitLongitude!,
        contactPhone: _homeVisitDraft.contactPhone,
        reasonForHomeVisit: _homeVisitDraft.reasonForHomeVisit,
        specialNotes: _homeVisitDraft.specialNotes,
      );

      if (!mounted) return;
      setState(() {
        _homeVisitDraft = _homeVisitDraft.copyWith(sessionDraftId: draftId);
      });
    } catch (e) {
      _snack(_cleanError(e), error: true);
    } finally {
      if (mounted) setState(() => _selectingHomeVisitSession = false);
    }
  }

  Future<void> _useCurrentHomeVisitLocation() async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _snack('Cannot access location.', error: true);
        return;
      }

      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      _setHomeVisitPin(pos.latitude, pos.longitude);

      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;

        _homeVisitMapController.move(LatLng(pos.latitude, pos.longitude), 16);
      });

      _snack('Current location retrieved.');
    } catch (e) {
      _snack(_cleanError(e), error: true);
    }
  }

  String _homeVisitAppointmentTime() {
    final slot = _homeVisitDraft.selectedSlot!;
    final time = slot.startTime.length == 5
        ? '${slot.startTime}:00'
        : slot.startTime.split('.').first;
    return '${slot.bookingDate}T$time';
  }

}