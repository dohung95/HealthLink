/// Tập trung tất cả hàm validate cho form Auth.
/// Mỗi hàm trả về String rỗng nếu hợp lệ, hoặc thông báo lỗi nếu không hợp lệ.
/// Giống logic validate trong Sign_in.jsx và Sign_up.jsx của web.
class AuthValidators {
  AuthValidators._(); // Không cho khởi tạo

  // ── Login validators ──────────────────────────────────────────────────────

  /// Validate email: bắt buộc + đúng định dạng.
  static String validateEmail(String value) {
    if (value.trim().isEmpty) return 'Email is required';
    final emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
    if (!emailRegex.hasMatch(value.trim())) {
      return 'Please enter a valid email address';
    }
    return '';
  }

  /// Validate password login: bắt buộc + tối thiểu 6 ký tự.
  static String validateLoginPassword(String value) {
    if (value.isEmpty) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return '';
  }

  // ── Register validators ───────────────────────────────────────────────────

  /// Validate full name: bắt buộc, >= 2 ký tự, chỉ chữ/số/khoảng trắng.
  static String validateFullName(String value) {
    if (value.trim().isEmpty) return 'Full name is required';
    if (value.trim().length < 2) return 'Full name must be at least 2 characters';
    if (!RegExp(r'^[a-zA-Z0-9 ]+$').hasMatch(value.trim())) {
      return 'Only letters, numbers, and spaces allowed';
    }
    return '';
  }

  /// Validate phone: bắt buộc, 8–15 chữ số.
  static String validatePhone(String value) {
    if (value.isEmpty) return 'Phone number is required';
    if (value.length < 8 || value.length > 15) {
      return 'Phone number must be 8–15 digits (current: ${value.length})';
    }
    return '';
  }

  /// Validate password đăng ký: bắt buộc + các yêu cầu độ mạnh.
  static String validateRegisterPassword(String value) {
    if (value.isEmpty) return 'Password is required';
    if (value.length < 6) return 'At least 6 characters required';
    if (!RegExp(r'[A-Z]').hasMatch(value)) return 'Needs uppercase letter (A-Z)';
    if (!RegExp(r'[a-z]').hasMatch(value)) return 'Needs lowercase letter (a-z)';
    if (!RegExp(r'[0-9]').hasMatch(value)) return 'Needs number (0-9)';
    if (!RegExp(r'[^a-zA-Z0-9\s]').hasMatch(value)) {
      return r'Needs special character (!@#$...)';
    }
    return '';
  }

  /// Validate confirm password: bắt buộc + phải khớp với password.
  static String validateConfirmPassword(String value, String password) {
    if (value.isEmpty) return 'Please confirm your password';
    if (value != password) return 'Passwords do not match';
    return '';
  }

  /// Validate height: tùy chọn, nếu nhập thì phải trong khoảng 50–250 cm.
  static String validateHeight(String value) {
    if (value.isEmpty) return '';
    final n = double.tryParse(value);
    if (n == null || n < 50 || n > 250) return 'Height must be between 50 and 250 cm';
    return '';
  }

  /// Validate weight: tùy chọn, nếu nhập thì phải trong khoảng 10–300 kg.
  static String validateWeight(String value) {
    if (value.isEmpty) return '';
    final n = double.tryParse(value);
    if (n == null || n < 10 || n > 300) return 'Weight must be between 10 and 300 kg';
    return '';
  }

  // ── Password strength check ───────────────────────────────────────────────

  /// Trả về Map kiểm tra từng tiêu chí độ mạnh password.
  static Map<String, bool> checkPasswordStrength(String password) => {
    'minLength':    password.length >= 6,
    'hasUppercase': RegExp(r'[A-Z]').hasMatch(password),
    'hasLowercase': RegExp(r'[a-z]').hasMatch(password),
    'hasNumber':    RegExp(r'[0-9]').hasMatch(password),
    'hasSpecial':   RegExp(r'[^a-zA-Z0-9\s]').hasMatch(password),
  };

  /// Kiểm tra password có đủ mạnh không (tất cả tiêu chí đều đạt).
  static bool isPasswordStrong(String password) =>
      checkPasswordStrength(password).values.every((v) => v);
}
