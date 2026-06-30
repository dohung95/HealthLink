class HomeVisitExtraService {
  const HomeVisitExtraService({
    required this.serviceId,
    required this.serviceName,
    required this.description,
    required this.price,
    required this.durationMinutes,
  });

  factory HomeVisitExtraService.fromJson(Map<String, dynamic> json) {
    return HomeVisitExtraService(
      serviceId: _toInt(json['serviceId'] ?? json['serviceID'], 0),
      serviceName: (json['serviceName'] ?? json['name'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      price: _toDouble(json['price'], 0),
      durationMinutes: _toInt(json['durationMinutes'], 0),
    );
  }

  final int serviceId;
  final String serviceName;
  final String description;
  final double price;
  final int durationMinutes;
}

int _toInt(dynamic value, int fallback) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

double _toDouble(dynamic value, double fallback) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? fallback;
}