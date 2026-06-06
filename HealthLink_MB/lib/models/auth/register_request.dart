/// Model cho request đăng ký tài khoản mới.
/// Tất cả field optional (ngoài required) đều nullable – backend sẽ bỏ qua khi null.
class RegisterRequest {
  // Required
  final String username;
  final String email;
  final String password;
  final String phoneNumber;
  final String role;

  // Optional
  final String? dateOfBirth;
  final String? gender;
  final double? heightCm;
  final double? weightKg;
  final String? preferredLanguage;

  const RegisterRequest({
    required this.username,
    required this.email,
    required this.password,
    required this.phoneNumber,
    this.role = 'Patient',
    this.dateOfBirth,
    this.gender,
    this.heightCm,
    this.weightKg,
    this.preferredLanguage,
  });

  /// Chuyển sang JSON để gửi lên API.
  /// Loại bỏ key null để tránh gửi trường không cần thiết.
  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'username':    username,
      'email':       email,
      'password':    password,
      'phoneNumber': phoneNumber,
      'role':        role,
    };
    if (dateOfBirth      != null) map['dateOfBirth']      = dateOfBirth;
    if (gender           != null) map['gender']           = gender;
    if (heightCm         != null) map['heightCm']         = heightCm;
    if (weightKg         != null) map['weightKg']         = weightKg;
    if (preferredLanguage != null) map['preferredLanguage'] = preferredLanguage;
    return map;
  }
}
