import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/doctor/doctor_service.dart';

class DoctorReviewsScreen extends StatefulWidget {
  const DoctorReviewsScreen({super.key});

  @override
  State<DoctorReviewsScreen> createState() => _DoctorReviewsScreenState();
}

const _pageSize = 10;

class _DoctorReviewsScreenState extends State<DoctorReviewsScreen> {
  bool _isLoading = true;
  bool _isLoadingPage = false;
  String? _error;
  Map<String, dynamic> _stats = {};
  List<dynamic> _reviews = [];

  int _page = 0;
  int _totalPages = 1;
  bool _hasNext = false;
  bool _hasPrevious = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData({bool keepStats = false}) async {
    setState(() {
      _isLoading = !keepStats;
      _isLoadingPage = keepStats;
      _error = null;
    });

    try {
      final auth = context.read<AuthProvider>();
      final token = auth.accessToken;
      if (token == null) throw Exception('Not authenticated');

      final futures = <Future>[
        DoctorService.getReviews(token, page: _page, size: _pageSize),
      ];
      if (!keepStats) {
        futures.add(DoctorService.getReviewStats(token));
      }
      final results = await Future.wait(futures);

      if (mounted) {
        setState(() {
          final reviewsData = results[0] as Map<String, dynamic>;
          if (!keepStats) _stats = results[1] as Map<String, dynamic>;
          _reviews = reviewsData['reviews'] as List<dynamic>? ??
              reviewsData['content'] as List<dynamic>? ??
              reviewsData['items'] as List<dynamic>? ??
              [];
          _totalPages = (reviewsData['totalPages'] as num?)?.toInt() ?? 1;
          _hasNext = reviewsData['hasNext'] as bool? ?? (_page < _totalPages - 1);
          _hasPrevious = reviewsData['hasPrevious'] as bool? ?? (_page > 0);
          _isLoading = false;
          _isLoadingPage = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
          _isLoadingPage = false;
        });
      }
    }
  }

  void _goToPage(int page) {
    if (page == _page || page < 0) return;
    setState(() => _page = page);
    _loadData(keepStats: true);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        title: const Text('Reviews'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorWidget()
              : RefreshIndicator(
                  onRefresh: () {
                    _page = 0;
                    return _loadData();
                  },
                  child: CustomScrollView(
                    slivers: [
                      SliverToBoxAdapter(
                        child: _buildStatsHeader(theme),
                      ),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Text(
                            'Patient Reviews',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      if (_isLoadingPage)
                        const SliverToBoxAdapter(
                          child: Padding(
                            padding: EdgeInsets.symmetric(vertical: 24),
                            child: Center(child: CircularProgressIndicator()),
                          ),
                        )
                      else if (_reviews.isEmpty)
                        const SliverFillRemaining(
                          child: Center(
                            child: Text('No reviews yet'),
                          ),
                        )
                      else
                        SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              return _buildReviewCard(theme, _reviews[index]);
                            },
                            childCount: _reviews.length,
                          ),
                        ),
                      if (!_isLoadingPage && _totalPages > 1)
                        SliverToBoxAdapter(child: _buildPagination()),
                    ],
                  ),
                ),
    );
  }

  Widget _buildPagination() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          TextButton.icon(
            onPressed: _hasPrevious ? () => _goToPage(_page - 1) : null,
            icon: const Icon(Icons.chevron_left, size: 18),
            label: const Text('Previous'),
          ),
          const SizedBox(width: 8),
          Text('Page ${_page + 1} of $_totalPages'),
          const SizedBox(width: 8),
          TextButton.icon(
            onPressed: _hasNext ? () => _goToPage(_page + 1) : null,
            icon: const Icon(Icons.chevron_right, size: 18),
            label: const Text('Next'),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorWidget() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
            const SizedBox(height: 16),
            Text(
              'Failed to load reviews',
              style: TextStyle(fontSize: 18, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? '',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsHeader(ThemeData theme) {
    final averageRating = (_stats['averageRating'] as num?)?.toDouble() ?? 0.0;
    final totalReviews = _stats['totalReviews'] as int? ?? 0;
    final ratingDistribution = _stats['ratingDistribution'] as Map<String, dynamic>? ?? {};

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            theme.colorScheme.primary,
            theme.colorScheme.primary.withOpacity(0.8),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Column(
                children: [
                  Text(
                    averageRating.toStringAsFixed(1),
                    style: const TextStyle(
                      fontSize: 48,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  Row(
                    children: List.generate(5, (index) {
                      return Icon(
                        index < averageRating.round()
                            ? Icons.star
                            : Icons.star_border,
                        color: Colors.amber,
                        size: 24,
                      );
                    }),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '$totalReviews reviews',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.white.withOpacity(0.9),
                    ),
                  ),
                ],
              ),
            ],
          ),
          if (ratingDistribution.isNotEmpty) ...[
            const SizedBox(height: 24),
            ...List.generate(5, (index) {
              final rating = 5 - index;
              final count = ratingDistribution['$rating'] as int? ?? 0;
              final percentage = totalReviews > 0 ? count / totalReviews : 0.0;

              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Text(
                      '$rating',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.star, color: Colors.amber, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: percentage,
                          backgroundColor: Colors.white.withOpacity(0.2),
                          valueColor: const AlwaysStoppedAnimation(Colors.amber),
                          minHeight: 8,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '$count',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.9),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildResponseStat('${_stats['totalReplied'] ?? 0}', 'Replied', Colors.white),
                Container(width: 1, height: 32, color: Colors.white.withOpacity(0.25)),
                _buildResponseStat('${_stats['totalPendingReply'] ?? 0}', 'Pending', Colors.amber.shade200),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResponseStat(String value, String label, Color color) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 2),
        Text(label, style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.85))),
      ],
    );
  }

  Future<void> _openReplyDialog(dynamic review) async {
    final reviewId = (review['reviewId'] as num?)?.toInt();
    if (reviewId == null) return;
    final existingReply = review['doctorReply'] as String?;
    final controller = TextEditingController(text: existingReply ?? '');
    bool submitting = false;

    final submitted = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text(existingReply == null ? 'Reply to review' : 'Edit reply'),
          content: TextField(
            controller: controller,
            maxLines: 4,
            maxLength: 1000,
            autofocus: true,
            decoration: const InputDecoration(
              hintText: 'Write your reply... (minimum 5 characters)',
              border: OutlineInputBorder(),
            ),
          ),
          actions: [
            TextButton(
              onPressed: submitting ? null : () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: submitting || controller.text.trim().length < 5
                  ? null
                  : () async {
                      setDialogState(() => submitting = true);
                      try {
                        final auth = context.read<AuthProvider>();
                        final token = auth.accessToken;
                        if (token == null) throw Exception('Not authenticated');
                        await DoctorService.replyToReview(token, reviewId, controller.text.trim());
                        if (ctx.mounted) Navigator.pop(ctx, true);
                      } catch (e) {
                        setDialogState(() => submitting = false);
                        if (ctx.mounted) {
                          ScaffoldMessenger.of(ctx).showSnackBar(
                            SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
                          );
                        }
                      }
                    },
              child: submitting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Submit'),
            ),
          ],
        ),
      ),
    );

    if (submitted == true) {
      _loadData();
    }
  }

  Widget _buildReviewCard(ThemeData theme, dynamic review) {
    final patientName = review['patientName'] as String? ?? 'Anonymous';
    final rating = (review['rating'] as num?)?.toInt() ?? 0;
    final comment = review['comment'] as String? ?? '';
    final createdAt = DateTime.tryParse(
        (review['reviewDate'] ?? review['createdAt'])?.toString() ?? '');
    final dateFormat = DateFormat('dd MMM yyyy');
    final doctorReply = review['doctorReply'] as String?;
    final doctorReplyDate = DateTime.tryParse(review['doctorReplyDate']?.toString() ?? '');
    final adminReply = review['adminReply'] as String?;
    final adminReplyDate = DateTime.tryParse(review['adminReplyDate']?.toString() ?? '');

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.outlineVariant),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                child: Text(
                  patientName.isNotEmpty ? patientName[0].toUpperCase() : '?',
                  style: TextStyle(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      patientName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Row(
                      children: [
                        ...List.generate(5, (index) {
                          return Icon(
                            index < rating ? Icons.star : Icons.star_border,
                            color: Colors.amber,
                            size: 16,
                          );
                        }),
                        if (createdAt != null) ...[
                          const SizedBox(width: 8),
                          Text(
                            dateFormat.format(createdAt),
                            style: TextStyle(
                              fontSize: 12,
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (comment.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              comment,
              style: TextStyle(
                fontSize: 14,
                color: theme.colorScheme.onSurface,
              ),
            ),
          ],
          if (doctorReply != null && doctorReply.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withOpacity(0.06),
                borderRadius: BorderRadius.circular(8),
                border: Border(left: BorderSide(color: theme.colorScheme.primary, width: 3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.reply, size: 14, color: theme.colorScheme.primary),
                      const SizedBox(width: 6),
                      Text('Your reply', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: theme.colorScheme.primary)),
                      if (doctorReplyDate != null) ...[
                        const Spacer(),
                        Text(dateFormat.format(doctorReplyDate), style: TextStyle(fontSize: 11, color: theme.colorScheme.onSurfaceVariant)),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(doctorReply, style: const TextStyle(fontSize: 13)),
                ],
              ),
            ),
          ],
          if (adminReply != null && adminReply.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber.withOpacity(0.08),
                borderRadius: BorderRadius.circular(8),
                border: const Border(left: BorderSide(color: Colors.amber, width: 3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.verified, size: 14, color: Colors.amber),
                      const SizedBox(width: 6),
                      const Text('HealthLink response', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.amber)),
                      if (adminReplyDate != null) ...[
                        const Spacer(),
                        Text(dateFormat.format(adminReplyDate), style: TextStyle(fontSize: 11, color: theme.colorScheme.onSurfaceVariant)),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(adminReply, style: const TextStyle(fontSize: 13)),
                ],
              ),
            ),
          ],
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: () => _openReplyDialog(review),
              icon: Icon(doctorReply != null && doctorReply.isNotEmpty ? Icons.edit_outlined : Icons.reply, size: 16),
              label: Text(doctorReply != null && doctorReply.isNotEmpty ? 'Edit Reply' : 'Reply'),
            ),
          ),
        ],
      ),
    );
  }
}
