import 'package:flutter/material.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import 'package:url_launcher/url_launcher.dart';

import 'doctor_widgets.dart';

enum _DocKind { image, pdf, other }

class DocumentViewerScreen extends StatelessWidget {
  final String url;
  final String title;
  final String? mimeType;

  const DocumentViewerScreen({
    super.key,
    required this.url,
    required this.title,
    this.mimeType,
  });

  _DocKind get _kind {
    final mime = (mimeType ?? '').toLowerCase();
    final lowerUrl = url.toLowerCase();
    if (mime.contains('pdf') || lowerUrl.contains('.pdf')) return _DocKind.pdf;
    if (mime.contains('image') ||
        RegExp(r'\.(png|jpe?g|gif|webp|bmp)(\?|$)').hasMatch(lowerUrl)) {
      return _DocKind.image;
    }
    return _DocKind.other;
  }

  Future<void> _openExternally(BuildContext context) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && context.mounted) {
      showDoctorNotice(context, 'Cannot open document.', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            icon: const Icon(Icons.open_in_new),
            tooltip: 'Open externally',
            onPressed: () => _openExternally(context),
          ),
        ],
      ),
      body: switch (_kind) {
        _DocKind.image => _ImageBody(url: url),
        _DocKind.pdf => _PdfBody(url: url, onOpenExternally: () => _openExternally(context)),
        _DocKind.other => _UnsupportedBody(onOpenExternally: () => _openExternally(context)),
      },
    );
  }
}

class _ImageBody extends StatelessWidget {
  final String url;
  const _ImageBody({required this.url});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: InteractiveViewer(
        minScale: 1,
        maxScale: 5,
        child: Image.network(
          url,
          fit: BoxFit.contain,
          loadingBuilder: (_, child, progress) {
            if (progress == null) return child;
            return const CircularProgressIndicator(color: Colors.white);
          },
          errorBuilder: (_, _, _) => const Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.broken_image_outlined, color: Colors.white, size: 48),
              SizedBox(height: 12),
              Text('Failed to load image.', style: TextStyle(color: Colors.white)),
            ],
          ),
        ),
      ),
    );
  }
}

class _PdfBody extends StatefulWidget {
  final String url;
  final VoidCallback onOpenExternally;
  const _PdfBody({required this.url, required this.onOpenExternally});

  @override
  State<_PdfBody> createState() => _PdfBodyState();
}

class _PdfBodyState extends State<_PdfBody> {
  bool _failed = false;

  @override
  Widget build(BuildContext context) {
    if (_failed) {
      return _UnsupportedBody(
        message: 'Failed to load PDF preview.',
        onOpenExternally: widget.onOpenExternally,
      );
    }
    return SfPdfViewer.network(
      widget.url,
      onDocumentLoadFailed: (_) => setState(() => _failed = true),
    );
  }
}

class _UnsupportedBody extends StatelessWidget {
  final String message;
  final VoidCallback onOpenExternally;
  const _UnsupportedBody({
    this.message = 'Preview is not supported for this file type.',
    required this.onOpenExternally,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.insert_drive_file_outlined, color: Colors.white70, size: 48),
            const SizedBox(height: 12),
            Text(message, style: const TextStyle(color: Colors.white), textAlign: TextAlign.center),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onOpenExternally,
              icon: const Icon(Icons.open_in_new),
              label: const Text('Open with external app'),
            ),
          ],
        ),
      ),
    );
  }
}
