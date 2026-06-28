import 'package:flutter/material.dart';
import '../../l10n/app_localizations.dart';

class AboutUsScreen extends StatelessWidget {
  const AboutUsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)!.aboutTitle),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            const SizedBox(height: 20),
            // App Logo & Name
            Center(
              child: Column(
                children: [
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: colorScheme.primary.withValues(alpha: 0.2),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Image.asset(
                        'assets/images/logo.png',
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) => Icon(
                          Icons.health_and_safety,
                          size: 50,
                          color: colorScheme.primary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'HealthLink',
                    style: textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: colorScheme.primary,
                      fontFamily: 'Sora',
                    ),
                  ),
                  Text(
                    AppLocalizations.of(context)!.aboutVersion('1.0.0'),
                    style: textTheme.bodySmall?.copyWith(
                      color: colorScheme.outline,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Mission Statement
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSectionTitle(context, AppLocalizations.of(context)!.aboutMission),
                  const SizedBox(height: 12),
                  Text(
                    AppLocalizations.of(context)!.aboutMissionDesc,
                    style: textTheme.bodyMedium?.copyWith(
                      height: 1.6,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Key Features
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSectionTitle(context, AppLocalizations.of(context)!.aboutCoreFeatures),
                  const SizedBox(height: 16),
                  _buildFeatureItem(
                    context,
                    icon: Icons.videocam_outlined,
                    title: AppLocalizations.of(context)!.aboutFeatVideo,
                    description: AppLocalizations.of(context)!.aboutFeatVideoDesc,
                  ),
                  _buildFeatureItem(
                    context,
                    icon: Icons.description_outlined,
                    title: AppLocalizations.of(context)!.aboutFeatRecords,
                    description: AppLocalizations.of(context)!.aboutFeatRecordsDesc,
                  ),
                  _buildFeatureItem(
                    context,
                    icon: Icons.smart_toy_outlined,
                    title: AppLocalizations.of(context)!.aboutFeatAI,
                    description: AppLocalizations.of(context)!.aboutFeatAIDesc,
                  ),
                  _buildFeatureItem(
                    context,
                    icon: Icons.chat_bubble_outline,
                    title: AppLocalizations.of(context)!.aboutFeatConnection,
                    description: AppLocalizations.of(context)!.aboutFeatConnectionDesc,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Contact Info
            Container(
              width: double.infinity,
              margin: const EdgeInsets.symmetric(horizontal: 24),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: colorScheme.outlineVariant),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSectionTitle(context, AppLocalizations.of(context)!.aboutContactUs),
                  const SizedBox(height: 16),
                  _buildContactRow(context, Icons.mail_outline, 'HealthLink@gmail.com   support@healthlink.com'),
                  const SizedBox(height: 12),
                  _buildContactRow(context, Icons.phone_outlined, '+84 (028) 1234 5678   +84 (028) 8765 4321'),
                  const SizedBox(height: 12),
                  _buildContactRow(context, Icons.language_outlined, 'www.healthlink.vn'),
                  const SizedBox(height: 12),
                  _buildContactRow(context, Icons.location_on_outlined, '21 bis Hau Giang, Tan Son Nhat Ward, Ho Chi Minh City.'),
                ],
              ),
            ),

            const SizedBox(height: 40),
            
            // Footer
            Text(
              AppLocalizations.of(context)!.aboutFooter,
              style: textTheme.labelSmall?.copyWith(
                color: colorScheme.outline,
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(BuildContext context, String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
            fontFamily: 'Sora',
            color: Theme.of(context).colorScheme.onSurface,
          ),
    );
  }

  Widget _buildFeatureItem(BuildContext context, {required IconData icon, required String title, required String description}) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 20.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: colorScheme.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: colorScheme.primary, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContactRow(BuildContext context, IconData icon, String text) {
    final colorScheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        Icon(icon, size: 20, color: colorScheme.primary),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurface,
                ),
          ),
        ),
      ],
    );
  }
}
