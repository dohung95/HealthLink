part of '../booking_screen.dart';

extension _BookingSharedWidgets on _BookingScreenState {

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
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
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
                      : (_step == _getSteps(context).length - 1
                      ? _submit
                      : _next),
                  child: _submitting
                      ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                      : Text(
                    _step == _getSteps(context).length - 1
                        ? AppLocalizations.of(
                      context,
                    )!.bookingBtnPayConfirm
                        : AppLocalizations.of(context)!.btnNext,
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
    switch (_currentStepKey) {
      case BookingStepKey.specialty:
        return _specialtyStep(colors);
      case BookingStepKey.visitType:
        return _visitTypeStep(colors);
      case BookingStepKey.doctorOption:
        return _doctorOptionStep(colors);
      case BookingStepKey.doctor:
        return _doctorStep(colors);
      case BookingStepKey.dateTime:
        return _dateTimeStep(colors);
      case BookingStepKey.medicalInfo:
        return _medicalInfoStep(colors);
      case BookingStepKey.homeVisitLocation:
        return _homeVisitLocationStep(colors);
      case BookingStepKey.homeVisitDoctor:
        return _homeVisitDoctorStep(colors);
      case BookingStepKey.homeVisitServices:
        return _homeVisitServicesStep(colors);
      case BookingStepKey.homeVisitSession:
        return _homeVisitSessionStep(colors);
      case BookingStepKey.confirm:
        return _isHomeVisit
            ? _homeVisitConfirmStep(colors)
            : _confirmStep(colors);
      case BookingStepKey.payment:
        return _isHomeVisit
            ? _homeVisitPaymentStep(colors)
            : _paymentStep(colors);
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

}
