/// Typed exception for partner withdrawal/settlement failures.
///
/// When the backend returns a structured error with `code`, `attemptsRemaining`,
/// and/or `lockedUntil`, the wallet service throws this instead of a generic
/// [Exception] so the UI can show contextual error handling.
class PartnerPaymentException implements Exception {
  const PartnerPaymentException({
    required this.statusCode,
    required this.message,
    this.code,
    this.attemptsRemaining,
    this.lockedUntil,
  });

  /// HTTP status code (e.g. 422, 423, 409).
  final int statusCode;

  /// Human-readable error message.
  final String message;

  /// Stable error code from the backend (PIN_REQUIRED, PIN_INVALID, PIN_LOCKED).
  final String? code;

  /// Remaining PIN attempts before lockout (from PIN_INVALID responses).
  final int? attemptsRemaining;

  /// When the PIN lock expires (from PIN_LOCKED responses).
  final DateTime? lockedUntil;

  /// Whether this is a PIN_INVALID error.
  bool get isPinInvalid => code == 'PIN_INVALID';

  /// Whether this is a PIN_LOCKED error.
  bool get isPinLocked => code == 'PIN_LOCKED';

  /// Whether this is a PIN_REQUIRED error.
  bool get isPinRequired => code == 'PIN_REQUIRED';

  @override
  String toString() => 'PartnerPaymentException($statusCode: $message)';
}
