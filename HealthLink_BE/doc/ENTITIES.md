================================================================================

HEALTHLINK - DANH SÁCH ENTITY

================================================================================

Tổng cộng: 31 Entity

Database: SQL Server (HEALTHLINK_DB)

================================================================================

1. USER

Table: Users

Primary Key: Id (String, 450)

Fields:

- id : String(450)
- username : String(256)
- email : String(256)
- emailConfirmed : boolean
- password : String
- phoneNumber : String
- accessFailedCount : int
- createdDate : LocalDateTime
- status : String(20) - default: "Active"
- lastLoginAt : LocalDateTime

Relationships:

- patient : OneToOne -> Patient
- doctor : OneToOne -> Doctor
- pharmacy : OneToOne -> Pharmacy
- role : ManyToOne -> Role
- refreshTokens : OneToMany -> RefreshToken
- notifications : OneToMany -> Notification
- messagesSent : OneToMany -> Message
- messagesReceived : OneToMany -> Message

2. ROLE

Table: Roles
- closeTime : LocalTime
- open24Hours : boolean - default: false
- workingDays : String(50)
- verified : boolean - default: false
- active : boolean - default: true
- averageRating : Double
- totalReviews : Integer
- deliveryAvailable : boolean - default: true
- deliveryRadius : Double
- deliveryFee : BigDecimal
- createdAt : LocalDateTime
- updatedAt : LocalDateTime
- customCommissionRate : BigDecimal
- commissionTier : String(20) - default: "STANDARD"
- totalEarnings : BigDecimal - default: 0
- pendingSettlement : BigDecimal - default: 0
- bankAccount : String(50)
- bankName : String(100)
- paypalEmail : String(255)

Relationships:

- user : OneToOne -> User
- pharmacyOrders : OneToMany -> PharmacyOrder

20. PHARMACY ORDER

Table: PharmacyOrders

Primary Key: OrderID (Integer, Auto-increment)

Fields:

- orderId : Integer
- orderNumber : String(50) - unique
- prescriptionHeader : PrescriptionHeader (ManyToOne)
- pharmacy : Pharmacy (ManyToOne)
- patient : Patient (ManyToOne)
- status : String(50) - not null
- deliveryType : String(50)
- deliveryAddress : String(500)
- deliveryLatitude : Double
- deliveryLongitude : Double
- deliveryFee : BigDecimal
- medicineAmount : BigDecimal
- totalAmount : BigDecimal
- paymentStatus : String(50)
- paymentMethod : String(50)
- notes : String(500)
- pharmacistNotes : String(500)
- estimatedDeliveryTime : LocalDateTime
- actualDeliveryTime : LocalDateTime
- confirmedAt : LocalDateTime
- preparingAt : LocalDateTime
- shippedAt : LocalDateTime
- deliveredAt : LocalDateTime
- cancelledAt : LocalDateTime
- cancelReason : String
- cancelledBy : String
- createdAt : LocalDateTime
- platformFee : BigDecimal
- pharmacyEarning : BigDecimal
- commissionRate : BigDecimal

Relationships:

- prescriptionHeader : ManyToOne -> PrescriptionHeader
- pharmacy : ManyToOne -> Pharmacy
- patient : ManyToOne -> Patient

21. DOCTOR SCHEDULE

Table: DoctorSchedules

Primary Key: ScheduleID (Integer, Auto-increment)

Fields:

- scheduleId : Integer
- doctor : Doctor (ManyToOne)
- dayOfWeek : Integer
- startTime : LocalTime - not null
- endTime : LocalTime - not null
- slotDuration : Integer - default: 30
- maxPatients : Integer - default: 1
- available : boolean - default: true
- consultationType : String(50)
- location : String
- notes : String(500)

Relationships:

- doctor : ManyToOne -> Doctor

22. DOCTOR SCHEDULE EXCEPTION

Table: DoctorScheduleExceptions

Primary Key: ExceptionID (Integer, Auto-increment)

Fields:

- exceptionId : Integer
- doctor : Doctor (ManyToOne)
- exceptionDate : LocalDate - not null
- exceptionType : String(50)
- startTime : LocalTime
- endTime : LocalTime
- reason : String(500)
- recurring : boolean - default: false
- recurringUntil : LocalDate

Relationships:

- doctor : ManyToOne -> Doctor

23. VITAL SIGN

Table: VitalSigns

Primary Key: VitalSignID (Integer, Auto-increment)

Fields:

- vitalSignId : Integer
- patient : Patient (ManyToOne)
- heartRate : Integer
- bloodPressureSystolic : Integer
- bloodPressureDiastolic : Integer
- temperature : Double
- oxygenSaturation : Integer
- respiratoryRate : Integer
- bloodGlucose : Double
- weight : Double
- height : Double
- bmi : Double
- notes : String(500)
- measuredAt : LocalDateTime - not null
- source : String(50)
- deviceName : String(100)
- createdAt : LocalDateTime

Relationships:

- patient : ManyToOne -> Patient

24. MEDICINE

Table: Medicines

Primary Key: MedicineID (Integer, Auto-increment)

Fields:

- medicineId : Integer
- name : String(200) - not null
- genericName : String(200)
- brandName : String(200)
- category : String(100)
- dosageForm : String(50)
- strength : String(50)
- unit : String(50)
- manufacturer : String(200)
- countryOfOrigin : String(100)
- description : String(2000)
- activeIngredients : String(1000)
- indications : String(2000)
- contraindications : String(2000)
- sideEffects : String(2000)
- precautions : String(2000)
- interactions : String(2000)
- storageConditions : String(500)
- prescriptionRequired : boolean - default: true
- referencePrice : BigDecimal
- active : boolean - default: true
- imageUrl : String(500)
- createdAt : LocalDateTime
- updatedAt : LocalDateTime

Relationships:

- prescriptionItems : OneToMany -> PrescriptionItem

25. PAYMENT

Table: Payments

Primary Key: PaymentID (Integer, Auto-increment)

Fields:

- paymentId : Integer
- invoice : Invoice (ManyToOne)
- amount : BigDecimal - not null
- paymentMethod : String(50)
- paymentGateway : String(50)
- transactionId : String(100)
- status : String(50) - not null
- paidAt : LocalDateTime
- failureReason : String(500)
- refundedAmount : BigDecimal
- refundedAt : LocalDateTime
- refundReason : String(500)
- metadata : String(2000)
- createdAt : LocalDateTime

Relationships:

- invoice : ManyToOne -> Invoice

26. SPECIALTY

Table: Specialties

Primary Key: SpecialtyID (Integer, Auto-increment)

Fields:

- specialtyId : Integer
- name : String(100) - not null, unique
- nameEn : String(100)
- description : String(500)
- iconUrl : String(500)
- active : boolean - default: true
- displayOrder : Integer

Relationships:

- doctors : OneToMany -> Doctor

27. REGISTRATION REQUEST

Table: RegistrationRequests

Primary Key: RequestID (Long, Auto-increment)

Fields:

- requestId : Long
- registrationType : String(20) - DOCTOR or PHARMACY
- email : String(256)
- phoneNumber : String(20)
- status : String(20) - default: "Pending"
- createdAt : LocalDateTime
- reviewedAt : LocalDateTime
- reviewedBy : String(450)
- rejectionReason : String(1000)
- fullName : String(200)
- qualifications : String(500)
- specialtyId : Integer
- specialty : String(100)
- yearsOfExperience : Integer
- languageSpoken : String(200)
- location : String(500)
- bio : String(2000)
- consultationFee : BigDecimal
- clinicName : String(200)
- clinicAddress : String(500)
- availableForVideo : Boolean - default: true
- availableForAudio : Boolean - default: true
- availableForChat : Boolean - default: true
- availableForOffline : Boolean - default: true
- pharmacyName : String(200)
- licenseNumber : String(100)
- address : String(500)
- city : String(100)
- district : String(100)
- ward : String(100)
- openTime : LocalTime
- closeTime : LocalTime
- open24Hours : Boolean - default: false
- workingDays : String(50)
- deliveryAvailable : Boolean - default: false
- deliveryRadius : Double
- deliveryFee : BigDecimal
- description : String(1000)

Relationships:

- documents : OneToMany -> RegistrationDocument

28. REGISTRATION DOCUMENT

Table: RegistrationDocuments

Primary Key: DocumentID (Long, Auto-increment)

Fields:

- documentId : Long
- registrationRequest : RegistrationRequest (ManyToOne)
- documentType : String(100)
- fileName : String(255)
- originalFileName : String(255)
- filePath : String(500)
- fileSize : Long
- mimeType : String(100)
- uploadedAt : LocalDateTime

Relationships:

- registrationRequest : ManyToOne -> RegistrationRequest

29. COMMISSION CONFIG

Table: CommissionConfigs

Primary Key: ConfigId (Integer, Auto-increment)

Fields:

- configId : Integer
- serviceType : String(50)
- commissionRate : BigDecimal(5,4)
- minCommission : BigDecimal(18,2) - default: 0.50
- maxCommission : BigDecimal(18,2)
- description : String(500)
- active : boolean - default: true
- effectiveFrom : LocalDateTime
- effectiveTo : LocalDateTime
- createdAt : LocalDateTime
- updatedAt : LocalDateTime

Relationships:

- none

30. COMMISSION TRANSACTION

Table: CommissionTransactions

Primary Key: TransactionId (Integer, Auto-increment)

Fields:

- transactionId : Integer
- transactionNumber : String(50) - unique
- sourceType : String(20)
- appointmentId : Integer
- pharmacyOrderId : Integer
- recipientType : String(20)
- recipientId : String(450)
- recipientName : String(200)
- serviceType : String(50)
- grossAmount : BigDecimal
- commissionRate : BigDecimal(5,4)
- commissionAmount : BigDecimal
- netAmount : BigDecimal
- status : String(50) - default: "PENDING"
- settlement : Settlement (ManyToOne)
- createdAt : LocalDateTime

Relationships:

- settlement : ManyToOne -> Settlement

31. SETTLEMENT

Table: Settlements

Primary Key: SettlementId (Integer, Auto-increment)

Fields:

- settlementId : Integer
- settlementNumber : String(50) - unique
- recipientType : String(20)
- recipientId : String(450)
- recipientName : String(200)
- grossAmount : BigDecimal
- commissionAmount : BigDecimal
- netAmount : BigDecimal
- transactionCount : Integer - default: 0
- status : String(50) - default: "PENDING"
- paymentMethod : String(50)
- bankAccount : String(50)
- bankName : String(100)
- paypalEmail : String(255)
- periodStart : LocalDateTime
- periodEnd : LocalDateTime
- processedAt : LocalDateTime
- processedBy : String(450)
- completedAt : LocalDateTime
- notes : String(500)
- createdAt : LocalDateTime

Relationships:

- transactions : OneToMany -> CommissionTransaction

15. MESSAGE

Table: ChatMessages

Primary Key: MessageID (Integer, Auto-increment)

Fields:

- messageId : Integer
- chatRoom : ChatRoom (ManyToOne)
- sender : User (ManyToOne)
- receiver : User (ManyToOne)
- content : String(NVARCHAR(MAX))
- photoURL : String
- imageUrl : String(TEXT)
- read : boolean - default: false
- timestamp : LocalDateTime

Relationships:

- chatRoom : ManyToOne -> ChatRoom
- sender : ManyToOne -> User
- receiver : ManyToOne -> User

16. NOTIFICATION

Table: Notifications

Primary Key: NotificationID (Integer, Auto-increment)

Fields:

- notificationId : Integer
- user           : User (ManyToOne)
- type           : Enum(NotificationType) @Enumerated(STRING), length=100
- message        : String(TEXT) - not null
- title          : String(200)
- relatedId      : Integer
- read           : Boolean - default: false
- sentVia        : Enum(NotificationChannel) @Enumerated(STRING), length=50
- priority       : Enum(NotificationPriority) @Enumerated(STRING), length=20
- appointmentId  : Integer
- imageUrl       : String(500)
- actionUrl      : String(500)
- expiresAt      : LocalDateTime
- createdAt      : LocalDateTime - not null, default: now()

Enum Constants (Phase 4):

  NotificationChannel (package: com.HealthLink.entity.enums):
    - WEB_SOCKET  : Thông báo realtime qua STOMP/WebSocket (dành cho Doctor, Pharmacy - Web UI)
    - MOBILE_PUSH : Đẩy thông báo qua Firebase Cloud Messaging (dành cho Patient - Mobile UI)
    - EMAIL       : Gửi email tự động qua JavaMailSender

  NotificationType (package: com.HealthLink.entity.enums):
    - APPOINTMENT_REMINDER : Nhắc lịch hẹn sắp diễn ra
    - NEW_PRESCRIPTION      : Bác sĩ tạo đơn thuốc mới
    - ORDER_STATUS          : Cập nhật trạng thái đơn thuốc
    - INVOICE_PAID          : Hóa đơn đã được thanh toán
    - NEW_APPOINTMENT       : Bệnh nhân đặt lịch hẹn mới
    - CANCEL_APPOINTMENT    : Lịch hẹn bị huỷ (bởi bệnh nhân hoặc bác sĩ)
    - CANCEL_ORDER          : Đơn thuốc bị huỷ
    - NEW_ORDER             : Đơn thuốc mới được đặt

  NotificationPriority (package: com.HealthLink.entity.enums):
    - HIGH   : Khẩn cấp (ví dụ: lịch hẹn trong 30 phút)
    - NORMAL : Thông thường (đơn thuốc, trạng thái đơn hàng)
    - LOW    : Thông tin / quảng cáo / nhắc định kỳ

Relationships:

- user : ManyToOne -> User

17. REFRESH TOKEN

Table: RefreshTokens

Primary Key: Id (Integer, Auto-increment)

Fields:

- id : Integer
- user : User (ManyToOne)
- token : String(TEXT) - not null
- expiryDate : LocalDateTime - not null
- revoked : boolean - default: false
- createdDate : LocalDateTime - not null
- deviceInfo : String(500)
- ipAddress : String(50)
- userAgent : String(500)

Relationships:

- user : ManyToOne -> User

18. PASSWORD RESET TOKEN

Table: PasswordResetTokens

Primary Key: Id (Long, Auto-increment)

Fields:

- id : Long
- token : String(450) - unique, not null
- user : User (ManyToOne)
- expiryDate : LocalDateTime - not null
- used : boolean - default: false

Relationships:

- user : ManyToOne -> User

19. PHARMACY

Table: Pharmacies

Primary Key: PharmacyID (String, 450)

Fields:

- pharmacyId : String(450)
- user : User
- name : String(200) - not null
- licenseNumber : String(100) - not null
- address : String(500) - not null
- city : String(100)
- district : String(100)
- ward : String(100)
- latitude : Double
- longitude : Double
- phoneNumber : String(20)
- email : String
- description : String(1000)
- avatarUrl : String
- openTime : LocalTime
- closeTime : LocalTime
- open24Hours : boolean - default: false
- workingDays : String(50)
- verified : boolean - default: false
- active : boolean - default: true
- averageRating : Double
- totalReviews : Integer
- deliveryAvailable : boolean - default: true
- deliveryRadius : Double
- deliveryFee : BigDecimal
- createdAt : LocalDateTime
- updatedAt : LocalDateTime

Relationships:

- user : OneToOne -> User
- pharmacyOrders : OneToMany -> PharmacyOrder

20. PHARMACY ORDER

Table: PharmacyOrders

Primary Key: OrderID (Integer, Auto-increment)

Fields:

- orderId : Integer
- orderNumber : String(50) - unique
- prescriptionHeader : PrescriptionHeader (ManyToOne)
- pharmacy : Pharmacy (ManyToOne)
- patient : Patient (ManyToOne)
- status : String(50) - not null
- deliveryType : String(50)
- deliveryAddress : String(500)
- deliveryLatitude : Double
- deliveryLongitude : Double
- deliveryFee : BigDecimal
- medicineAmount : BigDecimal
- totalAmount : BigDecimal
- paymentStatus : String(50)
- paymentMethod : String(50)
- notes : String(500)
- pharmacistNotes : String(500)
- estimatedDeliveryTime : LocalDateTime
- actualDeliveryTime : LocalDateTime
- confirmedAt : LocalDateTime
- preparingAt : LocalDateTime
- shippedAt : LocalDateTime
- deliveredAt : LocalDateTime
- cancelledAt : LocalDateTime
- cancelReason : String(500)
- cancelledBy : String(50)
- createdAt : LocalDateTime

Relationships:

- prescriptionHeader : ManyToOne -> PrescriptionHeader
- pharmacy : ManyToOne -> Pharmacy
- patient : ManyToOne -> Patient

21. DOCTOR SCHEDULE

Table: DoctorSchedules

Primary Key: ScheduleID (Integer, Auto-increment)

Fields:

- scheduleId : Integer
- doctor : Doctor (ManyToOne)
- dayOfWeek : Integer
- startTime : LocalTime - not null
- endTime : LocalTime - not null
- slotDuration : Integer - default: 30
- maxPatients : Integer - default: 1
- available : boolean - default: true
- consultationType : String(50)
- location : String
- notes : String(500)

Relationships:

- doctor : ManyToOne -> Doctor

22. DOCTOR SCHEDULE EXCEPTION

Table: DoctorScheduleExceptions

Primary Key: ExceptionID (Integer, Auto-increment)

Fields:

- exceptionId : Integer
- doctor : Doctor (ManyToOne)
- exceptionDate : LocalDate - not null
- exceptionType : String(50)
- startTime : LocalTime
- endTime : LocalTime
- reason : String(500)
- recurring : boolean - default: false
- recurringUntil : LocalDate

Relationships:

- doctor : ManyToOne -> Doctor

23. VITAL SIGN

Table: VitalSigns

Primary Key: VitalSignID (Integer, Auto-increment)

Fields:

- vitalSignId : Integer
- patient : Patient (ManyToOne)
- heartRate : Integer
- bloodPressureSystolic : Integer
- bloodPressureDiastolic : Integer
- temperature : Double
- oxygenSaturation : Integer
- respiratoryRate : Integer
- bloodGlucose : Double
- weight : Double
- height : Double
- bmi : Double
- notes : String(500)
- measuredAt : LocalDateTime - not null
- source : String(50)
- deviceName : String(100)
- createdAt : LocalDateTime

Relationships:

- patient : ManyToOne -> Patient

24. MEDICINE

Table: Medicines

Primary Key: MedicineID (Integer, Auto-increment)

Fields:

- medicineId : Integer
- name : String(200) - not null
- genericName : String(200)
- brandName : String(200)
- category : String(100)
- dosageForm : String(50)
- strength : String(50)
- unit : String(50)
- manufacturer : String(200)
- countryOfOrigin : String(100)
- description : String(2000)
- activeIngredients : String(1000)
- indications : String(2000)
- contraindications : String(2000)
- sideEffects : String(2000)
- precautions : String(2000)
- interactions : String(2000)
- storageConditions : String(500)
- prescriptionRequired : boolean - default: true
- referencePrice : BigDecimal
- active : boolean - default: true
- imageUrl : String(500)
- createdAt : LocalDateTime
- updatedAt : LocalDateTime

Relationships:

- prescriptionItems : OneToMany -> PrescriptionItem

25. PAYMENT

Table: Payments

Primary Key: PaymentID (Integer, Auto-increment)

Fields:

- paymentId : Integer
- invoice : Invoice (ManyToOne)
- amount : BigDecimal - not null
- paymentMethod : String(50)
- paymentGateway : String(50)
- transactionId : String(100)
- status : String(50) - not null
- paidAt : LocalDateTime
- failureReason : String(500)
- refundedAmount : BigDecimal
- refundedAt : LocalDateTime
- refundReason : String(500)
- metadata : String(2000)
- createdAt : LocalDateTime

Relationships:

- invoice : ManyToOne -> Invoice

26. SPECIALTY

Table: Specialties

Primary Key: SpecialtyID (Integer, Auto-increment)

Fields:

- specialtyId : Integer
- name : String(100) - not null, unique
- nameEn : String(100)
- description : String(500)
- iconUrl : String(500)
- active : boolean - default: true
- displayOrder : Integer

Relationships:

- doctors : OneToMany -> Doctor

27. REGISTRATION REQUEST

Table: RegistrationRequests

Primary Key: RequestID (Long, Auto-increment)

Fields:

- requestId : Long
- registrationType : String(20) - DOCTOR or PHARMACY
- email : String(256)
- phoneNumber : String(20)
- status : String(20) - default: "Pending"
- createdAt : LocalDateTime
- reviewedAt : LocalDateTime
- reviewedBy : String(450)
- rejectionReason : String(1000)
- fullName : String(200)
- qualifications : String(500)
- specialtyId : Integer
- specialty : String(100)
- yearsOfExperience : Integer
- languageSpoken : String(200)
- location : String(500)
- bio : String(2000)
- consultationFee : BigDecimal
- clinicName : String(200)
- clinicAddress : String(500)
- availableForVideo : Boolean - default: true
- availableForAudio : Boolean - default: true
- availableForChat : Boolean - default: true
- availableForOffline : Boolean - default: true
- pharmacyName : String(200)
- licenseNumber : String(100)
- address : String(500)
- city : String(100)
- district : String(100)
- ward : String(100)
- openTime : LocalTime
- closeTime : LocalTime
- open24Hours : Boolean - default: false
- workingDays : String(50)
- deliveryAvailable : Boolean - default: false
- deliveryRadius : Double
- deliveryFee : BigDecimal
- description : String(1000)

Relationships:

- documents : OneToMany -> RegistrationDocument

28. REGISTRATION DOCUMENT

Table: RegistrationDocuments

Primary Key: DocumentID (Long, Auto-increment)

Fields:

- documentId : Long
- registrationRequest : RegistrationRequest (ManyToOne)
- documentType : String(100)
- fileName : String(255)
- originalFileName : String(255)
- filePath : String(500)
- fileSize : Long
- mimeType : String(100)
- uploadedAt : LocalDateTime

Relationships:

- registrationRequest : ManyToOne -> RegistrationRequest

32. DEVICE TOKEN

Table: DeviceTokens

Primary Key: DeviceTokenID (Integer, Auto-increment)

Fields:

- deviceTokenId : Integer
- user          : User (ManyToOne) - nullable = false
- token         : String(TEXT) - not null (FCM token từ Firebase SDK)
- deviceName    : String(200)
- platform      : String(20) - ANDROID | IOS
- active        : Boolean - default: true
- createdAt     : LocalDateTime - not null, updatable = false
- updatedAt     : LocalDateTime - tự cập nhật qua @PreUpdate

Relationships:

- user : ManyToOne -> User

Ghi chú (Phase 4):
- Token được đăng ký khi bệnh nhân đăng nhập từ thiết bị di động
- Đặt active = false khi FCM trả lỗi UNREGISTERED / INVALID_REGISTRATION
- Hỗ trợ đa thiết bị: một user có thể có nhiều token (nhiều điện thoại/tablet)
- Ràng buộc UNIQUE (UserId, Token) để tránh trùng lặp cùng token trên cùng user
- Package repository: com.HealthLink.repository.notification