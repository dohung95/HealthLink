import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_vi.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('vi'),
  ];

  /// No description provided for @drawerAccount.
  ///
  /// In en, this message translates to:
  /// **'ACCOUNT'**
  String get drawerAccount;

  /// No description provided for @drawerMyProfile.
  ///
  /// In en, this message translates to:
  /// **'My Profile'**
  String get drawerMyProfile;

  /// No description provided for @drawerSecurity.
  ///
  /// In en, this message translates to:
  /// **'Security'**
  String get drawerSecurity;

  /// No description provided for @drawerSupport.
  ///
  /// In en, this message translates to:
  /// **'SUPPORT'**
  String get drawerSupport;

  /// No description provided for @drawerHelpSupport.
  ///
  /// In en, this message translates to:
  /// **'Help & Support'**
  String get drawerHelpSupport;

  /// No description provided for @drawerAboutUs.
  ///
  /// In en, this message translates to:
  /// **'About Us'**
  String get drawerAboutUs;

  /// No description provided for @drawerLogout.
  ///
  /// In en, this message translates to:
  /// **'Logout'**
  String get drawerLogout;

  /// No description provided for @drawerAppTheme.
  ///
  /// In en, this message translates to:
  /// **'App Theme'**
  String get drawerAppTheme;

  /// No description provided for @themeFollowSystem.
  ///
  /// In en, this message translates to:
  /// **'Follow System'**
  String get themeFollowSystem;

  /// No description provided for @themeDarkMode.
  ///
  /// In en, this message translates to:
  /// **'Dark Mode'**
  String get themeDarkMode;

  /// No description provided for @themeLightMode.
  ///
  /// In en, this message translates to:
  /// **'Light Mode'**
  String get themeLightMode;

  /// No description provided for @themeSelectTheme.
  ///
  /// In en, this message translates to:
  /// **'Select Theme'**
  String get themeSelectTheme;

  /// No description provided for @drawerAppLanguage.
  ///
  /// In en, this message translates to:
  /// **'App Language'**
  String get drawerAppLanguage;

  /// No description provided for @languageVietnamese.
  ///
  /// In en, this message translates to:
  /// **'Vietnamese'**
  String get languageVietnamese;

  /// No description provided for @languageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @drawerEmailNotUpdated.
  ///
  /// In en, this message translates to:
  /// **'Email not updated'**
  String get drawerEmailNotUpdated;

  /// No description provided for @tabBooking.
  ///
  /// In en, this message translates to:
  /// **'Booking'**
  String get tabBooking;

  /// No description provided for @tabAppointments.
  ///
  /// In en, this message translates to:
  /// **'Appointments'**
  String get tabAppointments;

  /// No description provided for @tabHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get tabHome;

  /// No description provided for @tabChat.
  ///
  /// In en, this message translates to:
  /// **'Chat'**
  String get tabChat;

  /// No description provided for @tabPrescriptions.
  ///
  /// In en, this message translates to:
  /// **'Prescriptions'**
  String get tabPrescriptions;

  /// No description provided for @featureUnderDevelopment.
  ///
  /// In en, this message translates to:
  /// **'The {feature} feature is under development...'**
  String featureUnderDevelopment(String feature);

  /// No description provided for @greetingMorning.
  ///
  /// In en, this message translates to:
  /// **'Hello, Good Morning'**
  String get greetingMorning;

  /// No description provided for @greetingAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Hi, Good Afternoon,'**
  String get greetingAfternoon;

  /// No description provided for @greetingEvening.
  ///
  /// In en, this message translates to:
  /// **'Have a good night'**
  String get greetingEvening;

  /// No description provided for @statUpcoming.
  ///
  /// In en, this message translates to:
  /// **'Upcoming'**
  String get statUpcoming;

  /// No description provided for @statNewRecords.
  ///
  /// In en, this message translates to:
  /// **'New Records'**
  String get statNewRecords;

  /// No description provided for @statPrescriptions.
  ///
  /// In en, this message translates to:
  /// **'Prescriptions'**
  String get statPrescriptions;

  /// No description provided for @upcomingAppointmentsTitle.
  ///
  /// In en, this message translates to:
  /// **'Upcoming Appointments'**
  String get upcomingAppointmentsTitle;

  /// No description provided for @btnBack.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get btnBack;

  /// No description provided for @btnNext.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get btnNext;

  /// No description provided for @btnBook.
  ///
  /// In en, this message translates to:
  /// **'Book'**
  String get btnBook;

  /// No description provided for @btnChat.
  ///
  /// In en, this message translates to:
  /// **'Chat'**
  String get btnChat;

  /// No description provided for @btnJoinRoom.
  ///
  /// In en, this message translates to:
  /// **'Join Room'**
  String get btnJoinRoom;

  /// No description provided for @btnCallNow.
  ///
  /// In en, this message translates to:
  /// **'Call Now'**
  String get btnCallNow;

  /// No description provided for @btnReschedule.
  ///
  /// In en, this message translates to:
  /// **'Reschedule'**
  String get btnReschedule;

  /// No description provided for @btnCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get btnCancel;

  /// No description provided for @btnKeepIt.
  ///
  /// In en, this message translates to:
  /// **'No, Keep It'**
  String get btnKeepIt;

  /// No description provided for @btnYesCancel.
  ///
  /// In en, this message translates to:
  /// **'Yes, Cancel'**
  String get btnYesCancel;

  /// No description provided for @statusScheduled.
  ///
  /// In en, this message translates to:
  /// **'Scheduled'**
  String get statusScheduled;

  /// No description provided for @statusConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get statusConfirmed;

  /// No description provided for @statusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get statusCompleted;

  /// No description provided for @statusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get statusCancelled;

  /// No description provided for @statusExpired.
  ///
  /// In en, this message translates to:
  /// **'Expired'**
  String get statusExpired;

  /// No description provided for @filterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get filterAll;

  /// No description provided for @filterUpcoming.
  ///
  /// In en, this message translates to:
  /// **'Upcoming'**
  String get filterUpcoming;

  /// No description provided for @filterExpired.
  ///
  /// In en, this message translates to:
  /// **'Expired'**
  String get filterExpired;

  /// No description provided for @filterCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get filterCompleted;

  /// No description provided for @filterCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get filterCancelled;

  /// No description provided for @filterInConsultation.
  ///
  /// In en, this message translates to:
  /// **'In consultation'**
  String get filterInConsultation;

  /// No description provided for @homeNoUpcomingAppointments.
  ///
  /// In en, this message translates to:
  /// **'No upcoming appointments'**
  String get homeNoUpcomingAppointments;

  /// No description provided for @homeBookAppointmentPrompt.
  ///
  /// In en, this message translates to:
  /// **'Book an appointment to start consulting with a doctor.'**
  String get homeBookAppointmentPrompt;

  /// No description provided for @homeQuickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick Actions'**
  String get homeQuickActions;

  /// No description provided for @homeHealthRecords.
  ///
  /// In en, this message translates to:
  /// **'Health Records'**
  String get homeHealthRecords;

  /// No description provided for @homeShareRecords.
  ///
  /// In en, this message translates to:
  /// **'Share Records'**
  String get homeShareRecords;

  /// No description provided for @homeDoctorRanking.
  ///
  /// In en, this message translates to:
  /// **'Doctor Ranking'**
  String get homeDoctorRanking;

  /// No description provided for @homePharmacy.
  ///
  /// In en, this message translates to:
  /// **'Pharmacy'**
  String get homePharmacy;

  /// No description provided for @appointmentToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get appointmentToday;

  /// No description provided for @appointmentUpcoming.
  ///
  /// In en, this message translates to:
  /// **'Upcoming'**
  String get appointmentUpcoming;

  /// No description provided for @appointmentMore.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get appointmentMore;

  /// No description provided for @openingChatRoom.
  ///
  /// In en, this message translates to:
  /// **'Opening chat room...'**
  String get openingChatRoom;

  /// No description provided for @openingVideoRoom.
  ///
  /// In en, this message translates to:
  /// **'Opening video room...'**
  String get openingVideoRoom;

  /// No description provided for @helpHowCanWeHelp.
  ///
  /// In en, this message translates to:
  /// **'How can we help?'**
  String get helpHowCanWeHelp;

  /// No description provided for @helpFindAnswers.
  ///
  /// In en, this message translates to:
  /// **'Find answers or contact the HealthLink support team.'**
  String get helpFindAnswers;

  /// No description provided for @helpMedicalEmergency.
  ///
  /// In en, this message translates to:
  /// **'Medical Emergency'**
  String get helpMedicalEmergency;

  /// No description provided for @helpEmergencyNotice.
  ///
  /// In en, this message translates to:
  /// **'HealthLink is not an emergency service. If you are experiencing a medical emergency, contact emergency services immediately.'**
  String get helpEmergencyNotice;

  /// No description provided for @helpCall115.
  ///
  /// In en, this message translates to:
  /// **'Call 115'**
  String get helpCall115;

  /// No description provided for @helpFAQ.
  ///
  /// In en, this message translates to:
  /// **'Frequently Asked Questions'**
  String get helpFAQ;

  /// No description provided for @helpSearch.
  ///
  /// In en, this message translates to:
  /// **'Search for help...'**
  String get helpSearch;

  /// No description provided for @helpContactSupport.
  ///
  /// In en, this message translates to:
  /// **'Contact Support'**
  String get helpContactSupport;

  /// No description provided for @helpEmailSupport.
  ///
  /// In en, this message translates to:
  /// **'Email Support'**
  String get helpEmailSupport;

  /// No description provided for @helpNoMatch.
  ///
  /// In en, this message translates to:
  /// **'No matching help topics found.'**
  String get helpNoMatch;

  /// No description provided for @helpTryAnother.
  ///
  /// In en, this message translates to:
  /// **'Try another keyword or category.'**
  String get helpTryAnother;

  /// No description provided for @helpPrivacyNotice.
  ///
  /// In en, this message translates to:
  /// **'Do not include passwords, payment credentials or unnecessary medical information in your support email.'**
  String get helpPrivacyNotice;

  /// No description provided for @helpCategoryAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get helpCategoryAll;

  /// No description provided for @helpCategoryBooking.
  ///
  /// In en, this message translates to:
  /// **'Booking'**
  String get helpCategoryBooking;

  /// No description provided for @helpCategoryAppointments.
  ///
  /// In en, this message translates to:
  /// **'Appointments'**
  String get helpCategoryAppointments;

  /// No description provided for @helpCategoryHealthRecords.
  ///
  /// In en, this message translates to:
  /// **'Health Records'**
  String get helpCategoryHealthRecords;

  /// No description provided for @helpCategoryConsultation.
  ///
  /// In en, this message translates to:
  /// **'Consultation'**
  String get helpCategoryConsultation;

  /// No description provided for @helpCategoryAccount.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get helpCategoryAccount;

  /// No description provided for @aboutTitle.
  ///
  /// In en, this message translates to:
  /// **'About HealthLink'**
  String get aboutTitle;

  /// No description provided for @aboutVersion.
  ///
  /// In en, this message translates to:
  /// **'Version {version}'**
  String aboutVersion(String version);

  /// No description provided for @aboutMission.
  ///
  /// In en, this message translates to:
  /// **'Our Mission'**
  String get aboutMission;

  /// No description provided for @aboutMissionDesc.
  ///
  /// In en, this message translates to:
  /// **'HealthLink was born with the goal of bridging the gap between patients and medical professionals. We leverage the power of technology to provide comprehensive, fast, and most effective healthcare solutions for everyone, every home.'**
  String get aboutMissionDesc;

  /// No description provided for @aboutCoreFeatures.
  ///
  /// In en, this message translates to:
  /// **'Core Features'**
  String get aboutCoreFeatures;

  /// No description provided for @aboutFeatVideo.
  ///
  /// In en, this message translates to:
  /// **'Online Video Consultation'**
  String get aboutFeatVideo;

  /// No description provided for @aboutFeatVideoDesc.
  ///
  /// In en, this message translates to:
  /// **'Connect directly with specialists from the comfort of your home.'**
  String get aboutFeatVideoDesc;

  /// No description provided for @aboutFeatRecords.
  ///
  /// In en, this message translates to:
  /// **'Medical Record Management'**
  String get aboutFeatRecords;

  /// No description provided for @aboutFeatRecordsDesc.
  ///
  /// In en, this message translates to:
  /// **'Store and track medical history and prescriptions securely.'**
  String get aboutFeatRecordsDesc;

  /// No description provided for @aboutFeatAI.
  ///
  /// In en, this message translates to:
  /// **'Smart AI Assistant'**
  String get aboutFeatAI;

  /// No description provided for @aboutFeatAIDesc.
  ///
  /// In en, this message translates to:
  /// **'24/7 support for basic medical inquiries and guidance.'**
  String get aboutFeatAIDesc;

  /// No description provided for @aboutFeatConnection.
  ///
  /// In en, this message translates to:
  /// **'Instant Connection'**
  String get aboutFeatConnection;

  /// No description provided for @aboutFeatConnectionDesc.
  ///
  /// In en, this message translates to:
  /// **'Direct communication with doctors via our messaging system.'**
  String get aboutFeatConnectionDesc;

  /// No description provided for @aboutContactUs.
  ///
  /// In en, this message translates to:
  /// **'Contact Us'**
  String get aboutContactUs;

  /// No description provided for @aboutFooter.
  ///
  /// In en, this message translates to:
  /// **'© 2026 HealthLink Team. All rights reserved.'**
  String get aboutFooter;

  /// No description provided for @bookingTitle.
  ///
  /// In en, this message translates to:
  /// **'Book an appointment'**
  String get bookingTitle;

  /// No description provided for @bookingSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Select a specialty, doctor and time that suits you.'**
  String get bookingSubtitle;

  /// No description provided for @bookingStepSpecialty.
  ///
  /// In en, this message translates to:
  /// **'Specialty'**
  String get bookingStepSpecialty;

  /// No description provided for @bookingStepDoctor.
  ///
  /// In en, this message translates to:
  /// **'Doctor'**
  String get bookingStepDoctor;

  /// No description provided for @bookingStepDateTime.
  ///
  /// In en, this message translates to:
  /// **'Date & Time'**
  String get bookingStepDateTime;

  /// No description provided for @bookingChooseSpecialty.
  ///
  /// In en, this message translates to:
  /// **'Choose a specialty'**
  String get bookingChooseSpecialty;

  /// No description provided for @bookingChooseSpecialtyDesc.
  ///
  /// In en, this message translates to:
  /// **'Start by selecting the care area you need.'**
  String get bookingChooseSpecialtyDesc;

  /// No description provided for @myAppointmentsTitle.
  ///
  /// In en, this message translates to:
  /// **'My Appointments'**
  String get myAppointmentsTitle;

  /// No description provided for @myAppointmentsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'View and manage your appointments'**
  String get myAppointmentsSubtitle;

  /// No description provided for @showingAppointmentsCount.
  ///
  /// In en, this message translates to:
  /// **'Showing {count} appointment(s)'**
  String showingAppointmentsCount(int count);

  /// No description provided for @paginationInfo.
  ///
  /// In en, this message translates to:
  /// **'Page {current} of {total} ({items} appointments)'**
  String paginationInfo(int current, int total, int items);

  /// No description provided for @noAppointmentsYet.
  ///
  /// In en, this message translates to:
  /// **'No appointments yet'**
  String get noAppointmentsYet;

  /// No description provided for @noAppointmentsYetDesc.
  ///
  /// In en, this message translates to:
  /// **'Book your first appointment to start consulting with a doctor.'**
  String get noAppointmentsYetDesc;

  /// No description provided for @noStatusAppointments.
  ///
  /// In en, this message translates to:
  /// **'No {status} appointments'**
  String noStatusAppointments(String status);

  /// No description provided for @noStatusAppointmentsDesc.
  ///
  /// In en, this message translates to:
  /// **'No appointments match the selected status.'**
  String get noStatusAppointmentsDesc;

  /// No description provided for @cancelAppointmentDialogTitle.
  ///
  /// In en, this message translates to:
  /// **'Cancel Appointment'**
  String get cancelAppointmentDialogTitle;

  /// No description provided for @cancelAppointmentDialogDesc.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to cancel this appointment? This action cannot be undone.'**
  String get cancelAppointmentDialogDesc;

  /// No description provided for @msgCancelSuccess.
  ///
  /// In en, this message translates to:
  /// **'Appointment cancelled successfully.'**
  String get msgCancelSuccess;

  /// No description provided for @msgAlreadyInCall.
  ///
  /// In en, this message translates to:
  /// **'You are already in a call!'**
  String get msgAlreadyInCall;

  /// No description provided for @msgCannotStartVideoCall.
  ///
  /// In en, this message translates to:
  /// **'Can not start video call, please login.'**
  String get msgCannotStartVideoCall;

  /// No description provided for @bookingStepMedicalInfo.
  ///
  /// In en, this message translates to:
  /// **'Medical Info'**
  String get bookingStepMedicalInfo;

  /// No description provided for @bookingStepConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get bookingStepConfirm;

  /// No description provided for @bookingStepPayment.
  ///
  /// In en, this message translates to:
  /// **'Payment'**
  String get bookingStepPayment;

  /// No description provided for @chatMessagesTitle.
  ///
  /// In en, this message translates to:
  /// **'Messages'**
  String get chatMessagesTitle;

  /// No description provided for @chatSearchPrompt.
  ///
  /// In en, this message translates to:
  /// **'Search doctor, specialty or message...'**
  String get chatSearchPrompt;

  /// No description provided for @chatHealthLinkAI.
  ///
  /// In en, this message translates to:
  /// **'HealthLink AI'**
  String get chatHealthLinkAI;

  /// No description provided for @chatAIAssistantDesc.
  ///
  /// In en, this message translates to:
  /// **'Your intelligent health assistant'**
  String get chatAIAssistantDesc;

  /// No description provided for @chatAIPrompt.
  ///
  /// In en, this message translates to:
  /// **'Ask about symptoms, book an appointment...'**
  String get chatAIPrompt;

  /// No description provided for @chatTryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get chatTryAgain;

  /// No description provided for @chatNoConversations.
  ///
  /// In en, this message translates to:
  /// **'No conversations yet.'**
  String get chatNoConversations;

  /// No description provided for @chatNoResults.
  ///
  /// In en, this message translates to:
  /// **'No results found.'**
  String get chatNoResults;

  /// No description provided for @chatBlockedUsers.
  ///
  /// In en, this message translates to:
  /// **'Blocked users'**
  String get chatBlockedUsers;

  /// No description provided for @chatNoBlockedUsers.
  ///
  /// In en, this message translates to:
  /// **'No users are blocked.'**
  String get chatNoBlockedUsers;

  /// No description provided for @chatUnblockedSuccess.
  ///
  /// In en, this message translates to:
  /// **'Unblocked user successfully'**
  String get chatUnblockedSuccess;

  /// No description provided for @chatUnblock.
  ///
  /// In en, this message translates to:
  /// **'Unblock'**
  String get chatUnblock;

  /// No description provided for @chatClose.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get chatClose;

  /// No description provided for @prescriptionsTitle.
  ///
  /// In en, this message translates to:
  /// **'My Prescriptions'**
  String get prescriptionsTitle;

  /// No description provided for @prescriptionsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Manage prescription history and details'**
  String get prescriptionsSubtitle;

  /// No description provided for @filterActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get filterActive;

  /// No description provided for @prescriptionLabel.
  ///
  /// In en, this message translates to:
  /// **'Prescription'**
  String get prescriptionLabel;

  /// No description provided for @prescriptionDateIssued.
  ///
  /// In en, this message translates to:
  /// **'Date Issued'**
  String get prescriptionDateIssued;

  /// No description provided for @prescriptionCondition.
  ///
  /// In en, this message translates to:
  /// **'Condition'**
  String get prescriptionCondition;

  /// No description provided for @prescriptionMedicationsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} medications'**
  String prescriptionMedicationsCount(int count);

  /// No description provided for @btnViewDetails.
  ///
  /// In en, this message translates to:
  /// **'View Details >'**
  String get btnViewDetails;

  /// No description provided for @statusIssued.
  ///
  /// In en, this message translates to:
  /// **'Issued'**
  String get statusIssued;

  /// No description provided for @labelNA.
  ///
  /// In en, this message translates to:
  /// **'N/A'**
  String get labelNA;

  /// No description provided for @prescriptionDetailsTitle.
  ///
  /// In en, this message translates to:
  /// **'Prescription Details'**
  String get prescriptionDetailsTitle;

  /// No description provided for @labelDoctor.
  ///
  /// In en, this message translates to:
  /// **'Doctor:'**
  String get labelDoctor;

  /// No description provided for @labelDate.
  ///
  /// In en, this message translates to:
  /// **'Date:'**
  String get labelDate;

  /// No description provided for @medicationListCount.
  ///
  /// In en, this message translates to:
  /// **'Medication List ({count})'**
  String medicationListCount(int count);

  /// No description provided for @profileTitle.
  ///
  /// In en, this message translates to:
  /// **'My profile'**
  String get profileTitle;

  /// No description provided for @profileVerifiedIdentity.
  ///
  /// In en, this message translates to:
  /// **'VERIFIED IDENTITY'**
  String get profileVerifiedIdentity;

  /// No description provided for @profileBloodType.
  ///
  /// In en, this message translates to:
  /// **'Blood Type'**
  String get profileBloodType;

  /// No description provided for @profileHeight.
  ///
  /// In en, this message translates to:
  /// **'Height (cm)'**
  String get profileHeight;

  /// No description provided for @profileWeight.
  ///
  /// In en, this message translates to:
  /// **'Weight (kg)'**
  String get profileWeight;

  /// No description provided for @profileIdentityMetrics.
  ///
  /// In en, this message translates to:
  /// **'IDENTITY METRICS'**
  String get profileIdentityMetrics;

  /// No description provided for @profileGender.
  ///
  /// In en, this message translates to:
  /// **'GENDER'**
  String get profileGender;

  /// No description provided for @profileDob.
  ///
  /// In en, this message translates to:
  /// **'DOB'**
  String get profileDob;

  /// No description provided for @profileOccupation.
  ///
  /// In en, this message translates to:
  /// **'OCCUPATION'**
  String get profileOccupation;

  /// No description provided for @profileLanguage.
  ///
  /// In en, this message translates to:
  /// **'LANGUAGE'**
  String get profileLanguage;

  /// No description provided for @profileLocationData.
  ///
  /// In en, this message translates to:
  /// **'LOCATION DATA'**
  String get profileLocationData;

  /// No description provided for @profilePrimaryAddress.
  ///
  /// In en, this message translates to:
  /// **'PRIMARY ADDRESS'**
  String get profilePrimaryAddress;

  /// No description provided for @profileContactNumber.
  ///
  /// In en, this message translates to:
  /// **'CONTACT NUMBER'**
  String get profileContactNumber;

  /// No description provided for @profilePolicyDesignation.
  ///
  /// In en, this message translates to:
  /// **'POLICY DESIGNATION'**
  String get profilePolicyDesignation;

  /// No description provided for @profileMedicalDossier.
  ///
  /// In en, this message translates to:
  /// **'MEDICAL DOSSIER'**
  String get profileMedicalDossier;

  /// No description provided for @profileHistorySummary.
  ///
  /// In en, this message translates to:
  /// **'History Summary'**
  String get profileHistorySummary;

  /// No description provided for @profileChronicConditions.
  ///
  /// In en, this message translates to:
  /// **'Chronic Conditions'**
  String get profileChronicConditions;

  /// No description provided for @profileAllergies.
  ///
  /// In en, this message translates to:
  /// **'Allergies'**
  String get profileAllergies;

  /// No description provided for @profileCurrentMedications.
  ///
  /// In en, this message translates to:
  /// **'Current Medications'**
  String get profileCurrentMedications;

  /// No description provided for @profileEmergencyContact.
  ///
  /// In en, this message translates to:
  /// **'EMERGENCY CONTACT'**
  String get profileEmergencyContact;

  /// No description provided for @profilePrimaryProxy.
  ///
  /// In en, this message translates to:
  /// **'PRIMARY PROXY'**
  String get profilePrimaryProxy;

  /// No description provided for @labelNone.
  ///
  /// In en, this message translates to:
  /// **'None'**
  String get labelNone;

  /// No description provided for @labelNotProvided.
  ///
  /// In en, this message translates to:
  /// **'Not Provided'**
  String get labelNotProvided;

  /// No description provided for @actionBack.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get actionBack;

  /// No description provided for @actionBackToLogin.
  ///
  /// In en, this message translates to:
  /// **'Back to Login'**
  String get actionBackToLogin;

  /// No description provided for @securityTitle.
  ///
  /// In en, this message translates to:
  /// **'Security Settings'**
  String get securityTitle;

  /// No description provided for @securityChangeEmail.
  ///
  /// In en, this message translates to:
  /// **'Change Email'**
  String get securityChangeEmail;

  /// No description provided for @securityChangeEmailDesc.
  ///
  /// In en, this message translates to:
  /// **'A verification code will be sent to your new email address.'**
  String get securityChangeEmailDesc;

  /// No description provided for @securityNewEmail.
  ///
  /// In en, this message translates to:
  /// **'New Email'**
  String get securityNewEmail;

  /// No description provided for @securityEnterNewEmail.
  ///
  /// In en, this message translates to:
  /// **'Enter new email'**
  String get securityEnterNewEmail;

  /// No description provided for @securityCurrentPassword.
  ///
  /// In en, this message translates to:
  /// **'Current Password'**
  String get securityCurrentPassword;

  /// No description provided for @securityForVerification.
  ///
  /// In en, this message translates to:
  /// **'For verification'**
  String get securityForVerification;

  /// No description provided for @securitySendVerificationCode.
  ///
  /// In en, this message translates to:
  /// **'Send Verification Code'**
  String get securitySendVerificationCode;

  /// No description provided for @securityChangePassword.
  ///
  /// In en, this message translates to:
  /// **'Change Password'**
  String get securityChangePassword;

  /// No description provided for @securityChangePasswordDesc.
  ///
  /// In en, this message translates to:
  /// **'After changing your password, you will need to log in again.'**
  String get securityChangePasswordDesc;

  /// No description provided for @securityEnterCurrentPassword.
  ///
  /// In en, this message translates to:
  /// **'Enter current password'**
  String get securityEnterCurrentPassword;

  /// No description provided for @securityNewPassword.
  ///
  /// In en, this message translates to:
  /// **'New Password'**
  String get securityNewPassword;

  /// No description provided for @securityEnterNewPassword.
  ///
  /// In en, this message translates to:
  /// **'Enter new password'**
  String get securityEnterNewPassword;

  /// No description provided for @securityConfirmNewPassword.
  ///
  /// In en, this message translates to:
  /// **'Confirm New Password'**
  String get securityConfirmNewPassword;

  /// No description provided for @securityEnterConfirmNewPassword.
  ///
  /// In en, this message translates to:
  /// **'Confirm new password'**
  String get securityEnterConfirmNewPassword;

  /// No description provided for @notificationsTitle.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notificationsTitle;

  /// No description provided for @notificationsMarkAllRead.
  ///
  /// In en, this message translates to:
  /// **'Mark all read'**
  String get notificationsMarkAllRead;

  /// No description provided for @notificationsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No notifications yet.'**
  String get notificationsEmpty;

  /// No description provided for @healthRecordsTitle.
  ///
  /// In en, this message translates to:
  /// **'Health Records'**
  String get healthRecordsTitle;

  /// No description provided for @healthRecordsUploadDoc.
  ///
  /// In en, this message translates to:
  /// **'Upload medical document'**
  String get healthRecordsUploadDoc;

  /// No description provided for @healthRecordsDateRequired.
  ///
  /// In en, this message translates to:
  /// **'Date Performed is required and cannot be in the future.'**
  String get healthRecordsDateRequired;

  /// No description provided for @healthRecordsCategory.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get healthRecordsCategory;

  /// No description provided for @healthRecordsCategoryOther.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get healthRecordsCategoryOther;

  /// No description provided for @healthRecordsSelectDate.
  ///
  /// In en, this message translates to:
  /// **'Select Date Performed *'**
  String get healthRecordsSelectDate;

  /// No description provided for @healthRecordsDescription.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get healthRecordsDescription;

  /// No description provided for @healthRecordsChooseFile.
  ///
  /// In en, this message translates to:
  /// **'Choose file *'**
  String get healthRecordsChooseFile;

  /// No description provided for @healthRecordsUpload.
  ///
  /// In en, this message translates to:
  /// **'Upload'**
  String get healthRecordsUpload;

  /// No description provided for @healthRecordsNoRecords.
  ///
  /// In en, this message translates to:
  /// **'No health records yet'**
  String get healthRecordsNoRecords;

  /// No description provided for @healthRecordsNoRecordsDesc.
  ///
  /// In en, this message translates to:
  /// **'Upload your first medical document to create a health record.'**
  String get healthRecordsNoRecordsDesc;

  /// No description provided for @shareRecordsTitle.
  ///
  /// In en, this message translates to:
  /// **'Share Health Records'**
  String get shareRecordsTitle;

  /// No description provided for @shareRecordsGrantAccess.
  ///
  /// In en, this message translates to:
  /// **'Grant New Access'**
  String get shareRecordsGrantAccess;

  /// No description provided for @shareRecordsGrantAccessDesc.
  ///
  /// In en, this message translates to:
  /// **'Select a health record, documents and doctor to share with.'**
  String get shareRecordsGrantAccessDesc;

  /// No description provided for @shareRecordsHealthRecord.
  ///
  /// In en, this message translates to:
  /// **'Health Record'**
  String get shareRecordsHealthRecord;

  /// No description provided for @shareRecordsSpecialty.
  ///
  /// In en, this message translates to:
  /// **'Specialty'**
  String get shareRecordsSpecialty;

  /// No description provided for @shareRecordsDoctor.
  ///
  /// In en, this message translates to:
  /// **'Doctor'**
  String get shareRecordsDoctor;

  /// No description provided for @shareRecordsPermission.
  ///
  /// In en, this message translates to:
  /// **'Permission'**
  String get shareRecordsPermission;

  /// No description provided for @shareRecordsViewOnly.
  ///
  /// In en, this message translates to:
  /// **'View only'**
  String get shareRecordsViewOnly;

  /// No description provided for @shareRecordsNoExpiry.
  ///
  /// In en, this message translates to:
  /// **'No expiry date'**
  String get shareRecordsNoExpiry;

  /// No description provided for @shareRecordsShareBtn.
  ///
  /// In en, this message translates to:
  /// **'Share Record'**
  String get shareRecordsShareBtn;

  /// No description provided for @shareRecordsActiveShared.
  ///
  /// In en, this message translates to:
  /// **'Active Shared Records'**
  String get shareRecordsActiveShared;

  /// No description provided for @shareRecordsActiveSharedDesc.
  ///
  /// In en, this message translates to:
  /// **'Records currently shared with doctors.'**
  String get shareRecordsActiveSharedDesc;

  /// No description provided for @shareRecordsNoActiveShares.
  ///
  /// In en, this message translates to:
  /// **'No active shares'**
  String get shareRecordsNoActiveShares;

  /// No description provided for @shareRecordsNoActiveSharesDesc.
  ///
  /// In en, this message translates to:
  /// **'Shared records will appear here.'**
  String get shareRecordsNoActiveSharesDesc;

  /// No description provided for @shareRecordsRevokeTitle.
  ///
  /// In en, this message translates to:
  /// **'Revoke Access'**
  String get shareRecordsRevokeTitle;

  /// No description provided for @actionCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get actionCancel;

  /// No description provided for @actionRevoke.
  ///
  /// In en, this message translates to:
  /// **'Revoke'**
  String get actionRevoke;

  /// No description provided for @shareRecordsClearExpiry.
  ///
  /// In en, this message translates to:
  /// **'Clear expiry date'**
  String get shareRecordsClearExpiry;

  /// No description provided for @shareRecordsViewAllDesc.
  ///
  /// In en, this message translates to:
  /// **'Doctor can view all documents in this record.'**
  String get shareRecordsViewAllDesc;

  /// No description provided for @sortHighestRating.
  ///
  /// In en, this message translates to:
  /// **'Highest rating'**
  String get sortHighestRating;

  /// No description provided for @sortMostReviews.
  ///
  /// In en, this message translates to:
  /// **'Most reviews'**
  String get sortMostReviews;

  /// No description provided for @sortMostExperience.
  ///
  /// In en, this message translates to:
  /// **'Most experience'**
  String get sortMostExperience;

  /// No description provided for @sortAZ.
  ///
  /// In en, this message translates to:
  /// **'A-Z'**
  String get sortAZ;

  /// No description provided for @profileEditTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit Profile'**
  String get profileEditTitle;

  /// No description provided for @msgAvatarUploadSuccess.
  ///
  /// In en, this message translates to:
  /// **'Avatar uploaded successfully'**
  String get msgAvatarUploadSuccess;

  /// No description provided for @msgAvatarUploadFail.
  ///
  /// In en, this message translates to:
  /// **'Failed to upload avatar: {error}'**
  String msgAvatarUploadFail(Object error);

  /// No description provided for @msgProfileUpdateSuccess.
  ///
  /// In en, this message translates to:
  /// **'Profile updated successfully!'**
  String get msgProfileUpdateSuccess;

  /// No description provided for @msgProfileUpdateFail.
  ///
  /// In en, this message translates to:
  /// **'Failed to update profile: {error}'**
  String msgProfileUpdateFail(Object error);

  /// No description provided for @msgCreateRequestFail.
  ///
  /// In en, this message translates to:
  /// **'Failed to create consultation request: {error}'**
  String msgCreateRequestFail(Object error);

  /// No description provided for @pharmacyNoPharmacies.
  ///
  /// In en, this message translates to:
  /// **'No pharmacies found.'**
  String get pharmacyNoPharmacies;

  /// No description provided for @orderStatusAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get orderStatusAll;

  /// No description provided for @orderStatusPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get orderStatusPending;

  /// No description provided for @orderStatusConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get orderStatusConfirmed;

  /// No description provided for @orderStatusPreparing.
  ///
  /// In en, this message translates to:
  /// **'Preparing'**
  String get orderStatusPreparing;

  /// No description provided for @orderStatusShipping.
  ///
  /// In en, this message translates to:
  /// **'Shipping'**
  String get orderStatusShipping;

  /// No description provided for @orderStatusDelivered.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get orderStatusDelivered;

  /// No description provided for @orderStatusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get orderStatusCancelled;

  /// No description provided for @actionDownloadPdf.
  ///
  /// In en, this message translates to:
  /// **'Download PDF'**
  String get actionDownloadPdf;

  /// No description provided for @orderEstDelivery.
  ///
  /// In en, this message translates to:
  /// **'Est. Delivery'**
  String get orderEstDelivery;

  /// No description provided for @orderItems.
  ///
  /// In en, this message translates to:
  /// **'Order Items'**
  String get orderItems;

  /// No description provided for @orderTotal.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get orderTotal;

  /// No description provided for @orderDetails.
  ///
  /// In en, this message translates to:
  /// **'Order Details'**
  String get orderDetails;

  /// No description provided for @orderDeliveryType.
  ///
  /// In en, this message translates to:
  /// **'Delivery Type'**
  String get orderDeliveryType;

  /// No description provided for @orderDeliveryTypeDelivery.
  ///
  /// In en, this message translates to:
  /// **'Delivery'**
  String get orderDeliveryTypeDelivery;

  /// No description provided for @orderDeliveryTypePickup.
  ///
  /// In en, this message translates to:
  /// **'Store Pickup'**
  String get orderDeliveryTypePickup;

  /// No description provided for @paymentStatusUnpaid.
  ///
  /// In en, this message translates to:
  /// **'UNPAID'**
  String get paymentStatusUnpaid;

  /// No description provided for @paymentStatusPaid.
  ///
  /// In en, this message translates to:
  /// **'PAID'**
  String get paymentStatusPaid;

  /// No description provided for @orderRequestChangesOpt.
  ///
  /// In en, this message translates to:
  /// **'Request Changes (Optional)'**
  String get orderRequestChangesOpt;

  /// No description provided for @actionPayWithPayPal.
  ///
  /// In en, this message translates to:
  /// **'Pay with PayPal'**
  String get actionPayWithPayPal;

  /// No description provided for @actionRequestChanges.
  ///
  /// In en, this message translates to:
  /// **'Request Changes'**
  String get actionRequestChanges;

  /// No description provided for @actionCancelOrder.
  ///
  /// In en, this message translates to:
  /// **'Cancel Order'**
  String get actionCancelOrder;

  /// No description provided for @actionBackToConnection.
  ///
  /// In en, this message translates to:
  /// **'Back to Connection'**
  String get actionBackToConnection;

  /// No description provided for @pharmacyWaitingAcceptance.
  ///
  /// In en, this message translates to:
  /// **'Waiting for acceptance'**
  String get pharmacyWaitingAcceptance;

  /// No description provided for @pharmacyReviewing.
  ///
  /// In en, this message translates to:
  /// **'A pharmacist is reviewing your prescription'**
  String get pharmacyReviewing;

  /// No description provided for @actionRefresh.
  ///
  /// In en, this message translates to:
  /// **'Refresh'**
  String get actionRefresh;

  /// No description provided for @actionCancelAndGoBack.
  ///
  /// In en, this message translates to:
  /// **'Cancel Request & Go Back'**
  String get actionCancelAndGoBack;

  /// No description provided for @prescriptionNoFound.
  ///
  /// In en, this message translates to:
  /// **'No prescriptions found.'**
  String get prescriptionNoFound;

  /// No description provided for @prescriptionNoMatch.
  ///
  /// In en, this message translates to:
  /// **'No prescriptions match the filter.'**
  String get prescriptionNoMatch;

  /// No description provided for @prescriptionNotes.
  ///
  /// In en, this message translates to:
  /// **'Notes: {notes}'**
  String prescriptionNotes(Object notes);

  /// No description provided for @paginationPage.
  ///
  /// In en, this message translates to:
  /// **'Page {current} of {total}'**
  String paginationPage(Object current, Object total);

  /// No description provided for @actionPrevious.
  ///
  /// In en, this message translates to:
  /// **'Previous'**
  String get actionPrevious;

  /// No description provided for @actionNext.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get actionNext;

  /// No description provided for @bookingUploadDocs.
  ///
  /// In en, this message translates to:
  /// **'Upload medical documents'**
  String get bookingUploadDocs;

  /// No description provided for @bookingSuccessTitle.
  ///
  /// In en, this message translates to:
  /// **'Booking successful'**
  String get bookingSuccessTitle;

  /// No description provided for @bookingSuccessMsg.
  ///
  /// In en, this message translates to:
  /// **'Your appointment has been created.'**
  String get bookingSuccessMsg;

  /// No description provided for @actionDone.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get actionDone;

  /// No description provided for @bookingUploadWarnTitle.
  ///
  /// In en, this message translates to:
  /// **'Some documents were not uploaded'**
  String get bookingUploadWarnTitle;

  /// No description provided for @actionGotIt.
  ///
  /// In en, this message translates to:
  /// **'Got it'**
  String get actionGotIt;

  /// No description provided for @actionConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get actionConfirm;

  /// No description provided for @editProfileBasicInfo.
  ///
  /// In en, this message translates to:
  /// **'Basic Information'**
  String get editProfileBasicInfo;

  /// No description provided for @editProfileFullName.
  ///
  /// In en, this message translates to:
  /// **'Full Name'**
  String get editProfileFullName;

  /// No description provided for @editProfileGender.
  ///
  /// In en, this message translates to:
  /// **'Gender'**
  String get editProfileGender;

  /// No description provided for @editProfileDob.
  ///
  /// In en, this message translates to:
  /// **'Date of Birth'**
  String get editProfileDob;

  /// No description provided for @editProfilePhone.
  ///
  /// In en, this message translates to:
  /// **'Phone Number'**
  String get editProfilePhone;

  /// No description provided for @editProfileOccupation.
  ///
  /// In en, this message translates to:
  /// **'Occupation'**
  String get editProfileOccupation;

  /// No description provided for @editProfileLanguage.
  ///
  /// In en, this message translates to:
  /// **'Preferred Language'**
  String get editProfileLanguage;

  /// No description provided for @editProfileAddressTitle.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get editProfileAddressTitle;

  /// No description provided for @editProfileStreet.
  ///
  /// In en, this message translates to:
  /// **'Street Address'**
  String get editProfileStreet;

  /// No description provided for @editProfileCity.
  ///
  /// In en, this message translates to:
  /// **'City'**
  String get editProfileCity;

  /// No description provided for @editProfileCountry.
  ///
  /// In en, this message translates to:
  /// **'Country'**
  String get editProfileCountry;

  /// No description provided for @editProfilePhysicalTitle.
  ///
  /// In en, this message translates to:
  /// **'Physical Metrics'**
  String get editProfilePhysicalTitle;

  /// No description provided for @editProfileHeight.
  ///
  /// In en, this message translates to:
  /// **'Height (cm)'**
  String get editProfileHeight;

  /// No description provided for @editProfileWeight.
  ///
  /// In en, this message translates to:
  /// **'Weight (kg)'**
  String get editProfileWeight;

  /// No description provided for @editProfileBloodType.
  ///
  /// In en, this message translates to:
  /// **'Blood Type'**
  String get editProfileBloodType;

  /// No description provided for @editProfileMedicalTitle.
  ///
  /// In en, this message translates to:
  /// **'Medical Dossier'**
  String get editProfileMedicalTitle;

  /// No description provided for @editProfileAllergies.
  ///
  /// In en, this message translates to:
  /// **'Allergies'**
  String get editProfileAllergies;

  /// No description provided for @editProfileChronic.
  ///
  /// In en, this message translates to:
  /// **'Chronic Conditions'**
  String get editProfileChronic;

  /// No description provided for @editProfileMedications.
  ///
  /// In en, this message translates to:
  /// **'Current Medications'**
  String get editProfileMedications;

  /// No description provided for @editProfileMedicalHistory.
  ///
  /// In en, this message translates to:
  /// **'Medical History Summary'**
  String get editProfileMedicalHistory;

  /// No description provided for @editProfileInsuranceTitle.
  ///
  /// In en, this message translates to:
  /// **'Insurance Information'**
  String get editProfileInsuranceTitle;

  /// No description provided for @editProfileInsuranceProvider.
  ///
  /// In en, this message translates to:
  /// **'Insurance Provider'**
  String get editProfileInsuranceProvider;

  /// No description provided for @editProfilePolicyNum.
  ///
  /// In en, this message translates to:
  /// **'Policy Number'**
  String get editProfilePolicyNum;

  /// No description provided for @editProfileEmergencyTitle.
  ///
  /// In en, this message translates to:
  /// **'Emergency Contact'**
  String get editProfileEmergencyTitle;

  /// No description provided for @editProfileContactName.
  ///
  /// In en, this message translates to:
  /// **'Contact Name'**
  String get editProfileContactName;

  /// No description provided for @editProfileRelationship.
  ///
  /// In en, this message translates to:
  /// **'Relationship'**
  String get editProfileRelationship;

  /// No description provided for @editProfileContactPhone.
  ///
  /// In en, this message translates to:
  /// **'Contact Phone'**
  String get editProfileContactPhone;

  /// No description provided for @editProfileSelectDate.
  ///
  /// In en, this message translates to:
  /// **'Select Date'**
  String get editProfileSelectDate;

  /// No description provided for @editProfileRequiredField.
  ///
  /// In en, this message translates to:
  /// **'This field is required'**
  String get editProfileRequiredField;

  /// No description provided for @securityVerificationCode.
  ///
  /// In en, this message translates to:
  /// **'Verification Code'**
  String get securityVerificationCode;

  /// No description provided for @securityEnter6Digit.
  ///
  /// In en, this message translates to:
  /// **'Enter 6-digit code'**
  String get securityEnter6Digit;

  /// No description provided for @actionVerifying.
  ///
  /// In en, this message translates to:
  /// **'Verifying...'**
  String get actionVerifying;

  /// No description provided for @actionConfirmChange.
  ///
  /// In en, this message translates to:
  /// **'Confirm Change'**
  String get actionConfirmChange;

  /// No description provided for @securityPasswordRequirements.
  ///
  /// In en, this message translates to:
  /// **'Password Requirements:'**
  String get securityPasswordRequirements;

  /// No description provided for @securityReqLength.
  ///
  /// In en, this message translates to:
  /// **'At least 6 characters'**
  String get securityReqLength;

  /// No description provided for @securityReqNumber.
  ///
  /// In en, this message translates to:
  /// **'At least one number (0-9)'**
  String get securityReqNumber;

  /// No description provided for @securityReqSpecial.
  ///
  /// In en, this message translates to:
  /// **'At least one special character (!@#\\\$%^&*)'**
  String get securityReqSpecial;

  /// No description provided for @securityReqUpperLower.
  ///
  /// In en, this message translates to:
  /// **'Upper and lowercase letters'**
  String get securityReqUpperLower;

  /// No description provided for @securityReqMatch.
  ///
  /// In en, this message translates to:
  /// **'Passwords match'**
  String get securityReqMatch;

  /// No description provided for @pharmacyNoOrdersFound.
  ///
  /// In en, this message translates to:
  /// **'No orders found.'**
  String get pharmacyNoOrdersFound;

  /// No description provided for @pharmacyOrdersTitle.
  ///
  /// In en, this message translates to:
  /// **'Pharmacy Orders'**
  String get pharmacyOrdersTitle;

  /// No description provided for @pharmacyOrdersSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Track your recent prescription deliveries and history.'**
  String get pharmacyOrdersSubtitle;

  /// No description provided for @homeDoctorsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} doctors'**
  String homeDoctorsCount(String count);

  /// No description provided for @pharmacyPortalTitle.
  ///
  /// In en, this message translates to:
  /// **'Healthcare Portal'**
  String get pharmacyPortalTitle;

  /// No description provided for @pharmacyTabPharmacies.
  ///
  /// In en, this message translates to:
  /// **'Pharmacies'**
  String get pharmacyTabPharmacies;

  /// No description provided for @pharmacyTabRequests.
  ///
  /// In en, this message translates to:
  /// **'Requests'**
  String get pharmacyTabRequests;

  /// No description provided for @pharmacyTabOrders.
  ///
  /// In en, this message translates to:
  /// **'Orders'**
  String get pharmacyTabOrders;

  /// No description provided for @pharmacyStepPrescription.
  ///
  /// In en, this message translates to:
  /// **'Prescription'**
  String get pharmacyStepPrescription;

  /// No description provided for @pharmacyStepPharmacy.
  ///
  /// In en, this message translates to:
  /// **'Pharmacy'**
  String get pharmacyStepPharmacy;

  /// No description provided for @pharmacyStepConnect.
  ///
  /// In en, this message translates to:
  /// **'Connect'**
  String get pharmacyStepConnect;

  /// No description provided for @pharmacyStepPayment.
  ///
  /// In en, this message translates to:
  /// **'Payment'**
  String get pharmacyStepPayment;

  /// No description provided for @pharmacyNoRequestsFound.
  ///
  /// In en, this message translates to:
  /// **'No consultation requests found.'**
  String get pharmacyNoRequestsFound;

  /// No description provided for @pharmacyAskPrescription.
  ///
  /// In en, this message translates to:
  /// **'Do you have a prescription?'**
  String get pharmacyAskPrescription;

  /// No description provided for @pharmacyAskPrescriptionDesc.
  ///
  /// In en, this message translates to:
  /// **'Select an existing prescription or skip to browse pharmacies without one.'**
  String get pharmacyAskPrescriptionDesc;

  /// No description provided for @pharmacyNoPrescriptions.
  ///
  /// In en, this message translates to:
  /// **'No prescriptions found'**
  String get pharmacyNoPrescriptions;

  /// No description provided for @pharmacyNoPrescriptionsDesc.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t find any recent prescriptions linked to your account.'**
  String get pharmacyNoPrescriptionsDesc;

  /// No description provided for @pharmacySkipPrescription.
  ///
  /// In en, this message translates to:
  /// **'Skip, I don\'t have a prescription'**
  String get pharmacySkipPrescription;

  /// No description provided for @securityEmailOtpSent.
  ///
  /// In en, this message translates to:
  /// **'A 6-digit code has been sent to {email}. Please check your inbox.'**
  String securityEmailOtpSent(String email);

  /// No description provided for @bookingChooseDoctor.
  ///
  /// In en, this message translates to:
  /// **'Choose a doctor'**
  String get bookingChooseDoctor;

  /// No description provided for @bookingChooseDoctorDesc.
  ///
  /// In en, this message translates to:
  /// **'Only doctors matching your selected specialty are shown.'**
  String get bookingChooseDoctorDesc;

  /// No description provided for @bookingSearchDoctor.
  ///
  /// In en, this message translates to:
  /// **'Search doctor by name'**
  String get bookingSearchDoctor;

  /// No description provided for @bookingNoDoctorsFound.
  ///
  /// In en, this message translates to:
  /// **'No doctors found for this specialty.'**
  String get bookingNoDoctorsFound;

  /// No description provided for @bookingNoSchedule.
  ///
  /// In en, this message translates to:
  /// **'This doctor has no working schedule yet. Please choose another doctor.'**
  String get bookingNoSchedule;

  /// No description provided for @labelYearsExp.
  ///
  /// In en, this message translates to:
  /// **'{years} yrs'**
  String labelYearsExp(String years);

  /// No description provided for @pharmacySearchPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Search pharmacies...'**
  String get pharmacySearchPlaceholder;

  /// No description provided for @pharmacyDeliveryOnly.
  ///
  /// In en, this message translates to:
  /// **'Delivery only'**
  String get pharmacyDeliveryOnly;

  /// No description provided for @pharmacyNearby.
  ///
  /// In en, this message translates to:
  /// **'Nearby Pharmacies'**
  String get pharmacyNearby;

  /// No description provided for @pharmacyDeliveryAvailable.
  ///
  /// In en, this message translates to:
  /// **'Delivery Available'**
  String get pharmacyDeliveryAvailable;

  /// No description provided for @pharmacyFullyStocked.
  ///
  /// In en, this message translates to:
  /// **'Fully Stocked'**
  String get pharmacyFullyStocked;

  /// No description provided for @pharmacyPartiallyStocked.
  ///
  /// In en, this message translates to:
  /// **'Partially Stocked'**
  String get pharmacyPartiallyStocked;

  /// No description provided for @pharmacyNoDistance.
  ///
  /// In en, this message translates to:
  /// **'No distance available'**
  String get pharmacyNoDistance;

  /// No description provided for @pharmacyDistance.
  ///
  /// In en, this message translates to:
  /// **'{distance} km away'**
  String pharmacyDistance(String distance);

  /// No description provided for @pharmacySelect.
  ///
  /// In en, this message translates to:
  /// **'Select'**
  String get pharmacySelect;

  /// No description provided for @pharmacyConsult.
  ///
  /// In en, this message translates to:
  /// **'Send Request'**
  String get pharmacyConsult;

  /// No description provided for @pharmacyRequestSent.
  ///
  /// In en, this message translates to:
  /// **'Request Sent'**
  String get pharmacyRequestSent;

  /// No description provided for @pharmacyMissingItems.
  ///
  /// In en, this message translates to:
  /// **'Missing'**
  String get pharmacyMissingItems;

  /// No description provided for @pharmacyMoreItems.
  ///
  /// In en, this message translates to:
  /// **'+{count} more'**
  String pharmacyMoreItems(int count);

  /// No description provided for @pharmacyNoNotes.
  ///
  /// In en, this message translates to:
  /// **'No additional notes provided.'**
  String get pharmacyNoNotes;

  /// No description provided for @orderStatusCreated.
  ///
  /// In en, this message translates to:
  /// **'Order Created'**
  String get orderStatusCreated;

  /// No description provided for @orderStatusInReview.
  ///
  /// In en, this message translates to:
  /// **'In Review'**
  String get orderStatusInReview;

  /// No description provided for @orderStatusAccepted.
  ///
  /// In en, this message translates to:
  /// **'Accepted'**
  String get orderStatusAccepted;

  /// No description provided for @orderStatusRejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get orderStatusRejected;

  /// No description provided for @actionViewOrder.
  ///
  /// In en, this message translates to:
  /// **'View Order'**
  String get actionViewOrder;

  /// No description provided for @pharmacyRequestSentDesc.
  ///
  /// In en, this message translates to:
  /// **'Successfully transmitted to the pharmacy'**
  String get pharmacyRequestSentDesc;

  /// No description provided for @pharmacyConnected.
  ///
  /// In en, this message translates to:
  /// **'Connected'**
  String get pharmacyConnected;

  /// No description provided for @pharmacyConnectedDesc.
  ///
  /// In en, this message translates to:
  /// **'Direct channel established'**
  String get pharmacyConnectedDesc;

  /// No description provided for @pharmacySecureConnection.
  ///
  /// In en, this message translates to:
  /// **'Ensuring a secure and encrypted connection to your healthcare provider.'**
  String get pharmacySecureConnection;

  /// No description provided for @labelNew.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get labelNew;

  /// No description provided for @labelReviews.
  ///
  /// In en, this message translates to:
  /// **'{count} reviews'**
  String labelReviews(String count);

  /// No description provided for @bookingErrSelectDoctor.
  ///
  /// In en, this message translates to:
  /// **'Please select a doctor.'**
  String get bookingErrSelectDoctor;

  /// No description provided for @bookingChooseDateTime.
  ///
  /// In en, this message translates to:
  /// **'Choose date & time'**
  String get bookingChooseDateTime;

  /// No description provided for @bookingChooseDateTimeDesc.
  ///
  /// In en, this message translates to:
  /// **'Select one available slot. Tap again to cancel your selection.'**
  String get bookingChooseDateTimeDesc;

  /// No description provided for @bookingErrSelectSpecialty.
  ///
  /// In en, this message translates to:
  /// **'Please select a specialty.'**
  String get bookingErrSelectSpecialty;

  /// No description provided for @bookingErrSelectSlot.
  ///
  /// In en, this message translates to:
  /// **'Please select an available time slot.'**
  String get bookingErrSelectSlot;

  /// No description provided for @bookingErrMissingSymptoms.
  ///
  /// In en, this message translates to:
  /// **'Please describe your symptoms.'**
  String get bookingErrMissingSymptoms;

  /// No description provided for @labelWeek.
  ///
  /// In en, this message translates to:
  /// **'Week {weekRange}'**
  String labelWeek(String weekRange);

  /// No description provided for @bookingNoDoctorScheduleThisWeek.
  ///
  /// In en, this message translates to:
  /// **'The doctor is not working this week.'**
  String get bookingNoDoctorScheduleThisWeek;

  /// No description provided for @bookingAvailableSlots.
  ///
  /// In en, this message translates to:
  /// **'Available slots'**
  String get bookingAvailableSlots;

  /// No description provided for @bookingNoSlotsOnThisDay.
  ///
  /// In en, this message translates to:
  /// **'No available slots on this day.'**
  String get bookingNoSlotsOnThisDay;

  /// No description provided for @bookingSymptomsTitle.
  ///
  /// In en, this message translates to:
  /// **'Symptoms & medical information'**
  String get bookingSymptomsTitle;

  /// No description provided for @bookingSymptomsDesc.
  ///
  /// In en, this message translates to:
  /// **'Describe your condition so the doctor can prepare better.'**
  String get bookingSymptomsDesc;

  /// No description provided for @bookingSymptomsInput.
  ///
  /// In en, this message translates to:
  /// **'Symptoms / reason for examination *'**
  String get bookingSymptomsInput;

  /// No description provided for @bookingSymptomsHint.
  ///
  /// In en, this message translates to:
  /// **'Example: mild chest pain for the past 2 days...'**
  String get bookingSymptomsHint;

  /// No description provided for @bookingNotesInput.
  ///
  /// In en, this message translates to:
  /// **'Additional notes'**
  String get bookingNotesInput;

  /// No description provided for @bookingNotesHint.
  ///
  /// In en, this message translates to:
  /// **'Anything else you want the doctor to know.'**
  String get bookingNotesHint;

  /// No description provided for @bookingUploadDocNote.
  ///
  /// In en, this message translates to:
  /// **'Documents will be uploaded and shared with the doctor after the appointment is confirmed.'**
  String get bookingUploadDocNote;

  /// No description provided for @bookingConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Confirm appointment'**
  String get bookingConfirmTitle;

  /// No description provided for @bookingConfirmDesc.
  ///
  /// In en, this message translates to:
  /// **'Review your booking before submitting.'**
  String get bookingConfirmDesc;

  /// No description provided for @bookingLabelDoctor.
  ///
  /// In en, this message translates to:
  /// **'Doctor'**
  String get bookingLabelDoctor;

  /// No description provided for @bookingLabelSpecialty.
  ///
  /// In en, this message translates to:
  /// **'Specialty'**
  String get bookingLabelSpecialty;

  /// No description provided for @bookingLabelDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get bookingLabelDate;

  /// No description provided for @bookingLabelTime.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get bookingLabelTime;

  /// No description provided for @bookingLabelFee.
  ///
  /// In en, this message translates to:
  /// **'Fee'**
  String get bookingLabelFee;

  /// No description provided for @bookingPaymentNote.
  ///
  /// In en, this message translates to:
  /// **'Payment note: mobile PayPal checkout still needs an approval URL/native SDK. This version confirms booking through the current appointment endpoint.'**
  String get bookingPaymentNote;

  /// No description provided for @bookingErrMissingDocDate.
  ///
  /// In en, this message translates to:
  /// **'Please select Date Performed for all uploaded documents.'**
  String get bookingErrMissingDocDate;

  /// No description provided for @bookingErrPaymentCancelled.
  ///
  /// In en, this message translates to:
  /// **'Payment was cancelled.'**
  String get bookingErrPaymentCancelled;

  /// No description provided for @bookingErrPendingOrderNotFound.
  ///
  /// In en, this message translates to:
  /// **'Can not find pending PayPal order.'**
  String get bookingErrPendingOrderNotFound;

  /// No description provided for @bookingErrPatientNotFound.
  ///
  /// In en, this message translates to:
  /// **'Can not find patient information. Please login again.'**
  String get bookingErrPatientNotFound;

  /// No description provided for @bookingErrPaymentNotSupported.
  ///
  /// In en, this message translates to:
  /// **'Payment processing is not supported yet.'**
  String get bookingErrPaymentNotSupported;

  /// No description provided for @bookingDatePerformed.
  ///
  /// In en, this message translates to:
  /// **'Date Performed *'**
  String get bookingDatePerformed;

  /// No description provided for @bookingSelectDatePerformed.
  ///
  /// In en, this message translates to:
  /// **'Select date performed'**
  String get bookingSelectDatePerformed;

  /// No description provided for @bookingPaymentTitle.
  ///
  /// In en, this message translates to:
  /// **'Payment'**
  String get bookingPaymentTitle;

  /// No description provided for @bookingPaymentDesc.
  ///
  /// In en, this message translates to:
  /// **'Complete payment to confirm your appointment.'**
  String get bookingPaymentDesc;

  /// No description provided for @bookingLabelTotalAmount.
  ///
  /// In en, this message translates to:
  /// **'Total amount'**
  String get bookingLabelTotalAmount;

  /// No description provided for @bookingPaymentNote2.
  ///
  /// In en, this message translates to:
  /// **'Your appointment will only be created after payment is successful.'**
  String get bookingPaymentNote2;

  /// No description provided for @bookingBtnPayConfirm.
  ///
  /// In en, this message translates to:
  /// **'Pay & Confirm'**
  String get bookingBtnPayConfirm;

  /// No description provided for @labelToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get labelToday;

  /// No description provided for @labelTomorrow.
  ///
  /// In en, this message translates to:
  /// **'Tomorrow'**
  String get labelTomorrow;

  /// No description provided for @labelMon.
  ///
  /// In en, this message translates to:
  /// **'Mon'**
  String get labelMon;

  /// No description provided for @labelTue.
  ///
  /// In en, this message translates to:
  /// **'Tue'**
  String get labelTue;

  /// No description provided for @labelWed.
  ///
  /// In en, this message translates to:
  /// **'Wed'**
  String get labelWed;

  /// No description provided for @labelThu.
  ///
  /// In en, this message translates to:
  /// **'Thu'**
  String get labelThu;

  /// No description provided for @labelFri.
  ///
  /// In en, this message translates to:
  /// **'Fri'**
  String get labelFri;

  /// No description provided for @labelSat.
  ///
  /// In en, this message translates to:
  /// **'Sat'**
  String get labelSat;

  /// No description provided for @labelSun.
  ///
  /// In en, this message translates to:
  /// **'Sun'**
  String get labelSun;

  /// No description provided for @bookingErrSensitiveContent.
  ///
  /// In en, this message translates to:
  /// **'The file \"{fileName}\" may contain sensitive content and cannot be uploaded.'**
  String bookingErrSensitiveContent(String fileName);

  /// No description provided for @bookingErrUploadFailed.
  ///
  /// In en, this message translates to:
  /// **'Can not upload \"{fileName}\". {message}'**
  String bookingErrUploadFailed(String fileName, String message);

  /// No description provided for @bookingErrNoAppointmentReturned.
  ///
  /// In en, this message translates to:
  /// **'Payment succeeded but appointment was not returned.'**
  String get bookingErrNoAppointmentReturned;

  /// No description provided for @bookingErrCannotCreatePayPalOrder.
  ///
  /// In en, this message translates to:
  /// **'Can not create PayPal order.'**
  String get bookingErrCannotCreatePayPalOrder;

  /// No description provided for @bookingErrCannotOpenPayPalApproval.
  ///
  /// In en, this message translates to:
  /// **'Can not open PayPal approval page.'**
  String get bookingErrCannotOpenPayPalApproval;

  /// No description provided for @bookingErrCannotOpenPayPal.
  ///
  /// In en, this message translates to:
  /// **'Can not open PayPal.'**
  String get bookingErrCannotOpenPayPal;

  /// No description provided for @bookingLoginRequiredTitle.
  ///
  /// In en, this message translates to:
  /// **'Login required'**
  String get bookingLoginRequiredTitle;

  /// No description provided for @bookingLoginRequiredDesc.
  ///
  /// In en, this message translates to:
  /// **'Please login before booking an appointment.'**
  String get bookingLoginRequiredDesc;

  /// No description provided for @bookingUploadWarnDesc.
  ///
  /// In en, this message translates to:
  /// **'Your appointment was booked successfully, but some documents could not be uploaded:'**
  String get bookingUploadWarnDesc;

  /// No description provided for @bookingErrUnsupportedConsultationType.
  ///
  /// In en, this message translates to:
  /// **'Doctor does not support consultation type: {type}'**
  String bookingErrUnsupportedConsultationType(String type);

  /// No description provided for @prescriptionSetReminder.
  ///
  /// In en, this message translates to:
  /// **'Set Medication Reminder'**
  String get prescriptionSetReminder;

  /// No description provided for @orderLabel.
  ///
  /// In en, this message translates to:
  /// **'Order'**
  String get orderLabel;

  /// No description provided for @orderStatusReady.
  ///
  /// In en, this message translates to:
  /// **'Ready'**
  String get orderStatusReady;

  /// No description provided for @pharmacyLabel.
  ///
  /// In en, this message translates to:
  /// **'Pharmacy'**
  String get pharmacyLabel;

  /// No description provided for @deliveryLabel.
  ///
  /// In en, this message translates to:
  /// **'Delivery'**
  String get deliveryLabel;

  /// No description provided for @deliveryHome.
  ///
  /// In en, this message translates to:
  /// **'Home Delivery'**
  String get deliveryHome;

  /// No description provided for @addressLabel.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get addressLabel;

  /// No description provided for @quantityLabel.
  ///
  /// In en, this message translates to:
  /// **'Quantity'**
  String get quantityLabel;

  /// No description provided for @subtotalLabel.
  ///
  /// In en, this message translates to:
  /// **'Subtotal'**
  String get subtotalLabel;

  /// No description provided for @deliveryFeeLabel.
  ///
  /// In en, this message translates to:
  /// **'Delivery Fee'**
  String get deliveryFeeLabel;

  /// No description provided for @paymentInstructionsHint.
  ///
  /// In en, this message translates to:
  /// **'Need to change delivery time or add instructions?'**
  String get paymentInstructionsHint;

  /// No description provided for @pharmacyTabStore.
  ///
  /// In en, this message translates to:
  /// **'Store'**
  String get pharmacyTabStore;

  /// No description provided for @storeTitle.
  ///
  /// In en, this message translates to:
  /// **'Medicine Store'**
  String get storeTitle;

  /// No description provided for @storeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Browse over-the-counter medicines and place a retail pharmacy order.'**
  String get storeSubtitle;

  /// No description provided for @storeSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Name, brand, category, dosage...'**
  String get storeSearchHint;

  /// No description provided for @storeSearchLabel.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get storeSearchLabel;

  /// No description provided for @storeCategoryLabel.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get storeCategoryLabel;

  /// No description provided for @storeDosageFormLabel.
  ///
  /// In en, this message translates to:
  /// **'Dosage form'**
  String get storeDosageFormLabel;

  /// No description provided for @storeAllCategories.
  ///
  /// In en, this message translates to:
  /// **'All categories'**
  String get storeAllCategories;

  /// No description provided for @storeAllForms.
  ///
  /// In en, this message translates to:
  /// **'All forms'**
  String get storeAllForms;

  /// No description provided for @storeCart.
  ///
  /// In en, this message translates to:
  /// **'Cart'**
  String get storeCart;

  /// No description provided for @storeItemsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} items'**
  String storeItemsCount(int count);

  /// No description provided for @storeAdd.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get storeAdd;

  /// No description provided for @storeInCart.
  ///
  /// In en, this message translates to:
  /// **'In cart: {count}'**
  String storeInCart(int count);

  /// No description provided for @storeDetails.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get storeDetails;

  /// No description provided for @storeSubtotalLabel.
  ///
  /// In en, this message translates to:
  /// **'Subtotal'**
  String get storeSubtotalLabel;

  /// No description provided for @storeCheckout.
  ///
  /// In en, this message translates to:
  /// **'Checkout'**
  String get storeCheckout;

  /// No description provided for @storePrescriptionRequired.
  ///
  /// In en, this message translates to:
  /// **'Prescription'**
  String get storePrescriptionRequired;

  /// No description provided for @storePrescriptionRequiredMsg.
  ///
  /// In en, this message translates to:
  /// **'This medicine requires a prescription.'**
  String get storePrescriptionRequiredMsg;

  /// No description provided for @storeNoResults.
  ///
  /// In en, this message translates to:
  /// **'No medicines match your filters.'**
  String get storeNoResults;

  /// No description provided for @storeCartEmpty.
  ///
  /// In en, this message translates to:
  /// **'Add over-the-counter medicines to start checkout.'**
  String get storeCartEmpty;

  /// No description provided for @storeEach.
  ///
  /// In en, this message translates to:
  /// **'each'**
  String get storeEach;

  /// No description provided for @storeNoDescription.
  ///
  /// In en, this message translates to:
  /// **'No description available.'**
  String get storeNoDescription;

  /// No description provided for @storeBrand.
  ///
  /// In en, this message translates to:
  /// **'Brand'**
  String get storeBrand;

  /// No description provided for @storeGeneric.
  ///
  /// In en, this message translates to:
  /// **'Generic'**
  String get storeGeneric;

  /// No description provided for @storeUnit.
  ///
  /// In en, this message translates to:
  /// **'Unit'**
  String get storeUnit;

  /// No description provided for @storePrescriptionWarning.
  ///
  /// In en, this message translates to:
  /// **'This medicine requires a prescription and cannot be added to the retail cart.'**
  String get storePrescriptionWarning;

  /// No description provided for @retailCheckoutTitle.
  ///
  /// In en, this message translates to:
  /// **'Retail Checkout'**
  String get retailCheckoutTitle;

  /// No description provided for @retailCheckoutSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Confirm delivery, compare pharmacies, then submit your order.'**
  String get retailCheckoutSubtitle;

  /// No description provided for @retailStepDelivery.
  ///
  /// In en, this message translates to:
  /// **'Delivery'**
  String get retailStepDelivery;

  /// No description provided for @retailStepPharmacy.
  ///
  /// In en, this message translates to:
  /// **'Pharmacy'**
  String get retailStepPharmacy;

  /// No description provided for @retailStepReview.
  ///
  /// In en, this message translates to:
  /// **'Review'**
  String get retailStepReview;

  /// No description provided for @retailReceiverPhone.
  ///
  /// In en, this message translates to:
  /// **'Receiver phone'**
  String get retailReceiverPhone;

  /// No description provided for @retailDeliveryAddress.
  ///
  /// In en, this message translates to:
  /// **'Delivery address'**
  String get retailDeliveryAddress;

  /// No description provided for @retailUseCurrentLocation.
  ///
  /// In en, this message translates to:
  /// **'Use current location'**
  String get retailUseCurrentLocation;

  /// No description provided for @retailVerifyAddress.
  ///
  /// In en, this message translates to:
  /// **'Verify address'**
  String get retailVerifyAddress;

  /// No description provided for @retailLocationVerified.
  ///
  /// In en, this message translates to:
  /// **'Location verified'**
  String get retailLocationVerified;

  /// No description provided for @retailContinue.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get retailContinue;

  /// No description provided for @retailSortedByHint.
  ///
  /// In en, this message translates to:
  /// **'Sorted by distance, stock status, and rating.'**
  String get retailSortedByHint;

  /// No description provided for @retailPharmacyNotFound.
  ///
  /// In en, this message translates to:
  /// **'No pharmacies found for this cart and delivery location.'**
  String get retailPharmacyNotFound;

  /// No description provided for @retailStockFull.
  ///
  /// In en, this message translates to:
  /// **'FULL'**
  String get retailStockFull;

  /// No description provided for @retailStockPartial.
  ///
  /// In en, this message translates to:
  /// **'PARTIAL'**
  String get retailStockPartial;

  /// No description provided for @retailStockUnknown.
  ///
  /// In en, this message translates to:
  /// **'UNKNOWN'**
  String get retailStockUnknown;

  /// No description provided for @retailDeliveryFeeLabel.
  ///
  /// In en, this message translates to:
  /// **'Delivery fee'**
  String get retailDeliveryFeeLabel;

  /// No description provided for @retailDistanceUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Distance unavailable'**
  String get retailDistanceUnavailable;

  /// No description provided for @retailMissingLabel.
  ///
  /// In en, this message translates to:
  /// **'Missing'**
  String get retailMissingLabel;

  /// No description provided for @retailStockWarning.
  ///
  /// In en, this message translates to:
  /// **'This pharmacy may not have every item in your cart. The pharmacy can still confirm, revise, or cancel after review.'**
  String get retailStockWarning;

  /// No description provided for @retailMedicineSubtotal.
  ///
  /// In en, this message translates to:
  /// **'Medicine subtotal'**
  String get retailMedicineSubtotal;

  /// No description provided for @retailTotal.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get retailTotal;

  /// No description provided for @retailQtyLabel.
  ///
  /// In en, this message translates to:
  /// **'Qty {count}'**
  String retailQtyLabel(int count);

  /// No description provided for @retailSubmitOrder.
  ///
  /// In en, this message translates to:
  /// **'Submit Order'**
  String get retailSubmitOrder;

  /// No description provided for @retailSubmitting.
  ///
  /// In en, this message translates to:
  /// **'Submitting...'**
  String get retailSubmitting;

  /// No description provided for @retailOrderCreated.
  ///
  /// In en, this message translates to:
  /// **'Retail order created.'**
  String get retailOrderCreated;

  /// No description provided for @retailEnterPhone.
  ///
  /// In en, this message translates to:
  /// **'Please enter a delivery phone number.'**
  String get retailEnterPhone;

  /// No description provided for @retailEnterAddress.
  ///
  /// In en, this message translates to:
  /// **'Please enter a delivery address.'**
  String get retailEnterAddress;

  /// No description provided for @retailChoosePharmacy.
  ///
  /// In en, this message translates to:
  /// **'Please choose a pharmacy.'**
  String get retailChoosePharmacy;

  /// No description provided for @retailAddressVerified.
  ///
  /// In en, this message translates to:
  /// **'Delivery address verified.'**
  String get retailAddressVerified;

  /// No description provided for @retailAddressUpdated.
  ///
  /// In en, this message translates to:
  /// **'Delivery address updated from current location.'**
  String get retailAddressUpdated;

  /// No description provided for @retailCannotAccessLocation.
  ///
  /// In en, this message translates to:
  /// **'Cannot access your device location.'**
  String get retailCannotAccessLocation;

  /// No description provided for @retailTryingLocation.
  ///
  /// In en, this message translates to:
  /// **'Still trying to access your location.'**
  String get retailTryingLocation;

  /// No description provided for @retailPartialStockConfirm.
  ///
  /// In en, this message translates to:
  /// **'This pharmacy may not have every cart item. Continue?'**
  String get retailPartialStockConfirm;

  /// No description provided for @retailPharmacyLabel.
  ///
  /// In en, this message translates to:
  /// **'Pharmacy'**
  String get retailPharmacyLabel;

  /// No description provided for @retailDeliveryLabel.
  ///
  /// In en, this message translates to:
  /// **'Delivery'**
  String get retailDeliveryLabel;

  /// No description provided for @fillHealthInfoTitle.
  ///
  /// In en, this message translates to:
  /// **'Pre-consultation Vitals'**
  String get fillHealthInfoTitle;

  /// No description provided for @fillHealthInfoSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Please fill in your vitals. These fields are optional but recommended.'**
  String get fillHealthInfoSubtitle;

  /// No description provided for @heartRate.
  ///
  /// In en, this message translates to:
  /// **'Heart Rate'**
  String get heartRate;

  /// No description provided for @bloodPressure.
  ///
  /// In en, this message translates to:
  /// **'Blood Pressure'**
  String get bloodPressure;

  /// No description provided for @bloodPressureSystolic.
  ///
  /// In en, this message translates to:
  /// **'Systolic'**
  String get bloodPressureSystolic;

  /// No description provided for @bloodPressureDiastolic.
  ///
  /// In en, this message translates to:
  /// **'Diastolic'**
  String get bloodPressureDiastolic;

  /// No description provided for @temperature.
  ///
  /// In en, this message translates to:
  /// **'Temperature'**
  String get temperature;

  /// No description provided for @respiratoryRate.
  ///
  /// In en, this message translates to:
  /// **'Respiratory Rate'**
  String get respiratoryRate;

  /// No description provided for @spO2.
  ///
  /// In en, this message translates to:
  /// **'SpO2 (Oxygen)'**
  String get spO2;

  /// No description provided for @notes.
  ///
  /// In en, this message translates to:
  /// **'Symptoms / Notes'**
  String get notes;

  /// No description provided for @saveVitalsBtn.
  ///
  /// In en, this message translates to:
  /// **'Save Vitals'**
  String get saveVitalsBtn;

  /// No description provided for @chatBlockedVitalsWarning.
  ///
  /// In en, this message translates to:
  /// **'Please provide your health information before starting the chat.'**
  String get chatBlockedVitalsWarning;

  /// No description provided for @fillHealthInfoBtn.
  ///
  /// In en, this message translates to:
  /// **'Fill Health Info'**
  String get fillHealthInfoBtn;

  /// No description provided for @vitalsSavedSuccess.
  ///
  /// In en, this message translates to:
  /// **'Pre-consultation vitals saved successfully.'**
  String get vitalsSavedSuccess;

  /// No description provided for @vitalsInstructionsTitle.
  ///
  /// In en, this message translates to:
  /// **'Instructions before starting the consultation'**
  String get vitalsInstructionsTitle;

  /// No description provided for @vitalsInstructions1.
  ///
  /// In en, this message translates to:
  /// **'If you have a home blood pressure monitor, please enter the readings shown on the device: SYS, DIA and Pulse.'**
  String get vitalsInstructions1;

  /// No description provided for @vitalsInstructions2.
  ///
  /// In en, this message translates to:
  /// **'If you do not have a monitor, you can still measure your pulse manually: sit still, count your pulse for 30 seconds, then multiply by two to get beats/minute.'**
  String get vitalsInstructions2;

  /// No description provided for @vitalsInstructions3.
  ///
  /// In en, this message translates to:
  /// **'SpO2 and temperature are optional, only enter if you have a suitable measuring device.'**
  String get vitalsInstructions3;

  /// No description provided for @vitalsInstructionsDisclaimer.
  ///
  /// In en, this message translates to:
  /// **'These readings are for the doctor\'s reference before the consultation, not a diagnosis.'**
  String get vitalsInstructionsDisclaimer;

  /// No description provided for @measurementMethod.
  ///
  /// In en, this message translates to:
  /// **'Measurement method *'**
  String get measurementMethod;

  /// No description provided for @measuredByDevice.
  ///
  /// In en, this message translates to:
  /// **'Measured by home device'**
  String get measuredByDevice;

  /// No description provided for @measuredByDeviceHint.
  ///
  /// In en, this message translates to:
  /// **'Example: blood pressure monitor, SpO2 monitor, thermometer, smartwatch/smartband.'**
  String get measuredByDeviceHint;

  /// No description provided for @measuredManually.
  ///
  /// In en, this message translates to:
  /// **'Measured manually'**
  String get measuredManually;

  /// No description provided for @measuredManuallyHint.
  ///
  /// In en, this message translates to:
  /// **'Use when you do not have a monitor. You can manually count your pulse for 30 seconds and then multiply by two.'**
  String get measuredManuallyHint;

  /// No description provided for @deviceName.
  ///
  /// In en, this message translates to:
  /// **'Device name, if any'**
  String get deviceName;

  /// No description provided for @deviceNameHint.
  ///
  /// In en, this message translates to:
  /// **'Example: Omron blood pressure monitor, pulse'**
  String get deviceNameHint;

  /// No description provided for @howToMeasurePulse.
  ///
  /// In en, this message translates to:
  /// **'How to measure pulse manually?'**
  String get howToMeasurePulse;

  /// No description provided for @whereToFindSysDia.
  ///
  /// In en, this message translates to:
  /// **'Where can I find SYS/DIA/Pulse?'**
  String get whereToFindSysDia;

  /// No description provided for @spo2Hint.
  ///
  /// In en, this message translates to:
  /// **'Optional. Enter if measured by pulse oximeter or smartwatch.'**
  String get spo2Hint;

  /// No description provided for @tempHint.
  ///
  /// In en, this message translates to:
  /// **'Optional. Enter if measured by thermometer.'**
  String get tempHint;

  /// No description provided for @respHint.
  ///
  /// In en, this message translates to:
  /// **'Optional. Count breaths for 30 seconds, then multiply by 2.'**
  String get respHint;

  /// No description provided for @notesHint.
  ///
  /// In en, this message translates to:
  /// **'Example: measured after resting for 5 minutes, felt dizzy, mild chest discomfort...'**
  String get notesHint;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'vi'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'vi':
      return AppLocalizationsVi();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
