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
('user-d01', 'Dr. John Smith', 'MD, PhD - Harvard Medical School', 'Internal Medicine', 15, 'English, Spanish', 'New York', 'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', 'Internal medicine specialist with 15 years of experience', 50.00, 40.7128, -74.0060, 'Manhattan Health Clinic', '123 5th Avenue, New York, NY 10001', 4.8, 4, 1, 1, 500.00, 120.00, 'dr.john.smith@healthlink.com', 'APPROVED', '1234567890', 'Bank of America', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD'),
('user-d02', 'Dr. Sarah Johnson', 'MD - Johns Hopkins University', 'Pediatrics', 12, 'English', 'Los Angeles', 'http://localhost:8096/uploads/avatars/doctors/bacsi_02.png', 'Dedicated pediatrician caring for children', 50.00, 34.0522, -118.2437, 'LA Children Hospital', '456 Sunset Blvd, Los Angeles, CA 90028', 4.7, 7, 1, 3, 320.00, 75.00, 'dr.sarah.johnson@healthlink.com', 'APPROVED', '1234567891', 'Wells Fargo', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD'),
('user-d03', 'Dr. Michael Chen', 'MD, FACC - Stanford University', 'Cardiology', 20, 'English, Mandarin, French', 'San Francisco', 'http://localhost:8096/uploads/avatars/doctors/bacsi_03.png', 'Leading cardiologist and heart specialist', 50.00, 37.7749, -122.4194, 'Bay Area Heart Center', '789 Market Street, San Francisco, CA 94103', 5.0, 2, 1, 6, 640.00, 150.00, 'dr.michael.chen@healthlink.com', 'APPROVED', '1234567892', 'Chase', NULL, NULL, NULL, NULL, NULL, NULL, 'PREMIUM'),
('user-d04', 'Dr. Emily Davis', 'MD, FACS - Mayo Clinic', 'Surgery', 10, 'English', 'Chicago', 'http://localhost:8096/uploads/avatars/doctors/bacsi_04.png', 'Experienced general surgeon', 50.00, 41.8781, -87.6298, 'Chicago Medical Center', '321 Michigan Ave, Chicago, IL 60601', 4.6, 5, 1, 2, 280.00, 50.00, 'dr.emily.davis@healthlink.com', 'APPROVED', '1234567893', 'Citibank', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD'),
('user-d05', 'Dr. Jessica Williams', 'MD, FACOG - UCLA', 'Obstetrics & Gynecology', 8, 'English, Korean', 'Seattle', 'http://localhost:8096/uploads/avatars/doctors/bacsi_05.png', 'Women health and pregnancy specialist', 50.00, 47.6062, -122.3321, 'Seattle Women Clinic', '555 Pine Street, Seattle, WA 98101', 5.0, 2, 1, 4, 410.00, 140.00, 'dr.jessica.williams@healthlink.com', 'APPROVED', '1234567894', 'US Bank', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD'),
('user-d06', 'Dr. Robert Brown', 'MD - NYU School of Medicine', 'Dermatology', 7, 'English, Italian', 'Miami', 'http://localhost:8096/uploads/avatars/doctors/bacsi_06.png', 'Skin disease and cosmetic dermatology expert', 50.00, 25.7617, -80.1918, 'Miami Skin Center', '888 Ocean Drive, Miami, FL 33139', 4.5, 2, 1, 5, 220.00, 45.00, 'dr.robert.brown@healthlink.com', 'APPROVED', '1234567895', 'TD Bank', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD'),
('user-d07', 'Dr. David Wilson', 'MD, PhD - Columbia University', 'Neurology', 18, 'English, German', 'Boston', 'http://localhost:8096/uploads/avatars/doctors/bacsi_07.png', 'Neurologist specializing in brain disorders', 50.00, 42.3601, -71.0589, 'Boston Neuro Institute', '100 Cambridge St, Boston, MA 02114', 4.7, 6, 1, 7, 520.00, 170.00, 'dr.david.wilson@healthlink.com', 'APPROVED', '1234567896', 'Bank of America', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD'),
('user-d08', 'Dr. Amanda Lee', 'MD - Wills Eye Hospital', 'Ophthalmology', 14, 'English, Japanese', 'Philadelphia', 'http://localhost:8096/uploads/avatars/doctors/bacsi_08.png', 'Eye surgery and treatment specialist', 50.00, 39.9526, -75.1652, 'Philadelphia Eye Center', '200 Chestnut St, Philadelphia, PA 19106', 4.5, 2, 1, 8, 305.00, 80.00, 'dr.amanda.lee@healthlink.com', 'APPROVED', '1234567897', 'PNC Bank', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD'),
('user-d09', 'Dr. James Taylor', 'MD - Baylor College of Medicine', 'ENT', 11, 'English, Spanish', 'Houston', 'http://localhost:8096/uploads/avatars/doctors/bacsi_09.png', 'Ear, nose, and throat specialist', 50.00, 29.7604, -95.3698, 'Houston ENT Clinic', '400 Main Street, Houston, TX 77002', 5.0, 2, 1, 9, 190.00, 30.00, 'dr.james.taylor@healthlink.com', 'APPROVED', '1234567898', 'Chase', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD'),
('user-d10', 'Dr. Jennifer Martinez', 'DDS - USC School of Dentistry', 'Dentistry', 9, 'English, Spanish', 'Phoenix', 'http://localhost:8096/uploads/avatars/doctors/bacsi_10.png', 'Cosmetic and general dentistry', 50.00, 33.4484, -112.0740, 'Smile Dental Center', '600 Central Ave, Phoenix, AZ 85004', 4.8, 4, 1, 10, 150.00, 25.00, 'dr.jennifer.martinez@healthlink.com', 'APPROVED', '1234567899', 'Bank of the West', NULL, NULL, NULL, NULL, NULL, NULL, 'STANDARD');

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
(1, 'Paracetamol 500mg', 'Paracetamol', 'Tylenol', 'Pain Relief - Fever', 20, 'Tablet', '500mg', 'Tablet', 'Johnson & Johnson', 'USA', 'Common pain reliever and fever reducer', 'Paracetamol 500mg', 'Headache, fever, muscle pain', 'Allergy to paracetamol, severe liver disease', 'Nausea, rash (rare)', 'Do not exceed 4g per day', 'Increased toxicity with alcohol', 'Store below 30C', 0, 5.99, 1, '/uploads/medicinces/Paracetamol.webp', '2024-01-01', NULL),
(2, 'Amoxicillin 500mg', 'Amoxicillin', 'Amoxil', 'Antibiotic', 10, 'Capsule', '500mg', 'Capsule', 'Pfizer', 'USA', 'Broad spectrum antibiotic', 'Amoxicillin trihydrate', 'Respiratory infections, UTI', 'Penicillin allergy', 'Diarrhea, rash, nausea', 'Adjust dose for kidney disease', 'May reduce contraceptive efficacy', 'Store at 15-25C', 1, 12.99, 1, '/uploads/medicinces/Amoxicillin.jpg', '2024-01-01', NULL),
(3, 'Omeprazole 20mg', 'Omeprazole', 'Prilosec', 'Gastrointestinal', 14, 'Capsule', '20mg', 'Capsule', 'AstraZeneca', 'Sweden', 'Proton pump inhibitor', 'Omeprazole', 'Gastric ulcer, GERD', 'Allergy to omeprazole', 'Headache, diarrhea, nausea', 'Not for long-term use', 'Reduces B12 absorption', 'Store below 25C, protect from moisture', 1, 15.99, 1, '/uploads/medicinces/Omeprazole.jpg', '2024-01-01', NULL),
(4, 'Metformin 500mg', 'Metformin', 'Glucophage', 'Diabetes', 12, 'Tablet', '500mg', 'Tablet', 'Merck', 'Germany', 'Type 2 diabetes treatment', 'Metformin HCl', 'Type 2 diabetes', 'Kidney disease, acidosis', 'GI upset, B12 deficiency', 'Stop before CT scan with contrast', 'Increased hypoglycemia risk with other drugs', 'Store at 15-25C', 1, 8.99, 1, '/uploads/medicinces/Metformin.webp', '2024-01-01', NULL),
(5, 'Amlodipine 5mg', 'Amlodipine', 'Norvasc', 'Cardiovascular', 11, 'Tablet', '5mg', 'Tablet', 'Pfizer', 'USA', 'Blood pressure medication', 'Amlodipine besylate', 'Hypertension, angina', 'Hypotension, cardiogenic shock', 'Ankle swelling, headache', 'Monitor blood pressure regularly', 'Increased effect with grapefruit', 'Store below 30C', 1, 18.99, 1, '/uploads/medicinces/Amlodipine.webp', '2024-01-01', NULL),
(6, 'Cetirizine 10mg', 'Cetirizine', 'Zyrtec', 'Allergy', 21, 'Tablet', '10mg', 'Tablet', 'UCB', 'Belgium', 'Second generation antihistamine', 'Cetirizine HCl', 'Allergic rhinitis, urticaria', 'Severe kidney disease', 'Drowsiness, dry mouth', 'Caution when driving', 'Increased sedation with alcohol', 'Store below 25C', 0, 9.99, 1, '/uploads/medicinces/Cetirizine.webp', '2024-01-01', NULL),
(7, 'Vitamin C 1000mg', 'Ascorbic Acid', 'Emergen-C', 'Vitamin - Mineral', 30, 'Effervescent', '1000mg', 'Tablet', 'Pfizer', 'USA', 'Vitamin C supplement', 'Ascorbic acid', 'Vitamin C deficiency, immune support', 'Kidney stones (oxalate)', 'GI upset at high doses', 'Do not exceed 2000mg per day', 'Increases iron absorption', 'Store in dry place', 0, 12.99, 1, '/uploads/medicinces/Ascorbic Acid.jpg', '2024-01-01', NULL),
(8, 'Ibuprofen 400mg', 'Ibuprofen', 'Advil', 'Pain Relief - Anti-inflammatory', 20, 'Tablet', '400mg', 'Tablet', 'Pfizer', 'USA', 'NSAID pain reliever', 'Ibuprofen', 'Headache, muscle pain, arthritis', 'Gastric ulcer, kidney disease', 'Stomach pain, nausea', 'Take with food', 'Increased bleeding risk with aspirin', 'Store below 25C', 0, 7.99, 1, '/uploads/medicinces/Ibuprofen.webp', '2024-01-01', NULL),
(9, 'Salbutamol 100mcg', 'Salbutamol', 'Ventolin', 'Respiratory', 13, 'Inhaler', '100mcg', 'Puff', 'GSK', 'UK', 'Bronchodilator inhaler', 'Salbutamol sulfate', 'Asthma, bronchospasm', 'Heart arrhythmia', 'Rapid heartbeat, tremor', 'Do not overuse', 'Increased effect with theophylline', 'Store below 30C', 1, 35.99, 1, '/uploads/medicinces/Salbutamol.webp', '2024-01-01', NULL),
(10, 'Allopurinol 300mg', 'Allopurinol', 'Zyloprim', 'Gout', 15, 'Tablet', '300mg', 'Tablet', 'Takeda', 'Japan', 'Uric acid reducer', 'Allopurinol', 'Gout, hyperuricemia', 'Allopurinol allergy', 'Rash, liver problems', 'Drink plenty of water', 'Increased azathioprine toxicity', 'Store below 25C, protect from moisture', 1, 14.99, 1, '/uploads/medicinces/Allopurinol.webp', '2024-01-01', NULL);
SET IDENTITY_INSERT Medicines OFF;

-- 10. PHARMACY_INVENTORY (28 inventory rows)
SET IDENTITY_INSERT PharmacyInventory ON;
-- Seed quantities are physical on-hand stock. Existing dev orders/inventory must be reset when this lifecycle changes.
INSERT INTO PharmacyInventory (InventoryID, PharmacyID, MedicineID, quantity, reservedQuantity, unit, expiryDate, active, lastImportedAt, createdAt, updatedAt) VALUES
(1, 'user-ph01', 1, 120, 0, 'Tablet', '2026-12-31', 1, '2024-05-20 08:00:00', '2024-05-20 08:00:00', '2024-05-20 08:00:00'),
(2, 'user-ph01', 7, 80, 0, 'Tablet', '2026-12-31', 1, '2024-05-20 08:00:00', '2024-05-20 08:00:00', '2024-05-20 08:00:00'),
(3, 'user-ph01', 5, 6, 0, 'Tablet', '2026-08-31', 1, '2024-05-20 08:00:00', '2024-05-20 08:00:00', '2024-05-20 08:00:00'),
(4, 'user-ph01', 8, 0, 0, 'Tablet', '2026-07-31', 1, '2024-05-20 08:00:00', '2024-05-20 08:00:00', '2024-05-20 08:00:00'),
(5, 'user-ph01', 2, 30, 0, 'Capsule', '2026-05-31', 0, '2024-05-20 08:00:00', '2024-05-20 08:00:00', '2024-05-20 08:00:00'),
(6, 'user-ph02', 1, 40, 0, 'Tablet', '2026-12-31', 1, '2024-05-20 08:15:00', '2024-05-20 08:15:00', '2024-05-20 08:15:00'),
(7, 'user-ph02', 6, 25, 0, 'Tablet', '2026-11-30', 1, '2024-05-20 08:15:00', '2024-05-20 08:15:00', '2024-05-20 08:15:00'),
(8, 'user-ph02', 3, 12, 0, 'Capsule', '2026-09-30', 1, '2024-05-20 08:15:00', '2024-05-20 08:15:00', '2024-05-20 08:15:00'),
(9, 'user-ph02', 5, 45, 0, 'Tablet', '2026-08-31', 1, '2024-05-20 08:15:00', '2024-05-20 08:15:00', '2024-05-20 08:15:00'),
(10, 'user-ph02', 7, 4, 0, 'Tablet', '2026-12-31', 1, '2024-05-20 08:15:00', '2024-05-20 08:15:00', '2024-05-20 08:15:00'),
(11, 'user-ph02', 10, 0, 0, 'Tablet', '2026-10-31', 1, '2024-05-20 08:15:00', '2024-05-20 08:15:00', '2024-05-20 08:15:00'),
(12, 'user-ph04', 1, 50, 0, 'Tablet', '2026-12-31', 1, '2024-05-20 08:30:00', '2024-05-20 08:30:00', '2024-05-20 08:30:00'),
(13, 'user-ph04', 5, 12, 0, 'Tablet', '2026-08-31', 1, '2024-05-20 08:30:00', '2024-05-20 08:30:00', '2024-05-20 08:30:00'),
(14, 'user-ph04', 8, 20, 0, 'Tablet', '2026-07-31', 1, '2024-05-20 08:30:00', '2024-05-20 08:30:00', '2024-05-20 08:30:00'),
(15, 'user-ph07', 10, 45, 0, 'Tablet', '2026-10-31', 1, '2024-05-20 08:45:00', '2024-05-20 08:45:00', '2024-05-20 08:45:00'),
(16, 'user-ph07', 1, 8, 0, 'Tablet', '2026-12-31', 1, '2024-05-20 08:45:00', '2024-05-20 08:45:00', '2024-05-20 08:45:00'),
(17, 'user-ph07', 6, 0, 0, 'Tablet', '2026-11-30', 1, '2024-05-20 08:45:00', '2024-05-20 08:45:00', '2024-05-20 08:45:00'),
(18, 'user-ph05', 4, 60, 0, 'Tablet', '2026-06-30', 1, '2024-05-20 09:00:00', '2024-05-20 09:00:00', '2024-05-20 09:00:00'),
(19, 'user-ph05', 8, 3, 0, 'Tablet', '2026-07-31', 1, '2024-05-20 09:00:00', '2024-05-20 09:00:00', '2024-05-20 09:00:00'),
(20, 'user-ph05', 9, 20, 0, 'Inhaler', '2026-10-31', 1, '2024-05-20 09:00:00', '2024-05-20 09:00:00', '2024-05-20 09:00:00'),
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
(1, 'user-d01', 1, '07:00', '10:00', 30, 1, 1, 'APPROVED', 'Online', NULL, NULL, 'Monday morning video consultations'),
(2, 'user-d01', 1, '13:30', '16:30', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Manhattan Health Clinic', 'Monday afternoon in-person'),
(3, 'user-d01', 1, '19:00', '21:00', 120, 1, 1, 'APPROVED', 'HomeVisit', 'EVENING', 'Patient home', 'Monday evening home visit shift'),
(4, 'user-d01', 3, '07:00', '10:30', 210, 1, 1, 'APPROVED', 'HomeVisit', 'MORNING', 'Patient home', 'Wednesday morning home visit shift'),
(5, 'user-d01', 3, '14:00', '17:00', 30, 1, 1, 'APPROVED', 'Online', NULL, NULL, 'Wednesday afternoon video consultations'),

-- Dr. Sarah Johnson (user-d02): Tue online morning + home visit afternoon; Thu online morning
(6, 'user-d02', 2, '08:00', '10:30', 20, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'Tuesday morning pediatric consultations'),
(7, 'user-d02', 2, '13:00', '17:30', 270, 1, 1, 'APPROVED', 'HomeVisit', 'AFTERNOON', 'Patient home', 'Tuesday afternoon home visit shift'),
(8, 'user-d02', 4, '07:00', '10:00', 20, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'Thursday morning pediatric consultations'),

-- Dr. Michael Chen (user-d03): Wed online morning + home visit afternoon + offline evening; Fri home visit morning
(9, 'user-d03', 3, '09:00', '10:30', 45, 1, 1, 'APPROVED', 'Online', NULL, NULL, 'Cardiology consultations'),
(10, 'user-d03', 3, '13:00', '17:30', 270, 1, 1, 'APPROVED', 'HomeVisit', 'AFTERNOON', 'Patient home', 'Wednesday afternoon home visit shift'),
(11, 'user-d03', 3, '19:00', '21:00', 45, 1, 1, 'APPROVED', 'Online', NULL, 'Bay Area Heart Center', 'Wednesday evening in-person'),
(12, 'user-d03', 5, '07:00', '10:30', 210, 1, 1, 'APPROVED', 'HomeVisit', 'MORNING', 'Patient home', 'Friday morning home visit shift'),

-- Other doctors: online-only schedules within valid windows
(13, 'user-d04', 4, '07:30', '10:30', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Chicago Medical Center', 'Thursday morning in-person'),
(14, 'user-d04', 4, '13:00', '16:00', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Chicago Medical Center', 'Thursday afternoon in-person'),
(15, 'user-d05', 5, '08:00', '10:30', 30, 1, 1, 'APPROVED', 'Online', NULL, NULL, 'OB/GYN video consultations'),
(16, 'user-d06', 6, '08:00', '10:30', 20, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'Dermatology online sessions'),
(17, 'user-d07', 1, '14:00', '17:30', 40, 1, 1, 'APPROVED', 'Online', NULL, 'Boston Neuro Institute', 'Neurology appointments'),
(18, 'user-d08', 2, '08:00', '10:30', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Philadelphia Eye Center', 'Eye examinations'),
(19, 'user-d09', 3, '13:30', '17:00', 25, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'ENT video consultations'),

-- Additional shifts so each doctor's weekly hours actually reach the 80h/month compliance
-- requirement (previously all 10 doctors were far below 80h/month despite scheduleStatus='APPROVED').
-- Dr. John Smith (user-d01): +5.5h/week (Friday) -> 20h/week total
(50, 'user-d01', 5, '07:00', '10:00', 30, 1, 1, 'APPROVED', 'Online', NULL, NULL, 'Friday morning video consultations'),
(51, 'user-d01', 5, '13:00', '15:30', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Manhattan Health Clinic', 'Friday afternoon in-person'),

-- Dr. Sarah Johnson (user-d02): +10h/week (Mon, Wed, Fri) -> 20h/week total
(52, 'user-d02', 1, '08:00', '10:30', 20, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'Monday morning pediatric consultations'),
(53, 'user-d02', 3, '13:00', '17:30', 270, 1, 1, 'APPROVED', 'HomeVisit', 'AFTERNOON', 'Patient home', 'Wednesday afternoon home visit shift'),
(54, 'user-d02', 5, '07:00', '10:00', 20, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'Friday morning pediatric consultations'),

-- Dr. Michael Chen (user-d03): +8.5h/week (Mon, Thu, Sat) -> 20h/week total
(55, 'user-d03', 1, '13:00', '16:30', 45, 1, 1, 'APPROVED', 'Online', NULL, 'Bay Area Heart Center', 'Monday afternoon in-person'),
(56, 'user-d03', 4, '07:00', '10:00', 45, 1, 1, 'APPROVED', 'Online', NULL, NULL, 'Cardiology consultations'),
(57, 'user-d03', 6, '08:00', '10:00', 45, 1, 1, 'APPROVED', 'Online', NULL, NULL, 'Cardiology consultations'),

-- Dr. Emily Davis (user-d04): +14h/week (Mon, Wed, Fri) -> 20h/week total
(58, 'user-d04', 1, '07:30', '10:30', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Chicago Medical Center', 'Monday morning in-person'),
(59, 'user-d04', 1, '13:00', '16:00', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Chicago Medical Center', 'Monday afternoon in-person'),
(60, 'user-d04', 3, '07:30', '10:30', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Chicago Medical Center', 'Wednesday morning in-person'),
(61, 'user-d04', 3, '13:00', '16:00', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Chicago Medical Center', 'Wednesday afternoon in-person'),
(62, 'user-d04', 5, '08:00', '10:00', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Chicago Medical Center', 'Friday morning in-person'),

-- Dr. Jessica Williams (user-d05): +17.5h/week (Mon, Wed, Thu) -> 20h/week total
(63, 'user-d05', 1, '08:00', '10:30', 30, 1, 1, 'APPROVED', 'Online', NULL, NULL, 'OB/GYN video consultations'),
(64, 'user-d05', 1, '13:00', '17:00', 30, 1, 1, 'APPROVED', 'Online', NULL, NULL, 'OB/GYN video consultations'),
(65, 'user-d05', 3, '08:00', '10:30', 30, 1, 1, 'APPROVED', 'Online', NULL, NULL, 'OB/GYN video consultations'),
(66, 'user-d05', 3, '13:00', '17:00', 30, 1, 1, 'APPROVED', 'Online', NULL, NULL, 'OB/GYN video consultations'),
(67, 'user-d05', 4, '08:00', '10:00', 30, 1, 1, 'APPROVED', 'Online', NULL, NULL, 'OB/GYN video consultations'),
(68, 'user-d05', 4, '13:00', '15:30', 30, 1, 1, 'APPROVED', 'Online', NULL, NULL, 'OB/GYN video consultations'),

-- Dr. Robert Brown (user-d06): +17.5h/week (Mon, Wed, Fri) -> 20h/week total
(69, 'user-d06', 1, '08:00', '10:30', 20, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'Dermatology online sessions'),
(70, 'user-d06', 1, '13:00', '17:00', 20, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'Dermatology online sessions'),
(71, 'user-d06', 3, '08:00', '10:30', 20, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'Dermatology online sessions'),
(72, 'user-d06', 3, '13:00', '17:00', 20, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'Dermatology online sessions'),
(73, 'user-d06', 5, '08:00', '10:00', 20, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'Dermatology online sessions'),
(74, 'user-d06', 5, '13:00', '15:30', 20, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'Dermatology online sessions'),

-- Dr. David Wilson (user-d07): +16.5h/week (Tue, Thu, Sat) -> 20h/week total
(75, 'user-d07', 2, '08:00', '10:30', 40, 1, 1, 'APPROVED', 'Online', NULL, 'Boston Neuro Institute', 'Neurology appointments'),
(76, 'user-d07', 2, '14:00', '17:30', 40, 1, 1, 'APPROVED', 'Online', NULL, 'Boston Neuro Institute', 'Neurology appointments'),
(77, 'user-d07', 4, '08:00', '10:30', 40, 1, 1, 'APPROVED', 'Online', NULL, 'Boston Neuro Institute', 'Neurology appointments'),
(78, 'user-d07', 4, '14:00', '17:30', 40, 1, 1, 'APPROVED', 'Online', NULL, 'Boston Neuro Institute', 'Neurology appointments'),
(79, 'user-d07', 6, '08:00', '10:30', 40, 1, 1, 'APPROVED', 'Online', NULL, 'Boston Neuro Institute', 'Neurology appointments'),
(80, 'user-d07', 6, '13:00', '15:00', 40, 1, 1, 'APPROVED', 'Online', NULL, 'Boston Neuro Institute', 'Neurology appointments'),

-- Dr. Amanda Lee (user-d08): +17.5h/week (Mon, Wed, Fri) -> 20h/week total
(81, 'user-d08', 1, '08:00', '10:30', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Philadelphia Eye Center', 'Eye examinations'),
(82, 'user-d08', 1, '13:00', '17:00', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Philadelphia Eye Center', 'Eye examinations'),
(83, 'user-d08', 3, '08:00', '10:30', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Philadelphia Eye Center', 'Eye examinations'),
(84, 'user-d08', 3, '13:00', '17:00', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Philadelphia Eye Center', 'Eye examinations'),
(85, 'user-d08', 5, '08:00', '10:00', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Philadelphia Eye Center', 'Eye examinations'),
(86, 'user-d08', 5, '13:00', '15:30', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Philadelphia Eye Center', 'Eye examinations'),

-- Dr. James Taylor (user-d09): +16.5h/week (Mon, Thu, Sat) -> 20h/week total
(87, 'user-d09', 1, '08:00', '10:30', 25, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'ENT video consultations'),
(88, 'user-d09', 1, '13:30', '17:00', 25, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'ENT video consultations'),
(89, 'user-d09', 4, '08:00', '10:30', 25, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'ENT video consultations'),
(90, 'user-d09', 4, '13:30', '17:00', 25, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'ENT video consultations'),
(91, 'user-d09', 6, '08:00', '10:30', 25, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'ENT video consultations'),
(92, 'user-d09', 6, '13:00', '15:00', 25, 2, 1, 'APPROVED', 'Online', NULL, NULL, 'ENT video consultations'),

-- Dr. Jennifer Martinez (user-d10): had NO schedule rows at all (scheduleStatus was wrongly
-- 'APPROVED' with zero hours) -> full 20.5h/week schedule built from scratch (Mon, Wed, Fri, Sat)
(93, 'user-d10', 1, '08:00', '10:30', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Smile Dental Center', 'Monday morning dental appointments'),
(94, 'user-d10', 1, '13:00', '17:00', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Smile Dental Center', 'Monday afternoon dental appointments'),
(95, 'user-d10', 3, '08:00', '10:30', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Smile Dental Center', 'Wednesday morning dental appointments'),
(96, 'user-d10', 3, '13:00', '17:00', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Smile Dental Center', 'Wednesday afternoon dental appointments'),
(97, 'user-d10', 5, '08:00', '10:30', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Smile Dental Center', 'Friday morning dental appointments'),
(98, 'user-d10', 5, '13:00', '16:00', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Smile Dental Center', 'Friday afternoon dental appointments'),
(99, 'user-d10', 6, '08:00', '10:00', 30, 1, 1, 'APPROVED', 'Online', NULL, 'Smile Dental Center', 'Saturday morning dental appointments');
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
(1, 'user-d01', 'user-p01', '2026-06-10 09:00:00', '2026-06-10 09:30:00', 'Online', '2026-06-09 09:05:00', '2026-06-09 09:00:00'),
(2, 'user-d02', 'user-p02', '2026-06-10 10:00:00', '2026-06-10 10:30:00', 'Online', '2026-06-09 09:10:00', '2026-06-09 09:05:00'),
(3, 'user-d07', 'user-p07', '2026-06-11 15:00:00', '2026-06-11 15:30:00', 'Online', '2026-06-09 09:15:00', '2026-06-09 09:10:00'),
(4, 'user-d08', 'user-p08', '2026-06-09 08:30:00', '2026-06-09 09:00:00', 'Online', '2026-06-09 08:35:00', '2026-06-09 08:30:00');
SET IDENTITY_INSERT AppointmentSlotHolds OFF;

-- 15. APPOINTMENTS (14 appointments)
SET IDENTITY_INSERT Appointments ON;
INSERT INTO Appointments (AppointmentID, AppointmentTime, ConsultationType, Status, symptoms, notes, fee, endTime, cancelReason, cancelledBy, cancelledAt, rescheduledFrom, followUpSourceAppointmentId, doctorReminderSent, reminderSent, patientFifteenMinuteReminderSent, confirmedAt, PatientID, DoctorID) VALUES
(1, '2024-05-10 09:00:00', 'Online', 'Completed', 'Headache and fatigue for 3 days', 'Patient needs follow-up', 50.00, '2024-05-10 09:30:00', NULL, NULL, NULL, NULL, NULL, 0, 1, 0, '2024-05-09 15:00:00', 'user-p01', 'user-d01'),
(2, '2024-05-11 10:00:00', 'Online', 'Completed', 'Child has fever and dry cough', 'Prescription provided', 50.00, '2024-05-11 10:20:00', NULL, NULL, NULL, NULL, NULL, 0, 1, 0, '2024-05-10 18:00:00', 'user-p02', 'user-d02'),
(3, '2024-05-12 09:30:00', 'Online', 'Completed', 'Chest pain and shortness of breath', 'Additional tests required', 50.00, '2024-05-12 10:15:00', NULL, NULL, NULL, NULL, NULL, 0, 1, 0, '2024-05-11 14:00:00', 'user-p03', 'user-d03'),
(4, '2024-05-15 08:00:00', 'Online', 'Completed', 'Abdominal pain in upper region', 'Surgery consultation', 50.00, '2024-05-15 08:30:00', NULL, NULL, NULL, NULL, NULL, 0, 1, 0, '2024-05-14 10:00:00', 'user-p04', 'user-d04'),
(5, '2024-05-16 14:00:00', 'Online', 'Completed', 'Routine prenatal checkup', 'Baby developing normally', 50.00, '2024-05-16 14:30:00', NULL, NULL, NULL, NULL, NULL, 0, 1, 0, '2024-05-15 09:00:00', 'user-p05', 'user-d05'),
(6, '2024-05-18 09:00:00', 'Online', 'Scheduled', 'Skin rash all over body', NULL, 50.00, NULL, NULL, NULL, NULL, NULL, NULL, 0, 1, 0, '2024-05-17 16:00:00', 'user-p06', 'user-d06'),
(7, '2024-05-20 15:00:00', 'Online', 'Confirmed', 'Severe headache and dizziness', NULL, 50.00, NULL, NULL, NULL, NULL, NULL, NULL, 0, 1, 0, '2024-05-19 11:00:00', 'user-p07', 'user-d07'),
(8, '2024-05-22 08:30:00', 'Online', 'Scheduled', 'Blurry vision and eye pain', NULL, 50.00, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, 'user-p08', 'user-d08'),
(9, '2024-05-13 14:00:00', 'Online', 'Cancelled', 'Sore throat, difficulty swallowing', 'Patient cancelled', NULL, NULL, 'Unexpected work commitment', 'Patient', '2024-05-13 08:00:00', NULL, NULL, 0, 1, 0, '2024-05-12 20:00:00', 'user-p09', 'user-d09'),
(10, '2024-05-25 10:00:00', 'Online', 'Scheduled', 'Toothache and swollen gums', NULL, 50.00, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, 'user-p10', 'user-d10'),
(11, '2024-05-24 16:00:00', 'Online', 'Completed', 'Follow-up after seasonal flu', 'Completed telehealth session for invoice generation test', 50.00, '2024-05-24 16:30:00', NULL, NULL, NULL, NULL, NULL, 0, 1, 0, '2024-05-24 15:50:00', 'user-p01', 'user-d01'),
(12, '2024-05-26 09:00:00', 'Online', 'Scheduled', 'Follow-up consultation', NULL, 50.00, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, 'user-p01', 'user-d01'),
(13, '2024-05-26 10:00:00', 'Online', 'Scheduled', 'Follow-up consultation', NULL, 50.00, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, 'user-p01', 'user-d01'),
(14, '2024-05-27 19:00:00', 'HomeVisit', 'Completed', 'Elderly patient has difficulty walking and needs home evaluation', 'Home visit completed with selected services', 103.00, '2024-05-27 20:40:00', NULL, NULL, NULL, NULL, NULL, 0, 1, 0, '2024-05-27 18:30:00', 'user-p01', 'user-d01');
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
 10.7769, 106.7009, 2.50, 10, 45, 10, 10, 10.00, 5.00);
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
(1, 1, '2024-05-10 09:00:00', '2024-05-10 09:28:00', 'Patient shows signs of stress and sleep deprivation', 'Mild anxiety disorder, work-related stress', '2024-05-24', NULL, 'Online', 'room-001', 'https://meet.healthlink.com/room-001', NULL, 28, 'Rest, stress management, medication as prescribed', 'Follow up in 2 weeks'),
(2, 2, '2024-05-11 10:00:00', '2024-05-11 10:18:00', 'Child has viral infection, no serious symptoms', 'Upper respiratory tract infection - viral', '2024-05-18', NULL, 'Online', 'room-002', 'https://meet.healthlink.com/room-002', NULL, 18, 'Fever medication, rest, fluid intake', 'Return if fever persists after 3 days'),
(3, 3, '2024-05-12 09:30:00', '2024-05-12 10:10:00', 'Suspected coronary artery disease, needs ECG and echo', 'Chest pain - suspected myocardial ischemia', '2024-05-19', NULL, 'Online', 'room-003', 'https://meet.healthlink.com/room-003', 'https://storage.healthlink.com/rec-003.mp4', 40, 'ECG, echocardiogram, cardiac enzymes test', 'Return with test results'),
(4, 4, '2024-05-15 08:00:00', '2024-05-15 08:25:00', 'Acute appendicitis confirmed, surgery required', 'Acute appendicitis', '2024-05-22', NULL, 'Online', NULL, NULL, NULL, 25, 'Hospital admission, surgery preparation', 'Post-surgery follow-up'),
(5, 5, '2024-05-16 14:00:00', '2024-05-16 14:25:00', '20 weeks pregnant, fetal development normal, heartbeat regular', 'Normal pregnancy', '2024-06-16', NULL, 'Online', 'room-005', 'https://meet.healthlink.com/room-005', NULL, 25, 'Continue prenatal vitamins, balanced diet', 'Next checkup in 4 weeks'),
(6, 6, '2024-05-18 09:00:00', NULL, NULL, NULL, NULL, NULL, 'Online', 'room-006', 'https://meet.healthlink.com/room-006', NULL, NULL, NULL, NULL),
(7, 7, '2024-05-20 15:00:00', NULL, NULL, NULL, NULL, NULL, 'Online', NULL, NULL, NULL, NULL, NULL, NULL),
(8, 8, NULL, NULL, NULL, NULL, NULL, NULL, 'Online', NULL, NULL, NULL, NULL, NULL, NULL),
(9, 9, NULL, NULL, 'Patient cancelled appointment', NULL, NULL, NULL, 'Online', 'room-009', NULL, NULL, NULL, NULL, NULL),
(10, 10, NULL, NULL, NULL, NULL, NULL, NULL, 'Online', NULL, NULL, NULL, NULL, NULL, NULL),
(11, 11, '2024-05-24 16:00:00', '2024-05-24 16:25:00', 'Stable condition, no new complaints', 'Recovered from seasonal flu, recommend rest and hydration', '2024-06-07', NULL, 'Online', 'room-011', 'https://meet.healthlink.com/room-011', NULL, 25, 'Rest, hydration, vitamin C', 'Return if fever recurs');
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
(1, 1, 'user-p01', 75.00, '2024-05-10 09:30:00', 'Paid', 'INV-2024-0001', 50.00, 25.00, 0, 0, 0, '2024-05-17', '2024-05-10 09:35:00', 'Paid online', 7.50, 42.50, 0.1500),
(2, 2, 'user-p02', 85.00, '2024-05-11 10:20:00', 'Paid', 'INV-2024-0002', 50.00, 35.00, 0, 0, 0, '2024-05-18', '2024-05-11 10:25:00', 'Paid via PayPal', 7.50, 42.50, 0.1500),
(3, 3, 'user-p03', 120.00, '2024-05-12 10:15:00', 'Paid', 'INV-2024-0003', 50.00, 70.00, 0, 0, 0, '2024-05-19', '2024-05-12 10:20:00', 'Includes lab test fees', 7.50, 42.50, 0.1500),
(4, 4, 'user-p04', 50.00, '2024-05-15 08:30:00', 'Pending', 'INV-2024-0004', 50.00, 0, 0, 0, 0, '2024-05-22', NULL, 'Awaiting payment', 7.50, 42.50, 0.1500),
(5, 5, 'user-p05', 75.00, '2024-05-16 14:30:00', 'Paid', 'INV-2024-0005', 50.00, 25.00, 0, 0, 0, '2024-05-23', '2024-05-16 14:35:00', 'Paid', 7.50, 42.50, 0.1500),
(6, 6, 'user-p06', 50.00, '2024-05-18 09:00:00', 'Pending', 'INV-2024-0006', 50.00, 0, 0, 0, 0, '2024-05-25', NULL, 'Pending consultation', NULL, NULL, NULL),
(7, 7, 'user-p07', 50.00, '2024-05-20 15:00:00', 'Pending', 'INV-2024-0007', 50.00, 0, 0, 0, 0, '2024-05-27', NULL, '50% deposit paid', 7.50, 42.50, 0.1500),
(8, 8, 'user-p08', 50.00, '2024-05-22 08:30:00', 'Pending', 'INV-2024-0008', 50.00, 0, 0, 0, 0, '2024-05-29', NULL, 'Not yet paid', NULL, NULL, NULL),
(9, 9, 'user-p09', 0, '2024-05-13 14:00:00', 'Cancelled', 'INV-2024-0009', 50.00, 0, 0, 50.00, 0, '2024-05-20', NULL, 'Refunded due to cancellation', NULL, NULL, NULL),
(10, 10, 'user-p10', 50.00, '2024-05-25 10:00:00', 'Pending', 'INV-2024-0010', 50.00, 0, 0, 0, 0, '2024-06-01', NULL, 'Pending consultation', NULL, NULL, NULL),
(11, 14, 'user-p01', 103.00, '2024-05-27 20:40:00', 'Paid', 'INV-2024-0011', 103.00, 0, 0, 0, 0, '2024-06-03', '2024-05-27 20:45:00', 'Paid Home Visit appointment via PayPal', 8.80, 94.20, 0.1000);
SET IDENTITY_INSERT Invoices OFF;

-- 22. PAYMENTS (11 payments)
SET IDENTITY_INSERT Payments ON;
INSERT INTO Payments (PaymentID, InvoiceID, OrderID, amount, paymentMethod, paymentGateway, transactionId, status, paidAt, failureReason, refundedAmount, refundedAt, refundReason, metadata, CreatedAt) VALUES
(1, 1, NULL, 75.00, 'Card', 'Stripe', 'STR20240510001', 'Completed', '2024-05-10 09:35:00', NULL, NULL, NULL, NULL, '{"cardLast4":"4242","cardBrand":"Visa"}', '2024-05-10 09:35:00'),
(2, 2, NULL, 85.00, 'EWallet', 'PayPal', 'PP20240511001', 'Completed', '2024-05-11 10:25:00', NULL, NULL, NULL, NULL, '{"payerId":"PAYPAL123"}', '2024-05-11 10:25:00'),
(3, 3, NULL, 120.00, 'Card', 'Stripe', 'STR20240512001', 'Completed', '2024-05-12 10:20:00', NULL, NULL, NULL, NULL, '{"cardLast4":"1234","cardBrand":"Mastercard"}', '2024-05-12 10:20:00'),
(4, 4, NULL, 25.00, 'Cash', NULL, NULL, 'Completed', '2024-05-15 08:00:00', NULL, NULL, NULL, NULL, NULL, '2024-05-15 08:00:00'),
(5, 5, NULL, 75.00, 'Card', 'Stripe', 'STR20240516001', 'Completed', '2024-05-16 14:35:00', NULL, NULL, NULL, NULL, '{"cardLast4":"5678","cardBrand":"Amex"}', '2024-05-16 14:35:00'),
(6, 6, NULL, 50.00, 'EWallet', 'Apple Pay', 'AP20240518001', 'Pending', NULL, NULL, NULL, NULL, NULL, '{"deviceId":"iPhone15"}', '2024-05-18 09:00:00'),
(7, 7, NULL, 25.00, 'Card', 'Stripe', 'STR20240519001', 'Completed', '2024-05-19 11:00:00', NULL, NULL, NULL, NULL, '{"cardLast4":"9012","cardBrand":"Visa"}', '2024-05-19 11:00:00'),
(8, 8, NULL, 50.00, 'Card', NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-22 08:30:00'),
(9, 9, NULL, 50.00, 'EWallet', 'PayPal', 'PP20240512002', 'Refunded', '2024-05-12 20:00:00', NULL, 50.00, '2024-05-13 09:00:00', 'Patient cancelled appointment', '{"refundId":"RF001"}', '2024-05-12 20:00:00'),
(10, 10, NULL, 50.00, 'Cash', NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-25 10:00:00'),
(11, 11, NULL, 103.00, 'EWallet', 'PayPal', 'PP20240527001', 'Completed', '2024-05-27 20:45:00', NULL, NULL, NULL, NULL, '{"payerId":"PAYPAL-HOME-VISIT","homeVisitServiceIds":[1,2]}', '2024-05-27 20:45:00');
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
(1, 'ORD-2024-0001', 1, NULL, 'user-ph01', 'user-p01', 'DELIVERED', 'Delivery', '12 Le Loi Street, District 1, Ho Chi Minh City', 10.7769, 106.7009, '0902000001', 'PROFILE', 5.99, 45.00, 50.99, 'PAID', 'COD', 'Deliver during office hours', 'Prescription verified', '2024-05-10 14:00:00', '2024-05-10 13:45:00', '2024-05-10 10:00:00', '2024-05-10 10:05:00', '2024-05-10 10:30:00', '2024-05-10 11:00:00', '2024-05-10 13:45:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-10 09:40:00', 0,3.60,47.39, 0.0800),
(2, 'ORD-2024-0002', 2, NULL, 'user-ph02', 'user-p02', 'DELIVERED', 'Delivery', '123 Maple Avenue, Los Angeles, CA', 34.0522, -118.2437, '0923456789', 'PROFILE', 6.99, 35.00, 41.99, 'PAID', 'Card', 'Urgent for child', 'Priority delivery', '2024-05-11 15:00:00', '2024-05-11 14:30:00', '2024-05-11 11:00:00', '2024-05-11 11:05:00', '2024-05-11 11:30:00', '2024-05-11 12:00:00', '2024-05-11 14:30:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-11 10:30:00', 0,2.80,39.19, 0.0800),
(3, 'ORD-2024-0003', 3, NULL, 'user-ph04', 'user-p03', 'SHIPPING', 'Delivery', '78 Pine Road, Chicago, IL', 41.8781, -87.6298, '0934567890', 'PROFILE', 7.99, 75.00, 82.99, 'PAID', 'EWallet', NULL, 'In transit', '2024-05-12 16:00:00', NULL, '2024-05-12 11:00:00', '2024-05-12 11:05:00', '2024-05-12 11:30:00', '2024-05-12 14:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-12 10:30:00', 0,6.00,76.99, 0.0800),
(4, 'ORD-2024-0004', 4, NULL, 'user-ph06', 'user-p04', 'PREPARING', 'Pickup', NULL, NULL, NULL, NULL, NULL, 0, 40.00, 40.00, 'PENDING', 'Cash', 'Will pick up in person', 'Preparing order', NULL, NULL, '2024-05-15 09:00:00', '2024-05-15 09:05:00', '2024-05-15 09:30:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-15 08:35:00', 0, 3.20, 36.80, 0.0800),
(5, 'ORD-2024-0005', 5, NULL, 'user-ph02', 'user-p05', 'CONFIRMED', 'Delivery', '234 Elm Street, San Francisco, CA', 37.7749, -122.4194, '0956789012', 'PROFILE', 6.99, 55.00, 61.99, 'PAID', 'Card', NULL, NULL, '2024-05-16 18:00:00', NULL, '2024-05-16 15:00:00', '2024-05-16 15:05:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-16 14:40:00', 0,4.40,57.59, 0.0800),
(6, 'ORD-2024-0006', 6, NULL, 'user-ph05', 'user-p01', 'CANCELLED', 'Delivery', '12 Le Loi Street, District 1, Ho Chi Minh City', 10.7769, 106.7009, '0902000001', 'PROFILE', 5.49, 25.00, 30.49, 'REFUNDED', 'EWallet', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-04-11 08:00:00', 'Prescription expired', 'System', NULL, NULL, NULL, '2024-04-10 16:00:00', 0,2.00,28.49, 0.0800),
(7, 'ORD-2024-0007', 7, NULL, 'user-ph02', 'user-p02', 'DELIVERED', 'Delivery', '123 Maple Avenue, Los Angeles', 34.0522, -118.2437, '0923456789', 'PROFILE', 6.99, 50.00, 56.99, 'PAID', 'COD', NULL, 'OK', '2024-03-16 12:00:00', '2024-03-16 11:30:00', '2024-03-15 16:00:00', '2024-03-15 16:05:00', '2024-03-15 16:30:00', '2024-03-16 09:00:00', '2024-03-16 11:30:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-03-15 15:30:00', 0,4.00,52.99, 0.0800),
(8, 'ORD-2024-0008', 8, NULL, 'user-ph04', 'user-p03', 'DELIVERED', 'Pickup', NULL, NULL, NULL, NULL, NULL, 0, 65.00, 65.00, 'PAID', 'Cash', 'Store pickup', 'Completed', NULL, '2024-04-02 10:00:00', '2024-04-01 14:00:00', '2024-04-01 14:05:00', '2024-04-01 14:30:00', NULL, '2024-04-02 10:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-04-01 13:00:00', 0, 5.20, 59.80, 0.0800),
(9, 'ORD-2024-0009', 9, NULL, 'user-ph01', 'user-p05', 'DELIVERED', 'Delivery', '234 Elm Street, San Francisco', 37.7749, -122.4194, '0956789012', 'PROFILE', 5.99, 60.00, 65.99, 'PAID', 'Card', NULL, 'Delivered successfully', '2024-04-17 15:00:00', '2024-04-17 14:30:00', '2024-04-16 17:00:00', '2024-04-16 17:05:00', '2024-04-16 17:30:00', '2024-04-17 09:00:00', '2024-04-17 14:30:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-04-16 16:30:00', 0,4.80,61.19, 0.0800),
(10, 'ORD-2024-0010', 10, NULL, 'user-ph07', 'user-p07', 'PENDING', 'Delivery', '12 Walnut Drive, Miami, FL', 25.7617, -80.1918, '0978901234', 'PROFILE', 5.99, 48.00, 53.99, 'PENDING', 'COD', 'Afternoon delivery', NULL, '2024-05-21 17:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-20 15:30:00', 0,3.84,50.15, 0.0800),
(11, 'ORD-2024-0011', 10, 4, 'user-ph07', 'user-p07', 'PENDING', 'Delivery', '12 Walnut Drive, Miami, FL', 25.7617, -80.1918, '0978901234', 'PROFILE', 5.99, 48.00, 53.99, 'PENDING', 'PayPal', 'Quote prepared from consultation request; waiting patient confirmation', 'Third-party courier quoted delivery by late afternoon', '2024-05-21 17:00:00', NULL, '2024-05-20 16:05:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-20 16:05:00', 0,3.84,50.15, 0.0800),
(12, 'ORD-2024-0012', 1, NULL, 'user-ph01', 'user-p01', 'CONFIRMED', 'Delivery', '12 Le Loi Street, District 1, Ho Chi Minh City', 10.7769, 106.7009, '0902000001', 'PROFILE', 5.99, 45.00, 50.99, 'PENDING', 'PayPal', 'Patient confirmed quote and is on payment step', 'Delivery fee and estimated time confirmed by third-party courier', '2024-05-20 19:30:00', NULL, '2024-05-20 17:00:00', '2024-05-20 17:05:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-20 16:55:00', 0,3.60,47.39, 0.0800),
(13, 'ORD-2024-0013', 2, NULL, 'user-ph02', 'user-p02', 'COMPLETED', 'Delivery', '123 Maple Avenue, Los Angeles, CA', 34.0522, -118.2437, '0923456789', 'PROFILE', 6.99, 35.00, 41.99, 'PAID', 'PayPal', 'Completed PayPal pharmacy order', 'Delivered and completed', '2024-05-21 15:00:00', '2024-05-21 14:30:00', '2024-05-21 11:00:00', '2024-05-21 11:05:00', '2024-05-21 11:30:00', '2024-05-21 12:00:00', '2024-05-21 14:30:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-21 10:30:00', 1,2.80,39.19, 0.0800),
(14, 'ORD-2024-0014', 3, NULL, 'user-ph04', 'user-p03', 'REFUNDED', 'Delivery', '78 Pine Road, Chicago, IL', 41.8781, -87.6298, '0934567890', 'PROFILE', 7.99, 75.00, 82.99, 'REFUNDED', 'PayPal', 'Refunded due to partial stock rejection', 'Refund processed after patient declined substitute', '2024-05-22 16:00:00', NULL, '2024-05-22 11:00:00', '2024-05-22 11:05:00', NULL, NULL, NULL, '2024-05-22 12:30:00', 'Patient declined partial fulfillment', 'Patient', NULL, NULL, NULL, '2024-05-22 10:30:00', 0,6.00,76.99, 0.0800),
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
(12, NULL, 13, 'user-p02', 41.99, '2024-05-21 14:30:00', 'PAID', 'INV-PH-2024-0012', 0, 35.00, 6.99, 0, 0, '2024-05-28', '2024-05-21 14:35:00', 'Paid pharmacy order invoice via PayPal',2.80, NULL, 0.0800),
(13, NULL, 12, 'user-p01', 50.99, '2024-05-20 17:05:00', 'PENDING', 'INV-PH-2024-0013', 0, 45.00, 5.99, 0, 0, '2024-05-27', NULL, 'Awaiting PayPal payment after patient confirmed quote',3.60, NULL, 0.0800),
(14, NULL, 14, 'user-p03', 82.99, '2024-05-22 11:05:00', 'REFUNDED', 'INV-PH-2024-0014', 0, 75.00, 7.99, 0, 0, '2024-05-29', '2024-05-22 11:10:00', 'Refunded pharmacy order invoice',6.00, NULL, 0.0800),
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
('pharm-chat-002', 'user-p02', 'user-ph02', 'Emma Thompson', 'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', 'An Khang Pharmacy - Nguyen Hue', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_02.png', 'We are checking the child dosage now.', '2024-05-20 15:22:00', NULL, NULL),
('pharm-chat-003', 'user-p03', 'user-ph04', 'William Brown', 'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', 'CVS Pharmacy - SF', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_04.png', 'Amlodipine stock is short today.', '2024-05-20 15:44:00', NULL, NULL),
('pharm-chat-004', 'user-p07', 'user-ph07', 'Daniel Miller', 'http://localhost:8096/uploads/avatars/patients/benhnhan_07.png', 'MedExpress Pharmacy', 'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_07.png', 'Quote is ready with delivery ETA.', '2024-05-20 16:05:00', NULL, NULL);

-- 33. MESSAGES (6 messages, pharmacy chat rooms only)
INSERT INTO ChatMessages (MessageID, ChatRoomId, SenderId, ReceiverId, content, photoURL, imageUrl, videoUrl, fileUrl, IsRead, SentAt) VALUES
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
(1, 'CTX-202405-00001', 'APPOINTMENT', 1, NULL, 'DOCTOR', 'user-d01', 'Dr. John Smith', 'CONSULTATION_ONLINE', 50.00, 0.1500, 7.50, 42.50, 'SETTLED', 1, '2024-05-10 10:00:00'),
(2, 'CTX-202405-00002', 'PHARMACY_ORDER', NULL, 1, 'PHARMACY', 'user-ph01', 'HealthLink Pharmacy - Ben Thanh', 'PHARMACY_ORDER', 50.99, 0.0800, 4.08, 46.91, 'SETTLED', 2, '2024-05-10 13:45:00'),
(3, 'CTX-202405-00003', 'APPOINTMENT', 2, NULL, 'DOCTOR', 'user-d02', 'Dr. Sarah Johnson', 'CONSULTATION_ONLINE', 50.00, 0.1500, 7.50, 42.50, 'SETTLED', 1, '2024-05-11 10:20:00'),
(4, 'CTX-202405-00004', 'PHARMACY_ORDER', NULL, 2, 'PHARMACY', 'user-ph02', 'An Khang Pharmacy - Nguyen Hue', 'PHARMACY_ORDER', 41.99, 0.0800, 3.36, 38.63, 'SETTLED', 2, '2024-05-11 14:30:00'),
(5, 'CTX-202405-00005', 'APPOINTMENT', 3, NULL, 'DOCTOR', 'user-d03', 'Dr. Michael Chen', 'CONSULTATION_ONLINE', 50.00, 0.1500, 7.50, 42.50, 'SETTLED', 1, '2024-05-12 10:15:00'),
(6, 'CTX-202405-00006', 'PHARMACY_ORDER', NULL, 3, 'PHARMACY', 'user-ph04', 'CVS Pharmacy - SF', 'PHARMACY_ORDER', 82.99, 0.0800, 6.64, 76.35, 'PENDING', 2, '2024-05-12 14:00:00'),
(7, 'CTX-202405-00007', 'APPOINTMENT', 5, NULL, 'DOCTOR', 'user-d05', 'Dr. Jessica Williams', 'CONSULTATION_ONLINE', 50.00, 0.1500, 7.50, 42.50, 'SETTLED', 3, '2024-05-16 14:30:00'),
(8, 'CTX-202405-00008', 'PHARMACY_ORDER', NULL, 5, 'PHARMACY', 'user-ph02', 'An Khang Pharmacy - Nguyen Hue', 'PHARMACY_ORDER', 61.99, 0.0800, 4.96, 57.03, 'SETTLED', 2, '2024-05-16 18:00:00'),
(9, 'CTX-202405-00009', 'APPOINTMENT', 7, NULL, 'DOCTOR', 'user-d07', 'Dr. David Wilson', 'CONSULTATION_ONLINE', 50.00, 0.1500, 7.50, 42.50, 'PENDING', 3, '2024-05-20 15:00:00'),
(10, 'CTX-202405-00010', 'PHARMACY_ORDER', NULL, 10, 'PHARMACY', 'user-ph07', 'MedExpress Pharmacy', 'PHARMACY_ORDER', 53.99, 0.0800, 4.32, 49.67, 'PENDING', 2, '2024-05-20 15:30:00'),
(11, 'CTX-202405-00011', 'PHARMACY_ORDER', NULL, 12, 'PHARMACY', 'user-ph01', 'HealthLink Pharmacy - Ben Thanh', 'PHARMACY_ORDER', 50.99, 0.0800, 4.08, 46.91, 'PENDING', NULL, '2024-05-20 17:05:00'),
(12, 'CTX-202405-00012', 'PHARMACY_ORDER', NULL, 13, 'PHARMACY', 'user-ph02', 'An Khang Pharmacy - Nguyen Hue', 'PHARMACY_ORDER', 41.99, 0.0800, 3.36, 38.63, 'PENDING', NULL, '2024-05-21 14:35:00'),
(13, 'CTX-202405-00013', 'PHARMACY_ORDER', NULL, 14, 'PHARMACY', 'user-ph04', 'CVS Pharmacy - SF', 'PHARMACY_ORDER', 82.99, 0.0800, 6.64, 76.35, 'REFUNDED', NULL, '2024-05-22 12:30:00'),
(14, 'CTX-202405-00014', 'PHARMACY_ORDER', NULL, 15, 'PHARMACY', 'user-ph06', 'Hospital Pharmacy - NYC', 'PHARMACY_ORDER', 40.00, 0.0800, 3.20, 36.80, 'PENDING', NULL, '2024-05-23 09:10:00'),
(15, 'CTX-202405-00015', 'APPOINTMENT', 14, NULL, 'DOCTOR', 'user-d01', 'Dr. John Smith', 'CONSULTATION_HOME_VISIT', 103.00, 0.1000, 8.80, 94.20, 'PENDING', NULL, '2024-05-27 20:45:00');
-- 16-22: Seven daily transactions ending today (D0..D6)
INSERT INTO CommissionTransactions (TransactionId, transactionNumber, sourceType, appointmentId, pharmacyOrderId, recipientType, recipientId, recipientName, serviceType, grossAmount, commissionRate, commissionAmount, netAmount, status, SettlementId, CreatedAt) VALUES
(16, 'CTX-DEMO-PH01-D0', 'PHARMACY_ORDER', NULL, 1, 'PHARMACY', 'user-ph01', 'HealthLink Pharmacy - Ben Thanh', 'PHARMACY_ORDER', 32.61, 0.0800, 2.61, 30.00, 'SETTLED', NULL, DATEADD(DAY, -6, GETDATE())),
(17, 'CTX-DEMO-PH01-D1', 'PHARMACY_ORDER', NULL, 9, 'PHARMACY', 'user-ph01', 'HealthLink Pharmacy - Ben Thanh', 'PHARMACY_ORDER', 54.35, 0.0800, 4.35, 50.00, 'VESTED', NULL, DATEADD(DAY, -5, GETDATE())),
(18, 'CTX-DEMO-PH01-D2', 'PHARMACY_ORDER', NULL, 12, 'PHARMACY', 'user-ph01', 'HealthLink Pharmacy - Ben Thanh', 'PHARMACY_ORDER', 21.74, 0.0800, 1.74, 20.00, 'SETTLED', NULL, DATEADD(DAY, -4, GETDATE())),
(19, 'CTX-DEMO-PH01-D3', 'PHARMACY_ORDER', NULL, 1, 'PHARMACY', 'user-ph01', 'HealthLink Pharmacy - Ben Thanh', 'PHARMACY_ORDER', 43.48, 0.0800, 3.48, 40.00, 'PENDING', NULL, DATEADD(DAY, -3, GETDATE())),
(20, 'CTX-DEMO-PH01-D4', 'PHARMACY_ORDER', NULL, 9, 'PHARMACY', 'user-ph01', 'HealthLink Pharmacy - Ben Thanh', 'PHARMACY_ORDER', 65.22, 0.0800, 5.22, 60.00, 'VESTED', NULL, DATEADD(DAY, -2, GETDATE())),
(21, 'CTX-DEMO-PH01-D5', 'PHARMACY_ORDER', NULL, 12, 'PHARMACY', 'user-ph01', 'HealthLink Pharmacy - Ben Thanh', 'PHARMACY_ORDER', 32.61, 0.0800, 2.61, 30.00, 'SETTLED', NULL, DATEADD(DAY, -1, GETDATE())),
(22, 'CTX-DEMO-PH01-D6', 'PHARMACY_ORDER', NULL, 1, 'PHARMACY', 'user-ph01', 'HealthLink Pharmacy - Ben Thanh', 'PHARMACY_ORDER', 16.30, 0.0800, 1.30, 15.00, 'PENDING', NULL, GETDATE());

-- 23-52: Thirty daily transactions spanning last 30 days
INSERT INTO CommissionTransactions (TransactionId, transactionNumber, sourceType, appointmentId, pharmacyOrderId, recipientType, recipientId, recipientName, serviceType, grossAmount, commissionRate, commissionAmount, netAmount, status, SettlementId, CreatedAt)
SELECT
    22 + v.n,
    'CTX-DEMO-PH01-D' + RIGHT('0' + CAST(v.n AS VARCHAR), 2),
    'PHARMACY_ORDER', NULL,
    CASE v.n % 3 WHEN 1 THEN 9 WHEN 2 THEN 12 ELSE 1 END,
    'PHARMACY', 'user-ph01', 'HealthLink Pharmacy - Ben Thanh', 'PHARMACY_ORDER',
    CASE v.n % 5
        WHEN 0 THEN 54.35 WHEN 1 THEN 32.61
        WHEN 2 THEN 43.48 WHEN 3 THEN 21.74
        ELSE 65.22
    END,
    0.0800,
    CASE v.n % 5
        WHEN 0 THEN 4.35 WHEN 1 THEN 2.61
        WHEN 2 THEN 3.48 WHEN 3 THEN 1.74
        ELSE 5.22
    END,
    CASE v.n % 5
        WHEN 0 THEN 50.00 WHEN 1 THEN 30.00
        WHEN 2 THEN 40.00 WHEN 3 THEN 20.00
        ELSE 60.00
    END,
    CASE v.n % 3
        WHEN 0 THEN 'SETTLED' WHEN 1 THEN 'VESTED'
        ELSE 'PENDING'
    END,
    NULL,
    DATEADD(DAY, -v.n, GETDATE())
FROM (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16),(17),(18),(19),(20),(21),(22),(23),(24),(25),(26),(27),(28),(29),(30)) v(n);

-- 53-64: Twelve monthly transactions spanning last 12 months
INSERT INTO CommissionTransactions (TransactionId, transactionNumber, sourceType, appointmentId, pharmacyOrderId, recipientType, recipientId, recipientName, serviceType, grossAmount, commissionRate, commissionAmount, netAmount, status, SettlementId, CreatedAt)
SELECT
    52 + v.n,
    'CTX-DEMO-PH01-M' + RIGHT('0' + CAST(v.n AS VARCHAR), 2),
    'PHARMACY_ORDER', NULL,
    CASE v.n % 3 WHEN 1 THEN 9 WHEN 2 THEN 12 ELSE 1 END,
    'PHARMACY', 'user-ph01', 'HealthLink Pharmacy - Ben Thanh', 'PHARMACY_ORDER',
    CASE v.n % 5
        WHEN 0 THEN 54.35 WHEN 1 THEN 32.61
        WHEN 2 THEN 43.48 WHEN 3 THEN 21.74
        ELSE 65.22
    END,
    0.0800,
    CASE v.n % 5
        WHEN 0 THEN 4.35 WHEN 1 THEN 2.61
        WHEN 2 THEN 3.48 WHEN 3 THEN 1.74
        ELSE 5.22
    END,
    CASE v.n % 5
        WHEN 0 THEN 50.00 WHEN 1 THEN 30.00
        WHEN 2 THEN 40.00 WHEN 3 THEN 20.00
        ELSE 60.00
    END,
    CASE v.n % 3
        WHEN 0 THEN 'SETTLED' WHEN 1 THEN 'VESTED'
        ELSE 'PENDING'
    END,
    NULL,
    DATEADD(MONTH, -v.n + 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 15))
FROM (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12)) v(n);

-- Reconcile user-ph01 wallet totals
UPDATE p
SET TotalEarnings = totals.TotalEarnings,
    PendingSettlement = totals.PendingSettlement
FROM Pharmacies p
CROSS APPLY (
    SELECT
        COALESCE(SUM(CASE WHEN ct.status <> 'REFUNDED' THEN ct.netAmount ELSE 0 END), 0) AS TotalEarnings,
        COALESCE(SUM(CASE WHEN ct.status = 'VESTED' THEN ct.netAmount ELSE 0 END), 0) AS PendingSettlement
    FROM CommissionTransactions ct
    WHERE ct.recipientId = p.PharmacyId
) totals
WHERE p.PharmacyId = 'user-ph01';
SET IDENTITY_INSERT CommissionTransactions OFF;

-- 43.5 PARTNER_WALLET_ENTRIES (seed earnings for user-ph01 from CommissionTransactions)
INSERT INTO PartnerWalletEntries (
    partnerType, partnerId, entryType, status, amount, commissionTransactionId,
    appointmentId, pharmacyOrderId, IdempotencyKey, description,
    effectiveAt, createdAt, updatedAt
)
SELECT
    'PHARMACY' AS partnerType,
    ct.RecipientId AS partnerId,
    'EARNING' AS entryType,
    CASE WHEN ct.Status = 'PENDING' THEN 'PENDING' ELSE 'VESTED' END AS status,
    ct.NetAmount AS amount,
    ct.TransactionId AS commissionTransactionId,
    ct.AppointmentId,
    ct.PharmacyOrderId,
    'EARNING:CTX:' + CAST(ct.TransactionId AS VARCHAR) AS IdempotencyKey,
    'Seed earning' AS description,
    ct.CreatedAt AS effectiveAt,
    ct.CreatedAt AS createdAt,
    ct.CreatedAt AS updatedAt
FROM CommissionTransactions ct
WHERE ct.RecipientId = 'user-ph01';

-- 43.6 PARTNER_WALLET_ENTRIES (seed earnings for doctors from CommissionTransactions)
INSERT INTO PartnerWalletEntries (
    partnerType, partnerId, entryType, status, amount, commissionTransactionId,
    appointmentId, pharmacyOrderId, IdempotencyKey, description,
    effectiveAt, createdAt, updatedAt
)
SELECT
    'DOCTOR' AS partnerType,
    ct.RecipientId AS partnerId,
    'EARNING' AS entryType,
    CASE WHEN ct.Status = 'PENDING' THEN 'PENDING' ELSE 'VESTED' END AS status,
    ct.NetAmount AS amount,
    ct.TransactionId AS commissionTransactionId,
    ct.AppointmentId,
    ct.PharmacyOrderId,
    'EARNING:CTX:' + CAST(ct.TransactionId AS VARCHAR) AS IdempotencyKey,
    'Seed earning' AS description,
    ct.CreatedAt AS effectiveAt,
    ct.CreatedAt AS createdAt,
    ct.CreatedAt AS updatedAt
FROM CommissionTransactions ct
WHERE ct.RecipientType = 'DOCTOR';
-- ponytail: no NOT EXISTS guard — seed runs on fresh DB, consistent with all other seed INSERTs

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
INSERT INTO EmailVerificationTokens (Id, Token, UserId, NewEmail, ExpiryDate, Used, Type, CreatedAt, FailedAttempts) VALUES
(1, 'evt-user-p01-001', 'user-p01', 'michael.new@email.com', '2024-06-10 08:00:00', 0, 'EMAIL_VERIFICATION', '2024-05-10 08:00:00', 0),
(2, 'evt-user-d01-002', 'user-d01', 'doctor01.new@healthlink.com', '2024-06-10 07:30:00', 0, 'EMAIL_VERIFICATION', '2024-05-10 07:30:00', 0),
(3, 'evt-user-p02-003', 'user-p02', 'emma.updated@email.com', '2024-06-11 09:00:00', 1, 'EMAIL_VERIFICATION', '2024-05-11 09:00:00', 0),
(4, 'evt-user-ph01-004', 'user-ph01', 'pharmacy01.new@example.com', '2024-06-10 06:00:00', 0, 'EMAIL_VERIFICATION', '2024-05-10 06:00:00', 0),
(5, 'evt-user-p03-005', 'user-p03', 'william.alternate@email.com', '2024-06-12 08:30:00', 0, 'EMAIL_VERIFICATION', '2024-05-12 08:30:00', 0);
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
    (N'user-d11', N'Dr. Nguyen Minh Anh', N'MD - University of Medicine and Pharmacy HCMC', N'Internal Medicine', 9, N'Vietnamese, English', N'Ho Chi Minh City', N'http://localhost:8096/uploads/avatars/doctors/bacsi_11.png', N'General internal medicine doctor focused on chronic disease follow-up', 50.00, 10.7769, 106.7009, N'Saigon Family Clinic', N'45 Nguyen Thi Minh Khai, District 1, Ho Chi Minh City', 4.0, 2, 1, 1, 260.00, 40.00, N'dr.nguyen.minhanh@healthlink.com', N'APPROVED', N'2234567890', N'Vietcombank', NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
    (N'user-d12', N'Dr. Tran Quoc Bao', N'MD - Hanoi Medical University', N'Pediatrics', 11, N'Vietnamese, English', N'Ha Noi', N'http://localhost:8096/uploads/avatars/doctors/bacsi_12.png', N'Pediatrician experienced in fever, allergy, and nutrition counseling', 50.00, 21.0278, 105.8342, N'Hoan Kiem Children Clinic', N'18 Trang Thi, Hoan Kiem, Ha Noi', 4.0, 2, 1, 3, 310.00, 55.00, N'dr.tran.quocbao@healthlink.com', N'APPROVED', N'2234567891', N'Techcombank', NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
    (N'user-d13', N'Dr. Le Hoang Phuc', N'MD, MSc - Hue University of Medicine', N'Cardiology', 16, N'Vietnamese, English', N'Da Nang', N'http://localhost:8096/uploads/avatars/doctors/bacsi_13.png', N'Cardiologist for hypertension, arrhythmia, and follow-up care', 50.00, 16.0471, 108.2068, N'Da Nang Heart Clinic', N'72 Nguyen Van Linh, Hai Chau, Da Nang', 4.6, 5, 1, 6, 480.00, 90.00, N'dr.le.hoangphuc@healthlink.com', N'APPROVED', N'2234567892', N'ACB', NULL, NULL, NULL, NULL, NULL, NULL, N'PREMIUM'),
    (N'user-d14', N'Dr. Pham Thu Ha', N'MD - University of Medicine Pham Ngoc Thach', N'Dermatology', 8, N'Vietnamese, English', N'Ho Chi Minh City', N'http://localhost:8096/uploads/avatars/doctors/bacsi_14.png', N'Dermatology doctor treating acne, dermatitis, and skin allergies', 50.00, 10.8015, 106.7148, N'Gia Dinh Skin Clinic', N'201 Phan Dang Luu, Binh Thanh, Ho Chi Minh City', 4.5, 2, 1, 5, 210.00, 35.00, N'dr.pham.thuha@healthlink.com', N'APPROVED', N'2234567893', N'MB Bank', NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
    (N'user-d15', N'Dr. Vo Gia Huy', N'MD, FACS - Cho Ray Hospital', N'Surgery', 13, N'Vietnamese, English', N'Ho Chi Minh City', N'http://localhost:8096/uploads/avatars/doctors/bacsi_15.png', N'General surgeon providing pre-op and post-op consultation', 50.00, 10.7553, 106.6606, N'Cho Ray Surgical Clinic', N'201B Nguyen Chi Thanh, District 5, Ho Chi Minh City', 4.5, 2, 1, 2, 390.00, 65.00, N'dr.vo.giahuy@healthlink.com', N'APPROVED', N'2234567894', N'BIDV', NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
    (N'user-d16', N'Dr. Bui Lan Chi', N'MD, FACOG - Tu Du Hospital', N'Obstetrics & Gynecology', 10, N'Vietnamese, English', N'Ho Chi Minh City', N'http://localhost:8096/uploads/avatars/doctors/bacsi_16.png', N'Women health doctor for prenatal care and gynecology counseling', 50.00, 10.7680, 106.6834, N'Tu Du Women Clinic', N'284 Cong Quynh, District 1, Ho Chi Minh City', 4.5, 4, 1, 4, 430.00, 80.00, N'dr.bui.lanchi@healthlink.com', N'APPROVED', N'2234567895', N'VietinBank', NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
    (N'user-d17', N'Dr. Dang Viet Khoa', N'MD, PhD - Bach Mai Hospital', N'Neurology', 18, N'Vietnamese, English, French', N'Ha Noi', N'http://localhost:8096/uploads/avatars/doctors/bacsi_17.png', N'Neurologist for headache, stroke follow-up, and nerve disorders', 50.00, 21.0002, 105.8412, N'Bach Mai Neurology Center', N'78 Giai Phong, Dong Da, Ha Noi', 5.0, 2, 1, 7, 520.00, 120.00, N'dr.dang.vietkhoa@healthlink.com', N'APPROVED', N'2234567896', N'Agribank', NULL, NULL, NULL, NULL, NULL, NULL, N'PREMIUM'),
    (N'user-d18', N'Dr. Ho Thi Ngoc', N'MD - National Eye Hospital', N'Ophthalmology', 12, N'Vietnamese, English', N'Ha Noi', N'http://localhost:8096/uploads/avatars/doctors/bacsi_18.png', N'Ophthalmologist for eye exams, dry eyes, and vision screening', 50.00, 21.0227, 105.8461, N'Central Eye Clinic', N'85 Ba Trieu, Hai Ba Trung, Ha Noi', 3.5, 2, 1, 8, 300.00, 50.00, N'dr.ho.thingoc@healthlink.com', N'APPROVED', N'2234567897', N'Sacombank', NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
    (N'user-d19', N'Dr. Ngo Thanh Son', N'MD - Thai Binh University of Medicine', N'ENT', 7, N'Vietnamese, English', N'Can Tho', N'http://localhost:8096/uploads/avatars/doctors/bacsi_19.png', N'ENT doctor treating sinusitis, throat infection, and hearing concerns', 50.00, 10.0452, 105.7469, N'Can Tho ENT Clinic', N'16 Hoa Binh Avenue, Ninh Kieu, Can Tho', 4.5, 4, 1, 9, 180.00, 25.00, N'dr.ngo.thanhson@healthlink.com', N'APPROVED', N'2234567898', N'OCB', NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
    (N'user-d20', N'Dr. Do Mai Linh', N'DDS - Ho Chi Minh City Odonto-Stomatology University', N'Dentistry', 9, N'Vietnamese, English', N'Ho Chi Minh City', N'http://localhost:8096/uploads/avatars/doctors/bacsi_20.png', N'Dentist focused on preventive care, scaling, and cosmetic dentistry', 50.00, 10.7901, 106.6802, N'SmileCare Dental', N'90 Nguyen Dinh Chieu, District 3, Ho Chi Minh City', 4.5, 2, 1, 10, 240.00, 45.00, N'dr.do.mailinh@healthlink.com', N'APPROVED', N'2234567899', N'VPBank', NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD');

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

-- =====================================================
-- 47b. ANALYTICS DOCTORS (user-da001..035)
-- Created early so Reviews (section 50b) can reference them
-- without FK violations. Safe to re-run (DELETE + INSERT).
-- =====================================================
DELETE FROM Doctors WHERE DoctorID LIKE 'user-da[0-9][0-9][0-9]';
DELETE FROM Users WHERE Id LIKE 'user-da[0-9][0-9][0-9]';
GO
INSERT INTO Users (Id, UserName, Email, EmailConfirmed, PasswordHash, PhoneNumber, AccessFailedCount, CreatedDate, Status, LastLoginAt, RoleId) VALUES
(N'user-da001', N'doctor_da001', N'doctor.da001@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000001', 0, '2024-01-05 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da002', N'doctor_da002', N'doctor.da002@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000002', 0, '2024-01-15 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da003', N'doctor_da003', N'doctor.da003@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000003', 0, '2024-01-25 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da004', N'doctor_da004', N'doctor.da004@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000004', 0, '2024-02-10 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da005', N'doctor_da005', N'doctor.da005@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000005', 0, '2024-03-08 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da006', N'doctor_da006', N'doctor.da006@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000006', 0, '2024-03-22 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da007', N'doctor_da007', N'doctor.da007@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000007', 0, '2024-04-05 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da008', N'doctor_da008', N'doctor.da008@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000008', 0, '2024-04-15 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da009', N'doctor_da009', N'doctor.da009@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000009', 0, '2024-04-25 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da010', N'doctor_da010', N'doctor.da010@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000010', 0, '2024-05-10 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da011', N'doctor_da011', N'doctor.da011@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000011', 0, '2024-06-03 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da012', N'doctor_da012', N'doctor.da012@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000012', 0, '2024-06-11 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da013', N'doctor_da013', N'doctor.da013@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000013', 0, '2024-06-19 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da014', N'doctor_da014', N'doctor.da014@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000014', 0, '2024-06-27 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da015', N'doctor_da015', N'doctor.da015@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000015', 0, '2024-07-08 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da016', N'doctor_da016', N'doctor.da016@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000016', 0, '2024-07-22 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da017', N'doctor_da017', N'doctor.da017@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000017', 0, '2024-08-10 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da018', N'doctor_da018', N'doctor.da018@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000018', 0, '2024-09-05 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da019', N'doctor_da019', N'doctor.da019@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000019', 0, '2024-09-15 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da020', N'doctor_da020', N'doctor.da020@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000020', 0, '2024-09-25 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da021', N'doctor_da021', N'doctor.da021@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000021', 0, '2024-10-08 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da022', N'doctor_da022', N'doctor.da022@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000022', 0, '2024-10-22 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da023', N'doctor_da023', N'doctor.da023@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000023', 0, '2024-11-10 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da024', N'doctor_da024', N'doctor.da024@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000024', 0, '2024-12-15 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da025', N'doctor_da025', N'doctor.da025@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000025', 0, '2024-01-10 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da026', N'doctor_da026', N'doctor.da026@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000026', 0, '2024-01-20 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da027', N'doctor_da027', N'doctor.da027@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000027', 0, '2024-04-10 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da028', N'doctor_da028', N'doctor.da028@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000028', 0, '2024-04-20 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da029', N'doctor_da029', N'doctor.da029@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000029', 0, '2024-06-07 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da030', N'doctor_da030', N'doctor.da030@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000030', 0, '2024-06-15 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da031', N'doctor_da031', N'doctor.da031@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000031', 0, '2024-06-23 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da032', N'doctor_da032', N'doctor.da032@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000032', 0, '2024-07-14 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da033', N'doctor_da033', N'doctor.da033@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000033', 0, '2024-09-10 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da034', N'doctor_da034', N'doctor.da034@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000034', 0, '2024-09-20 10:00:00', N'Active', NULL, N'doctor'),
(N'user-da035', N'doctor_da035', N'doctor.da035@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0940000035', 0, '2024-10-15 10:00:00', N'Active', NULL, N'doctor');
GO
INSERT INTO Doctors (DoctorID, FullName, qualifications, specialty, yearsOfExperience, languageSpoken, location, avatarUrl, bio, consultationFee, latitude, longitude, clinicName, clinicAddress, averageRating, totalReviews, verified, specialtyId, totalEarnings, pendingSettlement, paypalEmail, scheduleStatus, bankAccount, bankName, customCommissionRateOnline, customCommissionRateOffline, customCommissionRateOnlineEffectiveFrom, customCommissionRateOnlineEffectiveTo, customCommissionRateOfflineEffectiveFrom, customCommissionRateOfflineEffectiveTo, commissionTier) VALUES
(N'user-da001', N'Dr. Kevin Anderson', N'MD - Analytics Seed Profile', N'Internal Medicine', 5, N'English', N'New York', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 40.7128, -74.0060, N'New York Analytics Clinic', N'100 Analytics Avenue, New York', 4.0, 2, 1, 1, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da002', N'Dr. Laura Bennett', N'MD - Analytics Seed Profile', N'Surgery', 5, N'English', N'Los Angeles', N'http://localhost:8096/uploads/avatars/doctors/bacsi_02.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 34.0522, -118.2437, N'Los Angeles Analytics Clinic', N'100 Analytics Avenue, Los Angeles', 5.0, 2, 1, 2, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da003', N'Dr. Marcus Cole', N'MD - Analytics Seed Profile', N'Pediatrics', 5, N'English', N'San Francisco', N'http://localhost:8096/uploads/avatars/doctors/bacsi_03.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 37.7749, -122.4194, N'San Francisco Analytics Clinic', N'100 Analytics Avenue, San Francisco', 3.5, 2, 1, 3, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da004', N'Dr. Natalie Diaz', N'MD - Analytics Seed Profile', N'Obstetrics & Gynecology', 5, N'English', N'Chicago', N'http://localhost:8096/uploads/avatars/doctors/bacsi_04.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 41.8781, -87.6298, N'Chicago Analytics Clinic', N'100 Analytics Avenue, Chicago', 4.5, 2, 1, 4, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da005', N'Dr. Oscar Evans', N'MD - Analytics Seed Profile', N'Dermatology', 5, N'English', N'Seattle', N'http://localhost:8096/uploads/avatars/doctors/bacsi_05.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 47.6062, -122.3321, N'Seattle Analytics Clinic', N'100 Analytics Avenue, Seattle', 4.5, 2, 1, 5, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da006', N'Dr. Priya Fisher', N'MD - Analytics Seed Profile', N'Cardiology', 5, N'English', N'Miami', N'http://localhost:8096/uploads/avatars/doctors/bacsi_06.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 25.7617, -80.1918, N'Miami Analytics Clinic', N'100 Analytics Avenue, Miami', 4.0, 2, 1, 6, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da007', N'Dr. Quentin Grant', N'MD - Analytics Seed Profile', N'Neurology', 5, N'English', N'Boston', N'http://localhost:8096/uploads/avatars/doctors/bacsi_07.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 42.3601, -71.0589, N'Boston Analytics Clinic', N'100 Analytics Avenue, Boston', 5.0, 2, 1, 7, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da008', N'Dr. Rachel Hayes', N'MD - Analytics Seed Profile', N'Ophthalmology', 5, N'English', N'Philadelphia', N'http://localhost:8096/uploads/avatars/doctors/bacsi_08.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 39.9526, -75.1652, N'Philadelphia Analytics Clinic', N'100 Analytics Avenue, Philadelphia', 3.5, 2, 1, 8, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da009', N'Dr. Samuel Irwin', N'MD - Analytics Seed Profile', N'ENT', 5, N'English', N'Houston', N'http://localhost:8096/uploads/avatars/doctors/bacsi_09.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 29.7604, -95.3698, N'Houston Analytics Clinic', N'100 Analytics Avenue, Houston', 4.5, 2, 1, 9, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da010', N'Dr. Tina Jacobs', N'MD - Analytics Seed Profile', N'Dentistry', 5, N'English', N'Phoenix', N'http://localhost:8096/uploads/avatars/doctors/bacsi_10.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 33.4484, -112.0740, N'Phoenix Analytics Clinic', N'100 Analytics Avenue, Phoenix', 4.5, 2, 1, 10, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da011', N'Dr. Umar Kessler', N'MD - Analytics Seed Profile', N'Internal Medicine', 5, N'English', N'New York', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 40.7128, -74.0060, N'New York Analytics Clinic', N'100 Analytics Avenue, New York', 5.0, 2, 1, 1, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da012', N'Dr. Victoria Lane', N'MD - Analytics Seed Profile', N'Surgery', 5, N'English', N'Los Angeles', N'http://localhost:8096/uploads/avatars/doctors/bacsi_02.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 34.0522, -118.2437, N'Los Angeles Analytics Clinic', N'100 Analytics Avenue, Los Angeles', 4.0, 2, 1, 2, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da013', N'Dr. Walter Mendez', N'MD - Analytics Seed Profile', N'Pediatrics', 5, N'English', N'San Francisco', N'http://localhost:8096/uploads/avatars/doctors/bacsi_03.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 37.7749, -122.4194, N'San Francisco Analytics Clinic', N'100 Analytics Avenue, San Francisco', 4.0, 2, 1, 3, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da014', N'Dr. Xiomara Nash', N'MD - Analytics Seed Profile', N'Obstetrics & Gynecology', 5, N'English', N'Chicago', N'http://localhost:8096/uploads/avatars/doctors/bacsi_04.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 41.8781, -87.6298, N'Chicago Analytics Clinic', N'100 Analytics Avenue, Chicago', 4.5, 2, 1, 4, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da015', N'Dr. Yusuf Ortiz', N'MD - Analytics Seed Profile', N'Dermatology', 5, N'English', N'Seattle', N'http://localhost:8096/uploads/avatars/doctors/bacsi_05.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 47.6062, -122.3321, N'Seattle Analytics Clinic', N'100 Analytics Avenue, Seattle', 4.5, 2, 1, 5, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da016', N'Dr. Zoe Palmer', N'MD - Analytics Seed Profile', N'Cardiology', 5, N'English', N'Miami', N'http://localhost:8096/uploads/avatars/doctors/bacsi_06.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 25.7617, -80.1918, N'Miami Analytics Clinic', N'100 Analytics Avenue, Miami', 5.0, 2, 1, 6, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da017', N'Dr. Adam Quinn', N'MD - Analytics Seed Profile', N'Neurology', 5, N'English', N'Boston', N'http://localhost:8096/uploads/avatars/doctors/bacsi_07.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 42.3601, -71.0589, N'Boston Analytics Clinic', N'100 Analytics Avenue, Boston', 4.0, 2, 1, 7, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da018', N'Dr. Bianca Reyes', N'MD - Analytics Seed Profile', N'Ophthalmology', 5, N'English', N'Philadelphia', N'http://localhost:8096/uploads/avatars/doctors/bacsi_08.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 39.9526, -75.1652, N'Philadelphia Analytics Clinic', N'100 Analytics Avenue, Philadelphia', 3.5, 2, 1, 8, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da019', N'Dr. Carlos Stewart', N'MD - Analytics Seed Profile', N'ENT', 5, N'English', N'Houston', N'http://localhost:8096/uploads/avatars/doctors/bacsi_09.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 29.7604, -95.3698, N'Houston Analytics Clinic', N'100 Analytics Avenue, Houston', 4.5, 2, 1, 9, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da020', N'Dr. Diana Turner', N'MD - Analytics Seed Profile', N'Dentistry', 5, N'English', N'Phoenix', N'http://localhost:8096/uploads/avatars/doctors/bacsi_10.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 33.4484, -112.0740, N'Phoenix Analytics Clinic', N'100 Analytics Avenue, Phoenix', 4.5, 2, 1, 10, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da021', N'Dr. Ethan Vaughn', N'MD - Analytics Seed Profile', N'Internal Medicine', 5, N'English', N'New York', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 40.7128, -74.0060, N'New York Analytics Clinic', N'100 Analytics Avenue, New York', 5.0, 2, 1, 1, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da022', N'Dr. Fiona Wells', N'MD - Analytics Seed Profile', N'Surgery', 5, N'English', N'Los Angeles', N'http://localhost:8096/uploads/avatars/doctors/bacsi_02.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 34.0522, -118.2437, N'Los Angeles Analytics Clinic', N'100 Analytics Avenue, Los Angeles', 4.0, 2, 1, 2, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da023', N'Dr. Gabriel Young', N'MD - Analytics Seed Profile', N'Pediatrics', 5, N'English', N'San Francisco', N'http://localhost:8096/uploads/avatars/doctors/bacsi_03.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 37.7749, -122.4194, N'San Francisco Analytics Clinic', N'100 Analytics Avenue, San Francisco', 4.0, 2, 1, 3, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da024', N'Dr. Helen Zimmerman', N'MD - Analytics Seed Profile', N'Obstetrics & Gynecology', 5, N'English', N'Chicago', N'http://localhost:8096/uploads/avatars/doctors/bacsi_04.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 41.8781, -87.6298, N'Chicago Analytics Clinic', N'100 Analytics Avenue, Chicago', 4.5, 2, 1, 4, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da025', N'Dr. Isaac Brooks', N'MD - Analytics Seed Profile', N'Dermatology', 5, N'English', N'Seattle', N'http://localhost:8096/uploads/avatars/doctors/bacsi_05.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 47.6062, -122.3321, N'Seattle Analytics Clinic', N'100 Analytics Avenue, Seattle', 4.5, 2, 1, 5, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da026', N'Dr. Julia Cross', N'MD - Analytics Seed Profile', N'Cardiology', 5, N'English', N'Miami', N'http://localhost:8096/uploads/avatars/doctors/bacsi_06.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 25.7617, -80.1918, N'Miami Analytics Clinic', N'100 Analytics Avenue, Miami', 5.0, 2, 1, 6, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da027', N'Dr. Miles Dawson', N'MD - Analytics Seed Profile', N'Neurology', 5, N'English', N'Boston', N'http://localhost:8096/uploads/avatars/doctors/bacsi_07.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 42.3601, -71.0589, N'Boston Analytics Clinic', N'100 Analytics Avenue, Boston', 4.0, 2, 1, 7, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da028', N'Dr. Nora Ellis', N'MD - Analytics Seed Profile', N'Ophthalmology', 5, N'English', N'Philadelphia', N'http://localhost:8096/uploads/avatars/doctors/bacsi_08.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 39.9526, -75.1652, N'Philadelphia Analytics Clinic', N'100 Analytics Avenue, Philadelphia', 3.5, 2, 1, 8, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da029', N'Dr. Owen Frost', N'MD - Analytics Seed Profile', N'ENT', 5, N'English', N'Houston', N'http://localhost:8096/uploads/avatars/doctors/bacsi_09.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 29.7604, -95.3698, N'Houston Analytics Clinic', N'100 Analytics Avenue, Houston', 4.5, 2, 1, 9, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da030', N'Dr. Paula Grimes', N'MD - Analytics Seed Profile', N'Dentistry', 5, N'English', N'Phoenix', N'http://localhost:8096/uploads/avatars/doctors/bacsi_10.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 33.4484, -112.0740, N'Phoenix Analytics Clinic', N'100 Analytics Avenue, Phoenix', 4.5, 2, 1, 10, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da031', N'Dr. Ryan Holt', N'MD - Analytics Seed Profile', N'Internal Medicine', 5, N'English', N'New York', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 40.7128, -74.0060, N'New York Analytics Clinic', N'100 Analytics Avenue, New York', 5.0, 2, 1, 1, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da032', N'Dr. Sara Ibarra', N'MD - Analytics Seed Profile', N'Surgery', 5, N'English', N'Los Angeles', N'http://localhost:8096/uploads/avatars/doctors/bacsi_02.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 34.0522, -118.2437, N'Los Angeles Analytics Clinic', N'100 Analytics Avenue, Los Angeles', 4.0, 2, 1, 2, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da033', N'Dr. Todd Jennings', N'MD - Analytics Seed Profile', N'Pediatrics', 5, N'English', N'San Francisco', N'http://localhost:8096/uploads/avatars/doctors/bacsi_03.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 37.7749, -122.4194, N'San Francisco Analytics Clinic', N'100 Analytics Avenue, San Francisco', 3.5, 2, 1, 3, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da034', N'Dr. Uma Keller', N'MD - Analytics Seed Profile', N'Obstetrics & Gynecology', 5, N'English', N'Chicago', N'http://localhost:8096/uploads/avatars/doctors/bacsi_04.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 41.8781, -87.6298, N'Chicago Analytics Clinic', N'100 Analytics Avenue, Chicago', 4.5, 2, 1, 4, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD'),
(N'user-da035', N'Dr. Victor Lambert', N'MD - Analytics Seed Profile', N'Dermatology', 5, N'English', N'Seattle', N'http://localhost:8096/uploads/avatars/doctors/bacsi_05.png', N'Analytics seed doctor profile used to populate registration charts.', 50.00, 47.6062, -122.3321, N'Seattle Analytics Clinic', N'100 Analytics Avenue, Seattle', 4.5, 2, 1, 5, 0.00, 0.00, NULL, N'APPROVED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, N'STANDARD');
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
(1000, '2024-01-05 09:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-01-05 09:30:00', 0, 1, '2024-01-04 18:00:00', N'user-pa002', N'user-d02'),
(1001, '2024-01-09 10:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 50.00, '2024-01-09 10:30:00', 0, 1, '2024-01-08 18:00:00', N'user-pa003', N'user-d03'),
(1002, '2024-01-12 13:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-01-12 13:30:00', 0, 1, '2024-01-11 18:00:00', N'user-pa004', N'user-d04'),
(1003, '2024-01-16 14:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 50.00, '2024-01-16 14:30:00', 0, 1, '2024-01-15 18:00:00', N'user-pa005', N'user-d05'),
(1004, '2024-01-19 15:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 50.00, '2024-01-19 15:30:00', 0, 1, '2024-01-18 18:00:00', N'user-pa001', N'user-d06'),
(1005, '2024-01-23 16:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 50.00, '2024-01-23 16:30:00', 0, 1, '2024-01-22 18:00:00', N'user-pa002', N'user-d07'),
(1006, '2024-01-26 11:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 50.00, '2024-01-26 11:30:00', 0, 1, '2024-01-25 18:00:00', N'user-pa003', N'user-d08'),
(1007, '2024-01-28 17:00:00', N'Online', N'Cancelled', N'Allergy consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-01-27 18:00:00', N'user-pa004', N'user-d09'),
(1008, '2024-01-30 08:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 50.00, '2024-01-30 08:30:00', 0, 1, '2024-01-29 18:00:00', N'user-pa005', N'user-d10'),
(1009, '2024-01-02 09:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 50.00, '2024-01-02 09:30:00', 0, 1, '2024-01-01 18:00:00', N'user-pa001', N'user-d11'),
(1010, '2024-01-07 10:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-01-07 10:30:00', 0, 1, '2024-01-06 18:00:00', N'user-pa002', N'user-d12'),
(1011, '2024-01-14 13:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 50.00, '2024-01-14 13:30:00', 0, 1, '2024-01-13 18:00:00', N'user-pa003', N'user-d13'),
(1012, '2024-02-21 14:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-02-21 14:30:00', 0, 1, '2024-02-20 18:00:00', N'user-pa002', N'user-d14'),
(1013, '2024-02-24 15:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 50.00, '2024-02-24 15:30:00', 0, 1, '2024-02-23 18:00:00', N'user-pa003', N'user-d15'),
(1014, '2024-02-03 16:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 50.00, '2024-02-03 16:30:00', 0, 1, '2024-02-02 18:00:00', N'user-pa004', N'user-d16'),
(1015, '2024-02-05 11:00:00', N'Online', N'Cancelled', N'Stomach discomfort', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-02-04 18:00:00', N'user-pa005', N'user-d17'),
(1016, '2024-02-09 17:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 50.00, '2024-02-09 17:30:00', 0, 1, '2024-02-08 18:00:00', N'user-pa006', N'user-d18'),
(1017, '2024-02-12 08:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 50.00, '2024-02-12 08:30:00', 0, 1, '2024-02-11 18:00:00', N'user-pa007', N'user-d19'),
(1018, '2024-02-16 09:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 50.00, '2024-02-16 09:30:00', 0, 1, '2024-02-15 18:00:00', N'user-pa008', N'user-d20'),
(1019, '2024-02-19 10:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 50.00, '2024-02-19 10:30:00', 0, 1, '2024-02-18 18:00:00', N'user-pa009', N'user-d01'),
(1020, '2024-02-23 13:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-02-23 13:30:00', 0, 1, '2024-02-22 18:00:00', N'user-pa010', N'user-d02'),
(1021, '2024-02-26 14:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 50.00, '2024-02-26 14:30:00', 0, 1, '2024-02-25 18:00:00', N'user-pa011', N'user-d03'),
(1022, '2024-02-28 15:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-02-28 15:30:00', 0, 1, '2024-02-27 18:00:00', N'user-pa012', N'user-d04'),
(1023, '2024-02-28 16:00:00', N'Online', N'Cancelled', N'Headache and fatigue', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-02-27 18:00:00', N'user-pa001', N'user-d05'),
(1024, '2024-02-02 11:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 50.00, '2024-02-02 11:30:00', 0, 1, '2024-02-01 18:00:00', N'user-pa002', N'user-d06'),
(1025, '2024-02-07 17:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 50.00, '2024-02-07 17:30:00', 0, 1, '2024-02-06 18:00:00', N'user-pa003', N'user-d07'),
(1026, '2024-03-14 08:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 50.00, '2024-03-14 08:30:00', 0, 1, '2024-03-13 18:00:00', N'user-pa010', N'user-d08'),
(1027, '2024-03-21 09:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 50.00, '2024-03-21 09:30:00', 0, 1, '2024-03-20 18:00:00', N'user-pa011', N'user-d09'),
(1028, '2024-03-24 10:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 50.00, '2024-03-24 10:30:00', 0, 1, '2024-03-23 18:00:00', N'user-pa012', N'user-d10'),
(1029, '2024-03-03 13:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 50.00, '2024-03-03 13:30:00', 0, 1, '2024-03-02 18:00:00', N'user-pa013', N'user-d11'),
(1030, '2024-03-05 14:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-03-05 14:30:00', 0, 1, '2024-03-04 18:00:00', N'user-pa014', N'user-d12'),
(1031, '2024-03-09 15:00:00', N'Online', N'Cancelled', N'Follow-up on chronic condition', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-03-08 18:00:00', N'user-pa015', N'user-d13'),
(1032, '2024-03-12 16:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-03-12 16:30:00', 0, 1, '2024-03-11 18:00:00', N'user-pa016', N'user-d14'),
(1033, '2024-03-16 11:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 50.00, '2024-03-16 11:30:00', 0, 1, '2024-03-15 18:00:00', N'user-pa017', N'user-d15'),
(1034, '2024-03-19 17:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 50.00, '2024-03-19 17:30:00', 0, 1, '2024-03-18 18:00:00', N'user-pa018', N'user-d16'),
(1035, '2024-03-23 08:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 50.00, '2024-03-23 08:30:00', 0, 1, '2024-03-22 18:00:00', N'user-pa001', N'user-d17'),
(1036, '2024-03-26 09:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 50.00, '2024-03-26 09:30:00', 0, 1, '2024-03-25 18:00:00', N'user-pa002', N'user-d18'),
(1037, '2024-03-28 10:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 50.00, '2024-03-28 10:30:00', 0, 1, '2024-03-27 18:00:00', N'user-pa003', N'user-d19'),
(1038, '2024-03-30 13:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 50.00, '2024-03-30 13:30:00', 0, 1, '2024-03-29 18:00:00', N'user-pa004', N'user-d20'),
(1039, '2024-04-02 14:00:00', N'Online', N'Cancelled', N'General check-up and consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-04-01 18:00:00', N'user-pa015', N'user-d01'),
(1040, '2024-04-07 15:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-04-07 15:30:00', 0, 1, '2024-04-06 18:00:00', N'user-pa016', N'user-d02'),
(1041, '2024-04-14 16:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 50.00, '2024-04-14 16:30:00', 0, 1, '2024-04-13 18:00:00', N'user-pa017', N'user-d03'),
(1042, '2024-04-21 11:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-04-21 11:30:00', 0, 1, '2024-04-20 18:00:00', N'user-pa018', N'user-d04'),
(1043, '2024-04-24 17:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 50.00, '2024-04-24 17:30:00', 0, 1, '2024-04-23 18:00:00', N'user-pa019', N'user-d05'),
(1044, '2024-04-03 08:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 50.00, '2024-04-03 08:30:00', 0, 1, '2024-04-02 18:00:00', N'user-pa020', N'user-d06'),
(1045, '2024-04-05 09:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 50.00, '2024-04-05 09:30:00', 0, 1, '2024-04-04 18:00:00', N'user-pa021', N'user-d07'),
(1046, '2024-04-09 10:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 50.00, '2024-04-09 10:30:00', 0, 1, '2024-04-08 18:00:00', N'user-pa022', N'user-d08'),
(1047, '2024-04-12 13:00:00', N'Online', N'Cancelled', N'Allergy consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-04-11 18:00:00', N'user-pa023', N'user-d09'),
(1048, '2024-04-16 14:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 50.00, '2024-04-16 14:30:00', 0, 1, '2024-04-15 18:00:00', N'user-pa024', N'user-d10'),
(1049, '2024-04-19 15:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 50.00, '2024-04-19 15:30:00', 0, 1, '2024-04-18 18:00:00', N'user-pa025', N'user-d11'),
(1050, '2024-04-23 16:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-04-23 16:30:00', 0, 1, '2024-04-22 18:00:00', N'user-pa026', N'user-d12'),
(1051, '2024-04-26 11:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 50.00, '2024-04-26 11:30:00', 0, 1, '2024-04-25 18:00:00', N'user-pa001', N'user-d13'),
(1052, '2024-04-28 17:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-04-28 17:30:00', 0, 1, '2024-04-27 18:00:00', N'user-pa002', N'user-d14'),
(1053, '2024-04-30 08:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 50.00, '2024-04-30 08:30:00', 0, 1, '2024-04-29 18:00:00', N'user-pa003', N'user-d15'),
(1054, '2024-05-02 09:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 50.00, '2024-05-02 09:30:00', 0, 1, '2024-05-01 18:00:00', N'user-pa021', N'user-d16'),
(1055, '2024-05-07 10:00:00', N'Online', N'Cancelled', N'Stomach discomfort', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-05-06 18:00:00', N'user-pa022', N'user-d17'),
(1056, '2024-05-14 13:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 50.00, '2024-05-14 13:30:00', 0, 1, '2024-05-13 18:00:00', N'user-pa023', N'user-d18'),
(1057, '2024-05-21 14:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 50.00, '2024-05-21 14:30:00', 0, 1, '2024-05-20 18:00:00', N'user-pa024', N'user-d19'),
(1058, '2024-05-24 15:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 50.00, '2024-05-24 15:30:00', 0, 1, '2024-05-23 18:00:00', N'user-pa025', N'user-d20'),
(1059, '2024-05-03 16:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 50.00, '2024-05-03 16:30:00', 0, 1, '2024-05-02 18:00:00', N'user-pa026', N'user-d01'),
(1060, '2024-05-05 11:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-05-05 11:30:00', 0, 1, '2024-05-04 18:00:00', N'user-pa027', N'user-d02'),
(1061, '2024-05-09 17:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 50.00, '2024-05-09 17:30:00', 0, 1, '2024-05-08 18:00:00', N'user-pa028', N'user-d03'),
(1062, '2024-05-12 08:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-05-12 08:30:00', 0, 1, '2024-05-11 18:00:00', N'user-pa029', N'user-d04'),
(1063, '2024-05-16 09:00:00', N'Online', N'Cancelled', N'Headache and fatigue', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-05-15 18:00:00', N'user-pa030', N'user-d05'),
(1064, '2024-05-19 10:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 50.00, '2024-05-19 10:30:00', 0, 1, '2024-05-18 18:00:00', N'user-pa031', N'user-d06'),
(1065, '2024-05-23 13:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 50.00, '2024-05-23 13:30:00', 0, 1, '2024-05-22 18:00:00', N'user-pa032', N'user-d07'),
(1066, '2024-05-26 14:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 50.00, '2024-05-26 14:30:00', 0, 1, '2024-05-25 18:00:00', N'user-pa033', N'user-d08'),
(1067, '2024-05-28 15:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 50.00, '2024-05-28 15:30:00', 0, 1, '2024-05-27 18:00:00', N'user-pa034', N'user-d09'),
(1068, '2024-05-30 16:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 50.00, '2024-05-30 16:30:00', 0, 1, '2024-05-29 18:00:00', N'user-pa035', N'user-d10'),
(1069, '2024-05-02 11:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 50.00, '2024-05-02 11:30:00', 0, 1, '2024-05-01 18:00:00', N'user-pa001', N'user-d11'),
(1070, '2024-06-07 17:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-06-07 17:30:00', 0, 1, '2024-06-06 18:00:00', N'user-pa030', N'user-d12'),
(1071, '2024-06-14 08:00:00', N'Online', N'Cancelled', N'Follow-up on chronic condition', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-06-13 18:00:00', N'user-pa031', N'user-d13'),
(1072, '2024-06-21 09:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-06-21 09:30:00', 0, 1, '2024-06-20 18:00:00', N'user-pa032', N'user-d14'),
(1073, '2024-06-24 10:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 50.00, '2024-06-24 10:30:00', 0, 1, '2024-06-23 18:00:00', N'user-pa033', N'user-d15'),
(1074, '2024-06-03 13:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 50.00, '2024-06-03 13:30:00', 0, 1, '2024-06-02 18:00:00', N'user-pa034', N'user-d16'),
(1075, '2024-06-05 14:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 50.00, '2024-06-05 14:30:00', 0, 1, '2024-06-04 18:00:00', N'user-pa035', N'user-d17'),
(1076, '2024-06-09 15:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 50.00, '2024-06-09 15:30:00', 0, 1, '2024-06-08 18:00:00', N'user-pa036', N'user-d18'),
(1077, '2024-06-12 16:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 50.00, '2024-06-12 16:30:00', 0, 1, '2024-06-11 18:00:00', N'user-pa037', N'user-d19'),
(1078, '2024-06-16 11:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 50.00, '2024-06-16 11:30:00', 0, 1, '2024-06-15 18:00:00', N'user-pa038', N'user-d20'),
(1079, '2024-06-19 17:00:00', N'Online', N'Cancelled', N'General check-up and consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-06-18 18:00:00', N'user-pa039', N'user-d01'),
(1080, '2024-06-23 08:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-06-23 08:30:00', 0, 1, '2024-06-22 18:00:00', N'user-pa040', N'user-d02'),
(1081, '2024-06-26 09:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 50.00, '2024-06-26 09:30:00', 0, 1, '2024-06-25 18:00:00', N'user-pa041', N'user-d03'),
(1082, '2024-06-28 10:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-06-28 10:30:00', 0, 1, '2024-06-27 18:00:00', N'user-pa042', N'user-d04'),
(1083, '2024-06-30 13:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 50.00, '2024-06-30 13:30:00', 0, 1, '2024-06-29 18:00:00', N'user-pa001', N'user-d05'),
(1084, '2024-07-02 14:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 50.00, '2024-07-02 14:30:00', 0, 1, '2024-07-01 18:00:00', N'user-pa036', N'user-d06'),
(1085, '2024-07-07 15:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 50.00, '2024-07-07 15:30:00', 0, 1, '2024-07-06 18:00:00', N'user-pa037', N'user-d07'),
(1086, '2024-07-14 16:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 50.00, '2024-07-14 16:30:00', 0, 1, '2024-07-13 18:00:00', N'user-pa038', N'user-d08'),
(1087, '2024-07-21 11:00:00', N'Online', N'Cancelled', N'Allergy consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-07-20 18:00:00', N'user-pa039', N'user-d09'),
(1088, '2024-07-24 17:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 50.00, '2024-07-24 17:30:00', 0, 1, '2024-07-23 18:00:00', N'user-pa040', N'user-d10'),
(1089, '2024-07-03 08:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 50.00, '2024-07-03 08:30:00', 0, 1, '2024-07-02 18:00:00', N'user-pa041', N'user-d11'),
(1090, '2024-07-05 09:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-07-05 09:30:00', 0, 1, '2024-07-04 18:00:00', N'user-pa042', N'user-d12'),
(1091, '2024-07-09 10:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 50.00, '2024-07-09 10:30:00', 0, 1, '2024-07-08 18:00:00', N'user-pa043', N'user-d13'),
(1092, '2024-07-12 13:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-07-12 13:30:00', 0, 1, '2024-07-11 18:00:00', N'user-pa044', N'user-d14'),
(1093, '2024-07-16 14:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 50.00, '2024-07-16 14:30:00', 0, 1, '2024-07-15 18:00:00', N'user-pa045', N'user-d15'),
(1094, '2024-07-19 15:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 50.00, '2024-07-19 15:30:00', 0, 1, '2024-07-18 18:00:00', N'user-pa046', N'user-d16'),
(1095, '2024-07-23 16:00:00', N'Online', N'Cancelled', N'Stomach discomfort', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-07-22 18:00:00', N'user-pa047', N'user-d17'),
(1096, '2024-07-26 11:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 50.00, '2024-07-26 11:30:00', 0, 1, '2024-07-25 18:00:00', N'user-pa048', N'user-d18'),
(1097, '2024-07-28 17:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 50.00, '2024-07-28 17:30:00', 0, 1, '2024-07-27 18:00:00', N'user-pa049', N'user-d19'),
(1098, '2024-07-30 08:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 50.00, '2024-07-30 08:30:00', 0, 1, '2024-07-29 18:00:00', N'user-pa050', N'user-d20'),
(1099, '2024-08-02 09:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 50.00, '2024-08-02 09:30:00', 0, 1, '2024-08-01 18:00:00', N'user-pa041', N'user-d01'),
(1100, '2024-08-07 10:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-08-07 10:30:00', 0, 1, '2024-08-06 18:00:00', N'user-pa042', N'user-d02'),
(1101, '2024-08-14 13:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 50.00, '2024-08-14 13:30:00', 0, 1, '2024-08-13 18:00:00', N'user-pa043', N'user-d03'),
(1102, '2024-08-21 14:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-08-21 14:30:00', 0, 1, '2024-08-20 18:00:00', N'user-pa044', N'user-d04'),
(1103, '2024-08-24 15:00:00', N'Online', N'Cancelled', N'Headache and fatigue', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-08-23 18:00:00', N'user-pa045', N'user-d05'),
(1104, '2024-08-03 16:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 50.00, '2024-08-03 16:30:00', 0, 1, '2024-08-02 18:00:00', N'user-pa046', N'user-d06'),
(1105, '2024-08-05 11:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 50.00, '2024-08-05 11:30:00', 0, 1, '2024-08-04 18:00:00', N'user-pa047', N'user-d07'),
(1106, '2024-08-09 17:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 50.00, '2024-08-09 17:30:00', 0, 1, '2024-08-08 18:00:00', N'user-pa048', N'user-d08'),
(1107, '2024-08-12 08:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 50.00, '2024-08-12 08:30:00', 0, 1, '2024-08-11 18:00:00', N'user-pa049', N'user-d09'),
(1108, '2024-08-16 09:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 50.00, '2024-08-16 09:30:00', 0, 1, '2024-08-15 18:00:00', N'user-pa050', N'user-d10'),
(1109, '2024-08-19 10:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 50.00, '2024-08-19 10:30:00', 0, 1, '2024-08-18 18:00:00', N'user-pa051', N'user-d11'),
(1110, '2024-08-23 13:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-08-23 13:30:00', 0, 1, '2024-08-22 18:00:00', N'user-pa052', N'user-d12'),
(1111, '2024-08-26 14:00:00', N'Online', N'Cancelled', N'Follow-up on chronic condition', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-08-25 18:00:00', N'user-pa053', N'user-d13'),
(1112, '2024-08-28 15:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-08-28 15:30:00', 0, 1, '2024-08-27 18:00:00', N'user-pa054', N'user-d14'),
(1113, '2024-08-30 16:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 50.00, '2024-08-30 16:30:00', 0, 1, '2024-08-29 18:00:00', N'user-pa055', N'user-d15'),
(1114, '2024-08-02 11:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 50.00, '2024-08-02 11:30:00', 0, 1, '2024-08-01 18:00:00', N'user-pa056', N'user-d16'),
(1115, '2024-08-07 17:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 50.00, '2024-08-07 17:30:00', 0, 1, '2024-08-06 18:00:00', N'user-pa057', N'user-d17'),
(1116, '2024-09-14 08:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 50.00, '2024-09-14 08:30:00', 0, 1, '2024-09-13 18:00:00', N'user-pa050', N'user-d18'),
(1117, '2024-09-21 09:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 50.00, '2024-09-21 09:30:00', 0, 1, '2024-09-20 18:00:00', N'user-pa051', N'user-d19'),
(1118, '2024-09-24 10:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 50.00, '2024-09-24 10:30:00', 0, 1, '2024-09-23 18:00:00', N'user-pa052', N'user-d20'),
(1119, '2024-09-03 13:00:00', N'Online', N'Cancelled', N'General check-up and consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-09-02 18:00:00', N'user-pa053', N'user-d01'),
(1120, '2024-09-05 14:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-09-05 14:30:00', 0, 1, '2024-09-04 18:00:00', N'user-pa054', N'user-d02'),
(1121, '2024-09-09 15:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 50.00, '2024-09-09 15:30:00', 0, 1, '2024-09-08 18:00:00', N'user-pa055', N'user-d03'),
(1122, '2024-09-12 16:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-09-12 16:30:00', 0, 1, '2024-09-11 18:00:00', N'user-pa056', N'user-d04'),
(1123, '2024-09-16 11:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 50.00, '2024-09-16 11:30:00', 0, 1, '2024-09-15 18:00:00', N'user-pa057', N'user-d05'),
(1124, '2024-09-19 17:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 50.00, '2024-09-19 17:30:00', 0, 1, '2024-09-18 18:00:00', N'user-pa058', N'user-d06'),
(1125, '2024-09-23 08:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 50.00, '2024-09-23 08:30:00', 0, 1, '2024-09-22 18:00:00', N'user-pa059', N'user-d07'),
(1126, '2024-09-26 09:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 50.00, '2024-09-26 09:30:00', 0, 1, '2024-09-25 18:00:00', N'user-pa060', N'user-d08'),
(1127, '2024-09-28 10:00:00', N'Online', N'Cancelled', N'Allergy consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-09-27 18:00:00', N'user-pa061', N'user-d09'),
(1128, '2024-09-30 13:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 50.00, '2024-09-30 13:30:00', 0, 1, '2024-09-29 18:00:00', N'user-pa062', N'user-d10'),
(1129, '2024-09-02 14:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 50.00, '2024-09-02 14:30:00', 0, 1, '2024-09-01 18:00:00', N'user-pa063', N'user-d11'),
(1130, '2024-10-07 15:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-10-07 15:30:00', 0, 1, '2024-10-06 18:00:00', N'user-pa055', N'user-d12'),
(1131, '2024-10-14 16:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 50.00, '2024-10-14 16:30:00', 0, 1, '2024-10-13 18:00:00', N'user-pa056', N'user-d13'),
(1132, '2024-10-21 11:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-10-21 11:30:00', 0, 1, '2024-10-20 18:00:00', N'user-pa057', N'user-d14'),
(1133, '2024-10-24 17:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 50.00, '2024-10-24 17:30:00', 0, 1, '2024-10-23 18:00:00', N'user-pa058', N'user-d15'),
(1134, '2024-10-03 08:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 50.00, '2024-10-03 08:30:00', 0, 1, '2024-10-02 18:00:00', N'user-pa059', N'user-d16'),
(1135, '2024-10-05 09:00:00', N'Online', N'Cancelled', N'Stomach discomfort', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-10-04 18:00:00', N'user-pa060', N'user-d17'),
(1136, '2024-10-09 10:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 50.00, '2024-10-09 10:30:00', 0, 1, '2024-10-08 18:00:00', N'user-pa061', N'user-d18'),
(1137, '2024-10-12 13:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 50.00, '2024-10-12 13:30:00', 0, 1, '2024-10-11 18:00:00', N'user-pa062', N'user-d19'),
(1138, '2024-10-16 14:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 50.00, '2024-10-16 14:30:00', 0, 1, '2024-10-15 18:00:00', N'user-pa063', N'user-d20'),
(1139, '2024-10-19 15:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 50.00, '2024-10-19 15:30:00', 0, 1, '2024-10-18 18:00:00', N'user-pa064', N'user-d01'),
(1140, '2024-10-23 16:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-10-23 16:30:00', 0, 1, '2024-10-22 18:00:00', N'user-pa065', N'user-d02'),
(1141, '2024-10-26 11:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 50.00, '2024-10-26 11:30:00', 0, 1, '2024-10-25 18:00:00', N'user-pa066', N'user-d03'),
(1142, '2024-10-28 17:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-10-28 17:30:00', 0, 1, '2024-10-27 18:00:00', N'user-pa067', N'user-d04'),
(1143, '2024-10-30 08:00:00', N'Online', N'Cancelled', N'Headache and fatigue', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-10-29 18:00:00', N'user-pa068', N'user-d05'),
(1144, '2024-10-02 09:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 50.00, '2024-10-02 09:30:00', 0, 1, '2024-10-01 18:00:00', N'user-pa069', N'user-d06'),
(1145, '2024-10-07 10:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 50.00, '2024-10-07 10:30:00', 0, 1, '2024-10-06 18:00:00', N'user-pa070', N'user-d07'),
(1146, '2024-11-14 13:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 50.00, '2024-11-14 13:30:00', 0, 1, '2024-11-13 18:00:00', N'user-pa064', N'user-d08'),
(1147, '2024-11-21 14:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 50.00, '2024-11-21 14:30:00', 0, 1, '2024-11-20 18:00:00', N'user-pa065', N'user-d09'),
(1148, '2024-11-24 15:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 50.00, '2024-11-24 15:30:00', 0, 1, '2024-11-23 18:00:00', N'user-pa066', N'user-d10'),
(1149, '2024-11-03 16:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 50.00, '2024-11-03 16:30:00', 0, 1, '2024-11-02 18:00:00', N'user-pa067', N'user-d11'),
(1150, '2024-11-05 11:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-11-05 11:30:00', 0, 1, '2024-11-04 18:00:00', N'user-pa068', N'user-d12'),
(1151, '2024-11-09 17:00:00', N'Online', N'Cancelled', N'Follow-up on chronic condition', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-11-08 18:00:00', N'user-pa069', N'user-d13'),
(1152, '2024-11-12 08:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-11-12 08:30:00', 0, 1, '2024-11-11 18:00:00', N'user-pa070', N'user-d14'),
(1153, '2024-11-16 09:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 50.00, '2024-11-16 09:30:00', 0, 1, '2024-11-15 18:00:00', N'user-pa071', N'user-d15'),
(1154, '2024-11-19 10:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 50.00, '2024-11-19 10:30:00', 0, 1, '2024-11-18 18:00:00', N'user-pa072', N'user-d16'),
(1155, '2024-11-23 13:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 50.00, '2024-11-23 13:30:00', 0, 1, '2024-11-22 18:00:00', N'user-pa073', N'user-d17'),
(1156, '2024-11-26 14:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 50.00, '2024-11-26 14:30:00', 0, 1, '2024-11-25 18:00:00', N'user-pa074', N'user-d18'),
(1157, '2024-11-28 15:00:00', N'Online', N'Completed', N'Allergy consultation', N'Completed consultation', 50.00, '2024-11-28 15:30:00', 0, 1, '2024-11-27 18:00:00', N'user-pa075', N'user-d19'),
(1158, '2024-11-30 16:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 50.00, '2024-11-30 16:30:00', 0, 1, '2024-11-29 18:00:00', N'user-pa076', N'user-d20'),
(1159, '2024-12-02 11:00:00', N'Online', N'Cancelled', N'General check-up and consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-12-01 18:00:00', N'user-pa071', N'user-d01'),
(1160, '2024-12-07 17:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-12-07 17:30:00', 0, 1, '2024-12-06 18:00:00', N'user-pa072', N'user-d02'),
(1161, '2024-12-14 08:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 50.00, '2024-12-14 08:30:00', 0, 1, '2024-12-13 18:00:00', N'user-pa073', N'user-d03'),
(1162, '2024-12-21 09:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-12-21 09:30:00', 0, 1, '2024-12-20 18:00:00', N'user-pa074', N'user-d04'),
(1163, '2024-12-24 10:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 50.00, '2024-12-24 10:30:00', 0, 1, '2024-12-23 18:00:00', N'user-pa075', N'user-d05'),
(1164, '2024-12-03 13:00:00', N'Online', N'Completed', N'Routine health screening', N'Completed consultation', 50.00, '2024-12-03 13:30:00', 0, 1, '2024-12-02 18:00:00', N'user-pa076', N'user-d06'),
(1165, '2024-12-05 14:00:00', N'Online', N'Completed', N'Stomach discomfort', N'Completed consultation', 50.00, '2024-12-05 14:30:00', 0, 1, '2024-12-04 18:00:00', N'user-pa077', N'user-d07'),
(1166, '2024-12-09 15:00:00', N'Online', N'Completed', N'Blood pressure review', N'Completed consultation', 50.00, '2024-12-09 15:30:00', 0, 1, '2024-12-08 18:00:00', N'user-pa078', N'user-d08'),
(1167, '2024-12-12 16:00:00', N'Online', N'Cancelled', N'Allergy consultation', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-12-11 18:00:00', N'user-pa079', N'user-d09'),
(1168, '2024-12-16 11:00:00', N'Online', N'Completed', N'Back pain assessment', N'Completed consultation', 50.00, '2024-12-16 11:30:00', 0, 1, '2024-12-15 18:00:00', N'user-pa080', N'user-d10'),
(1169, '2024-12-19 17:00:00', N'Online', N'Completed', N'General check-up and consultation', N'Completed consultation', 50.00, '2024-12-19 17:30:00', 0, 1, '2024-12-18 18:00:00', N'user-pa081', N'user-d11'),
(1170, '2024-12-23 08:00:00', N'Online', N'Completed', N'Cough and mild fever', N'Completed consultation', 50.00, '2024-12-23 08:30:00', 0, 1, '2024-12-22 18:00:00', N'user-pa082', N'user-d12'),
(1171, '2024-12-26 09:00:00', N'Online', N'Completed', N'Follow-up on chronic condition', N'Completed consultation', 50.00, '2024-12-26 09:30:00', 0, 1, '2024-12-25 18:00:00', N'user-pa083', N'user-d13'),
(1172, '2024-12-28 10:00:00', N'Online', N'Completed', N'Skin rash evaluation', N'Completed consultation', 50.00, '2024-12-28 10:30:00', 0, 1, '2024-12-27 18:00:00', N'user-pa084', N'user-d14'),
(1173, '2024-12-30 13:00:00', N'Online', N'Completed', N'Headache and fatigue', N'Completed consultation', 50.00, '2024-12-30 13:30:00', 0, 1, '2024-12-29 18:00:00', N'user-pa085', N'user-d15');
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
(1030, N'user-pa083', N'user-d13', 4, N'Accurate diagnosis and good advice.', '2024-12-26 10:00:00', 1171, 0, NULL, NULL, 1, 0, NULL, NULL),
-- 50b. Reviews ensuring every doctor (incl. analytics-only da001-035) has >= 2 reviews, with occasional 3-star ratings
(1031, N'user-pa001', N'user-d06', 5, N'Excellent doctor, very professional and caring.', '2024-01-08 10:00:00', NULL, 0, NULL, NULL, 1, 9, NULL, NULL),
(1032, N'user-pa002', N'user-d06', 4, N'Good consultation overall, would visit again.', '2024-01-11 10:00:00', NULL, 0, NULL, NULL, 1, 0, NULL, NULL),
(1033, N'user-pa003', N'user-d08', 4, N'Professional and helpful, slight wait time though.', '2024-01-14 10:00:00', NULL, 0, NULL, NULL, 1, 3, NULL, NULL),
(1034, N'user-pa004', N'user-d08', 5, N'Highly recommend! Clear explanations and great bedside manner.', '2024-01-17 10:00:00', NULL, 0, NULL, NULL, 1, 6, NULL, NULL),
(1035, N'user-pa005', N'user-d09', 5, N'Outstanding consultation, felt very well taken care of.', '2024-01-20 10:00:00', NULL, 0, NULL, NULL, 1, 9, NULL, NULL),
(1036, N'user-pa006', N'user-d09', 5, N'Extremely knowledgeable and attentive to my concerns.', '2024-01-23 10:00:00', NULL, 1, NULL, NULL, 1, 0, NULL, NULL),
(1037, N'user-pa007', N'user-d11', 4, N'Solid experience, doctor was attentive and clear.', '2024-01-26 10:00:00', NULL, 0, NULL, NULL, 1, 3, NULL, NULL),
(1038, N'user-pa008', N'user-d11', 4, N'Very satisfied with the advice given.', '2024-01-29 10:00:00', NULL, 0, NULL, NULL, 1, 6, NULL, NULL),
(1039, N'user-pa009', N'user-d12', 3, N'Consultation was okay, but felt a bit rushed.', '2024-02-01 10:00:00', NULL, 0, NULL, NULL, 1, 9, NULL, NULL),
(1040, N'user-pa010', N'user-d12', 5, N'Excellent doctor, very professional and caring.', '2024-02-04 10:00:00', NULL, 0, NULL, NULL, 1, 0, NULL, NULL),
(1041, N'user-pa011', N'user-d14', 5, N'Highly recommend! Clear explanations and great bedside manner.', '2024-02-07 10:00:00', NULL, 0, NULL, NULL, 1, 3, NULL, NULL),
(1042, N'user-pa012', N'user-d14', 4, N'Good consultation overall, would visit again.', '2024-02-10 10:00:00', NULL, 0, NULL, NULL, 1, 6, NULL, NULL),
(1043, N'user-pa013', N'user-d15', 4, N'Professional and helpful, slight wait time though.', '2024-02-13 10:00:00', NULL, 1, NULL, NULL, 1, 9, NULL, NULL),
(1044, N'user-pa014', N'user-d15', 5, N'Outstanding consultation, felt very well taken care of.', '2024-02-16 10:00:00', NULL, 0, NULL, NULL, 1, 0, NULL, NULL),
(1045, N'user-pa015', N'user-d17', 5, N'Extremely knowledgeable and attentive to my concerns.', '2024-02-19 10:00:00', NULL, 0, NULL, NULL, 1, 3, NULL, NULL),
(1046, N'user-pa016', N'user-d17', 5, N'Excellent doctor, very professional and caring.', '2024-02-22 10:00:00', NULL, 0, NULL, NULL, 1, 6, NULL, NULL),
(1047, N'user-pa017', N'user-d18', 4, N'Solid experience, doctor was attentive and clear.', '2024-02-25 10:00:00', NULL, 0, NULL, NULL, 1, 9, NULL, NULL),
(1048, N'user-pa018', N'user-d18', 3, N'Average experience, explanations could have been clearer.', '2024-02-28 10:00:00', NULL, 0, NULL, NULL, 1, 0, NULL, NULL),
(1049, N'user-pa019', N'user-d20', 5, N'Highly recommend! Clear explanations and great bedside manner.', '2024-03-02 10:00:00', NULL, 0, NULL, NULL, 1, 3, NULL, NULL),
(1050, N'user-pa020', N'user-d20', 4, N'Very satisfied with the advice given.', '2024-03-05 10:00:00', NULL, 1, NULL, NULL, 1, 6, NULL, NULL);
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
-- IMPORTANT: DoctorSchedules is fully wiped by "DELETE FROM DoctorSchedules;" above, so this
-- block is the ONLY surviving schedule data for ALL 20 doctors (user-d01..user-d20), not just
-- the analytics-only doctors. Each doctor gets >=20h/week (>=80h/month even in a 28-day month),
-- using only the current flow's consultationType values: 'Online' or 'HomeVisit'.
INSERT INTO DoctorSchedules (ScheduleID, DoctorId, dayOfWeek, startTime, endTime, SlotDuration, MaxPatients, Available, ScheduleStatus, consultationType, ShiftType, location, notes) VALUES
-- Dr. John Smith (user-d01): Mon/Wed/Fri online + Sat home visit -> 26h/week
(191, N'user-d01', 1, '07:00', '10:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday morning online'),
(192, N'user-d01', 1, '13:00', '17:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday afternoon online'),
(193, N'user-d01', 3, '07:00', '10:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday morning online'),
(194, N'user-d01', 3, '13:00', '17:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday afternoon online'),
(195, N'user-d01', 5, '07:00', '10:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Friday morning online'),
(196, N'user-d01', 5, '13:00', '17:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Friday afternoon online'),
(197, N'user-d01', 6, '07:00', '10:30', 210, 1, 1, 'APPROVED', N'HomeVisit', 'MORNING', N'Patient home', N'Saturday morning home visit'),

-- Dr. Sarah Johnson (user-d02): Mon/Wed/Fri online + Sat home visit -> 26h/week
(198, N'user-d02', 1, '08:00', '10:30', 20, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday morning pediatric consultations'),
(199, N'user-d02', 1, '13:00', '17:00', 20, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday afternoon pediatric consultations'),
(200, N'user-d02', 3, '08:00', '10:30', 20, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday morning pediatric consultations'),
(201, N'user-d02', 3, '13:00', '17:00', 20, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday afternoon pediatric consultations'),
(202, N'user-d02', 5, '08:00', '10:30', 20, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Friday morning pediatric consultations'),
(203, N'user-d02', 5, '13:00', '17:00', 20, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Friday afternoon pediatric consultations'),
(204, N'user-d02', 6, '13:00', '17:30', 270, 1, 1, 'APPROVED', N'HomeVisit', 'AFTERNOON', N'Patient home', N'Saturday afternoon home visit'),

-- Dr. Michael Chen (user-d03): Mon/Wed/Fri online + Sat home visit -> 26h/week
(205, N'user-d03', 1, '09:00', '10:30', 45, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Cardiology consultations'),
(206, N'user-d03', 1, '13:00', '17:00', 45, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Cardiology consultations'),
(207, N'user-d03', 3, '09:00', '10:30', 45, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Cardiology consultations'),
(208, N'user-d03', 3, '13:00', '17:00', 45, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Cardiology consultations'),
(209, N'user-d03', 5, '09:00', '10:30', 45, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Cardiology consultations'),
(210, N'user-d03', 5, '13:00', '17:00', 45, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Cardiology consultations'),
(211, N'user-d03', 6, '07:00', '10:30', 210, 1, 1, 'APPROVED', N'HomeVisit', 'MORNING', N'Patient home', N'Saturday morning home visit'),

-- Dr. Emily Davis (user-d04): Mon/Wed/Fri online + Sat home visit -> 26h/week
(212, N'user-d04', 1, '07:30', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday morning consultations'),
(213, N'user-d04', 1, '13:00', '16:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday afternoon consultations'),
(214, N'user-d04', 3, '07:30', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday morning consultations'),
(215, N'user-d04', 3, '13:00', '16:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday afternoon consultations'),
(216, N'user-d04', 5, '07:30', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Friday morning consultations'),
(217, N'user-d04', 5, '13:00', '16:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Friday afternoon consultations'),
(218, N'user-d04', 6, '13:00', '17:30', 270, 1, 1, 'APPROVED', N'HomeVisit', 'AFTERNOON', N'Patient home', N'Saturday afternoon home visit'),

-- Dr. Jessica Williams (user-d05): Mon/Wed/Fri online + Sat home visit -> 26h/week
(219, N'user-d05', 1, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'OB/GYN consultations'),
(220, N'user-d05', 1, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'OB/GYN consultations'),
(221, N'user-d05', 3, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'OB/GYN consultations'),
(222, N'user-d05', 3, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'OB/GYN consultations'),
(223, N'user-d05', 5, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'OB/GYN consultations'),
(224, N'user-d05', 5, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'OB/GYN consultations'),
(225, N'user-d05', 6, '07:00', '10:30', 210, 1, 1, 'APPROVED', N'HomeVisit', 'MORNING', N'Patient home', N'Saturday morning home visit'),

-- Dr. Robert Brown (user-d06): Mon/Wed/Fri online + Sat home visit -> 26h/week
(226, N'user-d06', 1, '08:00', '10:30', 20, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Dermatology online sessions'),
(227, N'user-d06', 1, '13:00', '17:00', 20, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Dermatology online sessions'),
(228, N'user-d06', 3, '08:00', '10:30', 20, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Dermatology online sessions'),
(229, N'user-d06', 3, '13:00', '17:00', 20, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Dermatology online sessions'),
(230, N'user-d06', 5, '08:00', '10:30', 20, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Dermatology online sessions'),
(231, N'user-d06', 5, '13:00', '17:00', 20, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Dermatology online sessions'),
(232, N'user-d06', 6, '13:00', '17:30', 270, 1, 1, 'APPROVED', N'HomeVisit', 'AFTERNOON', N'Patient home', N'Saturday afternoon home visit'),

-- Dr. David Wilson (user-d07): Tue/Thu/Sat online + Sun home visit -> 26h/week
(233, N'user-d07', 2, '08:00', '10:30', 40, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Neurology appointments'),
(234, N'user-d07', 2, '14:00', '17:30', 40, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Neurology appointments'),
(235, N'user-d07', 4, '08:00', '10:30', 40, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Neurology appointments'),
(236, N'user-d07', 4, '14:00', '17:30', 40, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Neurology appointments'),
(237, N'user-d07', 6, '08:00', '10:30', 40, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Neurology appointments'),
(238, N'user-d07', 6, '13:00', '16:30', 40, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Neurology appointments'),
(239, N'user-d07', 0, '07:00', '10:30', 210, 1, 1, 'APPROVED', N'HomeVisit', 'MORNING', N'Patient home', N'Sunday morning home visit'),

-- Dr. Amanda Lee (user-d08): Mon/Wed/Fri online + Sat home visit -> 26h/week
(240, N'user-d08', 1, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Eye examinations'),
(241, N'user-d08', 1, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Eye examinations'),
(242, N'user-d08', 3, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Eye examinations'),
(243, N'user-d08', 3, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Eye examinations'),
(244, N'user-d08', 5, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Eye examinations'),
(245, N'user-d08', 5, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Eye examinations'),
(246, N'user-d08', 6, '07:00', '10:30', 210, 1, 1, 'APPROVED', N'HomeVisit', 'MORNING', N'Patient home', N'Saturday morning home visit'),

-- Dr. James Taylor (user-d09): Mon/Wed/Fri online + Sat home visit -> 26h/week
(247, N'user-d09', 1, '08:00', '10:30', 25, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'ENT consultations'),
(248, N'user-d09', 1, '13:30', '17:00', 25, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'ENT consultations'),
(249, N'user-d09', 3, '08:00', '10:30', 25, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'ENT consultations'),
(250, N'user-d09', 3, '13:30', '17:00', 25, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'ENT consultations'),
(251, N'user-d09', 5, '08:00', '10:30', 25, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'ENT consultations'),
(252, N'user-d09', 5, '13:30', '17:00', 25, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'ENT consultations'),
(253, N'user-d09', 6, '19:00', '21:00', 120, 1, 1, 'APPROVED', N'HomeVisit', 'EVENING', N'Patient home', N'Saturday evening home visit'),

-- Dr. Jennifer Martinez (user-d10): Mon/Wed/Fri online + Sat home visit -> 26h/week
(254, N'user-d10', 1, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Dental consultations'),
(255, N'user-d10', 1, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Dental consultations'),
(256, N'user-d10', 3, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Dental consultations'),
(257, N'user-d10', 3, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Dental consultations'),
(258, N'user-d10', 5, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Dental consultations'),
(259, N'user-d10', 5, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Dental consultations'),
(260, N'user-d10', 6, '07:00', '10:30', 210, 1, 1, 'APPROVED', N'HomeVisit', 'MORNING', N'Patient home', N'Saturday morning home visit'),

(124, N'user-d11', 2, '07:00', '10:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday morning online'),
(125, N'user-d11', 4, '13:00', '17:30', 270, 1, 1, 'APPROVED', N'HomeVisit', 'AFTERNOON', N'Patient home', N'Thursday afternoon home visit'),
(126, N'user-d12', 1, '07:00', '10:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday morning online'),
(127, N'user-d12', 3, '14:00', '17:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday afternoon online'),
(128, N'user-d12', 6, '07:00', '10:30', 210, 1, 1, 'APPROVED', N'HomeVisit', 'MORNING', N'Patient home', N'Saturday morning home visit'),
(129, N'user-d13', 2, '08:00', '10:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday morning online'),
(130, N'user-d13', 4, '13:30', '16:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Thursday afternoon online'),
(131, N'user-d13', 5, '19:00', '21:00', 120, 1, 1, 'APPROVED', N'HomeVisit', 'EVENING', N'Patient home', N'Friday evening home visit'),
(132, N'user-d14', 1, '13:30', '16:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday afternoon online'),
(133, N'user-d14', 3, '07:00', '10:30', 210, 1, 1, 'APPROVED', N'HomeVisit', 'MORNING', N'Patient home', N'Wednesday morning home visit'),
(134, N'user-d15', 2, '08:00', '10:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday morning online'),
(135, N'user-d15', 4, '14:00', '17:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Thursday afternoon online'),
(136, N'user-d15', 6, '13:00', '17:30', 270, 1, 1, 'APPROVED', N'HomeVisit', 'AFTERNOON', N'Patient home', N'Saturday afternoon home visit'),
(137, N'user-d16', 3, '07:00', '10:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday morning online'),
(138, N'user-d16', 5, '13:00', '17:30', 270, 1, 1, 'APPROVED', N'HomeVisit', 'AFTERNOON', N'Patient home', N'Friday afternoon home visit'),
(139, N'user-d17', 1, '13:30', '16:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday afternoon online'),
(140, N'user-d17', 4, '07:00', '10:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Thursday morning online'),
(141, N'user-d18', 2, '08:00', '10:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday morning online'),
(142, N'user-d18', 5, '13:30', '16:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Friday afternoon online'),
(143, N'user-d18', 6, '07:00', '10:30', 210, 1, 1, 'APPROVED', N'HomeVisit', 'MORNING', N'Patient home', N'Saturday morning home visit'),
(144, N'user-d19', 3, '14:00', '17:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday afternoon online'),
(145, N'user-d19', 5, '19:00', '21:00', 120, 1, 1, 'APPROVED', N'HomeVisit', 'EVENING', N'Patient home', N'Friday evening home visit'),
(146, N'user-d20', 1, '07:00', '10:00', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday morning online'),
(147, N'user-d20', 2, '13:30', '16:30', 30, 2, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday afternoon online'),
(148, N'user-d20', 4, '07:00', '10:30', 210, 1, 1, 'APPROVED', N'HomeVisit', 'MORNING', N'Patient home', N'Thursday morning home visit'),

-- Additional shifts so d11-d20 also reach the 80h/month compliance requirement
(149, N'user-d11', 1, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday morning online'),
(150, N'user-d11', 1, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday afternoon online'),
(151, N'user-d11', 3, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday morning online'),
(152, N'user-d11', 3, '13:00', '16:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday afternoon online'),
(153, N'user-d12', 2, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday morning online'),
(154, N'user-d12', 2, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday afternoon online'),
(155, N'user-d12', 4, '08:00', '10:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Thursday morning online'),
(156, N'user-d12', 4, '13:00', '15:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Thursday afternoon online'),
(157, N'user-d13', 1, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday morning online'),
(158, N'user-d13', 1, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday afternoon online'),
(159, N'user-d13', 3, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday morning online'),
(160, N'user-d13', 3, '13:00', '16:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday afternoon online'),
(161, N'user-d14', 2, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday morning online'),
(162, N'user-d14', 2, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday afternoon online'),
(163, N'user-d14', 4, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Thursday morning online'),
(164, N'user-d14', 4, '13:00', '17:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Thursday afternoon online'),
(165, N'user-d15', 1, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday morning online'),
(166, N'user-d15', 1, '13:00', '16:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday afternoon online'),
(167, N'user-d15', 3, '08:00', '10:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday morning online'),
(168, N'user-d15', 3, '13:00', '15:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday afternoon online'),
(169, N'user-d16', 1, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday morning online'),
(170, N'user-d16', 1, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday afternoon online'),
(171, N'user-d16', 2, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday morning online'),
(172, N'user-d16', 2, '13:00', '16:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday afternoon online'),
(173, N'user-d17', 2, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday morning online'),
(174, N'user-d17', 2, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday afternoon online'),
(175, N'user-d17', 3, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday morning online'),
(176, N'user-d17', 3, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday afternoon online'),
(177, N'user-d17', 6, '08:00', '10:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Saturday morning online'),
(178, N'user-d18', 1, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday morning online'),
(179, N'user-d18', 1, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday afternoon online'),
(180, N'user-d18', 3, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday morning online'),
(181, N'user-d18', 3, '13:00', '15:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday afternoon online'),
(182, N'user-d19', 1, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday morning online'),
(183, N'user-d19', 1, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Monday afternoon online'),
(184, N'user-d19', 2, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday morning online'),
(185, N'user-d19', 2, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Tuesday afternoon online'),
(186, N'user-d19', 4, '08:00', '10:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Thursday morning online'),
(187, N'user-d20', 3, '08:00', '10:30', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday morning online'),
(188, N'user-d20', 3, '13:00', '17:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Wednesday afternoon online'),
(189, N'user-d20', 5, '08:00', '10:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Friday morning online'),
(190, N'user-d20', 5, '13:00', '15:00', 30, 1, 1, 'APPROVED', N'Online', NULL, NULL, N'Friday afternoon online');
SET IDENTITY_INSERT DoctorSchedules OFF;
GO

PRINT 'Analytics / charts seed (2024) completed successfully!';


-- =====================================================
-- 52-55. DOCTOR APPOINTMENTS 2026 + CONSULTATIONS + CHAT CONVERSATIONS
-- Adds real (non-analytics) Appointments + Consultations (for Completed ones) +
-- matching ChatRooms/ChatMessages, scoped to the login-capable core accounts:
-- doctors user-d01..user-d10 and patients user-p01..user-p10.
-- Each doctor gets past history (Jan-Jun 2026, Completed) and upcoming bookings
-- (Jul 3 - Aug 15 2026, Scheduled/Confirmed), using only the 'Online' weekly slots
-- from DoctorSchedules (section 51) so times fall inside a real shift window.
-- Patients cycle through user-p01..user-p10 (patient01 gets one appointment per
-- status type, spread across 4 different doctors).
-- AppointmentID range: 1200-1239 (ConsultationID reuses the same number for
-- Completed rows). ChatRoomId = chat-<AppointmentID>. Idempotent cleanup included.
-- =====================================================

-- Cleanup so this block can be re-run without duplicates
DELETE FROM ChatMessages WHERE ChatRoomId LIKE 'chat-12%';
DELETE FROM ChatRooms WHERE ChatRoomId LIKE 'chat-12%';
DELETE FROM Consultations WHERE AppointmentId BETWEEN 1200 AND 1239;
DELETE FROM Appointments WHERE AppointmentID BETWEEN 1200 AND 1239;
GO

-- 52. APPOINTMENTS (40: 10 doctors x 2 past Completed + 2 future Scheduled/Confirmed)
SET IDENTITY_INSERT Appointments ON;
INSERT INTO Appointments (AppointmentID, AppointmentTime, ConsultationType, Status, symptoms, notes, fee, endTime, doctorReminderSent, reminderSent, confirmedAt, PatientID, DoctorID) VALUES
(1200, '2026-01-05 07:00:00', N'Online', N'Completed', N'Persistent cough and mild fever for 4 days', N'Prescribed antitussive syrup and advised rest', 50.00, '2026-01-05 07:30:00', 0, 1, '2026-01-04 18:00:00', N'user-p01', N'user-d01'),
(1201, '2026-04-01 14:30:00', N'Online', N'Completed', N'Follow-up on ongoing chronic condition', N'Condition stable, continue current medication', 50.00, '2026-04-01 15:00:00', 0, 1, '2026-03-31 18:00:00', N'user-p04', N'user-d01'),
(1202, '2026-07-06 08:00:00', N'Online', N'Scheduled', N'New skin rash appeared on forearms', NULL, 50.00, NULL, 0, 0, NULL, N'user-p07', N'user-d01'),
(1203, '2026-08-05 14:00:00', N'Online', N'Confirmed', N'Recurring headache and general fatigue', NULL, 50.00, NULL, 0, 0, '2026-08-02 09:00:00', N'user-p10', N'user-d01'),
(1204, '2026-01-13 08:30:00', N'Online', N'Completed', N'Follow-up on ongoing chronic condition', N'Condition stable, continue current medication', 50.00, '2026-01-13 09:00:00', 0, 1, '2026-01-12 18:00:00', N'user-p02', N'user-d02'),
(1205, '2026-04-09 08:00:00', N'Online', N'Completed', N'New skin rash appeared on forearms', N'Likely contact dermatitis, topical cream prescribed', 50.00, '2026-04-09 08:30:00', 0, 1, '2026-04-08 18:00:00', N'user-p05', N'user-d02'),
(1206, '2026-07-14 08:00:00', N'Online', N'Scheduled', N'Recurring headache and general fatigue', NULL, 50.00, NULL, 0, 0, NULL, N'user-p08', N'user-d02'),
(1207, '2026-08-13 07:30:00', N'Online', N'Confirmed', N'Routine annual health screening', NULL, 50.00, NULL, 0, 0, '2026-08-10 09:00:00', N'user-p01', N'user-d02'),
(1208, '2026-01-21 08:00:00', N'Online', N'Completed', N'New skin rash appeared on forearms', N'Likely contact dermatitis, topical cream prescribed', 50.00, '2026-01-21 08:30:00', 0, 1, '2026-01-20 18:00:00', N'user-p03', N'user-d03'),
(1209, '2026-04-17 08:00:00', N'Online', N'Completed', N'Recurring headache and general fatigue', N'Recommended more sleep and hydration, reassessed in follow-up', 50.00, '2026-04-17 08:30:00', 0, 1, '2026-04-16 18:00:00', N'user-p06', N'user-d03'),
(1210, '2026-07-22 07:30:00', N'Online', N'Scheduled', N'Routine annual health screening', NULL, 50.00, NULL, 0, 0, NULL, N'user-p09', N'user-d03'),
(1211, '2026-08-07 09:00:00', N'Online', N'Confirmed', N'Mild stomach discomfort after meals', NULL, 50.00, NULL, 0, 0, '2026-08-04 09:00:00', N'user-p02', N'user-d03'),
(1212, '2026-01-22 08:00:00', N'Online', N'Completed', N'Recurring headache and general fatigue', N'Recommended more sleep and hydration, reassessed in follow-up', 50.00, '2026-01-22 08:30:00', 0, 1, '2026-01-21 18:00:00', N'user-p04', N'user-d04'),
(1213, '2026-04-23 14:00:00', N'Online', N'Completed', N'Routine annual health screening', N'All vitals within normal range', 50.00, '2026-04-23 14:30:00', 0, 1, '2026-04-22 18:00:00', N'user-p07', N'user-d04'),
(1214, '2026-07-30 09:00:00', N'Online', N'Scheduled', N'Mild stomach discomfort after meals', NULL, 50.00, NULL, 0, 0, NULL, N'user-p10', N'user-d04'),
(1215, '2026-08-13 13:30:00', N'Online', N'Confirmed', N'Blood pressure check-up', NULL, 50.00, NULL, 0, 0, '2026-08-10 09:00:00', N'user-p03', N'user-d04'),
(1216, '2026-01-30 08:30:00', N'Online', N'Completed', N'Routine annual health screening', N'All vitals within normal range', 50.00, '2026-01-30 09:00:00', 0, 1, '2026-01-29 18:00:00', N'user-p05', N'user-d05'),
(1217, '2026-05-01 09:00:00', N'Online', N'Completed', N'Mild stomach discomfort after meals', N'Advised smaller portions, prescribed antacid', 50.00, '2026-05-01 09:30:00', 0, 1, '2026-04-30 18:00:00', N'user-p08', N'user-d05'),
(1218, '2026-07-31 08:00:00', N'Online', N'Scheduled', N'Blood pressure check-up', NULL, 50.00, NULL, 0, 0, NULL, N'user-p01', N'user-d05'),
(1219, '2026-08-07 08:30:00', N'Online', N'Confirmed', N'Lower back pain after long work hours', NULL, 50.00, NULL, 0, 0, '2026-08-04 09:00:00', N'user-p04', N'user-d05'),
(1220, '2026-02-07 09:00:00', N'Online', N'Completed', N'Mild stomach discomfort after meals', N'Advised smaller portions, prescribed antacid', 50.00, '2026-02-07 09:30:00', 0, 1, '2026-02-06 18:00:00', N'user-p06', N'user-d06'),
(1221, '2026-05-06 13:30:00', N'Online', N'Completed', N'Blood pressure check-up', N'Blood pressure well controlled with current dosage', 50.00, '2026-05-06 14:00:00', 0, 1, '2026-05-05 18:00:00', N'user-p09', N'user-d06'),
(1222, '2026-07-11 08:30:00', N'Online', N'Scheduled', N'Lower back pain after long work hours', NULL, 50.00, NULL, 0, 0, NULL, N'user-p02', N'user-d06'),
(1223, '2026-08-12 14:30:00', N'Online', N'Confirmed', N'General check-up and consultation', NULL, 50.00, NULL, 0, 0, '2026-08-09 09:00:00', N'user-p05', N'user-d06'),
(1224, '2026-02-16 14:00:00', N'Online', N'Completed', N'Blood pressure check-up', N'Blood pressure well controlled with current dosage', 50.00, '2026-02-16 14:30:00', 0, 1, '2026-02-15 18:00:00', N'user-p07', N'user-d07'),
(1225, '2026-05-18 14:30:00', N'Online', N'Completed', N'Lower back pain after long work hours', N'Recommended stretching exercises and pain relief gel', 50.00, '2026-05-18 15:00:00', 0, 1, '2026-05-17 18:00:00', N'user-p10', N'user-d07'),
(1226, '2026-07-20 15:00:00', N'Online', N'Scheduled', N'General check-up and consultation', NULL, 50.00, NULL, 0, 0, NULL, N'user-p03', N'user-d07'),
(1227, '2026-08-03 14:00:00', N'Online', N'Confirmed', N'Seasonal allergy symptoms, sneezing and itchy eyes', NULL, 50.00, NULL, 0, 0, '2026-07-31 09:00:00', N'user-p06', N'user-d07'),
(1228, '2026-02-24 08:30:00', N'Online', N'Completed', N'Lower back pain after long work hours', N'Recommended stretching exercises and pain relief gel', 50.00, '2026-02-24 09:00:00', 0, 1, '2026-02-23 18:00:00', N'user-p08', N'user-d08'),
(1229, '2026-05-22 14:30:00', N'Online', N'Completed', N'General check-up and consultation', N'No abnormal findings, patient in good health', 50.00, '2026-05-22 15:00:00', 0, 1, '2026-05-21 18:00:00', N'user-p01', N'user-d08'),
(1230, '2026-07-28 08:00:00', N'Online', N'Scheduled', N'Seasonal allergy symptoms, sneezing and itchy eyes', NULL, 50.00, NULL, 0, 0, NULL, N'user-p04', N'user-d08'),
(1231, '2026-08-14 14:00:00', N'Online', N'Confirmed', N'Persistent cough and mild fever for 4 days', NULL, 50.00, NULL, 0, 0, '2026-08-11 09:00:00', N'user-p07', N'user-d08'),
(1232, '2026-03-04 14:30:00', N'Online', N'Completed', N'General check-up and consultation', N'No abnormal findings, patient in good health', 50.00, '2026-03-04 15:00:00', 0, 1, '2026-03-03 18:00:00', N'user-p09', N'user-d09'),
(1233, '2026-05-27 13:30:00', N'Online', N'Completed', N'Seasonal allergy symptoms, sneezing and itchy eyes', N'Prescribed antihistamine, avoid known triggers', 50.00, '2026-05-27 14:00:00', 0, 1, '2026-05-26 18:00:00', N'user-p02', N'user-d09'),
(1234, '2026-07-08 14:00:00', N'Online', N'Scheduled', N'Persistent cough and mild fever for 4 days', NULL, 50.00, NULL, 0, 0, NULL, N'user-p05', N'user-d09'),
(1235, '2026-08-05 14:30:00', N'Online', N'Confirmed', N'Follow-up on ongoing chronic condition', NULL, 50.00, NULL, 0, 0, '2026-08-02 09:00:00', N'user-p08', N'user-d09'),
(1236, '2026-03-09 07:00:00', N'Online', N'Completed', N'Seasonal allergy symptoms, sneezing and itchy eyes', N'Prescribed antihistamine, avoid known triggers', 50.00, '2026-03-09 07:30:00', 0, 1, '2026-03-08 18:00:00', N'user-p10', N'user-d10'),
(1237, '2026-06-03 14:00:00', N'Online', N'Completed', N'Persistent cough and mild fever for 4 days', N'Prescribed antitussive syrup and advised rest', 50.00, '2026-06-03 14:30:00', 0, 1, '2026-06-02 18:00:00', N'user-p03', N'user-d10'),
(1238, '2026-07-13 08:00:00', N'Online', N'Scheduled', N'Follow-up on ongoing chronic condition', NULL, 50.00, NULL, 0, 0, NULL, N'user-p06', N'user-d10'),
(1239, '2026-08-12 13:30:00', N'Online', N'Confirmed', N'New skin rash appeared on forearms', NULL, 50.00, NULL, 0, 0, '2026-08-09 09:00:00', N'user-p09', N'user-d10');
SET IDENTITY_INSERT Appointments OFF;
GO

-- 53. CONSULTATIONS (20, one per Completed appointment above)
SET IDENTITY_INSERT Consultations ON;
INSERT INTO Consultations (ConsultationID, AppointmentId, startTime, endTime, doctorNotes, diagnosis, followUpDate, followUpAppointmentId, consultationType, roomId, roomUrl, recordingUrl, duration, treatmentPlan, followUpNotes) VALUES
(1200, 1200, '2026-01-05 07:00:00', '2026-01-05 07:30:00', N'Prescribed antitussive syrup and advised rest', N'Upper respiratory tract infection - mild', NULL, NULL, N'Online', N'room-1200', N'https://meet.healthlink.com/room-1200', NULL, 30, N'Rest, fluids, antitussive syrup for 5 days', NULL),
(1201, 1201, '2026-04-01 14:30:00', '2026-04-01 15:00:00', N'Condition stable, continue current medication', N'Chronic condition stable, no changes needed', NULL, NULL, N'Online', N'room-1201', N'https://meet.healthlink.com/room-1201', NULL, 30, N'Continue current medication, monitor monthly', NULL),
(1204, 1204, '2026-01-13 08:30:00', '2026-01-13 09:00:00', N'Condition stable, continue current medication', N'Chronic condition stable, no changes needed', NULL, NULL, N'Online', N'room-1204', N'https://meet.healthlink.com/room-1204', NULL, 30, N'Continue current medication, monitor monthly', NULL),
(1205, 1205, '2026-04-09 08:00:00', '2026-04-09 08:30:00', N'Likely contact dermatitis, topical cream prescribed', N'Contact dermatitis', NULL, NULL, N'Online', N'room-1205', N'https://meet.healthlink.com/room-1205', NULL, 30, N'Topical corticosteroid cream, avoid irritants', NULL),
(1208, 1208, '2026-01-21 08:00:00', '2026-01-21 08:30:00', N'Likely contact dermatitis, topical cream prescribed', N'Contact dermatitis', NULL, NULL, N'Online', N'room-1208', N'https://meet.healthlink.com/room-1208', NULL, 30, N'Topical corticosteroid cream, avoid irritants', NULL),
(1209, 1209, '2026-04-17 08:00:00', '2026-04-17 08:30:00', N'Recommended more sleep and hydration, reassessed in follow-up', N'Tension-type headache, stress related', NULL, NULL, N'Online', N'room-1209', N'https://meet.healthlink.com/room-1209', NULL, 30, N'Improve sleep hygiene, stress management techniques', NULL),
(1212, 1212, '2026-01-22 08:00:00', '2026-01-22 08:30:00', N'Recommended more sleep and hydration, reassessed in follow-up', N'Tension-type headache, stress related', NULL, NULL, N'Online', N'room-1212', N'https://meet.healthlink.com/room-1212', NULL, 30, N'Improve sleep hygiene, stress management techniques', NULL),
(1213, 1213, '2026-04-23 14:00:00', '2026-04-23 14:30:00', N'All vitals within normal range', N'Healthy, no abnormal findings', NULL, NULL, N'Online', N'room-1213', N'https://meet.healthlink.com/room-1213', NULL, 30, N'No treatment needed, routine follow-up in 6 months', NULL),
(1216, 1216, '2026-01-30 08:30:00', '2026-01-30 09:00:00', N'All vitals within normal range', N'Healthy, no abnormal findings', NULL, NULL, N'Online', N'room-1216', N'https://meet.healthlink.com/room-1216', NULL, 30, N'No treatment needed, routine follow-up in 6 months', NULL),
(1217, 1217, '2026-05-01 09:00:00', '2026-05-01 09:30:00', N'Advised smaller portions, prescribed antacid', N'Mild functional dyspepsia', NULL, NULL, N'Online', N'room-1217', N'https://meet.healthlink.com/room-1217', NULL, 30, N'Smaller frequent meals, antacid as needed', NULL),
(1220, 1220, '2026-02-07 09:00:00', '2026-02-07 09:30:00', N'Advised smaller portions, prescribed antacid', N'Mild functional dyspepsia', NULL, NULL, N'Online', N'room-1220', N'https://meet.healthlink.com/room-1220', NULL, 30, N'Smaller frequent meals, antacid as needed', NULL),
(1221, 1221, '2026-05-06 13:30:00', '2026-05-06 14:00:00', N'Blood pressure well controlled with current dosage', N'Hypertension, well controlled', NULL, NULL, N'Online', N'room-1221', N'https://meet.healthlink.com/room-1221', NULL, 30, N'Continue antihypertensive medication, low-salt diet', NULL),
(1224, 1224, '2026-02-16 14:00:00', '2026-02-16 14:30:00', N'Blood pressure well controlled with current dosage', N'Hypertension, well controlled', NULL, NULL, N'Online', N'room-1224', N'https://meet.healthlink.com/room-1224', NULL, 30, N'Continue antihypertensive medication, low-salt diet', NULL),
(1225, 1225, '2026-05-18 14:30:00', '2026-05-18 15:00:00', N'Recommended stretching exercises and pain relief gel', N'Mechanical lower back strain', NULL, NULL, N'Online', N'room-1225', N'https://meet.healthlink.com/room-1225', NULL, 30, N'Stretching exercises, topical pain relief gel', NULL),
(1228, 1228, '2026-02-24 08:30:00', '2026-02-24 09:00:00', N'Recommended stretching exercises and pain relief gel', N'Mechanical lower back strain', NULL, NULL, N'Online', N'room-1228', N'https://meet.healthlink.com/room-1228', NULL, 30, N'Stretching exercises, topical pain relief gel', NULL),
(1229, 1229, '2026-05-22 14:30:00', '2026-05-22 15:00:00', N'No abnormal findings, patient in good health', N'General health good', NULL, NULL, N'Online', N'room-1229', N'https://meet.healthlink.com/room-1229', NULL, 30, N'Maintain healthy lifestyle, annual check-up', NULL),
(1232, 1232, '2026-03-04 14:30:00', '2026-03-04 15:00:00', N'No abnormal findings, patient in good health', N'General health good', NULL, NULL, N'Online', N'room-1232', N'https://meet.healthlink.com/room-1232', NULL, 30, N'Maintain healthy lifestyle, annual check-up', NULL),
(1233, 1233, '2026-05-27 13:30:00', '2026-05-27 14:00:00', N'Prescribed antihistamine, avoid known triggers', N'Seasonal allergic rhinitis', NULL, NULL, N'Online', N'room-1233', N'https://meet.healthlink.com/room-1233', NULL, 30, N'Antihistamine as needed, avoid known allergens', NULL),
(1236, 1236, '2026-03-09 07:00:00', '2026-03-09 07:30:00', N'Prescribed antihistamine, avoid known triggers', N'Seasonal allergic rhinitis', NULL, NULL, N'Online', N'room-1236', N'https://meet.healthlink.com/room-1236', NULL, 30, N'Antihistamine as needed, avoid known allergens', NULL),
(1237, 1237, '2026-06-03 14:00:00', '2026-06-03 14:30:00', N'Prescribed antitussive syrup and advised rest', N'Upper respiratory tract infection - mild', NULL, NULL, N'Online', N'room-1237', N'https://meet.healthlink.com/room-1237', NULL, 30, N'Rest, fluids, antitussive syrup for 5 days', NULL);
SET IDENTITY_INSERT Consultations OFF;
GO

UPDATE Consultations
   SET HomeVisitProposalStatus = 'NONE'
 WHERE AppointmentId BETWEEN 1200 AND 1239
   AND HomeVisitProposalStatus IS NULL;
GO

-- 54. CHAT_ROOMS (40, one per new appointment)
INSERT INTO ChatRooms (ChatRoomId, user1Id, user2Id, user1DisplayName, user1PhotoURL, user2DisplayName, user2PhotoURL, lastMessage, lastMessageAt, blockedBy, AppointmentId) VALUES
('chat-1203', N'user-p10', N'user-d01', N'Charlotte Taylor', N'http://localhost:8096/uploads/avatars/patients/benhnhan_10.png', N'Dr. John Smith', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', N'Understood, I will bring them. Thank you!', '2026-07-05 11:15:00', NULL, 1203),
('chat-1204', N'user-p02', N'user-d02', N'Emma Thompson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', N'Dr. Sarah Johnson', N'http://localhost:8096/uploads/avatars/doctors/bacsi_02.png', N'Thank you doctor, I understand the treatment plan.', '2026-01-13 09:05:00', NULL, 1204),
('chat-1205', N'user-p05', N'user-d02', N'James Wilson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', N'Dr. Sarah Johnson', N'http://localhost:8096/uploads/avatars/doctors/bacsi_02.png', N'Thank you doctor, I understand the treatment plan.', '2026-04-09 08:35:00', NULL, 1205),
('chat-1206', N'user-p08', N'user-d02', N'Isabella Moore', N'http://localhost:8096/uploads/avatars/patients/benhnhan_08.png', N'Dr. Sarah Johnson', N'http://localhost:8096/uploads/avatars/doctors/bacsi_02.png', N'Great, thank you! I will be there.', '2026-07-11 11:10:00', NULL, 1206),
('chat-1207', N'user-p01', N'user-d02', N'Michael Anderson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', N'Dr. Sarah Johnson', N'http://localhost:8096/uploads/avatars/doctors/bacsi_02.png', N'Understood, I will bring them. Thank you!', '2026-07-13 11:15:00', NULL, 1207),
('chat-1208', N'user-p03', N'user-d03', N'William Brown', N'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', N'Dr. Michael Chen', N'http://localhost:8096/uploads/avatars/doctors/bacsi_03.png', N'Thank you doctor, I understand the treatment plan.', '2026-01-21 08:35:00', NULL, 1208),
('chat-1209', N'user-p06', N'user-d03', N'Olivia Davis', N'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', N'Dr. Michael Chen', N'http://localhost:8096/uploads/avatars/doctors/bacsi_03.png', N'Thank you doctor, I understand the treatment plan.', '2026-04-17 08:35:00', NULL, 1209),
('chat-1210', N'user-p09', N'user-d03', N'Alexander Johnson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_09.png', N'Dr. Michael Chen', N'http://localhost:8096/uploads/avatars/doctors/bacsi_03.png', N'Great, thank you! I will be there.', '2026-06-22 11:10:00', NULL, 1210),
('chat-1211', N'user-p02', N'user-d03', N'Emma Thompson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', N'Dr. Michael Chen', N'http://localhost:8096/uploads/avatars/doctors/bacsi_03.png', N'Understood, I will bring them. Thank you!', '2026-07-07 11:15:00', NULL, 1211),
('chat-1212', N'user-p04', N'user-d04', N'Sophia Garcia', N'http://localhost:8096/uploads/avatars/patients/benhnhan_04.png', N'Dr. Emily Davis', N'http://localhost:8096/uploads/avatars/doctors/bacsi_04.png', N'Thank you doctor, I understand the treatment plan.', '2026-01-22 08:35:00', NULL, 1212),
('chat-1213', N'user-p07', N'user-d04', N'Daniel Miller', N'http://localhost:8096/uploads/avatars/patients/benhnhan_07.png', N'Dr. Emily Davis', N'http://localhost:8096/uploads/avatars/doctors/bacsi_04.png', N'Thank you doctor, I understand the treatment plan.', '2026-04-23 14:35:00', NULL, 1213),
('chat-1214', N'user-p10', N'user-d04', N'Charlotte Taylor', N'http://localhost:8096/uploads/avatars/patients/benhnhan_10.png', N'Dr. Emily Davis', N'http://localhost:8096/uploads/avatars/doctors/bacsi_04.png', N'Great, thank you! I will be there.', '2026-06-30 11:10:00', NULL, 1214),
('chat-1215', N'user-p03', N'user-d04', N'William Brown', N'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', N'Dr. Emily Davis', N'http://localhost:8096/uploads/avatars/doctors/bacsi_04.png', N'Understood, I will bring them. Thank you!', '2026-07-13 11:15:00', NULL, 1215),
('chat-1216', N'user-p05', N'user-d05', N'James Wilson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', N'Dr. Jessica Williams', N'http://localhost:8096/uploads/avatars/doctors/bacsi_05.png', N'Thank you doctor, I understand the treatment plan.', '2026-01-30 09:05:00', NULL, 1216),
('chat-1217', N'user-p08', N'user-d05', N'Isabella Moore', N'http://localhost:8096/uploads/avatars/patients/benhnhan_08.png', N'Dr. Jessica Williams', N'http://localhost:8096/uploads/avatars/doctors/bacsi_05.png', N'Thank you doctor, I understand the treatment plan.', '2026-05-01 09:35:00', NULL, 1217),
('chat-1218', N'user-p01', N'user-d05', N'Michael Anderson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', N'Dr. Jessica Williams', N'http://localhost:8096/uploads/avatars/doctors/bacsi_05.png', N'Great, thank you! I will be there.', '2026-07-01 11:10:00', NULL, 1218),
('chat-1219', N'user-p04', N'user-d05', N'Sophia Garcia', N'http://localhost:8096/uploads/avatars/patients/benhnhan_04.png', N'Dr. Jessica Williams', N'http://localhost:8096/uploads/avatars/doctors/bacsi_05.png', N'Understood, I will bring them. Thank you!', '2026-07-07 11:15:00', NULL, 1219),
('chat-1220', N'user-p06', N'user-d06', N'Olivia Davis', N'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', N'Dr. Robert Brown', N'http://localhost:8096/uploads/avatars/doctors/bacsi_06.png', N'Thank you doctor, I understand the treatment plan.', '2026-02-07 09:35:00', NULL, 1220),
('chat-1221', N'user-p09', N'user-d06', N'Alexander Johnson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_09.png', N'Dr. Robert Brown', N'http://localhost:8096/uploads/avatars/doctors/bacsi_06.png', N'Thank you doctor, I understand the treatment plan.', '2026-05-06 14:05:00', NULL, 1221),
('chat-1222', N'user-p02', N'user-d06', N'Emma Thompson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', N'Dr. Robert Brown', N'http://localhost:8096/uploads/avatars/doctors/bacsi_06.png', N'Great, thank you! I will be there.', '2026-07-08 11:10:00', NULL, 1222),
('chat-1223', N'user-p05', N'user-d06', N'James Wilson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', N'Dr. Robert Brown', N'http://localhost:8096/uploads/avatars/doctors/bacsi_06.png', N'Understood, I will bring them. Thank you!', '2026-07-12 11:15:00', NULL, 1223),
('chat-1224', N'user-p07', N'user-d07', N'Daniel Miller', N'http://localhost:8096/uploads/avatars/patients/benhnhan_07.png', N'Dr. David Wilson', N'http://localhost:8096/uploads/avatars/doctors/bacsi_07.png', N'Thank you doctor, I understand the treatment plan.', '2026-02-16 14:35:00', NULL, 1224),
('chat-1225', N'user-p10', N'user-d07', N'Charlotte Taylor', N'http://localhost:8096/uploads/avatars/patients/benhnhan_10.png', N'Dr. David Wilson', N'http://localhost:8096/uploads/avatars/doctors/bacsi_07.png', N'Thank you doctor, I understand the treatment plan.', '2026-05-18 15:05:00', NULL, 1225),
('chat-1226', N'user-p03', N'user-d07', N'William Brown', N'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', N'Dr. David Wilson', N'http://localhost:8096/uploads/avatars/doctors/bacsi_07.png', N'Great, thank you! I will be there.', '2026-06-20 11:10:00', NULL, 1226),
('chat-1227', N'user-p06', N'user-d07', N'Olivia Davis', N'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', N'Dr. David Wilson', N'http://localhost:8096/uploads/avatars/doctors/bacsi_07.png', N'Understood, I will bring them. Thank you!', '2026-07-03 11:15:00', NULL, 1227),
('chat-1228', N'user-p08', N'user-d08', N'Isabella Moore', N'http://localhost:8096/uploads/avatars/patients/benhnhan_08.png', N'Dr. Amanda Lee', N'http://localhost:8096/uploads/avatars/doctors/bacsi_08.png', N'Thank you doctor, I understand the treatment plan.', '2026-02-24 09:05:00', NULL, 1228),
('chat-1229', N'user-p01', N'user-d08', N'Michael Anderson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', N'Dr. Amanda Lee', N'http://localhost:8096/uploads/avatars/doctors/bacsi_08.png', N'Thank you doctor, I understand the treatment plan.', '2026-05-22 15:05:00', NULL, 1229),
('chat-1230', N'user-p04', N'user-d08', N'Sophia Garcia', N'http://localhost:8096/uploads/avatars/patients/benhnhan_04.png', N'Dr. Amanda Lee', N'http://localhost:8096/uploads/avatars/doctors/bacsi_08.png', N'Great, thank you! I will be there.', '2026-06-28 11:10:00', NULL, 1230),
('chat-1231', N'user-p07', N'user-d08', N'Daniel Miller', N'http://localhost:8096/uploads/avatars/patients/benhnhan_07.png', N'Dr. Amanda Lee', N'http://localhost:8096/uploads/avatars/doctors/bacsi_08.png', N'Understood, I will bring them. Thank you!', '2026-07-14 11:15:00', NULL, 1231),
('chat-1232', N'user-p09', N'user-d09', N'Alexander Johnson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_09.png', N'Dr. James Taylor', N'http://localhost:8096/uploads/avatars/doctors/bacsi_09.png', N'Thank you doctor, I understand the treatment plan.', '2026-03-04 15:05:00', NULL, 1232),
('chat-1233', N'user-p02', N'user-d09', N'Emma Thompson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', N'Dr. James Taylor', N'http://localhost:8096/uploads/avatars/doctors/bacsi_09.png', N'Thank you doctor, I understand the treatment plan.', '2026-05-27 14:05:00', NULL, 1233),
('chat-1234', N'user-p05', N'user-d09', N'James Wilson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', N'Dr. James Taylor', N'http://localhost:8096/uploads/avatars/doctors/bacsi_09.png', N'Great, thank you! I will be there.', '2026-07-05 11:10:00', NULL, 1234),
('chat-1235', N'user-p08', N'user-d09', N'Isabella Moore', N'http://localhost:8096/uploads/avatars/patients/benhnhan_08.png', N'Dr. James Taylor', N'http://localhost:8096/uploads/avatars/doctors/bacsi_09.png', N'Understood, I will bring them. Thank you!', '2026-07-05 11:15:00', NULL, 1235),
('chat-1236', N'user-p10', N'user-d10', N'Charlotte Taylor', N'http://localhost:8096/uploads/avatars/patients/benhnhan_10.png', N'Dr. Jennifer Martinez', N'http://localhost:8096/uploads/avatars/doctors/bacsi_10.png', N'Thank you doctor, I understand the treatment plan.', '2026-03-09 07:35:00', NULL, 1236),
('chat-1237', N'user-p03', N'user-d10', N'William Brown', N'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', N'Dr. Jennifer Martinez', N'http://localhost:8096/uploads/avatars/doctors/bacsi_10.png', N'Thank you doctor, I understand the treatment plan.', '2026-06-03 14:35:00', NULL, 1237),
('chat-1238', N'user-p06', N'user-d10', N'Olivia Davis', N'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', N'Dr. Jennifer Martinez', N'http://localhost:8096/uploads/avatars/doctors/bacsi_10.png', N'Great, thank you! I will be there.', '2026-07-10 11:10:00', NULL, 1238),
('chat-1239', N'user-p09', N'user-d10', N'Alexander Johnson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_09.png', N'Dr. Jennifer Martinez', N'http://localhost:8096/uploads/avatars/doctors/bacsi_10.png', N'Understood, I will bring them. Thank you!', '2026-07-12 11:15:00', NULL, 1239);
GO

-- 55. MESSAGES (111, 3 per chat room)
INSERT INTO ChatMessages (MessageID, ChatRoomId, SenderId, ReceiverId, content, photoURL, imageUrl, videoUrl, fileUrl, IsRead, SentAt) VALUES
('d7651747-59e8-45e0-8e32-e3d3a7f2ff49', N'chat-1203', N'user-p10', N'user-d01', N'Hello doctor, just checking in ahead of my appointment on 2026-08-05.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_10.png', NULL, NULL, NULL, 1, '2026-07-05 09:00:00'),
('69e44f70-57c2-41bf-8f70-bc71c7f20ee7', N'chat-1203', N'user-d01', N'user-p10', N'Your appointment on 2026-08-05 at 14:00 is confirmed. Please prepare your recent test results if any.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2026-07-05 11:00:00'),
('43bcddb2-e99b-428a-8f6a-628417a1a96d', N'chat-1203', N'user-p10', N'user-d01', N'Understood, I will bring them. Thank you!', N'http://localhost:8096/uploads/avatars/patients/benhnhan_10.png', NULL, NULL, NULL, 1, '2026-07-05 11:15:00'),
('c3490d73-abdb-4695-babf-a63a14fad4b0', N'chat-1204', N'user-d02', N'user-p02', N'Before we start, can you tell me more about: follow-up on ongoing chronic condition?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_02.png', NULL, NULL, NULL, 1, '2026-01-13 08:10:00'),
('8dbaa8c7-884a-48ec-9397-b608339e14fa', N'chat-1204', N'user-p02', N'user-d02', N'Follow-up on ongoing chronic condition. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', NULL, NULL, NULL, 1, '2026-01-13 08:15:00'),
('b1ecbdb1-754d-4b5e-bdb1-03b4f6520652', N'chat-1204', N'user-p02', N'user-d02', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', NULL, NULL, NULL, 1, '2026-01-13 09:05:00'),
('128e0672-082f-41e5-a43b-ee2d74024280', N'chat-1205', N'user-d02', N'user-p05', N'Before we start, can you tell me more about: new skin rash appeared on forearms?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_02.png', NULL, NULL, NULL, 1, '2026-04-09 07:40:00'),
('79c8f04a-26cd-43ed-9fab-cc548912a095', N'chat-1205', N'user-p05', N'user-d02', N'New skin rash appeared on forearms. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', NULL, NULL, NULL, 1, '2026-04-09 07:45:00'),
('e56beff5-9330-410f-adcf-5af8be5d7ea5', N'chat-1205', N'user-p05', N'user-d02', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', NULL, NULL, NULL, 1, '2026-04-09 08:35:00'),
('084e0426-dfd0-4dc5-9f4c-9b0ccac034b4', N'chat-1206', N'user-p08', N'user-d02', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-07-14.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_08.png', NULL, NULL, NULL, 1, '2026-07-11 10:00:00'),
('e0f2760c-7bb1-476a-a25d-ffecc3e64b3d', N'chat-1206', N'user-d02', N'user-p08', N'Hi Isabella Moore, yes I have you booked for 2026-07-14 at 08:00. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_02.png', NULL, NULL, NULL, 1, '2026-07-11 11:00:00'),
('b5137c74-3060-45e7-a0d0-ad4022c385c9', N'chat-1206', N'user-p08', N'user-d02', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_08.png', NULL, NULL, NULL, 1, '2026-07-11 11:10:00'),
('cf65b2ae-4838-41db-92ab-7c895723db90', N'chat-1207', N'user-p01', N'user-d02', N'Hello doctor, just checking in ahead of my appointment on 2026-08-13.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', NULL, NULL, NULL, 1, '2026-07-13 09:00:00'),
('fd1edddc-23b8-47df-ab22-cf7a872f6c21', N'chat-1207', N'user-d02', N'user-p01', N'Your appointment on 2026-08-13 at 07:30 is confirmed. Please prepare your recent test results if any.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_02.png', NULL, NULL, NULL, 1, '2026-07-13 11:00:00'),
('083ab39c-8b03-4ad5-b6e5-f1506894eb7e', N'chat-1207', N'user-p01', N'user-d02', N'Understood, I will bring them. Thank you!', N'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', NULL, NULL, NULL, 1, '2026-07-13 11:15:00'),
('4d2e8699-7ce3-48ee-a8d0-75860f813e46', N'chat-1208', N'user-d03', N'user-p03', N'Before we start, can you tell me more about: new skin rash appeared on forearms?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_03.png', NULL, NULL, NULL, 1, '2026-01-21 07:40:00'),
('12bf244c-f3f8-4bf4-9d69-6e22624de486', N'chat-1208', N'user-p03', N'user-d03', N'New skin rash appeared on forearms. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', NULL, NULL, NULL, 1, '2026-01-21 07:45:00'),
('1518ebc0-100e-418b-a86b-5a6055433077', N'chat-1208', N'user-p03', N'user-d03', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', NULL, NULL, NULL, 1, '2026-01-21 08:35:00'),
('c5f07690-4b2f-4e22-996f-1aa517d37d1b', N'chat-1209', N'user-d03', N'user-p06', N'Before we start, can you tell me more about: recurring headache and general fatigue?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_03.png', NULL, NULL, NULL, 1, '2026-04-17 07:40:00'),
('44522829-5f8c-4d3e-93f3-115bf921ceb3', N'chat-1209', N'user-p06', N'user-d03', N'Recurring headache and general fatigue. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', NULL, NULL, NULL, 1, '2026-04-17 07:45:00'),
('15863e2d-de0e-4abd-9f9a-fd39d8c168e5', N'chat-1209', N'user-p06', N'user-d03', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', NULL, NULL, NULL, 1, '2026-04-17 08:35:00'),
('247c947b-9973-485d-8bc6-0b8cf642147f', N'chat-1210', N'user-p09', N'user-d03', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-07-22.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_09.png', NULL, NULL, NULL, 1, '2026-06-22 10:00:00'),
('53ab7704-604c-4293-a8db-584a5aed2fe2', N'chat-1210', N'user-d03', N'user-p09', N'Hi Alexander Johnson, yes I have you booked for 2026-07-22 at 07:30. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_03.png', NULL, NULL, NULL, 1, '2026-06-22 11:00:00'),
('f41f9a4c-06fd-4238-96f8-b31b814ba2d1', N'chat-1210', N'user-p09', N'user-d03', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_09.png', NULL, NULL, NULL, 1, '2026-06-22 11:10:00'),
('16135556-f054-4417-a0d7-a8b100a7ac9e', N'chat-1211', N'user-p02', N'user-d03', N'Hello doctor, just checking in ahead of my appointment on 2026-08-07.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', NULL, NULL, NULL, 1, '2026-07-07 09:00:00'),
('fefea75c-e9a6-4212-9690-78ce2fe6434f', N'chat-1211', N'user-d03', N'user-p02', N'Your appointment on 2026-08-07 at 09:00 is confirmed. Please prepare your recent test results if any.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_03.png', NULL, NULL, NULL, 1, '2026-07-07 11:00:00'),
('21af4b39-9f34-4a99-bd09-e68aaf96a2ad', N'chat-1211', N'user-p02', N'user-d03', N'Understood, I will bring them. Thank you!', N'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', NULL, NULL, NULL, 1, '2026-07-07 11:15:00'),
('1d264d44-d589-49ce-9389-de65ae10b134', N'chat-1212', N'user-d04', N'user-p04', N'Before we start, can you tell me more about: recurring headache and general fatigue?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_04.png', NULL, NULL, NULL, 1, '2026-01-22 07:40:00'),
('5360e5fd-e9f8-4a5b-bf40-93b372279a8f', N'chat-1212', N'user-p04', N'user-d04', N'Recurring headache and general fatigue. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_04.png', NULL, NULL, NULL, 1, '2026-01-22 07:45:00'),
('2c72a688-fdb7-48d4-9044-e971a00cd8d3', N'chat-1212', N'user-p04', N'user-d04', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_04.png', NULL, NULL, NULL, 1, '2026-01-22 08:35:00'),
('744aa00d-ade8-47db-b2a4-eb8e9fd10d43', N'chat-1213', N'user-d04', N'user-p07', N'Before we start, can you tell me more about: routine annual health screening?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_04.png', NULL, NULL, NULL, 1, '2026-04-23 13:40:00'),
('66a92a60-71dd-49f1-923d-4044cee2dbf1', N'chat-1213', N'user-p07', N'user-d04', N'Routine annual health screening. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_07.png', NULL, NULL, NULL, 1, '2026-04-23 13:45:00'),
('0c7ae5c0-68ca-4f3b-a9b7-dabc12be391a', N'chat-1213', N'user-p07', N'user-d04', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_07.png', NULL, NULL, NULL, 1, '2026-04-23 14:35:00'),
('85cfe375-a375-40b3-976c-c36990127797', N'chat-1214', N'user-p10', N'user-d04', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-07-30.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_10.png', NULL, NULL, NULL, 1, '2026-06-30 10:00:00'),
('b0b392fb-2d0d-49e8-b536-a31cae01b43c', N'chat-1214', N'user-d04', N'user-p10', N'Hi Charlotte Taylor, yes I have you booked for 2026-07-30 at 09:00. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_04.png', NULL, NULL, NULL, 1, '2026-06-30 11:00:00'),
('55b1f5fc-9fc6-4c38-a860-ae06dc50ab0d', N'chat-1214', N'user-p10', N'user-d04', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_10.png', NULL, NULL, NULL, 1, '2026-06-30 11:10:00'),
('5cf13316-5b83-45ce-b67a-d9f068f41d41', N'chat-1215', N'user-p03', N'user-d04', N'Hello doctor, just checking in ahead of my appointment on 2026-08-13.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', NULL, NULL, NULL, 1, '2026-07-13 09:00:00'),
('aab553ec-b738-4033-9ad0-f257bd2e0c67', N'chat-1215', N'user-d04', N'user-p03', N'Your appointment on 2026-08-13 at 13:30 is confirmed. Please prepare your recent test results if any.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_04.png', NULL, NULL, NULL, 1, '2026-07-13 11:00:00'),
('4bc5af38-317d-421a-9af5-075ae0ae9a3c', N'chat-1215', N'user-p03', N'user-d04', N'Understood, I will bring them. Thank you!', N'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', NULL, NULL, NULL, 1, '2026-07-13 11:15:00'),
('6493120f-69b3-4b3b-9c9e-984a9e118ab1', N'chat-1216', N'user-d05', N'user-p05', N'Before we start, can you tell me more about: routine annual health screening?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_05.png', NULL, NULL, NULL, 1, '2026-01-30 08:10:00'),
('8fb9efcb-96a5-47aa-bf00-509b0cbc06f0', N'chat-1216', N'user-p05', N'user-d05', N'Routine annual health screening. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', NULL, NULL, NULL, 1, '2026-01-30 08:15:00'),
('eac4c80c-2604-4e6a-857e-efa5ab095a61', N'chat-1216', N'user-p05', N'user-d05', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', NULL, NULL, NULL, 1, '2026-01-30 09:05:00'),
('6909c2f8-36bf-4ed6-9a97-d56b9cafcb5f', N'chat-1217', N'user-d05', N'user-p08', N'Before we start, can you tell me more about: mild stomach discomfort after meals?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_05.png', NULL, NULL, NULL, 1, '2026-05-01 08:40:00'),
('bb652deb-4f62-4061-85d8-ed4c6e19cbe6', N'chat-1217', N'user-p08', N'user-d05', N'Mild stomach discomfort after meals. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_08.png', NULL, NULL, NULL, 1, '2026-05-01 08:45:00'),
('08cdff2e-0e1c-4ed1-a3e5-9468416f59b7', N'chat-1217', N'user-p08', N'user-d05', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_08.png', NULL, NULL, NULL, 1, '2026-05-01 09:35:00'),
('25aaa2a4-4dc6-42dc-b8ad-9f4ff1ffe096', N'chat-1218', N'user-p01', N'user-d05', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-07-31.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', NULL, NULL, NULL, 1, '2026-07-01 10:00:00'),
('3ad1028c-e43e-48fb-be9e-85007bb5122d', N'chat-1218', N'user-d05', N'user-p01', N'Hi Michael Anderson, yes I have you booked for 2026-07-31 at 08:00. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_05.png', NULL, NULL, NULL, 1, '2026-07-01 11:00:00'),
('f760fbbf-3788-4c62-b056-ada1c1f640d7', N'chat-1218', N'user-p01', N'user-d05', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', NULL, NULL, NULL, 1, '2026-07-01 11:10:00'),
('776f1f9d-1bcb-42aa-a826-d60e85fa13e8', N'chat-1219', N'user-p04', N'user-d05', N'Hello doctor, just checking in ahead of my appointment on 2026-08-07.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_04.png', NULL, NULL, NULL, 1, '2026-07-07 09:00:00'),
('5c596886-1c23-4b88-8149-908f6e538a8b', N'chat-1219', N'user-d05', N'user-p04', N'Your appointment on 2026-08-07 at 08:30 is confirmed. Please prepare your recent test results if any.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_05.png', NULL, NULL, NULL, 1, '2026-07-07 11:00:00'),
('efd269dd-d31b-4bf8-92d4-82d17bd68b68', N'chat-1219', N'user-p04', N'user-d05', N'Understood, I will bring them. Thank you!', N'http://localhost:8096/uploads/avatars/patients/benhnhan_04.png', NULL, NULL, NULL, 1, '2026-07-07 11:15:00'),
('ec8ea54b-1d97-4b90-b657-242dd9a333a4', N'chat-1220', N'user-d06', N'user-p06', N'Before we start, can you tell me more about: mild stomach discomfort after meals?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_06.png', NULL, NULL, NULL, 1, '2026-02-07 08:40:00'),
('d1c30bda-7714-4a83-9535-d9433924e213', N'chat-1220', N'user-p06', N'user-d06', N'Mild stomach discomfort after meals. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', NULL, NULL, NULL, 1, '2026-02-07 08:45:00'),
('6eb9e7ac-0492-47dc-ba2e-5cae8474d297', N'chat-1220', N'user-p06', N'user-d06', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', NULL, NULL, NULL, 1, '2026-02-07 09:35:00'),
('c9be0701-b662-4863-8647-b8a2ecc8cf62', N'chat-1221', N'user-d06', N'user-p09', N'Before we start, can you tell me more about: blood pressure check-up?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_06.png', NULL, NULL, NULL, 1, '2026-05-06 13:10:00'),
('adc99b93-4e7a-4f9a-9e9c-87c28e763954', N'chat-1221', N'user-p09', N'user-d06', N'Blood pressure check-up. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_09.png', NULL, NULL, NULL, 1, '2026-05-06 13:15:00'),
('3d5fb9c1-5cd1-49d9-88f1-e86182dea71c', N'chat-1221', N'user-p09', N'user-d06', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_09.png', NULL, NULL, NULL, 1, '2026-05-06 14:05:00'),
('0369b70f-4c32-45dc-b60f-ab4c45a65fb5', N'chat-1222', N'user-p02', N'user-d06', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-07-11.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', NULL, NULL, NULL, 1, '2026-07-08 10:00:00'),
('ff21329e-d5ac-43d9-8bac-2d58dd6fbbce', N'chat-1222', N'user-d06', N'user-p02', N'Hi Emma Thompson, yes I have you booked for 2026-07-11 at 08:30. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_06.png', NULL, NULL, NULL, 1, '2026-07-08 11:00:00'),
('03f38773-d345-4553-b837-0e04e1eb2dd9', N'chat-1222', N'user-p02', N'user-d06', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', NULL, NULL, NULL, 1, '2026-07-08 11:10:00'),
('3ac574f5-e264-45de-bfd2-ec559834aa04', N'chat-1223', N'user-p05', N'user-d06', N'Hello doctor, just checking in ahead of my appointment on 2026-08-12.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', NULL, NULL, NULL, 1, '2026-07-12 09:00:00'),
('cc09c46e-4218-4d73-ad7a-7de82b98de61', N'chat-1223', N'user-d06', N'user-p05', N'Your appointment on 2026-08-12 at 14:30 is confirmed. Please prepare your recent test results if any.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_06.png', NULL, NULL, NULL, 1, '2026-07-12 11:00:00'),
('2c52e903-2a90-4301-bade-95edd574195b', N'chat-1223', N'user-p05', N'user-d06', N'Understood, I will bring them. Thank you!', N'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', NULL, NULL, NULL, 1, '2026-07-12 11:15:00'),
('30202b36-b118-4c69-a4bd-911254d19cb0', N'chat-1224', N'user-d07', N'user-p07', N'Before we start, can you tell me more about: blood pressure check-up?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_07.png', NULL, NULL, NULL, 1, '2026-02-16 13:40:00'),
('192076ea-7695-4e75-bf95-432f99525dfa', N'chat-1224', N'user-p07', N'user-d07', N'Blood pressure check-up. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_07.png', NULL, NULL, NULL, 1, '2026-02-16 13:45:00'),
('5dcb6604-67d6-4c5a-8f28-0df375f28672', N'chat-1224', N'user-p07', N'user-d07', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_07.png', NULL, NULL, NULL, 1, '2026-02-16 14:35:00'),
('f8269455-210d-4129-8b63-9600d3dae35f', N'chat-1225', N'user-d07', N'user-p10', N'Before we start, can you tell me more about: lower back pain after long work hours?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_07.png', NULL, NULL, NULL, 1, '2026-05-18 14:10:00'),
('1bc3e313-26c6-426e-a837-ef07a460aac5', N'chat-1225', N'user-p10', N'user-d07', N'Lower back pain after long work hours. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_10.png', NULL, NULL, NULL, 1, '2026-05-18 14:15:00'),
('4b3a76d5-5225-4dbd-9768-35665c4cea4f', N'chat-1225', N'user-p10', N'user-d07', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_10.png', NULL, NULL, NULL, 1, '2026-05-18 15:05:00'),
('6f259cba-d65a-4056-810e-9a11192a0626', N'chat-1226', N'user-p03', N'user-d07', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-07-20.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', NULL, NULL, NULL, 1, '2026-06-20 10:00:00'),
('89344161-eb75-4adb-a221-134918b5dc86', N'chat-1226', N'user-d07', N'user-p03', N'Hi William Brown, yes I have you booked for 2026-07-20 at 15:00. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_07.png', NULL, NULL, NULL, 1, '2026-06-20 11:00:00'),
('805efc4f-b776-4182-880f-2b171885b423', N'chat-1226', N'user-p03', N'user-d07', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', NULL, NULL, NULL, 1, '2026-06-20 11:10:00'),
('b9a589e6-0baf-4680-9f6c-030a03ad32ef', N'chat-1227', N'user-p06', N'user-d07', N'Hello doctor, just checking in ahead of my appointment on 2026-08-03.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', NULL, NULL, NULL, 1, '2026-07-03 09:00:00'),
('6c11ccf2-a260-4f52-b474-c3c338bdbe08', N'chat-1227', N'user-d07', N'user-p06', N'Your appointment on 2026-08-03 at 14:00 is confirmed. Please prepare your recent test results if any.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_07.png', NULL, NULL, NULL, 1, '2026-07-03 11:00:00'),
('7eaab94c-3352-400e-914e-0fbb9c2288b2', N'chat-1227', N'user-p06', N'user-d07', N'Understood, I will bring them. Thank you!', N'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', NULL, NULL, NULL, 1, '2026-07-03 11:15:00'),
('97f3c982-609f-4b8f-9c3d-d0a22aa7abfc', N'chat-1228', N'user-d08', N'user-p08', N'Before we start, can you tell me more about: lower back pain after long work hours?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_08.png', NULL, NULL, NULL, 1, '2026-02-24 08:10:00'),
('ce883845-8cdf-4d0b-ac62-436307b0a684', N'chat-1228', N'user-p08', N'user-d08', N'Lower back pain after long work hours. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_08.png', NULL, NULL, NULL, 1, '2026-02-24 08:15:00'),
('f422b1b5-4fde-4953-a53c-4740b79b328f', N'chat-1228', N'user-p08', N'user-d08', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_08.png', NULL, NULL, NULL, 1, '2026-02-24 09:05:00'),
('db11c1a1-854e-4d00-9899-1b5d2c51e2da', N'chat-1229', N'user-d08', N'user-p01', N'Before we start, can you tell me more about: general check-up and consultation?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_08.png', NULL, NULL, NULL, 1, '2026-05-22 14:10:00'),
('ef633a05-2b83-4ee8-84de-81594ad26a9c', N'chat-1229', N'user-p01', N'user-d08', N'General check-up and consultation. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', NULL, NULL, NULL, 1, '2026-05-22 14:15:00'),
('09618594-ea60-4531-bb13-f454d8689929', N'chat-1229', N'user-p01', N'user-d08', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', NULL, NULL, NULL, 1, '2026-05-22 15:05:00'),
('83732e54-0082-41e5-a0f0-a7f534819855', N'chat-1230', N'user-p04', N'user-d08', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-07-28.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_04.png', NULL, NULL, NULL, 1, '2026-06-28 10:00:00'),
('3ff0a5f0-fe33-48dc-8495-e65e04e31791', N'chat-1230', N'user-d08', N'user-p04', N'Hi Sophia Garcia, yes I have you booked for 2026-07-28 at 08:00. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_08.png', NULL, NULL, NULL, 1, '2026-06-28 11:00:00'),
('c676ed2a-62f5-4147-bba4-076148365003', N'chat-1230', N'user-p04', N'user-d08', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_04.png', NULL, NULL, NULL, 1, '2026-06-28 11:10:00'),
('e74bbc54-1fe9-43fb-a209-e7bf3a8146b8', N'chat-1231', N'user-p07', N'user-d08', N'Hello doctor, just checking in ahead of my appointment on 2026-08-14.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_07.png', NULL, NULL, NULL, 1, '2026-07-14 09:00:00'),
('6e328bbf-9816-4f89-828b-777beb80c615', N'chat-1231', N'user-d08', N'user-p07', N'Your appointment on 2026-08-14 at 14:00 is confirmed. Please prepare your recent test results if any.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_08.png', NULL, NULL, NULL, 1, '2026-07-14 11:00:00'),
('3b9084da-0b4d-44aa-881c-6fa88a09fbe6', N'chat-1231', N'user-p07', N'user-d08', N'Understood, I will bring them. Thank you!', N'http://localhost:8096/uploads/avatars/patients/benhnhan_07.png', NULL, NULL, NULL, 1, '2026-07-14 11:15:00'),
('9d5e4701-f0dc-4acf-9f38-68640378b169', N'chat-1232', N'user-d09', N'user-p09', N'Before we start, can you tell me more about: general check-up and consultation?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_09.png', NULL, NULL, NULL, 1, '2026-03-04 14:10:00'),
('55f9583c-b829-4efb-b41f-471a4522af1e', N'chat-1232', N'user-p09', N'user-d09', N'General check-up and consultation. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_09.png', NULL, NULL, NULL, 1, '2026-03-04 14:15:00'),
('2e15f4a5-2158-4997-ba38-809ae130f3ba', N'chat-1232', N'user-p09', N'user-d09', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_09.png', NULL, NULL, NULL, 1, '2026-03-04 15:05:00'),
('e9657508-7a13-4bd3-b8b5-20629e0c67a3', N'chat-1233', N'user-d09', N'user-p02', N'Before we start, can you tell me more about: seasonal allergy symptoms, sneezing and itchy eyes?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_09.png', NULL, NULL, NULL, 1, '2026-05-27 13:10:00'),
('a494a7e4-1d15-454f-8e95-3c7de3e13a87', N'chat-1233', N'user-p02', N'user-d09', N'Seasonal allergy symptoms, sneezing and itchy eyes. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', NULL, NULL, NULL, 1, '2026-05-27 13:15:00'),
('ace0b157-fe35-417a-96e6-fe080ba4e881', N'chat-1233', N'user-p02', N'user-d09', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', NULL, NULL, NULL, 1, '2026-05-27 14:05:00'),
('af941368-c4b7-413a-82e9-d9b33656d0d9', N'chat-1234', N'user-p05', N'user-d09', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-07-08.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', NULL, NULL, NULL, 1, '2026-07-05 10:00:00'),
('4d35d672-7c08-478c-aac0-d2a0350fe951', N'chat-1234', N'user-d09', N'user-p05', N'Hi James Wilson, yes I have you booked for 2026-07-08 at 14:00. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_09.png', NULL, NULL, NULL, 1, '2026-07-05 11:00:00'),
('7b6ffd93-1f4e-4986-a436-624a6f3d0b14', N'chat-1234', N'user-p05', N'user-d09', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', NULL, NULL, NULL, 1, '2026-07-05 11:10:00'),
('f20d8422-9e6f-4df9-b90e-bc965993bc39', N'chat-1235', N'user-p08', N'user-d09', N'Hello doctor, just checking in ahead of my appointment on 2026-08-05.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_08.png', NULL, NULL, NULL, 1, '2026-07-05 09:00:00'),
('95c47410-70f6-4722-b9a5-984772b7bbf9', N'chat-1235', N'user-d09', N'user-p08', N'Your appointment on 2026-08-05 at 14:30 is confirmed. Please prepare your recent test results if any.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_09.png', NULL, NULL, NULL, 1, '2026-07-05 11:00:00'),
('98259ba9-1221-4314-bb81-069983cec92b', N'chat-1235', N'user-p08', N'user-d09', N'Understood, I will bring them. Thank you!', N'http://localhost:8096/uploads/avatars/patients/benhnhan_08.png', NULL, NULL, NULL, 1, '2026-07-05 11:15:00'),
('60205da8-b628-4147-8dba-005ffc5e0ce0', N'chat-1236', N'user-d10', N'user-p10', N'Before we start, can you tell me more about: seasonal allergy symptoms, sneezing and itchy eyes?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_10.png', NULL, NULL, NULL, 1, '2026-03-09 06:40:00'),
('f41f246a-0f27-49fe-9175-37fb513c5fdf', N'chat-1236', N'user-p10', N'user-d10', N'Seasonal allergy symptoms, sneezing and itchy eyes. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_10.png', NULL, NULL, NULL, 1, '2026-03-09 06:45:00'),
('540b6eb8-0045-4b40-a33f-e44f3a3c798d', N'chat-1236', N'user-p10', N'user-d10', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_10.png', NULL, NULL, NULL, 1, '2026-03-09 07:35:00'),
('a7503614-4f72-4811-929b-d8faec26d1a6', N'chat-1237', N'user-d10', N'user-p03', N'Before we start, can you tell me more about: persistent cough and mild fever for 4 days?', N'http://localhost:8096/uploads/avatars/doctors/bacsi_10.png', NULL, NULL, NULL, 1, '2026-06-03 13:40:00'),
('9a44ff39-feac-4f64-853f-fd5265e872df', N'chat-1237', N'user-p03', N'user-d10', N'Persistent cough and mild fever for 4 days. It has been bothering me for a few days.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', NULL, NULL, NULL, 1, '2026-06-03 13:45:00'),
('b9dec8ab-5ec2-4e41-918a-b4b3749cee18', N'chat-1237', N'user-p03', N'user-d10', N'Thank you doctor, I understand the treatment plan.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', NULL, NULL, NULL, 1, '2026-06-03 14:35:00'),
('3b254071-9264-483b-bd7a-9e5b41934e1f', N'chat-1238', N'user-p06', N'user-d10', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-07-13.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', NULL, NULL, NULL, 1, '2026-07-10 10:00:00'),
('c8faba05-84b8-49ee-89da-06532d89f328', N'chat-1238', N'user-d10', N'user-p06', N'Hi Olivia Davis, yes I have you booked for 2026-07-13 at 08:00. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_10.png', NULL, NULL, NULL, 1, '2026-07-10 11:00:00'),
('4f3da24f-58a5-41cc-850a-b7cb7afc6546', N'chat-1238', N'user-p06', N'user-d10', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', NULL, NULL, NULL, 1, '2026-07-10 11:10:00'),
('bbfcc89e-fa12-4fc9-8314-5893f0f3019f', N'chat-1239', N'user-p09', N'user-d10', N'Hello doctor, just checking in ahead of my appointment on 2026-08-12.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_09.png', NULL, NULL, NULL, 1, '2026-07-12 09:00:00'),
('639cf126-93df-40f2-95e0-0901fafa4a20', N'chat-1239', N'user-d10', N'user-p09', N'Your appointment on 2026-08-12 at 13:30 is confirmed. Please prepare your recent test results if any.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_10.png', NULL, NULL, NULL, 1, '2026-07-12 11:00:00'),
('b7f0369b-8b3d-478b-b3c6-2a0b76bc9837', N'chat-1239', N'user-p09', N'user-d10', N'Understood, I will bring them. Thank you!', N'http://localhost:8096/uploads/avatars/patients/benhnhan_09.png', NULL, NULL, NULL, 1, '2026-07-12 11:15:00');
GO

PRINT 'Doctor appointments 2026 + consultations + chat conversations seed completed successfully!';


-- =====================================================
-- 56-57. EXTRA FUTURE APPOINTMENTS FOR DOCTOR01 + CHAT CONVERSATIONS
-- Adds 16 more upcoming Appointments (Jul 3 - Aug 15 2026, Scheduled/Confirmed)
-- concentrated on user-d01 (Dr. John Smith), using only his two 'Online' weekly
-- slots from DoctorSchedules (section 51: Monday 07:00-10:00, Wednesday 14:00-17:00).
-- Patients cycle through user-p01..user-p10. No Consultations (future, not started yet).
-- AppointmentID range: 1240-1255. ChatRoomId = chat-<AppointmentID>.
-- Idempotent cleanup included.
-- =====================================================

-- Cleanup so this block can be re-run without duplicates
DELETE FROM ChatMessages WHERE ChatRoomId LIKE 'chat-124%' OR ChatRoomId LIKE 'chat-125%';
DELETE FROM ChatRooms WHERE ChatRoomId LIKE 'chat-124%' OR ChatRoomId LIKE 'chat-125%';
DELETE FROM Appointments WHERE AppointmentID BETWEEN 1240 AND 1255;
GO

-- 56. APPOINTMENTS (16, all user-d01, future Scheduled/Confirmed)
SET IDENTITY_INSERT Appointments ON;
INSERT INTO Appointments (AppointmentID, AppointmentTime, ConsultationType, Status, symptoms, notes, fee, endTime, doctorReminderSent, reminderSent, confirmedAt, PatientID, DoctorID) VALUES
(1240, '2026-07-06 07:00:00', N'Online', N'Scheduled', N'Persistent cough and mild fever for 4 days', NULL, 50.00, NULL, 0, 0, NULL, N'user-p01', N'user-d01'),
(1241, '2026-07-08 14:00:00', N'Online', N'Scheduled', N'Follow-up on ongoing chronic condition', NULL, 50.00, NULL, 0, 0, NULL, N'user-p02', N'user-d01'),
(1242, '2026-07-13 07:00:00', N'Online', N'Scheduled', N'New skin rash appeared on forearms', NULL, 50.00, NULL, 0, 0, NULL, N'user-p03', N'user-d01'),
(1243, '2026-07-15 14:00:00', N'Online', N'Confirmed', N'Recurring headache and general fatigue', NULL, 50.00, NULL, 0, 0, '2026-07-12 09:00:00', N'user-p04', N'user-d01'),
(1244, '2026-07-20 07:00:00', N'Online', N'Confirmed', N'Routine annual health screening', NULL, 50.00, NULL, 0, 0, '2026-07-17 09:00:00', N'user-p05', N'user-d01'),
(1245, '2026-07-22 14:00:00', N'Online', N'Scheduled', N'Mild stomach discomfort after meals', NULL, 50.00, NULL, 0, 0, NULL, N'user-p06', N'user-d01'),
(1246, '2026-07-27 07:00:00', N'Online', N'Scheduled', N'Blood pressure check-up', NULL, 50.00, NULL, 0, 0, NULL, N'user-p07', N'user-d01'),
(1247, '2026-07-29 14:00:00', N'Online', N'Scheduled', N'Lower back pain after long work hours', NULL, 50.00, NULL, 0, 0, NULL, N'user-p08', N'user-d01'),
(1248, '2026-08-03 07:00:00', N'Online', N'Confirmed', N'General check-up and consultation', NULL, 50.00, NULL, 0, 0, '2026-07-31 09:00:00', N'user-p09', N'user-d01'),
(1249, '2026-08-05 14:00:00', N'Online', N'Confirmed', N'Seasonal allergy symptoms, sneezing and itchy eyes', NULL, 50.00, NULL, 0, 0, '2026-08-02 09:00:00', N'user-p01', N'user-d01'),
(1250, '2026-08-10 07:00:00', N'Online', N'Scheduled', N'Persistent cough and mild fever for 4 days', NULL, 50.00, NULL, 0, 0, NULL, N'user-p01', N'user-d01'),
(1251, '2026-08-12 14:00:00', N'Online', N'Scheduled', N'Follow-up on ongoing chronic condition', NULL, 50.00, NULL, 0, 0, NULL, N'user-p02', N'user-d01'),
(1252, '2026-07-06 07:30:00', N'Online', N'Scheduled', N'New skin rash appeared on forearms', NULL, 50.00, NULL, 0, 0, NULL, N'user-p03', N'user-d01'),
(1253, '2026-07-08 14:30:00', N'Online', N'Confirmed', N'Recurring headache and general fatigue', NULL, 50.00, NULL, 0, 0, '2026-07-05 09:00:00', N'user-p04', N'user-d01'),
(1254, '2026-07-13 07:30:00', N'Online', N'Confirmed', N'Routine annual health screening', NULL, 50.00, NULL, 0, 0, '2026-07-10 09:00:00', N'user-p05', N'user-d01'),
(1255, '2026-07-15 14:30:00', N'Online', N'Scheduled', N'Mild stomach discomfort after meals', NULL, 50.00, NULL, 0, 0, NULL, N'user-p06', N'user-d01');
SET IDENTITY_INSERT Appointments OFF;
GO

-- 57. CHAT_ROOMS + MESSAGES (16 rooms, 48 messages)
INSERT INTO ChatRooms (ChatRoomId, user1Id, user2Id, user1DisplayName, user1PhotoURL, user2DisplayName, user2PhotoURL, lastMessage, lastMessageAt, blockedBy, AppointmentId) VALUES
('chat-1242', N'user-p03', N'user-d01', N'William Brown', N'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', N'Dr. John Smith', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', N'Great, thank you! I will be there.', '2026-07-10 11:10:00', NULL, 1242),
('chat-1243', N'user-p04', N'user-d01', N'Sophia Garcia', N'http://localhost:8096/uploads/avatars/patients/benhnhan_04.png', N'Dr. John Smith', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', N'Understood, I will bring them. Thank you!', '2026-07-11 11:15:00', NULL, 1243),
('chat-1244', N'user-p05', N'user-d01', N'James Wilson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', N'Dr. John Smith', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', N'Understood, I will bring them. Thank you!', '2026-06-19 11:15:00', NULL, 1244),
('chat-1245', N'user-p06', N'user-d01', N'Olivia Davis', N'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', N'Dr. John Smith', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', N'Great, thank you! I will be there.', '2026-06-22 11:10:00', NULL, 1245),
('chat-1246', N'user-p07', N'user-d01', N'Daniel Miller', N'http://localhost:8096/uploads/avatars/patients/benhnhan_07.png', N'Dr. John Smith', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', N'Great, thank you! I will be there.', '2026-06-27 11:10:00', NULL, 1246),
('chat-1247', N'user-p08', N'user-d01', N'Isabella Moore', N'http://localhost:8096/uploads/avatars/patients/benhnhan_08.png', N'Dr. John Smith', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', N'Great, thank you! I will be there.', '2026-06-29 11:10:00', NULL, 1247),
('chat-1248', N'user-p09', N'user-d01', N'Alexander Johnson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_09.png', N'Dr. John Smith', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', N'Understood, I will bring them. Thank you!', '2026-07-03 11:15:00', NULL, 1248),
('chat-1250', N'user-p01', N'user-d01', N'Michael Anderson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', N'Dr. John Smith', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', N'Great, thank you! I will be there.', '2026-07-11 11:10:00', NULL, 1250),
('chat-1251', N'user-p02', N'user-d01', N'Emma Thompson', N'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', N'Dr. John Smith', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', N'Great, thank you! I will be there.', '2026-07-13 11:10:00', NULL, 1251);
GO

INSERT INTO ChatMessages (MessageID, ChatRoomId, SenderId, ReceiverId, content, photoURL, imageUrl, videoUrl, fileUrl, IsRead, SentAt) VALUES
('28a0e182-9d26-440f-bb50-7dab4d554f17', N'chat-1250', N'user-p01', N'user-d01', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-07-06.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', NULL, NULL, NULL, 1, '2026-07-03 10:00:00'),
('34d4a6fd-b7c9-4568-b7d2-a76992ec638c', N'chat-1250', N'user-d01', N'user-p01', N'Hi Michael Anderson, yes I have you booked for 2026-07-06 at 07:00. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2026-07-03 11:00:00'),
('77c26b44-bff9-4e6d-9b63-e468a74c4cc7', N'chat-1250', N'user-p01', N'user-d01', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', NULL, NULL, NULL, 1, '2026-07-03 11:10:00'),
('ec79229b-4b79-44ee-bf1e-eb52df109a3d', N'chat-1251', N'user-p02', N'user-d01', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-07-08.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', NULL, NULL, NULL, 1, '2026-07-05 10:00:00'),
('38bdecba-3124-457a-8741-1e902757c122', N'chat-1251', N'user-d01', N'user-p02', N'Hi Emma Thompson, yes I have you booked for 2026-07-08 at 14:00. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2026-07-05 11:00:00'),
('092194c5-ad32-48a7-9275-87d8a6e89e95', N'chat-1251', N'user-p02', N'user-d01', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', NULL, NULL, NULL, 1, '2026-07-05 11:10:00'),
('323b773b-cf07-4f77-9196-80948e1ff3ee', N'chat-1242', N'user-p03', N'user-d01', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-07-13.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', NULL, NULL, NULL, 1, '2026-07-10 10:00:00'),
('5a86807a-a6ce-4c79-8594-2a96443ce5e8', N'chat-1242', N'user-d01', N'user-p03', N'Hi William Brown, yes I have you booked for 2026-07-13 at 07:00. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2026-07-10 11:00:00'),
('163a83a0-f354-474a-8f96-dc0b1b35bebe', N'chat-1242', N'user-p03', N'user-d01', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', NULL, NULL, NULL, 1, '2026-07-10 11:10:00'),
('2216604d-9e97-447d-8200-0b58d77add19', N'chat-1243', N'user-p04', N'user-d01', N'Hello doctor, just checking in ahead of my appointment on 2026-07-15.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_04.png', NULL, NULL, NULL, 1, '2026-07-11 09:00:00'),
('ab7bd0df-7054-49c4-8780-1a0616dc9c1f', N'chat-1243', N'user-d01', N'user-p04', N'Your appointment on 2026-07-15 at 14:00 is confirmed. Please prepare your recent test results if any.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2026-07-11 11:00:00'),
('67165fd2-cedc-4541-85f3-053f667a56e5', N'chat-1243', N'user-p04', N'user-d01', N'Understood, I will bring them. Thank you!', N'http://localhost:8096/uploads/avatars/patients/benhnhan_04.png', NULL, NULL, NULL, 1, '2026-07-11 11:15:00'),
('6149740d-6034-44b5-ba58-b018926628d8', N'chat-1244', N'user-p05', N'user-d01', N'Hello doctor, just checking in ahead of my appointment on 2026-07-20.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', NULL, NULL, NULL, 1, '2026-06-19 09:00:00'),
('ed1dd5a5-9d55-4c68-949e-62e776f3f7b5', N'chat-1244', N'user-d01', N'user-p05', N'Your appointment on 2026-07-20 at 07:00 is confirmed. Please prepare your recent test results if any.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2026-06-19 11:00:00'),
('a3ff3619-82f8-42b3-ae0f-d18991bc65c0', N'chat-1244', N'user-p05', N'user-d01', N'Understood, I will bring them. Thank you!', N'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', NULL, NULL, NULL, 1, '2026-06-19 11:15:00'),
('2bbf2748-935e-4a64-8f1c-2d75793d84a1', N'chat-1245', N'user-p06', N'user-d01', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-07-22.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', NULL, NULL, NULL, 1, '2026-06-22 10:00:00'),
('a9b19ca9-f6d8-4803-a255-3d7b7c15e551', N'chat-1245', N'user-d01', N'user-p06', N'Hi Olivia Davis, yes I have you booked for 2026-07-22 at 14:00. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2026-06-22 11:00:00'),
('b66699d0-1bef-4e95-85c9-5d2c397992ea', N'chat-1245', N'user-p06', N'user-d01', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', NULL, NULL, NULL, 1, '2026-06-22 11:10:00'),
('52d1b2ec-fa40-422d-81cd-dc2fc70a5188', N'chat-1246', N'user-p07', N'user-d01', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-07-27.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_07.png', NULL, NULL, NULL, 1, '2026-06-27 10:00:00'),
('1f3c1d20-ea71-4d54-8d9b-0dffdeb6cf8b', N'chat-1246', N'user-d01', N'user-p07', N'Hi Daniel Miller, yes I have you booked for 2026-07-27 at 07:00. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2026-06-27 11:00:00'),
('961a3c10-e839-4edb-9339-bde2134bb4d5', N'chat-1246', N'user-p07', N'user-d01', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_07.png', NULL, NULL, NULL, 1, '2026-06-27 11:10:00'),
('792b0b8f-9673-4785-a802-3357e006932d', N'chat-1247', N'user-p08', N'user-d01', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-07-29.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_08.png', NULL, NULL, NULL, 1, '2026-06-29 10:00:00'),
('ea86e231-1033-4ef9-891b-7f2fcf456d26', N'chat-1247', N'user-d01', N'user-p08', N'Hi Isabella Moore, yes I have you booked for 2026-07-29 at 14:00. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2026-06-29 11:00:00'),
('a55ebfd0-3299-4822-a727-8273917f79bf', N'chat-1247', N'user-p08', N'user-d01', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_08.png', NULL, NULL, NULL, 1, '2026-06-29 11:10:00'),
('f45b4ff5-c1cb-49c4-8516-c91b05f68d14', N'chat-1248', N'user-p09', N'user-d01', N'Hello doctor, just checking in ahead of my appointment on 2026-08-03.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_09.png', NULL, NULL, NULL, 1, '2026-07-03 09:00:00'),
('0dea24be-586e-40ca-99e3-c6b38d0427d1', N'chat-1248', N'user-d01', N'user-p09', N'Your appointment on 2026-08-03 at 07:00 is confirmed. Please prepare your recent test results if any.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2026-07-03 11:00:00'),
('076ad765-8560-4cd0-8576-270472dbe5eb', N'chat-1248', N'user-p09', N'user-d01', N'Understood, I will bring them. Thank you!', N'http://localhost:8096/uploads/avatars/patients/benhnhan_09.png', NULL, NULL, NULL, 1, '2026-07-03 11:15:00'),
('4185935d-1e93-4fe2-99bd-3715223bb02c', N'chat-1250', N'user-p01', N'user-d01', N'Hello doctor, just checking in ahead of my appointment on 2026-08-05.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', NULL, NULL, NULL, 1, '2026-07-05 09:00:00'),
('409ae8b0-1cc0-4589-9fa7-31a9921689fd', N'chat-1250', N'user-d01', N'user-p01', N'Your appointment on 2026-08-05 at 14:00 is confirmed. Please prepare your recent test results if any.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2026-07-05 11:00:00'),
('ca9c5c53-3d1f-40bb-adc4-17e32f392114', N'chat-1250', N'user-p01', N'user-d01', N'Understood, I will bring them. Thank you!', N'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', NULL, NULL, NULL, 1, '2026-07-05 11:15:00'),
('bc44e43f-ad76-418b-827b-40d800373d4a', N'chat-1250', N'user-p01', N'user-d01', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-08-10.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', NULL, NULL, NULL, 1, '2026-07-11 10:00:00'),
('980c2e81-cbc4-4982-a174-1f2192b0e728', N'chat-1250', N'user-d01', N'user-p01', N'Hi Michael Anderson, yes I have you booked for 2026-08-10 at 07:00. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2026-07-11 11:00:00'),
('1430a8ab-b1bc-43e2-ad46-29a86e35fdf5', N'chat-1250', N'user-p01', N'user-d01', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_01.png', NULL, NULL, NULL, 1, '2026-07-11 11:10:00'),
('db27f506-8f81-41ec-88ff-690f765fb0d5', N'chat-1251', N'user-p02', N'user-d01', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-08-12.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', NULL, NULL, NULL, 1, '2026-07-13 10:00:00'),
('81d4faa7-6463-4935-b6d4-9f38d57ffaf2', N'chat-1251', N'user-d01', N'user-p02', N'Hi Emma Thompson, yes I have you booked for 2026-08-12 at 14:00. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2026-07-13 11:00:00'),
('749b8da7-a818-43a5-8625-1528c69a39d1', N'chat-1251', N'user-p02', N'user-d01', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_02.png', NULL, NULL, NULL, 1, '2026-07-13 11:10:00'),
('f85cd041-25d3-42ae-8d3f-35bec6a79f58', N'chat-1242', N'user-p03', N'user-d01', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-07-06.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', NULL, NULL, NULL, 1, '2026-07-03 10:00:00'),
('bf8c19d7-667c-4a9a-86f5-73404f0b4053', N'chat-1242', N'user-d01', N'user-p03', N'Hi William Brown, yes I have you booked for 2026-07-06 at 07:30. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2026-07-03 11:00:00'),
('7328e4e1-b4a4-4075-a109-7fa40e738124', N'chat-1242', N'user-p03', N'user-d01', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_03.png', NULL, NULL, NULL, 1, '2026-07-03 11:10:00'),
('894812e2-208d-4647-bf84-f30962d1e1eb', N'chat-1243', N'user-p04', N'user-d01', N'Hello doctor, just checking in ahead of my appointment on 2026-07-08.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_04.png', NULL, NULL, NULL, 1, '2026-07-04 09:00:00'),
('5e5cce79-fce0-4b0a-886f-823aa1426590', N'chat-1243', N'user-d01', N'user-p04', N'Your appointment on 2026-07-08 at 14:30 is confirmed. Please prepare your recent test results if any.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2026-07-04 11:00:00'),
('6567035d-7bc2-4d6a-b1da-ed524c5bfcad', N'chat-1243', N'user-p04', N'user-d01', N'Understood, I will bring them. Thank you!', N'http://localhost:8096/uploads/avatars/patients/benhnhan_04.png', NULL, NULL, NULL, 1, '2026-07-04 11:15:00'),
('27cc1928-aa7f-4879-9f21-65b9dca19365', N'chat-1244', N'user-p05', N'user-d01', N'Hello doctor, just checking in ahead of my appointment on 2026-07-13.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', NULL, NULL, NULL, 1, '2026-07-09 09:00:00'),
('c4ad910c-37eb-42ea-8d79-46de78c4d975', N'chat-1244', N'user-d01', N'user-p05', N'Your appointment on 2026-07-13 at 07:30 is confirmed. Please prepare your recent test results if any.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2026-07-09 11:00:00'),
('1db3f867-fd81-4dad-ad17-7f1b17b8222c', N'chat-1244', N'user-p05', N'user-d01', N'Understood, I will bring them. Thank you!', N'http://localhost:8096/uploads/avatars/patients/benhnhan_05.png', NULL, NULL, NULL, 1, '2026-07-09 11:15:00'),
('58bdf7ef-ba32-4dc8-8a22-30f4581be9f8', N'chat-1245', N'user-p06', N'user-d01', N'Hi doctor, I would like to confirm my upcoming appointment on 2026-07-15.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', NULL, NULL, NULL, 1, '2026-07-12 10:00:00'),
('f3b4d7fa-b614-43bd-abba-6ea5b3d77789', N'chat-1245', N'user-d01', N'user-p06', N'Hi Olivia Davis, yes I have you booked for 2026-07-15 at 14:30. See you then.', N'http://localhost:8096/uploads/avatars/doctors/bacsi_01.png', NULL, NULL, NULL, 1, '2026-07-12 11:00:00'),
('1df65e7e-7407-458e-bc09-93ddf9d2f3b2', N'chat-1245', N'user-p06', N'user-d01', N'Great, thank you! I will be there.', N'http://localhost:8096/uploads/avatars/patients/benhnhan_06.png', NULL, NULL, NULL, 1, '2026-07-12 11:10:00');
GO

-- Enum type-safety đã được đảm bảo ở tầng Java (@Enumerated(EnumType.STRING)).
-- CHECK constraint dưới DB chỉ gây lỗi mỗi khi enum Java có giá trị mới (Hibernate
-- ddl-auto=update không tự nới constraint) nên xoá hẳn toàn bộ, không tạo lại.
-- Đồng bộ với db/migration-v12-drop-stale-enum-check-constraints.sql — sửa 1 trong 2
-- chỗ thì nhớ sửa luôn chỗ còn lại.
DECLARE @cc_table NVARCHAR(128);
DECLARE @cc_column NVARCHAR(128);
DECLARE @cc_constraintName NVARCHAR(128);
DECLARE @cc_sql NVARCHAR(MAX);

DECLARE cc_targets CURSOR FOR
SELECT * FROM (VALUES
    ('Notifications', 'type'),                     -- NotificationType
    ('Notifications', 'SentVia'),                  -- NotificationChannel
    ('Notifications', 'priority'),                 -- NotificationPriority
    ('EmailVerificationTokens', 'Type'),            -- TokenType
    ('Consultations', 'HomeVisitProposalStatus'),   -- HomeVisitProposalStatus
    ('Consultations', 'follow_up_status'),          -- FollowUpStatus
    ('Doctors', 'ScheduleStatus'),                  -- DoctorScheduleStatus
    ('DoctorSchedules', 'ScheduleStatus'),          -- DoctorScheduleStatus
    ('DoctorScheduleChangeRequest', 'status'),      -- ChangeRequestStatus
    ('DoctorScheduleCompliance', 'Status'),         -- ComplianceStatus
    ('DoctorScheduleExceptions', 'exceptionType'),  -- ScheduleExceptionType
    ('DoctorServices', 'service_type')              -- ServiceType
) AS t(TableName, ColumnName);

OPEN cc_targets;
FETCH NEXT FROM cc_targets INTO @cc_table, @cc_column;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @cc_constraintName = NULL;

    SELECT @cc_constraintName = cc.name
    FROM sys.check_constraints cc
    JOIN sys.columns c ON cc.parent_object_id = c.object_id AND cc.parent_column_id = c.column_id
    JOIN sys.tables t ON cc.parent_object_id = t.object_id
    WHERE t.name = @cc_table AND c.name = @cc_column;

    IF @cc_constraintName IS NOT NULL
    BEGIN
        SET @cc_sql = 'ALTER TABLE dbo.[' + @cc_table + '] DROP CONSTRAINT [' + @cc_constraintName + '];';
        EXEC sp_executesql @cc_sql;
        PRINT 'Dropped stale CHECK constraint ' + @cc_constraintName + ' on ' + @cc_table + '.' + @cc_column;
    END

    FETCH NEXT FROM cc_targets INTO @cc_table, @cc_column;
END

CLOSE cc_targets;
DEALLOCATE cc_targets;
GO
PRINT 'Extra doctor01 future appointments + chat conversations seed completed successfully!';

-- =====================================================
-- 58. ANALYTICS PHARMACY REGISTRATIONS (2024)
-- Adds non-login analytics Pharmacies (user-pha001..035) with CreatedDate
-- spread across all 12 months of 2024 using a varied per-month count:
-- 1,4,1,5,3,1,7,1,2,5,3,2 (Jan..Dec, peak Jul=7, offset from doctors).
-- Idempotent: safe to re-run.
-- =====================================================

DELETE FROM Pharmacies WHERE PharmacyID LIKE 'user-pha[0-9][0-9][0-9]';
DELETE FROM Users WHERE Id LIKE 'user-pha[0-9][0-9][0-9]';
GO

-- 58a. Analytics pharmacy users (24 users, varied count per month across 2024)
INSERT INTO Users (Id, UserName, Email, EmailConfirmed, PasswordHash, PhoneNumber, AccessFailedCount, CreatedDate, Status, LastLoginAt, RoleId) VALUES
(N'user-pha001', N'pharmacy_pha001', N'pharmacy.pha001@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000001', 0, '2024-01-10 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha002', N'pharmacy_pha002', N'pharmacy.pha002@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000002', 0, '2024-02-08 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha003', N'pharmacy_pha003', N'pharmacy.pha003@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000003', 0, '2024-02-22 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha004', N'pharmacy_pha004', N'pharmacy.pha004@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000004', 0, '2024-03-10 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha005', N'pharmacy_pha005', N'pharmacy.pha005@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000005', 0, '2024-04-05 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha006', N'pharmacy_pha006', N'pharmacy.pha006@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000006', 0, '2024-04-15 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha007', N'pharmacy_pha007', N'pharmacy.pha007@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000007', 0, '2024-04-25 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha008', N'pharmacy_pha008', N'pharmacy.pha008@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000008', 0, '2024-05-08 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha009', N'pharmacy_pha009', N'pharmacy.pha009@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000009', 0, '2024-05-22 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha010', N'pharmacy_pha010', N'pharmacy.pha010@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000010', 0, '2024-06-10 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha011', N'pharmacy_pha011', N'pharmacy.pha011@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000011', 0, '2024-07-03 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha012', N'pharmacy_pha012', N'pharmacy.pha012@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000012', 0, '2024-07-11 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha013', N'pharmacy_pha013', N'pharmacy.pha013@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000013', 0, '2024-07-19 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha014', N'pharmacy_pha014', N'pharmacy.pha014@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000014', 0, '2024-07-27 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha015', N'pharmacy_pha015', N'pharmacy.pha015@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000015', 0, '2024-08-10 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha016', N'pharmacy_pha016', N'pharmacy.pha016@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000016', 0, '2024-09-08 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha017', N'pharmacy_pha017', N'pharmacy.pha017@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000017', 0, '2024-09-22 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha018', N'pharmacy_pha018', N'pharmacy.pha018@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000018', 0, '2024-10-05 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha019', N'pharmacy_pha019', N'pharmacy.pha019@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000019', 0, '2024-10-15 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha020', N'pharmacy_pha020', N'pharmacy.pha020@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000020', 0, '2024-10-25 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha021', N'pharmacy_pha021', N'pharmacy.pha021@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000021', 0, '2024-11-08 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha022', N'pharmacy_pha022', N'pharmacy.pha022@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000022', 0, '2024-11-22 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha023', N'pharmacy_pha023', N'pharmacy.pha023@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000023', 0, '2024-12-08 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha024', N'pharmacy_pha024', N'pharmacy.pha024@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000024', 0, '2024-12-22 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha025', N'pharmacy_pha025', N'pharmacy.pha025@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000025', 0, '2024-02-15 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha026', N'pharmacy_pha026', N'pharmacy.pha026@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000026', 0, '2024-02-28 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha027', N'pharmacy_pha027', N'pharmacy.pha027@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000027', 0, '2024-04-10 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha028', N'pharmacy_pha028', N'pharmacy.pha028@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000028', 0, '2024-04-20 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha029', N'pharmacy_pha029', N'pharmacy.pha029@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000029', 0, '2024-07-07 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha030', N'pharmacy_pha030', N'pharmacy.pha030@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000030', 0, '2024-07-15 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha031', N'pharmacy_pha031', N'pharmacy.pha031@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000031', 0, '2024-07-23 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha032', N'pharmacy_pha032', N'pharmacy.pha032@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000032', 0, '2024-05-15 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha033', N'pharmacy_pha033', N'pharmacy.pha033@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000033', 0, '2024-10-10 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha034', N'pharmacy_pha034', N'pharmacy.pha034@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000034', 0, '2024-10-20 10:00:00', N'Active', NULL, N'pharmacy'),
(N'user-pha035', N'pharmacy_pha035', N'pharmacy.pha035@analytics.healthlink.com', 1, N'$2a$10$analyticsSeedNoLoginHashXXXXXXXXXXXXXXXXXXXXXXXXXX', N'0941000035', 0, '2024-11-15 10:00:00', N'Active', NULL, N'pharmacy');

-- 58b. Analytics pharmacy profiles (city cycle through 10 Vietnamese cities)
INSERT INTO Pharmacies (PharmacyID, name, licenseNumber, address, city, district, ward, latitude, longitude, phoneNumber, email, description, avatarUrl, openTime, closeTime, Open24Hours, workingDays, Verified, Active, IsOnline, AverageRating, TotalReviews, DeliveryAvailable, DeliveryRadius, DeliveryFee, CreatedAt, updatedAt, totalEarnings, pendingSettlement, paypalEmail) VALUES
(N'user-pha001', N'HealthLink Analytics Pharmacy 001', N'PH-AN-001', N'1 Analytics Street', N'Ho Chi Minh City', N'District 1', N'Ward 1', 10.7769, 106.7009, N'0941010000', N'pharmacy.pha001@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_01.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-01-10', '2024-01-10', 0.00, 0.00, NULL),
(N'user-pha002', N'HealthLink Analytics Pharmacy 002', N'PH-AN-002', N'1 Analytics Street', N'Ha Noi', N'District 1', N'Ward 1', 21.0285, 105.8542, N'0941020000', N'pharmacy.pha002@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_02.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-02-08', '2024-02-08', 0.00, 0.00, NULL),
(N'user-pha003', N'HealthLink Analytics Pharmacy 003', N'PH-AN-003', N'1 Analytics Street', N'Da Nang', N'District 1', N'Ward 1', 16.0544, 108.2022, N'0941030000', N'pharmacy.pha003@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_03.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-02-22', '2024-02-22', 0.00, 0.00, NULL),
(N'user-pha004', N'HealthLink Analytics Pharmacy 004', N'PH-AN-004', N'1 Analytics Street', N'Can Tho', N'District 1', N'Ward 1', 10.0452, 105.7469, N'0941040000', N'pharmacy.pha004@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_04.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-03-10', '2024-03-10', 0.00, 0.00, NULL),
(N'user-pha005', N'HealthLink Analytics Pharmacy 005', N'PH-AN-005', N'1 Analytics Street', N'Hai Phong', N'District 1', N'Ward 1', 20.8449, 106.6881, N'0941050000', N'pharmacy.pha005@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_05.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-04-05', '2024-04-05', 0.00, 0.00, NULL),
(N'user-pha006', N'HealthLink Analytics Pharmacy 006', N'PH-AN-006', N'1 Analytics Street', N'Bien Hoa', N'District 1', N'Ward 1', 10.9574, 106.8426, N'0941060000', N'pharmacy.pha006@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_06.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-04-15', '2024-04-15', 0.00, 0.00, NULL),
(N'user-pha007', N'HealthLink Analytics Pharmacy 007', N'PH-AN-007', N'1 Analytics Street', N'Nha Trang', N'District 1', N'Ward 1', 12.2388, 109.1967, N'0941070000', N'pharmacy.pha007@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_07.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-04-25', '2024-04-25', 0.00, 0.00, NULL),
(N'user-pha008', N'HealthLink Analytics Pharmacy 008', N'PH-AN-008', N'1 Analytics Street', N'Hue', N'District 1', N'Ward 1', 16.4637, 107.5909, N'0941080000', N'pharmacy.pha008@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_08.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-05-08', '2024-05-08', 0.00, 0.00, NULL),
(N'user-pha009', N'HealthLink Analytics Pharmacy 009', N'PH-AN-009', N'1 Analytics Street', N'Vung Tau', N'District 1', N'Ward 1', 10.3460, 107.0843, N'0941090000', N'pharmacy.pha009@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_09.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-05-22', '2024-05-22', 0.00, 0.00, NULL),
(N'user-pha010', N'HealthLink Analytics Pharmacy 010', N'PH-AN-010', N'1 Analytics Street', N'Buon Ma Thuot', N'District 1', N'Ward 1', 12.6667, 108.0500, N'0941100000', N'pharmacy.pha010@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_10.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-06-10', '2024-06-10', 0.00, 0.00, NULL),
(N'user-pha011', N'HealthLink Analytics Pharmacy 011', N'PH-AN-011', N'1 Analytics Street', N'Ho Chi Minh City', N'District 1', N'Ward 1', 10.7769, 106.7009, N'0941110000', N'pharmacy.pha011@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_01.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-07-03', '2024-07-03', 0.00, 0.00, NULL),
(N'user-pha012', N'HealthLink Analytics Pharmacy 012', N'PH-AN-012', N'1 Analytics Street', N'Ha Noi', N'District 1', N'Ward 1', 21.0285, 105.8542, N'0941120000', N'pharmacy.pha012@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_02.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-07-11', '2024-07-11', 0.00, 0.00, NULL),
(N'user-pha013', N'HealthLink Analytics Pharmacy 013', N'PH-AN-013', N'1 Analytics Street', N'Da Nang', N'District 1', N'Ward 1', 16.0544, 108.2022, N'0941130000', N'pharmacy.pha013@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_03.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-07-19', '2024-07-19', 0.00, 0.00, NULL),
(N'user-pha014', N'HealthLink Analytics Pharmacy 014', N'PH-AN-014', N'1 Analytics Street', N'Can Tho', N'District 1', N'Ward 1', 10.0452, 105.7469, N'0941140000', N'pharmacy.pha014@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_04.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-07-27', '2024-07-27', 0.00, 0.00, NULL),
(N'user-pha015', N'HealthLink Analytics Pharmacy 015', N'PH-AN-015', N'1 Analytics Street', N'Hai Phong', N'District 1', N'Ward 1', 20.8449, 106.6881, N'0941150000', N'pharmacy.pha015@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_05.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-08-10', '2024-08-10', 0.00, 0.00, NULL),
(N'user-pha016', N'HealthLink Analytics Pharmacy 016', N'PH-AN-016', N'1 Analytics Street', N'Bien Hoa', N'District 1', N'Ward 1', 10.9574, 106.8426, N'0941160000', N'pharmacy.pha016@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_06.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-09-08', '2024-09-08', 0.00, 0.00, NULL),
(N'user-pha017', N'HealthLink Analytics Pharmacy 017', N'PH-AN-017', N'1 Analytics Street', N'Nha Trang', N'District 1', N'Ward 1', 12.2388, 109.1967, N'0941170000', N'pharmacy.pha017@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_07.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-09-22', '2024-09-22', 0.00, 0.00, NULL),
(N'user-pha018', N'HealthLink Analytics Pharmacy 018', N'PH-AN-018', N'1 Analytics Street', N'Hue', N'District 1', N'Ward 1', 16.4637, 107.5909, N'0941180000', N'pharmacy.pha018@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_08.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-10-05', '2024-10-05', 0.00, 0.00, NULL),
(N'user-pha019', N'HealthLink Analytics Pharmacy 019', N'PH-AN-019', N'1 Analytics Street', N'Vung Tau', N'District 1', N'Ward 1', 10.3460, 107.0843, N'0941190000', N'pharmacy.pha019@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_09.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-10-15', '2024-10-15', 0.00, 0.00, NULL),
(N'user-pha020', N'HealthLink Analytics Pharmacy 020', N'PH-AN-020', N'1 Analytics Street', N'Buon Ma Thuot', N'District 1', N'Ward 1', 12.6667, 108.0500, N'0941200000', N'pharmacy.pha020@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_10.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-10-25', '2024-10-25', 0.00, 0.00, NULL),
(N'user-pha021', N'HealthLink Analytics Pharmacy 021', N'PH-AN-021', N'1 Analytics Street', N'Ho Chi Minh City', N'District 1', N'Ward 1', 10.7769, 106.7009, N'0941210000', N'pharmacy.pha021@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_01.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-11-08', '2024-11-08', 0.00, 0.00, NULL),
(N'user-pha022', N'HealthLink Analytics Pharmacy 022', N'PH-AN-022', N'1 Analytics Street', N'Ha Noi', N'District 1', N'Ward 1', 21.0285, 105.8542, N'0941220000', N'pharmacy.pha022@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_02.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-11-22', '2024-11-22', 0.00, 0.00, NULL),
(N'user-pha023', N'HealthLink Analytics Pharmacy 023', N'PH-AN-023', N'1 Analytics Street', N'Da Nang', N'District 1', N'Ward 1', 16.0544, 108.2022, N'0941230000', N'pharmacy.pha023@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_03.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-12-08', '2024-12-08', 0.00, 0.00, NULL),
(N'user-pha024', N'HealthLink Analytics Pharmacy 024', N'PH-AN-024', N'1 Analytics Street', N'Can Tho', N'District 1', N'Ward 1', 10.0452, 105.7469, N'0941240000', N'pharmacy.pha024@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_04.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-12-22', '2024-12-22', 0.00, 0.00, NULL),
(N'user-pha025', N'HealthLink Analytics Pharmacy 025', N'PH-AN-025', N'1 Analytics Street', N'Hai Phong', N'District 1', N'Ward 1', 20.8449, 106.6881, N'0941250000', N'pharmacy.pha025@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_05.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-02-15', '2024-02-15', 0.00, 0.00, NULL),
(N'user-pha026', N'HealthLink Analytics Pharmacy 026', N'PH-AN-026', N'1 Analytics Street', N'Bien Hoa', N'District 1', N'Ward 1', 10.9574, 106.8426, N'0941260000', N'pharmacy.pha026@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_06.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-02-28', '2024-02-28', 0.00, 0.00, NULL),
(N'user-pha027', N'HealthLink Analytics Pharmacy 027', N'PH-AN-027', N'1 Analytics Street', N'Nha Trang', N'District 1', N'Ward 1', 12.2388, 109.1967, N'0941270000', N'pharmacy.pha027@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_07.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-04-10', '2024-04-10', 0.00, 0.00, NULL),
(N'user-pha028', N'HealthLink Analytics Pharmacy 028', N'PH-AN-028', N'1 Analytics Street', N'Hue', N'District 1', N'Ward 1', 16.4637, 107.5909, N'0941280000', N'pharmacy.pha028@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_08.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-04-20', '2024-04-20', 0.00, 0.00, NULL),
(N'user-pha029', N'HealthLink Analytics Pharmacy 029', N'PH-AN-029', N'1 Analytics Street', N'Vung Tau', N'District 1', N'Ward 1', 10.3460, 107.0843, N'0941290000', N'pharmacy.pha029@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_09.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-07-07', '2024-07-07', 0.00, 0.00, NULL),
(N'user-pha030', N'HealthLink Analytics Pharmacy 030', N'PH-AN-030', N'1 Analytics Street', N'Buon Ma Thuot', N'District 1', N'Ward 1', 12.6667, 108.0500, N'0941300000', N'pharmacy.pha030@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_10.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-07-15', '2024-07-15', 0.00, 0.00, NULL),
(N'user-pha031', N'HealthLink Analytics Pharmacy 031', N'PH-AN-031', N'1 Analytics Street', N'Ho Chi Minh City', N'District 1', N'Ward 1', 10.7769, 106.7009, N'0941310000', N'pharmacy.pha031@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_01.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-07-23', '2024-07-23', 0.00, 0.00, NULL),
(N'user-pha032', N'HealthLink Analytics Pharmacy 032', N'PH-AN-032', N'1 Analytics Street', N'Ha Noi', N'District 1', N'Ward 1', 21.0285, 105.8542, N'0941320000', N'pharmacy.pha032@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_02.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-05-15', '2024-05-15', 0.00, 0.00, NULL),
(N'user-pha033', N'HealthLink Analytics Pharmacy 033', N'PH-AN-033', N'1 Analytics Street', N'Da Nang', N'District 1', N'Ward 1', 16.0544, 108.2022, N'0941330000', N'pharmacy.pha033@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_03.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-10-10', '2024-10-10', 0.00, 0.00, NULL),
(N'user-pha034', N'HealthLink Analytics Pharmacy 034', N'PH-AN-034', N'1 Analytics Street', N'Can Tho', N'District 1', N'Ward 1', 10.0452, 105.7469, N'0941340000', N'pharmacy.pha034@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_04.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-10-20', '2024-10-20', 0.00, 0.00, NULL),
(N'user-pha035', N'HealthLink Analytics Pharmacy 035', N'PH-AN-035', N'1 Analytics Street', N'Hai Phong', N'District 1', N'Ward 1', 20.8449, 106.6881, N'0941350000', N'pharmacy.pha035@analytics.healthlink.com', N'Analytics seed pharmacy profile used to populate registration charts.', N'http://localhost:8096/uploads/avatars/pharmacies/nhathuoc_05.png', N'08:00', N'21:00', 0, N'Mon-Sun', 1, 1, 1, 4.5, 0, 1, 5.0, 5.99, '2024-11-15', '2024-11-15', 0.00, 0.00, NULL);
GO
PRINT 'Analytics doctor & pharmacy registrations seed completed successfully!';

-- =====================================================
-- 59. ANALYTICS HOME VISIT APPOINTMENTS (2024)
-- Adds HomeVisit-type analytics Appointments (AppointmentID 2000-2071, 6 per
-- month) so the Admin "Appointments" and "Revenue" charts show a real
-- Online vs Home Visit split across all 12 months of 2024 (the base
-- analytics seed in section 49 was 100% Online). Reuses existing analytics
-- patients (user-pa001..090) and the core doctors (user-d01..d20).
-- Idempotent: safe to re-run.
-- =====================================================

DELETE FROM Consultations WHERE AppointmentId >= 2000 AND AppointmentId < 2100;
DELETE FROM Appointments WHERE AppointmentID >= 2000 AND AppointmentID < 2100;
GO

SET IDENTITY_INSERT Appointments ON;
INSERT INTO Appointments (AppointmentID, AppointmentTime, ConsultationType, Status, symptoms, notes, fee, endTime, doctorReminderSent, reminderSent, confirmedAt, PatientID, DoctorID) VALUES
(2000, '2024-01-03 09:00:00', N'HomeVisit', N'Completed', N'Home visit for elderly care check', N'Completed home visit consultation', 75.00, '2024-01-03 09:45:00', 0, 1, '2024-01-02 18:00:00', N'user-pa001', N'user-d01'),
(2001, '2024-01-07 10:00:00', N'HomeVisit', N'Completed', N'Post-surgery wound care at home', N'Completed home visit consultation', 75.00, '2024-01-07 10:45:00', 0, 1, '2024-01-06 18:00:00', N'user-pa002', N'user-d02'),
(2002, '2024-01-11 11:00:00', N'HomeVisit', N'Completed', N'Home visit for mobility-limited patient', N'Completed home visit consultation', 75.00, '2024-01-11 11:45:00', 0, 1, '2024-01-10 18:00:00', N'user-pa003', N'user-d03'),
(2003, '2024-01-15 13:00:00', N'HomeVisit', N'Completed', N'Chronic disease home monitoring', N'Completed home visit consultation', 75.00, '2024-01-15 13:45:00', 0, 1, '2024-01-14 18:00:00', N'user-pa004', N'user-d04'),
(2004, '2024-01-19 14:00:00', N'HomeVisit', N'Completed', N'Home visit vaccination', N'Completed home visit consultation', 75.00, '2024-01-19 14:45:00', 0, 1, '2024-01-18 18:00:00', N'user-pa005', N'user-d05'),
(2005, '2024-01-23 16:00:00', N'HomeVisit', N'Completed', N'Home visit vital signs check', N'Completed home visit consultation', 75.00, '2024-01-23 16:45:00', 0, 1, '2024-01-22 18:00:00', N'user-pa006', N'user-d06'),
(2006, '2024-02-03 09:00:00', N'HomeVisit', N'Completed', N'Home visit for elderly care check', N'Completed home visit consultation', 75.00, '2024-02-03 09:45:00', 0, 1, '2024-02-02 18:00:00', N'user-pa007', N'user-d07'),
(2007, '2024-02-07 10:00:00', N'HomeVisit', N'Cancelled', N'Post-surgery wound care at home', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-02-06 18:00:00', N'user-pa008', N'user-d08'),
(2008, '2024-02-11 11:00:00', N'HomeVisit', N'Completed', N'Home visit for mobility-limited patient', N'Completed home visit consultation', 75.00, '2024-02-11 11:45:00', 0, 1, '2024-02-10 18:00:00', N'user-pa009', N'user-d09'),
(2009, '2024-02-15 13:00:00', N'HomeVisit', N'Completed', N'Chronic disease home monitoring', N'Completed home visit consultation', 75.00, '2024-02-15 13:45:00', 0, 1, '2024-02-14 18:00:00', N'user-pa010', N'user-d10'),
(2010, '2024-02-19 14:00:00', N'HomeVisit', N'Completed', N'Home visit vaccination', N'Completed home visit consultation', 75.00, '2024-02-19 14:45:00', 0, 1, '2024-02-18 18:00:00', N'user-pa011', N'user-d11'),
(2011, '2024-02-23 16:00:00', N'HomeVisit', N'Completed', N'Home visit vital signs check', N'Completed home visit consultation', 75.00, '2024-02-23 16:45:00', 0, 1, '2024-02-22 18:00:00', N'user-pa012', N'user-d12'),
(2012, '2024-03-03 09:00:00', N'HomeVisit', N'Completed', N'Home visit for elderly care check', N'Completed home visit consultation', 75.00, '2024-03-03 09:45:00', 0, 1, '2024-03-02 18:00:00', N'user-pa013', N'user-d13'),
(2013, '2024-03-07 10:00:00', N'HomeVisit', N'Completed', N'Post-surgery wound care at home', N'Completed home visit consultation', 75.00, '2024-03-07 10:45:00', 0, 1, '2024-03-06 18:00:00', N'user-pa014', N'user-d14'),
(2014, '2024-03-11 11:00:00', N'HomeVisit', N'Completed', N'Home visit for mobility-limited patient', N'Completed home visit consultation', 75.00, '2024-03-11 11:45:00', 0, 1, '2024-03-10 18:00:00', N'user-pa015', N'user-d15'),
(2015, '2024-03-15 13:00:00', N'HomeVisit', N'Cancelled', N'Chronic disease home monitoring', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-03-14 18:00:00', N'user-pa016', N'user-d16'),
(2016, '2024-03-19 14:00:00', N'HomeVisit', N'Completed', N'Home visit vaccination', N'Completed home visit consultation', 75.00, '2024-03-19 14:45:00', 0, 1, '2024-03-18 18:00:00', N'user-pa017', N'user-d17'),
(2017, '2024-03-23 16:00:00', N'HomeVisit', N'Completed', N'Home visit vital signs check', N'Completed home visit consultation', 75.00, '2024-03-23 16:45:00', 0, 1, '2024-03-22 18:00:00', N'user-pa018', N'user-d18'),
(2018, '2024-04-03 09:00:00', N'HomeVisit', N'Completed', N'Home visit for elderly care check', N'Completed home visit consultation', 75.00, '2024-04-03 09:45:00', 0, 1, '2024-04-02 18:00:00', N'user-pa019', N'user-d19'),
(2019, '2024-04-07 10:00:00', N'HomeVisit', N'Completed', N'Post-surgery wound care at home', N'Completed home visit consultation', 75.00, '2024-04-07 10:45:00', 0, 1, '2024-04-06 18:00:00', N'user-pa020', N'user-d20'),
(2020, '2024-04-11 11:00:00', N'HomeVisit', N'Completed', N'Home visit for mobility-limited patient', N'Completed home visit consultation', 75.00, '2024-04-11 11:45:00', 0, 1, '2024-04-10 18:00:00', N'user-pa021', N'user-d01'),
(2021, '2024-04-15 13:00:00', N'HomeVisit', N'Completed', N'Chronic disease home monitoring', N'Completed home visit consultation', 75.00, '2024-04-15 13:45:00', 0, 1, '2024-04-14 18:00:00', N'user-pa022', N'user-d02'),
(2022, '2024-04-19 14:00:00', N'HomeVisit', N'Completed', N'Home visit vaccination', N'Completed home visit consultation', 75.00, '2024-04-19 14:45:00', 0, 1, '2024-04-18 18:00:00', N'user-pa023', N'user-d03'),
(2023, '2024-04-23 16:00:00', N'HomeVisit', N'Cancelled', N'Home visit vital signs check', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-04-22 18:00:00', N'user-pa024', N'user-d04'),
(2024, '2024-05-03 09:00:00', N'HomeVisit', N'Completed', N'Home visit for elderly care check', N'Completed home visit consultation', 75.00, '2024-05-03 09:45:00', 0, 1, '2024-05-02 18:00:00', N'user-pa025', N'user-d05'),
(2025, '2024-05-07 10:00:00', N'HomeVisit', N'Completed', N'Post-surgery wound care at home', N'Completed home visit consultation', 75.00, '2024-05-07 10:45:00', 0, 1, '2024-05-06 18:00:00', N'user-pa026', N'user-d06'),
(2026, '2024-05-11 11:00:00', N'HomeVisit', N'Completed', N'Home visit for mobility-limited patient', N'Completed home visit consultation', 75.00, '2024-05-11 11:45:00', 0, 1, '2024-05-10 18:00:00', N'user-pa027', N'user-d07'),
(2027, '2024-05-15 13:00:00', N'HomeVisit', N'Completed', N'Chronic disease home monitoring', N'Completed home visit consultation', 75.00, '2024-05-15 13:45:00', 0, 1, '2024-05-14 18:00:00', N'user-pa028', N'user-d08'),
(2028, '2024-05-19 14:00:00', N'HomeVisit', N'Completed', N'Home visit vaccination', N'Completed home visit consultation', 75.00, '2024-05-19 14:45:00', 0, 1, '2024-05-18 18:00:00', N'user-pa029', N'user-d09'),
(2029, '2024-05-23 16:00:00', N'HomeVisit', N'Completed', N'Home visit vital signs check', N'Completed home visit consultation', 75.00, '2024-05-23 16:45:00', 0, 1, '2024-05-22 18:00:00', N'user-pa030', N'user-d10'),
(2030, '2024-06-03 09:00:00', N'HomeVisit', N'Completed', N'Home visit for elderly care check', N'Completed home visit consultation', 75.00, '2024-06-03 09:45:00', 0, 1, '2024-06-02 18:00:00', N'user-pa031', N'user-d11'),
(2031, '2024-06-07 10:00:00', N'HomeVisit', N'Cancelled', N'Post-surgery wound care at home', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-06-06 18:00:00', N'user-pa032', N'user-d12'),
(2032, '2024-06-11 11:00:00', N'HomeVisit', N'Completed', N'Home visit for mobility-limited patient', N'Completed home visit consultation', 75.00, '2024-06-11 11:45:00', 0, 1, '2024-06-10 18:00:00', N'user-pa033', N'user-d13'),
(2033, '2024-06-15 13:00:00', N'HomeVisit', N'Completed', N'Chronic disease home monitoring', N'Completed home visit consultation', 75.00, '2024-06-15 13:45:00', 0, 1, '2024-06-14 18:00:00', N'user-pa034', N'user-d14'),
(2034, '2024-06-19 14:00:00', N'HomeVisit', N'Completed', N'Home visit vaccination', N'Completed home visit consultation', 75.00, '2024-06-19 14:45:00', 0, 1, '2024-06-18 18:00:00', N'user-pa035', N'user-d15'),
(2035, '2024-06-23 16:00:00', N'HomeVisit', N'Completed', N'Home visit vital signs check', N'Completed home visit consultation', 75.00, '2024-06-23 16:45:00', 0, 1, '2024-06-22 18:00:00', N'user-pa036', N'user-d16'),
(2036, '2024-07-03 09:00:00', N'HomeVisit', N'Completed', N'Home visit for elderly care check', N'Completed home visit consultation', 75.00, '2024-07-03 09:45:00', 0, 1, '2024-07-02 18:00:00', N'user-pa037', N'user-d17'),
(2037, '2024-07-07 10:00:00', N'HomeVisit', N'Completed', N'Post-surgery wound care at home', N'Completed home visit consultation', 75.00, '2024-07-07 10:45:00', 0, 1, '2024-07-06 18:00:00', N'user-pa038', N'user-d18'),
(2038, '2024-07-11 11:00:00', N'HomeVisit', N'Completed', N'Home visit for mobility-limited patient', N'Completed home visit consultation', 75.00, '2024-07-11 11:45:00', 0, 1, '2024-07-10 18:00:00', N'user-pa039', N'user-d19'),
(2039, '2024-07-15 13:00:00', N'HomeVisit', N'Cancelled', N'Chronic disease home monitoring', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-07-14 18:00:00', N'user-pa040', N'user-d20'),
(2040, '2024-07-19 14:00:00', N'HomeVisit', N'Completed', N'Home visit vaccination', N'Completed home visit consultation', 75.00, '2024-07-19 14:45:00', 0, 1, '2024-07-18 18:00:00', N'user-pa041', N'user-d01'),
(2041, '2024-07-23 16:00:00', N'HomeVisit', N'Completed', N'Home visit vital signs check', N'Completed home visit consultation', 75.00, '2024-07-23 16:45:00', 0, 1, '2024-07-22 18:00:00', N'user-pa042', N'user-d02'),
(2042, '2024-08-03 09:00:00', N'HomeVisit', N'Completed', N'Home visit for elderly care check', N'Completed home visit consultation', 75.00, '2024-08-03 09:45:00', 0, 1, '2024-08-02 18:00:00', N'user-pa043', N'user-d03'),
(2043, '2024-08-07 10:00:00', N'HomeVisit', N'Completed', N'Post-surgery wound care at home', N'Completed home visit consultation', 75.00, '2024-08-07 10:45:00', 0, 1, '2024-08-06 18:00:00', N'user-pa044', N'user-d04'),
(2044, '2024-08-11 11:00:00', N'HomeVisit', N'Completed', N'Home visit for mobility-limited patient', N'Completed home visit consultation', 75.00, '2024-08-11 11:45:00', 0, 1, '2024-08-10 18:00:00', N'user-pa045', N'user-d05'),
(2045, '2024-08-15 13:00:00', N'HomeVisit', N'Completed', N'Chronic disease home monitoring', N'Completed home visit consultation', 75.00, '2024-08-15 13:45:00', 0, 1, '2024-08-14 18:00:00', N'user-pa046', N'user-d06'),
(2046, '2024-08-19 14:00:00', N'HomeVisit', N'Completed', N'Home visit vaccination', N'Completed home visit consultation', 75.00, '2024-08-19 14:45:00', 0, 1, '2024-08-18 18:00:00', N'user-pa047', N'user-d07'),
(2047, '2024-08-23 16:00:00', N'HomeVisit', N'Cancelled', N'Home visit vital signs check', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-08-22 18:00:00', N'user-pa048', N'user-d08'),
(2048, '2024-09-03 09:00:00', N'HomeVisit', N'Completed', N'Home visit for elderly care check', N'Completed home visit consultation', 75.00, '2024-09-03 09:45:00', 0, 1, '2024-09-02 18:00:00', N'user-pa049', N'user-d09'),
(2049, '2024-09-07 10:00:00', N'HomeVisit', N'Completed', N'Post-surgery wound care at home', N'Completed home visit consultation', 75.00, '2024-09-07 10:45:00', 0, 1, '2024-09-06 18:00:00', N'user-pa050', N'user-d10'),
(2050, '2024-09-11 11:00:00', N'HomeVisit', N'Completed', N'Home visit for mobility-limited patient', N'Completed home visit consultation', 75.00, '2024-09-11 11:45:00', 0, 1, '2024-09-10 18:00:00', N'user-pa051', N'user-d11'),
(2051, '2024-09-15 13:00:00', N'HomeVisit', N'Completed', N'Chronic disease home monitoring', N'Completed home visit consultation', 75.00, '2024-09-15 13:45:00', 0, 1, '2024-09-14 18:00:00', N'user-pa052', N'user-d12'),
(2052, '2024-09-19 14:00:00', N'HomeVisit', N'Completed', N'Home visit vaccination', N'Completed home visit consultation', 75.00, '2024-09-19 14:45:00', 0, 1, '2024-09-18 18:00:00', N'user-pa053', N'user-d13'),
(2053, '2024-09-23 16:00:00', N'HomeVisit', N'Completed', N'Home visit vital signs check', N'Completed home visit consultation', 75.00, '2024-09-23 16:45:00', 0, 1, '2024-09-22 18:00:00', N'user-pa054', N'user-d14'),
(2054, '2024-10-03 09:00:00', N'HomeVisit', N'Completed', N'Home visit for elderly care check', N'Completed home visit consultation', 75.00, '2024-10-03 09:45:00', 0, 1, '2024-10-02 18:00:00', N'user-pa055', N'user-d15'),
(2055, '2024-10-07 10:00:00', N'HomeVisit', N'Cancelled', N'Post-surgery wound care at home', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-10-06 18:00:00', N'user-pa056', N'user-d16'),
(2056, '2024-10-11 11:00:00', N'HomeVisit', N'Completed', N'Home visit for mobility-limited patient', N'Completed home visit consultation', 75.00, '2024-10-11 11:45:00', 0, 1, '2024-10-10 18:00:00', N'user-pa057', N'user-d17'),
(2057, '2024-10-15 13:00:00', N'HomeVisit', N'Completed', N'Chronic disease home monitoring', N'Completed home visit consultation', 75.00, '2024-10-15 13:45:00', 0, 1, '2024-10-14 18:00:00', N'user-pa058', N'user-d18'),
(2058, '2024-10-19 14:00:00', N'HomeVisit', N'Completed', N'Home visit vaccination', N'Completed home visit consultation', 75.00, '2024-10-19 14:45:00', 0, 1, '2024-10-18 18:00:00', N'user-pa059', N'user-d19'),
(2059, '2024-10-23 16:00:00', N'HomeVisit', N'Completed', N'Home visit vital signs check', N'Completed home visit consultation', 75.00, '2024-10-23 16:45:00', 0, 1, '2024-10-22 18:00:00', N'user-pa060', N'user-d20'),
(2060, '2024-11-03 09:00:00', N'HomeVisit', N'Completed', N'Home visit for elderly care check', N'Completed home visit consultation', 75.00, '2024-11-03 09:45:00', 0, 1, '2024-11-02 18:00:00', N'user-pa061', N'user-d01'),
(2061, '2024-11-07 10:00:00', N'HomeVisit', N'Completed', N'Post-surgery wound care at home', N'Completed home visit consultation', 75.00, '2024-11-07 10:45:00', 0, 1, '2024-11-06 18:00:00', N'user-pa062', N'user-d02'),
(2062, '2024-11-11 11:00:00', N'HomeVisit', N'Completed', N'Home visit for mobility-limited patient', N'Completed home visit consultation', 75.00, '2024-11-11 11:45:00', 0, 1, '2024-11-10 18:00:00', N'user-pa063', N'user-d03'),
(2063, '2024-11-15 13:00:00', N'HomeVisit', N'Cancelled', N'Chronic disease home monitoring', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-11-14 18:00:00', N'user-pa064', N'user-d04'),
(2064, '2024-11-19 14:00:00', N'HomeVisit', N'Completed', N'Home visit vaccination', N'Completed home visit consultation', 75.00, '2024-11-19 14:45:00', 0, 1, '2024-11-18 18:00:00', N'user-pa065', N'user-d05'),
(2065, '2024-11-23 16:00:00', N'HomeVisit', N'Completed', N'Home visit vital signs check', N'Completed home visit consultation', 75.00, '2024-11-23 16:45:00', 0, 1, '2024-11-22 18:00:00', N'user-pa066', N'user-d06'),
(2066, '2024-12-03 09:00:00', N'HomeVisit', N'Completed', N'Home visit for elderly care check', N'Completed home visit consultation', 75.00, '2024-12-03 09:45:00', 0, 1, '2024-12-02 18:00:00', N'user-pa067', N'user-d07'),
(2067, '2024-12-07 10:00:00', N'HomeVisit', N'Completed', N'Post-surgery wound care at home', N'Completed home visit consultation', 75.00, '2024-12-07 10:45:00', 0, 1, '2024-12-06 18:00:00', N'user-pa068', N'user-d08'),
(2068, '2024-12-11 11:00:00', N'HomeVisit', N'Completed', N'Home visit for mobility-limited patient', N'Completed home visit consultation', 75.00, '2024-12-11 11:45:00', 0, 1, '2024-12-10 18:00:00', N'user-pa069', N'user-d09'),
(2069, '2024-12-15 13:00:00', N'HomeVisit', N'Completed', N'Chronic disease home monitoring', N'Completed home visit consultation', 75.00, '2024-12-15 13:45:00', 0, 1, '2024-12-14 18:00:00', N'user-pa070', N'user-d10'),
(2070, '2024-12-19 14:00:00', N'HomeVisit', N'Completed', N'Home visit vaccination', N'Completed home visit consultation', 75.00, '2024-12-19 14:45:00', 0, 1, '2024-12-18 18:00:00', N'user-pa071', N'user-d11'),
(2071, '2024-12-23 16:00:00', N'HomeVisit', N'Cancelled', N'Home visit vital signs check', N'Auto-cancelled sample', NULL, NULL, 0, 0, '2024-12-22 18:00:00', N'user-pa072', N'user-d12');
SET IDENTITY_INSERT Appointments OFF;
GO
PRINT 'Analytics home visit appointments seed completed successfully!';

-- =====================================================
-- 60. REAL DOCTOR (d01-d20) FINANCE & REVIEW-COUNT RECONCILIATION
-- totalEarnings/pendingSettlement recomputed from every actual Completed
-- appointment for that doctor (Online $50 fee -> 15% commission -> $42.50 net;
-- HomeVisit $75 fee -> 10% commission -> $67.50 net; appt #14 HomeVisit $103
-- keeps its already-invoiced $94.20 net). pendingSettlement = 20% of total.
-- totalReviews synced to the live Reviews row count per doctor.
-- =====================================================
UPDATE Doctors SET totalEarnings = 704.20, pendingSettlement = 140.84, totalReviews = 3 WHERE DoctorID = 'user-d01';
UPDATE Doctors SET totalEarnings = 780.00, pendingSettlement = 156.00, totalReviews = 6 WHERE DoctorID = 'user-d02';
UPDATE Doctors SET totalEarnings = 780.00, pendingSettlement = 156.00, totalReviews = 1 WHERE DoctorID = 'user-d03';
UPDATE Doctors SET totalEarnings = 645.00, pendingSettlement = 129.00, totalReviews = 5 WHERE DoctorID = 'user-d04';
UPDATE Doctors SET totalEarnings = 610.00, pendingSettlement = 122.00, totalReviews = 1 WHERE DoctorID = 'user-d05';
UPDATE Doctors SET totalEarnings = 737.50, pendingSettlement = 147.50, totalReviews = 2 WHERE DoctorID = 'user-d06';
UPDATE Doctors SET totalEarnings = 737.50, pendingSettlement = 147.50, totalReviews = 5 WHERE DoctorID = 'user-d07';
UPDATE Doctors SET totalEarnings = 602.50, pendingSettlement = 120.50, totalReviews = 2 WHERE DoctorID = 'user-d08';
UPDATE Doctors SET totalEarnings = 525.00, pendingSettlement = 105.00, totalReviews = 2 WHERE DoctorID = 'user-d09';
UPDATE Doctors SET totalEarnings = 737.50, pendingSettlement = 147.50, totalReviews = 4 WHERE DoctorID = 'user-d10';
UPDATE Doctors SET totalEarnings = 652.50, pendingSettlement = 130.50, totalReviews = 2 WHERE DoctorID = 'user-d11';
UPDATE Doctors SET totalEarnings = 517.50, pendingSettlement = 103.50, totalReviews = 2 WHERE DoctorID = 'user-d12';
UPDATE Doctors SET totalEarnings = 415.00, pendingSettlement = 83.00, totalReviews = 5 WHERE DoctorID = 'user-d13';
UPDATE Doctors SET totalEarnings = 585.00, pendingSettlement = 117.00, totalReviews = 2 WHERE DoctorID = 'user-d14';
UPDATE Doctors SET totalEarnings = 585.00, pendingSettlement = 117.00, totalReviews = 2 WHERE DoctorID = 'user-d15';
UPDATE Doctors SET totalEarnings = 407.50, pendingSettlement = 81.50, totalReviews = 4 WHERE DoctorID = 'user-d16';
UPDATE Doctors SET totalEarnings = 372.50, pendingSettlement = 74.50, totalReviews = 2 WHERE DoctorID = 'user-d17';
UPDATE Doctors SET totalEarnings = 542.50, pendingSettlement = 108.50, totalReviews = 2 WHERE DoctorID = 'user-d18';
UPDATE Doctors SET totalEarnings = 542.50, pendingSettlement = 108.50, totalReviews = 4 WHERE DoctorID = 'user-d19';
UPDATE Doctors SET totalEarnings = 475.00, pendingSettlement = 95.00, totalReviews = 2 WHERE DoctorID = 'user-d20';
GO

-- =====================================================
-- 61. REAL PHARMACY (ph01-ph10) FINANCE RECONCILIATION
-- ph01/02/04/06/07 already have real PharmacyOrders; totalEarnings recomputed
-- as the sum of pharmacyEarning across their non-cancelled/non-refunded orders.
-- ph03/05/08/09/10 had ZERO orders -> one real DELIVERED order added below (62)
-- so their Financial Summary is backed by an actual order too.
-- =====================================================
UPDATE Pharmacies SET totalEarnings = 154.53, pendingSettlement = 30.91 WHERE PharmacyID = 'user-ph01';
UPDATE Pharmacies SET totalEarnings = 186.72, pendingSettlement = 37.34 WHERE PharmacyID = 'user-ph02';
UPDATE Pharmacies SET totalEarnings = 136.15, pendingSettlement = 27.23 WHERE PharmacyID = 'user-ph04';
UPDATE Pharmacies SET totalEarnings = 73.60, pendingSettlement = 14.72 WHERE PharmacyID = 'user-ph06';
UPDATE Pharmacies SET totalEarnings = 99.34, pendingSettlement = 19.87 WHERE PharmacyID = 'user-ph07';
GO

-- =====================================================
-- 62. NEW PHARMACY ORDERS for pharmacies that previously had ZERO orders
-- (5 real: ph03/05/08/09/10; 35 analytics: pha001-035). One simple DELIVERED/PAID
-- retail order each (no prescription link) so Financial Summary reflects a real order.
-- Idempotent: delete-then-insert by OrderID range.
-- =====================================================
DELETE FROM PharmacyOrderItems WHERE OrderID BETWEEN 16 AND 55;
DELETE FROM PharmacyOrders WHERE OrderID BETWEEN 16 AND 55;
GO

SET IDENTITY_INSERT PharmacyOrders ON;
INSERT INTO PharmacyOrders (OrderID, orderNumber, PrescriptionHeaderId, RequestID, PharmacyId, PatientId, status, deliveryType, deliveryAddress, deliveryLatitude, deliveryLongitude, deliveryPhoneNumber, deliveryAddressSource, deliveryFee, medicineAmount, totalAmount, paymentStatus, paymentMethod, notes, pharmacistNotes, estimatedDeliveryTime, actualDeliveryTime, confirmedAt, patientConfirmedAt, preparingAt, shippedAt, deliveredAt, cancelledAt, cancelReason, cancelledBy, revisionRequestedAt, revisionRequestNotes, revisionResolvedAt, createdAt, doctorCompletionPaidNotified, platformFee, pharmacyEarning, commissionRate) VALUES
(16, 'ORD-2024-0016', NULL, NULL, 'user-ph03', N'user-pa001', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-06-01 14:00:00', '2024-06-01 15:00:00', '2024-06-01 09:05:00', '2024-06-01 09:05:00', '2024-06-01 09:30:00', '2024-06-01 12:00:00', '2024-06-01 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-06-01 09:00:00', 0,3.20,42.79, 0.0800),
(17, 'ORD-2024-0017', NULL, NULL, 'user-ph05', N'user-pa002', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-06-04 14:00:00', '2024-06-04 15:00:00', '2024-06-04 09:05:00', '2024-06-04 09:05:00', '2024-06-04 09:30:00', '2024-06-04 12:00:00', '2024-06-04 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-06-04 09:00:00', 0,3.20,42.79, 0.0800),
(18, 'ORD-2024-0018', NULL, NULL, 'user-ph08', N'user-pa003', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-06-07 14:00:00', '2024-06-07 15:00:00', '2024-06-07 09:05:00', '2024-06-07 09:05:00', '2024-06-07 09:30:00', '2024-06-07 12:00:00', '2024-06-07 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-06-07 09:00:00', 0,3.20,42.79, 0.0800),
(19, 'ORD-2024-0019', NULL, NULL, 'user-ph09', N'user-pa004', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-06-10 14:00:00', '2024-06-10 15:00:00', '2024-06-10 09:05:00', '2024-06-10 09:05:00', '2024-06-10 09:30:00', '2024-06-10 12:00:00', '2024-06-10 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-06-10 09:00:00', 0,3.20,42.79, 0.0800),
(20, 'ORD-2024-0020', NULL, NULL, 'user-ph10', N'user-pa005', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-06-13 14:00:00', '2024-06-13 15:00:00', '2024-06-13 09:05:00', '2024-06-13 09:05:00', '2024-06-13 09:30:00', '2024-06-13 12:00:00', '2024-06-13 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-06-13 09:00:00', 0,3.20,42.79, 0.0800),
(21, 'ORD-2024-0021', NULL, NULL, 'user-pha001', N'user-pa006', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-06-16 14:00:00', '2024-06-16 15:00:00', '2024-06-16 09:05:00', '2024-06-16 09:05:00', '2024-06-16 09:30:00', '2024-06-16 12:00:00', '2024-06-16 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-06-16 09:00:00', 0,3.20,42.79, 0.0800),
(22, 'ORD-2024-0022', NULL, NULL, 'user-pha002', N'user-pa007', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-06-19 14:00:00', '2024-06-19 15:00:00', '2024-06-19 09:05:00', '2024-06-19 09:05:00', '2024-06-19 09:30:00', '2024-06-19 12:00:00', '2024-06-19 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-06-19 09:00:00', 0,3.20,42.79, 0.0800),
(23, 'ORD-2024-0023', NULL, NULL, 'user-pha003', N'user-pa008', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-06-22 14:00:00', '2024-06-22 15:00:00', '2024-06-22 09:05:00', '2024-06-22 09:05:00', '2024-06-22 09:30:00', '2024-06-22 12:00:00', '2024-06-22 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-06-22 09:00:00', 0,3.20,42.79, 0.0800),
(24, 'ORD-2024-0024', NULL, NULL, 'user-pha004', N'user-pa009', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-06-25 14:00:00', '2024-06-25 15:00:00', '2024-06-25 09:05:00', '2024-06-25 09:05:00', '2024-06-25 09:30:00', '2024-06-25 12:00:00', '2024-06-25 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-06-25 09:00:00', 0,3.20,42.79, 0.0800),
(25, 'ORD-2024-0025', NULL, NULL, 'user-pha005', N'user-pa010', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-06-28 14:00:00', '2024-06-28 15:00:00', '2024-06-28 09:05:00', '2024-06-28 09:05:00', '2024-06-28 09:30:00', '2024-06-28 12:00:00', '2024-06-28 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-06-28 09:00:00', 0,3.20,42.79, 0.0800),
(26, 'ORD-2024-0026', NULL, NULL, 'user-pha006', N'user-pa011', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-07-01 14:00:00', '2024-07-01 15:00:00', '2024-07-01 09:05:00', '2024-07-01 09:05:00', '2024-07-01 09:30:00', '2024-07-01 12:00:00', '2024-07-01 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-07-01 09:00:00', 0,3.20,42.79, 0.0800),
(27, 'ORD-2024-0027', NULL, NULL, 'user-pha007', N'user-pa012', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-07-04 14:00:00', '2024-07-04 15:00:00', '2024-07-04 09:05:00', '2024-07-04 09:05:00', '2024-07-04 09:30:00', '2024-07-04 12:00:00', '2024-07-04 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-07-04 09:00:00', 0,3.20,42.79, 0.0800),
(28, 'ORD-2024-0028', NULL, NULL, 'user-pha008', N'user-pa013', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-07-07 14:00:00', '2024-07-07 15:00:00', '2024-07-07 09:05:00', '2024-07-07 09:05:00', '2024-07-07 09:30:00', '2024-07-07 12:00:00', '2024-07-07 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-07-07 09:00:00', 0,3.20,42.79, 0.0800),
(29, 'ORD-2024-0029', NULL, NULL, 'user-pha009', N'user-pa014', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-07-10 14:00:00', '2024-07-10 15:00:00', '2024-07-10 09:05:00', '2024-07-10 09:05:00', '2024-07-10 09:30:00', '2024-07-10 12:00:00', '2024-07-10 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-07-10 09:00:00', 0,3.20,42.79, 0.0800),
(30, 'ORD-2024-0030', NULL, NULL, 'user-pha010', N'user-pa015', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-07-13 14:00:00', '2024-07-13 15:00:00', '2024-07-13 09:05:00', '2024-07-13 09:05:00', '2024-07-13 09:30:00', '2024-07-13 12:00:00', '2024-07-13 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-07-13 09:00:00', 0,3.20,42.79, 0.0800),
(31, 'ORD-2024-0031', NULL, NULL, 'user-pha011', N'user-pa016', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-07-16 14:00:00', '2024-07-16 15:00:00', '2024-07-16 09:05:00', '2024-07-16 09:05:00', '2024-07-16 09:30:00', '2024-07-16 12:00:00', '2024-07-16 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-07-16 09:00:00', 0,3.20,42.79, 0.0800),
(32, 'ORD-2024-0032', NULL, NULL, 'user-pha012', N'user-pa017', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-07-19 14:00:00', '2024-07-19 15:00:00', '2024-07-19 09:05:00', '2024-07-19 09:05:00', '2024-07-19 09:30:00', '2024-07-19 12:00:00', '2024-07-19 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-07-19 09:00:00', 0,3.20,42.79, 0.0800),
(33, 'ORD-2024-0033', NULL, NULL, 'user-pha013', N'user-pa018', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-07-22 14:00:00', '2024-07-22 15:00:00', '2024-07-22 09:05:00', '2024-07-22 09:05:00', '2024-07-22 09:30:00', '2024-07-22 12:00:00', '2024-07-22 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-07-22 09:00:00', 0,3.20,42.79, 0.0800),
(34, 'ORD-2024-0034', NULL, NULL, 'user-pha014', N'user-pa019', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-07-25 14:00:00', '2024-07-25 15:00:00', '2024-07-25 09:05:00', '2024-07-25 09:05:00', '2024-07-25 09:30:00', '2024-07-25 12:00:00', '2024-07-25 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-07-25 09:00:00', 0,3.20,42.79, 0.0800),
(35, 'ORD-2024-0035', NULL, NULL, 'user-pha015', N'user-pa020', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-07-28 14:00:00', '2024-07-28 15:00:00', '2024-07-28 09:05:00', '2024-07-28 09:05:00', '2024-07-28 09:30:00', '2024-07-28 12:00:00', '2024-07-28 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-07-28 09:00:00', 0,3.20,42.79, 0.0800),
(36, 'ORD-2024-0036', NULL, NULL, 'user-pha016', N'user-pa021', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-07-31 14:00:00', '2024-07-31 15:00:00', '2024-07-31 09:05:00', '2024-07-31 09:05:00', '2024-07-31 09:30:00', '2024-07-31 12:00:00', '2024-07-31 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-07-31 09:00:00', 0,3.20,42.79, 0.0800),
(37, 'ORD-2024-0037', NULL, NULL, 'user-pha017', N'user-pa022', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-08-03 14:00:00', '2024-08-03 15:00:00', '2024-08-03 09:05:00', '2024-08-03 09:05:00', '2024-08-03 09:30:00', '2024-08-03 12:00:00', '2024-08-03 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-08-03 09:00:00', 0,3.20,42.79, 0.0800),
(38, 'ORD-2024-0038', NULL, NULL, 'user-pha018', N'user-pa023', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-08-06 14:00:00', '2024-08-06 15:00:00', '2024-08-06 09:05:00', '2024-08-06 09:05:00', '2024-08-06 09:30:00', '2024-08-06 12:00:00', '2024-08-06 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-08-06 09:00:00', 0,3.20,42.79, 0.0800),
(39, 'ORD-2024-0039', NULL, NULL, 'user-pha019', N'user-pa024', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-08-09 14:00:00', '2024-08-09 15:00:00', '2024-08-09 09:05:00', '2024-08-09 09:05:00', '2024-08-09 09:30:00', '2024-08-09 12:00:00', '2024-08-09 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-08-09 09:00:00', 0,3.20,42.79, 0.0800),
(40, 'ORD-2024-0040', NULL, NULL, 'user-pha020', N'user-pa025', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-08-12 14:00:00', '2024-08-12 15:00:00', '2024-08-12 09:05:00', '2024-08-12 09:05:00', '2024-08-12 09:30:00', '2024-08-12 12:00:00', '2024-08-12 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-08-12 09:00:00', 0,3.20,42.79, 0.0800),
(41, 'ORD-2024-0041', NULL, NULL, 'user-pha021', N'user-pa026', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-08-15 14:00:00', '2024-08-15 15:00:00', '2024-08-15 09:05:00', '2024-08-15 09:05:00', '2024-08-15 09:30:00', '2024-08-15 12:00:00', '2024-08-15 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-08-15 09:00:00', 0,3.20,42.79, 0.0800),
(42, 'ORD-2024-0042', NULL, NULL, 'user-pha022', N'user-pa027', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-08-18 14:00:00', '2024-08-18 15:00:00', '2024-08-18 09:05:00', '2024-08-18 09:05:00', '2024-08-18 09:30:00', '2024-08-18 12:00:00', '2024-08-18 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-08-18 09:00:00', 0,3.20,42.79, 0.0800),
(43, 'ORD-2024-0043', NULL, NULL, 'user-pha023', N'user-pa028', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-08-21 14:00:00', '2024-08-21 15:00:00', '2024-08-21 09:05:00', '2024-08-21 09:05:00', '2024-08-21 09:30:00', '2024-08-21 12:00:00', '2024-08-21 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-08-21 09:00:00', 0,3.20,42.79, 0.0800),
(44, 'ORD-2024-0044', NULL, NULL, 'user-pha024', N'user-pa029', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-08-24 14:00:00', '2024-08-24 15:00:00', '2024-08-24 09:05:00', '2024-08-24 09:05:00', '2024-08-24 09:30:00', '2024-08-24 12:00:00', '2024-08-24 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-08-24 09:00:00', 0,3.20,42.79, 0.0800),
(45, 'ORD-2024-0045', NULL, NULL, 'user-pha025', N'user-pa030', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-08-27 14:00:00', '2024-08-27 15:00:00', '2024-08-27 09:05:00', '2024-08-27 09:05:00', '2024-08-27 09:30:00', '2024-08-27 12:00:00', '2024-08-27 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-08-27 09:00:00', 0,3.20,42.79, 0.0800),
(46, 'ORD-2024-0046', NULL, NULL, 'user-pha026', N'user-pa031', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-08-30 14:00:00', '2024-08-30 15:00:00', '2024-08-30 09:05:00', '2024-08-30 09:05:00', '2024-08-30 09:30:00', '2024-08-30 12:00:00', '2024-08-30 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-08-30 09:00:00', 0,3.20,42.79, 0.0800),
(47, 'ORD-2024-0047', NULL, NULL, 'user-pha027', N'user-pa032', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-09-02 14:00:00', '2024-09-02 15:00:00', '2024-09-02 09:05:00', '2024-09-02 09:05:00', '2024-09-02 09:30:00', '2024-09-02 12:00:00', '2024-09-02 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-09-02 09:00:00', 0,3.20,42.79, 0.0800),
(48, 'ORD-2024-0048', NULL, NULL, 'user-pha028', N'user-pa033', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-09-05 14:00:00', '2024-09-05 15:00:00', '2024-09-05 09:05:00', '2024-09-05 09:05:00', '2024-09-05 09:30:00', '2024-09-05 12:00:00', '2024-09-05 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-09-05 09:00:00', 0,3.20,42.79, 0.0800),
(49, 'ORD-2024-0049', NULL, NULL, 'user-pha029', N'user-pa034', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-09-08 14:00:00', '2024-09-08 15:00:00', '2024-09-08 09:05:00', '2024-09-08 09:05:00', '2024-09-08 09:30:00', '2024-09-08 12:00:00', '2024-09-08 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-09-08 09:00:00', 0,3.20,42.79, 0.0800),
(50, 'ORD-2024-0050', NULL, NULL, 'user-pha030', N'user-pa035', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-09-11 14:00:00', '2024-09-11 15:00:00', '2024-09-11 09:05:00', '2024-09-11 09:05:00', '2024-09-11 09:30:00', '2024-09-11 12:00:00', '2024-09-11 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-09-11 09:00:00', 0,3.20,42.79, 0.0800),
(51, 'ORD-2024-0051', NULL, NULL, 'user-pha031', N'user-pa036', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-09-14 14:00:00', '2024-09-14 15:00:00', '2024-09-14 09:05:00', '2024-09-14 09:05:00', '2024-09-14 09:30:00', '2024-09-14 12:00:00', '2024-09-14 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-09-14 09:00:00', 0,3.20,42.79, 0.0800),
(52, 'ORD-2024-0052', NULL, NULL, 'user-pha032', N'user-pa037', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-09-17 14:00:00', '2024-09-17 15:00:00', '2024-09-17 09:05:00', '2024-09-17 09:05:00', '2024-09-17 09:30:00', '2024-09-17 12:00:00', '2024-09-17 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-09-17 09:00:00', 0,3.20,42.79, 0.0800),
(53, 'ORD-2024-0053', NULL, NULL, 'user-pha033', N'user-pa038', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-09-20 14:00:00', '2024-09-20 15:00:00', '2024-09-20 09:05:00', '2024-09-20 09:05:00', '2024-09-20 09:30:00', '2024-09-20 12:00:00', '2024-09-20 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-09-20 09:00:00', 0,3.20,42.79, 0.0800),
(54, 'ORD-2024-0054', NULL, NULL, 'user-pha034', N'user-pa039', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-09-23 14:00:00', '2024-09-23 15:00:00', '2024-09-23 09:05:00', '2024-09-23 09:05:00', '2024-09-23 09:30:00', '2024-09-23 12:00:00', '2024-09-23 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-09-23 09:00:00', 0,3.20,42.79, 0.0800),
(55, 'ORD-2024-0055', NULL, NULL, 'user-pha035', N'user-pa040', 'DELIVERED', 'Delivery', N'1 Analytics Street', 10.7769, 106.7009, '0940000000', 'PROFILE', 5.99, 40.00, 45.99, 'PAID', 'Card', N'Standard retail order', N'Completed', '2024-09-26 14:00:00', '2024-09-26 15:00:00', '2024-09-26 09:05:00', '2024-09-26 09:05:00', '2024-09-26 09:30:00', '2024-09-26 12:00:00', '2024-09-26 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-09-26 09:00:00', 0,3.20,42.79, 0.0800);
SET IDENTITY_INSERT PharmacyOrders OFF;

SET IDENTITY_INSERT PharmacyOrderItems ON;
INSERT INTO PharmacyOrderItems (OrderItemID, OrderID, MedicineID, SourcePrescriptionHeaderID, SourcePrescriptionItemID, medicationName, totalSupplyDays, quantity, unit, frequency, timing, route, totalPrice, notes) VALUES
(22, 16, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(23, 17, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(24, 18, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(25, 19, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(26, 20, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(27, 21, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(28, 22, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(29, 23, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(30, 24, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(31, 25, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(32, 26, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(33, 27, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(34, 28, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(35, 29, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(36, 30, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(37, 31, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(38, 32, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(39, 33, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(40, 34, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(41, 35, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(42, 36, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(43, 37, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(44, 38, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(45, 39, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(46, 40, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(47, 41, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(48, 42, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(49, 43, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(50, 44, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(51, 45, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(52, 46, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(53, 47, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(54, 48, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(55, 49, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(56, 50, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(57, 51, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(58, 52, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(59, 53, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(60, 54, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed'),
(61, 55, NULL, NULL, NULL, N'Assorted OTC medicine bundle', 7, 1, 'Pack', 'As directed', 'As needed', 'Oral', 40.00, N'Filler retail order item for financial-summary seed');
SET IDENTITY_INSERT PharmacyOrderItems OFF;
GO

-- Set totalEarnings/pendingSettlement for pharmacies whose only earning source is the order above
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-ph03';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-ph05';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-ph08';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-ph09';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-ph10';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha001';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha002';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha003';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha004';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha005';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha006';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha007';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha008';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha009';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha010';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha011';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha012';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha013';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha014';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha015';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha016';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha017';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha018';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha019';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha020';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha021';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha022';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha023';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha024';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha025';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha026';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha027';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha028';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha029';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha030';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha031';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha032';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha033';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha034';
UPDATE Pharmacies SET totalEarnings = 42.31, pendingSettlement = 8.46 WHERE PharmacyID = 'user-pha035';
GO

-- =====================================================
-- 63. ANALYTICS DOCTOR (da001-035) APPOINTMENTS -- link the two pre-existing
-- orphan Reviews (IDs 1051-1120, previously AppointmentId=NULL) to two brand-new
-- real Completed Online appointments per doctor (same patient/date as the review),
-- then set totalEarnings/pendingSettlement from those two appointments.
-- Idempotent: delete-then-insert by AppointmentID range.
-- =====================================================
DELETE FROM Appointments WHERE AppointmentID BETWEEN 3000 AND 3069;
GO

SET IDENTITY_INSERT Appointments ON;
INSERT INTO Appointments (AppointmentID, AppointmentTime, ConsultationType, Status, symptoms, notes, fee, endTime, doctorReminderSent, reminderSent, confirmedAt, PatientID, DoctorID) VALUES
(3000, '2024-03-08 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-03-08 09:30:00', 0, 1, '2024-03-07 09:00:00', N'user-pa021', N'user-da001'),
(3001, '2024-03-11 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-03-11 09:30:00', 0, 1, '2024-03-10 09:00:00', N'user-pa022', N'user-da001'),
(3002, '2024-03-14 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-03-14 09:30:00', 0, 1, '2024-03-13 09:00:00', N'user-pa023', N'user-da002'),
(3003, '2024-03-17 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-03-17 09:30:00', 0, 1, '2024-03-16 09:00:00', N'user-pa024', N'user-da002'),
(3004, '2024-03-20 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-03-20 09:30:00', 0, 1, '2024-03-19 09:00:00', N'user-pa025', N'user-da003'),
(3005, '2024-03-23 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-03-23 09:30:00', 0, 1, '2024-03-22 09:00:00', N'user-pa026', N'user-da003'),
(3006, '2024-03-26 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-03-26 09:30:00', 0, 1, '2024-03-25 09:00:00', N'user-pa027', N'user-da004'),
(3007, '2024-03-29 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-03-29 09:30:00', 0, 1, '2024-03-28 09:00:00', N'user-pa028', N'user-da004'),
(3008, '2024-04-01 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-04-01 09:30:00', 0, 1, '2024-03-31 09:00:00', N'user-pa029', N'user-da005'),
(3009, '2024-04-04 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-04-04 09:30:00', 0, 1, '2024-04-03 09:00:00', N'user-pa030', N'user-da005'),
(3010, '2024-04-07 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-04-07 09:30:00', 0, 1, '2024-04-06 09:00:00', N'user-pa031', N'user-da006'),
(3011, '2024-04-10 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-04-10 09:30:00', 0, 1, '2024-04-09 09:00:00', N'user-pa032', N'user-da006'),
(3012, '2024-04-13 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-04-13 09:30:00', 0, 1, '2024-04-12 09:00:00', N'user-pa033', N'user-da007'),
(3013, '2024-04-16 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-04-16 09:30:00', 0, 1, '2024-04-15 09:00:00', N'user-pa034', N'user-da007'),
(3014, '2024-04-19 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-04-19 09:30:00', 0, 1, '2024-04-18 09:00:00', N'user-pa035', N'user-da008'),
(3015, '2024-04-22 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-04-22 09:30:00', 0, 1, '2024-04-21 09:00:00', N'user-pa036', N'user-da008'),
(3016, '2024-04-25 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-04-25 09:30:00', 0, 1, '2024-04-24 09:00:00', N'user-pa037', N'user-da009'),
(3017, '2024-04-28 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-04-28 09:30:00', 0, 1, '2024-04-27 09:00:00', N'user-pa038', N'user-da009'),
(3018, '2024-05-01 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-05-01 09:30:00', 0, 1, '2024-04-30 09:00:00', N'user-pa039', N'user-da010'),
(3019, '2024-05-04 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-05-04 09:30:00', 0, 1, '2024-05-03 09:00:00', N'user-pa040', N'user-da010'),
(3020, '2024-05-07 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-05-07 09:30:00', 0, 1, '2024-05-06 09:00:00', N'user-pa041', N'user-da011'),
(3021, '2024-05-10 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-05-10 09:30:00', 0, 1, '2024-05-09 09:00:00', N'user-pa042', N'user-da011'),
(3022, '2024-05-13 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-05-13 09:30:00', 0, 1, '2024-05-12 09:00:00', N'user-pa043', N'user-da012'),
(3023, '2024-05-16 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-05-16 09:30:00', 0, 1, '2024-05-15 09:00:00', N'user-pa044', N'user-da012'),
(3024, '2024-05-19 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-05-19 09:30:00', 0, 1, '2024-05-18 09:00:00', N'user-pa045', N'user-da013'),
(3025, '2024-05-22 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-05-22 09:30:00', 0, 1, '2024-05-21 09:00:00', N'user-pa046', N'user-da013'),
(3026, '2024-05-25 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-05-25 09:30:00', 0, 1, '2024-05-24 09:00:00', N'user-pa047', N'user-da014'),
(3027, '2024-05-28 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-05-28 09:30:00', 0, 1, '2024-05-27 09:00:00', N'user-pa048', N'user-da014'),
(3028, '2024-05-31 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-05-31 09:30:00', 0, 1, '2024-05-30 09:00:00', N'user-pa049', N'user-da015'),
(3029, '2024-06-03 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-06-03 09:30:00', 0, 1, '2024-06-02 09:00:00', N'user-pa050', N'user-da015'),
(3030, '2024-06-06 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-06-06 09:30:00', 0, 1, '2024-06-05 09:00:00', N'user-pa051', N'user-da016'),
(3031, '2024-06-09 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-06-09 09:30:00', 0, 1, '2024-06-08 09:00:00', N'user-pa052', N'user-da016'),
(3032, '2024-06-12 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-06-12 09:30:00', 0, 1, '2024-06-11 09:00:00', N'user-pa053', N'user-da017'),
(3033, '2024-06-15 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-06-15 09:30:00', 0, 1, '2024-06-14 09:00:00', N'user-pa054', N'user-da017'),
(3034, '2024-06-18 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-06-18 09:30:00', 0, 1, '2024-06-17 09:00:00', N'user-pa055', N'user-da018'),
(3035, '2024-06-21 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-06-21 09:30:00', 0, 1, '2024-06-20 09:00:00', N'user-pa056', N'user-da018'),
(3036, '2024-06-24 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-06-24 09:30:00', 0, 1, '2024-06-23 09:00:00', N'user-pa057', N'user-da019'),
(3037, '2024-06-27 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-06-27 09:30:00', 0, 1, '2024-06-26 09:00:00', N'user-pa058', N'user-da019'),
(3038, '2024-06-30 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-06-30 09:30:00', 0, 1, '2024-06-29 09:00:00', N'user-pa059', N'user-da020'),
(3039, '2024-07-03 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-07-03 09:30:00', 0, 1, '2024-07-02 09:00:00', N'user-pa060', N'user-da020'),
(3040, '2024-07-06 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-07-06 09:30:00', 0, 1, '2024-07-05 09:00:00', N'user-pa061', N'user-da021'),
(3041, '2024-07-09 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-07-09 09:30:00', 0, 1, '2024-07-08 09:00:00', N'user-pa062', N'user-da021'),
(3042, '2024-07-12 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-07-12 09:30:00', 0, 1, '2024-07-11 09:00:00', N'user-pa063', N'user-da022'),
(3043, '2024-07-15 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-07-15 09:30:00', 0, 1, '2024-07-14 09:00:00', N'user-pa064', N'user-da022'),
(3044, '2024-07-18 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-07-18 09:30:00', 0, 1, '2024-07-17 09:00:00', N'user-pa065', N'user-da023'),
(3045, '2024-07-21 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-07-21 09:30:00', 0, 1, '2024-07-20 09:00:00', N'user-pa066', N'user-da023'),
(3046, '2024-07-24 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-07-24 09:30:00', 0, 1, '2024-07-23 09:00:00', N'user-pa067', N'user-da024'),
(3047, '2024-07-27 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-07-27 09:30:00', 0, 1, '2024-07-26 09:00:00', N'user-pa068', N'user-da024'),
(3048, '2024-07-30 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-07-30 09:30:00', 0, 1, '2024-07-29 09:00:00', N'user-pa069', N'user-da025'),
(3049, '2024-08-02 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-08-02 09:30:00', 0, 1, '2024-08-01 09:00:00', N'user-pa070', N'user-da025'),
(3050, '2024-08-05 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-08-05 09:30:00', 0, 1, '2024-08-04 09:00:00', N'user-pa071', N'user-da026'),
(3051, '2024-08-08 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-08-08 09:30:00', 0, 1, '2024-08-07 09:00:00', N'user-pa072', N'user-da026'),
(3052, '2024-08-11 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-08-11 09:30:00', 0, 1, '2024-08-10 09:00:00', N'user-pa073', N'user-da027'),
(3053, '2024-08-14 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-08-14 09:30:00', 0, 1, '2024-08-13 09:00:00', N'user-pa074', N'user-da027'),
(3054, '2024-08-17 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-08-17 09:30:00', 0, 1, '2024-08-16 09:00:00', N'user-pa075', N'user-da028'),
(3055, '2024-08-20 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-08-20 09:30:00', 0, 1, '2024-08-19 09:00:00', N'user-pa076', N'user-da028'),
(3056, '2024-08-23 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-08-23 09:30:00', 0, 1, '2024-08-22 09:00:00', N'user-pa077', N'user-da029'),
(3057, '2024-08-26 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-08-26 09:30:00', 0, 1, '2024-08-25 09:00:00', N'user-pa078', N'user-da029'),
(3058, '2024-08-29 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-08-29 09:30:00', 0, 1, '2024-08-28 09:00:00', N'user-pa079', N'user-da030'),
(3059, '2024-09-01 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-09-01 09:30:00', 0, 1, '2024-08-31 09:00:00', N'user-pa080', N'user-da030'),
(3060, '2024-09-04 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-09-04 09:30:00', 0, 1, '2024-09-03 09:00:00', N'user-pa081', N'user-da031'),
(3061, '2024-09-07 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-09-07 09:30:00', 0, 1, '2024-09-06 09:00:00', N'user-pa082', N'user-da031'),
(3062, '2024-09-10 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-09-10 09:30:00', 0, 1, '2024-09-09 09:00:00', N'user-pa083', N'user-da032'),
(3063, '2024-09-13 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-09-13 09:30:00', 0, 1, '2024-09-12 09:00:00', N'user-pa084', N'user-da032'),
(3064, '2024-09-16 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-09-16 09:30:00', 0, 1, '2024-09-15 09:00:00', N'user-pa085', N'user-da033'),
(3065, '2024-09-19 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-09-19 09:30:00', 0, 1, '2024-09-18 09:00:00', N'user-pa086', N'user-da033'),
(3066, '2024-09-22 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-09-22 09:30:00', 0, 1, '2024-09-21 09:00:00', N'user-pa087', N'user-da034'),
(3067, '2024-09-25 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-09-25 09:30:00', 0, 1, '2024-09-24 09:00:00', N'user-pa088', N'user-da034'),
(3068, '2024-09-28 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-09-28 09:30:00', 0, 1, '2024-09-27 09:00:00', N'user-pa089', N'user-da035'),
(3069, '2024-10-01 09:00:00', N'Online', N'Completed', N'Analytics seed consultation', N'Completed consultation (analytics doctor finance seed)', 50.00, '2024-10-01 09:30:00', 0, 1, '2024-09-30 09:00:00', N'user-pa090', N'user-da035');
SET IDENTITY_INSERT Appointments OFF;
GO

-- Link the pre-existing orphan reviews to their matching new appointment
UPDATE Reviews SET AppointmentId = 3000 WHERE ReviewID = 1051;
UPDATE Reviews SET AppointmentId = 3001 WHERE ReviewID = 1052;
UPDATE Reviews SET AppointmentId = 3002 WHERE ReviewID = 1053;
UPDATE Reviews SET AppointmentId = 3003 WHERE ReviewID = 1054;
UPDATE Reviews SET AppointmentId = 3004 WHERE ReviewID = 1055;
UPDATE Reviews SET AppointmentId = 3005 WHERE ReviewID = 1056;
UPDATE Reviews SET AppointmentId = 3006 WHERE ReviewID = 1057;
UPDATE Reviews SET AppointmentId = 3007 WHERE ReviewID = 1058;
UPDATE Reviews SET AppointmentId = 3008 WHERE ReviewID = 1059;
UPDATE Reviews SET AppointmentId = 3009 WHERE ReviewID = 1060;
UPDATE Reviews SET AppointmentId = 3010 WHERE ReviewID = 1061;
UPDATE Reviews SET AppointmentId = 3011 WHERE ReviewID = 1062;
UPDATE Reviews SET AppointmentId = 3012 WHERE ReviewID = 1063;
UPDATE Reviews SET AppointmentId = 3013 WHERE ReviewID = 1064;
UPDATE Reviews SET AppointmentId = 3014 WHERE ReviewID = 1065;
UPDATE Reviews SET AppointmentId = 3015 WHERE ReviewID = 1066;
UPDATE Reviews SET AppointmentId = 3016 WHERE ReviewID = 1067;
UPDATE Reviews SET AppointmentId = 3017 WHERE ReviewID = 1068;
UPDATE Reviews SET AppointmentId = 3018 WHERE ReviewID = 1069;
UPDATE Reviews SET AppointmentId = 3019 WHERE ReviewID = 1070;
UPDATE Reviews SET AppointmentId = 3020 WHERE ReviewID = 1071;
UPDATE Reviews SET AppointmentId = 3021 WHERE ReviewID = 1072;
UPDATE Reviews SET AppointmentId = 3022 WHERE ReviewID = 1073;
UPDATE Reviews SET AppointmentId = 3023 WHERE ReviewID = 1074;
UPDATE Reviews SET AppointmentId = 3024 WHERE ReviewID = 1075;
UPDATE Reviews SET AppointmentId = 3025 WHERE ReviewID = 1076;
UPDATE Reviews SET AppointmentId = 3026 WHERE ReviewID = 1077;
UPDATE Reviews SET AppointmentId = 3027 WHERE ReviewID = 1078;
UPDATE Reviews SET AppointmentId = 3028 WHERE ReviewID = 1079;
UPDATE Reviews SET AppointmentId = 3029 WHERE ReviewID = 1080;
UPDATE Reviews SET AppointmentId = 3030 WHERE ReviewID = 1081;
UPDATE Reviews SET AppointmentId = 3031 WHERE ReviewID = 1082;
UPDATE Reviews SET AppointmentId = 3032 WHERE ReviewID = 1083;
UPDATE Reviews SET AppointmentId = 3033 WHERE ReviewID = 1084;
UPDATE Reviews SET AppointmentId = 3034 WHERE ReviewID = 1085;
UPDATE Reviews SET AppointmentId = 3035 WHERE ReviewID = 1086;
UPDATE Reviews SET AppointmentId = 3036 WHERE ReviewID = 1087;
UPDATE Reviews SET AppointmentId = 3037 WHERE ReviewID = 1088;
UPDATE Reviews SET AppointmentId = 3038 WHERE ReviewID = 1089;
UPDATE Reviews SET AppointmentId = 3039 WHERE ReviewID = 1090;
UPDATE Reviews SET AppointmentId = 3040 WHERE ReviewID = 1091;
UPDATE Reviews SET AppointmentId = 3041 WHERE ReviewID = 1092;
UPDATE Reviews SET AppointmentId = 3042 WHERE ReviewID = 1093;
UPDATE Reviews SET AppointmentId = 3043 WHERE ReviewID = 1094;
UPDATE Reviews SET AppointmentId = 3044 WHERE ReviewID = 1095;
UPDATE Reviews SET AppointmentId = 3045 WHERE ReviewID = 1096;
UPDATE Reviews SET AppointmentId = 3046 WHERE ReviewID = 1097;
UPDATE Reviews SET AppointmentId = 3047 WHERE ReviewID = 1098;
UPDATE Reviews SET AppointmentId = 3048 WHERE ReviewID = 1099;
UPDATE Reviews SET AppointmentId = 3049 WHERE ReviewID = 1100;
UPDATE Reviews SET AppointmentId = 3050 WHERE ReviewID = 1101;
UPDATE Reviews SET AppointmentId = 3051 WHERE ReviewID = 1102;
UPDATE Reviews SET AppointmentId = 3052 WHERE ReviewID = 1103;
UPDATE Reviews SET AppointmentId = 3053 WHERE ReviewID = 1104;
UPDATE Reviews SET AppointmentId = 3054 WHERE ReviewID = 1105;
UPDATE Reviews SET AppointmentId = 3055 WHERE ReviewID = 1106;
UPDATE Reviews SET AppointmentId = 3056 WHERE ReviewID = 1107;
UPDATE Reviews SET AppointmentId = 3057 WHERE ReviewID = 1108;
UPDATE Reviews SET AppointmentId = 3058 WHERE ReviewID = 1109;
UPDATE Reviews SET AppointmentId = 3059 WHERE ReviewID = 1110;
UPDATE Reviews SET AppointmentId = 3060 WHERE ReviewID = 1111;
UPDATE Reviews SET AppointmentId = 3061 WHERE ReviewID = 1112;
UPDATE Reviews SET AppointmentId = 3062 WHERE ReviewID = 1113;
UPDATE Reviews SET AppointmentId = 3063 WHERE ReviewID = 1114;
UPDATE Reviews SET AppointmentId = 3064 WHERE ReviewID = 1115;
UPDATE Reviews SET AppointmentId = 3065 WHERE ReviewID = 1116;
UPDATE Reviews SET AppointmentId = 3066 WHERE ReviewID = 1117;
UPDATE Reviews SET AppointmentId = 3067 WHERE ReviewID = 1118;
UPDATE Reviews SET AppointmentId = 3068 WHERE ReviewID = 1119;
UPDATE Reviews SET AppointmentId = 3069 WHERE ReviewID = 1120;
GO

-- Set totalEarnings/pendingSettlement: 2 completed Online appts x $42.50 net = $85.00
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da001';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da002';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da003';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da004';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da005';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da006';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da007';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da008';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da009';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da010';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da011';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da012';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da013';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da014';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da015';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da016';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da017';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da018';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da019';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da020';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da021';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da022';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da023';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da024';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da025';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da026';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da027';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da028';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da029';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da030';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da031';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da032';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da033';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da034';
UPDATE Doctors SET totalEarnings = 85.00, pendingSettlement = 17.00 WHERE DoctorID = 'user-da035';
GO


-- 64. INVOICES BACKFILL FOR COMPLETED APPOINTMENTS WITHOUT INVOICE
-- Ly do: 307/313 appointment Completed (chu yeu tu block seed analytics/finance)
-- khong co Invoice tuong ung, khien Admin Financial Reports (Platform Fees / Doctor
-- Earnings) chi tinh tren 15 invoice cu, khong ty le voi Total Revenue thuc te.
-- commissionRate khop CommissionConfigs that (section 41): Online 0.15, HomeVisit 0.10.
-- HomeVisit chi ap rate tren consultationFee x1.5 (khong co travel/service rieng trong
-- Appointments.fee nen khong tach duoc travelTotal 100% ve bac si nhu FeeCalculatorServiceImpl that).
SET IDENTITY_INSERT Invoices ON;
INSERT INTO Invoices (InvoiceID, AppointmentId, PharmacyOrderId, PatientID, amount, issueDate, status, invoiceNumber, consultationFee, medicineFee, deliveryFee, discount, tax, dueDate, paidAt, notes, platformFee, doctorEarning, commissionRate) VALUES
(16, 11, NULL, 'user-p01', 50.00, '2024-05-24 16:00:00', 'Paid', 'INV-2024-A00011', 50.00, 0, 0, 0, 0, '2024-05-31', '2024-05-24 16:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(17, 1000, NULL, 'user-pa002', 50.00, '2024-01-05 09:00:00', 'Paid', 'INV-2024-A01000', 50.00, 0, 0, 0, 0, '2024-01-12', '2024-01-05 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(18, 1001, NULL, 'user-pa003', 50.00, '2024-01-09 10:00:00', 'Paid', 'INV-2024-A01001', 50.00, 0, 0, 0, 0, '2024-01-16', '2024-01-09 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(19, 1002, NULL, 'user-pa004', 50.00, '2024-01-12 13:00:00', 'Paid', 'INV-2024-A01002', 50.00, 0, 0, 0, 0, '2024-01-19', '2024-01-12 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(20, 1003, NULL, 'user-pa005', 50.00, '2024-01-16 14:00:00', 'Paid', 'INV-2024-A01003', 50.00, 0, 0, 0, 0, '2024-01-23', '2024-01-16 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(21, 1004, NULL, 'user-pa001', 50.00, '2024-01-19 15:00:00', 'Paid', 'INV-2024-A01004', 50.00, 0, 0, 0, 0, '2024-01-26', '2024-01-19 15:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(22, 1005, NULL, 'user-pa002', 50.00, '2024-01-23 16:00:00', 'Paid', 'INV-2024-A01005', 50.00, 0, 0, 0, 0, '2024-01-30', '2024-01-23 16:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(23, 1006, NULL, 'user-pa003', 50.00, '2024-01-26 11:00:00', 'Paid', 'INV-2024-A01006', 50.00, 0, 0, 0, 0, '2024-02-02', '2024-01-26 11:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(24, 1008, NULL, 'user-pa005', 50.00, '2024-01-30 08:00:00', 'Paid', 'INV-2024-A01008', 50.00, 0, 0, 0, 0, '2024-02-06', '2024-01-30 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(25, 1009, NULL, 'user-pa001', 50.00, '2024-01-02 09:00:00', 'Paid', 'INV-2024-A01009', 50.00, 0, 0, 0, 0, '2024-01-09', '2024-01-02 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(26, 1010, NULL, 'user-pa002', 50.00, '2024-01-07 10:00:00', 'Paid', 'INV-2024-A01010', 50.00, 0, 0, 0, 0, '2024-01-14', '2024-01-07 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(27, 1011, NULL, 'user-pa003', 50.00, '2024-01-14 13:00:00', 'Paid', 'INV-2024-A01011', 50.00, 0, 0, 0, 0, '2024-01-21', '2024-01-14 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(28, 1012, NULL, 'user-pa002', 50.00, '2024-02-21 14:00:00', 'Paid', 'INV-2024-A01012', 50.00, 0, 0, 0, 0, '2024-02-28', '2024-02-21 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(29, 1013, NULL, 'user-pa003', 50.00, '2024-02-24 15:00:00', 'Paid', 'INV-2024-A01013', 50.00, 0, 0, 0, 0, '2024-03-02', '2024-02-24 15:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(30, 1014, NULL, 'user-pa004', 50.00, '2024-02-03 16:00:00', 'Paid', 'INV-2024-A01014', 50.00, 0, 0, 0, 0, '2024-02-10', '2024-02-03 16:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(31, 1016, NULL, 'user-pa006', 50.00, '2024-02-09 17:00:00', 'Paid', 'INV-2024-A01016', 50.00, 0, 0, 0, 0, '2024-02-16', '2024-02-09 17:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(32, 1017, NULL, 'user-pa007', 50.00, '2024-02-12 08:00:00', 'Paid', 'INV-2024-A01017', 50.00, 0, 0, 0, 0, '2024-02-19', '2024-02-12 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(33, 1018, NULL, 'user-pa008', 50.00, '2024-02-16 09:00:00', 'Paid', 'INV-2024-A01018', 50.00, 0, 0, 0, 0, '2024-02-23', '2024-02-16 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(34, 1019, NULL, 'user-pa009', 50.00, '2024-02-19 10:00:00', 'Paid', 'INV-2024-A01019', 50.00, 0, 0, 0, 0, '2024-02-26', '2024-02-19 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(35, 1020, NULL, 'user-pa010', 50.00, '2024-02-23 13:00:00', 'Paid', 'INV-2024-A01020', 50.00, 0, 0, 0, 0, '2024-03-01', '2024-02-23 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(36, 1021, NULL, 'user-pa011', 50.00, '2024-02-26 14:00:00', 'Paid', 'INV-2024-A01021', 50.00, 0, 0, 0, 0, '2024-03-04', '2024-02-26 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(37, 1022, NULL, 'user-pa012', 50.00, '2024-02-28 15:00:00', 'Paid', 'INV-2024-A01022', 50.00, 0, 0, 0, 0, '2024-03-06', '2024-02-28 15:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(38, 1024, NULL, 'user-pa002', 50.00, '2024-02-02 11:00:00', 'Paid', 'INV-2024-A01024', 50.00, 0, 0, 0, 0, '2024-02-09', '2024-02-02 11:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(39, 1025, NULL, 'user-pa003', 50.00, '2024-02-07 17:00:00', 'Paid', 'INV-2024-A01025', 50.00, 0, 0, 0, 0, '2024-02-14', '2024-02-07 17:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(40, 1026, NULL, 'user-pa010', 50.00, '2024-03-14 08:00:00', 'Paid', 'INV-2024-A01026', 50.00, 0, 0, 0, 0, '2024-03-21', '2024-03-14 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(41, 1027, NULL, 'user-pa011', 50.00, '2024-03-21 09:00:00', 'Paid', 'INV-2024-A01027', 50.00, 0, 0, 0, 0, '2024-03-28', '2024-03-21 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(42, 1028, NULL, 'user-pa012', 50.00, '2024-03-24 10:00:00', 'Paid', 'INV-2024-A01028', 50.00, 0, 0, 0, 0, '2024-03-31', '2024-03-24 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(43, 1029, NULL, 'user-pa013', 50.00, '2024-03-03 13:00:00', 'Paid', 'INV-2024-A01029', 50.00, 0, 0, 0, 0, '2024-03-10', '2024-03-03 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(44, 1030, NULL, 'user-pa014', 50.00, '2024-03-05 14:00:00', 'Paid', 'INV-2024-A01030', 50.00, 0, 0, 0, 0, '2024-03-12', '2024-03-05 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(45, 1032, NULL, 'user-pa016', 50.00, '2024-03-12 16:00:00', 'Paid', 'INV-2024-A01032', 50.00, 0, 0, 0, 0, '2024-03-19', '2024-03-12 16:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(46, 1033, NULL, 'user-pa017', 50.00, '2024-03-16 11:00:00', 'Paid', 'INV-2024-A01033', 50.00, 0, 0, 0, 0, '2024-03-23', '2024-03-16 11:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(47, 1034, NULL, 'user-pa018', 50.00, '2024-03-19 17:00:00', 'Paid', 'INV-2024-A01034', 50.00, 0, 0, 0, 0, '2024-03-26', '2024-03-19 17:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(48, 1035, NULL, 'user-pa001', 50.00, '2024-03-23 08:00:00', 'Paid', 'INV-2024-A01035', 50.00, 0, 0, 0, 0, '2024-03-30', '2024-03-23 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(49, 1036, NULL, 'user-pa002', 50.00, '2024-03-26 09:00:00', 'Paid', 'INV-2024-A01036', 50.00, 0, 0, 0, 0, '2024-04-02', '2024-03-26 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(50, 1037, NULL, 'user-pa003', 50.00, '2024-03-28 10:00:00', 'Paid', 'INV-2024-A01037', 50.00, 0, 0, 0, 0, '2024-04-04', '2024-03-28 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(51, 1038, NULL, 'user-pa004', 50.00, '2024-03-30 13:00:00', 'Paid', 'INV-2024-A01038', 50.00, 0, 0, 0, 0, '2024-04-06', '2024-03-30 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(52, 1040, NULL, 'user-pa016', 50.00, '2024-04-07 15:00:00', 'Paid', 'INV-2024-A01040', 50.00, 0, 0, 0, 0, '2024-04-14', '2024-04-07 15:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(53, 1041, NULL, 'user-pa017', 50.00, '2024-04-14 16:00:00', 'Paid', 'INV-2024-A01041', 50.00, 0, 0, 0, 0, '2024-04-21', '2024-04-14 16:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(54, 1042, NULL, 'user-pa018', 50.00, '2024-04-21 11:00:00', 'Paid', 'INV-2024-A01042', 50.00, 0, 0, 0, 0, '2024-04-28', '2024-04-21 11:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(55, 1043, NULL, 'user-pa019', 50.00, '2024-04-24 17:00:00', 'Paid', 'INV-2024-A01043', 50.00, 0, 0, 0, 0, '2024-05-01', '2024-04-24 17:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(56, 1044, NULL, 'user-pa020', 50.00, '2024-04-03 08:00:00', 'Paid', 'INV-2024-A01044', 50.00, 0, 0, 0, 0, '2024-04-10', '2024-04-03 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(57, 1045, NULL, 'user-pa021', 50.00, '2024-04-05 09:00:00', 'Paid', 'INV-2024-A01045', 50.00, 0, 0, 0, 0, '2024-04-12', '2024-04-05 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(58, 1046, NULL, 'user-pa022', 50.00, '2024-04-09 10:00:00', 'Paid', 'INV-2024-A01046', 50.00, 0, 0, 0, 0, '2024-04-16', '2024-04-09 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(59, 1048, NULL, 'user-pa024', 50.00, '2024-04-16 14:00:00', 'Paid', 'INV-2024-A01048', 50.00, 0, 0, 0, 0, '2024-04-23', '2024-04-16 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(60, 1049, NULL, 'user-pa025', 50.00, '2024-04-19 15:00:00', 'Paid', 'INV-2024-A01049', 50.00, 0, 0, 0, 0, '2024-04-26', '2024-04-19 15:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(61, 1050, NULL, 'user-pa026', 50.00, '2024-04-23 16:00:00', 'Paid', 'INV-2024-A01050', 50.00, 0, 0, 0, 0, '2024-04-30', '2024-04-23 16:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(62, 1051, NULL, 'user-pa001', 50.00, '2024-04-26 11:00:00', 'Paid', 'INV-2024-A01051', 50.00, 0, 0, 0, 0, '2024-05-03', '2024-04-26 11:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(63, 1052, NULL, 'user-pa002', 50.00, '2024-04-28 17:00:00', 'Paid', 'INV-2024-A01052', 50.00, 0, 0, 0, 0, '2024-05-05', '2024-04-28 17:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(64, 1053, NULL, 'user-pa003', 50.00, '2024-04-30 08:00:00', 'Paid', 'INV-2024-A01053', 50.00, 0, 0, 0, 0, '2024-05-07', '2024-04-30 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(65, 1054, NULL, 'user-pa021', 50.00, '2024-05-02 09:00:00', 'Paid', 'INV-2024-A01054', 50.00, 0, 0, 0, 0, '2024-05-09', '2024-05-02 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(66, 1056, NULL, 'user-pa023', 50.00, '2024-05-14 13:00:00', 'Paid', 'INV-2024-A01056', 50.00, 0, 0, 0, 0, '2024-05-21', '2024-05-14 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(67, 1057, NULL, 'user-pa024', 50.00, '2024-05-21 14:00:00', 'Paid', 'INV-2024-A01057', 50.00, 0, 0, 0, 0, '2024-05-28', '2024-05-21 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(68, 1058, NULL, 'user-pa025', 50.00, '2024-05-24 15:00:00', 'Paid', 'INV-2024-A01058', 50.00, 0, 0, 0, 0, '2024-05-31', '2024-05-24 15:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(69, 1059, NULL, 'user-pa026', 50.00, '2024-05-03 16:00:00', 'Paid', 'INV-2024-A01059', 50.00, 0, 0, 0, 0, '2024-05-10', '2024-05-03 16:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(70, 1060, NULL, 'user-pa027', 50.00, '2024-05-05 11:00:00', 'Paid', 'INV-2024-A01060', 50.00, 0, 0, 0, 0, '2024-05-12', '2024-05-05 11:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(71, 1061, NULL, 'user-pa028', 50.00, '2024-05-09 17:00:00', 'Paid', 'INV-2024-A01061', 50.00, 0, 0, 0, 0, '2024-05-16', '2024-05-09 17:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(72, 1062, NULL, 'user-pa029', 50.00, '2024-05-12 08:00:00', 'Paid', 'INV-2024-A01062', 50.00, 0, 0, 0, 0, '2024-05-19', '2024-05-12 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(73, 1064, NULL, 'user-pa031', 50.00, '2024-05-19 10:00:00', 'Paid', 'INV-2024-A01064', 50.00, 0, 0, 0, 0, '2024-05-26', '2024-05-19 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(74, 1065, NULL, 'user-pa032', 50.00, '2024-05-23 13:00:00', 'Paid', 'INV-2024-A01065', 50.00, 0, 0, 0, 0, '2024-05-30', '2024-05-23 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(75, 1066, NULL, 'user-pa033', 50.00, '2024-05-26 14:00:00', 'Paid', 'INV-2024-A01066', 50.00, 0, 0, 0, 0, '2024-06-02', '2024-05-26 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(76, 1067, NULL, 'user-pa034', 50.00, '2024-05-28 15:00:00', 'Paid', 'INV-2024-A01067', 50.00, 0, 0, 0, 0, '2024-06-04', '2024-05-28 15:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(77, 1068, NULL, 'user-pa035', 50.00, '2024-05-30 16:00:00', 'Paid', 'INV-2024-A01068', 50.00, 0, 0, 0, 0, '2024-06-06', '2024-05-30 16:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(78, 1069, NULL, 'user-pa001', 50.00, '2024-05-02 11:00:00', 'Paid', 'INV-2024-A01069', 50.00, 0, 0, 0, 0, '2024-05-09', '2024-05-02 11:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(79, 1070, NULL, 'user-pa030', 50.00, '2024-06-07 17:00:00', 'Paid', 'INV-2024-A01070', 50.00, 0, 0, 0, 0, '2024-06-14', '2024-06-07 17:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(80, 1072, NULL, 'user-pa032', 50.00, '2024-06-21 09:00:00', 'Paid', 'INV-2024-A01072', 50.00, 0, 0, 0, 0, '2024-06-28', '2024-06-21 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(81, 1073, NULL, 'user-pa033', 50.00, '2024-06-24 10:00:00', 'Paid', 'INV-2024-A01073', 50.00, 0, 0, 0, 0, '2024-07-01', '2024-06-24 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(82, 1074, NULL, 'user-pa034', 50.00, '2024-06-03 13:00:00', 'Paid', 'INV-2024-A01074', 50.00, 0, 0, 0, 0, '2024-06-10', '2024-06-03 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(83, 1075, NULL, 'user-pa035', 50.00, '2024-06-05 14:00:00', 'Paid', 'INV-2024-A01075', 50.00, 0, 0, 0, 0, '2024-06-12', '2024-06-05 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(84, 1076, NULL, 'user-pa036', 50.00, '2024-06-09 15:00:00', 'Paid', 'INV-2024-A01076', 50.00, 0, 0, 0, 0, '2024-06-16', '2024-06-09 15:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(85, 1077, NULL, 'user-pa037', 50.00, '2024-06-12 16:00:00', 'Paid', 'INV-2024-A01077', 50.00, 0, 0, 0, 0, '2024-06-19', '2024-06-12 16:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(86, 1078, NULL, 'user-pa038', 50.00, '2024-06-16 11:00:00', 'Paid', 'INV-2024-A01078', 50.00, 0, 0, 0, 0, '2024-06-23', '2024-06-16 11:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(87, 1080, NULL, 'user-pa040', 50.00, '2024-06-23 08:00:00', 'Paid', 'INV-2024-A01080', 50.00, 0, 0, 0, 0, '2024-06-30', '2024-06-23 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(88, 1081, NULL, 'user-pa041', 50.00, '2024-06-26 09:00:00', 'Paid', 'INV-2024-A01081', 50.00, 0, 0, 0, 0, '2024-07-03', '2024-06-26 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(89, 1082, NULL, 'user-pa042', 50.00, '2024-06-28 10:00:00', 'Paid', 'INV-2024-A01082', 50.00, 0, 0, 0, 0, '2024-07-05', '2024-06-28 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(90, 1083, NULL, 'user-pa001', 50.00, '2024-06-30 13:00:00', 'Paid', 'INV-2024-A01083', 50.00, 0, 0, 0, 0, '2024-07-07', '2024-06-30 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(91, 1084, NULL, 'user-pa036', 50.00, '2024-07-02 14:00:00', 'Paid', 'INV-2024-A01084', 50.00, 0, 0, 0, 0, '2024-07-09', '2024-07-02 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(92, 1085, NULL, 'user-pa037', 50.00, '2024-07-07 15:00:00', 'Paid', 'INV-2024-A01085', 50.00, 0, 0, 0, 0, '2024-07-14', '2024-07-07 15:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(93, 1086, NULL, 'user-pa038', 50.00, '2024-07-14 16:00:00', 'Paid', 'INV-2024-A01086', 50.00, 0, 0, 0, 0, '2024-07-21', '2024-07-14 16:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(94, 1088, NULL, 'user-pa040', 50.00, '2024-07-24 17:00:00', 'Paid', 'INV-2024-A01088', 50.00, 0, 0, 0, 0, '2024-07-31', '2024-07-24 17:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(95, 1089, NULL, 'user-pa041', 50.00, '2024-07-03 08:00:00', 'Paid', 'INV-2024-A01089', 50.00, 0, 0, 0, 0, '2024-07-10', '2024-07-03 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(96, 1090, NULL, 'user-pa042', 50.00, '2024-07-05 09:00:00', 'Paid', 'INV-2024-A01090', 50.00, 0, 0, 0, 0, '2024-07-12', '2024-07-05 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(97, 1091, NULL, 'user-pa043', 50.00, '2024-07-09 10:00:00', 'Paid', 'INV-2024-A01091', 50.00, 0, 0, 0, 0, '2024-07-16', '2024-07-09 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(98, 1092, NULL, 'user-pa044', 50.00, '2024-07-12 13:00:00', 'Paid', 'INV-2024-A01092', 50.00, 0, 0, 0, 0, '2024-07-19', '2024-07-12 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(99, 1093, NULL, 'user-pa045', 50.00, '2024-07-16 14:00:00', 'Paid', 'INV-2024-A01093', 50.00, 0, 0, 0, 0, '2024-07-23', '2024-07-16 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(100, 1094, NULL, 'user-pa046', 50.00, '2024-07-19 15:00:00', 'Paid', 'INV-2024-A01094', 50.00, 0, 0, 0, 0, '2024-07-26', '2024-07-19 15:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(101, 1096, NULL, 'user-pa048', 50.00, '2024-07-26 11:00:00', 'Paid', 'INV-2024-A01096', 50.00, 0, 0, 0, 0, '2024-08-02', '2024-07-26 11:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(102, 1097, NULL, 'user-pa049', 50.00, '2024-07-28 17:00:00', 'Paid', 'INV-2024-A01097', 50.00, 0, 0, 0, 0, '2024-08-04', '2024-07-28 17:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(103, 1098, NULL, 'user-pa050', 50.00, '2024-07-30 08:00:00', 'Paid', 'INV-2024-A01098', 50.00, 0, 0, 0, 0, '2024-08-06', '2024-07-30 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(104, 1099, NULL, 'user-pa041', 50.00, '2024-08-02 09:00:00', 'Paid', 'INV-2024-A01099', 50.00, 0, 0, 0, 0, '2024-08-09', '2024-08-02 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(105, 1100, NULL, 'user-pa042', 50.00, '2024-08-07 10:00:00', 'Paid', 'INV-2024-A01100', 50.00, 0, 0, 0, 0, '2024-08-14', '2024-08-07 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(106, 1101, NULL, 'user-pa043', 50.00, '2024-08-14 13:00:00', 'Paid', 'INV-2024-A01101', 50.00, 0, 0, 0, 0, '2024-08-21', '2024-08-14 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(107, 1102, NULL, 'user-pa044', 50.00, '2024-08-21 14:00:00', 'Paid', 'INV-2024-A01102', 50.00, 0, 0, 0, 0, '2024-08-28', '2024-08-21 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(108, 1104, NULL, 'user-pa046', 50.00, '2024-08-03 16:00:00', 'Paid', 'INV-2024-A01104', 50.00, 0, 0, 0, 0, '2024-08-10', '2024-08-03 16:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(109, 1105, NULL, 'user-pa047', 50.00, '2024-08-05 11:00:00', 'Paid', 'INV-2024-A01105', 50.00, 0, 0, 0, 0, '2024-08-12', '2024-08-05 11:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(110, 1106, NULL, 'user-pa048', 50.00, '2024-08-09 17:00:00', 'Paid', 'INV-2024-A01106', 50.00, 0, 0, 0, 0, '2024-08-16', '2024-08-09 17:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(111, 1107, NULL, 'user-pa049', 50.00, '2024-08-12 08:00:00', 'Paid', 'INV-2024-A01107', 50.00, 0, 0, 0, 0, '2024-08-19', '2024-08-12 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(112, 1108, NULL, 'user-pa050', 50.00, '2024-08-16 09:00:00', 'Paid', 'INV-2024-A01108', 50.00, 0, 0, 0, 0, '2024-08-23', '2024-08-16 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(113, 1109, NULL, 'user-pa051', 50.00, '2024-08-19 10:00:00', 'Paid', 'INV-2024-A01109', 50.00, 0, 0, 0, 0, '2024-08-26', '2024-08-19 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(114, 1110, NULL, 'user-pa052', 50.00, '2024-08-23 13:00:00', 'Paid', 'INV-2024-A01110', 50.00, 0, 0, 0, 0, '2024-08-30', '2024-08-23 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(115, 1112, NULL, 'user-pa054', 50.00, '2024-08-28 15:00:00', 'Paid', 'INV-2024-A01112', 50.00, 0, 0, 0, 0, '2024-09-04', '2024-08-28 15:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(116, 1113, NULL, 'user-pa055', 50.00, '2024-08-30 16:00:00', 'Paid', 'INV-2024-A01113', 50.00, 0, 0, 0, 0, '2024-09-06', '2024-08-30 16:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(117, 1114, NULL, 'user-pa056', 50.00, '2024-08-02 11:00:00', 'Paid', 'INV-2024-A01114', 50.00, 0, 0, 0, 0, '2024-08-09', '2024-08-02 11:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(118, 1115, NULL, 'user-pa057', 50.00, '2024-08-07 17:00:00', 'Paid', 'INV-2024-A01115', 50.00, 0, 0, 0, 0, '2024-08-14', '2024-08-07 17:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(119, 1116, NULL, 'user-pa050', 50.00, '2024-09-14 08:00:00', 'Paid', 'INV-2024-A01116', 50.00, 0, 0, 0, 0, '2024-09-21', '2024-09-14 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(120, 1117, NULL, 'user-pa051', 50.00, '2024-09-21 09:00:00', 'Paid', 'INV-2024-A01117', 50.00, 0, 0, 0, 0, '2024-09-28', '2024-09-21 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(121, 1118, NULL, 'user-pa052', 50.00, '2024-09-24 10:00:00', 'Paid', 'INV-2024-A01118', 50.00, 0, 0, 0, 0, '2024-10-01', '2024-09-24 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(122, 1120, NULL, 'user-pa054', 50.00, '2024-09-05 14:00:00', 'Paid', 'INV-2024-A01120', 50.00, 0, 0, 0, 0, '2024-09-12', '2024-09-05 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(123, 1121, NULL, 'user-pa055', 50.00, '2024-09-09 15:00:00', 'Paid', 'INV-2024-A01121', 50.00, 0, 0, 0, 0, '2024-09-16', '2024-09-09 15:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(124, 1122, NULL, 'user-pa056', 50.00, '2024-09-12 16:00:00', 'Paid', 'INV-2024-A01122', 50.00, 0, 0, 0, 0, '2024-09-19', '2024-09-12 16:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(125, 1123, NULL, 'user-pa057', 50.00, '2024-09-16 11:00:00', 'Paid', 'INV-2024-A01123', 50.00, 0, 0, 0, 0, '2024-09-23', '2024-09-16 11:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(126, 1124, NULL, 'user-pa058', 50.00, '2024-09-19 17:00:00', 'Paid', 'INV-2024-A01124', 50.00, 0, 0, 0, 0, '2024-09-26', '2024-09-19 17:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(127, 1125, NULL, 'user-pa059', 50.00, '2024-09-23 08:00:00', 'Paid', 'INV-2024-A01125', 50.00, 0, 0, 0, 0, '2024-09-30', '2024-09-23 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(128, 1126, NULL, 'user-pa060', 50.00, '2024-09-26 09:00:00', 'Paid', 'INV-2024-A01126', 50.00, 0, 0, 0, 0, '2024-10-03', '2024-09-26 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(129, 1128, NULL, 'user-pa062', 50.00, '2024-09-30 13:00:00', 'Paid', 'INV-2024-A01128', 50.00, 0, 0, 0, 0, '2024-10-07', '2024-09-30 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(130, 1129, NULL, 'user-pa063', 50.00, '2024-09-02 14:00:00', 'Paid', 'INV-2024-A01129', 50.00, 0, 0, 0, 0, '2024-09-09', '2024-09-02 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(131, 1130, NULL, 'user-pa055', 50.00, '2024-10-07 15:00:00', 'Paid', 'INV-2024-A01130', 50.00, 0, 0, 0, 0, '2024-10-14', '2024-10-07 15:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(132, 1131, NULL, 'user-pa056', 50.00, '2024-10-14 16:00:00', 'Paid', 'INV-2024-A01131', 50.00, 0, 0, 0, 0, '2024-10-21', '2024-10-14 16:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(133, 1132, NULL, 'user-pa057', 50.00, '2024-10-21 11:00:00', 'Paid', 'INV-2024-A01132', 50.00, 0, 0, 0, 0, '2024-10-28', '2024-10-21 11:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(134, 1133, NULL, 'user-pa058', 50.00, '2024-10-24 17:00:00', 'Paid', 'INV-2024-A01133', 50.00, 0, 0, 0, 0, '2024-10-31', '2024-10-24 17:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(135, 1134, NULL, 'user-pa059', 50.00, '2024-10-03 08:00:00', 'Paid', 'INV-2024-A01134', 50.00, 0, 0, 0, 0, '2024-10-10', '2024-10-03 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(136, 1136, NULL, 'user-pa061', 50.00, '2024-10-09 10:00:00', 'Paid', 'INV-2024-A01136', 50.00, 0, 0, 0, 0, '2024-10-16', '2024-10-09 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(137, 1137, NULL, 'user-pa062', 50.00, '2024-10-12 13:00:00', 'Paid', 'INV-2024-A01137', 50.00, 0, 0, 0, 0, '2024-10-19', '2024-10-12 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(138, 1138, NULL, 'user-pa063', 50.00, '2024-10-16 14:00:00', 'Paid', 'INV-2024-A01138', 50.00, 0, 0, 0, 0, '2024-10-23', '2024-10-16 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(139, 1139, NULL, 'user-pa064', 50.00, '2024-10-19 15:00:00', 'Paid', 'INV-2024-A01139', 50.00, 0, 0, 0, 0, '2024-10-26', '2024-10-19 15:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(140, 1140, NULL, 'user-pa065', 50.00, '2024-10-23 16:00:00', 'Paid', 'INV-2024-A01140', 50.00, 0, 0, 0, 0, '2024-10-30', '2024-10-23 16:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(141, 1141, NULL, 'user-pa066', 50.00, '2024-10-26 11:00:00', 'Paid', 'INV-2024-A01141', 50.00, 0, 0, 0, 0, '2024-11-02', '2024-10-26 11:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(142, 1142, NULL, 'user-pa067', 50.00, '2024-10-28 17:00:00', 'Paid', 'INV-2024-A01142', 50.00, 0, 0, 0, 0, '2024-11-04', '2024-10-28 17:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(143, 1144, NULL, 'user-pa069', 50.00, '2024-10-02 09:00:00', 'Paid', 'INV-2024-A01144', 50.00, 0, 0, 0, 0, '2024-10-09', '2024-10-02 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(144, 1145, NULL, 'user-pa070', 50.00, '2024-10-07 10:00:00', 'Paid', 'INV-2024-A01145', 50.00, 0, 0, 0, 0, '2024-10-14', '2024-10-07 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(145, 1146, NULL, 'user-pa064', 50.00, '2024-11-14 13:00:00', 'Paid', 'INV-2024-A01146', 50.00, 0, 0, 0, 0, '2024-11-21', '2024-11-14 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(146, 1147, NULL, 'user-pa065', 50.00, '2024-11-21 14:00:00', 'Paid', 'INV-2024-A01147', 50.00, 0, 0, 0, 0, '2024-11-28', '2024-11-21 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(147, 1148, NULL, 'user-pa066', 50.00, '2024-11-24 15:00:00', 'Paid', 'INV-2024-A01148', 50.00, 0, 0, 0, 0, '2024-12-01', '2024-11-24 15:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(148, 1149, NULL, 'user-pa067', 50.00, '2024-11-03 16:00:00', 'Paid', 'INV-2024-A01149', 50.00, 0, 0, 0, 0, '2024-11-10', '2024-11-03 16:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(149, 1150, NULL, 'user-pa068', 50.00, '2024-11-05 11:00:00', 'Paid', 'INV-2024-A01150', 50.00, 0, 0, 0, 0, '2024-11-12', '2024-11-05 11:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(150, 1152, NULL, 'user-pa070', 50.00, '2024-11-12 08:00:00', 'Paid', 'INV-2024-A01152', 50.00, 0, 0, 0, 0, '2024-11-19', '2024-11-12 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(151, 1153, NULL, 'user-pa071', 50.00, '2024-11-16 09:00:00', 'Paid', 'INV-2024-A01153', 50.00, 0, 0, 0, 0, '2024-11-23', '2024-11-16 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(152, 1154, NULL, 'user-pa072', 50.00, '2024-11-19 10:00:00', 'Paid', 'INV-2024-A01154', 50.00, 0, 0, 0, 0, '2024-11-26', '2024-11-19 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(153, 1155, NULL, 'user-pa073', 50.00, '2024-11-23 13:00:00', 'Paid', 'INV-2024-A01155', 50.00, 0, 0, 0, 0, '2024-11-30', '2024-11-23 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(154, 1156, NULL, 'user-pa074', 50.00, '2024-11-26 14:00:00', 'Paid', 'INV-2024-A01156', 50.00, 0, 0, 0, 0, '2024-12-03', '2024-11-26 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(155, 1157, NULL, 'user-pa075', 50.00, '2024-11-28 15:00:00', 'Paid', 'INV-2024-A01157', 50.00, 0, 0, 0, 0, '2024-12-05', '2024-11-28 15:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(156, 1158, NULL, 'user-pa076', 50.00, '2024-11-30 16:00:00', 'Paid', 'INV-2024-A01158', 50.00, 0, 0, 0, 0, '2024-12-07', '2024-11-30 16:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(157, 1160, NULL, 'user-pa072', 50.00, '2024-12-07 17:00:00', 'Paid', 'INV-2024-A01160', 50.00, 0, 0, 0, 0, '2024-12-14', '2024-12-07 17:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(158, 1161, NULL, 'user-pa073', 50.00, '2024-12-14 08:00:00', 'Paid', 'INV-2024-A01161', 50.00, 0, 0, 0, 0, '2024-12-21', '2024-12-14 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(159, 1162, NULL, 'user-pa074', 50.00, '2024-12-21 09:00:00', 'Paid', 'INV-2024-A01162', 50.00, 0, 0, 0, 0, '2024-12-28', '2024-12-21 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(160, 1163, NULL, 'user-pa075', 50.00, '2024-12-24 10:00:00', 'Paid', 'INV-2024-A01163', 50.00, 0, 0, 0, 0, '2024-12-31', '2024-12-24 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(161, 1164, NULL, 'user-pa076', 50.00, '2024-12-03 13:00:00', 'Paid', 'INV-2024-A01164', 50.00, 0, 0, 0, 0, '2024-12-10', '2024-12-03 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(162, 1165, NULL, 'user-pa077', 50.00, '2024-12-05 14:00:00', 'Paid', 'INV-2024-A01165', 50.00, 0, 0, 0, 0, '2024-12-12', '2024-12-05 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(163, 1166, NULL, 'user-pa078', 50.00, '2024-12-09 15:00:00', 'Paid', 'INV-2024-A01166', 50.00, 0, 0, 0, 0, '2024-12-16', '2024-12-09 15:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(164, 1168, NULL, 'user-pa080', 50.00, '2024-12-16 11:00:00', 'Paid', 'INV-2024-A01168', 50.00, 0, 0, 0, 0, '2024-12-23', '2024-12-16 11:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(165, 1169, NULL, 'user-pa081', 50.00, '2024-12-19 17:00:00', 'Paid', 'INV-2024-A01169', 50.00, 0, 0, 0, 0, '2024-12-26', '2024-12-19 17:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(166, 1170, NULL, 'user-pa082', 50.00, '2024-12-23 08:00:00', 'Paid', 'INV-2024-A01170', 50.00, 0, 0, 0, 0, '2024-12-30', '2024-12-23 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(167, 1171, NULL, 'user-pa083', 50.00, '2024-12-26 09:00:00', 'Paid', 'INV-2024-A01171', 50.00, 0, 0, 0, 0, '2025-01-02', '2024-12-26 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(168, 1172, NULL, 'user-pa084', 50.00, '2024-12-28 10:00:00', 'Paid', 'INV-2024-A01172', 50.00, 0, 0, 0, 0, '2025-01-04', '2024-12-28 10:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(169, 1173, NULL, 'user-pa085', 50.00, '2024-12-30 13:00:00', 'Paid', 'INV-2024-A01173', 50.00, 0, 0, 0, 0, '2025-01-06', '2024-12-30 13:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(170, 1200, NULL, 'user-p01', 50.00, '2026-01-05 07:00:00', 'Paid', 'INV-2026-A01200', 50.00, 0, 0, 0, 0, '2026-01-12', '2026-01-05 07:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(171, 1201, NULL, 'user-p04', 50.00, '2026-04-01 14:30:00', 'Paid', 'INV-2026-A01201', 50.00, 0, 0, 0, 0, '2026-04-08', '2026-04-01 14:35:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(172, 1204, NULL, 'user-p02', 50.00, '2026-01-13 08:30:00', 'Paid', 'INV-2026-A01204', 50.00, 0, 0, 0, 0, '2026-01-20', '2026-01-13 08:35:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(173, 1205, NULL, 'user-p05', 50.00, '2026-04-09 08:00:00', 'Paid', 'INV-2026-A01205', 50.00, 0, 0, 0, 0, '2026-04-16', '2026-04-09 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(174, 1208, NULL, 'user-p03', 50.00, '2026-01-21 08:00:00', 'Paid', 'INV-2026-A01208', 50.00, 0, 0, 0, 0, '2026-01-28', '2026-01-21 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(175, 1209, NULL, 'user-p06', 50.00, '2026-04-17 08:00:00', 'Paid', 'INV-2026-A01209', 50.00, 0, 0, 0, 0, '2026-04-24', '2026-04-17 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(176, 1212, NULL, 'user-p04', 50.00, '2026-01-22 08:00:00', 'Paid', 'INV-2026-A01212', 50.00, 0, 0, 0, 0, '2026-01-29', '2026-01-22 08:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(177, 1213, NULL, 'user-p07', 50.00, '2026-04-23 14:00:00', 'Paid', 'INV-2026-A01213', 50.00, 0, 0, 0, 0, '2026-04-30', '2026-04-23 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(178, 1216, NULL, 'user-p05', 50.00, '2026-01-30 08:30:00', 'Paid', 'INV-2026-A01216', 50.00, 0, 0, 0, 0, '2026-02-06', '2026-01-30 08:35:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(179, 1217, NULL, 'user-p08', 50.00, '2026-05-01 09:00:00', 'Paid', 'INV-2026-A01217', 50.00, 0, 0, 0, 0, '2026-05-08', '2026-05-01 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(180, 1220, NULL, 'user-p06', 50.00, '2026-02-07 09:00:00', 'Paid', 'INV-2026-A01220', 50.00, 0, 0, 0, 0, '2026-02-14', '2026-02-07 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(181, 1221, NULL, 'user-p09', 50.00, '2026-05-06 13:30:00', 'Paid', 'INV-2026-A01221', 50.00, 0, 0, 0, 0, '2026-05-13', '2026-05-06 13:35:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(182, 1224, NULL, 'user-p07', 50.00, '2026-02-16 14:00:00', 'Paid', 'INV-2026-A01224', 50.00, 0, 0, 0, 0, '2026-02-23', '2026-02-16 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(183, 1225, NULL, 'user-p10', 50.00, '2026-05-18 14:30:00', 'Paid', 'INV-2026-A01225', 50.00, 0, 0, 0, 0, '2026-05-25', '2026-05-18 14:35:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(184, 1228, NULL, 'user-p08', 50.00, '2026-02-24 08:30:00', 'Paid', 'INV-2026-A01228', 50.00, 0, 0, 0, 0, '2026-03-03', '2026-02-24 08:35:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(185, 1229, NULL, 'user-p01', 50.00, '2026-05-22 14:30:00', 'Paid', 'INV-2026-A01229', 50.00, 0, 0, 0, 0, '2026-05-29', '2026-05-22 14:35:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(186, 1232, NULL, 'user-p09', 50.00, '2026-03-04 14:30:00', 'Paid', 'INV-2026-A01232', 50.00, 0, 0, 0, 0, '2026-03-11', '2026-03-04 14:35:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(187, 1233, NULL, 'user-p02', 50.00, '2026-05-27 13:30:00', 'Paid', 'INV-2026-A01233', 50.00, 0, 0, 0, 0, '2026-06-03', '2026-05-27 13:35:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(188, 1236, NULL, 'user-p10', 50.00, '2026-03-09 07:00:00', 'Paid', 'INV-2026-A01236', 50.00, 0, 0, 0, 0, '2026-03-16', '2026-03-09 07:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(189, 1237, NULL, 'user-p03', 50.00, '2026-06-03 14:00:00', 'Paid', 'INV-2026-A01237', 50.00, 0, 0, 0, 0, '2026-06-10', '2026-06-03 14:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(190, 2000, NULL, 'user-pa001', 75.00, '2024-01-03 09:00:00', 'Paid', 'INV-2024-A02000', 75.00, 0, 0, 0, 0, '2024-01-10', '2024-01-03 09:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(191, 2001, NULL, 'user-pa002', 75.00, '2024-01-07 10:00:00', 'Paid', 'INV-2024-A02001', 75.00, 0, 0, 0, 0, '2024-01-14', '2024-01-07 10:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(192, 2002, NULL, 'user-pa003', 75.00, '2024-01-11 11:00:00', 'Paid', 'INV-2024-A02002', 75.00, 0, 0, 0, 0, '2024-01-18', '2024-01-11 11:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(193, 2003, NULL, 'user-pa004', 75.00, '2024-01-15 13:00:00', 'Paid', 'INV-2024-A02003', 75.00, 0, 0, 0, 0, '2024-01-22', '2024-01-15 13:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(194, 2004, NULL, 'user-pa005', 75.00, '2024-01-19 14:00:00', 'Paid', 'INV-2024-A02004', 75.00, 0, 0, 0, 0, '2024-01-26', '2024-01-19 14:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(195, 2005, NULL, 'user-pa006', 75.00, '2024-01-23 16:00:00', 'Paid', 'INV-2024-A02005', 75.00, 0, 0, 0, 0, '2024-01-30', '2024-01-23 16:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(196, 2006, NULL, 'user-pa007', 75.00, '2024-02-03 09:00:00', 'Paid', 'INV-2024-A02006', 75.00, 0, 0, 0, 0, '2024-02-10', '2024-02-03 09:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(197, 2008, NULL, 'user-pa009', 75.00, '2024-02-11 11:00:00', 'Paid', 'INV-2024-A02008', 75.00, 0, 0, 0, 0, '2024-02-18', '2024-02-11 11:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(198, 2009, NULL, 'user-pa010', 75.00, '2024-02-15 13:00:00', 'Paid', 'INV-2024-A02009', 75.00, 0, 0, 0, 0, '2024-02-22', '2024-02-15 13:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(199, 2010, NULL, 'user-pa011', 75.00, '2024-02-19 14:00:00', 'Paid', 'INV-2024-A02010', 75.00, 0, 0, 0, 0, '2024-02-26', '2024-02-19 14:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(200, 2011, NULL, 'user-pa012', 75.00, '2024-02-23 16:00:00', 'Paid', 'INV-2024-A02011', 75.00, 0, 0, 0, 0, '2024-03-01', '2024-02-23 16:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(201, 2012, NULL, 'user-pa013', 75.00, '2024-03-03 09:00:00', 'Paid', 'INV-2024-A02012', 75.00, 0, 0, 0, 0, '2024-03-10', '2024-03-03 09:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(202, 2013, NULL, 'user-pa014', 75.00, '2024-03-07 10:00:00', 'Paid', 'INV-2024-A02013', 75.00, 0, 0, 0, 0, '2024-03-14', '2024-03-07 10:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(203, 2014, NULL, 'user-pa015', 75.00, '2024-03-11 11:00:00', 'Paid', 'INV-2024-A02014', 75.00, 0, 0, 0, 0, '2024-03-18', '2024-03-11 11:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(204, 2016, NULL, 'user-pa017', 75.00, '2024-03-19 14:00:00', 'Paid', 'INV-2024-A02016', 75.00, 0, 0, 0, 0, '2024-03-26', '2024-03-19 14:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(205, 2017, NULL, 'user-pa018', 75.00, '2024-03-23 16:00:00', 'Paid', 'INV-2024-A02017', 75.00, 0, 0, 0, 0, '2024-03-30', '2024-03-23 16:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(206, 2018, NULL, 'user-pa019', 75.00, '2024-04-03 09:00:00', 'Paid', 'INV-2024-A02018', 75.00, 0, 0, 0, 0, '2024-04-10', '2024-04-03 09:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(207, 2019, NULL, 'user-pa020', 75.00, '2024-04-07 10:00:00', 'Paid', 'INV-2024-A02019', 75.00, 0, 0, 0, 0, '2024-04-14', '2024-04-07 10:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(208, 2020, NULL, 'user-pa021', 75.00, '2024-04-11 11:00:00', 'Paid', 'INV-2024-A02020', 75.00, 0, 0, 0, 0, '2024-04-18', '2024-04-11 11:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(209, 2021, NULL, 'user-pa022', 75.00, '2024-04-15 13:00:00', 'Paid', 'INV-2024-A02021', 75.00, 0, 0, 0, 0, '2024-04-22', '2024-04-15 13:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(210, 2022, NULL, 'user-pa023', 75.00, '2024-04-19 14:00:00', 'Paid', 'INV-2024-A02022', 75.00, 0, 0, 0, 0, '2024-04-26', '2024-04-19 14:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(211, 2024, NULL, 'user-pa025', 75.00, '2024-05-03 09:00:00', 'Paid', 'INV-2024-A02024', 75.00, 0, 0, 0, 0, '2024-05-10', '2024-05-03 09:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(212, 2025, NULL, 'user-pa026', 75.00, '2024-05-07 10:00:00', 'Paid', 'INV-2024-A02025', 75.00, 0, 0, 0, 0, '2024-05-14', '2024-05-07 10:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(213, 2026, NULL, 'user-pa027', 75.00, '2024-05-11 11:00:00', 'Paid', 'INV-2024-A02026', 75.00, 0, 0, 0, 0, '2024-05-18', '2024-05-11 11:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(214, 2027, NULL, 'user-pa028', 75.00, '2024-05-15 13:00:00', 'Paid', 'INV-2024-A02027', 75.00, 0, 0, 0, 0, '2024-05-22', '2024-05-15 13:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(215, 2028, NULL, 'user-pa029', 75.00, '2024-05-19 14:00:00', 'Paid', 'INV-2024-A02028', 75.00, 0, 0, 0, 0, '2024-05-26', '2024-05-19 14:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(216, 2029, NULL, 'user-pa030', 75.00, '2024-05-23 16:00:00', 'Paid', 'INV-2024-A02029', 75.00, 0, 0, 0, 0, '2024-05-30', '2024-05-23 16:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(217, 2030, NULL, 'user-pa031', 75.00, '2024-06-03 09:00:00', 'Paid', 'INV-2024-A02030', 75.00, 0, 0, 0, 0, '2024-06-10', '2024-06-03 09:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(218, 2032, NULL, 'user-pa033', 75.00, '2024-06-11 11:00:00', 'Paid', 'INV-2024-A02032', 75.00, 0, 0, 0, 0, '2024-06-18', '2024-06-11 11:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(219, 2033, NULL, 'user-pa034', 75.00, '2024-06-15 13:00:00', 'Paid', 'INV-2024-A02033', 75.00, 0, 0, 0, 0, '2024-06-22', '2024-06-15 13:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(220, 2034, NULL, 'user-pa035', 75.00, '2024-06-19 14:00:00', 'Paid', 'INV-2024-A02034', 75.00, 0, 0, 0, 0, '2024-06-26', '2024-06-19 14:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(221, 2035, NULL, 'user-pa036', 75.00, '2024-06-23 16:00:00', 'Paid', 'INV-2024-A02035', 75.00, 0, 0, 0, 0, '2024-06-30', '2024-06-23 16:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(222, 2036, NULL, 'user-pa037', 75.00, '2024-07-03 09:00:00', 'Paid', 'INV-2024-A02036', 75.00, 0, 0, 0, 0, '2024-07-10', '2024-07-03 09:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(223, 2037, NULL, 'user-pa038', 75.00, '2024-07-07 10:00:00', 'Paid', 'INV-2024-A02037', 75.00, 0, 0, 0, 0, '2024-07-14', '2024-07-07 10:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(224, 2038, NULL, 'user-pa039', 75.00, '2024-07-11 11:00:00', 'Paid', 'INV-2024-A02038', 75.00, 0, 0, 0, 0, '2024-07-18', '2024-07-11 11:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(225, 2040, NULL, 'user-pa041', 75.00, '2024-07-19 14:00:00', 'Paid', 'INV-2024-A02040', 75.00, 0, 0, 0, 0, '2024-07-26', '2024-07-19 14:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(226, 2041, NULL, 'user-pa042', 75.00, '2024-07-23 16:00:00', 'Paid', 'INV-2024-A02041', 75.00, 0, 0, 0, 0, '2024-07-30', '2024-07-23 16:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(227, 2042, NULL, 'user-pa043', 75.00, '2024-08-03 09:00:00', 'Paid', 'INV-2024-A02042', 75.00, 0, 0, 0, 0, '2024-08-10', '2024-08-03 09:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(228, 2043, NULL, 'user-pa044', 75.00, '2024-08-07 10:00:00', 'Paid', 'INV-2024-A02043', 75.00, 0, 0, 0, 0, '2024-08-14', '2024-08-07 10:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(229, 2044, NULL, 'user-pa045', 75.00, '2024-08-11 11:00:00', 'Paid', 'INV-2024-A02044', 75.00, 0, 0, 0, 0, '2024-08-18', '2024-08-11 11:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(230, 2045, NULL, 'user-pa046', 75.00, '2024-08-15 13:00:00', 'Paid', 'INV-2024-A02045', 75.00, 0, 0, 0, 0, '2024-08-22', '2024-08-15 13:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(231, 2046, NULL, 'user-pa047', 75.00, '2024-08-19 14:00:00', 'Paid', 'INV-2024-A02046', 75.00, 0, 0, 0, 0, '2024-08-26', '2024-08-19 14:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(232, 2048, NULL, 'user-pa049', 75.00, '2024-09-03 09:00:00', 'Paid', 'INV-2024-A02048', 75.00, 0, 0, 0, 0, '2024-09-10', '2024-09-03 09:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(233, 2049, NULL, 'user-pa050', 75.00, '2024-09-07 10:00:00', 'Paid', 'INV-2024-A02049', 75.00, 0, 0, 0, 0, '2024-09-14', '2024-09-07 10:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(234, 2050, NULL, 'user-pa051', 75.00, '2024-09-11 11:00:00', 'Paid', 'INV-2024-A02050', 75.00, 0, 0, 0, 0, '2024-09-18', '2024-09-11 11:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(235, 2051, NULL, 'user-pa052', 75.00, '2024-09-15 13:00:00', 'Paid', 'INV-2024-A02051', 75.00, 0, 0, 0, 0, '2024-09-22', '2024-09-15 13:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(236, 2052, NULL, 'user-pa053', 75.00, '2024-09-19 14:00:00', 'Paid', 'INV-2024-A02052', 75.00, 0, 0, 0, 0, '2024-09-26', '2024-09-19 14:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(237, 2053, NULL, 'user-pa054', 75.00, '2024-09-23 16:00:00', 'Paid', 'INV-2024-A02053', 75.00, 0, 0, 0, 0, '2024-09-30', '2024-09-23 16:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(238, 2054, NULL, 'user-pa055', 75.00, '2024-10-03 09:00:00', 'Paid', 'INV-2024-A02054', 75.00, 0, 0, 0, 0, '2024-10-10', '2024-10-03 09:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(239, 2056, NULL, 'user-pa057', 75.00, '2024-10-11 11:00:00', 'Paid', 'INV-2024-A02056', 75.00, 0, 0, 0, 0, '2024-10-18', '2024-10-11 11:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(240, 2057, NULL, 'user-pa058', 75.00, '2024-10-15 13:00:00', 'Paid', 'INV-2024-A02057', 75.00, 0, 0, 0, 0, '2024-10-22', '2024-10-15 13:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(241, 2058, NULL, 'user-pa059', 75.00, '2024-10-19 14:00:00', 'Paid', 'INV-2024-A02058', 75.00, 0, 0, 0, 0, '2024-10-26', '2024-10-19 14:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(242, 2059, NULL, 'user-pa060', 75.00, '2024-10-23 16:00:00', 'Paid', 'INV-2024-A02059', 75.00, 0, 0, 0, 0, '2024-10-30', '2024-10-23 16:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(243, 2060, NULL, 'user-pa061', 75.00, '2024-11-03 09:00:00', 'Paid', 'INV-2024-A02060', 75.00, 0, 0, 0, 0, '2024-11-10', '2024-11-03 09:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(244, 2061, NULL, 'user-pa062', 75.00, '2024-11-07 10:00:00', 'Paid', 'INV-2024-A02061', 75.00, 0, 0, 0, 0, '2024-11-14', '2024-11-07 10:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(245, 2062, NULL, 'user-pa063', 75.00, '2024-11-11 11:00:00', 'Paid', 'INV-2024-A02062', 75.00, 0, 0, 0, 0, '2024-11-18', '2024-11-11 11:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(246, 2064, NULL, 'user-pa065', 75.00, '2024-11-19 14:00:00', 'Paid', 'INV-2024-A02064', 75.00, 0, 0, 0, 0, '2024-11-26', '2024-11-19 14:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(247, 2065, NULL, 'user-pa066', 75.00, '2024-11-23 16:00:00', 'Paid', 'INV-2024-A02065', 75.00, 0, 0, 0, 0, '2024-11-30', '2024-11-23 16:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(248, 2066, NULL, 'user-pa067', 75.00, '2024-12-03 09:00:00', 'Paid', 'INV-2024-A02066', 75.00, 0, 0, 0, 0, '2024-12-10', '2024-12-03 09:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(249, 2067, NULL, 'user-pa068', 75.00, '2024-12-07 10:00:00', 'Paid', 'INV-2024-A02067', 75.00, 0, 0, 0, 0, '2024-12-14', '2024-12-07 10:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(250, 2068, NULL, 'user-pa069', 75.00, '2024-12-11 11:00:00', 'Paid', 'INV-2024-A02068', 75.00, 0, 0, 0, 0, '2024-12-18', '2024-12-11 11:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(251, 2069, NULL, 'user-pa070', 75.00, '2024-12-15 13:00:00', 'Paid', 'INV-2024-A02069', 75.00, 0, 0, 0, 0, '2024-12-22', '2024-12-15 13:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(252, 2070, NULL, 'user-pa071', 75.00, '2024-12-19 14:00:00', 'Paid', 'INV-2024-A02070', 75.00, 0, 0, 0, 0, '2024-12-26', '2024-12-19 14:05:00', 'Paid home visit invoice', 7.50, 67.50, 0.1000),
(253, 3000, NULL, 'user-pa021', 50.00, '2024-03-08 09:00:00', 'Paid', 'INV-2024-A03000', 50.00, 0, 0, 0, 0, '2024-03-15', '2024-03-08 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(254, 3001, NULL, 'user-pa022', 50.00, '2024-03-11 09:00:00', 'Paid', 'INV-2024-A03001', 50.00, 0, 0, 0, 0, '2024-03-18', '2024-03-11 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(255, 3002, NULL, 'user-pa023', 50.00, '2024-03-14 09:00:00', 'Paid', 'INV-2024-A03002', 50.00, 0, 0, 0, 0, '2024-03-21', '2024-03-14 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(256, 3003, NULL, 'user-pa024', 50.00, '2024-03-17 09:00:00', 'Paid', 'INV-2024-A03003', 50.00, 0, 0, 0, 0, '2024-03-24', '2024-03-17 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(257, 3004, NULL, 'user-pa025', 50.00, '2024-03-20 09:00:00', 'Paid', 'INV-2024-A03004', 50.00, 0, 0, 0, 0, '2024-03-27', '2024-03-20 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(258, 3005, NULL, 'user-pa026', 50.00, '2024-03-23 09:00:00', 'Paid', 'INV-2024-A03005', 50.00, 0, 0, 0, 0, '2024-03-30', '2024-03-23 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(259, 3006, NULL, 'user-pa027', 50.00, '2024-03-26 09:00:00', 'Paid', 'INV-2024-A03006', 50.00, 0, 0, 0, 0, '2024-04-02', '2024-03-26 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(260, 3007, NULL, 'user-pa028', 50.00, '2024-03-29 09:00:00', 'Paid', 'INV-2024-A03007', 50.00, 0, 0, 0, 0, '2024-04-05', '2024-03-29 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(261, 3008, NULL, 'user-pa029', 50.00, '2024-04-01 09:00:00', 'Paid', 'INV-2024-A03008', 50.00, 0, 0, 0, 0, '2024-04-08', '2024-04-01 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(262, 3009, NULL, 'user-pa030', 50.00, '2024-04-04 09:00:00', 'Paid', 'INV-2024-A03009', 50.00, 0, 0, 0, 0, '2024-04-11', '2024-04-04 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(263, 3010, NULL, 'user-pa031', 50.00, '2024-04-07 09:00:00', 'Paid', 'INV-2024-A03010', 50.00, 0, 0, 0, 0, '2024-04-14', '2024-04-07 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(264, 3011, NULL, 'user-pa032', 50.00, '2024-04-10 09:00:00', 'Paid', 'INV-2024-A03011', 50.00, 0, 0, 0, 0, '2024-04-17', '2024-04-10 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(265, 3012, NULL, 'user-pa033', 50.00, '2024-04-13 09:00:00', 'Paid', 'INV-2024-A03012', 50.00, 0, 0, 0, 0, '2024-04-20', '2024-04-13 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(266, 3013, NULL, 'user-pa034', 50.00, '2024-04-16 09:00:00', 'Paid', 'INV-2024-A03013', 50.00, 0, 0, 0, 0, '2024-04-23', '2024-04-16 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(267, 3014, NULL, 'user-pa035', 50.00, '2024-04-19 09:00:00', 'Paid', 'INV-2024-A03014', 50.00, 0, 0, 0, 0, '2024-04-26', '2024-04-19 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(268, 3015, NULL, 'user-pa036', 50.00, '2024-04-22 09:00:00', 'Paid', 'INV-2024-A03015', 50.00, 0, 0, 0, 0, '2024-04-29', '2024-04-22 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(269, 3016, NULL, 'user-pa037', 50.00, '2024-04-25 09:00:00', 'Paid', 'INV-2024-A03016', 50.00, 0, 0, 0, 0, '2024-05-02', '2024-04-25 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(270, 3017, NULL, 'user-pa038', 50.00, '2024-04-28 09:00:00', 'Paid', 'INV-2024-A03017', 50.00, 0, 0, 0, 0, '2024-05-05', '2024-04-28 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(271, 3018, NULL, 'user-pa039', 50.00, '2024-05-01 09:00:00', 'Paid', 'INV-2024-A03018', 50.00, 0, 0, 0, 0, '2024-05-08', '2024-05-01 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(272, 3019, NULL, 'user-pa040', 50.00, '2024-05-04 09:00:00', 'Paid', 'INV-2024-A03019', 50.00, 0, 0, 0, 0, '2024-05-11', '2024-05-04 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(273, 3020, NULL, 'user-pa041', 50.00, '2024-05-07 09:00:00', 'Paid', 'INV-2024-A03020', 50.00, 0, 0, 0, 0, '2024-05-14', '2024-05-07 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(274, 3021, NULL, 'user-pa042', 50.00, '2024-05-10 09:00:00', 'Paid', 'INV-2024-A03021', 50.00, 0, 0, 0, 0, '2024-05-17', '2024-05-10 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(275, 3022, NULL, 'user-pa043', 50.00, '2024-05-13 09:00:00', 'Paid', 'INV-2024-A03022', 50.00, 0, 0, 0, 0, '2024-05-20', '2024-05-13 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(276, 3023, NULL, 'user-pa044', 50.00, '2024-05-16 09:00:00', 'Paid', 'INV-2024-A03023', 50.00, 0, 0, 0, 0, '2024-05-23', '2024-05-16 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(277, 3024, NULL, 'user-pa045', 50.00, '2024-05-19 09:00:00', 'Paid', 'INV-2024-A03024', 50.00, 0, 0, 0, 0, '2024-05-26', '2024-05-19 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(278, 3025, NULL, 'user-pa046', 50.00, '2024-05-22 09:00:00', 'Paid', 'INV-2024-A03025', 50.00, 0, 0, 0, 0, '2024-05-29', '2024-05-22 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(279, 3026, NULL, 'user-pa047', 50.00, '2024-05-25 09:00:00', 'Paid', 'INV-2024-A03026', 50.00, 0, 0, 0, 0, '2024-06-01', '2024-05-25 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(280, 3027, NULL, 'user-pa048', 50.00, '2024-05-28 09:00:00', 'Paid', 'INV-2024-A03027', 50.00, 0, 0, 0, 0, '2024-06-04', '2024-05-28 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(281, 3028, NULL, 'user-pa049', 50.00, '2024-05-31 09:00:00', 'Paid', 'INV-2024-A03028', 50.00, 0, 0, 0, 0, '2024-06-07', '2024-05-31 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(282, 3029, NULL, 'user-pa050', 50.00, '2024-06-03 09:00:00', 'Paid', 'INV-2024-A03029', 50.00, 0, 0, 0, 0, '2024-06-10', '2024-06-03 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(283, 3030, NULL, 'user-pa051', 50.00, '2024-06-06 09:00:00', 'Paid', 'INV-2024-A03030', 50.00, 0, 0, 0, 0, '2024-06-13', '2024-06-06 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(284, 3031, NULL, 'user-pa052', 50.00, '2024-06-09 09:00:00', 'Paid', 'INV-2024-A03031', 50.00, 0, 0, 0, 0, '2024-06-16', '2024-06-09 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(285, 3032, NULL, 'user-pa053', 50.00, '2024-06-12 09:00:00', 'Paid', 'INV-2024-A03032', 50.00, 0, 0, 0, 0, '2024-06-19', '2024-06-12 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(286, 3033, NULL, 'user-pa054', 50.00, '2024-06-15 09:00:00', 'Paid', 'INV-2024-A03033', 50.00, 0, 0, 0, 0, '2024-06-22', '2024-06-15 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(287, 3034, NULL, 'user-pa055', 50.00, '2024-06-18 09:00:00', 'Paid', 'INV-2024-A03034', 50.00, 0, 0, 0, 0, '2024-06-25', '2024-06-18 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(288, 3035, NULL, 'user-pa056', 50.00, '2024-06-21 09:00:00', 'Paid', 'INV-2024-A03035', 50.00, 0, 0, 0, 0, '2024-06-28', '2024-06-21 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(289, 3036, NULL, 'user-pa057', 50.00, '2024-06-24 09:00:00', 'Paid', 'INV-2024-A03036', 50.00, 0, 0, 0, 0, '2024-07-01', '2024-06-24 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(290, 3037, NULL, 'user-pa058', 50.00, '2024-06-27 09:00:00', 'Paid', 'INV-2024-A03037', 50.00, 0, 0, 0, 0, '2024-07-04', '2024-06-27 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(291, 3038, NULL, 'user-pa059', 50.00, '2024-06-30 09:00:00', 'Paid', 'INV-2024-A03038', 50.00, 0, 0, 0, 0, '2024-07-07', '2024-06-30 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(292, 3039, NULL, 'user-pa060', 50.00, '2024-07-03 09:00:00', 'Paid', 'INV-2024-A03039', 50.00, 0, 0, 0, 0, '2024-07-10', '2024-07-03 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(293, 3040, NULL, 'user-pa061', 50.00, '2024-07-06 09:00:00', 'Paid', 'INV-2024-A03040', 50.00, 0, 0, 0, 0, '2024-07-13', '2024-07-06 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(294, 3041, NULL, 'user-pa062', 50.00, '2024-07-09 09:00:00', 'Paid', 'INV-2024-A03041', 50.00, 0, 0, 0, 0, '2024-07-16', '2024-07-09 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(295, 3042, NULL, 'user-pa063', 50.00, '2024-07-12 09:00:00', 'Paid', 'INV-2024-A03042', 50.00, 0, 0, 0, 0, '2024-07-19', '2024-07-12 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(296, 3043, NULL, 'user-pa064', 50.00, '2024-07-15 09:00:00', 'Paid', 'INV-2024-A03043', 50.00, 0, 0, 0, 0, '2024-07-22', '2024-07-15 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(297, 3044, NULL, 'user-pa065', 50.00, '2024-07-18 09:00:00', 'Paid', 'INV-2024-A03044', 50.00, 0, 0, 0, 0, '2024-07-25', '2024-07-18 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(298, 3045, NULL, 'user-pa066', 50.00, '2024-07-21 09:00:00', 'Paid', 'INV-2024-A03045', 50.00, 0, 0, 0, 0, '2024-07-28', '2024-07-21 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(299, 3046, NULL, 'user-pa067', 50.00, '2024-07-24 09:00:00', 'Paid', 'INV-2024-A03046', 50.00, 0, 0, 0, 0, '2024-07-31', '2024-07-24 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(300, 3047, NULL, 'user-pa068', 50.00, '2024-07-27 09:00:00', 'Paid', 'INV-2024-A03047', 50.00, 0, 0, 0, 0, '2024-08-03', '2024-07-27 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(301, 3048, NULL, 'user-pa069', 50.00, '2024-07-30 09:00:00', 'Paid', 'INV-2024-A03048', 50.00, 0, 0, 0, 0, '2024-08-06', '2024-07-30 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(302, 3049, NULL, 'user-pa070', 50.00, '2024-08-02 09:00:00', 'Paid', 'INV-2024-A03049', 50.00, 0, 0, 0, 0, '2024-08-09', '2024-08-02 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(303, 3050, NULL, 'user-pa071', 50.00, '2024-08-05 09:00:00', 'Paid', 'INV-2024-A03050', 50.00, 0, 0, 0, 0, '2024-08-12', '2024-08-05 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(304, 3051, NULL, 'user-pa072', 50.00, '2024-08-08 09:00:00', 'Paid', 'INV-2024-A03051', 50.00, 0, 0, 0, 0, '2024-08-15', '2024-08-08 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(305, 3052, NULL, 'user-pa073', 50.00, '2024-08-11 09:00:00', 'Paid', 'INV-2024-A03052', 50.00, 0, 0, 0, 0, '2024-08-18', '2024-08-11 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(306, 3053, NULL, 'user-pa074', 50.00, '2024-08-14 09:00:00', 'Paid', 'INV-2024-A03053', 50.00, 0, 0, 0, 0, '2024-08-21', '2024-08-14 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(307, 3054, NULL, 'user-pa075', 50.00, '2024-08-17 09:00:00', 'Paid', 'INV-2024-A03054', 50.00, 0, 0, 0, 0, '2024-08-24', '2024-08-17 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(308, 3055, NULL, 'user-pa076', 50.00, '2024-08-20 09:00:00', 'Paid', 'INV-2024-A03055', 50.00, 0, 0, 0, 0, '2024-08-27', '2024-08-20 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(309, 3056, NULL, 'user-pa077', 50.00, '2024-08-23 09:00:00', 'Paid', 'INV-2024-A03056', 50.00, 0, 0, 0, 0, '2024-08-30', '2024-08-23 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(310, 3057, NULL, 'user-pa078', 50.00, '2024-08-26 09:00:00', 'Paid', 'INV-2024-A03057', 50.00, 0, 0, 0, 0, '2024-09-02', '2024-08-26 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(311, 3058, NULL, 'user-pa079', 50.00, '2024-08-29 09:00:00', 'Paid', 'INV-2024-A03058', 50.00, 0, 0, 0, 0, '2024-09-05', '2024-08-29 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(312, 3059, NULL, 'user-pa080', 50.00, '2024-09-01 09:00:00', 'Paid', 'INV-2024-A03059', 50.00, 0, 0, 0, 0, '2024-09-08', '2024-09-01 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(313, 3060, NULL, 'user-pa081', 50.00, '2024-09-04 09:00:00', 'Paid', 'INV-2024-A03060', 50.00, 0, 0, 0, 0, '2024-09-11', '2024-09-04 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(314, 3061, NULL, 'user-pa082', 50.00, '2024-09-07 09:00:00', 'Paid', 'INV-2024-A03061', 50.00, 0, 0, 0, 0, '2024-09-14', '2024-09-07 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(315, 3062, NULL, 'user-pa083', 50.00, '2024-09-10 09:00:00', 'Paid', 'INV-2024-A03062', 50.00, 0, 0, 0, 0, '2024-09-17', '2024-09-10 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(316, 3063, NULL, 'user-pa084', 50.00, '2024-09-13 09:00:00', 'Paid', 'INV-2024-A03063', 50.00, 0, 0, 0, 0, '2024-09-20', '2024-09-13 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(317, 3064, NULL, 'user-pa085', 50.00, '2024-09-16 09:00:00', 'Paid', 'INV-2024-A03064', 50.00, 0, 0, 0, 0, '2024-09-23', '2024-09-16 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(318, 3065, NULL, 'user-pa086', 50.00, '2024-09-19 09:00:00', 'Paid', 'INV-2024-A03065', 50.00, 0, 0, 0, 0, '2024-09-26', '2024-09-19 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(319, 3066, NULL, 'user-pa087', 50.00, '2024-09-22 09:00:00', 'Paid', 'INV-2024-A03066', 50.00, 0, 0, 0, 0, '2024-09-29', '2024-09-22 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(320, 3067, NULL, 'user-pa088', 50.00, '2024-09-25 09:00:00', 'Paid', 'INV-2024-A03067', 50.00, 0, 0, 0, 0, '2024-10-02', '2024-09-25 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(321, 3068, NULL, 'user-pa089', 50.00, '2024-09-28 09:00:00', 'Paid', 'INV-2024-A03068', 50.00, 0, 0, 0, 0, '2024-10-05', '2024-09-28 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500),
(322, 3069, NULL, 'user-pa090', 50.00, '2024-10-01 09:00:00', 'Paid', 'INV-2024-A03069', 50.00, 0, 0, 0, 0, '2024-10-08', '2024-10-01 09:05:00', 'Paid consultation invoice', 7.50, 42.50, 0.1500);
SET IDENTITY_INSERT Invoices OFF;


-- 65. INVOICES BACKFILL FOR PHARMACY ORDERS WITHOUT INVOICE
-- Ly do: chi 4/15 PharmacyOrders (12-15) co Invoice tuong ung (section 30); 11 don
-- con lai (1-11) chua co, khien Financial Reports thieu du lieu nha thuoc khi liet ke
-- transactions. platformFee/commissionRate lay truc tiep tu PharmacyOrders (da co san,
-- rate 0.08 khop CommissionConfigs.PHARMACY_ORDER); doctorEarning = NULL (khong ap dung
-- cho pharmacy, giong 4 invoice pharmacy co san o section 30).
SET IDENTITY_INSERT Invoices ON;
INSERT INTO Invoices (InvoiceID, AppointmentId, PharmacyOrderId, PatientID, amount, issueDate, status, invoiceNumber, consultationFee, medicineFee, deliveryFee, discount, tax, dueDate, paidAt, notes, platformFee, doctorEarning, commissionRate) VALUES
(323, NULL, 1, 'user-p01', 50.99, '2024-05-10 09:40:00', 'PAID', 'INV-PH-2024-A00001', 0, 45.00, 5.99, 0, 0, '2024-05-17', '2024-05-10 09:45:00', 'Paid pharmacy order invoice (backfill)',3.60, NULL, 0.0800),
(324, NULL, 2, 'user-p02', 41.99, '2024-05-11 10:30:00', 'PAID', 'INV-PH-2024-A00002', 0, 35.00, 6.99, 0, 0, '2024-05-18', '2024-05-11 10:35:00', 'Paid pharmacy order invoice (backfill)',2.80, NULL, 0.0800),
(325, NULL, 3, 'user-p03', 82.99, '2024-05-12 10:30:00', 'PAID', 'INV-PH-2024-A00003', 0, 75.00, 7.99, 0, 0, '2024-05-19', '2024-05-12 10:35:00', 'Paid pharmacy order invoice (backfill)',6.00, NULL, 0.0800),
(326, NULL, 4, 'user-p04', 40.00, '2024-05-15 08:35:00', 'PENDING', 'INV-PH-2024-A00004', 0, 40.00, 0.00, 0, 0, '2024-05-22', NULL, 'Pending pharmacy order invoice (backfill)', 3.20, NULL, 0.0800),
(327, NULL, 5, 'user-p05', 61.99, '2024-05-16 14:40:00', 'PAID', 'INV-PH-2024-A00005', 0, 55.00, 6.99, 0, 0, '2024-05-23', '2024-05-16 14:45:00', 'Paid pharmacy order invoice (backfill)',4.40, NULL, 0.0800),
(328, NULL, 6, 'user-p01', 30.49, '2024-04-10 16:00:00', 'REFUNDED', 'INV-PH-2024-A00006', 0, 25.00, 5.49, 0, 0, '2024-04-17', '2024-04-10 16:05:00', 'Refunded pharmacy order invoice (backfill)',2.00, NULL, 0.0800),
(329, NULL, 7, 'user-p02', 56.99, '2024-03-15 15:30:00', 'PAID', 'INV-PH-2024-A00007', 0, 50.00, 6.99, 0, 0, '2024-03-22', '2024-03-15 15:35:00', 'Paid pharmacy order invoice (backfill)',4.00, NULL, 0.0800),
(330, NULL, 8, 'user-p03', 65.00, '2024-04-01 13:00:00', 'PAID', 'INV-PH-2024-A00008', 0, 65.00, 0.00, 0, 0, '2024-04-08', '2024-04-01 13:05:00', 'Paid pharmacy order invoice (backfill)', 5.20, NULL, 0.0800),
(331, NULL, 9, 'user-p05', 65.99, '2024-04-16 16:30:00', 'PAID', 'INV-PH-2024-A00009', 0, 60.00, 5.99, 0, 0, '2024-04-23', '2024-04-16 16:35:00', 'Paid pharmacy order invoice (backfill)',4.80, NULL, 0.0800),
(332, NULL, 10, 'user-p07', 53.99, '2024-05-20 15:30:00', 'PENDING', 'INV-PH-2024-A00010', 0, 48.00, 5.99, 0, 0, '2024-05-27', NULL, 'Pending pharmacy order invoice (backfill)',3.84, NULL, 0.0800),
(333, NULL, 11, 'user-p07', 53.99, '2024-05-20 16:05:00', 'PENDING', 'INV-PH-2024-A00011', 0, 48.00, 5.99, 0, 0, '2024-05-27', NULL, 'Pending pharmacy order invoice (backfill)',3.84, NULL, 0.0800);
SET IDENTITY_INSERT Invoices OFF;

-- =====================================================
-- END SEED DATA
-- Total: 65 seed sections, mixed sample sizes
-- =====================================================
PRINT 'Seed data completed successfully!';
