part of '../booking_screen.dart';

extension _BookingUtils on _BookingScreenState {

  String _cleanError(Object error) {
    final raw = error.toString();
    var cleaned = raw.startsWith('Exception: ') ? raw.substring(11) : raw;

    if (cleaned.startsWith('Doctor does not support consultation type: ')) {
      final type = cleaned
          .substring('Doctor does not support consultation type: '.length)
          .trim();
      return AppLocalizations.of(
        context,
      )!.bookingErrUnsupportedConsultationType(
        type.toLocalizedConsultationType(context),
      );
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

    return AppLocalizations.of(
      context,
    )!.bookingErrUploadFailed(fileName, message);
  }

  DateTime _dayStart(DateTime value) =>
      DateTime(value.year, value.month, value.day);

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  int _weekIndexForDate(DateTime date) {
    DateTime mondayOfWeek(DateTime value) {
      final start = _dayStart(value);
      return start.subtract(Duration(days: start.weekday - 1));
    }

    final currentWeekStart = mondayOfWeek(DateTime.now());
    final targetWeekStart = mondayOfWeek(date);

    return targetWeekStart.difference(currentWeekStart).inDays ~/ 7;
  }

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
    if (_sameDay(date, DateTime.now()))
      return AppLocalizations.of(context)!.labelToday;
    final tomorrow = _dayStart(DateTime.now()).add(const Duration(days: 1));
    if (_sameDay(date, tomorrow))
      return AppLocalizations.of(context)!.labelTomorrow;
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

  String _ageFromDateOfBirth(dynamic value) {
    if (value == null) return '';

    final dob = DateTime.tryParse(value.toString());
    if (dob == null) return '';

    final today = DateTime.now();
    var age = today.year - dob.year;

    final birthdayThisYear = DateTime(today.year, dob.month, dob.day);
    if (today.isBefore(birthdayThisYear)) {
      age--;
    }

    return age > 0 ? age.toString() : '';
  }

}
