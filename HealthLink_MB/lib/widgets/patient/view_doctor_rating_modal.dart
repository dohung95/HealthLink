import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/appointments/appointment_service.dart';
import '../../services/patient/patient_review_service.dart';
import '../../l10n/app_localizations.dart';

class ViewDoctorRatingModal extends StatefulWidget {
  final PatientAppointment appointment;

  const ViewDoctorRatingModal({Key? key, required this.appointment}) : super(key: key);

  @override
  State<ViewDoctorRatingModal> createState() => _ViewDoctorRatingModalState();
}

class _ViewDoctorRatingModalState extends State<ViewDoctorRatingModal> {
  Map<String, dynamic>? _reviewData;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchReview();
  }

  Future<void> _fetchReview() async {
    try {
      final auth = context.read<AuthProvider>();
      if (auth.accessToken == null) return;
      
      final data = await PatientReviewService.getReviewByAppointment(
        auth.accessToken!, 
        widget.appointment.appointmentId
      );
      
      if (mounted) {
        setState(() {
          _reviewData = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: colors.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    AppLocalizations.of(context)!.rateExperienceTitle ?? 'Your Review', // Maybe reuse the title or a generic one if null. Actually let's use btnReviewed text or similar
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Doctor Info
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: colors.surfaceContainerHighest.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const CircleAvatar(
                      radius: 24,
                      child: Icon(Icons.person),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.appointment.doctorName,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          Text(
                            widget.appointment.specialtyName,
                            style: TextStyle(color: colors.onSurfaceVariant, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              if (_isLoading)
                const Center(child: CircularProgressIndicator())
              else if (_error != null || _reviewData == null)
                Center(
                  child: Text(
                    _error ?? 'Review not found.',
                    style: TextStyle(color: colors.error),
                  ),
                )
              else
                ...[
                  // Rating Stars
                  Text(AppLocalizations.of(context)!.ratingLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (index) {
                      final rating = _reviewData!['rating'] as int? ?? 0;
                      return Icon(
                        index < rating ? Icons.star : Icons.star_border,
                        color: Colors.amber,
                        size: 40,
                      );
                    }),
                  ),
                  const SizedBox(height: 24),

                  // Comment
                  Text(AppLocalizations.of(context)!.commentLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: colors.surfaceContainerHighest.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: colors.outlineVariant.withValues(alpha: 0.5)),
                    ),
                    child: Text(
                      _reviewData!['comment']?.toString() ?? '',
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Anonymous Checkbox read-only indicator
                  if (_reviewData!['anonymous'] == true)
                    Row(
                      children: [
                        Icon(Icons.visibility_off, size: 16, color: colors.onSurfaceVariant),
                        const SizedBox(width: 8),
                        Text(
                          AppLocalizations.of(context)!.postAnonymously,
                          style: TextStyle(fontSize: 14, color: colors.onSurfaceVariant, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  const SizedBox(height: 24),
                ],
            ],
          ),
        ),
      ),
    );
  }
}
