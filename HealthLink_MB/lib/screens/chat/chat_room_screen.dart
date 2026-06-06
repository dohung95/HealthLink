import 'package:flutter/material.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();

  // Định nghĩa nhanh các màu sắc từ cấu hình Tailwind của bạn
  static const Color primary = Color(0xFF0A5F59);
  static const Color surface = Color(0xFFFBFDFB);
  static const Color surfaceVariant = Color(0xFFDAE5E2);
  static const Color surfaceContainerHigh = Color(0xFFE7F0EE);
  static const Color secondaryContainer = Color(0xFFCCE8E4);
  static const Color onSecondaryContainer = Color(0xFF051F1D);
  static const Color onSurfaceVariant = Color(0xFF495553);
  static const Color outline = Color(0xFF798583);

  static const Color chatDoctor = Color(0xFFF3F4F6);
  static const Color chatPatient = Color(0xFF0A5F59);

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: surface,
      body: SafeArea(
        child: Column(
          children: [
            _buildAppBar(context),

            // Khu vực Chat (Expanded)
            Expanded(
              child: Container(
                color: surfaceContainerHigh.withOpacity(0.3), // bg-surface-container-high/30
                child: Stack(
                  children: [
                    // Danh sách tin nhắn
                    ListView(
                      padding: const EdgeInsets.only(
                        top: 80, // Để chừa khoảng trống cho Sticky Vitals Card
                        bottom: 24,
                        left: 16,
                        right: 16,
                      ),
                      children: [
                        _buildDateSeparator('Today, 10:42 AM'),
                        const SizedBox(height: 24),

                        _buildDoctorBubble(
                          message: "Hello! I've reviewed your vitals from this morning. Everything looks stable. How have you been feeling since we adjusted your medication?",
                          time: "10:42 AM",
                          avatarUrl: 'assets/images/doctor_sarah.png',
                        ),
                        const SizedBox(height: 24),

                        _buildPatientBubble(
                          message: "Hi Dr. Johnson. I'm feeling much better overall, less dizzy. But I noticed a slight headache in the evenings.",
                          time: "10:45 AM",
                          isRead: true,
                        ),
                        const SizedBox(height: 24),

                        _buildDoctorBubble(
                          message: "That's good to hear about the dizziness. The evening headaches could be a mild side effect as your body adjusts. Let's monitor it for a few more days. Are you keeping hydrated?",
                          time: "10:47 AM",
                          avatarUrl: 'assets/images/doctor_sarah.png',
                        ),
                      ],
                    ),

                    // Pinned Vitals Card (Sticky ở trên cùng)
                    Positioned(
                      top: 8,
                      left: 16,
                      right: 16,
                      child: _buildPinnedVitalsCard(),
                    ),
                  ],
                ),
              ),
            ),

            _buildInputArea(),
          ],
        ),
      ),
    );
  }

  // --- 1. Top App Bar ---
  Widget _buildAppBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: surface,
        border: Border(bottom: BorderSide(color: surfaceVariant)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                icon: const Icon(Icons.arrow_back, color: primary),
                onPressed: () => Navigator.pop(context),
              ),
              const SizedBox(width: 12),

              // Avatar Bác sĩ có chấm Online
              Stack(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2)),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: Image.asset('assets/images/doctor_sarah.png', fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => const Icon(Icons.person, color: outline),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: Colors.green.shade500,
                        shape: BoxShape.circle,
                        border: Border.all(color: surface, width: 2),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 12),

              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Dr. Sarah Johnson',
                    style: TextStyle(fontFamily: 'Public Sans', fontSize: 16, fontWeight: FontWeight.bold, color: primary, height: 1.2),
                  ),
                  Text(
                    'Cardiologist • Online',
                    style: TextStyle(fontFamily: 'Public Sans', fontSize: 12, fontWeight: FontWeight.w500, color: outline),
                  ),
                ],
              ),
            ],
          ),

          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.videocam_outlined),
                color: onSurfaceVariant,
                onPressed: () {},
              ),
              IconButton(
                icon: const Icon(Icons.more_vert),
                color: onSurfaceVariant,
                onPressed: () {},
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- 2. Thẻ hiển thị chỉ số sinh tồn (Pinned Vitals) ---
  Widget _buildPinnedVitalsCard() {
    return Center(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 384), // max-w-sm
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: surface.withOpacity(0.9), // Backdrop blur
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: surfaceVariant),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 1)),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: secondaryContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.monitor_heart, color: onSecondaryContainer, size: 20),
                ),
                const SizedBox(width: 12),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'PRE-CONSULT VITALS',
                      style: TextStyle(fontFamily: 'Public Sans', fontSize: 10, fontWeight: FontWeight.w600, color: primary, letterSpacing: 0.5),
                    ),
                    Text(
                      'BP: 120/80 • HR: 72 bpm',
                      style: TextStyle(fontFamily: 'Public Sans', fontSize: 14, color: onSurfaceVariant),
                    ),
                  ],
                ),
              ],
            ),
            TextButton(
              onPressed: () {},
              style: TextButton.styleFrom(
                padding: EdgeInsets.zero,
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: const Text(
                'View All',
                style: TextStyle(fontFamily: 'Public Sans', fontSize: 12, fontWeight: FontWeight.w500, color: primary, decoration: TextDecoration.underline),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- 3. Nhãn ngày tháng (Date Separator) ---
  Widget _buildDateSeparator(String text) {
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: surfaceVariant,
          borderRadius: BorderRadius.circular(100),
        ),
        child: Text(
          text,
          style: const TextStyle(fontFamily: 'Public Sans', fontSize: 12, fontWeight: FontWeight.w500, color: outline),
        ),
      ),
    );
  }

  // --- 4. Bong bóng Chat của Bác sĩ (Bên trái) ---
  Widget _buildDoctorBubble({required String message, required String time, required String avatarUrl}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32,
          height: 32,
          margin: const EdgeInsets.only(top: 4),
          decoration: const BoxDecoration(shape: BoxShape.circle, color: surfaceVariant),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Image.asset(avatarUrl, fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => const Icon(Icons.person, size: 20, color: outline),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: chatDoctor,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(4),  // Bo nhẹ góc trên trái
                    topRight: Radius.circular(16),
                    bottomLeft: Radius.circular(16),
                    bottomRight: Radius.circular(16),
                  ),
                  border: Border.all(color: surfaceVariant.withOpacity(0.5)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 2, offset: const Offset(0, 1)),
                  ],
                ),
                child: Text(
                  message,
                  style: const TextStyle(fontFamily: 'Public Sans', fontSize: 14, color: onSurfaceVariant, height: 1.4),
                ),
              ),
              const SizedBox(height: 4),
              Padding(
                padding: const EdgeInsets.only(left: 4.0),
                child: Text(time, style: const TextStyle(fontFamily: 'Public Sans', fontSize: 10, color: outline)),
              ),
            ],
          ),
        ),
        const SizedBox(width: 48), // Khoảng trống để bong bóng không chiếm full màn hình
      ],
    );
  }

  // --- 5. Bong bóng Chat của Bệnh nhân (Bên phải) ---
  Widget _buildPatientBubble({required String message, required String time, required bool isRead}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        const SizedBox(width: 48), // Giới hạn max-width
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: chatPatient,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    topRight: Radius.circular(4), // Bo nhẹ góc trên phải
                    bottomLeft: Radius.circular(16),
                    bottomRight: Radius.circular(16),
                  ),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4, offset: const Offset(0, 2)),
                  ],
                ),
                child: Text(
                  message,
                  style: const TextStyle(fontFamily: 'Public Sans', fontSize: 14, color: Colors.white, height: 1.4),
                ),
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(time, style: const TextStyle(fontFamily: 'Public Sans', fontSize: 10, color: outline)),
                  const SizedBox(width: 4),
                  Icon(
                    isRead ? Icons.done_all : Icons.check,
                    size: 14,
                    color: isRead ? primary : outline,
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  // --- 6. Khu vực nhập tin nhắn (Input Area) ---
  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: surface,
        border: const Border(top: BorderSide(color: surfaceVariant)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -4)),
        ],
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: surfaceContainerHigh,
          borderRadius: BorderRadius.circular(100),
          border: Border.all(color: surfaceVariant),
        ),
        child: Row(
          children: [
            IconButton(
              icon: const Icon(Icons.add),
              color: primary,
              onPressed: () {},
            ),
            Expanded(
              child: TextField(
                controller: _messageController,
                style: const TextStyle(fontFamily: 'Public Sans', fontSize: 14, color: onSurfaceVariant),
                decoration: const InputDecoration(
                  hintText: 'Type a message...',
                  hintStyle: TextStyle(color: outline),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(vertical: 10),
                ),
              ),
            ),
            Container(
              decoration: BoxDecoration(
                color: primary,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(color: primary.withOpacity(0.3), blurRadius: 6, offset: const Offset(0, 2)),
                ],
              ),
              child: IconButton(
                icon: const Icon(Icons.send, size: 20),
                color: Colors.white,
                onPressed: () {
                  // Xử lý gửi tin nhắn
                  _messageController.clear();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}