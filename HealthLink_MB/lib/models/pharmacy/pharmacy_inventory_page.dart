import 'pharmacy_inventory_item.dart';

class PharmacyInventoryPage {
  final List<PharmacyInventoryItem> items;
  final int totalElements;
  final int totalPages;
  final int currentPage;
  final int size;
  final bool hasMore;

  const PharmacyInventoryPage({
    required this.items,
    required this.totalElements,
    required this.totalPages,
    required this.currentPage,
    required this.size,
    required this.hasMore,
  });

  factory PharmacyInventoryPage.fromJson(Map<String, dynamic> json) {
    final dataList = (json['content'] as List<dynamic>?)
            ?.map((e) =>
                PharmacyInventoryItem.fromJson(e as Map<String, dynamic>))
            .toList() ??
        (json['data'] as List<dynamic>?)
            ?.map((e) =>
                PharmacyInventoryItem.fromJson(e as Map<String, dynamic>))
            .toList() ??
        (json['items'] as List<dynamic>?)
            ?.map((e) =>
                PharmacyInventoryItem.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];
    return PharmacyInventoryPage(
      items: dataList,
      totalElements: json['totalElements'] as int? ?? dataList.length,
      totalPages: json['totalPages'] as int? ?? 1,
      currentPage: json['number'] as int? ??
          json['currentPage'] as int? ??
          0,
      size: json['size'] as int? ?? 20,
      hasMore: json['hasMore'] as bool? ??
          (json['last'] as bool?) != true,
    );
  }
}
