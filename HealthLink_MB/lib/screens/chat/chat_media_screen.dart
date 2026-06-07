import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/chat/conversation.dart';
import '../../providers/chat_provider.dart';
import '../../config/api_config.dart';
import 'dart:convert';
import 'chat_room_screen.dart'; // for FullScreenImageViewer

class ChatMediaScreen extends StatelessWidget {
  final Conversation conversation;

  const ChatMediaScreen({super.key, required this.conversation});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final chat = context.watch<ChatProvider>();
    
    final mediaMessages = chat.messages.where((m) => m.imageUrl != null || m.content.startsWith('data:image')).toList();

    return Scaffold(
      backgroundColor: colors.surface,
      appBar: AppBar(
        title: const Text('Media & Files'),
      ),
      body: mediaMessages.isEmpty
          ? Center(child: Text('No media found', style: TextStyle(color: colors.outline)))
          : GridView.builder(
              padding: const EdgeInsets.all(8),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
              ),
              itemCount: mediaMessages.length,
              itemBuilder: (context, index) {
                final msg = mediaMessages[index];
                final url = msg.imageUrl ?? msg.content;
                
                Widget imageWidget;
                if (url.startsWith('data:image')) {
                  try {
                    final bytes = base64Decode(url.split(',').last);
                    imageWidget = Image.memory(bytes, fit: BoxFit.cover);
                  } catch (e) {
                    imageWidget = Container(color: colors.surfaceContainerHighest, child: const Icon(Icons.broken_image));
                  }
                } else {
                  final normalized = ApiConfig.normalizeUrl(url);
                  imageWidget = normalized != null 
                      ? Image.network(normalized, fit: BoxFit.cover)
                      : Container(color: colors.surfaceContainerHighest, child: const Icon(Icons.broken_image));
                }

                return GestureDetector(
                  onTap: () {
                    Navigator.push(context, MaterialPageRoute(
                      builder: (_) => FullScreenImageViewer(imageUrl: url),
                    ));
                  },
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: imageWidget,
                  ),
                );
              },
            ),
    );
  }
}
