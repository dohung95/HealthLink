import 'package:flutter/material.dart';
import '../../config/doctor_theme.dart';

// ============================================
// BACK HEADER
// ============================================

class DoctorBackHeader extends StatelessWidget {
  final String title;
  final VoidCallback onBack;
  final Widget? action;

  const DoctorBackHeader({
    super.key,
    required this.title,
    required this.onBack,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 8,
        left: 4,
        right: 16,
        bottom: 8,
      ),
      decoration: BoxDecoration(
        color: DS.card,
        border: Border(
          bottom: BorderSide(color: DS.cardBorder.withOpacity(0.5)),
        ),
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: onBack,
            icon: const Icon(Icons.chevron_left, size: 28),
          ),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: DS.foreground,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (action != null) action!,
        ],
      ),
    );
  }
}

// ============================================
// CURVED HEADER
// ============================================

class DoctorCurvedHeader extends StatelessWidget {
  final Widget child;

  const DoctorCurvedHeader({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: DS.headerDecoration,
      child: SafeArea(
        bottom: false,
        child: child,
      ),
    );
  }
}

// ============================================
// PERSON AVATAR
// ============================================

class DoctorPersonAvatar extends StatelessWidget {
  final String name;
  final String? imageUrl;
  final double size;
  final Color? borderColor;
  final double borderWidth;

  const DoctorPersonAvatar({
    super.key,
    required this.name,
    this.imageUrl,
    this.size = 48,
    this.borderColor,
    this.borderWidth = 0,
  });

  String get _initials {
    final clean = name
        .replaceAll(RegExp(r'^\s*(dr\.?|bs\.?)\s*', caseSensitive: false), '')
        .trim();
    final parts = clean.split(RegExp(r'\s+'));
    final first = parts.isNotEmpty ? parts[0] : '';
    final second = parts.length > 1 ? parts[1] : '';
    return '${first.isNotEmpty ? first[0] : ''}${second.isNotEmpty ? second[0] : ''}'
        .toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    Widget avatar = CircleAvatar(
      radius: size / 2,
      backgroundColor: DS.primary.withOpacity(0.15),
      backgroundImage:
          imageUrl != null && imageUrl!.isNotEmpty ? NetworkImage(imageUrl!) : null,
      child: imageUrl == null || imageUrl!.isEmpty
          ? Text(
              _initials,
              style: TextStyle(
                fontSize: size * 0.35,
                fontWeight: FontWeight.w600,
                color: DS.primary,
              ),
            )
          : null,
    );

    if (borderWidth > 0 && borderColor != null) {
      avatar = Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: borderColor!, width: borderWidth),
        ),
        child: avatar,
      );
    }

    return avatar;
  }
}

// ============================================
// EMPTY STATE
// ============================================

class DoctorEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const DoctorEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: const BoxDecoration(
              color: DS.secondary,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              size: 28,
              color: DS.mutedForeground.withOpacity(0.6),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: DS.foreground,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 14,
              color: DS.mutedForeground,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

// ============================================
// STATUS BADGE
// ============================================

class DoctorStatusBadge extends StatelessWidget {
  final String status;
  final bool small;

  const DoctorStatusBadge({
    super.key,
    required this.status,
    this.small = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = DS.getStatusColor(status);
    final bgColor = DS.getStatusBgColor(status);
    final label = DS.getStatusLabel(status);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: small ? 8 : 10,
        vertical: small ? 2 : 4,
      ),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(small ? 6 : 8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: small ? 10 : 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}

// ============================================
// SECTION LABEL
// ============================================

class DoctorSectionLabel extends StatelessWidget {
  final String text;

  const DoctorSectionLabel(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.5,
        color: DS.mutedForeground,
      ),
    );
  }
}

// ============================================
// FILTER CHIP
// ============================================

class DoctorFilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;

  const DoctorFilterChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? DS.primary : DS.card,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? DS.primary : DS.cardBorder,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: 14,
                color: selected ? DS.primaryForeground : DS.mutedForeground,
              ),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: selected ? DS.primaryForeground : DS.mutedForeground,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================
// INFO ROW
// ============================================

class DoctorInfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const DoctorInfoRow({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: DS.secondary,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: DS.mutedForeground),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    color: DS.mutedForeground,
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: DS.foreground,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================
// STAT CARD
// ============================================

class DoctorStatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color iconColor;
  final Color backgroundColor;

  const DoctorStatCard({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    required this.iconColor,
    required this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: DS.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: backgroundColor,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: iconColor),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: DS.foreground,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: DS.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================
// CONSULTATION TYPE PILL
// ============================================

class DoctorConsultationPill extends StatelessWidget {
  final String type;

  const DoctorConsultationPill({super.key, required this.type});

  IconData get _icon {
    switch (type.toUpperCase()) {
      case 'VIDEO':
        return Icons.videocam;
      case 'AUDIO':
        return Icons.phone;
      case 'CHAT':
        return Icons.chat_bubble_outline;
      default:
        return Icons.person;
    }
  }

  String get _label {
    final t = type.toLowerCase();
    return t[0].toUpperCase() + t.substring(1);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: DS.secondary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_icon, size: 12, color: DS.mutedForeground),
          const SizedBox(width: 4),
          Text(
            _label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: DS.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================
// MENU ITEM
// ============================================

class DoctorMenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subtitle;
  final VoidCallback onTap;
  final Widget? trailing;

  const DoctorMenuItem({
    super.key,
    required this.icon,
    required this.label,
    this.subtitle,
    required this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: DS.secondary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 18, color: DS.mutedForeground),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: DS.foreground,
                    ),
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle!,
                      style: const TextStyle(
                        fontSize: 12,
                        color: DS.mutedForeground,
                      ),
                    ),
                ],
              ),
            ),
            trailing ??
                const Icon(
                  Icons.chevron_right,
                  size: 20,
                  color: DS.mutedForeground,
                ),
          ],
        ),
      ),
    );
  }
}

// ============================================
// DATE SELECTOR ITEM
// ============================================

class DoctorDateItem extends StatelessWidget {
  final String dayLabel;
  final int dayNumber;
  final bool isSelected;
  final bool isToday;
  final VoidCallback onTap;

  const DoctorDateItem({
    super.key,
    required this.dayLabel,
    required this.dayNumber,
    required this.isSelected,
    required this.isToday,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 48,
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? DS.primary : DS.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? DS.primary : DS.cardBorder,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              dayLabel,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: isSelected
                    ? DS.primaryForeground.withOpacity(0.8)
                    : DS.mutedForeground,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '$dayNumber',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: isSelected ? DS.primaryForeground : DS.foreground,
              ),
            ),
            const SizedBox(height: 4),
            Container(
              width: 5,
              height: 5,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isToday
                    ? (isSelected ? DS.primaryForeground : DS.primary)
                    : Colors.transparent,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
