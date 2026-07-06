import 'package:flutter/widgets.dart';

extension SpecialtyLocalization on String {
  /// Converts English specialty names to Vietnamese if the current locale is 'vi'.
  String toLocalizedSpecialty(BuildContext context) {
    if (Localizations.localeOf(context).languageCode == 'vi') {
      switch (this) {
        case 'Internal Medicine': return 'Nội tổng quát';
        case 'Cardiology': return 'Tim mạch';
        case 'Neurology': return 'Thần kinh';
        case 'Dermatology': return 'Da liễu';
        case 'Pediatrics': return 'Nhi khoa';
        case 'Obstetrics & Gynecology': return 'Sản phụ khoa';
        case 'ENT': return 'Tai mũi họng';
        case 'Ophthalmology': return 'Mắt';
        case 'Surgery': return 'Ngoại khoa';
        case 'Dentistry': return 'Nha khoa';
      }
    }
    return this;
  }
}

extension ConsultationTypeLocalization on String {
  /// Converts English consultation types to Vietnamese if the current locale is 'vi'.
  String toLocalizedConsultationType(BuildContext context) {
    if (Localizations.localeOf(context).languageCode == 'vi') {
      switch (this) {
        case 'Online': return 'Trực tuyến';
        case 'In-person': return 'Trực tiếp';
        case 'Home visit': return 'Khám tại nhà';
        case 'Video': return 'Video call';
        case 'Chat': return 'Nhắn tin';
      }
    }
    return this;
  }
}

extension HomeVisitServiceLocalization on String {
  /// Converts English home visit service names to Vietnamese if the current locale is 'vi'.
  String toLocalizedServiceName(BuildContext context) {
    if (Localizations.localeOf(context).languageCode == 'vi') {
      switch (this) {
        case 'Basic vital signs check': return 'Đo sinh hiệu cơ bản';
        case 'Blood glucose test': return 'Kiểm tra đường huyết';
        case 'Injection support': return 'Hỗ trợ tiêm thuốc';
        case 'Medication review': return 'Đánh giá đơn thuốc';
        case 'Wound dressing': return 'Chăm sóc vết thương';
      }
    }
    return this;
  }
}

extension HomeVisitServiceDescriptionLocalization on String {
  /// Converts English home visit service descriptions to Vietnamese if the current locale is 'vi'.
  String toLocalizedServiceDescription(BuildContext context) {
    if (Localizations.localeOf(context).languageCode == 'vi') {
      switch (this) {
        case 'Measure pulse, blood pressure, temperature, SpO2 and breathing rate at home.': return 'Đo nhịp tim, huyết áp, nhiệt độ, SpO2 và nhịp thở tại nhà.';
        case 'Quick capillary blood glucose test for diabetes screening or monitoring.': return 'Kiểm tra đường huyết mao mạch nhanh để tầm soát hoặc theo dõi tiểu đường.';
        case 'Doctor provides injection support when medically appropriate.': return 'Bác sĩ hỗ trợ tiêm thuốc khi có chỉ định y khoa phù hợp.';
        case 'Review current medications, usage schedule and basic interaction risks.': return 'Xem xét các loại thuốc hiện tại, lịch sử dụng và các nguy cơ tương tác thuốc cơ bản.';
        case 'Clean and dress a minor wound during the home visit.': return 'Vệ sinh và băng bó vết thương nhỏ trong quá trình khám tại nhà.';
      }
    }
    return this;
  }
}
