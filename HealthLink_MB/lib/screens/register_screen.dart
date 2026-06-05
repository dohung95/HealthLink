import 'package:flutter/material.dart';
import '../config/themes.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  // Các Controller quản lý nhập liệu của Form
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _dobController = TextEditingController();
  final _heightController = TextEditingController();
  final _weightController = TextEditingController();

  String? _selectedGender; // Quản lý giá trị Dropdown Giới tính

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _dobController.dispose();
    _heightController.dispose();
    _weightController.dispose();
    super.dispose();
  }

  // Hàm bổ trợ xử lý chọn Ngày sinh từ hệ thống (Date Picker)
  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().subtract(const Duration(days: 365 * 20)),
      firstDate: DateTime(1920),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: HealthLinkTheme.primary,
              onPrimary: Colors.white,
              onSurface: HealthLinkTheme.onPrimaryContainer,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _dobController.text = "${picked.day.toString().padLeft(2, '0')}/${picked.month.toString().padLeft(2, '0')}/${picked.year}";
      });
    }
  }

  // Widget bổ trợ tạo các Input Field có Icon phía trước (Prefix Icon)
  Widget _buildInputField({
    required String label,
    required TextEditingController controller,
    required String placeholder,
    required IconData prefixIcon,
    bool isRequired = false,
    bool isPassword = true,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              label,
              style: const TextStyle(
                fontFamily: 'Public Sans',
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Color(0xFF374151), // text-gray-700
              ),
            ),
            if (isRequired)
              const Text(' *', style: TextStyle(color: Colors.red, fontSize: 14)),
          ],
        ),
        const SizedBox(height: 4),
        TextField(
          controller: controller,
          obscureText: isPassword,
          keyboardType: keyboardType,
          style: const TextStyle(color: Color(0xFF111827), fontSize: 14), // text-gray-900
          decoration: InputDecoration(
            hintText: placeholder,
            hintStyle: const TextStyle(color: Colors.grey, fontSize: 14),
            fillColor: Colors.white,
            filled: true,
            contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
            prefixIcon: Icon(prefixIcon, color: Colors.grey.shade400, size: 20),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: HealthLinkTheme.primary, width: 2),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HealthLinkTheme.surface, // Nền tổng thể #f0f3f2
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 448), // max-w-md (448px)
              decoration: BoxDecoration(
                color: HealthLinkTheme.surfaceBright, // Nền trắng ngà #f8faf9
                borderRadius: BorderRadius.circular(24), // rounded-[1.5rem]
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 20,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // --- 1. Header Image Area ---
                  Container(
                    height: 128, // h-32 (32 * 4 = 128px)
                    decoration: const BoxDecoration(
                      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                      gradient: LinearGradient(
                        begin: Alignment.bottomLeft,
                        end: Alignment.topRight,
                        colors: [
                          HealthLinkTheme.primary,
                          Color(0xFF289E88),
                        ],
                      ),
                    ),
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        // Background pattern nhạt giả lập ảnh mix-blend-overlay
                        Positioned.fill(
                          child: Opacity(
                            opacity: 0.1,
                            child: Icon(Icons.grid_on, size: 200, color: Colors.white.withOpacity(0.3)),
                          ),
                        ),
                        const Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.health_and_safety, // health_and_safety icon
                              size: 48,
                              color: Colors.white,
                            ),
                            SizedBox(height: 4),
                            Text(
                              'HealthLink',
                              style: TextStyle(
                                fontFamily: 'Public Sans',
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                letterSpacing: -0.5,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // --- 2. Title & Description ---
                  const Padding(
                    padding: EdgeInsets.only(left: 24.0, right: 24.0, top: 32.0, bottom: 4.0),
                    child: Text(
                      'Create Account',
                      style: TextStyle(
                        fontFamily: 'Public Sans',
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF111827), // text-gray-900
                      ),
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 24.0),
                    child: Text(
                      'Join HealthLink to manage your health records and book appointments.',
                      style: TextStyle(
                        fontFamily: 'Public Sans',
                        fontSize: 14,
                        color: HealthLinkTheme.onSurfaceVariant,
                      ),
                    ),
                  ),

                  // --- 3. Form Fields Area (Có giới hạn chiều cao tối đa để hỗ trợ Scroll như max-h-[60vh]) ---
                  Container(
                    constraints: BoxConstraints(
                      maxHeight: MediaQuery.of(context).size.height * 0.5,
                    ),
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                      child: Column(
                        children: [
                          // Họ và tên
                          _buildInputField(
                            label: 'Full Name',
                            controller: _fullNameController,
                            placeholder: 'John Doe',
                            prefixIcon: Icons.person_outline,
                            isRequired: true,
                          ),
                          const SizedBox(height: 16),

                          // Email
                          _buildInputField(
                            label: 'Email',
                            controller: _emailController,
                            placeholder: 'you@example.com',
                            prefixIcon: Icons.mail_outline,
                            isRequired: true,
                            keyboardType: TextInputType.emailAddress,
                          ),
                          const SizedBox(height: 16),

                          // Số điện thoại
                          _buildInputField(
                            label: 'Phone Number',
                            controller: _phoneController,
                            placeholder: '+1 (555) 000-0000',
                            prefixIcon: Icons.call_outlined,
                            isRequired: true,
                            keyboardType: TextInputType.phone,
                          ),
                          const SizedBox(height: 20),

                          // --- Phần 2: Bảo mật (Security Section) ---
                          Container(
                            alignment: Alignment.centerLeft,
                            padding: const EdgeInsets.only(top: 16, bottom: 12),
                            decoration: BoxDecoration(
                              border: Border(top: BorderSide(color: Colors.grey.shade100)),
                            ),
                            child: const Text(
                              'SECURITY',
                              style: TextStyle(
                                fontFamily: 'Public Sans',
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey,
                                letterSpacing: 1.0,
                              ),
                            ),
                          ),

                          // Mật khẩu
                          _buildInputField(
                            label: 'Password',
                            controller: _passwordController,
                            placeholder: '••••••••',
                            prefixIcon: Icons.lock_outline,
                            isRequired: true,
                            isPassword: true,
                          ),
                          const SizedBox(height: 16),

                          // Xác nhận mật khẩu
                          _buildInputField(
                            label: 'Confirm Password',
                            controller: _confirmPasswordController,
                            placeholder: '••••••••',
                            prefixIcon: Icons.lock_outline,
                            isRequired: true,
                            isPassword: true,
                          ),
                          const SizedBox(height: 20),

                          // --- Phần 3: Thông tin tùy chọn (Optional Details Section) ---
                          Container(
                            alignment: Alignment.centerLeft,
                            padding: const EdgeInsets.only(top: 16, bottom: 12),
                            decoration: BoxDecoration(
                              border: Border(top: BorderSide(color: Colors.grey.shade100)),
                            ),
                            child: const Text(
                              'OPTIONAL DETAILS',
                              style: TextStyle(
                                fontFamily: 'Public Sans',
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey,
                                letterSpacing: 1.0,
                              ),
                            ),
                          ),

                          // Grid: Ngày sinh & Giới tính
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Date of Birth
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Date of Birth',
                                      style: TextStyle(fontFamily: 'Public Sans', fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
                                    ),
                                    const SizedBox(height: 4),
                                    TextField(
                                      controller: _dobController,
                                      readOnly: true,
                                      onTap: () => _selectDate(context),
                                      style: const TextStyle(color: Color(0xFF111827), fontSize: 14),
                                      decoration: InputDecoration(
                                        hintText: 'Select date',
                                        hintStyle: const TextStyle(color: Colors.grey, fontSize: 14),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                        suffixIcon: const Icon(Icons.calendar_today, size: 18, color: Colors.grey),
                                        fillColor: Colors.white,
                                        filled: true,
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
                                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 16),

                              // Gender Select
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Gender',
                                      style: TextStyle(fontFamily: 'Public Sans', fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
                                    ),
                                    const SizedBox(height: 4),
                                    DropdownButtonFormField<String>(
                                      value: _selectedGender,
                                      dropdownColor: Colors.white,
                                      style: const TextStyle(color: Color(0xFF111827), fontSize: 14),
                                      decoration: InputDecoration(
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                        fillColor: Colors.white,
                                        filled: true,
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
                                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
                                      ),
                                      hint: const Text('Select', style: TextStyle(color: Colors.grey, fontSize: 14)),
                                      items: const [
                                        DropdownMenuItem(value: 'male', child: Text('Male')),
                                        DropdownMenuItem(value: 'female', child: Text('Female')),
                                        DropdownMenuItem(value: 'other', child: Text('Other')),
                                      ],
                                      onChanged: (value) {
                                        setState(() {
                                          _selectedGender = value;
                                        });
                                      },
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // Grid: Chiều cao & Cân nặng
                          Row(
                            children: [
                              // Height
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Height (cm)',
                                      style: TextStyle(fontFamily: 'Public Sans', fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
                                    ),
                                    const SizedBox(height: 4),
                                    TextField(
                                      controller: _heightController,
                                      keyboardType: TextInputType.number,
                                      style: const TextStyle(color: Color(0xFF111827), fontSize: 14),
                                      decoration: InputDecoration(
                                        hintText: '175',
                                        hintStyle: const TextStyle(color: Colors.grey, fontSize: 14),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                        fillColor: Colors.white,
                                        filled: true,
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
                                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 16),

                              // Weight
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Weight (kg)',
                                      style: TextStyle(fontFamily: 'Public Sans', fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF374151)),
                                    ),
                                    const SizedBox(height: 4),
                                    TextField(
                                      controller: _weightController,
                                      keyboardType: TextInputType.number,
                                      style: const TextStyle(color: Color(0xFF111827), fontSize: 14),
                                      decoration: InputDecoration(
                                        hintText: '70',
                                        hintStyle: const TextStyle(color: Colors.grey, fontSize: 14),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                        fillColor: Colors.white,
                                        filled: true,
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
                                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  // --- 4. Footer Action Buttons Area (bg-gray-50) ---
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50, // bg-gray-50
                      border: Border(top: BorderSide(color: Colors.grey.shade100)),
                      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Nút Register chính
                        SizedBox(
                          height: 48,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: HealthLinkTheme.primary,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: const StadiumBorder(), // Nút bo tròn hoàn toàn (rounded-full)
                            ).copyWith(
                              overlayColor: WidgetStateProperty.resolveWith<Color?>(
                                    (states) {
                                  if (states.contains(WidgetState.pressed)) {
                                    return const Color(0xFF1A6658); // Đổi màu khi click
                                  }
                                  return null;
                                },
                              ),
                            ),
                            onPressed: () {
                              // Thực thi logic đăng ký tài khoản mới ở đây
                            },
                            child: const Text(
                              'Register',
                              style: TextStyle(
                                fontFamily: 'Public Sans',
                                fontSize: 14,
                              fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Dòng chuyển hướng Log In
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text(
                              'Already have an account? ',
                              style: TextStyle(
                                fontFamily: 'Public Sans',
                                fontSize: 14,
                                color: Color(0xFF4B5563), // text-gray-600
                              ),
                            ),
                            GestureDetector(
                              onTap: () {
                                Navigator.pop(context); // Quay về màn hình Login trước đó
                              },
                              child: const Text(
                                'Log In',
                                style: TextStyle(
                                  fontFamily: 'Public Sans',
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: HealthLinkTheme.primary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}