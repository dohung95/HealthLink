import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/auth/login_request.dart';
import '../models/auth/login_response.dart';
import '../models/auth/register_request.dart';
import '../services/auth/auth_service.dart';
import '../utils/auth/token_utils.dart';

/// Enum mô tả trạng thái auth.
enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

/// Provider quản lý toàn bộ state Auth.
/// Tương đương AuthContext.jsx trong web.
class AuthProvider extends ChangeNotifier {
  AuthStatus _status = AuthStatus.initial;
  String _errorMessage = '';
  String? _accessToken;
  String? _refreshToken;
  String? _userId;
  List<String> _roles = [];

  // Thông tin profile (tải sau khi login)
  String? _displayName;
  String? _avatarUrl;
  Map<String, dynamic>? _patientProfile;
  Map<String, dynamic>? _doctorProfile;

  // ── Getters ────────────────────────────────────────────────────────────────

  AuthStatus get status        => _status;
  String     get errorMessage  => _errorMessage;
  String?    get accessToken   => _accessToken;
  String?    get refreshToken  => _refreshToken;
  String?    get userId        => _userId;
  List<String> get roles       => _roles;
  bool       get isLoading     => _status == AuthStatus.loading;
  bool       get isAuthenticated => _status == AuthStatus.authenticated;
  String?    get displayName   => _displayName;
  String?    get avatarUrl     => _avatarUrl;
  Map<String, dynamic>? get patientProfile => _patientProfile;
  Map<String, dynamic>? get doctorProfile  => _doctorProfile;
  bool get isDoctor => _roles.contains('DOCTOR');
  bool get isPatient => _roles.contains('PATIENT') || (!isDoctor && _roles.isEmpty);

  // ── Init: Tải token từ SharedPreferences khi app khởi động ─────────────────

  /// Gọi trong main() hoặc initState() để khôi phục session trước đó.
  Future<void> loadSavedSession() async {
    final token = await TokenUtils.getAccessToken();
    if (token != null && TokenUtils.isTokenValid(token)) {
      _accessToken  = token;
      _refreshToken = await TokenUtils.getRefreshToken();
      _userId       = await TokenUtils.getUserId();
      _roles        = _extractRoles(token);
      _status       = AuthStatus.authenticated;
      // Tải profile ngầm sau khi khôi phục session
      fetchProfile();
    } else {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  /// Đăng nhập bằng email + password.
  /// Trả true nếu thành công, false nếu thất bại.
  Future<bool> login(String email, String password, {bool rememberMe = false}) async {
    _setLoading();
    try {
      final response = await AuthService.login(
        LoginRequest(email: email, password: password),
      );
      await _saveSession(response, rememberMe: rememberMe);
      _status = AuthStatus.authenticated;
      notifyListeners();
      // Tải profile ngầm sau login
      fetchProfile();
      return true;
    } catch (e) {
      _setError(_cleanErrorMessage(e.toString()));
      return false;
    }
  }

  // ── Register ───────────────────────────────────────────────────────────────

  /// Đăng ký tài khoản mới. Trả true nếu thành công.
  Future<bool> register({
    required String username,
    required String email,
    required String password,
    required String phoneNumber,
    String? dateOfBirth,
    String? gender,
    double? heightCm,
    double? weightKg,
    String? preferredLanguage,
  }) async {
    _setLoading();
    try {
      await AuthService.register(RegisterRequest(
        username:          username,
        email:             email,
        password:          password,
        phoneNumber:       phoneNumber,
        dateOfBirth:       dateOfBirth,
        gender:            gender,
        heightCm:          heightCm,
        weightKg:          weightKg,
        preferredLanguage: preferredLanguage,
      ));
      _status = AuthStatus.unauthenticated; // Chưa đăng nhập, cần xác nhận email
      _errorMessage = '';
      notifyListeners();
      return true;
    } catch (e) {
      _setError(_cleanErrorMessage(e.toString()));
      return false;
    }
  }

  // ── Forgot Password ────────────────────────────────────────────────────────

  /// Gửi email đặt lại mật khẩu. Trả true nếu thành công.
  Future<bool> forgotPassword(String email) async {
    _setLoading();
    try {
      await AuthService.forgotPassword(email);
      _status = AuthStatus.unauthenticated;
      _errorMessage = '';
      notifyListeners();
      return true;
    } catch (e) {
      _setError(_cleanErrorMessage(e.toString()));
      return false;
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  /// Logout: xóa token local + gọi API blacklist token.
  Future<void> logout() async {
    if (_accessToken != null) {
      await AuthService.logout(_accessToken!);
    }
    await _clearSession();
  }

  // ── Clear Error ────────────────────────────────────────────────────────────

  /// Xóa thông báo lỗi (dùng khi user bắt đầu nhập lại).
  void clearError() {
    _errorMessage = '';
    notifyListeners();
  }

  // ── Helpers private ────────────────────────────────────────────────────────

  void _setLoading() {
    _status = AuthStatus.loading;
    _errorMessage = '';
    notifyListeners();
  }

  void _setError(String message) {
    _status = AuthStatus.unauthenticated;
    _errorMessage = message;
    notifyListeners();
  }

  /// Lưu tokens sau khi login thành công.
  /// Nếu rememberMe = true, lưu vào SharedPreferences.
  Future<void> _saveSession(LoginResponse response, {bool rememberMe = false}) async {
    _accessToken  = response.accessToken;
    _refreshToken = response.refreshToken;
    _userId       = response.userId;
    _roles        = _extractRoles(response.accessToken);

    if (rememberMe) {
      await TokenUtils.saveTokens(
        accessToken:  response.accessToken,
        refreshToken: response.refreshToken,
        userId:       response.userId,
      );
    } else {
      // Đảm bảo không có token cũ nào bị dính lại nếu chọn không remember
      await TokenUtils.clearTokens();
    }
  }

  /// Xóa toàn bộ session.
  Future<void> _clearSession() async {
    _accessToken  = null;
    _refreshToken = null;
    _userId       = null;
    _roles        = [];
    _displayName  = null;
    _avatarUrl    = null;
    _patientProfile = null;
    _doctorProfile  = null;
    _status       = AuthStatus.unauthenticated;
    _errorMessage = '';
    await TokenUtils.clearTokens();
    notifyListeners();
  }

  /// Gọi ngầm API profile dựa theo role để lấy tên và avatar.
  /// - Doctor: /api/account/doctors/profile
  /// - Patient: /api/account/patient/profile
  Future<void> fetchProfile() async {
    if (_accessToken == null) return;
    try {
      final String profileUrl = isDoctor
          ? ApiConfig.doctorProfile
          : ApiConfig.patientProfile;

      final res = await http.get(
        Uri.parse(profileUrl),
        headers: {
          'Authorization': 'Bearer $_accessToken',
          'Accept': 'application/json',
        },
      ).timeout(ApiConfig.connectTimeout);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;

        if (isDoctor) {
          _doctorProfile = data;
          _displayName = data['fullName']?.toString() ?? data['username']?.toString();
          _avatarUrl = data['avatarUrl']?.toString();
        } else {
          _patientProfile = data;
          _displayName = data['fullName']?.toString() ?? data['username']?.toString();
          _avatarUrl = data['avatarUrl']?.toString();
        }
        notifyListeners();
      }
    } catch (e) {
      debugPrint('AuthProvider fetchProfile error: $e');
    }
  }

  /// Trích xuất roles từ JWT token.
  List<String> _extractRoles(String token) {
    final payload = TokenUtils.decodeJwtPayload(token);
    if (payload == null) return [];
    return TokenUtils.extractRoles(payload);
  }

  /// Bỏ prefix "Exception: " từ error message.
  String _cleanErrorMessage(String raw) =>
      raw.startsWith('Exception: ') ? raw.substring(11) : raw;
}
