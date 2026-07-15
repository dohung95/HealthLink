part of '../booking_screen.dart';

extension _BookingPaymentActions on _BookingScreenState {
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
      _snack(
        AppLocalizations.of(context)!.bookingErrPendingOrderNotFound,
        error: true,
      );
      return;
    }

    await _capturePendingPayPalPayment();
  }

  Future<void> _capturePendingPayPalPayment() async {
    if (_isHomeVisit) {
      await _capturePendingHomeVisitPayment();
      return;
    }

    if (_service == null ||
        _selectedDoctor == null ||
        _selectedSlot == null ||
        _pendingPayPalOrderId == null) {
      return;
    }

    final patientId = context.read<AuthProvider>().userId;

    if (patientId == null || patientId.isEmpty) {
      _snack(
        AppLocalizations.of(context)!.bookingErrPatientNotFound,
        error: true,
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      final appointmentTime =
          _pendingAppointmentTime ??
          _appointmentDateTime(_selectedDate, _selectedSlot!.startTime);

      final invoice = await _service!.captureAppointmentPayPalPayment(
        orderId: _pendingPayPalOrderId!,
        patientId: patientId,
        doctorId: _selectedDoctor!.doctorId,
        appointmentTime: appointmentTime,
        consultationType: 'Online',
        symptoms: _symptomsCtrl.text.trim(),
        notes: _notesCtrl.text.trim(),
        doctorSelectionMode: _doctorSelectionMode,
        manualSelectionFee: _doctorSelectionMode == 'MANUAL_SELECTED'
            ? _manualSelectionFee
            : 0,
      );

      if (!mounted) return;

      final id = invoice['appointmentId'] ?? invoice['appointmentID'];
      final appointmentId = id is int ? id : int.tryParse(id?.toString() ?? '');

      if (appointmentId == null) {
        throw Exception(
          AppLocalizations.of(context)!.bookingErrNoAppointmentReturned,
        );
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

  Future<void> _capturePendingHomeVisitPayment() async {
    final patientId = context.read<AuthProvider>().userId;
    final doctor = _homeVisitDraft.selectedDoctor;
    final slot = _homeVisitDraft.selectedSlot;

    if (_homeVisitService == null ||
        patientId == null ||
        patientId.isEmpty ||
        doctor == null ||
        slot == null ||
        _pendingPayPalOrderId == null) {
      return;
    }

    final appointmentTime =
        _pendingAppointmentTime ?? _homeVisitAppointmentTime();

    final payload = {
      'orderId': _pendingPayPalOrderId,
      'paymentMethod': 'EWallet',
      'patientId': patientId,
      'doctorId': doctor.doctorId,
      'appointmentTime': appointmentTime,
      'consultationType': 'HomeVisit',
      'symptoms': _homeVisitDraft.reasonForHomeVisit,
      'notes': _homeVisitDraft.specialNotes,
      'draftId': _homeVisitDraft.sessionDraftId,
      'scheduleId': slot.scheduleId,
      'bookingDate': slot.bookingDate,
      'homeVisitStartTime': slot.startTime,
      'homeVisitEndTime': slot.endTime,
      'visitAddress': _homeVisitDraft.visitAddress,
      'visitCity': _homeVisitDraft.visitCity,
      'contactPhone': _homeVisitDraft.contactPhone,
      'reasonForHomeVisit': _homeVisitDraft.reasonForHomeVisit,
      'specialNotes': _homeVisitDraft.specialNotes,
      'isForSelf': _homeVisitDraft.isForSelf,
      'receiverName': _homeVisitDraft.receiverName.isEmpty
          ? null
          : _homeVisitDraft.receiverName,
      'receiverAge': int.tryParse(_homeVisitDraft.receiverAge),
      'receiverGender': _homeVisitDraft.receiverGender.isEmpty
          ? null
          : _homeVisitDraft.receiverGender,
      'receiverRelationship': _homeVisitDraft.receiverRelationship.isEmpty
          ? (_homeVisitDraft.isForSelf ? 'Self' : null)
          : _homeVisitDraft.receiverRelationship,
      'receiverPhone': _homeVisitDraft.receiverPhoneOrContact,
      'visitLatitude': _homeVisitDraft.visitLatitude,
      'visitLongitude': _homeVisitDraft.visitLongitude,
      'homeVisitServiceIds': _homeVisitDraft.selectedServiceIds,
      'currency': 'USD',
    };

    setState(() => _submitting = true);

    try {
      final invoice = await _homeVisitService!.capturePayPalPayment(payload);
      final id = invoice['appointmentId'] ?? invoice['appointmentID'];
      final appointmentId = id is int ? id : int.tryParse(id?.toString() ?? '');

      if (appointmentId == null) {
        throw Exception(
          AppLocalizations.of(context)!.bookingErrNoAppointmentReturned,
        );
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
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _submitNormalAppointment() async {
    if (_service == null || _selectedDoctor == null || _selectedSlot == null) {
      return;
    }

    final patientId = context.read<AuthProvider>().userId;

    if (patientId == null || patientId.isEmpty) {
      _snack(
        AppLocalizations.of(context)!.bookingErrPatientNotFound,
        error: true,
      );
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
        consultationType: 'Online',
        symptoms: _symptomsCtrl.text.trim(),
        notes: _notesCtrl.text.trim(),
        doctorSelectionMode: _doctorSelectionMode,
        manualSelectionFee: _doctorSelectionMode == 'MANUAL_SELECTED'
            ? _manualSelectionFee
            : 0,
      );

      final orderId = order['orderId']?.toString();
      final approvalUrl = order['approvalUrl']?.toString();

      if (orderId == null) {
        throw Exception(
          AppLocalizations.of(context)!.bookingErrCannotCreatePayPalOrder,
        );
      }

      if (approvalUrl == null) {
        throw Exception(
          AppLocalizations.of(context)!.bookingErrCannotOpenPayPalApproval,
        );
      }

      setState(() {
        _pendingPayPalOrderId = orderId;
        _pendingAppointmentTime = appointmentTime;
      });

      await _savePendingPayPalPayment(
        orderId: orderId,
        appointmentTime: appointmentTime,
      );

      final launched = await launchUrl(
        Uri.parse(approvalUrl),
        mode: LaunchMode.inAppBrowserView,
      );

      if (!launched) {
        throw Exception(
          AppLocalizations.of(context)!.bookingErrCannotOpenPayPal,
        );
      }
    } catch (e) {
      _snack(_cleanError(e), error: true);
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  Future<void> _submit() async {
    if (_isHomeVisit) {
      await _submitHomeVisit();
      return;
    }

    await _submitNormalAppointment();
  }

  Future<void> _submitHomeVisit() async {
    final patientId = context.read<AuthProvider>().userId;
    final doctor = _homeVisitDraft.selectedDoctor;
    final slot = _homeVisitDraft.selectedSlot;

    if (_homeVisitService == null ||
        patientId == null ||
        patientId.isEmpty ||
        doctor == null ||
        slot == null) {
      return;
    }

    if ((_homeVisitDraft.sessionDraftId ?? '').isEmpty) {
      _snack(
        'Missing home visit session draft. Please select a session again.',
        error: true,
      );
      return;
    }

    final appointmentTime = _homeVisitAppointmentTime();

    final payload = {
      'patientId': patientId,
      'doctorId': doctor.doctorId,
      'appointmentTime': appointmentTime,
      'consultationType': 'HomeVisit',
      'symptoms': _homeVisitDraft.reasonForHomeVisit,
      'notes': _homeVisitDraft.specialNotes,
      'draftId': _homeVisitDraft.sessionDraftId,
      'scheduleId': slot.scheduleId,
      'bookingDate': slot.bookingDate,
      'homeVisitStartTime': slot.startTime,
      'homeVisitEndTime': slot.endTime,
      'visitAddress': _homeVisitDraft.visitAddress,
      'visitCity': _homeVisitDraft.visitCity,
      'contactPhone': _homeVisitDraft.contactPhone,
      'reasonForHomeVisit': _homeVisitDraft.reasonForHomeVisit,
      'specialNotes': _homeVisitDraft.specialNotes,
      'isForSelf': _homeVisitDraft.isForSelf,
      'receiverName': _homeVisitDraft.receiverName.isEmpty
          ? null
          : _homeVisitDraft.receiverName,
      'receiverAge': int.tryParse(_homeVisitDraft.receiverAge),
      'receiverGender': _homeVisitDraft.receiverGender.isEmpty
          ? null
          : _homeVisitDraft.receiverGender,
      'receiverRelationship': _homeVisitDraft.receiverRelationship.isEmpty
          ? (_homeVisitDraft.isForSelf ? 'Self' : null)
          : _homeVisitDraft.receiverRelationship,
      'receiverPhone': _homeVisitDraft.receiverPhoneOrContact,
      'visitLatitude': _homeVisitDraft.visitLatitude,
      'visitLongitude': _homeVisitDraft.visitLongitude,
      'homeVisitServiceIds': _homeVisitDraft.selectedServiceIds,
      'currency': 'USD',
    };

    setState(() => _submitting = true);

    try {
      final order = await _homeVisitService!.createPayPalOrder(payload);
      final orderId = order['orderId']?.toString();
      final approvalUrl = order['approvalUrl']?.toString();

      if (orderId == null || approvalUrl == null) {
        throw Exception(
          AppLocalizations.of(context)!.bookingErrCannotCreatePayPalOrder,
        );
      }

      setState(() {
        _pendingPayPalOrderId = orderId;
        _pendingAppointmentTime = appointmentTime;
      });

      await _savePendingPayPalPayment(
        orderId: orderId,
        appointmentTime: appointmentTime,
      );

      final launched = await launchUrl(
        Uri.parse(approvalUrl),
        mode: LaunchMode.inAppBrowserView,
      );

      if (!launched) {
        throw Exception(
          AppLocalizations.of(context)!.bookingErrCannotOpenPayPal,
        );
      }
    } catch (e) {
      _snack(_cleanError(e), error: true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _savePendingPayPalPayment({
    required String orderId,
    required String appointmentTime,
  }) async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.setString(_pendingPayPalOrderKey, orderId);
    await prefs.setString(_pendingPayPalAppointmentTimeKey, appointmentTime);
  }

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
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(AppLocalizations.of(context)!.bookingSuccessMsg),
          if (!_isHomeVisit) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 16,
                    color: Colors.blue.shade700,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      AppLocalizations.of(context)!.bookingOnlineVitalsHint,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.blue.shade800,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
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
          icon: Icon(Icons.shield_outlined, color: colors.error, size: 34),
          title: Text(AppLocalizations.of(context)!.bookingUploadWarnTitle),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(AppLocalizations.of(context)!.bookingUploadWarnDesc),
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
}
