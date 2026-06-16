import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/chat/conversation.dart';
import '../../models/chat/message.dart';
import '../../services/chat/chat_service.dart';
import '../../providers/auth_provider.dart';

class ChatSearchScreen extends StatefulWidget {
  final Conversation conversation;

  const ChatSearchScreen({super.key, required this.conversation});

  @override
  State<ChatSearchScreen> createState() => _ChatSearchScreenState();
}

class _ChatSearchScreenState extends State<ChatSearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  Timer? _debounce;
  List<Message> _searchResults = [];
  bool _isSearching = false;

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

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
          onChanged: (val) {
            setState(() => _searchQuery = val);
            if (_debounce?.isActive ?? false) _debounce!.cancel();
            if (val.trim().isEmpty) {
              setState(() {
                _searchResults = [];
                _isSearching = false;
              });
              return;
            }
            _debounce = Timer(const Duration(milliseconds: 500), () async {
              setState(() => _isSearching = true);
              try {
                final auth = context.read<AuthProvider>();
                if (auth.accessToken != null && auth.userId != null) {
                  final results = await ChatService.searchMessages(
                    auth.accessToken!,
                    auth.userId!,
                    widget.conversation.id,
                    val.trim(),
                  );
                  if (mounted) {
                    setState(() => _searchResults = results);
                  }
                }
              } catch (e) {
                debugPrint('Search error: $e');
                if (mounted) setState(() => _searchResults = []);
              } finally {
                if (mounted) setState(() => _isSearching = false);
              }
            });
          },
        ),
        actions: [
          if (_searchQuery.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _searchController.clear();
                setState(() {
                  _searchQuery = '';
                  _searchResults = [];
                  _isSearching = false;
                });
              },
            ),
        ],
      ),
      body: _searchQuery.trim().isEmpty
          ? Center(child: Text('Type to search messages', style: TextStyle(color: colors.outline)))
          : _isSearching
              ? const Center(child: CircularProgressIndicator())
              : _searchResults.isEmpty
                  ? Center(child: Text('No results found', style: TextStyle(color: colors.outline)))
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _searchResults.length,
                      separatorBuilder: (_, __) => const Divider(),
                      itemBuilder: (context, index) {
                        final msg = _searchResults[index];
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
