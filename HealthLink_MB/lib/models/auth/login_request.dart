/// Model cho request đăng nhập.
class LoginRequest {
  final String email;
  final String password;

  const LoginRequest({required this.email, required this.password});

  /// Chuyển sang JSON để gửi lên API.
  Map<String, dynamic> toJson() => {'email': email, 'password': password};
}
