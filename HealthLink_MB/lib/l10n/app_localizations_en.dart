// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get drawerAccount => 'ACCOUNT';

  @override
  String get drawerMyProfile => 'My Profile';

  @override
  String get drawerSecurity => 'Security';

  @override
  String get drawerSupport => 'SUPPORT';

  @override
  String get drawerHelpSupport => 'Help & Support';

  @override
  String get drawerAboutUs => 'About Us';

  @override
  String get drawerLogout => 'Logout';

  @override
  String get drawerAppTheme => 'App Theme';

  @override
  String get themeFollowSystem => 'Follow System';

  @override
  String get themeDarkMode => 'Dark Mode';

  @override
  String get themeLightMode => 'Light Mode';

  @override
  String get themeSelectTheme => 'Select Theme';

  @override
  String get drawerAppLanguage => 'App Language';

  @override
  String get languageVietnamese => 'Vietnamese';

  @override
  String get languageEnglish => 'English';

  @override
  String get drawerEmailNotUpdated => 'Email not updated';

  @override
  String get tabBooking => 'Booking';

  @override
  String get tabAppointments => 'Appointments';

  @override
  String get tabHome => 'Home';

  @override
  String get tabChat => 'Chat';

  @override
  String get tabPrescriptions => 'Prescriptions';

  @override
  String featureUnderDevelopment(String feature) {
    return 'The $feature feature is under development...';
  }

  @override
  String get greetingMorning => 'Hello, Good Morning';

  @override
  String get greetingAfternoon => 'Hi, Good Afternoon,';

  @override
  String get greetingEvening => 'Have a good night';

  @override
  String get statUpcoming => 'Upcoming';

  @override
  String get statNewRecords => 'New Records';

  @override
  String get statPrescriptions => 'Prescriptions';

  @override
  String get upcomingAppointmentsTitle => 'Upcoming Appointments';

  @override
  String get btnBack => 'Back';

  @override
  String get btnNext => 'Next';

  @override
  String get btnBook => 'Book';

  @override
  String get btnChat => 'Chat';

  @override
  String get btnJoinRoom => 'Join Room';

  @override
  String get btnCallNow => 'Call Now';

  @override
  String get btnReschedule => 'Reschedule';

  @override
  String get btnCancel => 'Cancel';

  @override
  String get btnKeepIt => 'No, Keep It';

  @override
  String get btnYesCancel => 'Yes, Cancel';

  @override
  String get statusScheduled => 'Scheduled';

  @override
  String get statusConfirmed => 'Confirmed';

  @override
  String get statusCompleted => 'Completed';

  @override
  String get statusCancelled => 'Cancelled';

  @override
  String get statusExpired => 'Expired';

  @override
  String get filterAll => 'All';

  @override
  String get filterUpcoming => 'Upcoming';

  @override
  String get filterExpired => 'Expired';

  @override
  String get filterCompleted => 'Completed';

  @override
  String get filterCancelled => 'Cancelled';

  @override
  String get filterInConsultation => 'In consultation';

  @override
  String get homeNoUpcomingAppointments => 'No upcoming appointments';

  @override
  String get homeBookAppointmentPrompt =>
      'Book an appointment to start consulting with a doctor.';

  @override
  String get homeQuickActions => 'Quick Actions';

  @override
  String get homeHealthRecords => 'Health Records';

  @override
  String get homeShareRecords => 'Share Records';

  @override
  String get homeDoctorRanking => 'Doctor Ranking';

  @override
  String get homePharmacy => 'Pharmacy';

  @override
  String get appointmentToday => 'Today';

  @override
  String get appointmentUpcoming => 'Upcoming';

  @override
  String get appointmentMore => 'More';

  @override
  String get openingChatRoom => 'Opening chat room...';

  @override
  String get openingVideoRoom => 'Opening video room...';

  @override
  String get helpHowCanWeHelp => 'How can we help?';

  @override
  String get helpFindAnswers =>
      'Find answers or contact the HealthLink support team.';

  @override
  String get helpMedicalEmergency => 'Medical Emergency';

  @override
  String get helpEmergencyNotice =>
      'HealthLink is not an emergency service. If you are experiencing a medical emergency, contact emergency services immediately.';

  @override
  String get helpCall115 => 'Call 115';

  @override
  String get helpFAQ => 'Frequently Asked Questions';

  @override
  String get helpSearch => 'Search for help...';

  @override
  String get helpContactSupport => 'Contact Support';

  @override
  String get helpEmailSupport => 'Email Support';

  @override
  String get helpNoMatch => 'No matching help topics found.';

  @override
  String get helpTryAnother => 'Try another keyword or category.';

  @override
  String get helpPrivacyNotice =>
      'Do not include passwords, payment credentials or unnecessary medical information in your support email.';

  @override
  String get helpCategoryAll => 'All';

  @override
  String get helpCategoryBooking => 'Booking';

  @override
  String get helpCategoryAppointments => 'Appointments';

  @override
  String get helpCategoryHealthRecords => 'Health Records';

  @override
  String get helpCategoryConsultation => 'Consultation';

  @override
  String get helpCategoryAccount => 'Account';

  @override
  String get aboutTitle => 'About HealthLink';

  @override
  String aboutVersion(String version) {
    return 'Version $version';
  }

  @override
  String get aboutMission => 'Our Mission';

  @override
  String get aboutMissionDesc =>
      'HealthLink was born with the goal of bridging the gap between patients and medical professionals. We leverage the power of technology to provide comprehensive, fast, and most effective healthcare solutions for everyone, every home.';

  @override
  String get aboutCoreFeatures => 'Core Features';

  @override
  String get aboutFeatVideo => 'Online Video Consultation';

  @override
  String get aboutFeatVideoDesc =>
      'Connect directly with specialists from the comfort of your home.';

  @override
  String get aboutFeatRecords => 'Medical Record Management';

  @override
  String get aboutFeatRecordsDesc =>
      'Store and track medical history and prescriptions securely.';

  @override
  String get aboutFeatAI => 'Smart AI Assistant';

  @override
  String get aboutFeatAIDesc =>
      '24/7 support for basic medical inquiries and guidance.';

  @override
  String get aboutFeatConnection => 'Instant Connection';

  @override
  String get aboutFeatConnectionDesc =>
      'Direct communication with doctors via our messaging system.';

  @override
  String get aboutContactUs => 'Contact Us';

  @override
  String get aboutFooter => '© 2026 HealthLink Team. All rights reserved.';

  @override
  String get bookingTitle => 'Book an appointment';

  @override
  String get bookingSubtitle =>
      'Select a specialty, doctor and time that suits you.';

  @override
  String get bookingStepSpecialty => 'Specialty';

  @override
  String get bookingStepDoctor => 'Doctor';

  @override
  String get bookingStepDateTime => 'Date & Time';

  @override
  String get bookingChooseSpecialty => 'Choose a specialty';

  @override
  String get bookingChooseSpecialtyDesc =>
      'Start by selecting the care area you need.';

  @override
  String get myAppointmentsTitle => 'My Appointments';

  @override
  String get myAppointmentsSubtitle => 'View and manage your appointments';

  @override
  String showingAppointmentsCount(int count) {
    return 'Showing $count appointment(s)';
  }

  @override
  String paginationInfo(int current, int total, int items) {
    return 'Page $current of $total ($items appointments)';
  }

  @override
  String get noAppointmentsYet => 'No appointments yet';

  @override
  String get noAppointmentsYetDesc =>
      'Book your first appointment to start consulting with a doctor.';

  @override
  String noStatusAppointments(String status) {
    return 'No $status appointments';
  }

  @override
  String get noStatusAppointmentsDesc =>
      'No appointments match the selected status.';

  @override
  String get cancelAppointmentDialogTitle => 'Cancel Appointment';

  @override
  String get cancelAppointmentDialogDesc =>
      'Are you sure you want to cancel this appointment? This action cannot be undone.';

  @override
  String get msgCancelSuccess => 'Appointment cancelled successfully.';

  @override
  String get msgAlreadyInCall => 'You are already in a call!';

  @override
  String get msgCannotStartVideoCall =>
      'Can not start video call, please login.';

  @override
  String get bookingStepMedicalInfo => 'Medical Info';

  @override
  String get bookingStepConfirm => 'Confirm';

  @override
  String get bookingStepPayment => 'Payment';

  @override
  String get chatMessagesTitle => 'Messages';

  @override
  String get chatSearchPrompt => 'Search doctor, specialty or message...';

  @override
  String get chatHealthLinkAI => 'HealthLink AI';

  @override
  String get chatAIAssistantDesc => 'Your intelligent health assistant';

  @override
  String get chatAIPrompt => 'Ask about symptoms, book an appointment...';

  @override
  String get chatTryAgain => 'Try again';

  @override
  String get chatNoConversations => 'No conversations yet.';

  @override
  String get chatNoResults => 'No results found.';

  @override
  String get chatBlockedUsers => 'Blocked users';

  @override
  String get chatNoBlockedUsers => 'No users are blocked.';

  @override
  String get chatUnblockedSuccess => 'Unblocked user successfully';

  @override
  String get chatUnblock => 'Unblock';

  @override
  String get chatClose => 'Close';

  @override
  String get prescriptionsTitle => 'My Prescriptions';

  @override
  String get prescriptionsSubtitle => 'Manage prescription history and details';

  @override
  String get filterActive => 'Active';

  @override
  String get prescriptionLabel => 'Prescription';

  @override
  String get prescriptionDateIssued => 'Date Issued';

  @override
  String get prescriptionCondition => 'Condition';

  @override
  String prescriptionMedicationsCount(int count) {
    return '$count medications';
  }

  @override
  String get btnViewDetails => 'View Details >';

  @override
  String get statusIssued => 'Issued';

  @override
  String get labelNA => 'N/A';

  @override
  String get prescriptionDetailsTitle => 'Prescription Details';

  @override
  String get labelDoctor => 'Doctor:';

  @override
  String get labelDate => 'Date:';

  @override
  String medicationListCount(int count) {
    return 'Medication List ($count)';
  }

  @override
  String get profileTitle => 'My profile';

  @override
  String get profileVerifiedIdentity => 'VERIFIED IDENTITY';

  @override
  String get profileBloodType => 'Blood Type';

  @override
  String get profileHeight => 'Height (cm)';

  @override
  String get profileWeight => 'Weight (kg)';

  @override
  String get profileIdentityMetrics => 'IDENTITY METRICS';

  @override
  String get profileGender => 'GENDER';

  @override
  String get profileDob => 'DOB';

  @override
  String get profileOccupation => 'OCCUPATION';

  @override
  String get profileLanguage => 'LANGUAGE';

  @override
  String get profileLocationData => 'LOCATION DATA';

  @override
  String get profilePrimaryAddress => 'PRIMARY ADDRESS';

  @override
  String get profileContactNumber => 'CONTACT NUMBER';

  @override
  String get profilePolicyDesignation => 'POLICY DESIGNATION';

  @override
  String get profileMedicalDossier => 'MEDICAL DOSSIER';

  @override
  String get profileHistorySummary => 'History Summary';

  @override
  String get profileChronicConditions => 'Chronic Conditions';

  @override
  String get profileAllergies => 'Allergies';

  @override
  String get profileCurrentMedications => 'Current Medications';

  @override
  String get profileEmergencyContact => 'EMERGENCY CONTACT';

  @override
  String get profilePrimaryProxy => 'PRIMARY PROXY';

  @override
  String get labelNone => 'None';

  @override
  String get labelNotProvided => 'Not Provided';

  @override
  String get actionBack => 'Back';

  @override
  String get actionBackToLogin => 'Back to Login';

  @override
  String get securityTitle => 'Security Settings';

  @override
  String get securityChangeEmail => 'Change Email';

  @override
  String get securityChangeEmailDesc =>
      'A verification code will be sent to your new email address.';

  @override
  String get securityNewEmail => 'New Email';

  @override
  String get securityEnterNewEmail => 'Enter new email';

  @override
  String get securityCurrentPassword => 'Current Password';

  @override
  String get securityForVerification => 'For verification';

  @override
  String get securitySendVerificationCode => 'Send Verification Code';

  @override
  String get securityChangePassword => 'Change Password';

  @override
  String get securityChangePasswordDesc =>
      'After changing your password, you will need to log in again.';

  @override
  String get securityEnterCurrentPassword => 'Enter current password';

  @override
  String get securityNewPassword => 'New Password';

  @override
  String get securityEnterNewPassword => 'Enter new password';

  @override
  String get securityConfirmNewPassword => 'Confirm New Password';

  @override
  String get securityEnterConfirmNewPassword => 'Confirm new password';

  @override
  String get notificationsTitle => 'Notifications';

  @override
  String get notificationsMarkAllRead => 'Mark all read';

  @override
  String get notificationsEmpty => 'No notifications yet.';

  @override
  String get healthRecordsTitle => 'Health Records';

  @override
  String get healthRecordsUploadDoc => 'Upload medical document';

  @override
  String get healthRecordsDateRequired =>
      'Date Performed is required and cannot be in the future.';

  @override
  String get healthRecordsCategory => 'Category';

  @override
  String get healthRecordsCategoryOther => 'Other';

  @override
  String get healthRecordsSelectDate => 'Select Date Performed *';

  @override
  String get healthRecordsDescription => 'Description';

  @override
  String get healthRecordsChooseFile => 'Choose file *';

  @override
  String get healthRecordsUpload => 'Upload';

  @override
  String get healthRecordsNoRecords => 'No health records yet';

  @override
  String get healthRecordsNoRecordsDesc =>
      'Upload your first medical document to create a health record.';

  @override
  String get shareRecordsTitle => 'Share Health Records';

  @override
  String get shareRecordsGrantAccess => 'Grant New Access';

  @override
  String get shareRecordsGrantAccessDesc =>
      'Select a health record, documents and doctor to share with.';

  @override
  String get shareRecordsHealthRecord => 'Health Record';

  @override
  String get shareRecordsSpecialty => 'Specialty';

  @override
  String get shareRecordsDoctor => 'Doctor';

  @override
  String get shareRecordsPermission => 'Permission';

  @override
  String get shareRecordsViewOnly => 'View only';

  @override
  String get shareRecordsNoExpiry => 'No expiry date';

  @override
  String get shareRecordsShareBtn => 'Share Record';

  @override
  String get shareRecordsActiveShared => 'Active Shared Records';

  @override
  String get shareRecordsActiveSharedDesc =>
      'Records currently shared with doctors.';

  @override
  String get shareRecordsNoActiveShares => 'No active shares';

  @override
  String get shareRecordsNoActiveSharesDesc =>
      'Shared records will appear here.';

  @override
  String get shareRecordsRevokeTitle => 'Revoke Access';

  @override
  String get actionCancel => 'Cancel';

  @override
  String get actionRevoke => 'Revoke';

  @override
  String get shareRecordsClearExpiry => 'Clear expiry date';

  @override
  String get shareRecordsViewAllDesc =>
      'Doctor can view all documents in this record.';

  @override
  String get sortHighestRating => 'Highest rating';

  @override
  String get sortMostReviews => 'Most reviews';

  @override
  String get sortMostExperience => 'Most experience';

  @override
  String get sortAZ => 'A-Z';

  @override
  String get profileEditTitle => 'Edit Profile';

  @override
  String get msgAvatarUploadSuccess => 'Avatar uploaded successfully';

  @override
  String msgAvatarUploadFail(Object error) {
    return 'Failed to upload avatar: $error';
  }

  @override
  String get msgProfileUpdateSuccess => 'Profile updated successfully!';

  @override
  String msgProfileUpdateFail(Object error) {
    return 'Failed to update profile: $error';
  }

  @override
  String msgCreateRequestFail(Object error) {
    return 'Failed to create consultation request: $error';
  }

  @override
  String get pharmacyNoPharmacies => 'No pharmacies found.';

  @override
  String get orderStatusAll => 'All';

  @override
  String get orderStatusPending => 'Pending';

  @override
  String get orderStatusConfirmed => 'Confirmed';

  @override
  String get orderStatusPreparing => 'Preparing';

  @override
  String get orderStatusShipping => 'Shipping';

  @override
  String get orderStatusDelivered => 'Delivered';

  @override
  String get orderStatusCancelled => 'Cancelled';

  @override
  String get actionDownloadPdf => 'Download PDF';

  @override
  String get orderEstDelivery => 'Est. Delivery';

  @override
  String get orderItems => 'Order Items';

  @override
  String get orderTotal => 'Total';

  @override
  String get orderDetails => 'Order Details';

  @override
  String get orderDeliveryType => 'Delivery Type';

  @override
  String get orderDeliveryTypeDelivery => 'Delivery';

  @override
  String get orderDeliveryTypePickup => 'Store Pickup';

  @override
  String get paymentStatusUnpaid => 'UNPAID';

  @override
  String get paymentStatusPaid => 'PAID';

  @override
  String get orderRequestChangesOpt => 'Request Changes (Optional)';

  @override
  String get actionPayWithPayPal => 'Pay with PayPal';

  @override
  String get actionRequestChanges => 'Request Changes';

  @override
  String get actionCancelOrder => 'Cancel Order';

  @override
  String get actionBackToConnection => 'Back to Connection';

  @override
  String get pharmacyWaitingAcceptance => 'Waiting for acceptance';

  @override
  String get pharmacyReviewing => 'A pharmacist is reviewing your prescription';

  @override
  String get actionRefresh => 'Refresh';

  @override
  String get actionCancelAndGoBack => 'Cancel Request & Go Back';

  @override
  String get prescriptionNoFound => 'No prescriptions found.';

  @override
  String get prescriptionNoMatch => 'No prescriptions match the filter.';

  @override
  String prescriptionNotes(Object notes) {
    return 'Notes: $notes';
  }

  @override
  String paginationPage(Object current, Object total) {
    return 'Page $current of $total';
  }

  @override
  String get actionPrevious => 'Previous';

  @override
  String get actionNext => 'Next';

  @override
  String get bookingUploadDocs => 'Upload medical documents';

  @override
  String get bookingSuccessTitle => 'Booking successful';

  @override
  String get bookingSuccessMsg => 'Your appointment has been created.';

  @override
  String get actionDone => 'Done';

  @override
  String get bookingUploadWarnTitle => 'Some documents were not uploaded';

  @override
  String get actionGotIt => 'Got it';

  @override
  String get actionConfirm => 'Confirm';

  @override
  String get editProfileBasicInfo => 'Basic Information';

  @override
  String get editProfileFullName => 'Full Name';

  @override
  String get editProfileGender => 'Gender';

  @override
  String get editProfileDob => 'Date of Birth';

  @override
  String get editProfilePhone => 'Phone Number';

  @override
  String get editProfileOccupation => 'Occupation';

  @override
  String get editProfileLanguage => 'Preferred Language';

  @override
  String get editProfileAddressTitle => 'Address';

  @override
  String get editProfileStreet => 'Street Address';

  @override
  String get editProfileCity => 'City';

  @override
  String get editProfileCountry => 'Country';

  @override
  String get editProfilePhysicalTitle => 'Physical Metrics';

  @override
  String get editProfileHeight => 'Height (cm)';

  @override
  String get editProfileWeight => 'Weight (kg)';

  @override
  String get editProfileBloodType => 'Blood Type';

  @override
  String get editProfileMedicalTitle => 'Medical Dossier';

  @override
  String get editProfileAllergies => 'Allergies';

  @override
  String get editProfileChronic => 'Chronic Conditions';

  @override
  String get editProfileMedications => 'Current Medications';

  @override
  String get editProfileMedicalHistory => 'Medical History Summary';

  @override
  String get editProfileInsuranceTitle => 'Insurance Information';

  @override
  String get editProfileInsuranceProvider => 'Insurance Provider';

  @override
  String get editProfilePolicyNum => 'Policy Number';

  @override
  String get editProfileEmergencyTitle => 'Emergency Contact';

  @override
  String get editProfileContactName => 'Contact Name';

  @override
  String get editProfileRelationship => 'Relationship';

  @override
  String get editProfileContactPhone => 'Contact Phone';

  @override
  String get editProfileSelectDate => 'Select Date';

  @override
  String get editProfileRequiredField => 'This field is required';

  @override
  String get securityVerificationCode => 'Verification Code';

  @override
  String get securityEnter6Digit => 'Enter 6-digit code';

  @override
  String get actionVerifying => 'Verifying...';

  @override
  String get actionConfirmChange => 'Confirm Change';

  @override
  String get securityPasswordRequirements => 'Password Requirements:';

  @override
  String get securityReqLength => 'At least 6 characters';

  @override
  String get securityReqNumber => 'At least one number (0-9)';

  @override
  String get securityReqSpecial =>
      'At least one special character (!@#\\\$%^&*)';

  @override
  String get securityReqUpperLower => 'Upper and lowercase letters';

  @override
  String get securityReqMatch => 'Passwords match';

  @override
  String get pharmacyNoOrdersFound => 'No orders found.';

  @override
  String get pharmacyOrdersTitle => 'Pharmacy Orders';

  @override
  String get pharmacyOrdersSubtitle =>
      'Track your recent prescription deliveries and history.';

  @override
  String homeDoctorsCount(String count) {
    return '$count doctors';
  }

  @override
  String get pharmacyPortalTitle => 'Healthcare Portal';

  @override
  String get pharmacyTabPharmacies => 'Pharmacies';

  @override
  String get pharmacyTabRequests => 'Requests';

  @override
  String get pharmacyTabOrders => 'Orders';

  @override
  String get pharmacyStepPrescription => 'Prescription';

  @override
  String get pharmacyStepPharmacy => 'Pharmacy';

  @override
  String get pharmacyStepConnect => 'Connect';

  @override
  String get pharmacyStepPayment => 'Payment';

  @override
  String get pharmacyNoRequestsFound => 'No consultation requests found.';

  @override
  String get pharmacyAskPrescription => 'Do you have a prescription?';

  @override
  String get pharmacyAskPrescriptionDesc =>
      'Select an existing prescription or skip to browse pharmacies without one.';

  @override
  String get pharmacyNoPrescriptions => 'No prescriptions found';

  @override
  String get pharmacyNoPrescriptionsDesc =>
      'We couldn\'t find any recent prescriptions linked to your account.';

  @override
  String get pharmacySkipPrescription => 'Skip, I don\'t have a prescription';

  @override
  String securityEmailOtpSent(String email) {
    return 'A 6-digit code has been sent to $email. Please check your inbox.';
  }

  @override
  String get bookingChooseDoctor => 'Choose a doctor';

  @override
  String get bookingChooseDoctorDesc =>
      'Only doctors matching your selected specialty are shown.';

  @override
  String get bookingSearchDoctor => 'Search doctor by name';

  @override
  String get bookingNoDoctorsFound => 'No doctors found for this specialty.';

  @override
  String get bookingNoSchedule =>
      'This doctor has no working schedule yet. Please choose another doctor.';

  @override
  String labelYearsExp(String years) {
    return '$years yrs';
  }

  @override
  String get pharmacySearchPlaceholder => 'Search pharmacies...';

  @override
  String get pharmacyDeliveryOnly => 'Delivery only';

  @override
  String get pharmacyNearby => 'Nearby Pharmacies';

  @override
  String get pharmacyDeliveryAvailable => 'Delivery Available';

  @override
  String get pharmacyFullyStocked => 'Fully Stocked';

  @override
  String get pharmacyPartiallyStocked => 'Partially Stocked';

  @override
  String get pharmacyNoDistance => 'No distance available';

  @override
  String pharmacyDistance(String distance) {
    return '$distance km away';
  }

  @override
  String get pharmacySelect => 'Select';

  @override
  String get pharmacyConsult => 'Send Request';

  @override
  String get pharmacyRequestSent => 'Request Sent';

  @override
  String get pharmacyMissingItems => 'Missing';

  @override
  String pharmacyMoreItems(int count) {
    return '+$count more';
  }

  @override
  String get pharmacyNoNotes => 'No additional notes provided.';

  @override
  String get orderStatusCreated => 'Order Created';

  @override
  String get orderStatusInReview => 'In Review';

  @override
  String get orderStatusAccepted => 'Accepted';

  @override
  String get orderStatusRejected => 'Rejected';

  @override
  String get actionViewOrder => 'View Order';

  @override
  String get pharmacyRequestSentDesc =>
      'Successfully transmitted to the pharmacy';

  @override
  String get pharmacyConnected => 'Connected';

  @override
  String get pharmacyConnectedDesc => 'Direct channel established';

  @override
  String get pharmacySecureConnection =>
      'Ensuring a secure and encrypted connection to your healthcare provider.';

  @override
  String get labelNew => 'New';

  @override
  String labelReviews(String count) {
    return '$count reviews';
  }

  @override
  String get bookingErrSelectDoctor => 'Please select a doctor.';

  @override
  String get bookingChooseDateTime => 'Choose date & time';

  @override
  String get bookingChooseDateTimeDesc =>
      'Select one available slot. Tap again to cancel your selection.';

  @override
  String get bookingErrSelectSpecialty => 'Please select a specialty.';

  @override
  String get bookingErrSelectSlot => 'Please select an available time slot.';

  @override
  String get bookingErrMissingSymptoms => 'Please describe your symptoms.';

  @override
  String labelWeek(String weekRange) {
    return 'Week $weekRange';
  }

  @override
  String get bookingNoDoctorScheduleThisWeek =>
      'The doctor is not working this week.';

  @override
  String get bookingAvailableSlots => 'Available slots';

  @override
  String get bookingNoSlotsOnThisDay => 'No available slots on this day.';

  @override
  String get bookingSymptomsTitle => 'Symptoms & medical information';

  @override
  String get bookingSymptomsDesc =>
      'Describe your condition so the doctor can prepare better.';

  @override
  String get bookingSymptomsInput => 'Symptoms / reason for examination *';

  @override
  String get bookingSymptomsHint =>
      'Example: mild chest pain for the past 2 days...';

  @override
  String get bookingNotesInput => 'Additional notes';

  @override
  String get bookingNotesHint => 'Anything else you want the doctor to know.';

  @override
  String get bookingUploadDocNote =>
      'Documents will be uploaded and shared with the doctor after the appointment is confirmed.';

  @override
  String get bookingConfirmTitle => 'Confirm appointment';

  @override
  String get bookingConfirmDesc => 'Review your booking before submitting.';

  @override
  String get bookingLabelDoctor => 'Doctor';

  @override
  String get bookingLabelSpecialty => 'Specialty';

  @override
  String get bookingLabelDate => 'Date';

  @override
  String get bookingLabelTime => 'Time';

  @override
  String get bookingLabelFee => 'Fee';

  @override
  String get bookingPaymentNote =>
      'Payment note: mobile PayPal checkout still needs an approval URL/native SDK. This version confirms booking through the current appointment endpoint.';

  @override
  String get bookingErrMissingDocDate =>
      'Please select Date Performed for all uploaded documents.';

  @override
  String get bookingErrPaymentCancelled => 'Payment was cancelled.';

  @override
  String get bookingErrPendingOrderNotFound =>
      'Can not find pending PayPal order.';

  @override
  String get bookingErrPatientNotFound =>
      'Can not find patient information. Please login again.';

  @override
  String get bookingErrPaymentNotSupported =>
      'Payment processing is not supported yet.';

  @override
  String get bookingDatePerformed => 'Date Performed *';

  @override
  String get bookingSelectDatePerformed => 'Select date performed';

  @override
  String get bookingPaymentTitle => 'Payment';

  @override
  String get bookingPaymentDesc =>
      'Complete payment to confirm your appointment.';

  @override
  String get bookingLabelTotalAmount => 'Total amount';

  @override
  String get bookingPaymentNote2 =>
      'Your appointment will only be created after payment is successful.';

  @override
  String get bookingBtnPayConfirm => 'Pay & Confirm';

  @override
  String get labelToday => 'Today';

  @override
  String get labelTomorrow => 'Tomorrow';

  @override
  String get labelMon => 'Mon';

  @override
  String get labelTue => 'Tue';

  @override
  String get labelWed => 'Wed';

  @override
  String get labelThu => 'Thu';

  @override
  String get labelFri => 'Fri';

  @override
  String get labelSat => 'Sat';

  @override
  String get labelSun => 'Sun';

  @override
  String bookingErrSensitiveContent(String fileName) {
    return 'The file \"$fileName\" may contain sensitive content and cannot be uploaded.';
  }

  @override
  String bookingErrUploadFailed(String fileName, String message) {
    return 'Can not upload \"$fileName\". $message';
  }

  @override
  String get bookingErrNoAppointmentReturned =>
      'Payment succeeded but appointment was not returned.';

  @override
  String get bookingErrCannotCreatePayPalOrder =>
      'Can not create PayPal order.';

  @override
  String get bookingErrCannotOpenPayPalApproval =>
      'Can not open PayPal approval page.';

  @override
  String get bookingErrCannotOpenPayPal => 'Can not open PayPal.';

  @override
  String get bookingLoginRequiredTitle => 'Login required';

  @override
  String get bookingLoginRequiredDesc =>
      'Please login before booking an appointment.';

  @override
  String get bookingUploadWarnDesc =>
      'Your appointment was booked successfully, but some documents could not be uploaded:';

  @override
  String bookingErrUnsupportedConsultationType(String type) {
    return 'Doctor does not support consultation type: $type';
  }

  @override
  String get prescriptionSetReminder => 'Set Medication Reminder';

  @override
  String get orderLabel => 'Order';

  @override
  String get orderStatusReady => 'Ready';

  @override
  String get pharmacyLabel => 'Pharmacy';

  @override
  String get deliveryLabel => 'Delivery';

  @override
  String get deliveryHome => 'Home Delivery';

  @override
  String get addressLabel => 'Address';

  @override
  String get quantityLabel => 'Quantity';

  @override
  String get subtotalLabel => 'Subtotal';

  @override
  String get deliveryFeeLabel => 'Delivery Fee';

  @override
  String get paymentInstructionsHint =>
      'Need to change delivery time or add instructions?';

  @override
  String get pharmacyTabStore => 'Store';

  @override
  String get storeTitle => 'Medicine Store';

  @override
  String get storeSubtitle =>
      'Browse over-the-counter medicines and place a retail pharmacy order.';

  @override
  String get storeSearchHint => 'Name, brand, category, dosage...';

  @override
  String get storeSearchLabel => 'Search';

  @override
  String get storeCategoryLabel => 'Category';

  @override
  String get storeDosageFormLabel => 'Dosage form';

  @override
  String get storeAllCategories => 'All categories';

  @override
  String get storeAllForms => 'All forms';

  @override
  String get storeCart => 'Cart';

  @override
  String storeItemsCount(int count) {
    return '$count items';
  }

  @override
  String get storeAdd => 'Add';

  @override
  String storeInCart(int count) {
    return 'In cart: $count';
  }

  @override
  String get storeDetails => 'Details';

  @override
  String get storeSubtotalLabel => 'Subtotal';

  @override
  String get storeCheckout => 'Checkout';

  @override
  String get storePrescriptionRequired => 'Prescription';

  @override
  String get storePrescriptionRequiredMsg =>
      'This medicine requires a prescription.';

  @override
  String get storeNoResults => 'No medicines match your filters.';

  @override
  String get storeCartEmpty =>
      'Add over-the-counter medicines to start checkout.';

  @override
  String get storeEach => 'each';

  @override
  String get storeNoDescription => 'No description available.';

  @override
  String get storeBrand => 'Brand';

  @override
  String get storeGeneric => 'Generic';

  @override
  String get storeUnit => 'Unit';

  @override
  String get storePrescriptionWarning =>
      'This medicine requires a prescription and cannot be added to the retail cart.';

  @override
  String get retailCheckoutTitle => 'Retail Checkout';

  @override
  String get retailCheckoutSubtitle =>
      'Confirm delivery, compare pharmacies, then submit your order.';

  @override
  String get retailStepDelivery => 'Delivery';

  @override
  String get retailStepPharmacy => 'Pharmacy';

  @override
  String get retailStepReview => 'Review';

  @override
  String get retailReceiverPhone => 'Receiver phone';

  @override
  String get retailDeliveryAddress => 'Delivery address';

  @override
  String get retailUseCurrentLocation => 'Use current location';

  @override
  String get retailVerifyAddress => 'Verify address';

  @override
  String get retailLocationVerified => 'Location verified';

  @override
  String get retailContinue => 'Continue';

  @override
  String get retailSortedByHint =>
      'Sorted by distance, stock status, and rating.';

  @override
  String get retailPharmacyNotFound =>
      'No pharmacies found for this cart and delivery location.';

  @override
  String get retailStockFull => 'FULL';

  @override
  String get retailStockPartial => 'PARTIAL';

  @override
  String get retailStockUnknown => 'UNKNOWN';

  @override
  String get retailDeliveryFeeLabel => 'Delivery fee';

  @override
  String get retailDistanceUnavailable => 'Distance unavailable';

  @override
  String get retailMissingLabel => 'Missing';

  @override
  String get retailStockWarning =>
      'This pharmacy may not have every item in your cart. The pharmacy can still confirm, revise, or cancel after review.';

  @override
  String get retailMedicineSubtotal => 'Medicine subtotal';

  @override
  String get retailTotal => 'Total';

  @override
  String retailQtyLabel(int count) {
    return 'Qty $count';
  }

  @override
  String get retailSubmitOrder => 'Submit Order';

  @override
  String get retailSubmitting => 'Submitting...';

  @override
  String get retailOrderCreated => 'Retail order created.';

  @override
  String get retailEnterPhone => 'Please enter a delivery phone number.';

  @override
  String get retailEnterAddress => 'Please enter a delivery address.';

  @override
  String get retailChoosePharmacy => 'Please choose a pharmacy.';

  @override
  String get retailAddressVerified => 'Delivery address verified.';

  @override
  String get retailAddressUpdated =>
      'Delivery address updated from current location.';

  @override
  String get retailCannotAccessLocation =>
      'Cannot access your device location.';

  @override
  String get retailTryingLocation => 'Still trying to access your location.';

  @override
  String get retailPartialStockConfirm =>
      'This pharmacy may not have every cart item. Continue?';

  @override
  String get retailPharmacyLabel => 'Pharmacy';

  @override
  String get retailDeliveryLabel => 'Delivery';

  @override
  String get fillHealthInfoTitle => 'Pre-consultation Vitals';

  @override
  String get fillHealthInfoSubtitle =>
      'Please fill in your vitals. These fields are optional but recommended.';

  @override
  String get heartRate => 'Heart Rate';

  @override
  String get bloodPressure => 'Blood Pressure';

  @override
  String get bloodPressureSystolic => 'Systolic';

  @override
  String get bloodPressureDiastolic => 'Diastolic';

  @override
  String get temperature => 'Temperature';

  @override
  String get respiratoryRate => 'Respiratory Rate';

  @override
  String get spO2 => 'SpO2 (Oxygen)';

  @override
  String get notes => 'Symptoms / Notes';

  @override
  String get saveVitalsBtn => 'Save Vitals';

  @override
  String get chatBlockedVitalsWarning =>
      'Please provide your health information before starting the chat.';

  @override
  String get fillHealthInfoBtn => 'Fill Health Info';

  @override
  String get vitalsSavedSuccess =>
      'Pre-consultation vitals saved successfully.';

  @override
  String get vitalsInstructionsTitle =>
      'Instructions before starting the consultation';

  @override
  String get vitalsInstructions1 =>
      'If you have a home blood pressure monitor, please enter the readings shown on the device: SYS, DIA and Pulse.';

  @override
  String get vitalsInstructions2 =>
      'If you do not have a monitor, you can still measure your pulse manually: sit still, count your pulse for 30 seconds, then multiply by two to get beats/minute.';

  @override
  String get vitalsInstructions3 =>
      'SpO2 and temperature are optional, only enter if you have a suitable measuring device.';

  @override
  String get vitalsInstructionsDisclaimer =>
      'These readings are for the doctor\'s reference before the consultation, not a diagnosis.';

  @override
  String get measurementMethod => 'Measurement method *';

  @override
  String get measuredByDevice => 'Measured by home device';

  @override
  String get measuredByDeviceHint =>
      'Example: blood pressure monitor, SpO2 monitor, thermometer, smartwatch/smartband.';

  @override
  String get measuredManually => 'Measured manually';

  @override
  String get measuredManuallyHint =>
      'Use when you do not have a monitor. You can manually count your pulse for 30 seconds and then multiply by two.';

  @override
  String get deviceName => 'Device name, if any';

  @override
  String get deviceNameHint => 'Example: Omron blood pressure monitor, pulse';

  @override
  String get howToMeasurePulse => 'How to measure pulse manually?';

  @override
  String get whereToFindSysDia => 'Where can I find SYS/DIA/Pulse?';

  @override
  String get spo2Hint =>
      'Optional. Enter if measured by pulse oximeter or smartwatch.';

  @override
  String get tempHint => 'Optional. Enter if measured by thermometer.';

  @override
  String get respHint =>
      'Optional. Count breaths for 30 seconds, then multiply by 2.';

  @override
  String get notesHint =>
      'Example: measured after resting for 5 minutes, felt dizzy, mild chest discomfort...';

  @override
  String get btnRate => 'Rate';

  @override
  String get btnReviewed => 'Reviewed';

  @override
  String get rateExperienceTitle => 'Rate Your Experience';

  @override
  String get ratingLabel => 'Your Rating';

  @override
  String get selectRatingPrompt => 'Please select a rating';

  @override
  String get commentLabel => 'Your Comment';

  @override
  String get commentHint =>
      'Share your experience with this doctor... (minimum 10 characters)';

  @override
  String get commentTooShort => 'Comment must be at least 10 characters';

  @override
  String get postAnonymously => 'Post anonymously';

  @override
  String get postAnonymouslyHint =>
      'Your name will be hidden from the public review';

  @override
  String get submitReviewBtn => 'Submit Review';

  @override
  String get reviewSuccess => 'Review submitted successfully!';
}
