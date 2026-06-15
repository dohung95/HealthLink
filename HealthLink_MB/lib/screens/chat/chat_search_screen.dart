import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/chat/conversation.dart';
import '../../providers/chat/chat_provider.dart';

class ChatSearchScreen extends StatefulWidget {
  final Conversation conversation;

  const ChatSearchScreen({super.key, required this.conversation});

  @override
  State<ChatSearchScreen> createState() => _ChatSearchScreenState();
}

class _ChatSearchScreenState extends State<ChatSearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final chat = context.watch<ChatProvider>();
    
    // Filter messages locally
    final filteredMessages = _searchQuery.isEmpty 
        ? [] 
        : chat.messages.where((m) => 
            m.content.toLowerCase().contains(_searchQuery.toLowerCase()) && 
            !m.content.startsWith('data:image') &&
            m.imageUrl == null
          ).toList();

    return Scaffold(
      backgroundColor: colors.surface,
      appBar: AppBar(
        title: TextField(
          controller: _searchController,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Search in conversation...',
            border: InputBorder.none,
          ),
          onChanged: (val) => setState(() => _searchQuery = val),
        ),
        actions: [
          if (_searchQuery.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _searchController.clear();
                setState(() => _searchQuery = '');
              },
            ),
        ],
      ),
      body: _searchQuery.isEmpty
          ? Center(child: Text('Type to search messages', style: TextStyle(color: colors.outline)))
          : filteredMessages.isEmpty
              ? Center(child: Text('No results found', style: TextStyle(color: colors.outline)))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: filteredMessages.length,
                  separatorBuilder: (_, __) => const Divider(),
                  itemBuilder: (context, index) {
                    final msg = filteredMessages[index];
                    final dt = msg.sentAt;
                    final time = '${dt.day}/${dt.month} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
                    return ListTile(
                      title: Text(msg.content, maxLines: 2, overflow: TextOverflow.ellipsis),
                      subtitle: Text(time, style: TextStyle(fontSize: 12, color: colors.outline)),
                      onTap: () {
                        Navigator.pop(context, msg.id);
                      },
                    );
                  },
                ),
    );
  }
}
