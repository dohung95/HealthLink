import 'package:flutter/material.dart';
import 'package:flutter_ringtone_player/flutter_ringtone_player.dart';

class NotificationHelper {
  static void showTopNotification(
      OverlayState overlayState, {
        required String title,
        required String message,
        IconData icon = Icons.notifications,
        Color backgroundColor = Colors.white,
        Color iconColor = Colors.teal,
        Duration duration = const Duration(seconds: 3),
        VoidCallback? onTap,
        bool playSound = true,
      }) {
    if (playSound) {
      FlutterRingtonePlayer().playNotification();
    }

    late OverlayEntry overlayEntry;
    late AnimationController controller;

    // Kích hoạt controller ngay sau khi tạo overlay
    controller = AnimationController(
      vsync: overlayState,
      duration: const Duration(milliseconds: 300),
    );

    overlayEntry = OverlayEntry(
      builder: (context) {
        return Positioned(
          top: MediaQuery.of(context).padding.top + 10,
          left: 16,
          right: 16,
          child: Material(
            color: Colors.transparent,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0.0, -1.5),
                end: Offset.zero,
              ).animate(CurvedAnimation(
                parent: controller,
                curve: Curves.easeOutCubic,
              )),
              child: Dismissible(
                key: UniqueKey(),
                direction: DismissDirection.up,
                onDismissed: (direction) {
                  if (overlayEntry.mounted) {
                    overlayEntry.remove();
                  }
                  controller.dispose();
                },
                child: GestureDetector(
                  onTap: () {
                    if (onTap != null) onTap();
                    controller.reverse().then((value) {
                      if (overlayEntry.mounted) {
                        overlayEntry.remove();
                      }
                      controller.dispose();
                    });
                  },
                  child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: backgroundColor,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: const [
                      BoxShadow(
                        color: Colors.black26,
                        blurRadius: 10,
                        offset: Offset(0, 4),
                      )
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: iconColor.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(icon, color: iconColor, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black87),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              message,
                              style: const TextStyle(color: Colors.black54, fontSize: 14),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
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
          ),
        );
      },
    );

    overlayState.insert(overlayEntry);
    controller.forward();

    // Tự động đóng sau duration
    Future.delayed(duration).then((value) {
      if (overlayEntry.mounted) {
        controller.reverse().then((value) {
          if (overlayEntry.mounted) {
            overlayEntry.remove();
          }
          controller.dispose();
        });
      }
    });
  }
}
