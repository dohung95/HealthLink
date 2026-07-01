part of '../booking_screen.dart';

extension _BookingActions on _BookingScreenState {
  Future<void> _loadInitialData() async {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated || auth.accessToken == null) {
      setState(() => _loading = false);
      return;
    }

    _service = BookingService(accessToken: auth.accessToken!);
    _homeVisitService = HomeVisitService(accessToken: auth.accessToken!);

    try {
      if (auth.patientProfile == null) {
        await auth.fetchProfile();
      }

      final specialties = await _service!.getSpecialties();
      if (!mounted) return;
      setState(() {
        _specialties = specialties;
      });

      if (widget.initialDoctorId != null) {
        // If coming from Doctor Profile, fetch that doctor specifically
        final doctor = await _service!.getDoctorById(widget.initialDoctorId!);
        final schedules = await _service!.getDoctorSchedules(
          widget.initialDoctorId!,
        );

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
          // await _loadDoctors(reset: true);
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
    } finally {
      if (mounted && _selectedSlot?.holdId == holdId) {
        setState(() {
          _selectedSlot = _selectedSlot?.copyWith(clearHold: true);
        });
      }
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

    final key = _currentStepKey;

    if (key == BookingStepKey.doctor) {
      await _loadSlots();
    }

    if (key == BookingStepKey.homeVisitLocation) {
      await _searchHomeVisitDoctors();
      if (_homeVisitDraft.doctorOptions.isEmpty) return;
    }

    if (key == BookingStepKey.homeVisitServices) {
      await _loadHomeVisitSlots();
      if (_homeVisitDraft.availableSlots.isEmpty) return;
    }

    if (key == BookingStepKey.homeVisitSession) {
      await _selectHomeVisitSessionDraft();
      if ((_homeVisitDraft.sessionDraftId ?? '').isEmpty) return;
    }

    if (!mounted) return;
    setState(() {
      _step = (_step + 1).clamp(0, _getSteps(context).length - 1).toInt();
    });
  }

  Future<void> _back() async {
    if (_step == 0) return;

    final shouldReleaseNormalHold =
        !_isHomeVisit &&
        _selectedSlot != null &&
        (_currentStepKey == BookingStepKey.dateTime ||
            _currentStepKey == BookingStepKey.medicalInfo);

    if (shouldReleaseNormalHold) {
      final start = _selectedSlot!.startTime;
      await _releaseHoldSilently();
      if (mounted) _markSlotAvailable(start);
    }

    if (!mounted) return;
    setState(() {
      _step = (_step - 1).clamp(0, _getSteps(context).length - 1).toInt();
    });
  }

  bool _validateCurrentStep() {
    switch (_currentStepKey) {
      case BookingStepKey.specialty:
        if (_selectedSpecialty == null) {
          return _warn(AppLocalizations.of(context)!.bookingErrSelectSpecialty);
        }
        return true;

      case BookingStepKey.visitType:
        if (_consultationType == null) {
          return _warn('Please select examination type.');
        }
        return true;

      case BookingStepKey.doctor:
        if (_selectedDoctor == null) {
          return _warn(AppLocalizations.of(context)!.bookingErrSelectDoctor);
        }
        if (_doctorSchedules.isEmpty) {
          return _warn(AppLocalizations.of(context)!.bookingNoSchedule);
        }
        return true;

      case BookingStepKey.dateTime:
        if (_selectedSlot == null) {
          return _warn(AppLocalizations.of(context)!.bookingErrSelectSlot);
        }
        return true;

      case BookingStepKey.medicalInfo:
        if (_symptomsCtrl.text.trim().isEmpty) {
          return _warn(AppLocalizations.of(context)!.bookingErrMissingSymptoms);
        }
        if (_documents.any((item) => item.documentDate == null)) {
          return _warn(AppLocalizations.of(context)!.bookingErrMissingDocDate);
        }
        return true;

      case BookingStepKey.homeVisitLocation:
        final d = _homeVisitDraft;
        if (d.visitAddress.trim().isEmpty)
          return _warn('Please enter home visit address.');
        if (d.contactPhone.trim().isEmpty)
          return _warn('Please enter contact phone number.');
        if (d.reasonForHomeVisit.trim().isEmpty)
          return _warn('Please enter reason for home visit.');
        if (!d.hasLocation)
          return _warn('Please confirm examination location.');
        if (!d.isForSelf) {
          if (d.receiverName.trim().isEmpty)
            return _warn('Please enter recipient name.');
          if (d.receiverRelationship.trim().isEmpty)
            return _warn('Please enter relationship with patient.');
          final age = int.tryParse(d.receiverAge);
          if (age == null || age <= 0)
            return _warn('Recipient age is invalid.');
        }
        return true;

      case BookingStepKey.homeVisitDoctor:
        if (_homeVisitDraft.selectedDoctor == null) {
          return _warn('Please select home visit doctor.');
        }
        return true;

      case BookingStepKey.homeVisitServices:
        return true;

      case BookingStepKey.homeVisitSession:
        if (_homeVisitDraft.selectedSlot == null) {
          return _warn('Please select home visit session.');
        }
        return true;

      case BookingStepKey.confirm:
      case BookingStepKey.payment:
        return true;
    }
  }

  bool _warn(String message) {
    _snack(message);
    return false;
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
      _consultationType = null;
      _homeVisitDraft = const HomeVisitBookingDraft();
    });
    _loadDoctors(reset: true);
  }
}
