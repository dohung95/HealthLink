class HomeVisitSessionSlot {
  const HomeVisitSessionSlot({
    required this.scheduleId,
    required this.bookingDate,
    required this.startTime,
    required this.endTime,
    required this.sessionType,
    required this.estimatedTravelMinutes,
    required this.visitDurationMinutes,
    required this.servicesDurationMinutes,
    required this.bufferMinutes,
    required this.totalBlockMinutes,
  });

  factory HomeVisitSessionSlot.fromJson(Map<String, dynamic> json) {
    return HomeVisitSessionSlot(
      scheduleId: _toInt(json['scheduleId'], 0),
      bookingDate: (json['bookingDate'] ?? '').toString(),
      startTime: (json['startTime'] ?? '').toString(),
      endTime: (json['endTime'] ?? '').toString(),
      sessionType: (json['sessionType'] ?? '').toString(),
      estimatedTravelMinutes: _toInt(json['estimatedTravelMinutes'], 0),
      visitDurationMinutes: _toInt(json['visitDurationMinutes'], 0),
      servicesDurationMinutes: _toInt(json['servicesDurationMinutes'], 0),
      bufferMinutes: _toInt(json['bufferMinutes'], 0),
      totalBlockMinutes: _toInt(json['totalBlockMinutes'], 0),
    );
  }

  final int scheduleId;
  final String bookingDate;
  final String startTime;
  final String endTime;
  final String sessionType;
  final int estimatedTravelMinutes;
  final int visitDurationMinutes;
  final int servicesDurationMinutes;
  final int bufferMinutes;
  final int totalBlockMinutes;
}

int _toInt(dynamic value, int fallback) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}