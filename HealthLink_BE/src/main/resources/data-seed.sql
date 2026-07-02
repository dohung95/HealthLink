-- =====================================================
-- HEALTHLINK DATABASE SEED DATA
-- Sample records per table (following FK dependencies order)
-- =====================================================

-- 1. ROLES (4 basic roles)
INSERT INTO Roles (Id, Name) VALUES
('admin', 'ADMIN'),
('doctor', 'DOCTOR'),
('patient', 'PATIENT'),
('pharmacy', 'PHARMACY');




-- 2. SPECIALTIES (10 specialties)
SET IDENTITY_INSERT Specialties ON;
INSERT INTO Specialties (SpecialtyID, name, nameEn, description, iconUrl, Active, DisplayOrder) VALUES
(1, 'Internal Medicine', 'Internal Medicine', 'Diagnosis and treatment of internal diseases', '/icons/internal.png', 1, 1),
(2, 'Surgery', 'Surgery', 'Surgical procedures and treatments', '/icons/surgery.png', 1, 2),
(3, 'Pediatrics', 'Pediatrics', 'Child healthcare and treatment', '/icons/pediatrics.png', 1, 3),
(4, 'Obstetrics & Gynecology', 'Obstetrics & Gynecology', 'Women health and pregnancy care', '/icons/obgyn.png', 1, 4),
(5, 'Dermatology', 'Dermatology', 'Skin disease treatment', '/icons/dermatology.png', 1, 5),
(6, 'Cardiology', 'Cardiology', 'Heart and cardiovascular treatment', '/icons/cardiology.png', 1, 6),
(7, 'Neurology', 'Neurology', 'Nervous system treatment', '/icons/neurology.png', 1, 7),
(8, 'Ophthalmology', 'Ophthalmology', 'Eye disease treatment', '/icons/eye.png', 1, 8),
(9, 'ENT', 'ENT', 'Ear, Nose, Throat treatment', '/icons/ent.png', 1, 9),
(10, 'Dentistry', 'Dentistry', 'Dental care and treatment', '/icons/dental.png', 1, 10);
SET IDENTITY_INSERT Specialties OFF;




-- 3. USERS (30 users: 10 doctors, 10 patients, 10 pharmacies)
INSERT INTO Users (Id, UserName, Email, EmailConfirmed, PasswordHash, PhoneNumber, AccessFailedCount, CreatedDate, Status, LastLoginAt, RoleId) VALUES
-- Admin account
('user-a01', 'admin01', 'admin01@healthlink.com', 1, '$2a$12$9fhvTHtCwHXZJukaszjZxeZDewPWYg.pA8Qz2N2uM7vsiRnjR.8jW', '0902000001', 0, '2024-01-01', 'Active', '2024-05-01', 'admin'),
-- Doctors (user-d01 to user-d10)
('user-d01', 'doctor01', 'doctor01@healthlink.com', 1, '$2a$12$5Ob6OVCa9uc1a407XSVTLeHCcOjwpn6Qyjx98.sGDHkQzLGL1Elae', '0901000001', 0, '2024-01-01', 'Active', '2024-05-01', 'doctor'),
('user-d02', 'doctor02', 'doctor02@healthlink.com', 1, '$2a$10$hashedpassword2', '0901000002', 0, '2024-01-02', 'Active', '2024-05-02', 'doctor'),
('user-d03', 'doctor03', 'doctor03@healthlink.com', 1, '$2a$10$hashedpassword3', '0901000003', 0, '2024-01-03', 'Active', '2024-05-03', 'doctor'),
('user-d04', 'doctor04', 'doctor04@healthlink.com', 1, '$2a$10$hashedpassword4', '0901000004', 0, '2024-01-04', 'Active', '2024-05-04', 'doctor'),
('user-d05', 'doctor05', 'doctor05@healthlink.com', 1, '$2a$10$hashedpassword5', '0901000005', 0, '2024-01-05', 'Active', '2024-05-05', 'doctor'),
('user-d06', 'doctor06', 'doctor06@healthlink.com', 1, '$2a$10$hashedpassword6', '0901000006', 0, '2024-01-06', 'Active', '2024-05-06', 'doctor'),
('user-d07', 'doctor07', 'doctor07@healthlink.com', 1, '$2a$10$hashedpassword7', '0901000007', 0, '2024-01-07', 'Active', '2024-05-07', 'doctor'),
('user-d08', 'doctor08', 'doctor08@healthlink.com', 1, '$2a$10$hashedpassword8', '0901000008', 0, '2024-01-08', 'Active', '2024-05-08', 'doctor'),
('user-d09', 'doctor09', 'doctor09@healthlink.com', 1, '$2a$10$hashedpassword9', '0901000009', 0, '2024-01-09', 'Active', '2024-05-09', 'doctor'),
('user-d10', 'doctor10', 'doctor10@healthlink.com', 1, '$2a$10$hashedpassword10', '0901000010', 0, '2024-01-10', 'Active', '2024-05-10', 'doctor'),
-- Patients (user-p01 to user-p10)
('user-p01', 'patient01', 'patient01@gmail.com', 1, '$2a$12$Z4g4vC48/e5nWhfPnztsU.6EaY2kO5hr63sWI/oYcfQOWKjtJHH4C', '0912000001', 0, '2024-02-01', 'Active', '2024-05-01', 'patient'),
('user-p02', 'patient02', 'patient02@gmail.com', 1, '$2a$10$hashedpassword12', '0912000002', 0, '2024-02-02', 'Active', '2024-05-02', 'patient'),
('user-p03', 'patient03', 'patient03@gmail.com', 1, '$2a$10$hashedpassword13', '0912000003', 0, '2024-02-03', 'Active', '2024-05-03', 'patient'),
('user-p04', 'patient04', 'patient04@gmail.com', 1, '$2a$10$hashedpassword14', '0912000004', 0, '2024-02-04', 'Active', '2024-05-04', 'patient'),
('user-p05', 'patient05', 'patient05@gmail.com', 1, '$2a$10$hashedpassword15', '0912000005', 0, '2024-02-05', 'Active', '2024-05-05', 'patient'),
('user-p06', 'patient06', 'patient06@gmail.com', 1, '$2a$10$hashedpassword16', '0912000006', 0, '2024-02-06', 'Active', '2024-05-06', 'patient'),
('user-p07', 'patient07', 'patient07@gmail.com', 1, '$2a$10$hashedpassword17', '0912000007', 0, '2024-02-07', 'Active', '2024-05-07', 'patient'),
('user-p08', 'patient08', 'patient08@gmail.com', 1, '$2a$10$hashedpassword18', '0912000008', 0, '2024-02-08', 'Active', '2024-05-08', 'patient'),
('user-p09', 'patient09', 'patient09@gmail.com', 1, '$2a$10$hashedpassword19', '0912000009', 0, '2024-02-09', 'Active', '2024-05-09', 'patient'),
('user-p10', 'patient10', 'patient10@gmail.com', 1, '$2a$10$hashedpassword20', '0912000010', 0, '2024-02-10', 'Active', '2024-05-10', 'patient'),
-- Pharmacies (user-ph01 to user-ph10)
('user-ph01', 'pharmacy01', 'sb-mzkxc42229383@personal.example.com', 1, '$2a$12$TjB5jD7tXAoIKQdPvLc9ZO./LwqdogkUoK31A0K4KcP..940QJSN6', '0923000001', 0, '2024-03-01', 'Active', '2024-05-01', 'pharmacy'),
('user-ph02', 'pharmacy02', 'pharmacy02@healthlink.com', 1, '$2a$10$hashedpassword22', '0923000002', 0, '2024-03-02', 'Active', '2024-05-02', 'pharmacy'),
('user-ph03', 'pharmacy03', 'pharmacy03@healthlink.com', 1, '$2a$10$hashedpassword23', '0923000003', 0, '2024-03-03', 'Active', '2024-05-03', 'pharmacy'),
('user-ph04', 'pharmacy04', 'pharmacy04@healthlink.com', 1, '$2a$10$hashedpassword24', '0923000004', 0, '2024-03-04', 'Active', '2024-05-04', 'pharmacy'),
('user-ph05', 'pharmacy05', 'pharmacy05@healthlink.com', 1, '$2a$10$hashedpassword25', '0923000005', 0, '2024-03-05', 'Active', '2024-05-05', 'pharmacy'),
('user-ph06', 'pharmacy06', 'pharmacy06@healthlink.com', 1, '$2a$10$hashedpassword26', '0923000006', 0, '2024-03-06', 'Active', '2024-05-06', 'pharmacy'),
('user-ph07', 'pharmacy07', 'pharmacy07@healthlink.com', 1, '$2a$10$hashedpassword27', '0923000007', 0, '2024-03-07', 'Active', '2024-05-07', 'pharmacy'),
('user-ph08', 'pharmacy08', 'pharmacy08@healthlink.com', 1, '$2a$10$hashedpassword28', '0923000008', 0, '2024-03-08', 'Active', '2024-05-08', 'pharmacy'),
('user-ph09', 'pharmacy09', 'pharmacy09@healthlink.com', 1, '$2a$10$hashedpassword29', '0923000009', 0, '2024-03-09', 'Active', '2024-05-09', 'pharmacy'),
('user-ph10', 'pharmacy10', 'pharmacy10@healthlink.com', 1, '$2a$10$hashedpassword30', '0923000010', 0, '2024-03-10', 'Active', '2024-05-10', 'pharmacy');

-- 4. DEVICE_TOKENS (2 mobile tokens)
SET IDENTITY_INSERT DeviceTokens ON;
INSERT INTO DeviceTokens (DeviceTokenID, UserId, Token, DeviceName, Platform, Active, CreatedAt, UpdatedAt) VALUES
(1, 'user-p01', 'fcm-patient01-ios-001', 'iPhone 15 Pro', 'IOS', 1, '2024-05-10 08:00:00', '2024-05-10 08:00:00'),
(2, 'user-p02', 'fcm-patient02-android-001', 'Samsung Galaxy S24', 'ANDROID', 1, '2024-05-11 09:00:00', '2024-05-11 09:00:00');
SET IDENTITY_INSERT DeviceTokens OFF;

-- 5. DOCTORS (10 doctors)
INSERT INTO Doctors (DoctorID, FullName, qualifications, specialty, yearsOfExperience, languageSpoken, location, avatarUrl, bio, consultationFee, latitude, longitude, clinicName, clinicAddress, averageRating, totalReviews, verified, specialtyId, totalEarnings, pendingSettlement, paypalEmail, scheduleStatus, bankAccount, bankName, customCommissionRateOnline, customCommissionRateOffline, customCommissionRateOnlineEffectiveFrom, customCommissionRateOnlineEffectiveTo, customCommissionRateOfflineEffectiveFrom, customCommissionRateOfflineEffectiveTo, commissionTier) VALUES
('user-d01', 'Dr. John Smith', 'MD, PhD - Harvard Medical School', 'Internal Medicine', 15, 'English, Spanish', 'New York', 'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', 'Internal medicine specialist with 15 years of experience', 150.00, 40.7128, -74.0060, 'Manhattan Health Clinic', '123 5th Avenue, New York, NY 10001', 4.8, 156, 1, 1, 500.00, 120.00, 'dr.john.smith@healthlink.com', 'APPROVED', '1234567890', 'Bank of America', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD'),
('user-d02', 'Dr. Sarah Johnson', 'MD - Johns Hopkins University', 'Pediatrics', 12, 'English', 'Los Angeles', 'http://localhost:8096/uploads/avatars/doctors/bacsi_02.png', 'Dedicated pediatrician caring for children', 120.00, 34.0522, -118.2437, 'LA Children Hospital', '456 Sunset Blvd, Los Angeles, CA 90028', 4.9, 203, 1, 3, 320.00, 75.00, 'dr.sarah.johnson@healthlink.com', 'APPROVED', '1234567891', 'Wells Fargo', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD'),
('user-d03', 'Dr. Michael Chen', 'MD, FACC - Stanford University', 'Cardiology', 20, 'English, Mandarin, French', 'San Francisco', 'http://localhost:8096/uploads/avatars/doctors/bacsi_03.png', 'Leading cardiologist and heart specialist', 250.00, 37.7749, -122.4194, 'Bay Area Heart Center', '789 Market Street, San Francisco, CA 94103', 4.95, 89, 1, 6, 640.00, 150.00, 'dr.michael.chen@healthlink.com', 'APPROVED', '1234567892', 'Chase', NULL, NULL, NULL, NULL, NULL, NULL, 'PREMIUM'),
('user-d04', 'Dr. Emily Davis', 'MD, FACS - Mayo Clinic', 'Surgery', 10, 'English', 'Chicago', 'http://localhost:8096/uploads/avatars/doctors/bacsi_04.png', 'Experienced general surgeon', 180.00, 41.8781, -87.6298, 'Chicago Medical Center', '321 Michigan Ave, Chicago, IL 60601', 4.7, 67, 1, 2, 280.00, 50.00, 'dr.emily.davis@healthlink.com', 'APPROVED', '1234567893', 'Citibank', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD'),
('user-d05', 'Dr. Jessica Williams', 'MD, FACOG - UCLA', 'Obstetrics & Gynecology', 8, 'English, Korean', 'Seattle', 'http://localhost:8096/uploads/avatars/doctors/bacsi_05.png', 'Women health and pregnancy specialist', 140.00, 47.6062, -122.3321, 'Seattle Women Clinic', '555 Pine Street, Seattle, WA 98101', 4.85, 178, 1, 4, 410.00, 140.00, 'dr.jessica.williams@healthlink.com', 'APPROVED', '1234567894', 'US Bank', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD'),
('user-d06', 'Dr. Robert Brown', 'MD - NYU School of Medicine', 'Dermatology', 7, 'English, Italian', 'Miami', 'http://localhost:8096/uploads/avatars/doctors/bacsi_06.png', 'Skin disease and cosmetic dermatology expert', 110.00, 25.7617, -80.1918, 'Miami Skin Center', '888 Ocean Drive, Miami, FL 33139', 4.6, 234, 1, 5, 220.00, 45.00, 'dr.robert.brown@healthlink.com', 'APPROVED', '1234567895', 'TD Bank', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD'),
('user-d07', 'Dr. David Wilson', 'MD, PhD - Columbia University', 'Neurology', 18, 'English, German', 'Boston', 'http://localhost:8096/uploads/avatars/doctors/bacsi_07.png', 'Neurologist specializing in brain disorders', 220.00, 42.3601, -71.0589, 'Boston Neuro Institute', '100 Cambridge St, Boston, MA 02114', 4.75, 112, 1, 7, 520.00, 170.00, 'dr.david.wilson@healthlink.com', 'APPROVED', '1234567896', 'Bank of America', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD'),
('user-d08', 'Dr. Amanda Lee', 'MD - Wills Eye Hospital', 'Ophthalmology', 14, 'English, Japanese', 'Philadelphia', 'http://localhost:8096/uploads/avatars/doctors/bacsi_08.png', 'Eye surgery and treatment specialist', 160.00, 39.9526, -75.1652, 'Philadelphia Eye Center', '200 Chestnut St, Philadelphia, PA 19106', 4.88, 145, 1, 8, 305.00, 80.00, 'dr.amanda.lee@healthlink.com', 'APPROVED', '1234567897', 'PNC Bank', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD'),
('user-d09', 'Dr. James Taylor', 'MD - Baylor College of Medicine', 'ENT', 11, 'English, Spanish', 'Houston', 'http://localhost:8096/uploads/avatars/doctors/bacsi_09.png', 'Ear, nose, and throat specialist', 100.00, 29.7604, -95.3698, 'Houston ENT Clinic', '400 Main Street, Houston, TX 77002', 4.5, 89, 1, 9, 190.00, 30.00, 'dr.james.taylor@healthlink.com', 'APPROVED', '1234567898', 'Chase', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD'),
('user-d10', 'Dr. Jennifer Martinez', 'DDS - USC School of Dentistry', 'Dentistry', 9, 'English, Spanish', 'Phoenix', 'http://localhost:8096/uploads/avatars/doctors/bacsi_10.png', 'Cosmetic and general dentistry', 90.00, 33.4484, -112.0740, 'Smile Dental Center', '600 Central Ave, Phoenix, AZ 85004', 4.92, 267, 1, 10, 150.00, 25.00, 'dr.jennifer.martinez@healthlink.com', 'APPROVED', '1234567899', 'Bank of the West', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD');

-- 5b. DOCTOR_SERVICES (2 rows per doctor, 20 total)
INSERT INTO DoctorServices (doctor_id, service_type, available) VALUES
('user-d01', 'ONLINE', 1),
('user-d01', 'HOME_VISIT', 1),
('user-d02', 'ONLINE', 1),
('user-d02', 'HOME_VISIT', 1),
('user-d03', 'ONLINE', 1),
('user-d03', 'HOME_VISIT', 1),
('user-d04', 'ONLINE', 1),
('user-d04', 'HOME_VISIT', 1),
('user-d05', 'ONLINE', 1),
('user-d05', 'HOME_VISIT', 1),
('user-d06', 'ONLINE', 1),
('user-d06', 'HOME_VISIT', 1),
('user-d07', 'ONLINE', 1),
('user-d07', 'HOME_VISIT', 1),
('user-d08', 'ONLINE', 1),
('user-d08', 'HOME_VISIT', 1),
('user-d09', 'ONLINE', 1),
('user-d09', 'HOME_VISIT', 1),
('user-d10', 'ONLINE', 1),
('user-d10', 'HOME_VISIT', 1);

-- 5c. HOME_VISIT_SERVICES
-- Extra services selected by patients during Home Visit booking.
SET IDENTITY_INSERT HomeVisitServices ON;
INSERT INTO HomeVisitServices (ServiceID, ServiceName, Description, Price, Active, DurationMinutes) VALUES
(1, 'Basic vital signs check', 'Measure pulse, blood pressure, temperature, SpO2 and breathing rate at home.', 5.00, 1, 15),
(2, 'Blood glucose test', 'Quick capillary blood glucose test for diabetes screening or monitoring.', 8.00, 1, 10),
(3, 'Injection support', 'Doctor provides injection support when medically appropriate.', 10.00, 1, 20),
(4, 'Wound dressing', 'Clean and dress a minor wound during the home visit.', 12.00, 1, 30),
(5, 'Medication review', 'Review current medications, usage schedule and basic interaction risks.', 6.00, 1, 15);
SET IDENTITY_INSERT HomeVisitServices OFF;

-- Align legacy doctor rows with the current Home Visit columns.
UPDATE Doctors
   SET availableForHomeVisit = 1,
       homeVisitRadiusKm = CASE
           WHEN DoctorID IN ('user-d01', 'user-d02', 'user-d03') THEN 12.0
           ELSE 8.0
       END;

-- 6. PATIENTS (10 patients)
INSERT INTO Patients (PatientID, FullName, dateOfBirth, medicalHistorySummary, insuranceProvider, insurancePolicyNumber, gender, address, city, country, bloodType, emergencyContactName, emergencyContactPhone, emergencyContactRelationship, preferredLanguage, preferredContactMethod, occupation, avatarUrl, latitude, longitude, allergies, chronicConditions, currentMedications, heightCm, weightKg) VALUES
('user-p01', 'Michael Anderson', '1990-05-15', 'No significant medical history', 'Blue Cross', 'BC-2024-001', 'Male', '12 Le Loi Street, District 1', 'Ho Chi Minh City', 'Vietnam', 'A+', 'Lisa Anderson', '0912345678', 'Wife', 'English', 'Phone', 'Software Engineer', 'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', 10.7769, 106.7009, 'Penicillin', NULL, NULL, 175, 70),
('user-p02', 'Emma Thompson', '1985-08-22', 'History of gastritis', 'Aetna', 'AET-2024-002', 'Female', '123 Maple Avenue', 'Los Angeles', 'USA', 'B+', 'Tom Thompson', '0923456789', 'Husband', 'English', 'Email', 'Teacher', 'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', 34.0522, -118.2437, NULL, 'Chronic gastritis', 'Omeprazole 20mg', 165, 58),
('user-p03', 'William Brown', '1978-12-01', 'Type 2 diabetes', 'United Healthcare', 'UHC-2024-003', 'Male', '78 Pine Road', 'Chicago', 'USA', 'O+', 'Mary Brown', '0934567890', 'Wife', 'English', 'Phone', 'Business Owner', 'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', 41.8781, -87.6298, NULL, 'Type 2 diabetes', 'Metformin 500mg', 178, 85),
('user-p04', 'Sophia Garcia', '1995-03-10', 'No significant medical history', 'Cigna', 'CIG-2024-004', 'Female', '56 Cedar Lane', 'Houston', 'USA', 'AB+', 'Carlos Garcia', '0945678901', 'Father', 'English', 'Text', 'Student', 'http://localhost:8096/uploads/avatars/patients/benhnhan_04.png', 29.7604, -95.3698, 'Shellfish', NULL, NULL, 160, 52),
('user-p05', 'James Wilson', '1982-07-25', 'Hypertension', 'Kaiser', 'KP-2024-005', 'Male', '234 Elm Street', 'San Francisco', 'USA', 'A-', 'Susan Wilson', '0956789012', 'Wife', 'English', 'Phone', 'Attorney', 'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', 37.7749, -122.4194, NULL, 'Hypertension', 'Amlodipine 5mg', 180, 78),
('user-p06', 'Olivia Davis', '1992-11-18', 'Childhood asthma', 'Humana', 'HUM-2024-006', 'Female', '89 Birch Court', 'Seattle', 'USA', 'B-', 'Robert Davis', '0967890123', 'Father', 'English', 'Email', 'Office Manager', 'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', 47.6062, -122.3321, 'Dust, pollen', 'Asthma', 'Salbutamol inhaler', 163, 55),
('user-p07', 'Daniel Miller', '1970-04-05', 'Gout, elevated uric acid', 'Medicare', 'MED-2024-007', 'Male', '12 Walnut Drive', 'Miami', 'USA', 'O-', 'Patricia Miller', '0978901234', 'Wife', 'English', 'Phone', 'Executive', 'http://localhost:8096/uploads/avatars/patients/benhnhan_07.png', 25.7617, -80.1918, NULL, 'Gout', 'Allopurinol 300mg', 172, 80),
('user-p08', 'Isabella Moore', '1988-09-30', 'No significant medical history', 'Anthem', 'ANT-2024-008', 'Female', '67 Spruce Avenue', 'Boston', 'USA', 'A+', 'Mark Moore', '0989012345', 'Husband', 'English', 'Text', 'Nurse', 'http://localhost:8096/uploads/avatars/patients/benhnhan_08.png', 42.3601, -71.0589, NULL, NULL, NULL, 168, 60),
('user-p09', 'Alexander Johnson', '1998-01-20', 'Chronic sinusitis', 'Tricare', 'TRI-2024-009', 'Male', '45 Redwood Street', 'Phoenix', 'USA', 'B+', 'Nancy Johnson', '0990123456', 'Mother', 'English', 'Phone', 'Developer', 'http://localhost:8096/uploads/avatars/patients/benhnhan_09.png', 33.4484, -112.0740, 'Aspirin', 'Sinusitis', NULL, 182, 75),
('user-p10', 'Charlotte Taylor', '1975-06-12', 'Spinal degeneration', 'BCBS', 'BCBS-2024-010', 'Female', '90 Aspen Way', 'Philadelphia', 'USA', 'AB-', 'George Taylor', '0901234567', 'Husband', 'English', 'Phone', 'Homemaker', 'http://localhost:8096/uploads/avatars/patients/benhnhan_10.png', 39.9526, -75.1652, NULL, 'Spinal degeneration', 'Glucosamine', 158, 62);

-- 7. PHARMACIES (10 pharmacies)
INSERT INTO Pharmacies (PharmacyID, name, licenseNumber, address, city, district, ward, latitude, longitude, phoneNumber, email, description, avatarUrl, openTime, closeTime, Open24Hours, workingDays, Verified, Active, IsOnline, AverageRating, TotalReviews, DeliveryAvailable, DeliveryRadius, DeliveryFee, CreatedAt, updatedAt, totalEarnings, pendingSettlement, paypalEmail) VALUES
('user-ph01', 'HealthLink Pharmacy - Ben Thanh', 'PH-HCM-001', '22 Le Thanh Ton Street', 'Ho Chi Minh City', 'District 1', 'Ben Nghe', 10.7828, 106.7033, '0283001001', 'ben.thanh@pharmacy.com', 'Central District 1 pharmacy with fast delivery', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_01.png', '07:00', '22:00', 0, 'Mon-Sun', 1, 1, 1, 4.8, 523, 1, 5.0, 5.99, '2024-01-01', '2024-05-01', 700.00, 90.00, 'sb-mzkxc42229383@personal.example.com'),
('user-ph02', 'An Khang Pharmacy - Nguyen Hue', 'PH-HCM-002', '68 Nguyen Hue Street', 'Ho Chi Minh City', 'District 1', 'Ben Nghe', 10.7950, 106.7050, '0283002002', 'nguyen.hue@pharmacy.com', 'Large pharmacy near the city center', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_02.png', '07:30', '22:30', 0, 'Mon-Sun', 1, 1, 1, 4.7, 412, 1, 7.0, 6.99, '2024-01-15', '2024-05-02', 650.00, 75.00, 'walgreens.la@healthlink.com'),
('user-ph03', 'Pharmacity - Thu Thiem', 'PH-HCM-003', '12 Tran Bach Dang Street', 'Ho Chi Minh City', 'Thu Duc City', 'Thu Thiem', 10.7760, 106.7228, '0283003003', 'thu.thiem@pharmacy.com', 'Nearby pharmacy intentionally seeded without inventory', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_03.png', '06:30', '21:30', 0, 'Mon-Sat', 1, 1, 1, 4.6, 187, 1, 4.0, 4.99, '2024-02-01', '2024-05-03', 420.00, 30.00, 'riteaid.chi@healthlink.com'),
('user-ph04', 'CVS Pharmacy - SF', 'PH-CA-004', '789 Market Street', 'San Francisco', 'Financial', 'Downtown', 37.7879, -122.4074, '4153004004', 'cvs.sf@pharmacy.com', 'Tech-friendly pharmacy', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_04.png', '07:00', '23:00', 0, 'Mon-Sun', 1, 1, 1, 4.9, 678, 1, 6.0, 7.99, '2024-02-15', '2024-05-04', 840.00, 110.00, 'cvs.sf@healthlink.com'),
('user-ph05', 'Walgreens - Boston', 'PH-MA-005', '23 Newbury Street', 'Boston', 'Back Bay', 'Central', 42.3505, -71.0762, '6173005005', 'walgreens.bos@pharmacy.com', 'Premium pharmacy services', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_05.png', '08:00', '20:00', 0, 'Mon-Sat', 1, 1, 1, 4.5, 234, 1, 3.0, 5.49, '2024-03-01', '2024-05-05', 390.00, 20.00, 'walgreens.bos@healthlink.com'),
('user-ph06', 'Hospital Pharmacy - NYC', 'PH-NY-006', '78 Hospital Drive', 'New York', 'Queens', 'Jamaica', 40.7282, -73.7949, '7183006006', 'hospital.nyc@pharmacy.com', 'Open 24/7', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_06.png', NULL, NULL, 1, 'Mon-Sun', 1, 1, 1, 4.4, 892, 0, NULL, NULL, '2024-03-15', '2024-05-06', 510.00, 60.00, 'hospital.nyc@healthlink.com'),
('user-ph07', 'MedExpress Pharmacy', 'PH-TX-007', '34 Main Plaza', 'Houston', 'Downtown', 'Central', 29.7589, -95.3677, '7133007007', 'medexpress@pharmacy.com', 'Fast and reliable service', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_07.png', '07:00', '21:00', 0, 'Mon-Sun', 1, 1, 1, 4.7, 156, 1, 8.0, 5.99, '2024-04-01', '2024-05-07', 280.00, 15.00, 'medexpress@healthlink.com'),
('user-ph08', 'Community Pharmacy', 'PH-FL-008', '456 Ocean Drive', 'Miami', 'Beach', 'South Beach', 25.7825, -80.1340, '3053008008', 'community.miami@pharmacy.com', 'Family owned pharmacy', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_08.png', '06:00', '22:00', 0, 'Mon-Sun', 1, 1, 1, 4.3, 345, 1, 5.0, 4.99, '2024-04-15', '2024-05-08', 330.00, 25.00, 'community.miami@healthlink.com'),
('user-ph09', 'HealthMart Pharmacy', 'PH-WA-009', 'Pike Place Market', 'Seattle', 'Downtown', 'Pike Place', 47.6097, -122.3422, '2063009009', 'healthmart.sea@pharmacy.com', 'Natural and organic options', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_09.png', '09:00', '22:00', 0, 'Mon-Sun', 1, 1, 1, 4.6, 267, 1, 4.0, 6.99, '2024-05-01', '2024-05-09', 260.00, 18.00, 'healthmart.sea@healthlink.com'),
('user-ph10', 'Express Scripts Pharmacy', 'PH-AZ-010', '90 Central Avenue', 'Phoenix', 'Downtown', 'Central', 33.4502, -112.0733, '6023010010', 'express.phx@pharmacy.com', 'Quick prescription service', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_10.png', '07:30', '21:00', 0, 'Mon-Sat', 1, 1, 1, 4.8, 198, 1, 6.0, 5.49, '2024-05-05', '2024-05-10', 300.00, 22.00, 'express.phx@healthlink.com');

-- 8. MEDICINE_CATEGORIES (taxonomy tree)
SET IDENTITY_INSERT MedicineCategories ON;
INSERT INTO MedicineCategories (CategoryID, ParentCategoryID, code, name, slug, icon, sortOrder, active, createdAt, updatedAt) VALUES
-- Root categories
(1, NULL, 'PRESCRIPTION', 'Prescription Medicines', 'prescription-medicines', 'prescription-bottle', 1, 1, '2024-01-01', '2024-01-01'),
(2, NULL, 'OTC', 'Over-the-Counter', 'over-the-counter', 'shopping-cart', 2, 1, '2024-01-01', '2024-01-01'),
(3, NULL, 'VITAMINS_SUPPLEMENTS', 'Vitamins & Supplements', 'vitamins-supplements', 'vitamins', 3, 1, '2024-01-01', '2024-01-01'),
-- Prescription children
(10, 1, 'ANTIBIOTICS', 'Antibiotics', 'antibiotics', 'pill', 1, 1, '2024-01-01', '2024-01-01'),
(11, 1, 'CARDIOVASCULAR', 'Cardiovascular', 'cardiovascular', 'favorite-heart', 2, 1, '2024-01-01', '2024-01-01'),
(12, 1, 'DIABETES', 'Diabetes', 'diabetes', 'blood-drop', 3, 1, '2024-01-01', '2024-01-01'),
(13, 1, 'RESPIRATORY', 'Respiratory', 'respiratory', 'lungs', 4, 1, '2024-01-01', '2024-01-01'),
(14, 1, 'GASTROINTESTINAL', 'Gastrointestinal', 'gastrointestinal', 'digestion', 5, 1, '2024-01-01', '2024-01-01'),
(15, 1, 'GOUT', 'Gout & Uric Acid', 'gout-uric-acid', 'pain', 6, 1, '2024-01-01', '2024-01-01'),
-- OTC children
(20, 2, 'PAIN_RELIEF', 'Pain Relief', 'pain-relief', 'bandaid', 1, 1, '2024-01-01', '2024-01-01'),
(21, 2, 'ALLERGY', 'Allergy & Sinus', 'allergy-sinus', 'allergy', 2, 1, '2024-01-01', '2024-01-01'),
-- Vitamins children
(30, 3, 'VITAMIN_C', 'Vitamin C & Immune Support', 'vitamin-c-immune', 'immunity', 1, 1, '2024-01-01', '2024-01-01');
SET IDENTITY_INSERT MedicineCategories OFF;

-- 9. MEDICINES (10 medicines)
SET IDENTITY_INSERT Medicines ON;
INSERT INTO Medicines (MedicineID, name, genericName, brandName, category, CategoryID, dosageForm, strength, unit, manufacturer, countryOfOrigin, description, activeIngredients, indications, contraindications, sideEffects, precautions, interactions, storageConditions, prescriptionRequired, price, active, imageUrl, createdAt, updatedAt) VALUES
(1, 'Paracetamol 500mg', 'Paracetamol', 'Tylenol', 'Pain Relief - Fever', 20, 'Tablet', '500mg', 'Tablet', 'Johnson & Johnson', 'USA', 'Common pain reliever and fever reducer', 'Paracetamol 500mg', 'Headache, fever, muscle pain', 'Allergy to paracetamol, severe liver disease', 'Nausea, rash (rare)', 'Do not exceed 4g per day', 'Increased toxicity with alcohol', 'Store below 30C', 0, 5.99, 1, '/medicines/paracetamol.jpg', '2024-01-01', NULL),
(2, 'Amoxicillin 500mg', 'Amoxicillin', 'Amoxil', 'Antibiotic', 10, 'Capsule', '500mg', 'Capsule', 'Pfizer', 'USA', 'Broad spectrum antibiotic', 'Amoxicillin trihydrate', 'Respiratory infections, UTI', 'Penicillin allergy', 'Diarrhea, rash, nausea', 'Adjust dose for kidney disease', 'May reduce contraceptive efficacy', 'Store at 15-25C', 1, 12.99, 1, '/medicines/amoxicillin.jpg', '2024-01-01', NULL),
(3, 'Omeprazole 20mg', 'Omeprazole', 'Prilosec', 'Gastrointestinal', 14, 'Capsule', '20mg', 'Capsule', 'AstraZeneca', 'Sweden', 'Proton pump inhibitor', 'Omeprazole', 'Gastric ulcer, GERD', 'Allergy to omeprazole', 'Headache, diarrhea, nausea', 'Not for long-term use', 'Reduces B12 absorption', 'Store below 25C, protect from moisture', 1, 15.99, 1, '/medicines/omeprazole.jpg', '2024-01-01', NULL),
(4, 'Metformin 500mg', 'Metformin', 'Glucophage', 'Diabetes', 12, 'Tablet', '500mg', 'Tablet', 'Merck', 'Germany', 'Type 2 diabetes treatment', 'Metformin HCl', 'Type 2 diabetes', 'Kidney disease, acidosis', 'GI upset, B12 deficiency', 'Stop before CT scan with contrast', 'Increased hypoglycemia risk with other drugs', 'Store at 15-25C', 1, 8.99, 1, '/medicines/metformin.jpg', '2024-01-01', NULL),
(5, 'Amlodipine 5mg', 'Amlodipine', 'Norvasc', 'Cardiovascular', 11, 'Tablet', '5mg', 'Tablet', 'Pfizer', 'USA', 'Blood pressure medication', 'Amlodipine besylate', 'Hypertension, angina', 'Hypotension, cardiogenic shock', 'Ankle swelling, headache', 'Monitor blood pressure regularly', 'Increased effect with grapefruit', 'Store below 30C', 1, 18.99, 1, '/medicines/amlodipine.jpg', '2024-01-01', NULL),
(6, 'Cetirizine 10mg', 'Cetirizine', 'Zyrtec', 'Allergy', 21, 'Tablet', '10mg', 'Tablet', 'UCB', 'Belgium', 'Second generation antihistamine', 'Cetirizine HCl', 'Allergic rhinitis, urticaria', 'Severe kidney disease', 'Drowsiness, dry mouth', 'Caution when driving', 'Increased sedation with alcohol', 'Store below 25C', 0, 9.99, 1, '/medicines/cetirizine.jpg', '2024-01-01', NULL),
(7, 'Vitamin C 1000mg', 'Ascorbic Acid', 'Emergen-C', 'Vitamin - Mineral', 30, 'Effervescent', '1000mg', 'Tablet', 'Pfizer', 'USA', 'Vitamin C supplement', 'Ascorbic acid', 'Vitamin C deficiency, immune support', 'Kidney stones (oxalate)', 'GI upset at high doses', 'Do not exceed 2000mg per day', 'Increases iron absorption', 'Store in dry place', 0, 12.99, 1, '/medicines/vitaminc.jpg', '2024-01-01', NULL),
(8, 'Ibuprofen 400mg', 'Ibuprofen', 'Advil', 'Pain Relief - Anti-inflammatory', 20, 'Tablet', '400mg', 'Tablet', 'Pfizer', 'USA', 'NSAID pain reliever', 'Ibuprofen', 'Headache, muscle pain, arthritis', 'Gastric ulcer, kidney disease', 'Stomach pain, nausea', 'Take with food', 'Increased bleeding risk with aspirin', 'Store below 25C', 0, 7.99, 1, '/medicines/ibuprofen.jpg', '2024-01-01', NULL),
(9, 'Salbutamol 100mcg', 'Salbutamol', 'Ventolin', 'Respiratory', 13, 'Inhaler', '100mcg', 'Puff', 'GSK', 'UK', 'Bronchodilator inhaler', 'Salbutamol sulfate', 'Asthma, bronchospasm', 'Heart arrhythmia', 'Rapid heartbeat, tremor', 'Do not overuse', 'Increased effect with theophylline', 'Store below 30C', 1, 35.99, 1, '/medicines/salbutamol.jpg', '2024-01-01', NULL),
(10, 'Allopurinol 300mg', 'Allopurinol', 'Zyloprim', 'Gout', 15, 'Tablet', '300mg', 'Tablet', 'Takeda', 'Japan', 'Uric acid reducer', 'Allopurinol', 'Gout, hyperuricemia', 'Allopurinol allergy', 'Rash, liver problems', 'Drink plenty of water', 'Increased azathioprine toxicity', 'Store below 25C, protect from moisture', 1, 14.99, 1, '/medicines/allopurinol.jpg', '2024-01-01', NULL);
SET IDENTITY_INSERT Medicines OFF;

-- 10. PHARMACY_INVENTORY (28 inventory rows)
SET IDENTITY_INSERT PharmacyInventory ON;
INSERT INTO PharmacyInventory (InventoryID, PharmacyID, MedicineID, quantity, reservedQuantity, unit, expiryDate, active, lastImportedAt, createdAt, updatedAt) VALUES
(1, 'user-ph01', 1, 120, 10, 'Tablet', '2026-12-31', 1, '2024-05-20 08:00:00', '2024-05-20 08:00:00', '2024-05-20 08:00:00'),
(2, 'user-ph01', 7, 80, 5, 'Tablet', '2026-12-31', 1, '2024-05-20 08:00:00', '2024-05-20 08:00:00', '2024-05-20 08:00:00'),
(3, 'user-ph01', 5, 6, 0, 'Tablet', '2026-08-31', 1, '2024-05-20 08:00:00', '2024-05-20 08:00:00', '2024-05-20 08:00:00'),
(4, 'user-ph01', 8, 0, 0, 'Tablet', '2026-07-31', 1, '2024-05-20 08:00:00', '2024-05-20 08:00:00', '2024-05-20 08:00:00'),
(5, 'user-ph01', 2, 30, 0, 'Capsule', '2026-05-31', 0, '2024-05-20 08:00:00', '2024-05-20 08:00:00', '2024-05-20 08:00:00'),
(6, 'user-ph02', 1, 40, 0, 'Tablet', '2026-12-31', 1, '2024-05-20 08:15:00', '2024-05-20 08:15:00', '2024-05-20 08:15:00'),
(7, 'user-ph02', 6, 25, 0, 'Tablet', '2026-11-30', 1, '2024-05-20 08:15:00', '2024-05-20 08:15:00', '2024-05-20 08:15:00'),
(8, 'user-ph02', 3, 12, 0, 'Capsule', '2026-09-30', 1, '2024-05-20 08:15:00', '2024-05-20 08:15:00', '2024-05-20 08:15:00'),
(9, 'user-ph02', 5, 45, 5, 'Tablet', '2026-08-31', 1, '2024-05-20 08:15:00', '2024-05-20 08:15:00', '2024-05-20 08:15:00'),
(10, 'user-ph02', 7, 4, 0, 'Tablet', '2026-12-31', 1, '2024-05-20 08:15:00', '2024-05-20 08:15:00', '2024-05-20 08:15:00'),
(11, 'user-ph02', 10, 0, 0, 'Tablet', '2026-10-31', 1, '2024-05-20 08:15:00', '2024-05-20 08:15:00', '2024-05-20 08:15:00'),
(12, 'user-ph04', 1, 50, 0, 'Tablet', '2026-12-31', 1, '2024-05-20 08:30:00', '2024-05-20 08:30:00', '2024-05-20 08:30:00'),
(13, 'user-ph04', 5, 12, 0, 'Tablet', '2026-08-31', 1, '2024-05-20 08:30:00', '2024-05-20 08:30:00', '2024-05-20 08:30:00'),
(14, 'user-ph04', 8, 20, 0, 'Tablet', '2026-07-31', 1, '2024-05-20 08:30:00', '2024-05-20 08:30:00', '2024-05-20 08:30:00'),
(15, 'user-ph07', 10, 45, 5, 'Tablet', '2026-10-31', 1, '2024-05-20 08:45:00', '2024-05-20 08:45:00', '2024-05-20 08:45:00'),
(16, 'user-ph07', 1, 8, 0, 'Tablet', '2026-12-31', 1, '2024-05-20 08:45:00', '2024-05-20 08:45:00', '2024-05-20 08:45:00'),
(17, 'user-ph07', 6, 0, 0, 'Tablet', '2026-11-30', 1, '2024-05-20 08:45:00', '2024-05-20 08:45:00', '2024-05-20 08:45:00'),
(18, 'user-ph05', 4, 60, 0, 'Tablet', '2026-06-30', 1, '2024-05-20 09:00:00', '2024-05-20 09:00:00', '2024-05-20 09:00:00'),
(19, 'user-ph05', 8, 3, 0, 'Tablet', '2026-07-31', 1, '2024-05-20 09:00:00', '2024-05-20 09:00:00', '2024-05-20 09:00:00'),
(20, 'user-ph05', 9, 20, 2, 'Inhaler', '2026-10-31', 1, '2024-05-20 09:00:00', '2024-05-20 09:00:00', '2024-05-20 09:00:00'),
(21, 'user-ph06', 8, 20, 0, 'Tablet', '2026-07-31', 1, '2024-05-20 09:15:00', '2024-05-20 09:15:00', '2024-05-20 09:15:00'),
(22, 'user-ph06', 2, 20, 0, 'Capsule', '2026-05-31', 1, '2024-05-20 09:15:00', '2024-05-20 09:15:00', '2024-05-20 09:15:00'),
(23, 'user-ph08', 10, 5, 0, 'Tablet', '2026-10-31', 1, '2024-05-20 09:30:00', '2024-05-20 09:30:00', '2024-05-20 09:30:00'),
(24, 'user-ph08', 7, 20, 0, 'Tablet', '2026-12-31', 1, '2024-05-20 09:30:00', '2024-05-20 09:30:00', '2024-05-20 09:30:00'),
(25, 'user-ph09', 4, 60, 0, 'Tablet', '2026-06-30', 1, '2024-05-20 09:45:00', '2024-05-20 09:45:00', '2024-05-20 09:45:00'),
(26, 'user-ph09', 9, 15, 0, 'Inhaler', '2026-10-31', 1, '2024-05-20 09:45:00', '2024-05-20 09:45:00', '2024-05-20 09:45:00'),
(27, 'user-ph10', 8, 20, 0, 'Tablet', '2026-07-31', 1, '2024-05-20 10:00:00', '2024-05-20 10:00:00', '2024-05-20 10:00:00'),
(28, 'user-ph10', 3, 0, 0, 'Capsule', '2026-09-30', 1, '2024-05-20 10:00:00', '2024-05-20 10:00:00', '2024-05-20 10:00:00');
SET IDENTITY_INSERT PharmacyInventory OFF;

-- 10. DOCTOR_SCHEDULES
-- Shift windows: Morning 07:00-10:30, Afternoon 13:00-17:30, Evening 19:00-21:00.
-- Online/Offline use SlotDuration as the appointment step.
-- HomeVisit uses the whole shift window, and runtime slot candidates are calculated from
-- visit duration + selected service durations + round-trip travel time + buffer.
-- No overlapping schedules on the same day for any doctor.
SET IDENTITY_INSERT DoctorSchedules ON;
INSERT INTO DoctorSchedules (ScheduleID, DoctorId, dayOfWeek, startTime, endTime, SlotDuration, MaxPatients, Available, ScheduleStatus, consultationType, ShiftType, location, notes) VALUES
-- Dr. John Smith (user-d01): Mon online morning + offline afternoon + home visit evening; Wed home visit morning + online afternoon
(1, 'user-d01', 1, '07:00', '10:00', 30, 1, 1, 'APPROVED', 'Video', NULL, NULL, 'Monday morning video consultations'),
(2, 'user-d01', 1, '13:30', '16:30', 30, 1, 1, 'APPROVED', 'Offline', NULL, 'Manhattan Health Clinic', 'Monday afternoon in-person'),
(3, 'user-d01', 1, '19:00', '21:00', 120, 1, 1, 'APPROVED', 'HomeVisit', 'EVENING', 'Patient home', 'Monday evening home visit shift'),
(4, 'user-d01', 3, '07:00', '10:30', 210, 1, 1, 'APPROVED', 'HomeVisit', 'MORNING', 'Patient home', 'Wednesday morning home visit shift'),
(5, 'user-d01', 3, '14:00', '17:00', 30, 1, 1, 'APPROVED', 'Video', NULL, NULL, 'Wednesday afternoon video consultations'),

-- Dr. Sarah Johnson (user-d02): Tue online morning + home visit afternoon; Thu online morning
(6, 'user-d02', 2, '08:00', '10:30', 20, 2, 1, 'APPROVED', 'Video', NULL, NULL, 'Tuesday morning pediatric consultations'),
(7, 'user-d02', 2, '13:00', '17:30', 270, 1, 1, 'APPROVED', 'HomeVisit', 'AFTERNOON', 'Patient home', 'Tuesday afternoon home visit shift'),
(8, 'user-d02', 4, '07:00', '10:00', 20, 2, 1, 'APPROVED', 'Video', NULL, NULL, 'Thursday morning pediatric consultations'),

-- Dr. Michael Chen (user-d03): Wed online morning + home visit afternoon + offline evening; Fri home visit morning
(9, 'user-d03', 3, '09:00', '10:30', 45, 1, 1, 'APPROVED', 'Video', NULL, NULL, 'Cardiology consultations'),
(10, 'user-d03', 3, '13:00', '17:30', 270, 1, 1, 'APPROVED', 'HomeVisit', 'AFTERNOON', 'Patient home', 'Wednesday afternoon home visit shift'),
(11, 'user-d03', 3, '19:00', '21:00', 45, 1, 1, 'APPROVED', 'Offline', NULL, 'Bay Area Heart Center', 'Wednesday evening in-person'),
(12, 'user-d03', 5, '07:00', '10:30', 210, 1, 1, 'APPROVED', 'HomeVisit', 'MORNING', 'Patient home', 'Friday morning home visit shift'),

-- Other doctors: online-only schedules within valid windows
(13, 'user-d04', 4, '07:30', '10:30', 30, 1, 1, 'APPROVED', 'Offline', NULL, 'Chicago Medical Center', 'Thursday morning in-person'),
(14, 'user-d04', 4, '13:00', '16:00', 30, 1, 1, 'APPROVED', 'Offline', NULL, 'Chicago Medical Center', 'Thursday afternoon in-person'),
(15, 'user-d05', 5, '08:00', '10:30', 30, 1, 1, 'APPROVED', 'Video', NULL, NULL, 'OB/GYN video consultations'),
(16, 'user-d06', 6, '08:00', '10:30', 20, 2, 1, 'APPROVED', 'Video', NULL, NULL, 'Dermatology online sessions'),
(17, 'user-d07', 1, '14:00', '17:30', 40, 1, 1, 'APPROVED', 'Offline', NULL, 'Boston Neuro Institute', 'Neurology appointments'),
(18, 'user-d08', 2, '08:00', '10:30', 30, 1, 1, 'APPROVED', 'Offline', NULL, 'Philadelphia Eye Center', 'Eye examinations'),
(19, 'user-d09', 3, '13:30', '17:00', 25, 2, 1, 'APPROVED', 'Video', NULL, NULL, 'ENT video consultations');
SET IDENTITY_INSERT DoctorSchedules OFF;

-- 11. DOCTOR_SCHEDULE_EXCEPTIONS (10 exceptions)
SET IDENTITY_INSERT DoctorScheduleExceptions ON;
INSERT INTO DoctorScheduleExceptions (ExceptionID, DoctorId, exceptionDate, exceptionType, startTime, endTime, reason, Recurring, recurringUntil) VALUES
(1, 'user-d01', '2024-06-01', 'DAY_OFF', NULL, NULL, 'Holiday - Memorial Day', 0, NULL),
(2, 'user-d02', '2024-05-20', 'MODIFIED', '09:00', '11:00', 'Staff meeting in morning', 0, NULL),
(3, 'user-d03', '2024-06-10', 'DAY_OFF', NULL, NULL, 'International Cardiology Conference', 0, NULL),
(4, 'user-d04', '2024-05-25', 'DAY_OFF', NULL, NULL, 'Personal leave', 0, NULL),
(5, 'user-d05', '2024-06-15', 'MODIFIED', '08:00', '10:00', 'Limited hours only', 0, NULL),
(6, 'user-d06', '2024-05-30', 'DAY_OFF', NULL, NULL, 'Medical training', 1, '2024-06-30'),
(7, 'user-d07', '2024-06-05', 'DAY_OFF', NULL, NULL, 'Sick leave', 0, NULL),
(8, 'user-d08', '2024-05-28', 'MODIFIED', '08:00', '09:30', 'Morning surgery scheduled', 0, NULL),
(9, 'user-d09', '2024-06-20', 'DAY_OFF', NULL, NULL, 'Business trip', 0, NULL),
(10, 'user-d10', '2024-05-27', 'DAY_OFF', NULL, NULL, 'Annual leave', 0, NULL);
SET IDENTITY_INSERT DoctorScheduleExceptions OFF;

-- 12. SCHEDULE_COMPLIANCE_CONFIGS (3 configs)
SET IDENTITY_INSERT ScheduleComplianceConfigs ON;
INSERT INTO ScheduleComplianceConfigs (ConfigID, SpecialtyId, MinHoursPerMonth, WarningThresholdPercent, description, Active, EffectiveFrom, EffectiveTo, CreatedAt, UpdatedAt) VALUES
(1, NULL, 80, 80, 'Global minimum monthly schedule requirement', 1, '2026-06-01', NULL, '2026-06-01 08:00:00', NULL),
(2, 3, 72, 85, 'Pediatrics schedule requirement', 1, '2026-06-01', NULL, '2026-06-01 08:00:00', NULL),
(3, 6, 96, 80, 'Cardiology schedule requirement', 1, '2026-06-01', NULL, '2026-06-01 08:00:00', NULL);
SET IDENTITY_INSERT ScheduleComplianceConfigs OFF;

-- 13. DOCTOR_SCHEDULE_COMPLIANCE (6 records)
SET IDENTITY_INSERT DoctorScheduleCompliance ON;
INSERT INTO DoctorScheduleCompliance (ComplianceID, DoctorId, ComplianceMonth, RequiredHours, ScheduledHours, Status, ScheduleActive, LastNotificationSent, AdminNotified, notes, ExemptedBy, ExemptedAt, ExemptReason, CreatedAt, UpdatedAt) VALUES
(1, 'user-d01', '2026-06', 80, 84.00, 'COMPLIANT', 1, '2026-06-05 08:00:00', 0, 'Doctor has met the monthly schedule requirement', NULL, NULL, NULL, '2026-06-01 08:00:00', '2026-06-05 08:00:00'),
(2, 'user-d02', '2026-06', 72, 50.00, 'IN_PROGRESS', 0, '2026-06-06 08:00:00', 0, 'Pediatrics schedule still needs additional hours', NULL, NULL, NULL, '2026-06-01 08:00:00', '2026-06-06 08:00:00'),
(3, 'user-d03', '2026-06', 96, 64.00, 'NON_COMPLIANT', 0, '2026-06-07 08:00:00', 1, 'Cardiology schedule is below required monthly hours', NULL, NULL, NULL, '2026-06-01 08:00:00', '2026-06-07 08:00:00'),
(4, 'user-d04', '2026-06', 80, 0.00, 'PENDING', 0, NULL, 0, 'No schedule submitted yet', NULL, NULL, NULL, '2026-06-01 08:00:00', NULL),
(5, 'user-d05', '2026-06', 80, 20.00, 'EXEMPTED', 1, NULL, 0, 'Doctor is exempted for maternity clinic leave coverage', 'user-a01', '2026-06-03 09:00:00', 'Approved temporary exemption', '2026-06-01 08:00:00', '2026-06-03 09:00:00'),
(6, 'user-d07', '2026-06', 80, 72.00, 'IN_PROGRESS', 0, '2026-06-08 08:00:00', 0, 'Close to required monthly hours', NULL, NULL, NULL, '2026-06-01 08:00:00', '2026-06-08 08:00:00');
SET IDENTITY_INSERT DoctorScheduleCompliance OFF;

-- 14. APPOINTMENT_SLOT_HOLDS (4 expired sample holds)
SET IDENTITY_INSERT AppointmentSlotHolds ON;
INSERT INTO AppointmentSlotHolds (HoldID, DoctorID, PatientID, AppointmentTime, EndTime, ConsultationType, ExpiresAt, CreatedAt) VALUES
(1, 'user-d01', 'user-p01', '2026-06-10 09:00:00', '2026-06-10 09:30:00', 'Video', '2026-06-09 09:05:00', '2026-06-09 09:00:00'),
(2, 'user-d02', 'user-p02', '2026-06-10 10:00:00', '2026-06-10 10:30:00', 'Video', '2026-06-09 09:10:00', '2026-06-09 09:05:00'),
(3, 'user-d07', 'user-p07', '2026-06-11 15:00:00', '2026-06-11 15:30:00', 'Offline', '2026-06-09 09:15:00', '2026-06-09 09:10:00'),
(4, 'user-d08', 'user-p08', '2026-06-09 08:30:00', '2026-06-09 09:00:00', 'Offline', '2026-06-09 08:35:00', '2026-06-09 08:30:00');
SET IDENTITY_INSERT AppointmentSlotHolds OFF;

-- 15. APPOINTMENTS (14 appointments)
SET IDENTITY_INSERT Appointments ON;
INSERT INTO Appointments (AppointmentID, AppointmentTime, ConsultationType, Status, symptoms, notes, fee, endTime, cancelReason, cancelledBy, cancelledAt, rescheduledFrom, followUpSourceAppointmentId, doctorReminderSent, reminderSent, confirmedAt, PatientID, DoctorID) VALUES
(1, '2024-05-10 09:00:00', 'Video', 'Completed', 'Headache and fatigue for 3 days', 'Patient needs follow-up', 150.00, '2024-05-10 09:30:00', NULL, NULL, NULL, NULL, NULL, 0, 1, '2024-05-09 15:00:00', 'user-p01', 'user-d01'),
(2, '2024-05-11 10:00:00', 'Video', 'Completed', 'Child has fever and dry cough', 'Prescription provided', 120.00, '2024-05-11 10:20:00', NULL, NULL, NULL, NULL, NULL, 0, 1, '2024-05-10 18:00:00', 'user-p02', 'user-d02'),
(3, '2024-05-12 09:30:00', 'Video', 'Completed', 'Chest pain and shortness of breath', 'Additional tests required', 250.00, '2024-05-12 10:15:00', NULL, NULL, NULL, NULL, NULL, 0, 1, '2024-05-11 14:00:00', 'user-p03', 'user-d03'),
(4, '2024-05-15 08:00:00', 'Offline', 'Completed', 'Abdominal pain in upper region', 'Surgery consultation', 180.00, '2024-05-15 08:30:00', NULL, NULL, NULL, NULL, NULL, 0, 1, '2024-05-14 10:00:00', 'user-p04', 'user-d04'),
(5, '2024-05-16 14:00:00', 'Video', 'Completed', 'Routine prenatal checkup', 'Baby developing normally', 140.00, '2024-05-16 14:30:00', NULL, NULL, NULL, NULL, NULL, 0, 1, '2024-05-15 09:00:00', 'user-p05', 'user-d05'),
(6, '2024-05-18 09:00:00', 'Video', 'Scheduled', 'Skin rash all over body', NULL, 110.00, NULL, NULL, NULL, NULL, NULL, NULL, 0, 1, '2024-05-17 16:00:00', 'user-p06', 'user-d06'),
(7, '2024-05-20 15:00:00', 'Offline', 'Confirmed', 'Severe headache and dizziness', NULL, 220.00, NULL, NULL, NULL, NULL, NULL, NULL, 0, 1, '2024-05-19 11:00:00', 'user-p07', 'user-d07'),
(8, '2024-05-22 08:30:00', 'Offline', 'Scheduled', 'Blurry vision and eye pain', NULL, 160.00, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 'user-p08', 'user-d08'),
(9, '2024-05-13 14:00:00', 'Video', 'Cancelled', 'Sore throat, difficulty swallowing', 'Patient cancelled', NULL, NULL, 'Unexpected work commitment', 'Patient', '2024-05-13 08:00:00', NULL, NULL, 0, 1, '2024-05-12 20:00:00', 'user-p09', 'user-d09'),
(10, '2024-05-25 10:00:00', 'Offline', 'Scheduled', 'Toothache and swollen gums', NULL, 90.00, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 'user-p10', 'user-d10'),
(11, '2024-05-24 16:00:00', 'Video', 'Completed', 'Follow-up after seasonal flu', 'Completed telehealth session for invoice generation test', 150.00, '2024-05-24 16:30:00', NULL, NULL, NULL, NULL, NULL, 0, 1, '2024-05-24 15:50:00', 'user-p01', 'user-d01'),
(12, '2024-05-26 09:00:00', 'Video', 'Scheduled', 'Follow-up consultation', NULL, 150.00, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 'user-p01', 'user-d01'),
(13, '2024-05-26 10:00:00', 'Video', 'Scheduled', 'Follow-up consultation', NULL, 150.00, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 'user-p01', 'user-d01'),
(14, '2024-05-27 19:00:00', 'HomeVisit', 'Completed', 'Elderly patient has difficulty walking and needs home evaluation', 'Home visit completed with selected services', 173.00, '2024-05-27 20:40:00', NULL, NULL, NULL, NULL, NULL, 0, 1, '2024-05-27 18:30:00', 'user-p01', 'user-d01');
SET IDENTITY_INSERT Appointments OFF;

-- 15b. HOME_VISIT_DETAILS
SET IDENTITY_INSERT HomeVisitDetails ON;
INSERT INTO HomeVisitDetails (
    HomeVisitDetailID, AppointmentID, VisitAddress, VisitCity, ContactPhone,
    ReasonForHomeVisit, SpecialNotes, IsForSelf, ReceiverName, ReceiverAge,
    ReceiverGender, ReceiverRelationship, ReceiverPhone, VisitLatitude,
    VisitLongitude, DistanceKm, EstimatedTravelMinutes, VisitDurationMinutes,
    TravelBufferBeforeMinutes, TravelBufferAfterMinutes, HomeVisitFee, TravelFee
) VALUES
(1, 14, '12 Le Loi Street, District 1, Ho Chi Minh City', 'Ho Chi Minh City', '0912000001',
 'Elderly patient has difficulty walking and needs home evaluation',
 'Apartment lobby entrance, call before arrival', 1, NULL, NULL, NULL, NULL, NULL,
 10.7769, 106.7009, 2.50, 10, 45, 10, 10, 10.00, 0.00);
SET IDENTITY_INSERT HomeVisitDetails OFF;

-- 15c. HOME_VISIT_BOOKINGS
SET IDENTITY_INSERT HomeVisitBookings ON;
INSERT INTO HomeVisitBookings (Id, DoctorId, ScheduleId, BookingDate, AppointmentId, CreatedAt, StartTime, EndTime) VALUES
(1, 'user-d01', 3, '2024-05-27', 14, '2024-05-27 18:30:00', '19:00', '20:40');
SET IDENTITY_INSERT HomeVisitBookings OFF;

-- 15d. APPOINTMENT_HOME_VISIT_SERVICES
SET IDENTITY_INSERT AppointmentHomeVisitServices ON;
INSERT INTO AppointmentHomeVisitServices (ID, AppointmentID, ServiceID, ServiceName, Price) VALUES
(1, 14, 1, 'Basic vital signs check', 5.00),
(2, 14, 2, 'Blood glucose test', 8.00);
SET IDENTITY_INSERT AppointmentHomeVisitServices OFF;

-- 16. ADMIN_SCHEDULE_AUDIT_LOGS (4 logs)
SET IDENTITY_INSERT AdminScheduleAuditLogs ON;
INSERT INTO AdminScheduleAuditLogs (LogId, AdminUserId, ActionType, TargetDoctorId, TargetAppointmentId, TargetPatientId, Description, OldValue, NewValue, Reason, CreatedAt, IpAddress) VALUES
(1, 'user-a01', 'BLOCK_SLOT', 'user-d01', NULL, NULL, 'Admin blocked one video slot for doctor user-d01', '{"available":true}', '{"available":false,"slot":"2026-06-10T09:00:00"}', 'Clinic maintenance window', '2026-06-09 08:45:00', '127.0.0.1'),
(2, 'user-a01', 'UNBLOCK_SLOT', 'user-d02', NULL, NULL, 'Admin reopened a pediatric video slot', '{"available":false}', '{"available":true,"slot":"2026-06-10T10:00:00"}', 'Doctor confirmed availability', '2026-06-09 08:50:00', '127.0.0.1'),
(3, 'user-a01', 'CANCEL_APPOINTMENT', 'user-d09', 9, 'user-p09', 'Admin recorded appointment cancellation audit', '{"status":"Confirmed"}', '{"status":"Cancelled"}', 'Patient cancellation request', '2024-05-13 08:05:00', '127.0.0.1'),
(4, 'user-a01', 'REASSIGN_APPOINTMENT', 'user-d07', 7, 'user-p07', 'Admin prepared reassignment audit sample', '{"doctorId":"user-d07"}', '{"doctorId":"user-d07","status":"kept"}', 'No alternative doctor needed after review', '2024-05-19 11:10:00', '127.0.0.1');
SET IDENTITY_INSERT AdminScheduleAuditLogs OFF;

-- 17. CONSULTATIONS (11 consultations)
SET IDENTITY_INSERT Consultations ON;
INSERT INTO Consultations (ConsultationID, AppointmentId, startTime, endTime, doctorNotes, diagnosis, followUpDate, followUpAppointmentId, consultationType, roomId, roomUrl, recordingUrl, duration, treatmentPlan, followUpNotes) VALUES
(1, 1, '2024-05-10 09:00:00', '2024-05-10 09:28:00', 'Patient shows signs of stress and sleep deprivation', 'Mild anxiety disorder, work-related stress', '2024-05-24', NULL, 'Video', 'room-001', 'https://meet.healthlink.com/room-001', NULL, 28, 'Rest, stress management, medication as prescribed', 'Follow up in 2 weeks'),
(2, 2, '2024-05-11 10:00:00', '2024-05-11 10:18:00', 'Child has viral infection, no serious symptoms', 'Upper respiratory tract infection - viral', '2024-05-18', NULL, 'Video', 'room-002', 'https://meet.healthlink.com/room-002', NULL, 18, 'Fever medication, rest, fluid intake', 'Return if fever persists after 3 days'),
(3, 3, '2024-05-12 09:30:00', '2024-05-12 10:10:00', 'Suspected coronary artery disease, needs ECG and echo', 'Chest pain - suspected myocardial ischemia', '2024-05-19', NULL, 'Video', 'room-003', 'https://meet.healthlink.com/room-003', 'https://storage.healthlink.com/rec-003.mp4', 40, 'ECG, echocardiogram, cardiac enzymes test', 'Return with test results'),
(4, 4, '2024-05-15 08:00:00', '2024-05-15 08:25:00', 'Acute appendicitis confirmed, surgery required', 'Acute appendicitis', '2024-05-22', NULL, 'Offline', NULL, NULL, NULL, 25, 'Hospital admission, surgery preparation', 'Post-surgery follow-up'),
(5, 5, '2024-05-16 14:00:00', '2024-05-16 14:25:00', '20 weeks pregnant, fetal development normal, heartbeat regular', 'Normal pregnancy', '2024-06-16', NULL, 'Video', 'room-005', 'https://meet.healthlink.com/room-005', NULL, 25, 'Continue prenatal vitamins, balanced diet', 'Next checkup in 4 weeks'),
(6, 6, '2024-05-18 09:00:00', NULL, NULL, NULL, NULL, NULL, 'Video', 'room-006', 'https://meet.healthlink.com/room-006', NULL, NULL, NULL, NULL),
(7, 7, '2024-05-20 15:00:00', NULL, NULL, NULL, NULL, NULL, 'Offline', NULL, NULL, NULL, NULL, NULL, NULL),
(8, 8, NULL, NULL, NULL, NULL, NULL, NULL, 'Offline', NULL, NULL, NULL, NULL, NULL, NULL),
(9, 9, NULL, NULL, 'Patient cancelled appointment', NULL, NULL, NULL, 'Video', 'room-009', NULL, NULL, NULL, NULL, NULL),
(10, 10, NULL, NULL, NULL, NULL, NULL, NULL, 'Offline', NULL, NULL, NULL, NULL, NULL, NULL),
(11, 11, '2024-05-24 16:00:00', '2024-05-24 16:25:00', 'Stable condition, no new complaints', 'Recovered from seasonal flu, recommend rest and hydration', '2024-06-07', NULL, 'Video', 'room-011', 'https://meet.healthlink.com/room-011', NULL, 25, 'Rest, hydration, vitamin C', 'Return if fever recurs');
SET IDENTITY_INSERT Consultations OFF;

UPDATE Consultations
   SET HomeVisitProposalStatus = 'NONE'
 WHERE HomeVisitProposalStatus IS NULL;

UPDATE Consultations
   SET HomeVisitProposalStatus = 'ACCEPTED',
       HomeVisitProposedAt = '2024-05-24 16:10:00',
       HomeVisitRespondedAt = '2024-05-24 16:20:00'
 WHERE ConsultationID = 11;

-- 18. HEALTH_RECORDS (10 health records)
SET IDENTITY_INSERT HealthRecords ON;
INSERT INTO HealthRecords (HealthRecordID, PatientID, lastUpdated, title, description, recordType, recordDate, createdAt) VALUES
(1, 'user-p01', '2024-05-10', 'Annual Physical Exam 2024', 'Routine annual health checkup', 'Checkup', '2024-01-15', '2024-01-15'),
(2, 'user-p02', '2024-05-11', 'Gastritis Treatment Record', 'Monitoring chronic gastritis condition', 'FollowUp', '2024-03-20', '2024-03-20'),
(3, 'user-p03', '2024-05-12', 'Blood Sugar Test Results', 'Type 2 diabetes monitoring', 'LabResult', '2024-04-01', '2024-04-01'),
(4, 'user-p04', '2024-05-15', 'Student Health Record', 'College health examination', 'Checkup', '2024-02-28', '2024-02-28'),
(5, 'user-p05', '2024-05-16', 'Blood Pressure Monitoring', 'Hypertension tracking record', 'FollowUp', '2024-03-15', '2024-03-15'),
(6, 'user-p06', '2024-05-18', 'Asthma Management Record', 'Chronic asthma monitoring', 'Chronic', '2024-01-10', '2024-01-10'),
(7, 'user-p07', '2024-05-20', 'Uric Acid Test Results', 'Gout monitoring', 'LabResult', '2024-04-20', '2024-04-20'),
(8, 'user-p08', '2024-05-01', 'Healthcare Worker Physical', 'Annual employee health exam', 'Checkup', '2024-03-01', '2024-03-01'),
(9, 'user-p09', '2024-05-13', 'Sinusitis Treatment Record', 'Chronic sinusitis monitoring', 'Chronic', '2024-02-15', '2024-02-15'),
(10, 'user-p10', '2024-05-25', 'Spine X-Ray Results', 'Spinal degeneration monitoring', 'Imaging', '2024-04-10', '2024-04-10');
SET IDENTITY_INSERT HealthRecords OFF;

-- 19. MEDICAL_DOCUMENTS (10 documents)
SET IDENTITY_INSERT MedicalDocuments ON;
INSERT INTO MedicalDocuments (DocumentID, HealthRecordID, documentName, documentType, fileLocation, category, description, testResults, referenceRange, testStatus, documentDate, performedBy, UploadedAt, FileSize, mimeType, thumbnailUrl) VALUES
(1, 1, 'Complete Blood Count', 'LabReport', '/documents/1/blood-test.pdf', 'Blood', 'CBC test results', 'WBC: 7.5, RBC: 4.8, Hb: 14.2', 'WBC: 4-10, RBC: 4.5-5.5, Hb: 12-16', 'Normal', '2024-01-15', 'Dr. Lab Tech', '2024-01-15 10:00:00', 245000, 'application/pdf', '/thumbnails/1/blood-test.jpg'),
(2, 2, 'Upper GI Endoscopy', 'Endoscopy', '/documents/2/gastroscopy.pdf', 'Gastro', 'Gastroscopy findings', 'Mild antral gastritis, H. pylori negative', NULL, 'Abnormal', '2024-03-20', 'Dr. GI Specialist', '2024-03-20 14:30:00', 1250000, 'application/pdf', '/thumbnails/2/gastroscopy.jpg'),
(3, 3, 'HbA1c Test', 'LabReport', '/documents/3/hba1c.pdf', 'Blood', 'Diabetes monitoring', 'HbA1c: 7.2%, FBS: 145mg/dL', 'HbA1c: <6.5%, FBS: 70-100', 'Abnormal', '2024-04-01', 'Dr. Endocrinologist', '2024-04-01 09:00:00', 180000, 'application/pdf', '/thumbnails/3/hba1c.jpg'),
(4, 4, 'General Physical Exam', 'Checkup', '/documents/4/checkup.pdf', 'General', 'Complete physical examination', 'Healthy, BMI: 20.3', NULL, 'Normal', '2024-02-28', 'Dr. Primary Care', '2024-02-28 16:00:00', 320000, 'application/pdf', '/thumbnails/4/checkup.jpg'),
(5, 5, 'Blood Pressure Chart', 'Chart', '/documents/5/bp-chart.pdf', 'Cardio', '3-month BP monitoring', 'Average: 145/92 mmHg', '<140/90 mmHg', 'Abnormal', '2024-03-15', 'Self-monitored', '2024-03-15 20:00:00', 95000, 'application/pdf', '/thumbnails/5/bp-chart.jpg'),
(6, 6, 'Pulmonary Function Test', 'PFT', '/documents/6/spirometry.pdf', 'Pulmonary', 'Spirometry results', 'FEV1: 78%, FVC: 85%', 'FEV1: >80%, FVC: >80%', 'Abnormal', '2024-01-10', 'Respiratory Tech', '2024-01-10 11:00:00', 420000, 'application/pdf', '/thumbnails/6/spirometry.jpg'),
(7, 7, 'Uric Acid Level', 'LabReport', '/documents/7/uric-acid.pdf', 'Blood', 'Serum uric acid test', 'Uric Acid: 8.5 mg/dL', '3.5-7.2 mg/dL', 'Abnormal', '2024-04-20', 'Dr. Lab Tech', '2024-04-20 08:30:00', 150000, 'application/pdf', '/thumbnails/7/uric-acid.jpg'),
(8, 8, 'Employee Health Certificate', 'Checkup', '/documents/8/health-cert.pdf', 'General', 'Annual health certification', 'Fit for duty', NULL, 'Normal', '2024-03-01', 'Dr. Occupational Health', '2024-03-01 10:30:00', 280000, 'application/pdf', '/thumbnails/8/health-cert.jpg'),
(9, 9, 'Sinus CT Scan', 'Imaging', '/documents/9/ct-sinus.pdf', 'ENT', 'CT scan of paranasal sinuses', 'Bilateral maxillary sinusitis', NULL, 'Abnormal', '2024-02-15', 'Dr. Radiologist', '2024-02-15 15:00:00', 2500000, 'application/pdf', '/thumbnails/9/ct-sinus.jpg'),
(10, 10, 'Lumbar Spine X-Ray', 'Imaging', '/documents/10/spine-xray.pdf', 'Ortho', 'Lumbar spine radiograph', 'L4-L5 degeneration, osteophytes present', NULL, 'Abnormal', '2024-04-10', 'Dr. Radiologist', '2024-04-10 14:00:00', 1800000, 'application/pdf', '/thumbnails/10/spine-xray.jpg');
SET IDENTITY_INSERT MedicalDocuments OFF;

-- 20. VITAL_SIGNS (10 vital signs)
SET IDENTITY_INSERT VitalSigns ON;
INSERT INTO VitalSigns (VitalSignID, PatientID, AppointmentID, heartRate, bloodPressureSystolic, bloodPressureDiastolic, temperature, oxygenSaturation, respiratoryRate, bloodGlucose, weight, height, bmi, notes, measuredAt, source, deviceName, CreatedAt) VALUES
(1, 'user-p01', 1, 72, 120, 80, 98.6, 98, 16, NULL, 70.0, 175.0, 22.9, 'Normal readings', '2024-05-10 08:30:00', 'Manual', NULL, '2024-05-10 08:30:00'),
(2, 'user-p02', 2, 80, 118, 75, 99.1, 99, 18, NULL, 58.0, 165.0, 21.3, 'Slightly elevated HR due to anxiety', '2024-05-11 09:45:00', 'Device', 'Omron BP Monitor', '2024-05-11 09:45:00'),
(3, 'user-p03', 3, 78, 135, 88, 98.8, 97, 17, 145.0, 85.0, 178.0, 26.8, 'Elevated BP and blood glucose', '2024-05-12 09:00:00', 'Device', 'Accu-Chek', '2024-05-12 09:00:00'),
(4, 'user-p04', 4, 68, 110, 70, 98.4, 99, 15, NULL, 52.0, 160.0, 20.3, 'Healthy readings', '2024-05-15 07:30:00', 'Manual', NULL, '2024-05-15 07:30:00'),
(5, 'user-p05', 5, 85, 148, 95, 98.9, 96, 18, NULL, 78.0, 180.0, 24.1, 'High BP needs monitoring', '2024-05-16 13:30:00', 'Device', 'Fitbit', '2024-05-16 13:30:00'),
(6, 'user-p06', 6, 75, 115, 72, 98.6, 95, 20, NULL, 55.0, 163.0, 20.7, 'Lower SpO2 due to asthma', '2024-05-18 08:45:00', 'Device', 'Apple Watch', '2024-05-18 08:45:00'),
(7, 'user-p07', 7, 82, 140, 90, 99.3, 97, 17, NULL, 80.0, 172.0, 27.0, 'Borderline high BP', '2024-05-20 14:30:00', 'Manual', NULL, '2024-05-20 14:30:00'),
(8, 'user-p08', 8, 70, 118, 78, 98.8, 99, 16, NULL, 60.0, 168.0, 21.3, 'Normal readings', '2024-05-01 10:00:00', 'Manual', NULL, '2024-05-01 10:00:00'),
(9, 'user-p09', 9, 76, 122, 80, 98.6, 98, 16, NULL, 75.0, 182.0, 22.6, 'Stable', '2024-05-13 13:00:00', 'Device', 'Samsung Galaxy Watch', '2024-05-13 13:00:00'),
(10, 'user-p10', NULL, 74, 130, 85, 98.9, 97, 17, NULL, 62.0, 158.0, 24.8, 'Slightly elevated BP', '2024-05-25 09:30:00', 'Manual', NULL, '2024-05-25 09:30:00');
SET IDENTITY_INSERT VitalSigns OFF;

-- 21. INVOICES (11 invoices)
SET IDENTITY_INSERT Invoices ON;
INSERT INTO Invoices (InvoiceID, AppointmentId, PatientID, amount, issueDate, status, invoiceNumber, consultationFee, medicineFee, deliveryFee, discount, tax, dueDate, paidAt, notes, platformFee, doctorEarning, commissionRate) VALUES
(1, 1, 'user-p01', 175.00, '2024-05-10 09:30:00', 'Paid', 'INV-2024-0001', 150.00, 25.00, 0, 0, 0, '2024-05-17', '2024-05-10 09:35:00', 'Paid online', 22.50, 127.50, 0.1500),
(2, 2, 'user-p02', 155.00, '2024-05-11 10:20:00', 'Paid', 'INV-2024-0002', 120.00, 35.00, 0, 0, 0, '2024-05-18', '2024-05-11 10:25:00', 'Paid via PayPal', 18.00, 102.00, 0.1500),
(3, 3, 'user-p03', 320.00, '2024-05-12 10:15:00', 'Paid', 'INV-2024-0003', 250.00, 70.00, 0, 0, 0, '2024-05-19', '2024-05-12 10:20:00', 'Includes lab test fees', 37.50, 212.50, 0.1500),
(4, 4, 'user-p04', 180.00, '2024-05-15 08:30:00', 'Pending', 'INV-2024-0004', 180.00, 0, 0, 0, 0, '2024-05-22', NULL, 'Awaiting payment', 21.60, 158.40, 0.1200),
(5, 5, 'user-p05', 165.00, '2024-05-16 14:30:00', 'Paid', 'INV-2024-0005', 140.00, 25.00, 0, 0, 0, '2024-05-23', '2024-05-16 14:35:00', 'Paid', 21.00, 119.00, 0.1500),
(6, 6, 'user-p06', 110.00, '2024-05-18 09:00:00', 'Pending', 'INV-2024-0006', 110.00, 0, 0, 0, 0, '2024-05-25', NULL, 'Pending consultation', NULL, NULL, NULL),
(7, 7, 'user-p07', 220.00, '2024-05-20 15:00:00', 'Pending', 'INV-2024-0007', 220.00, 0, 0, 0, 0, '2024-05-27', NULL, '50% deposit paid', 26.40, 193.60, 0.1200),
(8, 8, 'user-p08', 160.00, '2024-05-22 08:30:00', 'Pending', 'INV-2024-0008', 160.00, 0, 0, 0, 0, '2024-05-29', NULL, 'Not yet paid', NULL, NULL, NULL),
(9, 9, 'user-p09', 0, '2024-05-13 14:00:00', 'Cancelled', 'INV-2024-0009', 100.00, 0, 0, 100.00, 0, '2024-05-20', NULL, 'Refunded due to cancellation', NULL, NULL, NULL),
(10, 10, 'user-p10', 90.00, '2024-05-25 10:00:00', 'Pending', 'INV-2024-0010', 90.00, 0, 0, 0, 0, '2024-06-01', NULL, 'Pending consultation', NULL, NULL, NULL),
(11, 14, 'user-p01', 173.00, '2024-05-27 20:40:00', 'Paid', 'INV-2024-0011', 150.00, 0, 0, 0, 0, '2024-06-03', '2024-05-27 20:45:00', 'Paid Home Visit appointment via PayPal', 15.00, 158.00, 0.1000);
SET IDENTITY_INSERT Invoices OFF;

-- 22. PAYMENTS (11 payments)
SET IDENTITY_INSERT Payments ON;
INSERT INTO Payments (PaymentID, InvoiceID, OrderID, amount, paymentMethod, paymentGateway, transactionId, status, paidAt, failureReason, refundedAmount, refundedAt, refundReason, metadata, CreatedAt) VALUES
(1, 1, NULL, 175.00, 'Card', 'Stripe', 'STR20240510001', 'Completed', '2024-05-10 09:35:00', NULL, NULL, NULL, NULL, '{"cardLast4":"4242","cardBrand":"Visa"}', '2024-05-10 09:35:00'),
(2, 2, NULL, 155.00, 'EWallet', 'PayPal', 'PP20240511001', 'Completed', '2024-05-11 10:25:00', NULL, NULL, NULL, NULL, '{"payerId":"PAYPAL123"}', '2024-05-11 10:25:00'),
(3, 3, NULL, 320.00, 'Card', 'Stripe', 'STR20240512001', 'Completed', '2024-05-12 10:20:00', NULL, NULL, NULL, NULL, '{"cardLast4":"1234","cardBrand":"Mastercard"}', '2024-05-12 10:20:00'),
(4, 4, NULL, 90.00, 'Cash', NULL, NULL, 'Completed', '2024-05-15 08:00:00', NULL, NULL, NULL, NULL, NULL, '2024-05-15 08:00:00'),
(5, 5, NULL, 165.00, 'Card', 'Stripe', 'STR20240516001', 'Completed', '2024-05-16 14:35:00', NULL, NULL, NULL, NULL, '{"cardLast4":"5678","cardBrand":"Amex"}', '2024-05-16 14:35:00'),
(6, 6, NULL, 110.00, 'EWallet', 'Apple Pay', 'AP20240518001', 'Pending', NULL, NULL, NULL, NULL, NULL, '{"deviceId":"iPhone15"}', '2024-05-18 09:00:00'),
(7, 7, NULL, 110.00, 'Card', 'Stripe', 'STR20240519001', 'Completed', '2024-05-19 11:00:00', NULL, NULL, NULL, NULL, '{"cardLast4":"9012","cardBrand":"Visa"}', '2024-05-19 11:00:00'),
(8, 8, NULL, 160.00, 'Card', NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-22 08:30:00'),
(9, 9, NULL, 100.00, 'EWallet', 'PayPal', 'PP20240512002', 'Refunded', '2024-05-12 20:00:00', NULL, 100.00, '2024-05-13 09:00:00', 'Patient cancelled appointment', '{"refundId":"RF001"}', '2024-05-12 20:00:00'),
(10, 10, NULL, 90.00, 'Cash', NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-25 10:00:00'),
(11, 11, NULL, 173.00, 'EWallet', 'PayPal', 'PP20240527001', 'Completed', '2024-05-27 20:45:00', NULL, NULL, NULL, NULL, '{"payerId":"PAYPAL-HOME-VISIT","homeVisitServiceIds":[1,2]}', '2024-05-27 20:45:00');
SET IDENTITY_INSERT Payments OFF;

-- 23. PRESCRIPTION_HEADERS (10 prescriptions)
SET IDENTITY_INSERT PrescriptionHeaders ON;
INSERT INTO PrescriptionHeaders (PrescriptionHeaderID, AppointmentId, PatientID, DoctorID, issueDate, diagnosis, notes, validUntil, status, sourceAppointmentId, sourcePrescriptionHeaderId, lastReminderSentAt, openedAt, totalAmount) VALUES
(1, 1, 'user-p01', 'user-d01', '2024-05-10', 'Mild anxiety disorder', 'Take medication regularly, follow up in 2 weeks', '2024-06-10', 'Active', NULL, NULL, NULL, NULL, 45.00),
(2, 2, 'user-p02', 'user-d02', '2024-05-11', 'Upper respiratory infection', 'Ensure child drinks plenty of fluids', '2024-05-18', 'Active', NULL, NULL, NULL, NULL, 35.00),
(3, 3, 'user-p03', 'user-d03', '2024-05-12', 'Suspected angina', 'Continue BP medication, return with test results', '2024-06-12', 'Active', NULL, NULL, NULL, NULL, 75.00),
(4, 4, 'user-p04', 'user-d04', '2024-05-15', 'Post-operative care', 'Pain management after surgery', '2024-05-22', 'Active', NULL, NULL, NULL, NULL, 40.00),
(5, 5, 'user-p05', 'user-d05', '2024-05-16', 'Normal pregnancy', 'Prenatal vitamin supplementation', '2024-07-16', 'Active', NULL, NULL, NULL, NULL, 55.00),
(6, 1, 'user-p01', 'user-d01', '2024-04-10', 'Common cold', 'Previous prescription', '2024-04-17', 'Expired', NULL, NULL, NULL, NULL, 25.00),
(7, 2, 'user-p02', 'user-d02', '2024-03-15', 'Gastritis', 'Regular gastric medication', '2024-04-15', 'Completed', NULL, NULL, NULL, NULL, 50.00),
(8, 3, 'user-p03', 'user-d03', '2024-04-01', 'Type 2 diabetes', 'Monthly diabetes medication', '2024-05-01', 'Completed', NULL, NULL, NULL, NULL, 65.00),
(9, 5, 'user-p05', 'user-d05', '2024-04-16', 'Hypertension', 'April BP medication', '2024-05-16', 'Completed', NULL, NULL, NULL, NULL, 60.00),
(10, 7, 'user-p07', 'user-d07', '2024-04-20', 'Acute gout', 'Acute episode treatment', '2024-05-20', 'Active', NULL, NULL, NULL, NULL, 48.00);
SET IDENTITY_INSERT PrescriptionHeaders OFF;

-- 24. PRESCRIPTION_ITEMS (11 items)
SET IDENTITY_INSERT PrescriptionItems ON;
INSERT INTO PrescriptionItems (PrescriptionItemID, PrescriptionHeaderID, medicationName, dosage, instructions, totalSupplyDays, MedicineID, quantity, unit, frequency, timing, route, notes) VALUES
(1, 1, 'Paracetamol 500mg', '500mg', 'Take when headache occurs, max 3 tablets per day', 7, 1, 21, 'Tablet', '3 times daily', 'As needed', 'Oral', NULL),
(2, 1, 'Vitamin C 1000mg', '1000mg', 'Take 1 tablet in morning after breakfast', 14, 7, 14, 'Tablet', 'Once daily', 'MORNING', 'Oral', 'Immune support'),
(3, 2, 'Paracetamol 500mg', '250mg', 'Take when fever exceeds 100.4F', 5, 1, 10, 'Tablet', 'As needed', 'When fever', 'Oral', 'Half tablet for child'),
(4, 2, 'Cetirizine 10mg', '5mg', 'Take once before bedtime', 7, 6, 7, 'Tablet', 'Once daily', 'Night', 'Oral', 'Half tablet'),
(5, 3, 'Amlodipine 5mg', '5mg', 'Take 1 tablet every morning', 30, 5, 30, 'Tablet', 'Once daily', 'MORNING', 'Oral', 'Maintain blood pressure'),
(6, 4, 'Ibuprofen 400mg', '400mg', 'Take after meals when in pain', 5, 8, 15, 'Tablet', '3 times daily', 'AFTERNOON', 'Oral', 'Do not take on empty stomach'),
(7, 5, 'Prenatal Multivitamin', '1 tablet', 'Take 1 tablet daily after breakfast', 30, NULL, 30, 'Tablet', 'Once daily', 'MORNING', 'Oral', 'Prenatal vitamin'),
(8, 8, 'Metformin 500mg', '500mg', 'Take after breakfast and dinner', 30, 4, 60, 'Tablet', 'Twice daily', 'MORNING', 'Oral', NULL),
(9, 9, 'Amlodipine 5mg', '5mg', 'Take every morning', 30, 5, 30, 'Tablet', 'Once daily', 'MORNING', 'Oral', NULL),
(10, 10, 'Allopurinol 300mg', '300mg', 'Take after breakfast', 30, 10, 30, 'Tablet', 'Once daily', 'MORNING', 'Oral', 'Drink plenty of water'),
(11, 3, 'Paracetamol 500mg', '500mg', 'Take when chest discomfort causes headache, max 2 tablets per day', 5, 1, 10, 'Tablet', 'As needed', 'When pain', 'Oral', 'Added to support partial pharmacy stock matching');
SET IDENTITY_INSERT PrescriptionItems OFF;

-- 25. PRESCRIPTION_REMINDER_LOGS (6 logs)
SET IDENTITY_INSERT PrescriptionReminderLogs ON;
INSERT INTO PrescriptionReminderLogs (ReminderLogID, PrescriptionHeaderID, ReminderDate, Timing, SentAt) VALUES
(1, 1, '2024-05-11', 'MORNING', '2024-05-11 07:30:00'),
(2, 1, '2024-05-11', 'Night', '2024-05-11 20:30:00'),
(3, 2, '2024-05-12', 'Night', '2024-05-12 20:00:00'),
(4, 3, '2024-05-13', 'MORNING', '2024-05-13 07:45:00'),
(5, 5, '2024-05-17', 'MORNING', '2024-05-17 08:00:00'),
(6, 10, '2024-04-21', 'MORNING', '2024-04-21 08:00:00');
SET IDENTITY_INSERT PrescriptionReminderLogs OFF;

-- 26. PHARMACY_CONSULTATION_REQUESTS (5 requests)
SET IDENTITY_INSERT PharmacyConsultationRequests ON;
INSERT INTO PharmacyConsultationRequests (RequestID, PatientID, PharmacyID, symptoms, description, allergies, attachments, additionalNotes, preferredDeliveryType, deliveryType, deliveryAddress, deliveryLatitude, deliveryLongitude, deliveryPhoneNumber, deliveryAddressSource, requestType, status, chatRoomId, pharmacyNotes, patientFollowUpNotes, CreatedAt, UpdatedAt) VALUES
(1, 'user-p01', 'user-ph01', 'Need to fill active prescription quickly', 'Patient selected HealthLink Pharmacy - Ben Thanh and is waiting for pharmacy acceptance.', 'Penicillin', '[]', 'Please deliver after 6 PM if accepted.', 'Delivery', 'Delivery', '12 Le Loi Street, District 1, Ho Chi Minh City', 10.7769, 106.7009, '0902000001', 'PROFILE', 'CONSULTATION', 'PENDING', NULL, NULL, NULL, '2024-05-20 15:00:00', '2024-05-20 15:00:00'),
(2, 'user-p02', 'user-ph02', 'Child fever prescription follow-up', 'Patient wants pharmacist to verify dosage before delivery.', NULL, '[]', 'Urgent order for child.', 'Delivery', 'Delivery', '123 Maple Avenue, Los Angeles, CA', 34.0522, -118.2437, '0923456789', 'PROFILE', 'CONSULTATION', 'IN_REVIEW', 'pharm-chat-002', 'Pharmacist is reviewing child dosage and stock.', NULL, '2024-05-20 15:10:00', '2024-05-20 15:20:00'),
(3, 'user-p03', 'user-ph04', 'Cardiology prescription availability check', 'Patient needs the pharmacy to confirm partial stock and alternatives.', NULL, '[]', 'Please advise if Amlodipine stock is insufficient.', 'Delivery', 'Delivery', '78 Pine Road, Chicago, IL', 41.8781, -87.6298, '0934567890', 'PROFILE', 'CONSULTATION', 'IN_REVIEW', 'pharm-chat-003', 'Amlodipine quantity is insufficient; need confirmation for partial fulfillment.', 'Patient will confirm whether partial fulfillment is acceptable.', '2024-05-20 15:30:00', '2024-05-20 15:45:00'),
(4, 'user-p07', 'user-ph07', 'Gout medication order request', 'Pharmacy accepted the request and prepared an order quote with delivery fee and estimated delivery time.', NULL, '[]', 'Afternoon delivery preferred.', 'Delivery', 'Delivery', '12 Walnut Drive, Miami, FL', 25.7617, -80.1918, '0978901234', 'PROFILE', 'CONSULTATION', 'ORDER_CREATED', 'pharm-chat-004', 'Order quote has been prepared.', NULL, '2024-05-20 15:50:00', '2024-05-20 16:05:00'),
(5, 'user-p05', 'user-ph01', 'Hypertension refill request', 'Patient cancelled the pharmacy request before review.', NULL, '[]', 'No longer needed.', 'Pickup', 'Pickup', NULL, NULL, NULL, NULL, NULL, 'CONSULTATION', 'CANCELLED', NULL, 'Cancelled before pharmacy review.', NULL, '2024-05-20 16:10:00', '2024-05-20 16:20:00');
SET IDENTITY_INSERT PharmacyConsultationRequests OFF;

-- 27. PHARMACY_CONSULTATION_REQUEST_PRESCRIPTIONS (5 links)
SET IDENTITY_INSERT PharmacyConsultationRequestPrescriptions ON;
INSERT INTO PharmacyConsultationRequestPrescriptions (RequestPrescriptionID, RequestID, PrescriptionHeaderID, CreatedAt) VALUES
(1, 1, 1, '2024-05-20 15:00:00'),
(2, 2, 2, '2024-05-20 15:10:00'),
(3, 3, 3, '2024-05-20 15:30:00'),
(4, 4, 10, '2024-05-20 15:50:00'),
(5, 5, 9, '2024-05-20 16:10:00');
SET IDENTITY_INSERT PharmacyConsultationRequestPrescriptions OFF;

-- 28. PHARMACY_ORDERS (15 orders)
SET IDENTITY_INSERT PharmacyOrders ON;
INSERT INTO PharmacyOrders (OrderID, orderNumber, PrescriptionHeaderId, RequestID, PharmacyId, PatientId, status, deliveryType, deliveryAddress, deliveryLatitude, deliveryLongitude, deliveryPhoneNumber, deliveryAddressSource, deliveryFee, medicineAmount, totalAmount, paymentStatus, paymentMethod, notes, pharmacistNotes, estimatedDeliveryTime, actualDeliveryTime, confirmedAt, patientConfirmedAt, preparingAt, shippedAt, deliveredAt, cancelledAt, cancelReason, cancelledBy, revisionRequestedAt, revisionRequestNotes, revisionResolvedAt, createdAt, doctorCompletionPaidNotified, platformFee, pharmacyEarning, commissionRate) VALUES
(1, 'ORD-2024-0001', 1, NULL, 'user-ph01', 'user-p01', 'DELIVERED', 'Delivery', '12 Le Loi Street, District 1, Ho Chi Minh City', 10.7769, 106.7009, '0902000001', 'PROFILE', 5.99, 45.00, 50.99, 'PAID', 'COD', 'Deliver during office hours', 'Prescription verified', '2024-05-10 14:00:00', '2024-05-10 13:45:00', '2024-05-10 10:00:00', '2024-05-10 10:05:00', '2024-05-10 10:30:00', '2024-05-10 11:00:00', '2024-05-10 13:45:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-10 09:40:00', 0, 4.08, 46.91, 0.0800),
(2, 'ORD-2024-0002', 2, NULL, 'user-ph02', 'user-p02', 'DELIVERED', 'Delivery', '123 Maple Avenue, Los Angeles, CA', 34.0522, -118.2437, '0923456789', 'PROFILE', 6.99, 35.00, 41.99, 'PAID', 'Card', 'Urgent for child', 'Priority delivery', '2024-05-11 15:00:00', '2024-05-11 14:30:00', '2024-05-11 11:00:00', '2024-05-11 11:05:00', '2024-05-11 11:30:00', '2024-05-11 12:00:00', '2024-05-11 14:30:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-11 10:30:00', 0, 3.36, 38.63, 0.0800),
(3, 'ORD-2024-0003', 3, NULL, 'user-ph04', 'user-p03', 'SHIPPING', 'Delivery', '78 Pine Road, Chicago, IL', 41.8781, -87.6298, '0934567890', 'PROFILE', 7.99, 75.00, 82.99, 'PAID', 'EWallet', NULL, 'In transit', '2024-05-12 16:00:00', NULL, '2024-05-12 11:00:00', '2024-05-12 11:05:00', '2024-05-12 11:30:00', '2024-05-12 14:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-12 10:30:00', 0, 6.64, 76.35, 0.0800),
(4, 'ORD-2024-0004', 4, NULL, 'user-ph06', 'user-p04', 'PREPARING', 'Pickup', NULL, NULL, NULL, NULL, NULL, 0, 40.00, 40.00, 'PENDING', 'Cash', 'Will pick up in person', 'Preparing order', NULL, NULL, '2024-05-15 09:00:00', '2024-05-15 09:05:00', '2024-05-15 09:30:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-15 08:35:00', 0, 3.20, 36.80, 0.0800),
(5, 'ORD-2024-0005', 5, NULL, 'user-ph02', 'user-p05', 'CONFIRMED', 'Delivery', '234 Elm Street, San Francisco, CA', 37.7749, -122.4194, '0956789012', 'PROFILE', 6.99, 55.00, 61.99, 'PAID', 'Card', NULL, NULL, '2024-05-16 18:00:00', NULL, '2024-05-16 15:00:00', '2024-05-16 15:05:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-16 14:40:00', 0, 4.96, 57.03, 0.0800),
(6, 'ORD-2024-0006', 6, NULL, 'user-ph05', 'user-p01', 'CANCELLED', 'Delivery', '12 Le Loi Street, District 1, Ho Chi Minh City', 10.7769, 106.7009, '0902000001', 'PROFILE', 5.49, 25.00, 30.49, 'REFUNDED', 'EWallet', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-04-11 08:00:00', 'Prescription expired', 'System', NULL, NULL, NULL, '2024-04-10 16:00:00', 0, 2.44, 28.05, 0.0800),
(7, 'ORD-2024-0007', 7, NULL, 'user-ph02', 'user-p02', 'DELIVERED', 'Delivery', '123 Maple Avenue, Los Angeles', 34.0522, -118.2437, '0923456789', 'PROFILE', 6.99, 50.00, 56.99, 'PAID', 'COD', NULL, 'OK', '2024-03-16 12:00:00', '2024-03-16 11:30:00', '2024-03-15 16:00:00', '2024-03-15 16:05:00', '2024-03-15 16:30:00', '2024-03-16 09:00:00', '2024-03-16 11:30:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-03-15 15:30:00', 0, 4.56, 52.43, 0.0800),
(8, 'ORD-2024-0008', 8, NULL, 'user-ph04', 'user-p03', 'DELIVERED', 'Pickup', NULL, NULL, NULL, NULL, NULL, 0, 65.00, 65.00, 'PAID', 'Cash', 'Store pickup', 'Completed', NULL, '2024-04-02 10:00:00', '2024-04-01 14:00:00', '2024-04-01 14:05:00', '2024-04-01 14:30:00', NULL, '2024-04-02 10:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-04-01 13:00:00', 0, 5.20, 59.80, 0.0800),
(9, 'ORD-2024-0009', 9, NULL, 'user-ph01', 'user-p05', 'DELIVERED', 'Delivery', '234 Elm Street, San Francisco', 37.7749, -122.4194, '0956789012', 'PROFILE', 5.99, 60.00, 65.99, 'PAID', 'Card', NULL, 'Delivered successfully', '2024-04-17 15:00:00', '2024-04-17 14:30:00', '2024-04-16 17:00:00', '2024-04-16 17:05:00', '2024-04-16 17:30:00', '2024-04-17 09:00:00', '2024-04-17 14:30:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-04-16 16:30:00', 0, 5.28, 60.71, 0.0800),
(10, 'ORD-2024-0010', 10, NULL, 'user-ph07', 'user-p07', 'PENDING', 'Delivery', '12 Walnut Drive, Miami, FL', 25.7617, -80.1918, '0978901234', 'PROFILE', 5.99, 48.00, 53.99, 'PENDING', 'COD', 'Afternoon delivery', NULL, '2024-05-21 17:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-20 15:30:00', 0, 4.32, 49.67, 0.0800),
(11, 'ORD-2024-0011', 10, 4, 'user-ph07', 'user-p07', 'PENDING', 'Delivery', '12 Walnut Drive, Miami, FL', 25.7617, -80.1918, '0978901234', 'PROFILE', 5.99, 48.00, 53.99, 'PENDING', 'PayPal', 'Quote prepared from consultation request; waiting patient confirmation', 'Third-party courier quoted delivery by late afternoon', '2024-05-21 17:00:00', NULL, '2024-05-20 16:05:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-20 16:05:00', 0, 4.32, 49.67, 0.0800),
(12, 'ORD-2024-0012', 1, NULL, 'user-ph01', 'user-p01', 'CONFIRMED', 'Delivery', '12 Le Loi Street, District 1, Ho Chi Minh City', 10.7769, 106.7009, '0902000001', 'PROFILE', 5.99, 45.00, 50.99, 'PENDING', 'PayPal', 'Patient confirmed quote and is on payment step', 'Delivery fee and estimated time confirmed by third-party courier', '2024-05-20 19:30:00', NULL, '2024-05-20 17:00:00', '2024-05-20 17:05:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-20 16:55:00', 0, 4.08, 46.91, 0.0800),
(13, 'ORD-2024-0013', 2, NULL, 'user-ph02', 'user-p02', 'COMPLETED', 'Delivery', '123 Maple Avenue, Los Angeles, CA', 34.0522, -118.2437, '0923456789', 'PROFILE', 6.99, 35.00, 41.99, 'PAID', 'PayPal', 'Completed PayPal pharmacy order', 'Delivered and completed', '2024-05-21 15:00:00', '2024-05-21 14:30:00', '2024-05-21 11:00:00', '2024-05-21 11:05:00', '2024-05-21 11:30:00', '2024-05-21 12:00:00', '2024-05-21 14:30:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-21 10:30:00', 1, 3.36, 38.63, 0.0800),
(14, 'ORD-2024-0014', 3, NULL, 'user-ph04', 'user-p03', 'REFUNDED', 'Delivery', '78 Pine Road, Chicago, IL', 41.8781, -87.6298, '0934567890', 'PROFILE', 7.99, 75.00, 82.99, 'REFUNDED', 'PayPal', 'Refunded due to partial stock rejection', 'Refund processed after patient declined substitute', '2024-05-22 16:00:00', NULL, '2024-05-22 11:00:00', '2024-05-22 11:05:00', NULL, NULL, NULL, '2024-05-22 12:30:00', 'Patient declined partial fulfillment', 'Patient', NULL, NULL, NULL, '2024-05-22 10:30:00', 0, 6.64, 76.35, 0.0800),
(15, 'ORD-2024-0015', 4, NULL, 'user-ph06', 'user-p04', 'READY', 'Pickup', NULL, NULL, NULL, NULL, NULL, 0, 40.00, 40.00, 'PAID', 'Cash', 'Pickup order ready at counter', 'Ready for patient pickup', NULL, NULL, '2024-05-23 09:00:00', '2024-05-23 09:05:00', '2024-05-23 09:30:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-23 08:35:00', 0, 3.20, 36.80, 0.0800);
SET IDENTITY_INSERT PharmacyOrders OFF;

-- 29. PHARMACY_ORDER_ITEMS (21 items)
SET IDENTITY_INSERT PharmacyOrderItems ON;
INSERT INTO PharmacyOrderItems (OrderItemID, OrderID, MedicineID, SourcePrescriptionHeaderID, SourcePrescriptionItemID, medicationName, totalSupplyDays, quantity, unit, frequency, timing, route, totalPrice, notes) VALUES
(1, 1, 1, 1, 1, 'Paracetamol 500mg', 7, 21, 'Tablet', '3 times daily', 'As needed', 'Oral', 6.30, NULL),
(2, 1, 7, 1, 2, 'Vitamin C 1000mg', 14, 14, 'Tablet', 'Once daily', 'MORNING', 'Oral', 13.02, 'Immune support'),
(3, 2, 1, 2, 3, 'Paracetamol 500mg', 5, 10, 'Tablet', 'As needed', 'When fever', 'Oral', 3.00, 'Half tablet for child'),
(4, 2, 6, 2, 4, 'Cetirizine 10mg', 7, 7, 'Tablet', 'Once daily', 'Night', 'Oral', 4.97, 'Half tablet'),
(5, 3, 5, 3, 5, 'Amlodipine 5mg', 30, 30, 'Tablet', 'Once daily', 'MORNING', 'Oral', 18.90, 'Insufficient inventory demo'),
(6, 3, 1, 3, 11, 'Paracetamol 500mg', 5, 10, 'Tablet', 'As needed', 'When pain', 'Oral', 3.00, 'Available item for partial stock demo'),
(7, 4, 8, 4, 6, 'Ibuprofen 400mg', 5, 15, 'Tablet', '3 times daily', 'AFTERNOON', 'Oral', 7.95, NULL),
(8, 5, NULL, 5, 7, 'Prenatal Multivitamin', 30, 30, 'Tablet', 'Once daily', 'MORNING', 'Oral', 54.90, 'Manual medication item without catalog medicine'),
(9, 6, 1, 6, NULL, 'Cold relief pack', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 25.00, 'Legacy order item without prescription item'),
(10, 7, 3, 7, NULL, 'Omeprazole 20mg', 30, 30, 'Capsule', 'Once daily', 'MORNING', 'Oral', 15.90, 'Legacy order item without prescription item'),
(11, 8, 4, 8, 8, 'Metformin 500mg', 30, 60, 'Tablet', 'Twice daily', 'MORNING', 'Oral', 18.00, NULL),
(12, 9, 5, 9, 9, 'Amlodipine 5mg', 30, 30, 'Tablet', 'Once daily', 'MORNING', 'Oral', 18.90, NULL),
(13, 10, 10, 10, 10, 'Allopurinol 300mg', 30, 30, 'Tablet', 'Once daily', 'MORNING', 'Oral', 15.00, NULL),
(14, 11, 10, 10, 10, 'Allopurinol 300mg', 30, 30, 'Tablet', 'Once daily', 'MORNING', 'Oral', 15.00, 'Quote item from pharmacy consultation request'),
(15, 12, 1, 1, 1, 'Paracetamol 500mg', 7, 21, 'Tablet', '3 times daily', 'As needed', 'Oral', 6.30, 'Patient confirmed quote'),
(16, 12, 7, 1, 2, 'Vitamin C 1000mg', 14, 14, 'Tablet', 'Once daily', 'MORNING', 'Oral', 13.02, 'Patient confirmed quote'),
(17, 13, 1, 2, 3, 'Paracetamol 500mg', 5, 10, 'Tablet', 'As needed', 'When fever', 'Oral', 3.00, 'Completed pharmacy order'),
(18, 13, 6, 2, 4, 'Cetirizine 10mg', 7, 7, 'Tablet', 'Once daily', 'Night', 'Oral', 4.97, 'Completed pharmacy order'),
(19, 14, 5, 3, 5, 'Amlodipine 5mg', 30, 30, 'Tablet', 'Once daily', 'MORNING', 'Oral', 18.90, 'Refunded partial stock case'),
(20, 14, 1, 3, 11, 'Paracetamol 500mg', 5, 10, 'Tablet', 'As needed', 'When pain', 'Oral', 3.00, 'Refunded partial stock case'),
(21, 15, 8, 4, 6, 'Ibuprofen 400mg', 5, 15, 'Tablet', '3 times daily', 'AFTERNOON', 'Oral', 7.95, 'Ready for pickup');
SET IDENTITY_INSERT PharmacyOrderItems OFF;

-- 30. PHARMACY_ORDER_INVOICES (4 invoices)
SET IDENTITY_INSERT Invoices ON;
INSERT INTO Invoices (InvoiceID, AppointmentId, PharmacyOrderId, PatientID, amount, issueDate, status, invoiceNumber, consultationFee, medicineFee, deliveryFee, discount, tax, dueDate, paidAt, notes, platformFee, doctorEarning, commissionRate) VALUES
(12, NULL, 13, 'user-p02', 41.99, '2024-05-21 14:30:00', 'PAID', 'INV-PH-2024-0012', 0, 35.00, 6.99, 0, 0, '2024-05-28', '2024-05-21 14:35:00', 'Paid pharmacy order invoice via PayPal', 3.36, NULL, 0.0800),
(13, NULL, 12, 'user-p01', 50.99, '2024-05-20 17:05:00', 'PENDING', 'INV-PH-2024-0013', 0, 45.00, 5.99, 0, 0, '2024-05-27', NULL, 'Awaiting PayPal payment after patient confirmed quote', 4.08, NULL, 0.0800),
(14, NULL, 14, 'user-p03', 82.99, '2024-05-22 11:05:00', 'REFUNDED', 'INV-PH-2024-0014', 0, 75.00, 7.99, 0, 0, '2024-05-29', '2024-05-22 11:10:00', 'Refunded pharmacy order invoice', 6.64, NULL, 0.0800),
(15, NULL, 15, 'user-p04', 40.00, '2024-05-23 09:05:00', 'PAID', 'INV-PH-2024-0015', 0, 40.00, 0, 0, 0, '2024-05-30', '2024-05-23 09:10:00', 'Paid pickup pharmacy order invoice', 3.20, NULL, 0.0800);
SET IDENTITY_INSERT Invoices OFF;

-- 31. PHARMACY_ORDER_PAYMENTS (4 payments)
SET IDENTITY_INSERT Payments ON;
INSERT INTO Payments (PaymentID, InvoiceID, OrderID, amount, paymentMethod, paymentGateway, transactionId, status, paidAt, failureReason, refundedAmount, refundedAt, refundReason, metadata, CreatedAt) VALUES
(12, 12, 13, 41.99, 'EWallet', 'PayPal', 'PP-PH-20240521001', 'SUCCESS', '2024-05-21 14:35:00', NULL, NULL, NULL, NULL, '{"payerId":"PAYPAL-PH-002","orderType":"PHARMACY_ORDER"}', '2024-05-21 14:35:00'),
(13, 13, 12, 50.99, 'EWallet', 'PayPal', 'PP-PH-20240520001', 'PENDING', NULL, NULL, NULL, NULL, NULL, '{"checkoutState":"CREATED","orderType":"PHARMACY_ORDER"}', '2024-05-20 17:05:00'),
(14, 14, 14, 82.99, 'EWallet', 'PayPal', 'PP-PH-20240522001', 'REFUNDED', '2024-05-22 11:10:00', NULL, 82.99, '2024-05-22 12:30:00', 'Patient declined partial fulfillment', '{"refundId":"RF-PH-001","orderType":"PHARMACY_ORDER"}', '2024-05-22 11:10:00'),
(15, 15, 15, 40.00, 'Cash', NULL, 'CASH-PH-20240523001', 'SUCCESS', '2024-05-23 09:10:00', NULL, NULL, NULL, NULL, '{"pickupCounter":"A1","orderType":"PHARMACY_ORDER"}', '2024-05-23 09:10:00');
SET IDENTITY_INSERT Payments OFF;

-- 32. CHAT_ROOMS (13 chat rooms)
INSERT INTO ChatRooms (ChatRoomId, user1Id, user2Id, user1DisplayName, user1PhotoURL, user2DisplayName, user2PhotoURL, lastMessage, lastMessageAt, blockedBy, AppointmentId) VALUES
('chat-001', 'user-p01', 'user-d01', 'Michael Anderson', 'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', 'Dr. John Smith', 'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', 'Thank you, doctor!', '2024-05-10 09:35:00', NULL, 1),
('chat-002', 'user-p02', 'user-d02', 'Emma Thompson', 'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', 'Dr. Sarah Johnson', 'http://localhost:8096/uploads/avatars/doctors/bacsi_02.png', 'The fever has gone down', '2024-05-12 08:00:00', NULL, 2),
('chat-003', 'user-p03', 'user-d03', 'William Brown', 'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', 'Dr. Michael Chen', 'http://localhost:8096/uploads/avatars/doctors/bacsi_03.png', 'I will get the tests done right away', '2024-05-12 10:20:00', NULL, 3),
('chat-004', 'user-p04', 'user-d04', 'Sophia Garcia', 'http://localhost:8096/uploads/avatars/patients/benhnhan_04.png', 'Dr. Emily Davis', 'http://localhost:8096/uploads/avatars/doctors/bacsi_04.png', 'Yes, I understand', '2024-05-15 08:35:00', NULL, 4),
('chat-005', 'user-p05', 'user-d05', 'James Wilson', 'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', 'Dr. Jessica Williams', 'http://localhost:8096/uploads/avatars/doctors/bacsi_05.png', 'Great news about the baby!', '2024-05-16 14:40:00', NULL, 5),
('chat-006', 'user-p06', 'user-d06', 'Olivia Davis', 'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', 'Dr. Robert Brown', 'http://localhost:8096/uploads/avatars/doctors/bacsi_06.png', 'Hello doctor', '2024-05-17 16:00:00', NULL, 6),
('chat-007', 'user-p07', 'user-d07', 'Daniel Miller', 'http://localhost:8096/uploads/avatars/patients/benhnhan_07.png', 'Dr. David Wilson', 'http://localhost:8096/uploads/avatars/doctors/bacsi_07.png', 'I am waiting for the appointment', '2024-05-19 11:05:00', NULL, 7),
('chat-008', 'user-p08', 'user-d08', 'Isabella Moore', 'http://localhost:8096/uploads/avatars/patients/benhnhan_08.png', 'Dr. Amanda Lee', 'http://localhost:8096/uploads/avatars/doctors/bacsi_08.png', NULL, NULL, NULL, 8),
('chat-009', 'user-p09', 'user-d09', 'Alexander Johnson', 'http://localhost:8096/uploads/avatars/patients/benhnhan_09.png', 'Dr. James Taylor', 'http://localhost:8096/uploads/avatars/doctors/bacsi_09.png', 'Sorry I have to cancel', '2024-05-13 08:05:00', NULL, 9),
('chat-010', 'user-p10', 'user-d10', 'Charlotte Taylor', 'http://localhost:8096/uploads/avatars/patients/benhnhan_10.png', 'Dr. Jennifer Martinez', 'http://localhost:8096/uploads/avatars/doctors/bacsi_10.png', NULL, NULL, NULL, 10),
('pharm-chat-002', 'user-p02', 'user-ph02', 'Emma Thompson', 'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', 'An Khang Pharmacy - Nguyen Hue', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_02.png', 'We are checking the child dosage now.', '2024-05-20 15:22:00', NULL, NULL),
('pharm-chat-003', 'user-p03', 'user-ph04', 'William Brown', 'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', 'CVS Pharmacy - SF', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_04.png', 'Amlodipine stock is short today.', '2024-05-20 15:44:00', NULL, NULL),
('pharm-chat-004', 'user-p07', 'user-ph07', 'Daniel Miller', 'http://localhost:8096/uploads/avatars/patients/benhnhan_07.png', 'MedExpress Pharmacy', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_07.png', 'Quote is ready with delivery ETA.', '2024-05-20 16:05:00', NULL, NULL);

-- 33. MESSAGES (16 messages)
INSERT INTO ChatMessages (MessageID, ChatRoomId, SenderId, ReceiverId, content, photoURL, imageUrl, videoUrl, fileUrl, IsRead, SentAt) VALUES
('11111111-1111-1111-1111-111111111111', 'chat-001', 'user-d01', 'user-p01', 'Hi Michael, can you describe your headache symptoms?', 'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2024-05-10 09:02:00'),
('11111111-1111-1111-1111-111111111112', 'chat-001', 'user-p01', 'user-d01', 'I have been having a dull pain on the right side of my head for 3 days', 'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', NULL, NULL, NULL, 1, '2024-05-10 09:05:00'),
('11111111-1111-1111-1111-111111111113', 'chat-001', 'user-d01', 'user-p01', 'Are you getting enough sleep? Any work-related stress?', 'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2024-05-10 09:08:00'),
('11111111-1111-1111-1111-111111111114', 'chat-001', 'user-p01', 'user-d01', 'Actually, I have been working a lot lately and not sleeping well', 'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', NULL, NULL, NULL, 1, '2024-05-10 09:10:00'),
('11111111-1111-1111-1111-111111111115', 'chat-001', 'user-p01', 'user-d01', 'Thank you, doctor!', 'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', NULL, NULL, NULL, 1, '2024-05-10 09:35:00'),
('11111111-1111-1111-1111-111111111116', 'chat-002', 'user-d02', 'user-p02', 'How high is the fever and when did it start?', 'http://localhost:8096/uploads/avatars/doctors/bacsi_02.png', NULL, NULL, NULL, 1, '2024-05-11 10:02:00'),
('11111111-1111-1111-1111-111111111117', 'chat-002', 'user-p02', 'user-d02', 'The fever was 101.3F since last night, with dry cough', 'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', NULL, NULL, NULL, 1, '2024-05-11 10:05:00'),
('11111111-1111-1111-1111-111111111118', 'chat-002', 'user-p02', 'user-d02', 'The fever has gone down', 'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', NULL, NULL, NULL, 1, '2024-05-12 08:00:00'),
('11111111-1111-1111-1111-111111111119', 'chat-003', 'user-d03', 'user-p03', 'You need to get an ECG and cardiac enzyme test as soon as possible', 'http://localhost:8096/uploads/avatars/doctors/bacsi_03.png', NULL, NULL, NULL, 1, '2024-05-12 10:15:00'),
('11111111-1111-1111-1111-11111111111a', 'chat-003', 'user-p03', 'user-d03', 'I will get the tests done right away', 'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', NULL, NULL, NULL, 1, '2024-05-12 10:20:00'),
('22222222-2222-2222-2222-222222222221', 'pharm-chat-002', 'user-ph02', 'user-p02', 'Hello Emma, we are checking the child dosage now.', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_02.png', NULL, NULL, NULL, 1, '2024-05-20 15:20:00'),
('22222222-2222-2222-2222-222222222222', 'pharm-chat-002', 'user-p02', 'user-ph02', 'Thank you. Please prioritize delivery if stock is available.', 'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', NULL, NULL, NULL, 0, '2024-05-20 15:22:00'),
('22222222-2222-2222-2222-222222222223', 'pharm-chat-003', 'user-ph04', 'user-p03', 'Amlodipine stock is short today. We can prepare the available items first.', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_04.png', NULL, NULL, NULL, 1, '2024-05-20 15:40:00'),
('22222222-2222-2222-2222-222222222224', 'pharm-chat-003', 'user-p03', 'user-ph04', 'Please keep the request open while I check with my doctor.', 'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', NULL, NULL, NULL, 0, '2024-05-20 15:44:00'),
('22222222-2222-2222-2222-222222222225', 'pharm-chat-004', 'user-ph07', 'user-p07', 'Quote is ready with delivery ETA. Please review and confirm.', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_07.png', NULL, NULL, NULL, 1, '2024-05-20 16:05:00'),
('22222222-2222-2222-2222-222222222226', 'pharm-chat-004', 'user-p07', 'user-ph07', 'I will review the quote this afternoon.', 'http://localhost:8096/uploads/avatars/patients/benhnhan_07.png', NULL, NULL, NULL, 0, '2024-05-20 16:06:00');

-- 34. NOTIFICATIONS (18 notifications)
SET IDENTITY_INSERT Notifications ON;
INSERT INTO Notifications (NotificationID, UserId, type, message, relatedId, IsRead, CreatedAt, appointmentId, title, imageUrl, actionUrl, priority, expiresAt, sentVia, metadata) VALUES
(1, 'user-p01', 'APPOINTMENT_REMINDER', 'You have an appointment with Dr. John Smith tomorrow at 9:00 AM', 1, 1, '2024-05-09 18:00:00', 1, 'Appointment Reminder', '/icons/calendar.png', '/appointments/1', 'HIGH', '2024-05-10 09:00:00', 'MOBILE_PUSH', NULL),
(2, 'user-d01', 'NEW_APPOINTMENT', 'New appointment booked by Michael Anderson', 1, 1, '2024-05-09 15:00:00', 1, 'New Appointment', '/icons/appointment.png', '/doctor/appointments/1', 'NORMAL', NULL, 'WEB_SOCKET', NULL),
(3, 'user-p02', 'NEW_PRESCRIPTION', 'Your prescription is ready for pickup or delivery', 2, 1, '2024-05-11 10:25:00', 2, 'Prescription Ready', '/icons/prescription.png', '/prescriptions/2', 'NORMAL', NULL, 'EMAIL', NULL),
(4, 'user-p03', 'APPOINTMENT_REMINDER', 'Your appointment has been confirmed', 3, 1, '2024-05-11 14:05:00', 3, 'Appointment Confirmed', '/icons/check.png', '/appointments/3', 'NORMAL', NULL, 'MOBILE_PUSH', NULL),
(5, 'user-ph01', 'NEW_ORDER', 'New order received from Michael Anderson', 1, 1, '2024-05-10 09:40:00', NULL, 'New Order', '/icons/order.png', '/pharmacy/orders/1', 'HIGH', NULL, 'WEB_SOCKET', NULL),
(6, 'user-p01', 'ORDER_STATUS', 'Your medication order has been delivered successfully', 1, 1, '2024-05-10 13:50:00', NULL, 'Order Delivered', '/icons/delivered.png', '/orders/1', 'NORMAL', NULL, 'MOBILE_PUSH', NULL),
(7, 'user-d02', 'INVOICE_PAID', 'You received a 5-star review from a patient', 1, 0, '2024-05-12 09:00:00', 2, 'New Review', '/icons/star.png', '/doctor/reviews', 'LOW', NULL, 'EMAIL', NULL),
(8, 'user-p06', 'APPOINTMENT_REMINDER', 'Your appointment is scheduled for 9:00 AM on May 18th', 6, 0, '2024-05-17 18:00:00', 6, 'Appointment Reminder', '/icons/calendar.png', '/appointments/6', 'HIGH', '2024-05-18 09:00:00', 'MOBILE_PUSH', NULL),
(9, 'user-p09', 'CANCEL_APPOINTMENT', 'Your appointment has been cancelled', 9, 1, '2024-05-13 08:05:00', 9, 'Appointment Cancelled', '/icons/cancel.png', '/appointments/9', 'NORMAL', NULL, 'MOBILE_PUSH', NULL),
(10, 'user-p07', 'APPOINTMENT_REMINDER', 'Your appointment on May 20th has been confirmed', 7, 1, '2024-05-19 11:00:00', 7, 'Appointment Confirmed', '/icons/check.png', '/appointments/7', 'NORMAL', NULL, 'MOBILE_PUSH', NULL),
(11, 'user-ph01', 'NEW_PHARMACY_REQUEST', 'New pharmacy consultation request from Michael Anderson', 1, 0, '2024-05-20 15:00:00', NULL, 'New Pharmacy Request', '/icons/pharmacy.png', '/pharmacy/consultations/1', 'HIGH', NULL, 'WEB_SOCKET', NULL),
(12, 'user-p02', 'ORDER_STATUS', 'An Khang Pharmacy accepted your request and opened a chat room', 2, 0, '2024-05-20 15:20:00', NULL, 'Pharmacy Connected', '/icons/check.png', '/patient/pharmacy/requests/2', 'NORMAL', NULL, 'MOBILE_PUSH', NULL),
(13, 'user-p03', 'ORDER_STATUS', 'The pharmacy needs more information before preparing your order', 3, 0, '2024-05-20 15:45:00', NULL, 'More Information Needed', '/icons/info.png', '/patient/pharmacy/requests/3', 'NORMAL', NULL, 'MOBILE_PUSH', NULL),
(14, 'user-p07', 'PAYMENT_REQUIRED', 'Your pharmacy order quote is ready with delivery fee and ETA', 11, 0, '2024-05-20 16:05:00', NULL, 'Quote Ready', '/icons/payment.png', '/patient/pharmacy/orders/11', 'HIGH', NULL, 'MOBILE_PUSH', NULL),
(15, 'user-p01', 'PAYMENT_REQUIRED', 'Your confirmed pharmacy quote is ready for PayPal payment', 12, 0, '2024-05-20 17:05:00', NULL, 'Payment Required', '/icons/paypal.png', '/patient/pharmacy/orders/12/pay', 'HIGH', NULL, 'MOBILE_PUSH', NULL),
(16, 'user-ph02', 'INVOICE_PAID', 'PayPal payment received for pharmacy order ORD-2024-0013', 13, 0, '2024-05-21 14:35:00', NULL, 'Order Paid', '/icons/invoice.png', '/pharmacy/orders/13', 'NORMAL', NULL, 'WEB_SOCKET', NULL),
(17, 'user-ph02', 'WALLET_BALANCE_CHANGED', 'Net pharmacy earning was added to your wallet for ORD-2024-0013', 13, 0, '2024-05-21 14:36:00', NULL, 'Wallet Updated', '/icons/wallet.png', '/pharmacy/wallet', 'NORMAL', NULL, 'WEB_SOCKET', NULL),
(18, 'user-p03', 'ORDER_STATUS', 'Your refunded pharmacy order has been updated', 14, 0, '2024-05-22 12:30:00', NULL, 'Order Refunded', '/icons/refund.png', '/patient/pharmacy/orders/14', 'NORMAL', NULL, 'MOBILE_PUSH', NULL);
SET IDENTITY_INSERT Notifications OFF;

-- 35. REVIEWS (10 reviews)
SET IDENTITY_INSERT Reviews ON;
INSERT INTO Reviews (ReviewID, PatientID, DoctorID, rating, comment, reviewDate, AppointmentId, Anonymous, doctorReply, doctorReplyDate, Visible, HelpfulCount, AdminReply, AdminReplyDate) VALUES
(1, 'user-p01', 'user-d01', 5, 'Dr. Smith was very attentive and thorough. He explained my condition clearly.', '2024-05-10 10:00:00', 1, 0, 'Thank you for your trust. Wishing you good health!', '2024-05-10 12:00:00', 1, 12, NULL, NULL),
(2, 'user-p02', 'user-d02', 5, 'Dr. Johnson is excellent with children. My daughter felt comfortable. Highly recommend!', '2024-05-12 08:30:00', 2, 0, 'Thank you! Wishing your daughter a speedy recovery!', '2024-05-12 10:00:00', 1, 25, NULL, NULL),
(3, 'user-p03', 'user-d03', 5, 'Dr. Chen is very knowledgeable and analyzed my condition thoroughly. Very reassuring.', '2024-05-12 11:00:00', 3, 0, NULL, NULL, 1, 8, NULL, NULL),
(4, 'user-p04', 'user-d04', 4, 'Quick and accurate consultation. Waiting time was a bit long though.', '2024-05-15 09:00:00', 4, 0, 'Thank you for the feedback. We will work on reducing wait times.', '2024-05-15 14:00:00', 1, 5, NULL, NULL),
(5, 'user-p05', 'user-d05', 5, 'Dr. Williams is gentle and professional. Great prenatal care experience.', '2024-05-16 15:00:00', 5, 0, 'Wishing you and the baby good health!', '2024-05-16 17:00:00', 1, 18, NULL, NULL),
(6, 'user-p01', 'user-d01', 4, 'Previous visit was also good.', '2024-04-10 10:00:00', 1, 0, NULL, NULL, 1, 3, NULL, NULL),
(7, 'user-p02', 'user-d02', 5, 'Great doctor, very helpful.', '2024-03-15 11:00:00', 2, 1, NULL, NULL, 1, 7, NULL, NULL),
(8, 'user-p03', 'user-d03', 5, 'Excellent diabetes management and monitoring. Very satisfied.', '2024-04-01 10:00:00', 3, 0, 'Thank you! Remember to schedule regular checkups!', '2024-04-01 15:00:00', 1, 10, NULL, NULL),
(9, 'user-p05', 'user-d05', 5, 'Very happy with the service.', '2024-04-16 15:00:00', 5, 0, NULL, NULL, 1, 6, NULL, NULL),
(10, 'user-p07', 'user-d07', 4, 'Wait time was long but the consultation was very thorough.', '2024-04-20 16:00:00', 7, 0, NULL, NULL, 1, 4, NULL, NULL);
SET IDENTITY_INSERT Reviews OFF;

-- 36. HEALTH_RECORD_SHARES (10 shares)
SET IDENTITY_INSERT HealthRecordShares ON;
INSERT INTO HealthRecordShares (ShareID, HealthRecordID, sharedDocumentIds, SharedWithDoctorId, SharedByPatientId, PermissionLevel, ConsentGivenAt, ExpiryDate, Revoked, RevokedAt, RevokeReason, AppointmentID) VALUES
(1, 1, '1', 'user-d01', 'user-p01', 'View', '2024-05-10 08:30:00', '2024-06-10', 0, NULL, NULL, 1),
(2, 2, '2', 'user-d02', 'user-p02', 'View', '2024-05-11 09:30:00', '2024-06-11', 0, NULL, NULL, 2),
(3, 3, '3', 'user-d03', 'user-p03', 'ViewDownload', '2024-05-12 09:00:00', '2024-07-12', 0, NULL, NULL, 3),
(4, 4, '4', 'user-d04', 'user-p04', 'View', '2024-05-15 07:30:00', '2024-05-22', 0, NULL, NULL, 4),
(5, 5, '5', 'user-d05', 'user-p05', 'View', '2024-05-16 13:30:00', '2024-08-16', 0, NULL, NULL, 5),
(6, 6, '6', 'user-d06', 'user-p06', 'View', '2024-05-17 15:00:00', '2024-06-17', 0, NULL, NULL, 6),
(7, 7, '7', 'user-d07', 'user-p07', 'ViewDownload', '2024-05-19 10:00:00', '2024-06-19', 0, NULL, NULL, 7),
(8, 3, '3', 'user-d01', 'user-p03', 'View', '2024-04-01 09:00:00', '2024-05-01', 1, '2024-05-02 10:00:00', 'Expired', NULL),
(9, 5, '5', 'user-d03', 'user-p05', 'View', '2024-04-15 10:00:00', '2024-05-15', 0, NULL, NULL, NULL),
(10, 10, '10', 'user-d07', 'user-p10', 'View', '2024-05-20 09:00:00', '2024-06-20', 0, NULL, NULL, NULL);
SET IDENTITY_INSERT HealthRecordShares OFF;

-- 37. REFRESH_TOKENS (10 tokens)
SET IDENTITY_INSERT RefreshTokens ON;
INSERT INTO RefreshTokens (id, UserId, token, expiryDate, Revoked, CreatedDate, deviceInfo, ipAddress, userAgent) VALUES
(1, 'user-p01', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token1', '2024-06-10 08:00:00', 0, '2024-05-10 08:00:00', 'iPhone 15 Pro', '192.168.1.100', 'Mozilla/5.0 (iPhone; iOS 17)'),
(2, 'user-p02', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token2', '2024-06-11 09:00:00', 0, '2024-05-11 09:00:00', 'Samsung Galaxy S24', '192.168.1.101', 'Mozilla/5.0 (Android 14)'),
(3, 'user-d01', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token3', '2024-06-10 07:30:00', 0, '2024-05-10 07:30:00', 'MacBook Pro M3', '192.168.1.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X)'),
(4, 'user-d02', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token4', '2024-06-11 08:00:00', 0, '2024-05-11 08:00:00', 'Windows Desktop', '192.168.1.51', 'Mozilla/5.0 (Windows NT 10.0)'),
(5, 'user-ph01', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token5', '2024-06-10 06:00:00', 0, '2024-05-10 06:00:00', 'iPad Pro', '192.168.1.60', 'Mozilla/5.0 (iPad; iPadOS 17)'),
(6, 'user-p03', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token6', '2024-06-12 08:30:00', 0, '2024-05-12 08:30:00', 'Xiaomi 14', '192.168.1.102', 'Mozilla/5.0 (Android 14)'),
(7, 'user-d03', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token7', '2024-06-12 07:00:00', 0, '2024-05-12 07:00:00', 'Dell Laptop', '192.168.1.52', 'Mozilla/5.0 (Windows NT 11)'),
(8, 'user-p01', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token8', '2024-05-01 08:00:00', 1, '2024-04-01 08:00:00', 'iPhone 15 Pro', '192.168.1.100', 'Mozilla/5.0 (iPhone; iOS 17)'),
(9, 'user-ph02', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token9', '2024-06-11 07:00:00', 0, '2024-05-11 07:00:00', 'Android Tablet', '192.168.1.61', 'Mozilla/5.0 (Android 13)'),
(10, 'user-d05', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token10', '2024-06-16 08:00:00', 0, '2024-05-16 08:00:00', 'MacBook Air', '192.168.1.53', 'Mozilla/5.0 (Macintosh)');
SET IDENTITY_INSERT RefreshTokens OFF;

-- 38. PASSWORD_RESET_TOKENS (10 tokens)
SET IDENTITY_INSERT PasswordResetTokens ON;
INSERT INTO PasswordResetTokens (Id, Token, UserId, ExpiryDate, Used) VALUES
(1, 'prt-user-p01-20240510', 'user-p01', '2024-05-10 23:59:00', 0),
(2, 'prt-user-p02-20240510', 'user-p02', '2024-05-10 23:59:00', 0),
(3, 'prt-user-p03-20240510', 'user-p03', '2024-05-10 23:59:00', 0),
(4, 'prt-user-p04-20240510', 'user-p04', '2024-05-10 23:59:00', 0),
(5, 'prt-user-p05-20240510', 'user-p05', '2024-05-10 23:59:00', 0),
(6, 'prt-user-d01-20240510', 'user-d01', '2024-05-10 23:59:00', 0),
(7, 'prt-user-d02-20240510', 'user-d02', '2024-05-10 23:59:00', 0),
(8, 'prt-user-ph01-20240510', 'user-ph01', '2024-05-10 23:59:00', 0),
(9, 'prt-user-ph02-20240510', 'user-ph02', '2024-05-10 23:59:00', 0),
(10, 'prt-user-d05-20240510', 'user-d05', '2024-05-10 23:59:00', 0);
SET IDENTITY_INSERT PasswordResetTokens OFF;

-- 39. REGISTRATION_REQUESTS (10 requests)
SET IDENTITY_INSERT RegistrationRequests ON;
INSERT INTO RegistrationRequests (RequestID, RegistrationType, Email, PhoneNumber, Status, CreatedAt, ReviewedAt, ReviewedBy, RejectionReason, FullName, Qualifications, SpecialtyId, Specialty, YearsOfExperience, LanguageSpoken, Location, Bio, ConsultationFee, ClinicName, ClinicAddress, PharmacyName, LicenseNumber, Address, City, District, Ward, OpenTime, CloseTime, Open24Hours, WorkingDays, DeliveryAvailable, DeliveryRadius, DeliveryFee, Description, AIScreeningStatus, AIScreeningResult, AIRejectionReason, AIScreenedAt) VALUES
(1, 'DOCTOR', 'applicant1@healthlink.com', '0905000001', 'Pending', '2024-05-01 10:00:00', NULL, NULL, NULL, 'Dr. Applicant One', 'MD', 1, 'Internal Medicine', 8, 'English', 'New York', 'Doctor registration request', 100.00, 'Applicant Clinic 1', '1 Health St', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PENDING', NULL, NULL, NULL),
(2, 'DOCTOR', 'applicant2@healthlink.com', '0905000002', 'Approved', '2024-05-02 10:00:00', '2024-05-05 09:00:00', 'admin', NULL, 'Dr. Applicant Two', 'MD, PhD', 6, 'Cardiology', 12, 'English', 'Los Angeles', 'Approved doctor request', 180.00, 'Applicant Clinic 2', '2 Health St', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'APPROVED', '{"verified":true}', NULL, '2024-05-04 10:00:00'),
(3, 'DOCTOR', 'applicant3@healthlink.com', '0905000003', 'Rejected', '2024-05-03 10:00:00', '2024-05-06 09:00:00', 'admin', 'Missing valid license', 'Dr. Applicant Three', 'MD', 5, 'Neurology', 6, 'English', 'Chicago', 'Rejected doctor request', 150.00, 'Applicant Clinic 3', '3 Health St', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'REJECTED', '{"verified":false}', 'Document appears altered', '2024-05-04 10:00:00'),
(4, 'PHARMACY', 'pharmacyapp1@healthlink.com', '0915000001', 'Pending', '2024-05-04 11:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Pharmacy Applicant 1', 'LIC-001', '10 Main St', 'Houston', 'Downtown', 'Central', '07:00', '21:00', 0, 'Mon-Sun', 1, 5.0, 5.99, 'Pharmacy registration request', 'PENDING', NULL, NULL, NULL),
(5, 'PHARMACY', 'pharmacyapp2@healthlink.com', '0915000002', 'Approved', '2024-05-05 11:00:00', '2024-05-08 09:00:00', 'admin', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Pharmacy Applicant 2', 'LIC-002', '20 Main St', 'Seattle', 'Center', 'Ward 1', '08:00', '20:00', 0, 'Mon-Sat', 1, 6.0, 6.99, 'Approved pharmacy request', 'APPROVED', '{"verified":true}', NULL, '2024-05-06 11:00:00'),
(6, 'PHARMACY', 'pharmacyapp3@healthlink.com', '0915000003', 'Rejected', '2024-05-06 11:00:00', '2024-05-09 09:00:00', 'admin', 'Incomplete documents', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Pharmacy Applicant 3', 'LIC-003', '30 Main St', 'Miami', 'Beach', 'South', '06:00', '22:00', 0, 'Mon-Sun', 1, 4.0, 4.99, 'Rejected pharmacy request', 'REJECTED', '{"verified":false}', 'Business license not legible', '2024-05-07 11:00:00'),
(7, 'DOCTOR', 'applicant4@healthlink.com', '0905000004', 'Pending', '2024-05-07 10:00:00', NULL, NULL, NULL, 'Dr. Applicant Four', 'DDS', 10, 'Dentistry', 4, 'English', 'Phoenix', 'Dentistry applicant', 90.00, 'Applicant Clinic 4', '4 Health St', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PENDING', NULL, NULL, NULL),
(8, 'PHARMACY', 'pharmacyapp4@healthlink.com', '0915000004', 'Pending', '2024-05-08 11:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Pharmacy Applicant 4', 'LIC-004', '40 Main St', 'Boston', 'Bay', 'North', '08:00', '22:00', 0, 'Mon-Sun', 0, 5.0, 5.49, 'Pharmacy applicant details', 'PENDING', NULL, NULL, NULL),
(9, 'DOCTOR', 'applicant5@healthlink.com', '0905000005', 'Approved', '2024-05-09 10:00:00', '2024-05-10 09:00:00', 'admin', NULL, 'Dr. Applicant Five', 'MD', 3, 'Pediatrics', 9, 'English', 'Philadelphia', 'Pediatrics applicant', 130.00, 'Applicant Clinic 5', '5 Health St', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'APPROVED', '{"verified":true}', NULL, '2024-05-10 09:00:00'),
(10, 'PHARMACY', 'pharmacyapp5@healthlink.com', '0915000005', 'Pending', '2024-05-10 11:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Pharmacy Applicant 5', 'LIC-005', '50 Main St', 'San Francisco', 'Market', 'West', '07:30', '21:30', 0, 'Mon-Sat', 1, 8.0, 7.99, 'Pending pharmacy application', 'PENDING', NULL, NULL, NULL);
SET IDENTITY_INSERT RegistrationRequests OFF;

-- 40. REGISTRATION_DOCUMENTS (10 documents)
SET IDENTITY_INSERT RegistrationDocuments ON;
INSERT INTO RegistrationDocuments (DocumentID, RequestID, DocumentType, FileName, OriginalFileName, FilePath, FileSize, MimeType, UploadedAt, AIVerificationStatus, AIVerificationResult, DocumentTypeVerified, AIConfidenceScore) VALUES
(1, 1, 'Medical Degree', 'req1-degree.pdf', 'degree.pdf', '/registrations/1/degree.pdf', 245000, 'application/pdf', '2024-05-01 10:10:00', 'PENDING', NULL, 0, NULL),
(2, 2, 'Practice License', 'req2-license.pdf', 'license.pdf', '/registrations/2/license.pdf', 245000, 'application/pdf', '2024-05-02 10:10:00', 'VERIFIED', '{"authentic":true}', 1, 0.89),
(3, 3, 'ID Card', 'req3-id.pdf', 'id.pdf', '/registrations/3/id.pdf', 145000, 'application/pdf', '2024-05-03 10:10:00', 'REJECTED', '{"authentic":false}', 0, 0.45),
(4, 4, 'Business License', 'req4-business.pdf', 'business.pdf', '/registrations/4/business.pdf', 305000, 'application/pdf', '2024-05-04 11:10:00', 'PENDING', NULL, 0, NULL),
(5, 5, 'Business License', 'req5-business.pdf', 'business.pdf', '/registrations/5/business.pdf', 305000, 'application/pdf', '2024-05-05 11:10:00', 'VERIFIED', '{"authentic":true}', 1, 0.92),
(6, 6, 'Business License', 'req6-business.pdf', 'business.pdf', '/registrations/6/business.pdf', 305000, 'application/pdf', '2024-05-06 11:10:00', 'FAILED', '{"authentic":false}', 0, 0.38),
(7, 7, 'Dentistry Degree', 'req7-degree.pdf', 'degree.pdf', '/registrations/7/degree.pdf', 240000, 'application/pdf', '2024-05-07 10:10:00', 'PENDING', NULL, 0, NULL),
(8, 8, 'Business License', 'req8-business.pdf', 'business.pdf', '/registrations/8/business.pdf', 305000, 'application/pdf', '2024-05-08 11:10:00', 'PENDING', NULL, 0, NULL),
(9, 9, 'Medical Degree', 'req9-degree.pdf', 'degree.pdf', '/registrations/9/degree.pdf', 245000, 'application/pdf', '2024-05-09 10:10:00', 'VERIFIED', '{"authentic":true}', 1, 0.95),
(10, 10, 'Business License', 'req10-business.pdf', 'business.pdf', '/registrations/10/business.pdf', 305000, 'application/pdf', '2024-05-10 11:10:00', 'PENDING', NULL, 0, NULL);
SET IDENTITY_INSERT RegistrationDocuments OFF;

-- 41. COMMISSION_CONFIGS (4 configs)
SET IDENTITY_INSERT CommissionConfigs ON;
INSERT INTO CommissionConfigs (ConfigId, serviceType, commissionRate, minCommission, maxCommission, description, active, effectiveFrom, effectiveTo, CreatedAt, UpdatedAt) VALUES
(1, 'CONSULTATION_ONLINE', 0.1500, 0.50, 100.00, 'Online consultation commission rate', 1, '2024-01-01 00:00:00', NULL, '2024-01-01 00:00:00', NULL),
(2, 'CONSULTATION_OFFLINE', 0.1200, 0.50, 150.00, 'Offline consultation commission rate', 1, '2024-01-01 00:00:00', NULL, '2024-01-01 00:00:00', NULL),
(3, 'PHARMACY_ORDER', 0.0800, 0.50, 80.00, 'Pharmacy order commission rate', 1, '2024-01-01 00:00:00', NULL, '2024-01-01 00:00:00', NULL),
(4, 'CONSULTATION_HOME_VISIT', 0.1000, 0.50, 120.00, 'Home visit consultation commission rate', 1, '2024-01-01 00:00:00', NULL, '2024-01-01 00:00:00', NULL);
SET IDENTITY_INSERT CommissionConfigs OFF;

-- 42. SETTLEMENTS (3 settlements)
SET IDENTITY_INSERT Settlements ON;
INSERT INTO Settlements (SettlementId, settlementNumber, recipientType, recipientId, recipientName, grossAmount, commissionAmount, netAmount, transactionCount, status, paymentMethod, bankAccount, bankName, paypalEmail, periodStart, periodEnd, processedAt, processedBy, completedAt, notes, CreatedAt) VALUES
(1, 'STL-202405-00001', 'DOCTOR', 'user-d01', 'Dr. John Smith', 500.00, 75.00, 425.00, 2, 'COMPLETED', 'BANK_TRANSFER', '1234567890', 'Bank of America', NULL, '2024-05-01 00:00:00', '2024-05-15 23:59:00', '2024-05-16 10:00:00', 'admin', '2024-05-16 10:30:00', 'First doctor settlement', '2024-05-16 10:00:00'),
(2, 'STL-202405-00002', 'PHARMACY', 'user-ph01', 'HealthLink Pharmacy - Ben Thanh', 700.00, 56.00, 644.00, 2, 'COMPLETED', 'BANK_TRANSFER', '9876543210', 'Chase', NULL, '2024-05-01 00:00:00', '2024-05-15 23:59:00', '2024-05-16 10:15:00', 'admin', '2024-05-16 10:45:00', 'Pharmacy settlement batch', '2024-05-16 10:15:00'),
(3, 'STL-202405-00003', 'DOCTOR', 'user-d05', 'Dr. Jessica Williams', 450.00, 54.00, 396.00, 2, 'PROCESSING', 'PAYPAL', NULL, NULL, 'drjess@example.com', '2024-05-01 00:00:00', '2024-05-15 23:59:00', '2024-05-16 11:00:00', 'admin', NULL, 'Queued for payout', '2024-05-16 11:00:00');
SET IDENTITY_INSERT Settlements OFF;

-- 43. COMMISSION_TRANSACTIONS (15 transactions)
SET IDENTITY_INSERT CommissionTransactions ON;
INSERT INTO CommissionTransactions (TransactionId, transactionNumber, sourceType, appointmentId, pharmacyOrderId, recipientType, recipientId, recipientName, serviceType, grossAmount, commissionRate, commissionAmount, netAmount, status, SettlementId, CreatedAt) VALUES
(1, 'CTX-202405-00001', 'APPOINTMENT', 1, NULL, 'DOCTOR', 'user-d01', 'Dr. John Smith', 'CONSULTATION_ONLINE', 150.00, 0.1500, 22.50, 127.50, 'SETTLED', 1, '2024-05-10 10:00:00'),
(2, 'CTX-202405-00002', 'PHARMACY_ORDER', NULL, 1, 'PHARMACY', 'user-ph01', 'HealthLink Pharmacy - Ben Thanh', 'PHARMACY_ORDER', 50.99, 0.0800, 4.08, 46.91, 'SETTLED', 2, '2024-05-10 13:45:00'),
(3, 'CTX-202405-00003', 'APPOINTMENT', 2, NULL, 'DOCTOR', 'user-d02', 'Dr. Sarah Johnson', 'CONSULTATION_ONLINE', 120.00, 0.1500, 18.00, 102.00, 'SETTLED', 1, '2024-05-11 10:20:00'),
(4, 'CTX-202405-00004', 'PHARMACY_ORDER', NULL, 2, 'PHARMACY', 'user-ph02', 'An Khang Pharmacy - Nguyen Hue', 'PHARMACY_ORDER', 41.99, 0.0800, 3.36, 38.63, 'SETTLED', 2, '2024-05-11 14:30:00'),
(5, 'CTX-202405-00005', 'APPOINTMENT', 3, NULL, 'DOCTOR', 'user-d03', 'Dr. Michael Chen', 'CONSULTATION_ONLINE', 250.00, 0.1500, 37.50, 212.50, 'SETTLED', 1, '2024-05-12 10:15:00'),
(6, 'CTX-202405-00006', 'PHARMACY_ORDER', NULL, 3, 'PHARMACY', 'user-ph04', 'CVS Pharmacy - SF', 'PHARMACY_ORDER', 82.99, 0.0800, 6.64, 76.35, 'PENDING', 2, '2024-05-12 14:00:00'),
(7, 'CTX-202405-00007', 'APPOINTMENT', 5, NULL, 'DOCTOR', 'user-d05', 'Dr. Jessica Williams', 'CONSULTATION_ONLINE', 140.00, 0.1500, 21.00, 119.00, 'SETTLED', 3, '2024-05-16 14:30:00'),
(8, 'CTX-202405-00008', 'PHARMACY_ORDER', NULL, 5, 'PHARMACY', 'user-ph02', 'An Khang Pharmacy - Nguyen Hue', 'PHARMACY_ORDER', 61.99, 0.0800, 4.96, 57.03, 'SETTLED', 2, '2024-05-16 18:00:00'),
(9, 'CTX-202405-00009', 'APPOINTMENT', 7, NULL, 'DOCTOR', 'user-d07', 'Dr. David Wilson', 'CONSULTATION_OFFLINE', 220.00, 0.1200, 26.40, 193.60, 'PENDING', 3, '2024-05-20 15:00:00'),
(10, 'CTX-202405-00010', 'PHARMACY_ORDER', NULL, 10, 'PHARMACY', 'user-ph07', 'MedExpress Pharmacy', 'PHARMACY_ORDER', 53.99, 0.0800, 4.32, 49.67, 'PENDING', 2, '2024-05-20 15:30:00'),
(11, 'CTX-202405-00011', 'PHARMACY_ORDER', NULL, 12, 'PHARMACY', 'user-ph01', 'HealthLink Pharmacy - Ben Thanh', 'PHARMACY_ORDER', 50.99, 0.0800, 4.08, 46.91, 'PENDING', NULL, '2024-05-20 17:05:00'),
(12, 'CTX-202405-00012', 'PHARMACY_ORDER', NULL, 13, 'PHARMACY', 'user-ph02', 'An Khang Pharmacy - Nguyen Hue', 'PHARMACY_ORDER', 41.99, 0.0800, 3.36, 38.63, 'PENDING', NULL, '2024-05-21 14:35:00'),
(13, 'CTX-202405-00013', 'PHARMACY_ORDER', NULL, 14, 'PHARMACY', 'user-ph04', 'CVS Pharmacy - SF', 'PHARMACY_ORDER', 82.99, 0.0800, 6.64, 76.35, 'REFUNDED', NULL, '2024-05-22 12:30:00'),
(14, 'CTX-202405-00014', 'PHARMACY_ORDER', NULL, 15, 'PHARMACY', 'user-ph06', 'Hospital Pharmacy - NYC', 'PHARMACY_ORDER', 40.00, 0.0800, 3.20, 36.80, 'PENDING', NULL, '2024-05-23 09:10:00'),
(15, 'CTX-202405-00015', 'APPOINTMENT', 14, NULL, 'DOCTOR', 'user-d01', 'Dr. John Smith', 'CONSULTATION_HOME_VISIT', 150.00, 0.1000, 15.00, 135.00, 'PENDING', NULL, '2024-05-27 20:45:00');
SET IDENTITY_INSERT CommissionTransactions OFF;

-- 44. DOCTOR_SCHEDULE_CHANGE_REQUESTS (5 requests)
SET IDENTITY_INSERT DoctorScheduleChangeRequest ON;
INSERT INTO DoctorScheduleChangeRequest (requestId, doctor_id, appointment_id, status, reason, admin_reason, handled_by, created_at, updated_at) VALUES
(1, 'user-d01', 1, 'APPROVED', 'Need to reschedule due to conference', NULL, 'user-a01', '2024-06-09 09:00:00', '2024-06-09 10:00:00'),
(2, 'user-d02', 2, 'PENDING', 'Family emergency', NULL, NULL, '2024-06-09 09:30:00', '2024-06-09 09:30:00'),
(3, 'user-d03', 3, 'REJECTED', 'Would like to change to morning slot', 'Morning already fully booked', 'user-a01', '2024-06-09 10:00:00', '2024-06-09 10:30:00'),
(4, 'user-d05', 5, 'PENDING', 'Need to shift appointment due to personal reason', NULL, NULL, '2024-06-09 11:00:00', '2024-06-09 11:00:00'),
(5, 'user-d07', 7, 'APPROVED', 'Schedule conflict with hospital shift', 'Approved - alternative slot provided', 'user-a01', '2024-06-09 11:30:00', '2024-06-09 12:00:00');
SET IDENTITY_INSERT DoctorScheduleChangeRequest OFF;

-- 45. ADMIN_AUDIT_LOGS (5 logs)
SET IDENTITY_INSERT AdminAuditLogs ON;
INSERT INTO AdminAuditLogs (LogId, Category, ActionType, TargetType, TargetId, TargetName, AdminUserId, Description, OldValue, NewValue, Reason, IpAddress, CreatedAt) VALUES
(1, 'USER', 'USER_STATUS_CHANGED', 'DOCTOR', 'user-d03', 'Dr. Michael Chen', 'user-a01', 'Admin deactivated doctor account', '{"status":"Active"}', '{"status":"Inactive"}', 'Violation of terms', '192.168.1.1', '2024-06-01 10:00:00'),
(2, 'REGISTRATION', 'REGISTRATION_APPROVED', 'DOCTOR', '9', 'Dr. Applicant Five', 'user-a01', 'Admin approved doctor registration', '{"status":"Pending"}', '{"status":"Approved"}', 'Documents verified', '192.168.1.1', '2024-06-01 11:00:00'),
(3, 'REGISTRATION', 'REGISTRATION_REJECTED', 'PHARMACY', '6', 'Pharmacy Applicant 3', 'user-a01', 'Admin rejected pharmacy registration', '{"status":"Pending"}', '{"status":"Rejected"}', 'Incomplete documents', '192.168.1.1', '2024-06-01 12:00:00'),
(4, 'COMMISSION', 'COMMISSION_CONFIG_CHANGED', 'CONFIG', '1', 'Online Consultation Rate', 'user-a01', 'Updated online consultation commission rate', '{"rate":0.15}', '{"rate":0.18}', 'Market adjustment', '192.168.1.1', '2024-06-02 08:00:00'),
(5, 'USER', 'USER_STATUS_CHANGED', 'PATIENT', 'user-p03', 'William Brown', 'user-a01', 'Admin reactivated patient account', '{"status":"Inactive"}', '{"status":"Active"}', 'Issue resolved', '192.168.1.1', '2024-06-02 09:00:00');
SET IDENTITY_INSERT AdminAuditLogs OFF;

-- 46. EMAIL_VERIFICATION_TOKENS (5 tokens)
SET IDENTITY_INSERT EmailVerificationTokens ON;
INSERT INTO EmailVerificationTokens (Id, Token, UserId, NewEmail, ExpiryDate, Used, Type, CreatedAt) VALUES
(1, 'evt-user-p01-001', 'user-p01', 'michael.new@email.com', '2024-06-10 08:00:00', 0, 'EMAIL_VERIFICATION', '2024-05-10 08:00:00'),
(2, 'evt-user-d01-002', 'user-d01', 'doctor01.new@healthlink.com', '2024-06-10 07:30:00', 0, 'EMAIL_VERIFICATION', '2024-05-10 07:30:00'),
(3, 'evt-user-p02-003', 'user-p02', 'emma.updated@email.com', '2024-06-11 09:00:00', 1, 'EMAIL_VERIFICATION', '2024-05-11 09:00:00'),
(4, 'evt-user-ph01-004', 'user-ph01', 'pharmacy01.new@example.com', '2024-06-10 06:00:00', 0, 'EMAIL_VERIFICATION', '2024-05-10 06:00:00'),
(5, 'evt-user-p03-005', 'user-p03', 'william.alternate@email.com', '2024-06-12 08:30:00', 0, 'EMAIL_VERIFICATION', '2024-05-12 08:30:00');
SET IDENTITY_INSERT EmailVerificationTokens OFF;

-- =====================================================
-- 47. ADDITIONAL DOCTOR AND PATIENT SAMPLE DATA
-- Adds 20 profile-ready users with the same ID convention as the base seed:
--   Doctors:  user-d11 to user-d20
--   Patients: user-p11 to user-p20
-- Text literals use N'...' so SQL Server stores Unicode data cleanly in NVARCHAR columns.
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM Users WHERE Id = N'user-d11')
BEGIN
    INSERT INTO Users (Id, UserName, Email, EmailConfirmed, PasswordHash, PhoneNumber, AccessFailedCount, CreatedDate, Status, LastLoginAt, RoleId) VALUES
    (N'user-d11', N'doctor11', N'doctor11@healthlink.com', 1, N'$2a$10$hashedpassword31', N'0901000011', 0, '2024-01-11', N'Active', '2024-05-11', N'doctor'),
    (N'user-d12', N'doctor12', N'doctor12@healthlink.com', 1, N'$2a$10$hashedpassword32', N'0901000012', 0, '2024-01-12', N'Active', '2024-05-12', N'doctor'),
    (N'user-d13', N'doctor13', N'doctor13@healthlink.com', 1, N'$2a$10$hashedpassword33', N'0901000013', 0, '2024-01-13', N'Active', '2024-05-13', N'doctor'),
    (N'user-d14', N'doctor14', N'doctor14@healthlink.com', 1, N'$2a$10$hashedpassword34', N'0901000014', 0, '2024-01-14', N'Active', '2024-05-14', N'doctor'),
    (N'user-d15', N'doctor15', N'doctor15@healthlink.com', 1, N'$2a$10$hashedpassword35', N'0901000015', 0, '2024-01-15', N'Active', '2024-05-15', N'doctor'),
    (N'user-d16', N'doctor16', N'doctor16@healthlink.com', 1, N'$2a$10$hashedpassword36', N'0901000016', 0, '2024-01-16', N'Active', '2024-05-16', N'doctor'),
    (N'user-d17', N'doctor17', N'doctor17@healthlink.com', 1, N'$2a$10$hashedpassword37', N'0901000017', 0, '2024-01-17', N'Active', '2024-05-17', N'doctor'),
    (N'user-d18', N'doctor18', N'doctor18@healthlink.com', 1, N'$2a$10$hashedpassword38', N'0901000018', 0, '2024-01-18', N'Active', '2024-05-18', N'doctor'),
    (N'user-d19', N'doctor19', N'doctor19@healthlink.com', 1, N'$2a$10$hashedpassword39', N'0901000019', 0, '2024-01-19', N'Active', '2024-05-19', N'doctor'),
    (N'user-d20', N'doctor20', N'doctor20@healthlink.com', 1, N'$2a$10$hashedpassword40', N'0901000020', 0, '2024-01-20', N'Active', '2024-05-20', N'doctor'),
    (N'user-p11', N'patient11', N'patient11@gmail.com', 1, N'$2a$10$hashedpassword41', N'0912000011', 0, '2024-02-11', N'Active', '2024-05-11', N'patient'),
    (N'user-p12', N'patient12', N'patient12@gmail.com', 1, N'$2a$10$hashedpassword42', N'0912000012', 0, '2024-02-12', N'Active', '2024-05-12', N'patient'),
    (N'user-p13', N'patient13', N'patient13@gmail.com', 1, N'$2a$10$hashedpassword43', N'0912000013', 0, '2024-02-13', N'Active', '2024-05-13', N'patient'),
    (N'user-p14', N'patient14', N'patient14@gmail.com', 1, N'$2a$10$hashedpassword44', N'0912000014', 0, '2024-02-14', N'Active', '2024-05-14', N'patient'),
    (N'user-p15', N'patient15', N'patient15@gmail.com', 1, N'$2a$10$hashedpassword45', N'0912000015', 0, '2024-02-15', N'Active', '2024-05-15', N'patient'),
    (N'user-p16', N'patient16', N'patient16@gmail.com', 1, N'$2a$10$hashedpassword46', N'0912000016', 0, '2024-02-16', N'Active', '2024-05-16', N'patient'),
    (N'user-p17', N'patient17', N'patient17@gmail.com', 1, N'$2a$10$hashedpassword47', N'0912000017', 0, '2024-02-17', N'Active', '2024-05-17', N'patient'),
    (N'user-p18', N'patient18', N'patient18@gmail.com', 1, N'$2a$10$hashedpassword48', N'0912000018', 0, '2024-02-18', N'Active', '2024-05-18', N'patient'),
    (N'user-p19', N'patient19', N'patient19@gmail.com', 1, N'$2a$10$hashedpassword49', N'0912000019', 0, '2024-02-19', N'Active', '2024-05-19', N'patient'),
    (N'user-p20', N'patient20', N'patient20@gmail.com', 1, N'$2a$10$hashedpassword50', N'0912000020', 0, '2024-02-20', N'Active', '2024-05-20', N'patient');

    INSERT INTO Doctors (DoctorID, FullName, qualifications, specialty, yearsOfExperience, languageSpoken, location, avatarUrl, bio, consultationFee, latitude, longitude, clinicName, clinicAddress, averageRating, totalReviews, verified, specialtyId, totalEarnings, pendingSettlement, paypalEmail, scheduleStatus, bankAccount, bankName, customCommissionRateOnline, customCommissionRateOffline, customCommissionRateOnlineEffectiveFrom, customCommissionRateOnlineEffectiveTo, customCommissionRateOfflineEffectiveFrom, customCommissionRateOfflineEffectiveTo, commissionTier) VALUES
    (N'user-d11', N'Dr. Nguyen Minh Anh', N'MD - University of Medicine and Pharmacy HCMC', N'Internal Medicine', 9, N'Vietnamese, English', N'Ho Chi Minh City', N'http://localhost:8096/uploads/avatars/doctors/bacsi_11.png', N'General internal medicine doctor focused on chronic disease follow-up', 130.00, 10.7769, 106.7009, N'Saigon Family Clinic', N'45 Nguyen Thi Minh Khai, District 1, Ho Chi Minh City', 4.72, 64, 1, 1, 260.00, 40.00, N'dr.nguyen.minhanh@healthlink.com', N'APPROVED', N'2234567890', N'Vietcombank', NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
    (N'user-d12', N'Dr. Tran Quoc Bao', N'MD - Hanoi Medical University', N'Pediatrics', 11, N'Vietnamese, English', N'Ha Noi', N'http://localhost:8096/uploads/avatars/doctors/bacsi_12.png', N'Pediatrician experienced in fever, allergy, and nutrition counseling', 125.00, 21.0278, 105.8342, N'Hoan Kiem Children Clinic', N'18 Trang Thi, Hoan Kiem, Ha Noi', 4.81, 92, 1, 3, 310.00, 55.00, N'dr.tran.quocbao@healthlink.com', N'APPROVED', N'2234567891', N'Techcombank', NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
    (N'user-d13', N'Dr. Le Hoang Phuc', N'MD, MSc - Hue University of Medicine', N'Cardiology', 16, N'Vietnamese, English', N'Da Nang', N'http://localhost:8096/uploads/avatars/doctors/bacsi_13.png', N'Cardiologist for hypertension, arrhythmia, and follow-up care', 210.00, 16.0471, 108.2068, N'Da Nang Heart Clinic', N'72 Nguyen Van Linh, Hai Chau, Da Nang', 4.86, 118, 1, 6, 480.00, 90.00, N'dr.le.hoangphuc@healthlink.com', N'APPROVED', N'2234567892', N'ACB', NULL, NULL, NULL, NULL, NULL, NULL, N'PREMIUM'),
    (N'user-d14', N'Dr. Pham Thu Ha', N'MD - University of Medicine Pham Ngoc Thach', N'Dermatology', 8, N'Vietnamese, English', N'Ho Chi Minh City', N'http://localhost:8096/uploads/avatars/doctors/bacsi_14.png', N'Dermatology doctor treating acne, dermatitis, and skin allergies', 115.00, 10.8015, 106.7148, N'Gia Dinh Skin Clinic', N'201 Phan Dang Luu, Binh Thanh, Ho Chi Minh City', 4.67, 73, 1, 5, 210.00, 35.00, N'dr.pham.thuha@healthlink.com', N'APPROVED', N'2234567893', N'MB Bank', NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
    (N'user-d15', N'Dr. Vo Gia Huy', N'MD, FACS - Cho Ray Hospital', N'Surgery', 13, N'Vietnamese, English', N'Ho Chi Minh City', N'http://localhost:8096/uploads/avatars/doctors/bacsi_15.png', N'General surgeon providing pre-op and post-op consultation', 185.00, 10.7553, 106.6606, N'Cho Ray Surgical Clinic', N'201B Nguyen Chi Thanh, District 5, Ho Chi Minh City', 4.79, 88, 1, 2, 390.00, 65.00, N'dr.vo.giahuy@healthlink.com', N'APPROVED', N'2234567894', N'BIDV', NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
    (N'user-d16', N'Dr. Bui Lan Chi', N'MD, FACOG - Tu Du Hospital', N'Obstetrics & Gynecology', 10, N'Vietnamese, English', N'Ho Chi Minh City', N'http://localhost:8096/uploads/avatars/doctors/bacsi_16.png', N'Women health doctor for prenatal care and gynecology counseling', 150.00, 10.7680, 106.6834, N'Tu Du Women Clinic', N'284 Cong Quynh, District 1, Ho Chi Minh City', 4.91, 141, 1, 4, 430.00, 80.00, N'dr.bui.lanchi@healthlink.com', N'APPROVED', N'2234567895', N'VietinBank', NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
    (N'user-d17', N'Dr. Dang Viet Khoa', N'MD, PhD - Bach Mai Hospital', N'Neurology', 18, N'Vietnamese, English, French', N'Ha Noi', N'http://localhost:8096/uploads/avatars/doctors/bacsi_17.png', N'Neurologist for headache, stroke follow-up, and nerve disorders', 225.00, 21.0002, 105.8412, N'Bach Mai Neurology Center', N'78 Giai Phong, Dong Da, Ha Noi', 4.84, 106, 1, 7, 520.00, 120.00, N'dr.dang.vietkhoa@healthlink.com', N'APPROVED', N'2234567896', N'Agribank', NULL, NULL, NULL, NULL, NULL, NULL, N'PREMIUM'),
    (N'user-d18', N'Dr. Ho Thi Ngoc', N'MD - National Eye Hospital', N'Ophthalmology', 12, N'Vietnamese, English', N'Ha Noi', N'http://localhost:8096/uploads/avatars/doctors/bacsi_18.png', N'Ophthalmologist for eye exams, dry eyes, and vision screening', 155.00, 21.0227, 105.8461, N'Central Eye Clinic', N'85 Ba Trieu, Hai Ba Trung, Ha Noi', 4.76, 83, 1, 8, 300.00, 50.00, N'dr.ho.thingoc@healthlink.com', N'APPROVED', N'2234567897', N'Sacombank', NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
    (N'user-d19', N'Dr. Ngo Thanh Son', N'MD - Thai Binh University of Medicine', N'ENT', 7, N'Vietnamese, English', N'Can Tho', N'http://localhost:8096/uploads/avatars/doctors/bacsi_19.png', N'ENT doctor treating sinusitis, throat infection, and hearing concerns', 105.00, 10.0452, 105.7469, N'Can Tho ENT Clinic', N'16 Hoa Binh Avenue, Ninh Kieu, Can Tho', 4.58, 59, 1, 9, 180.00, 25.00, N'dr.ngo.thanhson@healthlink.com', N'APPROVED', N'2234567898', N'OCB', NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
    (N'user-d20', N'Dr. Do Mai Linh', N'DDS - Ho Chi Minh City Odonto-Stomatology University', N'Dentistry', 9, N'Vietnamese, English', N'Ho Chi Minh City', N'http://localhost:8096/uploads/avatars/doctors/bacsi_20.png', N'Dentist focused on preventive care, scaling, and cosmetic dentistry', 95.00, 10.7901, 106.6802, N'SmileCare Dental', N'90 Nguyen Dinh Chieu, District 3, Ho Chi Minh City', 4.88, 124, 1, 10, 240.00, 45.00, N'dr.do.mailinh@healthlink.com', N'APPROVED', N'2234567899', N'VPBank', NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD');

    INSERT INTO DoctorServices (doctor_id, service_type, available) VALUES
    (N'user-d11', N'ONLINE', 1), (N'user-d11', N'HOME_VISIT', 1),
    (N'user-d12', N'ONLINE', 1), (N'user-d12', N'HOME_VISIT', 1),
    (N'user-d13', N'ONLINE', 1), (N'user-d13', N'HOME_VISIT', 1),
    (N'user-d14', N'ONLINE', 1), (N'user-d14', N'HOME_VISIT', 1),
    (N'user-d15', N'ONLINE', 1), (N'user-d15', N'HOME_VISIT', 1),
    (N'user-d16', N'ONLINE', 1), (N'user-d16', N'HOME_VISIT', 1),
    (N'user-d17', N'ONLINE', 1), (N'user-d17', N'HOME_VISIT', 1),
    (N'user-d18', N'ONLINE', 1), (N'user-d18', N'HOME_VISIT', 1),
    (N'user-d19', N'ONLINE', 1), (N'user-d19', N'HOME_VISIT', 1),
    (N'user-d20', N'ONLINE', 1), (N'user-d20', N'HOME_VISIT', 1);

    INSERT INTO Patients (PatientID, FullName, dateOfBirth, medicalHistorySummary, insuranceProvider, insurancePolicyNumber, gender, address, city, country, bloodType, emergencyContactName, emergencyContactPhone, emergencyContactRelationship, preferredLanguage, preferredContactMethod, occupation, avatarUrl, latitude, longitude, allergies, chronicConditions, currentMedications, heightCm, weightKg) VALUES
    (N'user-p11', N'Nguyen Thanh Lam', '1991-04-12', N'Seasonal allergy history', N'Bao Viet', N'BV-2024-011', N'Male', N'25 Ly Tu Trong, District 1', N'Ho Chi Minh City', N'Vietnam', N'O+', N'Nguyen Minh Chau', N'0912345681', N'Wife', N'Vietnamese', N'Phone', N'Product Manager', N'http://localhost:8096/uploads/avatars/patients/benhnhan_11.png', 10.7799, 106.7019, N'Pollen', NULL, NULL, 172, 68),
    (N'user-p12', N'Tran Mai Phuong', '1987-09-03', N'History of migraine', N'PVI', N'PVI-2024-012', N'Female', N'118 Nguyen Trai, Thanh Xuan', N'Ha Noi', N'Vietnam', N'A+', N'Tran Van Duc', N'0912345682', N'Father', N'Vietnamese', N'Email', N'Accountant', N'http://localhost:8096/uploads/avatars/patients/benhnhan_12.png', 21.0024, 105.8066, NULL, N'Migraine', N'Paracetamol 500mg as needed', 160, 52),
    (N'user-p13', N'Le Minh Quan', '1979-11-21', N'Hypertension under control', N'Blue Cross', N'BC-2024-013', N'Male', N'9 Bach Dang Street', N'Da Nang', N'Vietnam', N'B+', N'Le Thu Trang', N'0912345683', N'Wife', N'Vietnamese', N'Phone', N'Hotel Manager', N'http://localhost:8096/uploads/avatars/patients/benhnhan_13.png', 16.0678, 108.2208, NULL, N'Hypertension', N'Amlodipine 5mg', 176, 76),
    (N'user-p14', N'Pham Ngoc Han', '1996-02-18', N'No significant medical history', N'Aetna', N'AET-2024-014', N'Female', N'42 Nguyen Van Cu, Ninh Kieu', N'Can Tho', N'Vietnam', N'AB+', N'Pham Thi Hoa', N'0912345684', N'Mother', N'Vietnamese', N'Text', N'Graduate Student', N'http://localhost:8096/uploads/avatars/patients/benhnhan_14.png', 10.0359, 105.7805, N'Shellfish', NULL, NULL, 158, 50),
    (N'user-p15', N'Vo Duc Anh', '1983-06-30', N'Gastritis follow-up', N'Cigna', N'CIG-2024-015', N'Male', N'77 Dien Bien Phu, Binh Thanh', N'Ho Chi Minh City', N'Vietnam', N'A-', N'Vo Kim Ngan', N'0912345685', N'Sister', N'Vietnamese', N'Phone', N'Architect', N'http://localhost:8096/uploads/avatars/patients/benhnhan_15.png', 10.8010, 106.7138, NULL, N'Chronic gastritis', N'Omeprazole 20mg', 174, 70),
    (N'user-p16', N'Bui Thuy Linh', '1993-12-09', N'Childhood asthma, stable', N'Humana', N'HUM-2024-016', N'Female', N'31 Nguyen Hue Street', N'Ho Chi Minh City', N'Vietnam', N'B-', N'Bui Quang Hieu', N'0912345686', N'Brother', N'Vietnamese', N'Email', N'Marketing Specialist', N'http://localhost:8096/uploads/avatars/patients/benhnhan_16.png', 10.7747, 106.7043, N'Dust', N'Asthma', N'Salbutamol inhaler', 162, 54),
    (N'user-p17', N'Dang Quoc Viet', '1972-08-14', N'Type 2 diabetes monitoring', N'Medicare', N'MED-2024-017', N'Male', N'5 Tran Hung Dao, Hoan Kiem', N'Ha Noi', N'Vietnam', N'O-', N'Dang Thi Kim', N'0912345687', N'Wife', N'Vietnamese', N'Phone', N'Business Owner', N'http://localhost:8096/uploads/avatars/patients/benhnhan_17.png', 21.0288, 105.8520, NULL, N'Type 2 diabetes', N'Metformin 500mg', 170, 73),
    (N'user-p18', N'Ho Bao Ngoc', '1989-01-27', N'No significant medical history', N'Anthem', N'ANT-2024-018', N'Female', N'63 Le Duan Street', N'Da Nang', N'Vietnam', N'A+', N'Ho Van Thanh', N'0912345688', N'Father', N'Vietnamese', N'Text', N'Nurse', N'http://localhost:8096/uploads/avatars/patients/benhnhan_18.png', 16.0605, 108.2244, NULL, NULL, NULL, 166, 57),
    (N'user-p19', N'Ngo Anh Tuan', '1999-07-19', N'Chronic sinusitis', N'Tricare', N'TRI-2024-019', N'Male', N'12 Nguyen Van Linh, Hai Chau', N'Da Nang', N'Vietnam', N'B+', N'Ngo Thi Loan', N'0912345689', N'Mother', N'Vietnamese', N'Phone', N'Software Developer', N'http://localhost:8096/uploads/avatars/patients/benhnhan_19.png', 16.0544, 108.2022, N'Aspirin', N'Sinusitis', NULL, 181, 74),
    (N'user-p20', N'Do Khanh Vy', '1976-05-05', N'Osteoarthritis follow-up', N'BCBS', N'BCBS-2024-020', N'Female', N'29 Cach Mang Thang 8, District 3', N'Ho Chi Minh City', N'Vietnam', N'AB-', N'Do Minh Duc', N'0912345690', N'Husband', N'Vietnamese', N'Phone', N'Office Administrator', N'http://localhost:8096/uploads/avatars/patients/benhnhan_20.png', 10.7812, 106.6826, NULL, N'Osteoarthritis', N'Glucosamine', 159, 61);

    PRINT N'Additional doctor and patient sample data seeded.';
END
GO

-- =====================================================
-- 48-51. ANALYTICS / CHARTS SEED DATA (2024)
-- Adds fake-but-consistent data so Admin System Dashboard (4 charts)
-- and Financial Reports chart show a full 2024 dataset.
--   Analytics patients : user-pa001 .. user-pa090 (non-login, spread Created across 2024)
--   Analytics appts     : AppointmentID 1000+ (Completed/Cancelled, spread over months/weeks)
--   Reviews fixed        : remove invalid duplicates, every completed appt reviewed once
--   Doctor schedules     : rebuilt as valid weekly schedules (new flow)
-- Idempotent: safe to re-run. Text uses N'...' for Unicode.
-- =====================================================

-- Cleanup so this block can be re-run without duplicates
DELETE FROM Reviews WHERE ReviewID >= 11;
DELETE FROM Reviews WHERE ReviewID BETWEEN 6 AND 10;
DELETE FROM AppointmentHomeVisitServices WHERE AppointmentID >= 1000;
DELETE FROM HomeVisitDetails WHERE AppointmentID >= 1000;
DELETE FROM Consultations WHERE AppointmentId >= 1000;
DELETE FROM Appointments WHERE AppointmentID >= 1000;
DELETE FROM Patients WHERE PatientID LIKE 'user-pa[0-9][0-9][0-9]';
DELETE FROM Users WHERE Id LIKE 'user-pa[0-9][0-9][0-9]';
GO

-- 48. ANALYTICS PATIENTS (90 users, registrations spread across 2024)
INSERT INTO Users (Id, UserName, Email, EmailConfirmed, PasswordHash, PhoneNumber, AccessFailedCount, CreatedDate, Status, LastLoginAt, RoleId) VALUES
(N'user-pa001', N'patient_a001', N'patient.a001@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000001', 0, '2024-01-01 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa002', N'patient_a002', N'patient.a002@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000002', 0, '2024-01-04 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa003', N'patient_a003', N'patient.a003@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000003', 0, '2024-01-07 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa004', N'patient_a004', N'patient.a004@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000004', 0, '2024-01-10 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa005', N'patient_a005', N'patient.a005@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000005', 0, '2024-01-13 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa006', N'patient_a006', N'patient.a006@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000006', 0, '2024-02-01 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa007', N'patient_a007', N'patient.a007@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000007', 0, '2024-02-04 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa008', N'patient_a008', N'patient.a008@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000008', 0, '2024-02-07 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa009', N'patient_a009', N'patient.a009@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000009', 0, '2024-02-10 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa010', N'patient_a010', N'patient.a010@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000010', 0, '2024-02-13 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa011', N'patient_a011', N'patient.a011@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000011', 0, '2024-02-16 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa012', N'patient_a012', N'patient.a012@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000012', 0, '2024-02-19 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa013', N'patient_a013', N'patient.a013@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000013', 0, '2024-03-01 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa014', N'patient_a014', N'patient.a014@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000014', 0, '2024-03-04 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa015', N'patient_a015', N'patient.a015@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000015', 0, '2024-03-07 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa016', N'patient_a016', N'patient.a016@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000016', 0, '2024-03-10 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa017', N'patient_a017', N'patient.a017@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000017', 0, '2024-03-13 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa018', N'patient_a018', N'patient.a018@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000018', 0, '2024-03-16 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa019', N'patient_a019', N'patient.a019@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000019', 0, '2024-04-01 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa020', N'patient_a020', N'patient.a020@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000020', 0, '2024-04-04 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa021', N'patient_a021', N'patient.a021@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000021', 0, '2024-04-07 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa022', N'patient_a022', N'patient.a022@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000022', 0, '2024-04-10 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa023', N'patient_a023', N'patient.a023@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000023', 0, '2024-04-13 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa024', N'patient_a024', N'patient.a024@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000024', 0, '2024-04-16 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa025', N'patient_a025', N'patient.a025@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000025', 0, '2024-04-19 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa026', N'patient_a026', N'patient.a026@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000026', 0, '2024-04-22 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa027', N'patient_a027', N'patient.a027@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000027', 0, '2024-05-01 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa028', N'patient_a028', N'patient.a028@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000028', 0, '2024-05-04 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa029', N'patient_a029', N'patient.a029@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000029', 0, '2024-05-07 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa030', N'patient_a030', N'patient.a030@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000030', 0, '2024-05-10 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa031', N'patient_a031', N'patient.a031@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000031', 0, '2024-05-13 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa032', N'patient_a032', N'patient.a032@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000032', 0, '2024-05-16 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa033', N'patient_a033', N'patient.a033@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000033', 0, '2024-05-19 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa034', N'patient_a034', N'patient.a034@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000034', 0, '2024-05-22 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa035', N'patient_a035', N'patient.a035@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000035', 0, '2024-05-25 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa036', N'patient_a036', N'patient.a036@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000036', 0, '2024-06-01 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa037', N'patient_a037', N'patient.a037@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000037', 0, '2024-06-04 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa038', N'patient_a038', N'patient.a038@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000038', 0, '2024-06-07 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa039', N'patient_a039', N'patient.a039@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000039', 0, '2024-06-10 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa040', N'patient_a040', N'patient.a040@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000040', 0, '2024-06-13 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa041', N'patient_a041', N'patient.a041@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000041', 0, '2024-06-16 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa042', N'patient_a042', N'patient.a042@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000042', 0, '2024-06-19 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa043', N'patient_a043', N'patient.a043@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000043', 0, '2024-07-01 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa044', N'patient_a044', N'patient.a044@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000044', 0, '2024-07-04 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa045', N'patient_a045', N'patient.a045@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000045', 0, '2024-07-07 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa046', N'patient_a046', N'patient.a046@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000046', 0, '2024-07-10 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa047', N'patient_a047', N'patient.a047@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000047', 0, '2024-07-13 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa048', N'patient_a048', N'patient.a048@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000048', 0, '2024-07-16 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa049', N'patient_a049', N'patient.a049@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000049', 0, '2024-07-19 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa050', N'patient_a050', N'patient.a050@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000050', 0, '2024-07-22 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa051', N'patient_a051', N'patient.a051@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000051', 0, '2024-08-01 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa052', N'patient_a052', N'patient.a052@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000052', 0, '2024-08-04 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa053', N'patient_a053', N'patient.a053@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000053', 0, '2024-08-07 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa054', N'patient_a054', N'patient.a054@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000054', 0, '2024-08-10 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa055', N'patient_a055', N'patient.a055@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000055', 0, '2024-08-13 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa056', N'patient_a056', N'patient.a056@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000056', 0, '2024-08-16 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa057', N'patient_a057', N'patient.a057@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000057', 0, '2024-08-19 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa058', N'patient_a058', N'patient.a058@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000058', 0, '2024-08-22 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa059', N'patient_a059', N'patient.a059@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000059', 0, '2024-08-25 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa060', N'patient_a060', N'patient.a060@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000060', 0, '2024-08-02 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa061', N'patient_a061', N'patient.a061@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000061', 0, '2024-09-01 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa062', N'patient_a062', N'patient.a062@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000062', 0, '2024-09-04 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa063', N'patient_a063', N'patient.a063@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000063', 0, '2024-09-07 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa064', N'patient_a064', N'patient.a064@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000064', 0, '2024-09-10 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa065', N'patient_a065', N'patient.a065@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000065', 0, '2024-09-13 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa066', N'patient_a066', N'patient.a066@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000066', 0, '2024-09-16 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa067', N'patient_a067', N'patient.a067@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000067', 0, '2024-09-19 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa068', N'patient_a068', N'patient.a068@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000068', 0, '2024-09-22 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa069', N'patient_a069', N'patient.a069@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000069', 0, '2024-10-01 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa070', N'patient_a070', N'patient.a070@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000070', 0, '2024-10-04 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa071', N'patient_a071', N'patient.a071@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000071', 0, '2024-10-07 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa072', N'patient_a072', N'patient.a072@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000072', 0, '2024-10-10 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa073', N'patient_a073', N'patient.a073@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000073', 0, '2024-10-13 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa074', N'patient_a074', N'patient.a074@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000074', 0, '2024-10-16 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa075', N'patient_a075', N'patient.a075@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000075', 0, '2024-10-19 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa076', N'patient_a076', N'patient.a076@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000076', 0, '2024-10-22 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa077', N'patient_a077', N'patient.a077@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000077', 0, '2024-10-25 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa078', N'patient_a078', N'patient.a078@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000078', 0, '2024-11-01 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa079', N'patient_a079', N'patient.a079@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000079', 0, '2024-11-04 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa080', N'patient_a080', N'patient.a080@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000080', 0, '2024-11-07 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa081', N'patient_a081', N'patient.a081@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000081', 0, '2024-11-10 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa082', N'patient_a082', N'patient.a082@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000082', 0, '2024-11-13 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa083', N'patient_a083', N'patient.a083@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000083', 0, '2024-11-16 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa084', N'patient_a084', N'patient.a084@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000084', 0, '2024-11-19 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa085', N'patient_a085', N'patient.a085@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000085', 0, '2024-12-01 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa086', N'patient_a086', N'patient.a086@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000086', 0, '2024-12-04 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa087', N'patient_a087', N'patient.a087@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000087', 0, '2024-12-07 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa088', N'patient_a088', N'patient.a088@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000088', 0, '2024-12-10 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa089', N'patient_a089', N'patient.a089@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000089', 0, '2024-12-13 09:00:00', N'Active', NULL, N'patient'),
(N'user-pa090', N'patient_a090', N'patient.a090@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0930000090', 0, '2024-12-16 09:00:00', N'Active', NULL, N'patient');

INSERT INTO Patients (PatientID, FullName, dateOfBirth, gender, city, country, preferredLanguage) VALUES
(N'user-pa001', N'Nguyen Van An', '1965-01-01', N'Male', N'Ho Chi Minh City', N'Vietnam', N'Vietnamese'),
(N'user-pa002', N'Tran Quoc Ha', '1966-02-02', N'Female', N'Ha Noi', N'Vietnam', N'Vietnamese'),
(N'user-pa003', N'Le Hoang Phong', '1967-03-03', N'Male', N'Da Nang', N'Vietnam', N'Vietnamese'),
(N'user-pa004', N'Pham Hai Yen', '1968-04-04', N'Female', N'Can Tho', N'Vietnam', N'Vietnamese'),
(N'user-pa005', N'Hoang Kim Chi', '1969-05-05', N'Male', N'Hai Phong', N'Vietnam', N'Vietnamese'),
(N'user-pa006', N'Vo Huu Khanh', '1970-06-06', N'Female', N'Bien Hoa', N'Vietnam', N'Vietnamese'),
(N'user-pa007', N'Dang Dinh Quynh', '1971-07-07', N'Male', N'Nha Trang', N'Vietnam', N'Vietnamese'),
(N'user-pa008', N'Bui Thi Linh', '1972-08-08', N'Female', N'Hue', N'Vietnam', N'Vietnamese'),
(N'user-pa009', N'Do Gia Em', '1973-09-09', N'Male', N'Vung Tau', N'Vietnam', N'Vietnamese'),
(N'user-pa010', N'Ho Ngoc Mai', '1974-10-10', N'Female', N'Buon Ma Thuot', N'Vietnam', N'Vietnamese'),
(N'user-pa011', N'Ngo Anh Tam', '1975-11-11', N'Male', N'Ho Chi Minh City', N'Vietnam', N'Vietnamese'),
(N'user-pa012', N'Duong Phuong Trang', '1976-12-12', N'Female', N'Ha Noi', N'Vietnam', N'Vietnamese'),
(N'user-pa013', N'Ly Xuan Giang', '1977-01-13', N'Male', N'Da Nang', N'Vietnam', N'Vietnamese'),
(N'user-pa014', N'Phan Cong Oanh', '1978-02-14', N'Female', N'Can Tho', N'Vietnam', N'Vietnamese'),
(N'user-pa015', N'Vu Minh Vy', '1979-03-15', N'Male', N'Hai Phong', N'Vietnam', N'Vietnamese'),
(N'user-pa016', N'Dinh Thanh Binh', '1980-04-16', N'Female', N'Bien Hoa', N'Vietnam', N'Vietnamese'),
(N'user-pa017', N'Truong Bao Hung', '1981-05-17', N'Male', N'Nha Trang', N'Vietnam', N'Vietnamese'),
(N'user-pa018', N'Mai Duc Quan', '1982-06-18', N'Female', N'Hue', N'Vietnam', N'Vietnamese'),
(N'user-pa019', N'Chu Tuan Long', '1983-07-19', N'Male', N'Vung Tau', N'Vietnam', N'Vietnamese'),
(N'user-pa020', N'Ta Thu Dung', '1984-08-20', N'Female', N'Buon Ma Thuot', N'Vietnam', N'Vietnamese'),
(N'user-pa021', N'Nguyen Van Lan', '1985-09-21', N'Male', N'Ho Chi Minh City', N'Vietnam', N'Vietnamese'),
(N'user-pa022', N'Tran Quoc Son', '1986-10-22', N'Female', N'Ha Noi', N'Vietnam', N'Vietnamese'),
(N'user-pa023', N'Le Hoang Tien', '1987-11-23', N'Male', N'Da Nang', N'Vietnam', N'Vietnamese'),
(N'user-pa024', N'Pham Hai Phuc', '1988-12-24', N'Female', N'Can Tho', N'Vietnam', N'Vietnamese'),
(N'user-pa025', N'Hoang Kim Nam', '1989-01-25', N'Male', N'Hai Phong', N'Vietnam', N'Vietnamese'),
(N'user-pa026', N'Vo Huu Uyen', '1990-02-26', N'Female', N'Bien Hoa', N'Vietnam', N'Vietnamese'),
(N'user-pa027', N'Dang Dinh An', '1991-03-27', N'Male', N'Nha Trang', N'Vietnam', N'Vietnamese'),
(N'user-pa028', N'Bui Thi Ha', '1992-04-01', N'Female', N'Hue', N'Vietnam', N'Vietnamese'),
(N'user-pa029', N'Do Gia Phong', '1993-05-02', N'Male', N'Vung Tau', N'Vietnam', N'Vietnamese'),
(N'user-pa030', N'Ho Ngoc Yen', '1994-06-03', N'Female', N'Buon Ma Thuot', N'Vietnam', N'Vietnamese'),
(N'user-pa031', N'Ngo Anh Chi', '1995-07-04', N'Male', N'Ho Chi Minh City', N'Vietnam', N'Vietnamese'),
(N'user-pa032', N'Duong Phuong Khanh', '1996-08-05', N'Female', N'Ha Noi', N'Vietnam', N'Vietnamese'),
(N'user-pa033', N'Ly Xuan Quynh', '1997-09-06', N'Male', N'Da Nang', N'Vietnam', N'Vietnamese'),
(N'user-pa034', N'Phan Cong Linh', '1998-10-07', N'Female', N'Can Tho', N'Vietnam', N'Vietnamese'),
(N'user-pa035', N'Vu Minh Em', '1999-11-08', N'Male', N'Hai Phong', N'Vietnam', N'Vietnamese'),
(N'user-pa036', N'Dinh Thanh Mai', '2000-12-09', N'Female', N'Bien Hoa', N'Vietnam', N'Vietnamese'),
(N'user-pa037', N'Truong Bao Tam', '2001-01-10', N'Male', N'Nha Trang', N'Vietnam', N'Vietnamese'),
(N'user-pa038', N'Mai Duc Trang', '2002-02-11', N'Female', N'Hue', N'Vietnam', N'Vietnamese'),
(N'user-pa039', N'Chu Tuan Giang', '2003-03-12', N'Male', N'Vung Tau', N'Vietnam', N'Vietnamese'),
(N'user-pa040', N'Ta Thu Oanh', '2004-04-13', N'Female', N'Buon Ma Thuot', N'Vietnam', N'Vietnamese'),
(N'user-pa041', N'Nguyen Van Vy', '1965-05-14', N'Male', N'Ho Chi Minh City', N'Vietnam', N'Vietnamese'),
(N'user-pa042', N'Tran Quoc Binh', '1966-06-15', N'Female', N'Ha Noi', N'Vietnam', N'Vietnamese'),
(N'user-pa043', N'Le Hoang Hung', '1967-07-16', N'Male', N'Da Nang', N'Vietnam', N'Vietnamese'),
(N'user-pa044', N'Pham Hai Quan', '1968-08-17', N'Female', N'Can Tho', N'Vietnam', N'Vietnamese'),
(N'user-pa045', N'Hoang Kim Long', '1969-09-18', N'Male', N'Hai Phong', N'Vietnam', N'Vietnamese'),
(N'user-pa046', N'Vo Huu Dung', '1970-10-19', N'Female', N'Bien Hoa', N'Vietnam', N'Vietnamese'),
(N'user-pa047', N'Dang Dinh Lan', '1971-11-20', N'Male', N'Nha Trang', N'Vietnam', N'Vietnamese'),
(N'user-pa048', N'Bui Thi Son', '1972-12-21', N'Female', N'Hue', N'Vietnam', N'Vietnamese'),
(N'user-pa049', N'Do Gia Tien', '1973-01-22', N'Male', N'Vung Tau', N'Vietnam', N'Vietnamese'),
(N'user-pa050', N'Ho Ngoc Phuc', '1974-02-23', N'Female', N'Buon Ma Thuot', N'Vietnam', N'Vietnamese'),
(N'user-pa051', N'Ngo Anh Nam', '1975-03-24', N'Male', N'Ho Chi Minh City', N'Vietnam', N'Vietnamese'),
(N'user-pa052', N'Duong Phuong Uyen', '1976-04-25', N'Female', N'Ha Noi', N'Vietnam', N'Vietnamese'),
(N'user-pa053', N'Ly Xuan An', '1977-05-26', N'Male', N'Da Nang', N'Vietnam', N'Vietnamese'),
(N'user-pa054', N'Phan Cong Ha', '1978-06-27', N'Female', N'Can Tho', N'Vietnam', N'Vietnamese'),
(N'user-pa055', N'Vu Minh Phong', '1979-07-01', N'Male', N'Hai Phong', N'Vietnam', N'Vietnamese'),
(N'user-pa056', N'Dinh Thanh Yen', '1980-08-02', N'Female', N'Bien Hoa', N'Vietnam', N'Vietnamese'),
(N'user-pa057', N'Truong Bao Chi', '1981-09-03', N'Male', N'Nha Trang', N'Vietnam', N'Vietnamese'),
(N'user-pa058', N'Mai Duc Khanh', '1982-10-04', N'Female', N'Hue', N'Vietnam', N'Vietnamese'),
(N'user-pa059', N'Chu Tuan Quynh', '1983-11-05', N'Male', N'Vung Tau', N'Vietnam', N'Vietnamese'),
(N'user-pa060', N'Ta Thu Linh', '1984-12-06', N'Female', N'Buon Ma Thuot', N'Vietnam', N'Vietnamese'),
(N'user-pa061', N'Nguyen Van Em', '1985-01-07', N'Male', N'Ho Chi Minh City', N'Vietnam', N'Vietnamese'),
(N'user-pa062', N'Tran Quoc Mai', '1986-02-08', N'Female', N'Ha Noi', N'Vietnam', N'Vietnamese'),
(N'user-pa063', N'Le Hoang Tam', '1987-03-09', N'Male', N'Da Nang', N'Vietnam', N'Vietnamese'),
(N'user-pa064', N'Pham Hai Trang', '1988-04-10', N'Female', N'Can Tho', N'Vietnam', N'Vietnamese'),
(N'user-pa065', N'Hoang Kim Giang', '1989-05-11', N'Male', N'Hai Phong', N'Vietnam', N'Vietnamese'),
(N'user-pa066', N'Vo Huu Oanh', '1990-06-12', N'Female', N'Bien Hoa', N'Vietnam', N'Vietnamese'),
(N'user-pa067', N'Dang Dinh Vy', '1991-07-13', N'Male', N'Nha Trang', N'Vietnam', N'Vietnamese'),
(N'user-pa068', N'Bui Thi Binh', '1992-08-14', N'Female', N'Hue', N'Vietnam', N'Vietnamese'),
(N'user-pa069', N'Do Gia Hung', '1993-09-15', N'Male', N'Vung Tau', N'Vietnam', N'Vietnamese'),
(N'user-pa070', N'Ho Ngoc Quan', '1994-10-16', N'Female', N'Buon Ma Thuot', N'Vietnam', N'Vietnamese'),
(N'user-pa071', N'Ngo Anh Long', '1995-11-17', N'Male', N'Ho Chi Minh City', N'Vietnam', N'Vietnamese'),
(N'user-pa072', N'Duong Phuong Dung', '1996-12-18', N'Female', N'Ha Noi', N'Vietnam', N'Vietnamese'),
(N'user-pa073', N'Ly Xuan Lan', '1997-01-19', N'Male', N'Da Nang', N'Vietnam', N'Vietnamese'),
(N'user-pa074', N'Phan Cong Son', '1998-02-20', N'Female', N'Can Tho', N'Vietnam', N'Vietnamese'),
(N'user-pa075', N'Vu Minh Tien', '1999-03-21', N'Male', N'Hai Phong', N'Vietnam', N'Vietnamese'),
(N'user-pa076', N'Dinh Thanh Phuc', '2000-04-22', N'Female', N'Bien Hoa', N'Vietnam', N'Vietnamese'),
(N'user-pa077', N'Truong Bao Nam', '2001-05-23', N'Male', N'Nha Trang', N'Vietnam', N'Vietnamese'),
(N'user-pa078', N'Mai Duc Uyen', '2002-06-24', N'Female', N'Hue', N'Vietnam', N'Vietnamese'),
(N'user-pa079', N'Chu Tuan An', '2003-07-25', N'Male', N'Vung Tau', N'Vietnam', N'Vietnamese'),
(N'user-pa080', N'Ta Thu Ha', '2004-08-26', N'Female', N'Buon Ma Thuot', N'Vietnam', N'Vietnamese'),
(N'user-pa081', N'Nguyen Van Phong', '1965-09-27', N'Male', N'Ho Chi Minh City', N'Vietnam', N'Vietnamese'),
(N'user-pa082', N'Tran Quoc Yen', '1966-10-01', N'Female', N'Ha Noi', N'Vietnam', N'Vietnamese'),
(N'user-pa083', N'Le Hoang Chi', '1967-11-02', N'Male', N'Da Nang', N'Vietnam', N'Vietnamese'),
(N'user-pa084', N'Pham Hai Khanh', '1968-12-03', N'Female', N'Can Tho', N'Vietnam', N'Vietnamese'),
(N'user-pa085', N'Hoang Kim Quynh', '1969-01-04', N'Male', N'Hai Phong', N'Vietnam', N'Vietnamese'),
(N'user-pa086', N'Vo Huu Linh', '1970-02-05', N'Female', N'Bien Hoa', N'Vietnam', N'Vietnamese'),
(N'user-pa087', N'Dang Dinh Em', '1971-03-06', N'Male', N'Nha Trang', N'Vietnam', N'Vietnamese'),
(N'user-pa088', N'Bui Thi Mai', '1972-04-07', N'Female', N'Hue', N'Vietnam', N'Vietnamese'),
(N'user-pa089', N'Do Gia Tam', '1973-05-08', N'Male', N'Vung Tau', N'Vietnam', N'Vietnamese'),
(N'user-pa090', N'Ho Ngoc Trang', '1974-06-09', N'Female', N'Buon Ma Thuot', N'Vietnam', N'Vietnamese');
GO

-- 49. ANALYTICS APPOINTMENTS (Completed + some Cancelled, spread over 2024)
SET IDENTITY_INSERT Appointments ON;
INSERT INTO Appointments (AppointmentID, AppointmentTime, ConsultationType, Status, symptoms, notes, fee, endTime, doctorReminderSent, reminderSent, confirmedAt, PatientID, DoctorID) VALUES
(1000, '2024-01-05 09:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 110.00, '2024-01-05 09:30:00', 0, 1, '2024-01-04 18:00:00', N'user-pa002', N'user-d02'),
(1001, '2024-01-09 10:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 120.00, '2024-01-09 10:30:00', 0, 1, '2024-01-08 18:00:00', N'user-pa003', N'user-d03'),
(1002, '2024-01-12 13:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 140.00, '2024-01-12 13:30:00', 0, 1, '2024-01-11 18:00:00', N'user-pa004', N'user-d04'),
(1003, '2024-01-16 14:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 150.00, '2024-01-16 14:30:00', 0, 1, '2024-01-15 18:00:00', N'user-pa005', N'user-d05'),
(1004, '2024-01-19 15:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 160.00, '2024-01-19 15:30:00', 0, 1, '2024-01-18 18:00:00', N'user-pa001', N'user-d06'),
(1005, '2024-01-23 16:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 180.00, '2024-01-23 16:30:00', 0, 1, '2024-01-22 18:00:00', N'user-pa002', N'user-d07'),
(1006, '2024-01-26 11:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 210.00, '2024-01-26 11:30:00', 0, 1, '2024-01-25 18:00:00', N'user-pa003', N'user-d08'),
(1007, '2024-01-28 17:00:00', N'Online', N'Cancelled', N'Allergy consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-01-27 18:00:00', N'user-pa004', N'user-d09'),
(1008, '2024-01-30 08:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 250.00, '2024-01-30 08:30:00', 0, 1, '2024-01-29 18:00:00', N'user-pa005', N'user-d10'),
(1009, '2024-01-02 09:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 130.00, '2024-01-02 09:30:00', 0, 1, '2024-01-01 18:00:00', N'user-pa001', N'user-d11'),
(1010, '2024-01-07 10:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 100.00, '2024-01-07 10:30:00', 0, 1, '2024-01-06 18:00:00', N'user-pa002', N'user-d12'),
(1011, '2024-01-14 13:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 185.00, '2024-01-14 13:30:00', 0, 1, '2024-01-13 18:00:00', N'user-pa003', N'user-d13'),
(1012, '2024-02-21 14:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 155.00, '2024-02-21 14:30:00', 0, 1, '2024-02-20 18:00:00', N'user-pa002', N'user-d14'),
(1013, '2024-02-24 15:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 95.00, '2024-02-24 15:30:00', 0, 1, '2024-02-23 18:00:00', N'user-pa003', N'user-d15'),
(1014, '2024-02-03 16:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 90.00, '2024-02-03 16:30:00', 0, 1, '2024-02-02 18:00:00', N'user-pa004', N'user-d16'),
(1015, '2024-02-05 11:00:00', N'Online', N'Cancelled', N'Stomach discomfort', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-02-04 18:00:00', N'user-pa005', N'user-d17'),
(1016, '2024-02-09 17:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 120.00, '2024-02-09 17:30:00', 0, 1, '2024-02-08 18:00:00', N'user-pa006', N'user-d18'),
(1017, '2024-02-12 08:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 140.00, '2024-02-12 08:30:00', 0, 1, '2024-02-11 18:00:00', N'user-pa007', N'user-d19'),
(1018, '2024-02-16 09:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 150.00, '2024-02-16 09:30:00', 0, 1, '2024-02-15 18:00:00', N'user-pa008', N'user-d20'),
(1019, '2024-02-19 10:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 160.00, '2024-02-19 10:30:00', 0, 1, '2024-02-18 18:00:00', N'user-pa009', N'user-d01'),
(1020, '2024-02-23 13:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 180.00, '2024-02-23 13:30:00', 0, 1, '2024-02-22 18:00:00', N'user-pa010', N'user-d02'),
(1021, '2024-02-26 14:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 210.00, '2024-02-26 14:30:00', 0, 1, '2024-02-25 18:00:00', N'user-pa011', N'user-d03'),
(1022, '2024-02-28 15:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 220.00, '2024-02-28 15:30:00', 0, 1, '2024-02-27 18:00:00', N'user-pa012', N'user-d04'),
(1023, '2024-02-28 16:00:00', N'Online', N'Cancelled', N'Headache and fatigue', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-02-27 18:00:00', N'user-pa001', N'user-d05'),
(1024, '2024-02-02 11:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 130.00, '2024-02-02 11:30:00', 0, 1, '2024-02-01 18:00:00', N'user-pa002', N'user-d06'),
(1025, '2024-02-07 17:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 100.00, '2024-02-07 17:30:00', 0, 1, '2024-02-06 18:00:00', N'user-pa003', N'user-d07'),
(1026, '2024-03-14 08:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 185.00, '2024-03-14 08:30:00', 0, 1, '2024-03-13 18:00:00', N'user-pa010', N'user-d08'),
(1027, '2024-03-21 09:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 155.00, '2024-03-21 09:30:00', 0, 1, '2024-03-20 18:00:00', N'user-pa011', N'user-d09'),
(1028, '2024-03-24 10:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 95.00, '2024-03-24 10:30:00', 0, 1, '2024-03-23 18:00:00', N'user-pa012', N'user-d10'),
(1029, '2024-03-03 13:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 90.00, '2024-03-03 13:30:00', 0, 1, '2024-03-02 18:00:00', N'user-pa013', N'user-d11'),
(1030, '2024-03-05 14:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 110.00, '2024-03-05 14:30:00', 0, 1, '2024-03-04 18:00:00', N'user-pa014', N'user-d12'),
(1031, '2024-03-09 15:00:00', N'Online', N'Cancelled', N'Follow-up on chronic condition', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-03-08 18:00:00', N'user-pa015', N'user-d13'),
(1032, '2024-03-12 16:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 140.00, '2024-03-12 16:30:00', 0, 1, '2024-03-11 18:00:00', N'user-pa016', N'user-d14'),
(1033, '2024-03-16 11:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 150.00, '2024-03-16 11:30:00', 0, 1, '2024-03-15 18:00:00', N'user-pa017', N'user-d15'),
(1034, '2024-03-19 17:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 160.00, '2024-03-19 17:30:00', 0, 1, '2024-03-18 18:00:00', N'user-pa018', N'user-d16'),
(1035, '2024-03-23 08:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 180.00, '2024-03-23 08:30:00', 0, 1, '2024-03-22 18:00:00', N'user-pa001', N'user-d17'),
(1036, '2024-03-26 09:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 210.00, '2024-03-26 09:30:00', 0, 1, '2024-03-25 18:00:00', N'user-pa002', N'user-d18'),
(1037, '2024-03-28 10:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 220.00, '2024-03-28 10:30:00', 0, 1, '2024-03-27 18:00:00', N'user-pa003', N'user-d19'),
(1038, '2024-03-30 13:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 250.00, '2024-03-30 13:30:00', 0, 1, '2024-03-29 18:00:00', N'user-pa004', N'user-d20'),
(1039, '2024-04-02 14:00:00', N'Online', N'Cancelled', N'General check-up and consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-04-01 18:00:00', N'user-pa015', N'user-d01'),
(1040, '2024-04-07 15:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 100.00, '2024-04-07 15:30:00', 0, 1, '2024-04-06 18:00:00', N'user-pa016', N'user-d02'),
(1041, '2024-04-14 16:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 185.00, '2024-04-14 16:30:00', 0, 1, '2024-04-13 18:00:00', N'user-pa017', N'user-d03'),
(1042, '2024-04-21 11:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 155.00, '2024-04-21 11:30:00', 0, 1, '2024-04-20 18:00:00', N'user-pa018', N'user-d04'),
(1043, '2024-04-24 17:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 95.00, '2024-04-24 17:30:00', 0, 1, '2024-04-23 18:00:00', N'user-pa019', N'user-d05'),
(1044, '2024-04-03 08:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 90.00, '2024-04-03 08:30:00', 0, 1, '2024-04-02 18:00:00', N'user-pa020', N'user-d06'),
(1045, '2024-04-05 09:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 110.00, '2024-04-05 09:30:00', 0, 1, '2024-04-04 18:00:00', N'user-pa021', N'user-d07'),
(1046, '2024-04-09 10:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 120.00, '2024-04-09 10:30:00', 0, 1, '2024-04-08 18:00:00', N'user-pa022', N'user-d08'),
(1047, '2024-04-12 13:00:00', N'Online', N'Cancelled', N'Allergy consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-04-11 18:00:00', N'user-pa023', N'user-d09'),
(1048, '2024-04-16 14:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 150.00, '2024-04-16 14:30:00', 0, 1, '2024-04-15 18:00:00', N'user-pa024', N'user-d10'),
(1049, '2024-04-19 15:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 160.00, '2024-04-19 15:30:00', 0, 1, '2024-04-18 18:00:00', N'user-pa025', N'user-d11'),
(1050, '2024-04-23 16:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 180.00, '2024-04-23 16:30:00', 0, 1, '2024-04-22 18:00:00', N'user-pa026', N'user-d12'),
(1051, '2024-04-26 11:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 210.00, '2024-04-26 11:30:00', 0, 1, '2024-04-25 18:00:00', N'user-pa001', N'user-d13'),
(1052, '2024-04-28 17:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 220.00, '2024-04-28 17:30:00', 0, 1, '2024-04-27 18:00:00', N'user-pa002', N'user-d14'),
(1053, '2024-04-30 08:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 250.00, '2024-04-30 08:30:00', 0, 1, '2024-04-29 18:00:00', N'user-pa003', N'user-d15'),
(1054, '2024-05-02 09:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 130.00, '2024-05-02 09:30:00', 0, 1, '2024-05-01 18:00:00', N'user-pa021', N'user-d16'),
(1055, '2024-05-07 10:00:00', N'Online', N'Cancelled', N'Stomach discomfort', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-05-06 18:00:00', N'user-pa022', N'user-d17'),
(1056, '2024-05-14 13:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 185.00, '2024-05-14 13:30:00', 0, 1, '2024-05-13 18:00:00', N'user-pa023', N'user-d18'),
(1057, '2024-05-21 14:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 155.00, '2024-05-21 14:30:00', 0, 1, '2024-05-20 18:00:00', N'user-pa024', N'user-d19'),
(1058, '2024-05-24 15:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 95.00, '2024-05-24 15:30:00', 0, 1, '2024-05-23 18:00:00', N'user-pa025', N'user-d20'),
(1059, '2024-05-03 16:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 90.00, '2024-05-03 16:30:00', 0, 1, '2024-05-02 18:00:00', N'user-pa026', N'user-d01'),
(1060, '2024-05-05 11:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 110.00, '2024-05-05 11:30:00', 0, 1, '2024-05-04 18:00:00', N'user-pa027', N'user-d02'),
(1061, '2024-05-09 17:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 120.00, '2024-05-09 17:30:00', 0, 1, '2024-05-08 18:00:00', N'user-pa028', N'user-d03'),
(1062, '2024-05-12 08:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 140.00, '2024-05-12 08:30:00', 0, 1, '2024-05-11 18:00:00', N'user-pa029', N'user-d04'),
(1063, '2024-05-16 09:00:00', N'Online', N'Cancelled', N'Headache and fatigue', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-05-15 18:00:00', N'user-pa030', N'user-d05'),
(1064, '2024-05-19 10:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 160.00, '2024-05-19 10:30:00', 0, 1, '2024-05-18 18:00:00', N'user-pa031', N'user-d06'),
(1065, '2024-05-23 13:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 180.00, '2024-05-23 13:30:00', 0, 1, '2024-05-22 18:00:00', N'user-pa032', N'user-d07'),
(1066, '2024-05-26 14:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 210.00, '2024-05-26 14:30:00', 0, 1, '2024-05-25 18:00:00', N'user-pa033', N'user-d08'),
(1067, '2024-05-28 15:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 220.00, '2024-05-28 15:30:00', 0, 1, '2024-05-27 18:00:00', N'user-pa034', N'user-d09'),
(1068, '2024-05-30 16:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 250.00, '2024-05-30 16:30:00', 0, 1, '2024-05-29 18:00:00', N'user-pa035', N'user-d10'),
(1069, '2024-05-02 11:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 130.00, '2024-05-02 11:30:00', 0, 1, '2024-05-01 18:00:00', N'user-pa001', N'user-d11'),
(1070, '2024-06-07 17:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 100.00, '2024-06-07 17:30:00', 0, 1, '2024-06-06 18:00:00', N'user-pa030', N'user-d12'),
(1071, '2024-06-14 08:00:00', N'Online', N'Cancelled', N'Follow-up on chronic condition', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-06-13 18:00:00', N'user-pa031', N'user-d13'),
(1072, '2024-06-21 09:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 155.00, '2024-06-21 09:30:00', 0, 1, '2024-06-20 18:00:00', N'user-pa032', N'user-d14'),
(1073, '2024-06-24 10:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 95.00, '2024-06-24 10:30:00', 0, 1, '2024-06-23 18:00:00', N'user-pa033', N'user-d15'),
(1074, '2024-06-03 13:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 90.00, '2024-06-03 13:30:00', 0, 1, '2024-06-02 18:00:00', N'user-pa034', N'user-d16'),
(1075, '2024-06-05 14:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 110.00, '2024-06-05 14:30:00', 0, 1, '2024-06-04 18:00:00', N'user-pa035', N'user-d17'),
(1076, '2024-06-09 15:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 120.00, '2024-06-09 15:30:00', 0, 1, '2024-06-08 18:00:00', N'user-pa036', N'user-d18'),
(1077, '2024-06-12 16:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 140.00, '2024-06-12 16:30:00', 0, 1, '2024-06-11 18:00:00', N'user-pa037', N'user-d19'),
(1078, '2024-06-16 11:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 150.00, '2024-06-16 11:30:00', 0, 1, '2024-06-15 18:00:00', N'user-pa038', N'user-d20'),
(1079, '2024-06-19 17:00:00', N'Online', N'Cancelled', N'General check-up and consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-06-18 18:00:00', N'user-pa039', N'user-d01'),
(1080, '2024-06-23 08:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 180.00, '2024-06-23 08:30:00', 0, 1, '2024-06-22 18:00:00', N'user-pa040', N'user-d02'),
(1081, '2024-06-26 09:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 210.00, '2024-06-26 09:30:00', 0, 1, '2024-06-25 18:00:00', N'user-pa041', N'user-d03'),
(1082, '2024-06-28 10:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 220.00, '2024-06-28 10:30:00', 0, 1, '2024-06-27 18:00:00', N'user-pa042', N'user-d04'),
(1083, '2024-06-30 13:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 250.00, '2024-06-30 13:30:00', 0, 1, '2024-06-29 18:00:00', N'user-pa001', N'user-d05'),
(1084, '2024-07-02 14:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 130.00, '2024-07-02 14:30:00', 0, 1, '2024-07-01 18:00:00', N'user-pa036', N'user-d06'),
(1085, '2024-07-07 15:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 100.00, '2024-07-07 15:30:00', 0, 1, '2024-07-06 18:00:00', N'user-pa037', N'user-d07'),
(1086, '2024-07-14 16:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 185.00, '2024-07-14 16:30:00', 0, 1, '2024-07-13 18:00:00', N'user-pa038', N'user-d08'),
(1087, '2024-07-21 11:00:00', N'Online', N'Cancelled', N'Allergy consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-07-20 18:00:00', N'user-pa039', N'user-d09'),
(1088, '2024-07-24 17:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 95.00, '2024-07-24 17:30:00', 0, 1, '2024-07-23 18:00:00', N'user-pa040', N'user-d10'),
(1089, '2024-07-03 08:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 90.00, '2024-07-03 08:30:00', 0, 1, '2024-07-02 18:00:00', N'user-pa041', N'user-d11'),
(1090, '2024-07-05 09:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 110.00, '2024-07-05 09:30:00', 0, 1, '2024-07-04 18:00:00', N'user-pa042', N'user-d12'),
(1091, '2024-07-09 10:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 120.00, '2024-07-09 10:30:00', 0, 1, '2024-07-08 18:00:00', N'user-pa043', N'user-d13'),
(1092, '2024-07-12 13:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 140.00, '2024-07-12 13:30:00', 0, 1, '2024-07-11 18:00:00', N'user-pa044', N'user-d14'),
(1093, '2024-07-16 14:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 150.00, '2024-07-16 14:30:00', 0, 1, '2024-07-15 18:00:00', N'user-pa045', N'user-d15'),
(1094, '2024-07-19 15:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 160.00, '2024-07-19 15:30:00', 0, 1, '2024-07-18 18:00:00', N'user-pa046', N'user-d16'),
(1095, '2024-07-23 16:00:00', N'Online', N'Cancelled', N'Stomach discomfort', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-07-22 18:00:00', N'user-pa047', N'user-d17'),
(1096, '2024-07-26 11:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 210.00, '2024-07-26 11:30:00', 0, 1, '2024-07-25 18:00:00', N'user-pa048', N'user-d18'),
(1097, '2024-07-28 17:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 220.00, '2024-07-28 17:30:00', 0, 1, '2024-07-27 18:00:00', N'user-pa049', N'user-d19'),
(1098, '2024-07-30 08:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 250.00, '2024-07-30 08:30:00', 0, 1, '2024-07-29 18:00:00', N'user-pa050', N'user-d20'),
(1099, '2024-08-02 09:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 130.00, '2024-08-02 09:30:00', 0, 1, '2024-08-01 18:00:00', N'user-pa041', N'user-d01'),
(1100, '2024-08-07 10:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 100.00, '2024-08-07 10:30:00', 0, 1, '2024-08-06 18:00:00', N'user-pa042', N'user-d02'),
(1101, '2024-08-14 13:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 185.00, '2024-08-14 13:30:00', 0, 1, '2024-08-13 18:00:00', N'user-pa043', N'user-d03'),
(1102, '2024-08-21 14:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 155.00, '2024-08-21 14:30:00', 0, 1, '2024-08-20 18:00:00', N'user-pa044', N'user-d04'),
(1103, '2024-08-24 15:00:00', N'Online', N'Cancelled', N'Headache and fatigue', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-08-23 18:00:00', N'user-pa045', N'user-d05'),
(1104, '2024-08-03 16:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 90.00, '2024-08-03 16:30:00', 0, 1, '2024-08-02 18:00:00', N'user-pa046', N'user-d06'),
(1105, '2024-08-05 11:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 110.00, '2024-08-05 11:30:00', 0, 1, '2024-08-04 18:00:00', N'user-pa047', N'user-d07'),
(1106, '2024-08-09 17:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 120.00, '2024-08-09 17:30:00', 0, 1, '2024-08-08 18:00:00', N'user-pa048', N'user-d08'),
(1107, '2024-08-12 08:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 140.00, '2024-08-12 08:30:00', 0, 1, '2024-08-11 18:00:00', N'user-pa049', N'user-d09'),
(1108, '2024-08-16 09:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 150.00, '2024-08-16 09:30:00', 0, 1, '2024-08-15 18:00:00', N'user-pa050', N'user-d10'),
(1109, '2024-08-19 10:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 160.00, '2024-08-19 10:30:00', 0, 1, '2024-08-18 18:00:00', N'user-pa051', N'user-d11'),
(1110, '2024-08-23 13:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 180.00, '2024-08-23 13:30:00', 0, 1, '2024-08-22 18:00:00', N'user-pa052', N'user-d12'),
(1111, '2024-08-26 14:00:00', N'Online', N'Cancelled', N'Follow-up on chronic condition', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-08-25 18:00:00', N'user-pa053', N'user-d13'),
(1112, '2024-08-28 15:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 220.00, '2024-08-28 15:30:00', 0, 1, '2024-08-27 18:00:00', N'user-pa054', N'user-d14'),
(1113, '2024-08-30 16:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 250.00, '2024-08-30 16:30:00', 0, 1, '2024-08-29 18:00:00', N'user-pa055', N'user-d15'),
(1114, '2024-08-02 11:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 130.00, '2024-08-02 11:30:00', 0, 1, '2024-08-01 18:00:00', N'user-pa056', N'user-d16'),
(1115, '2024-08-07 17:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 100.00, '2024-08-07 17:30:00', 0, 1, '2024-08-06 18:00:00', N'user-pa057', N'user-d17'),
(1116, '2024-09-14 08:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 185.00, '2024-09-14 08:30:00', 0, 1, '2024-09-13 18:00:00', N'user-pa050', N'user-d18'),
(1117, '2024-09-21 09:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 155.00, '2024-09-21 09:30:00', 0, 1, '2024-09-20 18:00:00', N'user-pa051', N'user-d19'),
(1118, '2024-09-24 10:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 95.00, '2024-09-24 10:30:00', 0, 1, '2024-09-23 18:00:00', N'user-pa052', N'user-d20'),
(1119, '2024-09-03 13:00:00', N'Online', N'Cancelled', N'General check-up and consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-09-02 18:00:00', N'user-pa053', N'user-d01'),
(1120, '2024-09-05 14:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 110.00, '2024-09-05 14:30:00', 0, 1, '2024-09-04 18:00:00', N'user-pa054', N'user-d02'),
(1121, '2024-09-09 15:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 120.00, '2024-09-09 15:30:00', 0, 1, '2024-09-08 18:00:00', N'user-pa055', N'user-d03'),
(1122, '2024-09-12 16:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 140.00, '2024-09-12 16:30:00', 0, 1, '2024-09-11 18:00:00', N'user-pa056', N'user-d04'),
(1123, '2024-09-16 11:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 150.00, '2024-09-16 11:30:00', 0, 1, '2024-09-15 18:00:00', N'user-pa057', N'user-d05'),
(1124, '2024-09-19 17:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 160.00, '2024-09-19 17:30:00', 0, 1, '2024-09-18 18:00:00', N'user-pa058', N'user-d06'),
(1125, '2024-09-23 08:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 180.00, '2024-09-23 08:30:00', 0, 1, '2024-09-22 18:00:00', N'user-pa059', N'user-d07'),
(1126, '2024-09-26 09:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 210.00, '2024-09-26 09:30:00', 0, 1, '2024-09-25 18:00:00', N'user-pa060', N'user-d08'),
(1127, '2024-09-28 10:00:00', N'Online', N'Cancelled', N'Allergy consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-09-27 18:00:00', N'user-pa061', N'user-d09'),
(1128, '2024-09-30 13:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 250.00, '2024-09-30 13:30:00', 0, 1, '2024-09-29 18:00:00', N'user-pa062', N'user-d10'),
(1129, '2024-09-02 14:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 130.00, '2024-09-02 14:30:00', 0, 1, '2024-09-01 18:00:00', N'user-pa063', N'user-d11'),
(1130, '2024-10-07 15:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 100.00, '2024-10-07 15:30:00', 0, 1, '2024-10-06 18:00:00', N'user-pa055', N'user-d12'),
(1131, '2024-10-14 16:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 185.00, '2024-10-14 16:30:00', 0, 1, '2024-10-13 18:00:00', N'user-pa056', N'user-d13'),
(1132, '2024-10-21 11:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 155.00, '2024-10-21 11:30:00', 0, 1, '2024-10-20 18:00:00', N'user-pa057', N'user-d14'),
(1133, '2024-10-24 17:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 95.00, '2024-10-24 17:30:00', 0, 1, '2024-10-23 18:00:00', N'user-pa058', N'user-d15'),
(1134, '2024-10-03 08:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 90.00, '2024-10-03 08:30:00', 0, 1, '2024-10-02 18:00:00', N'user-pa059', N'user-d16'),
(1135, '2024-10-05 09:00:00', N'Online', N'Cancelled', N'Stomach discomfort', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-10-04 18:00:00', N'user-pa060', N'user-d17'),
(1136, '2024-10-09 10:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 120.00, '2024-10-09 10:30:00', 0, 1, '2024-10-08 18:00:00', N'user-pa061', N'user-d18'),
(1137, '2024-10-12 13:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 140.00, '2024-10-12 13:30:00', 0, 1, '2024-10-11 18:00:00', N'user-pa062', N'user-d19'),
(1138, '2024-10-16 14:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 150.00, '2024-10-16 14:30:00', 0, 1, '2024-10-15 18:00:00', N'user-pa063', N'user-d20'),
(1139, '2024-10-19 15:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 160.00, '2024-10-19 15:30:00', 0, 1, '2024-10-18 18:00:00', N'user-pa064', N'user-d01'),
(1140, '2024-10-23 16:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 180.00, '2024-10-23 16:30:00', 0, 1, '2024-10-22 18:00:00', N'user-pa065', N'user-d02'),
(1141, '2024-10-26 11:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 210.00, '2024-10-26 11:30:00', 0, 1, '2024-10-25 18:00:00', N'user-pa066', N'user-d03'),
(1142, '2024-10-28 17:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 220.00, '2024-10-28 17:30:00', 0, 1, '2024-10-27 18:00:00', N'user-pa067', N'user-d04'),
(1143, '2024-10-30 08:00:00', N'Online', N'Cancelled', N'Headache and fatigue', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-10-29 18:00:00', N'user-pa068', N'user-d05'),
(1144, '2024-10-02 09:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 130.00, '2024-10-02 09:30:00', 0, 1, '2024-10-01 18:00:00', N'user-pa069', N'user-d06'),
(1145, '2024-10-07 10:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 100.00, '2024-10-07 10:30:00', 0, 1, '2024-10-06 18:00:00', N'user-pa070', N'user-d07'),
(1146, '2024-11-14 13:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 185.00, '2024-11-14 13:30:00', 0, 1, '2024-11-13 18:00:00', N'user-pa064', N'user-d08'),
(1147, '2024-11-21 14:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 155.00, '2024-11-21 14:30:00', 0, 1, '2024-11-20 18:00:00', N'user-pa065', N'user-d09'),
(1148, '2024-11-24 15:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 95.00, '2024-11-24 15:30:00', 0, 1, '2024-11-23 18:00:00', N'user-pa066', N'user-d10'),
(1149, '2024-11-03 16:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 90.00, '2024-11-03 16:30:00', 0, 1, '2024-11-02 18:00:00', N'user-pa067', N'user-d11'),
(1150, '2024-11-05 11:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 110.00, '2024-11-05 11:30:00', 0, 1, '2024-11-04 18:00:00', N'user-pa068', N'user-d12'),
(1151, '2024-11-09 17:00:00', N'Online', N'Cancelled', N'Follow-up on chronic condition', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-11-08 18:00:00', N'user-pa069', N'user-d13'),
(1152, '2024-11-12 08:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 140.00, '2024-11-12 08:30:00', 0, 1, '2024-11-11 18:00:00', N'user-pa070', N'user-d14'),
(1153, '2024-11-16 09:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 150.00, '2024-11-16 09:30:00', 0, 1, '2024-11-15 18:00:00', N'user-pa071', N'user-d15'),
(1154, '2024-11-19 10:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 160.00, '2024-11-19 10:30:00', 0, 1, '2024-11-18 18:00:00', N'user-pa072', N'user-d16'),
(1155, '2024-11-23 13:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 180.00, '2024-11-23 13:30:00', 0, 1, '2024-11-22 18:00:00', N'user-pa073', N'user-d17'),
(1156, '2024-11-26 14:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 210.00, '2024-11-26 14:30:00', 0, 1, '2024-11-25 18:00:00', N'user-pa074', N'user-d18'),
(1157, '2024-11-28 15:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 220.00, '2024-11-28 15:30:00', 0, 1, '2024-11-27 18:00:00', N'user-pa075', N'user-d19'),
(1158, '2024-11-30 16:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 250.00, '2024-11-30 16:30:00', 0, 1, '2024-11-29 18:00:00', N'user-pa076', N'user-d20'),
(1159, '2024-12-02 11:00:00', N'Online', N'Cancelled', N'General check-up and consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-12-01 18:00:00', N'user-pa071', N'user-d01'),
(1160, '2024-12-07 17:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 100.00, '2024-12-07 17:30:00', 0, 1, '2024-12-06 18:00:00', N'user-pa072', N'user-d02'),
(1161, '2024-12-14 08:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 185.00, '2024-12-14 08:30:00', 0, 1, '2024-12-13 18:00:00', N'user-pa073', N'user-d03'),
(1162, '2024-12-21 09:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 155.00, '2024-12-21 09:30:00', 0, 1, '2024-12-20 18:00:00', N'user-pa074', N'user-d04'),
(1163, '2024-12-24 10:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 95.00, '2024-12-24 10:30:00', 0, 1, '2024-12-23 18:00:00', N'user-pa075', N'user-d05'),
(1164, '2024-12-03 13:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 90.00, '2024-12-03 13:30:00', 0, 1, '2024-12-02 18:00:00', N'user-pa076', N'user-d06'),
(1165, '2024-12-05 14:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 110.00, '2024-12-05 14:30:00', 0, 1, '2024-12-04 18:00:00', N'user-pa077', N'user-d07'),
(1166, '2024-12-09 15:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 120.00, '2024-12-09 15:30:00', 0, 1, '2024-12-08 18:00:00', N'user-pa078', N'user-d08'),
(1167, '2024-12-12 16:00:00', N'Online', N'Cancelled', N'Allergy consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-12-11 18:00:00', N'user-pa079', N'user-d09'),
(1168, '2024-12-16 11:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 150.00, '2024-12-16 11:30:00', 0, 1, '2024-12-15 18:00:00', N'user-pa080', N'user-d10'),
(1169, '2024-12-19 17:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 160.00, '2024-12-19 17:30:00', 0, 1, '2024-12-18 18:00:00', N'user-pa081', N'user-d11'),
(1170, '2024-12-23 08:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 180.00, '2024-12-23 08:30:00', 0, 1, '2024-12-22 18:00:00', N'user-pa082', N'user-d12'),
(1171, '2024-12-26 09:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 210.00, '2024-12-26 09:30:00', 0, 1, '2024-12-25 18:00:00', N'user-pa083', N'user-d13'),
(1172, '2024-12-28 10:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 220.00, '2024-12-28 10:30:00', 0, 1, '2024-12-27 18:00:00', N'user-pa084', N'user-d14'),
(1173, '2024-12-30 13:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 250.00, '2024-12-30 13:30:00', 0, 1, '2024-12-29 18:00:00', N'user-pa085', N'user-d15');
SET IDENTITY_INSERT Appointments OFF;
GO

-- 50. REVIEWS - demo completed appts fully reviewed + analytics reviews
SET IDENTITY_INSERT Reviews ON;
INSERT INTO Reviews (ReviewID, PatientID, DoctorID, rating, comment, reviewDate, AppointmentId, Anonymous, doctorReply, doctorReplyDate, Visible, HelpfulCount, AdminReply, AdminReplyDate) VALUES
(11, N'user-p01', N'user-d01', 5, N'Follow-up consultation was smooth and helpful. Felt much better afterwards.', '2024-05-24 18:00:00', 11, 0, NULL, NULL, 1, 4, NULL, NULL),
(12, N'user-p01', N'user-d01', 5, N'The home visit was very professional and convenient for my elderly relative.', '2024-05-28 09:00:00', 14, 0, N'Thank you! Wishing a speedy recovery.', '2024-05-28 12:00:00', 1, 9, NULL, NULL),
(1000, N'user-pa002', N'user-d02', 4, N'Very attentive and professional doctor.', '2024-01-05 10:00:00', 1000, 1, NULL, NULL, 1, 0, NULL, NULL),
(1001, N'user-pa002', N'user-d07', 5, N'Listened carefully to my concerns.', '2024-01-23 17:00:00', 1005, 0, NULL, NULL, 1, 5, NULL, NULL),
(1002, N'user-pa003', N'user-d13', 5, N'Quick and helpful consultation.', '2024-01-14 14:00:00', 1011, 0, NULL, NULL, 1, 10, NULL, NULL),
(1003, N'user-pa007', N'user-d19', 4, N'Smooth online session, no issues.', '2024-02-12 09:00:00', 1017, 0, NULL, NULL, 1, 0, NULL, NULL),
(1004, N'user-pa012', N'user-d04', 5, N'Great experience overall, thank you.', '2024-02-28 16:00:00', 1022, 0, NULL, NULL, 1, 5, NULL, NULL),
(1005, N'user-pa012', N'user-d10', 5, N'Clear explanation, felt reassured.', '2024-03-24 11:00:00', 1028, 0, NULL, NULL, 1, 10, NULL, NULL),
(1006, N'user-pa018', N'user-d16', 4, N'Accurate diagnosis and good advice.', '2024-03-19 18:00:00', 1034, 0, NULL, NULL, 1, 0, NULL, NULL),
(1007, N'user-pa016', N'user-d02', 5, N'Friendly and knowledgeable. Recommended.', '2024-04-07 16:00:00', 1040, 1, NULL, NULL, 1, 5, NULL, NULL),
(1008, N'user-pa021', N'user-d07', 5, N'Very attentive and professional doctor.', '2024-04-05 10:00:00', 1045, 0, NULL, NULL, 1, 10, NULL, NULL),
(1009, N'user-pa001', N'user-d13', 4, N'Listened carefully to my concerns.', '2024-04-26 12:00:00', 1051, 0, NULL, NULL, 1, 0, NULL, NULL),
(1010, N'user-pa024', N'user-d19', 5, N'Quick and helpful consultation.', '2024-05-21 15:00:00', 1057, 0, NULL, NULL, 1, 5, NULL, NULL),
(1011, N'user-pa029', N'user-d04', 5, N'Smooth online session, no issues.', '2024-05-12 09:00:00', 1062, 0, NULL, NULL, 1, 10, NULL, NULL),
(1012, N'user-pa035', N'user-d10', 4, N'Great experience overall, thank you.', '2024-05-30 17:00:00', 1068, 0, NULL, NULL, 1, 0, NULL, NULL),
(1013, N'user-pa034', N'user-d16', 5, N'Clear explanation, felt reassured.', '2024-06-03 14:00:00', 1074, 0, NULL, NULL, 1, 5, NULL, NULL),
(1014, N'user-pa040', N'user-d02', 5, N'Accurate diagnosis and good advice.', '2024-06-23 09:00:00', 1080, 1, NULL, NULL, 1, 10, NULL, NULL),
(1015, N'user-pa037', N'user-d07', 4, N'Friendly and knowledgeable. Recommended.', '2024-07-07 16:00:00', 1085, 0, NULL, NULL, 1, 0, NULL, NULL),
(1016, N'user-pa043', N'user-d13', 5, N'Very attentive and professional doctor.', '2024-07-09 11:00:00', 1091, 0, NULL, NULL, 1, 5, NULL, NULL),
(1017, N'user-pa049', N'user-d19', 5, N'Listened carefully to my concerns.', '2024-07-28 18:00:00', 1097, 0, NULL, NULL, 1, 10, NULL, NULL),
(1018, N'user-pa044', N'user-d04', 4, N'Quick and helpful consultation.', '2024-08-21 15:00:00', 1102, 0, NULL, NULL, 1, 0, NULL, NULL),
(1019, N'user-pa050', N'user-d10', 5, N'Smooth online session, no issues.', '2024-08-16 10:00:00', 1108, 0, NULL, NULL, 1, 5, NULL, NULL),
(1020, N'user-pa056', N'user-d16', 5, N'Great experience overall, thank you.', '2024-08-02 12:00:00', 1114, 0, NULL, NULL, 1, 10, NULL, NULL),
(1021, N'user-pa054', N'user-d02', 4, N'Clear explanation, felt reassured.', '2024-09-05 15:00:00', 1120, 1, NULL, NULL, 1, 0, NULL, NULL),
(1022, N'user-pa059', N'user-d07', 5, N'Accurate diagnosis and good advice.', '2024-09-23 09:00:00', 1125, 0, NULL, NULL, 1, 5, NULL, NULL),
(1023, N'user-pa056', N'user-d13', 5, N'Friendly and knowledgeable. Recommended.', '2024-10-14 17:00:00', 1131, 0, NULL, NULL, 1, 10, NULL, NULL),
(1024, N'user-pa062', N'user-d19', 4, N'Very attentive and professional doctor.', '2024-10-12 14:00:00', 1137, 0, NULL, NULL, 1, 0, NULL, NULL),
(1025, N'user-pa067', N'user-d04', 5, N'Listened carefully to my concerns.', '2024-10-28 18:00:00', 1142, 0, NULL, NULL, 1, 5, NULL, NULL),
(1026, N'user-pa066', N'user-d10', 5, N'Quick and helpful consultation.', '2024-11-24 16:00:00', 1148, 0, NULL, NULL, 1, 10, NULL, NULL),
(1027, N'user-pa072', N'user-d16', 4, N'Smooth online session, no issues.', '2024-11-19 11:00:00', 1154, 0, NULL, NULL, 1, 0, NULL, NULL),
(1028, N'user-pa072', N'user-d02', 5, N'Great experience overall, thank you.', '2024-12-07 18:00:00', 1160, 1, NULL, NULL, 1, 5, NULL, NULL),
(1029, N'user-pa077', N'user-d07', 5, N'Clear explanation, felt reassured.', '2024-12-05 15:00:00', 1165, 0, NULL, NULL, 1, 10, NULL, NULL),
(1030, N'user-pa083', N'user-d13', 4, N'Accurate diagnosis and good advice.', '2024-12-26 10:00:00', 1171, 0, NULL, NULL, 1, 0, NULL, NULL);
SET IDENTITY_INSERT Reviews OFF;
GO

-- 51. DOCTOR SCHEDULES - delete old, rebuild valid weekly schedules (NEW FLOW)
-- New flow consultationType is ONLY 'Online' or 'HomeVisit' (see ScheduleFormModal.jsx).
-- Old 'Video'/'Offline' rows are removed. Shift windows: Morning 07:00-10:30,
-- Afternoon 13:00-17:30, Evening 19:00-21:00. Online fits ONE window (shiftType NULL);
-- HomeVisit spans whole shift (shiftType set). No same-day overlap per doctor.
DELETE FROM DoctorSchedules;
GO
SET IDENTITY_INSERT DoctorSchedules ON;
INSERT INTO DoctorSchedules (ScheduleID, DoctorId, dayOfWeek, startTime, endTime, SlotDuration, MaxPatients, Available, ScheduleStatus, consultationType, ShiftType, location, notes) VALUES
(1, N'user-d01', 1, '07:00', '10:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday morning online'),
(2, N'user-d01', 3, '14:00', '17:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday afternoon online'),
(3, N'user-d01', 1, '19:00', '21:00', 120, 1, 1, 'APPROVED', N'HomeVisit', 'EVENING', N'Patient home', N'Monday evening home visit'),
(4, N'user-d02', 2, '08:00', '10:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday morning online'),
(5, N'user-d02', 2, '13:00', '17:30', 270, 1, 1, 'APPROVED', N'HomeVisit', 'AFTERNOON', N'Patient home', N'Tuesday afternoon home visit'),
(6, N'user-d02', 4, '07:00', '10:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Thursday morning online'),
(7, N'user-d03', 3, '07:00', '10:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday morning online'),
(8, N'user-d03', 3, '13:00', '17:30', 270, 1, 1, 'APPROVED', N'HomeVisit', 'AFTERNOON', N'Patient home', N'Wednesday afternoon home visit'),
(9, N'user-d03', 5, '08:00', '10:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Friday morning online'),
(10, N'user-d04', 4, '08:00', '10:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Thursday morning online'),
(11, N'user-d04', 4, '13:30', '16:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Thursday afternoon online'),
(12, N'user-d05', 5, '08:00', '10:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Friday morning online'),
(13, N'user-d05', 2, '07:00', '10:30', 210, 1, 1, 'APPROVED', N'HomeVisit', 'MORNING', N'Patient home', N'Tuesday morning home visit'),
(14, N'user-d06', 6, '08:00', '10:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Saturday morning online'),
(15, N'user-d06', 3, '13:30', '16:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday afternoon online'),
(16, N'user-d07', 1, '14:00', '17:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday afternoon online'),
(17, N'user-d07', 4, '07:00', '10:30', 210, 1, 1, 'APPROVED', N'HomeVisit', 'MORNING', N'Patient home', N'Thursday morning home visit'),
(18, N'user-d08', 2, '08:00', '10:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday morning online'),
(19, N'user-d08', 5, '13:30', '16:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Friday afternoon online'),
(20, N'user-d09', 3, '13:30', '16:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday afternoon online'),
(21, N'user-d09', 5, '19:00', '21:00', 120, 1, 1, 'APPROVED', N'HomeVisit', 'EVENING', N'Patient home', N'Friday evening home visit'),
(22, N'user-d10', 1, '07:00', '10:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday morning online'),
(23, N'user-d10', 3, '13:30', '16:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday afternoon online'),
(24, N'user-d10', 5, '07:00', '10:30', 210, 1, 1, 'APPROVED', N'HomeVisit', 'MORNING', N'Patient home', N'Friday morning home visit'),
(25, N'user-d11', 2, '07:00', '10:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday morning online'),
(26, N'user-d11', 4, '13:00', '17:30', 270, 1, 1, 'APPROVED', N'HomeVisit', 'AFTERNOON', N'Patient home', N'Thursday afternoon home visit'),
(27, N'user-d12', 1, '07:00', '10:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday morning online'),
(28, N'user-d12', 3, '14:00', '17:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday afternoon online'),
(29, N'user-d12', 6, '07:00', '10:30', 210, 1, 1, 'APPROVED', N'HomeVisit', 'MORNING', N'Patient home', N'Saturday morning home visit'),
(30, N'user-d13', 2, '08:00', '10:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday morning online'),
(31, N'user-d13', 4, '13:30', '16:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Thursday afternoon online'),
(32, N'user-d13', 5, '19:00', '21:00', 120, 1, 1, 'APPROVED', N'HomeVisit', 'EVENING', N'Patient home', N'Friday evening home visit'),
(33, N'user-d14', 1, '13:30', '16:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday afternoon online'),
(34, N'user-d14', 3, '07:00', '10:30', 210, 1, 1, 'APPROVED', N'HomeVisit', 'MORNING', N'Patient home', N'Wednesday morning home visit'),
(35, N'user-d15', 2, '08:00', '10:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday morning online'),
(36, N'user-d15', 4, '14:00', '17:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Thursday afternoon online'),
(37, N'user-d15', 6, '13:00', '17:30', 270, 1, 1, 'APPROVED', N'HomeVisit', 'AFTERNOON', N'Patient home', N'Saturday afternoon home visit'),
(38, N'user-d16', 3, '07:00', '10:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday morning online'),
(39, N'user-d16', 5, '13:00', '17:30', 270, 1, 1, 'APPROVED', N'HomeVisit', 'AFTERNOON', N'Patient home', N'Friday afternoon home visit'),
(40, N'user-d17', 1, '13:30', '16:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday afternoon online'),
(41, N'user-d17', 4, '07:00', '10:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Thursday morning online'),
(42, N'user-d18', 2, '08:00', '10:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday morning online'),
(43, N'user-d18', 5, '13:30', '16:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Friday afternoon online'),
(44, N'user-d18', 6, '07:00', '10:30', 210, 1, 1, 'APPROVED', N'HomeVisit', 'MORNING', N'Patient home', N'Saturday morning home visit'),
(45, N'user-d19', 3, '14:00', '17:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday afternoon online'),
(46, N'user-d19', 5, '19:00', '21:00', 120, 1, 1, 'APPROVED', N'HomeVisit', 'EVENING', N'Patient home', N'Friday evening home visit'),
(47, N'user-d20', 1, '07:00', '10:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday morning online'),
(48, N'user-d20', 2, '13:30', '16:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday afternoon online'),
(49, N'user-d20', 4, '07:00', '10:30', 210, 1, 1, 'APPROVED', N'HomeVisit', 'MORNING', N'Patient home', N'Thursday morning home visit');
SET IDENTITY_INSERT DoctorSchedules OFF;
GO

PRINT 'Analytics / charts seed (2024) completed successfully!';


-- =====================================================
-- END SEED DATA
-- Total: 51 seed sections, mixed sample sizes
-- =====================================================
PRINT 'Seed data completed successfully!';





