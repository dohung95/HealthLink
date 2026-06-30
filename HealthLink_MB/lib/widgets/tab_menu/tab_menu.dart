import 'package:flutter/material.dart';
import '../../l10n/app_localizations.dart';

String _getLocalizedTabLabel(BuildContext context, String label) {
  final l10n = AppLocalizations.of(context)!;
  switch (label) {
    case 'Booking':
      return l10n.tabBooking;
    case 'Appointments':
      return l10n.tabAppointments;
    case 'Home':
      return l10n.tabHome;
    case 'Chat':
      return l10n.tabChat;
    case 'prescription':
      return l10n.tabPrescriptions;
    default:
      return label;
  }
}

/// Tab menu dùng cho cả Mobile (BottomNavigationBar) và Desktop (Sidebar)
class TabMenu {
  /// Danh sách các tab mặc định
  static const List<TabMenuItem> defaultItems = [
    TabMenuItem(icon: Icons.home, label: 'Home'),
    TabMenuItem(icon: Icons.calendar_today, label: 'Appointments'),
    TabMenuItem(icon: Icons.add_circle_outline, label: 'Booking'),
    TabMenuItem(icon: Icons.chat_bubble_outline, label: 'Chat'),
    TabMenuItem(icon: Icons.description_outlined, label: 'prescription'),
  ];
}

/// Model cho mỗi item trong tab menu
class TabMenuItem {
  final IconData icon;
  final String label;

  const TabMenuItem({
    required this.icon,
    required this.label,
  });
}

/// Mobile Tab Menu - BottomNavigationBar
class MobileTabMenu extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTabChanged;
  final List<TabMenuItem> items;

  const MobileTabMenu({
    Key? key,
    required this.currentIndex,
    required this.onTabChanged,
    this.items = TabMenu.defaultItems,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.04),
            blurRadius: 6,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: items.asMap().entries.map((entry) {
            final index = entry.key;
            final item = entry.value;
            final isActive = index == currentIndex;
            final bool isBooking = item.label == 'Booking';
            return Expanded(
              child: GestureDetector(
                onTap: () => onTabChanged(index),
                behavior: HitTestBehavior.translucent,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (isBooking)
                      Container(
                        width: 62,
                        height: 62,
                        decoration: BoxDecoration(
                          color: isActive
                              ? Theme.of(context).colorScheme.primary
                              : Theme.of(context).colorScheme.primary.withValues(alpha: 0.14),
                          shape: BoxShape.circle,
                          boxShadow: [
                            if (isActive)
                              BoxShadow(
                                color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.24),
                                blurRadius: 12,
                                offset: const Offset(0, 4),
                              ),
                          ],
                        ),
                        child: Icon(
                          item.icon,
                          color: isActive
                              ? Theme.of(context).colorScheme.onPrimary
                              : Theme.of(context).colorScheme.primary,
                          size: 28,
                        ),
                      )
                    else
                      Icon(
                        item.icon,
                        size: 24,
                        color: isActive
                            ? Theme.of(context).colorScheme.primary
                            : Theme.of(context).colorScheme.outline,
                      ),
                    const SizedBox(height: 4),
                    Text(
                      _getLocalizedTabLabel(context, item.label),
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: isBooking ? 12 : 10,
                        fontWeight: isBooking ? FontWeight.w700 : FontWeight.normal,
                        color: isActive
                            ? Theme.of(context).colorScheme.primary
                            : Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

}

/// Desktop Tab Menu - Sidebar Navigation
class DesktopTabMenu extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTabChanged;
  final List<TabMenuItem> items;
  final String title;
  final bool showProfile;

  const DesktopTabMenu({
    Key? key,
    required this.currentIndex,
    required this.onTabChanged,
    this.items = TabMenu.defaultItems,
    this.title = '',
    this.showProfile = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 256,
      color: Theme.of(context).colorScheme.surface,
      decoration: BoxDecoration(
        border: Border(
          right: BorderSide(
            color: Theme.of(context).colorScheme.outlineVariant,
          ),
        ),
      ),
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: Text(
                title.isEmpty ? AppLocalizations.of(context)!.tabHome : title,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
            ),
          const SizedBox(height: 24),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: items.length,
              itemBuilder: (context, index) => _buildSideNavItem(
                context,
                items[index].icon,
                _getLocalizedTabLabel(context, items[index].label),
                index == currentIndex,
                index,
                isHome: items[index].label == 'Home',
              ),
            ),
          ),
          if (showProfile)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: _buildSideNavItem(
                context,
                Icons.person_outline,
                AppLocalizations.of(context)!.drawerMyProfile,
                false,
                -1,
                isHome: false,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSideNavItem(
    BuildContext context,
    IconData icon,
    String title,
    bool isActive,
    int index, {
    bool isHome = false,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: ListTile(
        leading: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: isActive
                ? colorScheme.primary.withValues(alpha: 0.18)
                : isHome
                    ? colorScheme.primary.withValues(alpha: 0.12)
                    : Colors.transparent,
            shape: BoxShape.circle,
          ),
          child: Icon(
            icon,
            color: isActive
                ? colorScheme.primary
                : isHome
                    ? colorScheme.primary
                    : colorScheme.outline,
          ),
        ),
        title: Text(
          _getLocalizedTabLabel(context, title),
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 14,
            fontWeight: isActive || isHome ? FontWeight.bold : FontWeight.normal,
            color: isActive
                ? colorScheme.primary
                : colorScheme.onSurfaceVariant,
          ),
        ),
        selected: isActive,
        selectedTileColor: colorScheme.surfaceContainerHighest,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
        onTap: index >= 0 ? () => onTabChanged(index) : null,
      ),
    );
  }
}
