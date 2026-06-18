import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class HelpSupportScreen extends StatefulWidget {
  const HelpSupportScreen({super.key});

  @override
  State<HelpSupportScreen> createState() => _HelpSupportScreenState();
}

class _HelpSupportScreenState extends State<HelpSupportScreen> {
  final TextEditingController _searchController = TextEditingController();

  String _selectedCategory = 'All';
  String _searchKeyword = '';

  static const String _supportEmail = 'support@healthlink.vn';

  final List<String> _categories = const [
    'All',
    'Booking',
    'Appointments',
    'Health Records',
    'Consultation',
    'Account',
  ];

  final List<_FaqItem> _faqItems = const [
    _FaqItem(
      category: 'Booking',
      question: 'How do I book an appointment?',
      answer:
      'Open the Booking tab, select a specialty, doctor, consultation '
          'type, available date and time. Complete your medical information '
          'and payment to confirm the appointment.',
    ),
    _FaqItem(
      category: 'Booking',
      question: 'Why is a date shown without available time slots?',
      answer:
      'The doctor may work on that day, but all slots may already be '
          'booked, temporarily held, expired, or unavailable for the selected '
          'consultation type.',
    ),
    _FaqItem(
      category: 'Booking',
      question: 'Why did my selected slot become unavailable?',
      answer:
      'A selected slot is held temporarily. If payment is not completed '
          'before the hold expires, the slot becomes available to other patients.',
    ),
    _FaqItem(
      category: 'Appointments',
      question: 'How can I reschedule an appointment?',
      answer:
      'Open Appointments and select Reschedule. Rescheduling is only '
          'available for active appointments that are more than two hours away.',
    ),
    _FaqItem(
      category: 'Appointments',
      question: 'What does Expired mean?',
      answer:
      'Expired means the appointment time has already passed while the '
          'appointment was not completed or cancelled.',
    ),
    _FaqItem(
      category: 'Appointments',
      question: 'When can I join a consultation?',
      answer:
      'The Join Room or Chat button becomes available when the doctor '
          'starts the consultation. Please refresh the appointment list if '
          'the button does not appear.',
    ),
    _FaqItem(
      category: 'Health Records',
      question: 'What is Date Performed?',
      answer:
      'Date Performed is the date when the medical examination, scan, '
          'laboratory test or document was created. It is different from the '
          'date when you upload the file.',
    ),
    _FaqItem(
      category: 'Health Records',
      question: 'Why can I not upload a medical image?',
      answer:
      'The file may be unsupported, too large, unavailable on the device, '
          'or rejected by the image safety scanner. Supported formats include '
          'PDF, JPG and PNG.',
    ),
    _FaqItem(
      category: 'Health Records',
      question: 'Can I share only selected documents?',
      answer:
      'Yes. Select a health record, choose the documents you want to '
          'share, then select a specialty and doctor.',
    ),
    _FaqItem(
      category: 'Health Records',
      question: 'How do I stop sharing a health record?',
      answer:
      'Open Share Health Records, find the active share and select Revoke '
          'Access. The doctor will no longer be able to access that share.',
    ),
    _FaqItem(
      category: 'Consultation',
      question: 'What should I prepare before a consultation?',
      answer:
      'Prepare your symptoms, medical documents and recent health readings '
          'such as heart rate, blood pressure, temperature and SpO₂ if available.',
    ),
    _FaqItem(
      category: 'Consultation',
      question: 'What should I do if Chat or Video Call does not connect?',
      answer:
      'Check your internet connection and application permissions. Return '
          'to Appointments and try joining again. Contact support if the issue continues.',
    ),
    _FaqItem(
      category: 'Account',
      question: 'How do I change my email or password?',
      answer:
      'Open the menu and select Security. You can change your email using '
          'a verification code or update your password after entering your current password.',
    ),
  ];

  List<_FaqItem> get _filteredFaqItems {
    final keyword = _searchKeyword.trim().toLowerCase();

    return _faqItems.where((item) {
      final matchesCategory = _selectedCategory == 'All' ||
          item.category == _selectedCategory;

      final matchesKeyword = keyword.isEmpty ||
          item.question.toLowerCase().contains(keyword) ||
          item.answer.toLowerCase().contains(keyword) ||
          item.category.toLowerCase().contains(keyword);

      return matchesCategory && matchesKeyword;
    }).toList();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _sendSupportEmail() async {
    final uri = Uri(
      scheme: 'mailto',
      path: _supportEmail,
      queryParameters: {
        'subject': 'HealthLink Mobile Support Request',
        'body': '''
Hello HealthLink Support,

Please describe your issue below:

Issue:
Steps to reproduce:
Expected result:
Actual result:

Thank you.
''',
      },
    );

    await _launchExternalUri(
      uri,
      errorMessage: 'No email application is available.',
    );
  }

  Future<void> _callEmergencyService() async {
    await _launchExternalUri(
      Uri(scheme: 'tel', path: '115'),
      errorMessage: 'Unable to open the phone application.',
    );
  }

  Future<void> _launchExternalUri(
      Uri uri, {
        required String errorMessage,
      }) async {
    try {
      final opened = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );

      if (!opened && mounted) {
        _showMessage(errorMessage);
      }
    } catch (_) {
      if (mounted) {
        _showMessage(errorMessage);
      }
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colors.surface,
      appBar: AppBar(
        title: const Text('Help & Support'),
        centerTitle: true,
        backgroundColor: colors.surface,
        surfaceTintColor: Colors.transparent,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          children: [
            _buildHeader(context),
            const SizedBox(height: 20),

            _buildEmergencyCard(context),
            const SizedBox(height: 24),

            Text(
              'Frequently Asked Questions',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _searchController,
              onChanged: (value) {
                setState(() {
                  _searchKeyword = value;
                });
              },
              decoration: InputDecoration(
                hintText: 'Search for help...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchKeyword.isNotEmpty
                    ? IconButton(
                  onPressed: () {
                    _searchController.clear();

                    setState(() {
                      _searchKeyword = '';
                    });
                  },
                  icon: const Icon(Icons.close),
                )
                    : null,
                filled: true,
                fillColor: colors.surfaceContainerLow,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(
                    color: colors.outlineVariant,
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(
                    color: colors.outlineVariant,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 14),

            SizedBox(
              height: 42,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _categories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final category = _categories[index];
                  final selected = category == _selectedCategory;

                  return ChoiceChip(
                    label: Text(category),
                    selected: selected,
                    onSelected: (_) {
                      setState(() {
                        _selectedCategory = category;
                      });
                    },
                  );
                },
              ),
            ),
            const SizedBox(height: 16),

            if (_filteredFaqItems.isEmpty)
              _buildEmptyState(context)
            else
              ..._filteredFaqItems.map(
                    (item) => _buildFaqCard(context, item),
              ),

            const SizedBox(height: 24),

            Text(
              'Contact Support',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),

            _buildContactCard(
              context,
              icon: Icons.email_outlined,
              title: 'Email Support',
              subtitle: _supportEmail,
              onTap: _sendSupportEmail,
            ),
            const SizedBox(height: 10),

            const SizedBox(height: 24),
            _buildPrivacyNotice(context),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colors.primaryContainer,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: colors.onPrimary,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.support_agent,
              color: colors.primary,
              size: 30,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'How can we help?',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: colors.onPrimary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Find answers or contact the HealthLink support team.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: colors.onPrimary.withValues(alpha: 0.85),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmergencyCard(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.errorContainer,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.error),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.emergency_outlined,
                color: colors.error,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Medical Emergency',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: colors.onErrorContainer,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'HealthLink is not an emergency service. If you are experiencing '
                'a medical emergency, contact emergency services immediately.',
            style: TextStyle(
              color: colors.onErrorContainer,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _callEmergencyService,
            style: FilledButton.styleFrom(
              backgroundColor: colors.error,
              foregroundColor: colors.onError,
            ),
            icon: const Icon(Icons.call),
            label: const Text('Call 115'),
          ),
        ],
      ),
    );
  }

  Widget _buildFaqCard(
      BuildContext context,
      _FaqItem item,
      ) {
    final colors = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      color: colors.surfaceContainerLow,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: colors.outlineVariant),
      ),
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        leading: Icon(
          _categoryIcon(item.category),
          color: colors.primary,
        ),
        title: Text(
          item.question,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(
          item.category,
          style: TextStyle(
            color: colors.primary,
            fontSize: 12,
          ),
        ),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
        expandedCrossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Divider(color: colors.outlineVariant),
          const SizedBox(height: 6),
          Text(
            item.answer,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              height: 1.5,
              color: colors.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContactCard(
      BuildContext context, {
        required IconData icon,
        required String title,
        required String subtitle,
        required VoidCallback onTap,
      }) {
    final colors = Theme.of(context).colorScheme;

    return Material(
      color: colors.surfaceContainerLow,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: colors.outlineVariant),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(11),
                decoration: BoxDecoration(
                  color: colors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: colors.primary),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: colors.onSurfaceVariant,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: colors.outline,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 40),
      alignment: Alignment.center,
      child: Column(
        children: [
          Icon(
            Icons.search_off,
            size: 48,
            color: colors.outline,
          ),
          const SizedBox(height: 12),
          const Text(
            'No matching help topics found.',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(
            'Try another keyword or category.',
            style: TextStyle(color: colors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }

  Widget _buildPrivacyNotice(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          Icons.privacy_tip_outlined,
          size: 20,
          color: colors.outline,
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            'Do not include passwords, payment credentials or unnecessary '
                'medical information in your support email.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: colors.onSurfaceVariant,
              height: 1.4,
            ),
          ),
        ),
      ],
    );
  }

  IconData _categoryIcon(String category) {
    switch (category) {
      case 'Booking':
        return Icons.calendar_month_outlined;
      case 'Appointments':
        return Icons.event_note_outlined;
      case 'Health Records':
        return Icons.folder_outlined;
      case 'Consultation':
        return Icons.video_call_outlined;
      case 'Account':
        return Icons.manage_accounts_outlined;
      default:
        return Icons.help_outline;
    }
  }
}

class _FaqItem {
  const _FaqItem({
    required this.category,
    required this.question,
    required this.answer,
  });

  final String category;
  final String question;
  final String answer;
}