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
