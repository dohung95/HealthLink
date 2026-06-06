/// Model cho response đăng nhập từ backend.
/// Tương ứng JSON: { accessToken, refreshToken, userId, email, username, role }
class LoginResponse {
  final String accessToken;
  final String refreshToken;
  final String? userId;
  final String? email;
  final String? username;
  final String? role;

  const LoginResponse({
    required this.accessToken,
    required this.refreshToken,
    this.userId,
    this.email,
    this.username,
    this.role,
  });

  /// Parse JSON từ API response.
  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      accessToken:  json['accessToken']  as String,
      refreshToken: json['refreshToken'] as String,
      userId:       json['userId']       as String?,
      email:        json['email']        as String?,
      username:     json['username']     as String?,
      role:         json['role']         as String?,
    );
  }
}
