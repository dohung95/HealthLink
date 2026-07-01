import 'package:flutter/material.dart';
import '../../config/doctor_theme.dart';
import '../../widgets/doctor/doctor_widgets.dart';
import 'doctor_change_password_screen.dart';
import 'doctor_change_email_screen.dart';
import 'doctor_change_phone_screen.dart';
import 'doctor_change_paypal_email_screen.dart';

class DoctorSecurityScreen extends StatelessWidget {
  const DoctorSecurityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DS.background,
      body: Column(
        children: [
          DoctorBackHeader(title: 'Privacy & Security', onBack: () => Navigator.pop(context)),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: DS.cardDecoration,
                child: Column(
                  children: [
                    DoctorMenuItem(
                      icon: Icons.key_outlined,
                      label: 'Change Password',
                      subtitle: 'Update your login password',
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DoctorChangePasswordScreen())),
                    ),
                    const Divider(height: 1, color: DS.cardBorder),
                    DoctorMenuItem(
                      icon: Icons.alternate_email_rounded,
                      label: 'Change Email',
                      subtitle: 'Update your login email',
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DoctorChangeEmailScreen())),
                    ),
                    const Divider(height: 1, color: DS.cardBorder),
                    DoctorMenuItem(
                      icon: Icons.phone_outlined,
                      label: 'Change Phone Number',
                      subtitle: 'Verified with a code sent to your email',
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DoctorChangePhoneScreen())),
                    ),
                    const Divider(height: 1, color: DS.cardBorder),
                    DoctorMenuItem(
                      icon: Icons.account_balance_wallet_outlined,
                      label: 'Change PayPal Email',
                      subtitle: 'Update where your earnings are sent',
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DoctorChangePaypalEmailScreen())),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
