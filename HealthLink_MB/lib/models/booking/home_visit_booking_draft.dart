import 'home_visit_doctor_option.dart';
import 'home_visit_extra_service.dart';
import 'home_visit_session_slot.dart';

class HomeVisitBookingDraft {
  const HomeVisitBookingDraft({
    this.visitAddress = '',
    this.visitCity = '',
    this.contactPhone = '',
    this.reasonForHomeVisit = '',
    this.specialNotes = '',
    this.isForSelf = true,
    this.receiverName = '',
    this.receiverAge = '',
    this.receiverGender = '',
    this.receiverRelationship = '',
    this.receiverPhone = '',
    this.visitLatitude,
    this.visitLongitude,
    this.doctorOptions = const [],
    this.selectedDoctor,
    this.availableServices = const [],
    this.selectedServices = const [],
    this.availableSlots = const [],
    this.selectedSlot,
    this.sessionDraftId,
  });

  final String visitAddress;
  final String visitCity;
  final String contactPhone;
  final String reasonForHomeVisit;
  final String specialNotes;

  final bool isForSelf;
  final String receiverName;
  final String receiverAge;
  final String receiverGender;
  final String receiverRelationship;
  final String receiverPhone;

  final double? visitLatitude;
  final double? visitLongitude;

  final List<HomeVisitDoctorOption> doctorOptions;
  final HomeVisitDoctorOption? selectedDoctor;

  final List<HomeVisitExtraService> availableServices;
  final List<HomeVisitExtraService> selectedServices;

  final List<HomeVisitSessionSlot> availableSlots;
  final HomeVisitSessionSlot? selectedSlot;

  final String? sessionDraftId;

  bool get hasLocation => visitLatitude != null && visitLongitude != null;

  List<int> get selectedServiceIds =>
      selectedServices.map((item) => item.serviceId).toList();

  double get servicesTotal => selectedServices.fold<double>(
    0,
        (sum, item) => sum + item.price,
  );

  double get doctorFee => selectedDoctor?.displayDoctorFee ?? 0;

  double get homeVisitFee => selectedDoctor?.homeVisitTotal ?? 0;

  double get grandTotal => doctorFee + homeVisitFee + servicesTotal;

  String get receiverPhoneOrContact =>
      receiverPhone.trim().isNotEmpty ? receiverPhone.trim() : contactPhone.trim();

  HomeVisitBookingDraft copyWith({
    String? visitAddress,
    String? visitCity,
    String? contactPhone,
    String? reasonForHomeVisit,
    String? specialNotes,
    bool? isForSelf,
    String? receiverName,
    String? receiverAge,
    String? receiverGender,
    String? receiverRelationship,
    String? receiverPhone,
    double? visitLatitude,
    double? visitLongitude,
    bool clearLocation = false,
    List<HomeVisitDoctorOption>? doctorOptions,
    HomeVisitDoctorOption? selectedDoctor,
    bool clearSelectedDoctor = false,
    List<HomeVisitExtraService>? availableServices,
    List<HomeVisitExtraService>? selectedServices,
    List<HomeVisitSessionSlot>? availableSlots,
    HomeVisitSessionSlot? selectedSlot,
    bool clearSelectedSlot = false,
    String? sessionDraftId,
    bool clearSessionDraftId = false,
  }) {
    return HomeVisitBookingDraft(
      visitAddress: visitAddress ?? this.visitAddress,
      visitCity: visitCity ?? this.visitCity,
      contactPhone: contactPhone ?? this.contactPhone,
      reasonForHomeVisit: reasonForHomeVisit ?? this.reasonForHomeVisit,
      specialNotes: specialNotes ?? this.specialNotes,
      isForSelf: isForSelf ?? this.isForSelf,
      receiverName: receiverName ?? this.receiverName,
      receiverAge: receiverAge ?? this.receiverAge,
      receiverGender: receiverGender ?? this.receiverGender,
      receiverRelationship: receiverRelationship ?? this.receiverRelationship,
      receiverPhone: receiverPhone ?? this.receiverPhone,
      visitLatitude: clearLocation ? null : visitLatitude ?? this.visitLatitude,
      visitLongitude: clearLocation ? null : visitLongitude ?? this.visitLongitude,
      doctorOptions: doctorOptions ?? this.doctorOptions,
      selectedDoctor:
      clearSelectedDoctor ? null : selectedDoctor ?? this.selectedDoctor,
      availableServices: availableServices ?? this.availableServices,
      selectedServices: selectedServices ?? this.selectedServices,
      availableSlots: availableSlots ?? this.availableSlots,
      selectedSlot: clearSelectedSlot ? null : selectedSlot ?? this.selectedSlot,
      sessionDraftId:
      clearSessionDraftId ? null : sessionDraftId ?? this.sessionDraftId,
    );
  }
}