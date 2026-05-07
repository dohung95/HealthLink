-- =====================================================
-- HEALTHLINK DATABASE SEED DATA
-- 10 records per table (following FK dependencies order)
-- =====================================================

-- 1. ROLES (4 basic roles)
INSERT INTO Roles (Id, Name) VALUES
('admin', 'Admin'),
('doctor', 'Doctor'),
('patient', 'Patient'),
('pharmacy', 'Pharmacy');

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
INSERT INTO Users (Id, UserName, Email, EmailConfirmed, PasswordHash, PhoneNumber, AccessFailedCount, CreatedDate, Status, LastLoginAt) VALUES
-- Doctors (user-d01 to user-d10)
('user-d01', 'doctor01', 'doctor01@healthlink.com', 1, '$2a$10$hashedpassword1', '0901000001', 0, '2024-01-01', 'Active', '2024-05-01'),
('user-d02', 'doctor02', 'doctor02@healthlink.com', 1, '$2a$10$hashedpassword2', '0901000002', 0, '2024-01-02', 'Active', '2024-05-02'),
('user-d03', 'doctor03', 'doctor03@healthlink.com', 1, '$2a$10$hashedpassword3', '0901000003', 0, '2024-01-03', 'Active', '2024-05-03'),
('user-d04', 'doctor04', 'doctor04@healthlink.com', 1, '$2a$10$hashedpassword4', '0901000004', 0, '2024-01-04', 'Active', '2024-05-04'),
('user-d05', 'doctor05', 'doctor05@healthlink.com', 1, '$2a$10$hashedpassword5', '0901000005', 0, '2024-01-05', 'Active', '2024-05-05'),
('user-d06', 'doctor06', 'doctor06@healthlink.com', 1, '$2a$10$hashedpassword6', '0901000006', 0, '2024-01-06', 'Active', '2024-05-06'),
('user-d07', 'doctor07', 'doctor07@healthlink.com', 1, '$2a$10$hashedpassword7', '0901000007', 0, '2024-01-07', 'Active', '2024-05-07'),
('user-d08', 'doctor08', 'doctor08@healthlink.com', 1, '$2a$10$hashedpassword8', '0901000008', 0, '2024-01-08', 'Active', '2024-05-08'),
('user-d09', 'doctor09', 'doctor09@healthlink.com', 1, '$2a$10$hashedpassword9', '0901000009', 0, '2024-01-09', 'Active', '2024-05-09'),
('user-d10', 'doctor10', 'doctor10@healthlink.com', 1, '$2a$10$hashedpassword10', '0901000010', 0, '2024-01-10', 'Active', '2024-05-10'),
-- Patients (user-p01 to user-p10)
('user-p01', 'patient01', 'patient01@gmail.com', 1, '$2a$10$hashedpassword11', '0912000001', 0, '2024-02-01', 'Active', '2024-05-01'),
('user-p02', 'patient02', 'patient02@gmail.com', 1, '$2a$10$hashedpassword12', '0912000002', 0, '2024-02-02', 'Active', '2024-05-02'),
('user-p03', 'patient03', 'patient03@gmail.com', 1, '$2a$10$hashedpassword13', '0912000003', 0, '2024-02-03', 'Active', '2024-05-03'),
('user-p04', 'patient04', 'patient04@gmail.com', 1, '$2a$10$hashedpassword14', '0912000004', 0, '2024-02-04', 'Active', '2024-05-04'),
('user-p05', 'patient05', 'patient05@gmail.com', 1, '$2a$10$hashedpassword15', '0912000005', 0, '2024-02-05', 'Active', '2024-05-05'),
('user-p06', 'patient06', 'patient06@gmail.com', 1, '$2a$10$hashedpassword16', '0912000006', 0, '2024-02-06', 'Active', '2024-05-06'),
('user-p07', 'patient07', 'patient07@gmail.com', 1, '$2a$10$hashedpassword17', '0912000007', 0, '2024-02-07', 'Active', '2024-05-07'),
('user-p08', 'patient08', 'patient08@gmail.com', 1, '$2a$10$hashedpassword18', '0912000008', 0, '2024-02-08', 'Active', '2024-05-08'),
('user-p09', 'patient09', 'patient09@gmail.com', 1, '$2a$10$hashedpassword19', '0912000009', 0, '2024-02-09', 'Active', '2024-05-09'),
('user-p10', 'patient10', 'patient10@gmail.com', 1, '$2a$10$hashedpassword20', '0912000010', 0, '2024-02-10', 'Active', '2024-05-10'),
-- Pharmacies (user-ph01 to user-ph10)
('user-ph01', 'pharmacy01', 'pharmacy01@healthlink.com', 1, '$2a$10$hashedpassword21', '0923000001', 0, '2024-03-01', 'Active', '2024-05-01'),
('user-ph02', 'pharmacy02', 'pharmacy02@healthlink.com', 1, '$2a$10$hashedpassword22', '0923000002', 0, '2024-03-02', 'Active', '2024-05-02'),
('user-ph03', 'pharmacy03', 'pharmacy03@healthlink.com', 1, '$2a$10$hashedpassword23', '0923000003', 0, '2024-03-03', 'Active', '2024-05-03'),
('user-ph04', 'pharmacy04', 'pharmacy04@healthlink.com', 1, '$2a$10$hashedpassword24', '0923000004', 0, '2024-03-04', 'Active', '2024-05-04'),
('user-ph05', 'pharmacy05', 'pharmacy05@healthlink.com', 1, '$2a$10$hashedpassword25', '0923000005', 0, '2024-03-05', 'Active', '2024-05-05'),
('user-ph06', 'pharmacy06', 'pharmacy06@healthlink.com', 1, '$2a$10$hashedpassword26', '0923000006', 0, '2024-03-06', 'Active', '2024-05-06'),
('user-ph07', 'pharmacy07', 'pharmacy07@healthlink.com', 1, '$2a$10$hashedpassword27', '0923000007', 0, '2024-03-07', 'Active', '2024-05-07'),
('user-ph08', 'pharmacy08', 'pharmacy08@healthlink.com', 1, '$2a$10$hashedpassword28', '0923000008', 0, '2024-03-08', 'Active', '2024-05-08'),
('user-ph09', 'pharmacy09', 'pharmacy09@healthlink.com', 1, '$2a$10$hashedpassword29', '0923000009', 0, '2024-03-09', 'Active', '2024-05-09'),
('user-ph10', 'pharmacy10', 'pharmacy10@healthlink.com', 1, '$2a$10$hashedpassword30', '0923000010', 0, '2024-03-10', 'Active', '2024-05-10');

-- 4. USER_ROLES
INSERT INTO UserRoles (UserId, RoleId) VALUES
('user-d01', 'doctor'), ('user-d02', 'doctor'), ('user-d03', 'doctor'),
('user-d04', 'doctor'), ('user-d05', 'doctor'), ('user-d06', 'doctor'),
('user-d07', 'doctor'), ('user-d08', 'doctor'), ('user-d09', 'doctor'),
('user-d10', 'doctor'),
('user-p01', 'patient'), ('user-p02', 'patient'), ('user-p03', 'patient'),
('user-p04', 'patient'), ('user-p05', 'patient'), ('user-p06', 'patient'),
('user-p07', 'patient'), ('user-p08', 'patient'), ('user-p09', 'patient'),
('user-p10', 'patient'),
('user-ph01', 'pharmacy'), ('user-ph02', 'pharmacy'), ('user-ph03', 'pharmacy'),
('user-ph04', 'pharmacy'), ('user-ph05', 'pharmacy'), ('user-ph06', 'pharmacy'),
('user-ph07', 'pharmacy'), ('user-ph08', 'pharmacy'), ('user-ph09', 'pharmacy'),
('user-ph10', 'pharmacy');

-- 5. DOCTORS (10 doctors)
INSERT INTO Doctors (DoctorID, FullName, qualifications, specialty, yearsOfExperience, languageSpoken, location, avatarUrl, bio, consultationFee, latitude, longitude, clinicName, clinicAddress, averageRating, totalReviews, verified, availableForVideo, availableForAudio, availableForChat, availableForOffline, specialtyId) VALUES
('user-d01', 'Dr. John Smith', 'MD, PhD - Harvard Medical School', 'Internal Medicine', 15, 'English, Spanish', 'New York', '/avatars/doctor01.jpg', 'Internal medicine specialist with 15 years of experience', 150.00, 40.7128, -74.0060, 'Manhattan Health Clinic', '123 5th Avenue, New York, NY 10001', 4.8, 156, 1, 1, 1, 1, 1, 1),
('user-d02', 'Dr. Sarah Johnson', 'MD - Johns Hopkins University', 'Pediatrics', 12, 'English', 'Los Angeles', '/avatars/doctor02.jpg', 'Dedicated pediatrician caring for children', 120.00, 34.0522, -118.2437, 'LA Children Hospital', '456 Sunset Blvd, Los Angeles, CA 90028', 4.9, 203, 1, 1, 1, 1, 1, 3),
('user-d03', 'Dr. Michael Chen', 'MD, FACC - Stanford University', 'Cardiology', 20, 'English, Mandarin, French', 'San Francisco', '/avatars/doctor03.jpg', 'Leading cardiologist and heart specialist', 250.00, 37.7749, -122.4194, 'Bay Area Heart Center', '789 Market Street, San Francisco, CA 94103', 4.95, 89, 1, 1, 0, 1, 1, 6),
('user-d04', 'Dr. Emily Davis', 'MD, FACS - Mayo Clinic', 'Surgery', 10, 'English', 'Chicago', '/avatars/doctor04.jpg', 'Experienced general surgeon', 180.00, 41.8781, -87.6298, 'Chicago Medical Center', '321 Michigan Ave, Chicago, IL 60601', 4.7, 67, 1, 0, 0, 1, 1, 2),
('user-d05', 'Dr. Jessica Williams', 'MD, FACOG - UCLA', 'Obstetrics & Gynecology', 8, 'English, Korean', 'Seattle', '/avatars/doctor05.jpg', 'Women health and pregnancy specialist', 140.00, 47.6062, -122.3321, 'Seattle Women Clinic', '555 Pine Street, Seattle, WA 98101', 4.85, 178, 1, 1, 1, 1, 1, 4),
('user-d06', 'Dr. Robert Brown', 'MD - NYU School of Medicine', 'Dermatology', 7, 'English, Italian', 'Miami', '/avatars/doctor06.jpg', 'Skin disease and cosmetic dermatology expert', 110.00, 25.7617, -80.1918, 'Miami Skin Center', '888 Ocean Drive, Miami, FL 33139', 4.6, 234, 1, 1, 1, 1, 0, 5),
('user-d07', 'Dr. David Wilson', 'MD, PhD - Columbia University', 'Neurology', 18, 'English, German', 'Boston', '/avatars/doctor07.jpg', 'Neurologist specializing in brain disorders', 220.00, 42.3601, -71.0589, 'Boston Neuro Institute', '100 Cambridge St, Boston, MA 02114', 4.75, 112, 1, 1, 1, 1, 1, 7),
('user-d08', 'Dr. Amanda Lee', 'MD - Wills Eye Hospital', 'Ophthalmology', 14, 'English, Japanese', 'Philadelphia', '/avatars/doctor08.jpg', 'Eye surgery and treatment specialist', 160.00, 39.9526, -75.1652, 'Philadelphia Eye Center', '200 Chestnut St, Philadelphia, PA 19106', 4.88, 145, 1, 1, 0, 1, 1, 8),
('user-d09', 'Dr. James Taylor', 'MD - Baylor College of Medicine', 'ENT', 11, 'English, Spanish', 'Houston', '/avatars/doctor09.jpg', 'Ear, nose, and throat specialist', 100.00, 29.7604, -95.3698, 'Houston ENT Clinic', '400 Main Street, Houston, TX 77002', 4.5, 89, 1, 1, 1, 1, 1, 9),
('user-d10', 'Dr. Jennifer Martinez', 'DDS - USC School of Dentistry', 'Dentistry', 9, 'English, Spanish', 'Phoenix', '/avatars/doctor10.jpg', 'Cosmetic and general dentistry', 90.00, 33.4484, -112.0740, 'Smile Dental Care', '600 Central Ave, Phoenix, AZ 85004', 4.92, 267, 1, 0, 0, 1, 1, 10);

-- 6. PATIENTS (10 patients)
INSERT INTO Patients (PatientID, FullName, dateOfBirth, medicalHistorySummary, insuranceProvider, insurancePolicyNumber, gender, address, city, country, bloodType, emergencyContactName, emergencyContactPhone, emergencyContactRelationship, preferredLanguage, preferredContactMethod, occupation, avatarUrl, latitude, longitude, allergies, chronicConditions, currentMedications, heightCm, weightKg) VALUES
('user-p01', 'Michael Anderson', '1990-05-15', 'No significant medical history', 'Blue Cross', 'BC-2024-001', 'Male', '45 Oak Street, Apt 3B', 'New York', 'USA', 'A+', 'Lisa Anderson', '0912345678', 'Wife', 'English', 'Phone', 'Software Engineer', '/avatars/patient01.jpg', 40.7128, -74.0060, 'Penicillin', NULL, NULL, 175, 70),
('user-p02', 'Emma Thompson', '1985-08-22', 'History of gastritis', 'Aetna', 'AET-2024-002', 'Female', '123 Maple Avenue', 'Los Angeles', 'USA', 'B+', 'Tom Thompson', '0923456789', 'Husband', 'English', 'Email', 'Teacher', '/avatars/patient02.jpg', 34.0522, -118.2437, NULL, 'Chronic gastritis', 'Omeprazole 20mg', 165, 58),
('user-p03', 'William Brown', '1978-12-01', 'Type 2 diabetes', 'United Healthcare', 'UHC-2024-003', 'Male', '78 Pine Road', 'Chicago', 'USA', 'O+', 'Mary Brown', '0934567890', 'Wife', 'English', 'Phone', 'Business Owner', '/avatars/patient03.jpg', 41.8781, -87.6298, NULL, 'Type 2 diabetes', 'Metformin 500mg', 178, 85),
('user-p04', 'Sophia Garcia', '1995-03-10', 'No significant medical history', 'Cigna', 'CIG-2024-004', 'Female', '56 Cedar Lane', 'Houston', 'USA', 'AB+', 'Carlos Garcia', '0945678901', 'Father', 'English', 'Text', 'Student', '/avatars/patient04.jpg', 29.7604, -95.3698, 'Shellfish', NULL, NULL, 160, 52),
('user-p05', 'James Wilson', '1982-07-25', 'Hypertension', 'Kaiser', 'KP-2024-005', 'Male', '234 Elm Street', 'San Francisco', 'USA', 'A-', 'Susan Wilson', '0956789012', 'Wife', 'English', 'Phone', 'Attorney', '/avatars/patient05.jpg', 37.7749, -122.4194, NULL, 'Hypertension', 'Amlodipine 5mg', 180, 78),
('user-p06', 'Olivia Davis', '1992-11-18', 'Childhood asthma', 'Humana', 'HUM-2024-006', 'Female', '89 Birch Court', 'Seattle', 'USA', 'B-', 'Robert Davis', '0967890123', 'Father', 'English', 'Email', 'Office Manager', '/avatars/patient06.jpg', 47.6062, -122.3321, 'Dust, pollen', 'Asthma', 'Salbutamol inhaler', 163, 55),
('user-p07', 'Daniel Miller', '1970-04-05', 'Gout, elevated uric acid', 'Medicare', 'MED-2024-007', 'Male', '12 Walnut Drive', 'Miami', 'USA', 'O-', 'Patricia Miller', '0978901234', 'Wife', 'English', 'Phone', 'Executive', '/avatars/patient07.jpg', 25.7617, -80.1918, NULL, 'Gout', 'Allopurinol 300mg', 172, 80),
('user-p08', 'Isabella Moore', '1988-09-30', 'No significant medical history', 'Anthem', 'ANT-2024-008', 'Female', '67 Spruce Avenue', 'Boston', 'USA', 'A+', 'Mark Moore', '0989012345', 'Husband', 'English', 'Text', 'Nurse', '/avatars/patient08.jpg', 42.3601, -71.0589, NULL, NULL, NULL, 168, 60),
('user-p09', 'Alexander Johnson', '1998-01-20', 'Chronic sinusitis', 'Tricare', 'TRI-2024-009', 'Male', '45 Redwood Street', 'Phoenix', 'USA', 'B+', 'Nancy Johnson', '0990123456', 'Mother', 'English', 'Phone', 'Developer', '/avatars/patient09.jpg', 33.4484, -112.0740, 'Aspirin', 'Sinusitis', NULL, 182, 75),
('user-p10', 'Charlotte Taylor', '1975-06-12', 'Spinal degeneration', 'BCBS', 'BCBS-2024-010', 'Female', '90 Aspen Way', 'Philadelphia', 'USA', 'AB-', 'George Taylor', '0901234567', 'Husband', 'English', 'Phone', 'Homemaker', '/avatars/patient10.jpg', 39.9526, -75.1652, NULL, 'Spinal degeneration', 'Glucosamine', 158, 62);

-- 7. PHARMACIES (10 pharmacies)
INSERT INTO Pharmacies (PharmacyID, name, licenseNumber, address, city, district, ward, latitude, longitude, phoneNumber, email, description, avatarUrl, openTime, closeTime, Open24Hours, workingDays, Verified, Active, AverageRating, TotalReviews, DeliveryAvailable, DeliveryRadius, DeliveryFee, CreatedAt, updatedAt) VALUES
('user-ph01', 'CVS Pharmacy - Manhattan', 'PH-NY-001', '15 Broadway Ave', 'New York', 'Manhattan', 'Midtown', 40.7580, -73.9855, '2123001001', 'cvs.manhattan@pharmacy.com', 'Trusted pharmacy with great service', '/pharmacy/cvs1.jpg', '07:00', '22:00', 0, 'Mon-Sun', 1, 1, 4.8, 523, 1, 5.0, 5.99, '2024-01-01', '2024-05-01'),
('user-ph02', 'Walgreens - LA Downtown', 'PH-CA-002', '120 Sunset Blvd', 'Los Angeles', 'Downtown', 'Central', 34.0407, -118.2468, '2133002002', 'walgreens.la@pharmacy.com', 'Large pharmacy chain', '/pharmacy/walgreens1.jpg', '07:30', '22:30', 0, 'Mon-Sun', 1, 1, 4.7, 412, 1, 7.0, 6.99, '2024-01-15', '2024-05-02'),
('user-ph03', 'Rite Aid - Chicago', 'PH-IL-003', '56 Michigan Ave', 'Chicago', 'Loop', 'Central', 41.8827, -87.6233, '3123003003', 'riteaid.chi@pharmacy.com', 'Your neighborhood pharmacy', '/pharmacy/riteaid.jpg', '06:30', '21:30', 0, 'Mon-Sat', 1, 1, 4.6, 187, 1, 4.0, 4.99, '2024-02-01', '2024-05-03'),
('user-ph04', 'CVS Pharmacy - SF', 'PH-CA-004', '789 Market Street', 'San Francisco', 'Financial', 'Downtown', 37.7879, -122.4074, '4153004004', 'cvs.sf@pharmacy.com', 'Tech-friendly pharmacy', '/pharmacy/cvs2.jpg', '07:00', '23:00', 0, 'Mon-Sun', 1, 1, 4.9, 678, 1, 6.0, 7.99, '2024-02-15', '2024-05-04'),
('user-ph05', 'Walgreens - Boston', 'PH-MA-005', '23 Newbury Street', 'Boston', 'Back Bay', 'Central', 42.3505, -71.0762, '6173005005', 'walgreens.bos@pharmacy.com', 'Premium pharmacy services', '/pharmacy/walgreens2.jpg', '08:00', '20:00', 0, 'Mon-Sat', 1, 1, 4.5, 234, 1, 3.0, 5.49, '2024-03-01', '2024-05-05'),
('user-ph06', 'Hospital Pharmacy - NYC', 'PH-NY-006', '78 Hospital Drive', 'New York', 'Queens', 'Jamaica', 40.7282, -73.7949, '7183006006', 'hospital.nyc@pharmacy.com', 'Open 24/7', '/pharmacy/hospital.jpg', NULL, NULL, 1, 'Mon-Sun', 1, 1, 4.4, 892, 0, NULL, NULL, '2024-03-15', '2024-05-06'),
('user-ph07', 'MedExpress Pharmacy', 'PH-TX-007', '34 Main Plaza', 'Houston', 'Downtown', 'Central', 29.7589, -95.3677, '7133007007', 'medexpress@pharmacy.com', 'Fast and reliable service', '/pharmacy/medexpress.jpg', '07:00', '21:00', 0, 'Mon-Sun', 1, 1, 4.7, 156, 1, 8.0, 5.99, '2024-04-01', '2024-05-07'),
('user-ph08', 'Community Pharmacy', 'PH-FL-008', '456 Ocean Drive', 'Miami', 'Beach', 'South Beach', 25.7825, -80.1340, '3053008008', 'community.miami@pharmacy.com', 'Family owned pharmacy', '/pharmacy/community.jpg', '06:00', '22:00', 0, 'Mon-Sun', 1, 1, 4.3, 345, 1, 5.0, 4.99, '2024-04-15', '2024-05-08'),
('user-ph09', 'HealthMart Pharmacy', 'PH-WA-009', 'Pike Place Market', 'Seattle', 'Downtown', 'Pike Place', 47.6097, -122.3422, '2063009009', 'healthmart.sea@pharmacy.com', 'Natural and organic options', '/pharmacy/healthmart.jpg', '09:00', '22:00', 0, 'Mon-Sun', 1, 1, 4.6, 267, 1, 4.0, 6.99, '2024-05-01', '2024-05-09'),
('user-ph10', 'Express Scripts Pharmacy', 'PH-AZ-010', '90 Central Avenue', 'Phoenix', 'Downtown', 'Central', 33.4502, -112.0733, '6023010010', 'express.phx@pharmacy.com', 'Quick prescription service', '/pharmacy/express.jpg', '07:30', '21:00', 0, 'Mon-Sat', 1, 1, 4.8, 198, 1, 6.0, 5.49, '2024-05-05', '2024-05-10');

-- 8. MEDICINES (10 medicines)
SET IDENTITY_INSERT Medicines ON;
INSERT INTO Medicines (MedicineID, name, genericName, brandName, category, dosageForm, strength, unit, manufacturer, countryOfOrigin, description, activeIngredients, indications, contraindications, sideEffects, precautions, interactions, storageConditions, prescriptionRequired, referencePrice, active, imageUrl, createdAt, updatedAt) VALUES
(1, 'Paracetamol 500mg', 'Paracetamol', 'Tylenol', 'Pain Relief - Fever', 'Tablet', '500mg', 'Tablet', 'Johnson & Johnson', 'USA', 'Common pain reliever and fever reducer', 'Paracetamol 500mg', 'Headache, fever, muscle pain', 'Allergy to paracetamol, severe liver disease', 'Nausea, rash (rare)', 'Do not exceed 4g per day', 'Increased toxicity with alcohol', 'Store below 30C', 0, 5.99, 1, '/medicines/paracetamol.jpg', '2024-01-01', NULL),
(2, 'Amoxicillin 500mg', 'Amoxicillin', 'Amoxil', 'Antibiotic', 'Capsule', '500mg', 'Capsule', 'Pfizer', 'USA', 'Broad spectrum antibiotic', 'Amoxicillin trihydrate', 'Respiratory infections, UTI', 'Penicillin allergy', 'Diarrhea, rash, nausea', 'Adjust dose for kidney disease', 'May reduce contraceptive efficacy', 'Store at 15-25C', 1, 12.99, 1, '/medicines/amoxicillin.jpg', '2024-01-01', NULL),
(3, 'Omeprazole 20mg', 'Omeprazole', 'Prilosec', 'Gastrointestinal', 'Capsule', '20mg', 'Capsule', 'AstraZeneca', 'Sweden', 'Proton pump inhibitor', 'Omeprazole', 'Gastric ulcer, GERD', 'Allergy to omeprazole', 'Headache, diarrhea, nausea', 'Not for long-term use', 'Reduces B12 absorption', 'Store below 25C, protect from moisture', 1, 15.99, 1, '/medicines/omeprazole.jpg', '2024-01-01', NULL),
(4, 'Metformin 500mg', 'Metformin', 'Glucophage', 'Diabetes', 'Tablet', '500mg', 'Tablet', 'Merck', 'Germany', 'Type 2 diabetes treatment', 'Metformin HCl', 'Type 2 diabetes', 'Kidney disease, acidosis', 'GI upset, B12 deficiency', 'Stop before CT scan with contrast', 'Increased hypoglycemia risk with other drugs', 'Store at 15-25C', 1, 8.99, 1, '/medicines/metformin.jpg', '2024-01-01', NULL),
(5, 'Amlodipine 5mg', 'Amlodipine', 'Norvasc', 'Cardiovascular', 'Tablet', '5mg', 'Tablet', 'Pfizer', 'USA', 'Blood pressure medication', 'Amlodipine besylate', 'Hypertension, angina', 'Hypotension, cardiogenic shock', 'Ankle swelling, headache', 'Monitor blood pressure regularly', 'Increased effect with grapefruit', 'Store below 30C', 1, 18.99, 1, '/medicines/amlodipine.jpg', '2024-01-01', NULL),
(6, 'Cetirizine 10mg', 'Cetirizine', 'Zyrtec', 'Allergy', 'Tablet', '10mg', 'Tablet', 'UCB', 'Belgium', 'Second generation antihistamine', 'Cetirizine HCl', 'Allergic rhinitis, urticaria', 'Severe kidney disease', 'Drowsiness, dry mouth', 'Caution when driving', 'Increased sedation with alcohol', 'Store below 25C', 0, 9.99, 1, '/medicines/cetirizine.jpg', '2024-01-01', NULL),
(7, 'Vitamin C 1000mg', 'Ascorbic Acid', 'Emergen-C', 'Vitamin - Mineral', 'Effervescent', '1000mg', 'Tablet', 'Pfizer', 'USA', 'Vitamin C supplement', 'Ascorbic acid', 'Vitamin C deficiency, immune support', 'Kidney stones (oxalate)', 'GI upset at high doses', 'Do not exceed 2000mg per day', 'Increases iron absorption', 'Store in dry place', 0, 12.99, 1, '/medicines/vitaminc.jpg', '2024-01-01', NULL),
(8, 'Ibuprofen 400mg', 'Ibuprofen', 'Advil', 'Pain Relief - Anti-inflammatory', 'Tablet', '400mg', 'Tablet', 'Pfizer', 'USA', 'NSAID pain reliever', 'Ibuprofen', 'Headache, muscle pain, arthritis', 'Gastric ulcer, kidney disease', 'Stomach pain, nausea', 'Take with food', 'Increased bleeding risk with aspirin', 'Store below 25C', 0, 7.99, 1, '/medicines/ibuprofen.jpg', '2024-01-01', NULL),
(9, 'Salbutamol 100mcg', 'Salbutamol', 'Ventolin', 'Respiratory', 'Inhaler', '100mcg', 'Puff', 'GSK', 'UK', 'Bronchodilator inhaler', 'Salbutamol sulfate', 'Asthma, bronchospasm', 'Heart arrhythmia', 'Rapid heartbeat, tremor', 'Do not overuse', 'Increased effect with theophylline', 'Store below 30C', 1, 35.99, 1, '/medicines/salbutamol.jpg', '2024-01-01', NULL),
(10, 'Allopurinol 300mg', 'Allopurinol', 'Zyloprim', 'Gout', 'Tablet', '300mg', 'Tablet', 'Takeda', 'Japan', 'Uric acid reducer', 'Allopurinol', 'Gout, hyperuricemia', 'Allopurinol allergy', 'Rash, liver problems', 'Drink plenty of water', 'Increased azathioprine toxicity', 'Store below 25C, protect from moisture', 1, 14.99, 1, '/medicines/allopurinol.jpg', '2024-01-01', NULL);
SET IDENTITY_INSERT Medicines OFF;

-- 9. DOCTOR_SCHEDULES (10 schedules)
SET IDENTITY_INSERT DoctorSchedules ON;
INSERT INTO DoctorSchedules (ScheduleID, DoctorId, dayOfWeek, startTime, endTime, SlotDuration, MaxPatients, Available, consultationType, location, notes) VALUES
(1, 'user-d01', 1, '08:00', '12:00', 30, 1, 1, 'Video', NULL, 'Monday morning video consultations'),
(2, 'user-d01', 1, '14:00', '17:00', 30, 1, 1, 'Offline', 'Manhattan Health Clinic', 'Monday afternoon in-person'),
(3, 'user-d02', 2, '08:00', '11:30', 20, 2, 1, 'Video', NULL, 'Pediatric online consultations'),
(4, 'user-d03', 3, '09:00', '12:00', 45, 1, 1, 'Video', NULL, 'Cardiology consultations'),
(5, 'user-d04', 4, '07:30', '11:30', 30, 1, 1, 'Offline', 'Chicago Medical Center', 'Surgery consultations'),
(6, 'user-d05', 5, '08:00', '12:00', 30, 1, 1, 'Video', NULL, 'OB/GYN video consultations'),
(7, 'user-d06', 6, '09:00', '12:00', 20, 2, 1, 'Video', NULL, 'Dermatology online sessions'),
(8, 'user-d07', 1, '14:00', '18:00', 40, 1, 1, 'Offline', 'Boston Neuro Institute', 'Neurology appointments'),
(9, 'user-d08', 2, '08:00', '11:00', 30, 1, 1, 'Offline', 'Philadelphia Eye Center', 'Eye examinations'),
(10, 'user-d09', 3, '13:30', '17:00', 25, 2, 1, 'Video', NULL, 'ENT video consultations');
SET IDENTITY_INSERT DoctorSchedules OFF;

-- 10. DOCTOR_SCHEDULE_EXCEPTIONS (10 exceptions)
SET IDENTITY_INSERT DoctorScheduleExceptions ON;
INSERT INTO DoctorScheduleExceptions (ExceptionID, DoctorId, exceptionDate, exceptionType, startTime, endTime, reason, Recurring, recurringUntil) VALUES
(1, 'user-d01', '2024-06-01', 'DayOff', NULL, NULL, 'Holiday - Memorial Day', 0, NULL),
(2, 'user-d02', '2024-05-20', 'Modified', '09:00', '11:00', 'Staff meeting in morning', 0, NULL),
(3, 'user-d03', '2024-06-10', 'DayOff', NULL, NULL, 'International Cardiology Conference', 0, NULL),
(4, 'user-d04', '2024-05-25', 'DayOff', NULL, NULL, 'Personal leave', 0, NULL),
(5, 'user-d05', '2024-06-15', 'Modified', '08:00', '10:00', 'Limited hours only', 0, NULL),
(6, 'user-d06', '2024-05-30', 'DayOff', NULL, NULL, 'Medical training', 1, '2024-06-30'),
(7, 'user-d07', '2024-06-05', 'DayOff', NULL, NULL, 'Sick leave', 0, NULL),
(8, 'user-d08', '2024-05-28', 'Modified', '08:00', '09:30', 'Morning surgery scheduled', 0, NULL),
(9, 'user-d09', '2024-06-20', 'DayOff', NULL, NULL, 'Business trip', 0, NULL),
(10, 'user-d10', '2024-05-27', 'DayOff', NULL, NULL, 'Annual leave', 0, NULL);
SET IDENTITY_INSERT DoctorScheduleExceptions OFF;

-- 11. APPOINTMENTS (10 appointments)
SET IDENTITY_INSERT Appointments ON;
INSERT INTO Appointments (AppointmentID, AppointmentTime, ConsultationType, Status, symptoms, notes, fee, endTime, cancelReason, cancelledBy, cancelledAt, rescheduledFrom, reminderSent, confirmedAt, PatientID, DoctorID) VALUES
(1, '2024-05-10 09:00:00', 'Video', 'Completed', 'Headache and fatigue for 3 days', 'Patient needs follow-up', 150.00, '2024-05-10 09:30:00', NULL, NULL, NULL, NULL, 1, '2024-05-09 15:00:00', 'user-p01', 'user-d01'),
(2, '2024-05-11 10:00:00', 'Video', 'Completed', 'Child has fever and dry cough', 'Prescription provided', 120.00, '2024-05-11 10:20:00', NULL, NULL, NULL, NULL, 1, '2024-05-10 18:00:00', 'user-p02', 'user-d02'),
(3, '2024-05-12 09:30:00', 'Video', 'Completed', 'Chest pain and shortness of breath', 'Additional tests required', 250.00, '2024-05-12 10:15:00', NULL, NULL, NULL, NULL, 1, '2024-05-11 14:00:00', 'user-p03', 'user-d03'),
(4, '2024-05-15 08:00:00', 'Offline', 'Completed', 'Abdominal pain in upper region', 'Surgery consultation', 180.00, '2024-05-15 08:30:00', NULL, NULL, NULL, NULL, 1, '2024-05-14 10:00:00', 'user-p04', 'user-d04'),
(5, '2024-05-16 14:00:00', 'Video', 'Completed', 'Routine prenatal checkup', 'Baby developing normally', 140.00, '2024-05-16 14:30:00', NULL, NULL, NULL, NULL, 1, '2024-05-15 09:00:00', 'user-p05', 'user-d05'),
(6, '2024-05-18 09:00:00', 'Video', 'Scheduled', 'Skin rash all over body', NULL, 110.00, NULL, NULL, NULL, NULL, NULL, 1, '2024-05-17 16:00:00', 'user-p06', 'user-d06'),
(7, '2024-05-20 15:00:00', 'Offline', 'Confirmed', 'Severe headache and dizziness', NULL, 220.00, NULL, NULL, NULL, NULL, NULL, 1, '2024-05-19 11:00:00', 'user-p07', 'user-d07'),
(8, '2024-05-22 08:30:00', 'Offline', 'Scheduled', 'Blurry vision and eye pain', NULL, 160.00, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'user-p08', 'user-d08'),
(9, '2024-05-13 14:00:00', 'Video', 'Cancelled', 'Sore throat, difficulty swallowing', 'Patient cancelled', NULL, NULL, 'Unexpected work commitment', 'Patient', '2024-05-13 08:00:00', NULL, 1, '2024-05-12 20:00:00', 'user-p09', 'user-d09'),
(10, '2024-05-25 10:00:00', 'Offline', 'Scheduled', 'Toothache and swollen gums', NULL, 90.00, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'user-p10', 'user-d10');
SET IDENTITY_INSERT Appointments OFF;

-- 12. CONSULTATIONS (10 consultations)
SET IDENTITY_INSERT Consultations ON;
INSERT INTO Consultations (ConsultationID, AppointmentId, startTime, endTime, doctorNotes, diagnosis, followUpDate, consultationType, roomId, roomUrl, recordingUrl, duration, symptoms, treatmentPlan, followUpNotes) VALUES
(1, 1, '2024-05-10 09:00:00', '2024-05-10 09:28:00', 'Patient shows signs of stress and sleep deprivation', 'Mild anxiety disorder, work-related stress', '2024-05-24', 'Video', 'room-001', 'https://meet.healthlink.com/room-001', NULL, 28, 'Headache, fatigue', 'Rest, stress management, medication as prescribed', 'Follow up in 2 weeks'),
(2, 2, '2024-05-11 10:00:00', '2024-05-11 10:18:00', 'Child has viral infection, no serious symptoms', 'Upper respiratory tract infection - viral', '2024-05-18', 'Video', 'room-002', 'https://meet.healthlink.com/room-002', NULL, 18, 'Fever, dry cough', 'Fever medication, rest, fluid intake', 'Return if fever persists after 3 days'),
(3, 3, '2024-05-12 09:30:00', '2024-05-12 10:10:00', 'Suspected coronary artery disease, needs ECG and echo', 'Chest pain - suspected myocardial ischemia', '2024-05-19', 'Video', 'room-003', 'https://meet.healthlink.com/room-003', 'https://storage.healthlink.com/rec-003.mp4', 40, 'Chest pain, shortness of breath', 'ECG, echocardiogram, cardiac enzymes test', 'Return with test results'),
(4, 4, '2024-05-15 08:00:00', '2024-05-15 08:25:00', 'Acute appendicitis confirmed, surgery required', 'Acute appendicitis', '2024-05-22', 'Offline', NULL, NULL, NULL, 25, 'Abdominal pain', 'Hospital admission, surgery preparation', 'Post-surgery follow-up'),
(5, 5, '2024-05-16 14:00:00', '2024-05-16 14:25:00', '20 weeks pregnant, fetal development normal, heartbeat regular', 'Normal pregnancy', '2024-06-16', 'Video', 'room-005', 'https://meet.healthlink.com/room-005', NULL, 25, 'Routine prenatal checkup', 'Continue prenatal vitamins, balanced diet', 'Next checkup in 4 weeks'),
(6, 6, '2024-05-18 09:00:00', NULL, NULL, NULL, NULL, 'Video', 'room-006', 'https://meet.healthlink.com/room-006', NULL, NULL, 'Skin rash', NULL, NULL),
(7, 7, '2024-05-20 15:00:00', NULL, NULL, NULL, NULL, 'Offline', NULL, NULL, NULL, NULL, 'Headache, dizziness', NULL, NULL),
(8, 8, NULL, NULL, NULL, NULL, NULL, 'Offline', NULL, NULL, NULL, NULL, 'Blurry vision, eye pain', NULL, NULL),
(9, 9, NULL, NULL, 'Patient cancelled appointment', NULL, NULL, 'Video', 'room-009', NULL, NULL, NULL, 'Sore throat', NULL, NULL),
(10, 10, NULL, NULL, NULL, NULL, NULL, 'Offline', NULL, NULL, NULL, NULL, 'Toothache', NULL, NULL);
SET IDENTITY_INSERT Consultations OFF;

-- 13. HEALTH_RECORDS (10 health records)
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

-- 14. MEDICAL_DOCUMENTS (10 documents)
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

-- 15. VITAL_SIGNS (10 vital signs)
SET IDENTITY_INSERT VitalSigns ON;
INSERT INTO VitalSigns (VitalSignID, PatientID, heartRate, bloodPressureSystolic, bloodPressureDiastolic, temperature, oxygenSaturation, respiratoryRate, bloodGlucose, weight, height, bmi, notes, measuredAt, source, deviceName, CreatedAt) VALUES
(1, 'user-p01', 72, 120, 80, 98.6, 98, 16, NULL, 70.0, 175.0, 22.9, 'Normal readings', '2024-05-10 08:30:00', 'Manual', NULL, '2024-05-10 08:30:00'),
(2, 'user-p02', 80, 118, 75, 99.1, 99, 18, NULL, 58.0, 165.0, 21.3, 'Slightly elevated HR due to anxiety', '2024-05-11 09:45:00', 'Device', 'Omron BP Monitor', '2024-05-11 09:45:00'),
(3, 'user-p03', 78, 135, 88, 98.8, 97, 17, 145.0, 85.0, 178.0, 26.8, 'Elevated BP and blood glucose', '2024-05-12 09:00:00', 'Device', 'Accu-Chek', '2024-05-12 09:00:00'),
(4, 'user-p04', 68, 110, 70, 98.4, 99, 15, NULL, 52.0, 160.0, 20.3, 'Healthy readings', '2024-05-15 07:30:00', 'Manual', NULL, '2024-05-15 07:30:00'),
(5, 'user-p05', 85, 148, 95, 98.9, 96, 18, NULL, 78.0, 180.0, 24.1, 'High BP needs monitoring', '2024-05-16 13:30:00', 'Device', 'Fitbit', '2024-05-16 13:30:00'),
(6, 'user-p06', 75, 115, 72, 98.6, 95, 20, NULL, 55.0, 163.0, 20.7, 'Lower SpO2 due to asthma', '2024-05-18 08:45:00', 'Device', 'Apple Watch', '2024-05-18 08:45:00'),
(7, 'user-p07', 82, 140, 90, 99.3, 97, 17, NULL, 80.0, 172.0, 27.0, 'Borderline high BP', '2024-05-20 14:30:00', 'Manual', NULL, '2024-05-20 14:30:00'),
(8, 'user-p08', 70, 118, 78, 98.8, 99, 16, NULL, 60.0, 168.0, 21.3, 'Normal readings', '2024-05-01 10:00:00', 'Manual', NULL, '2024-05-01 10:00:00'),
(9, 'user-p09', 76, 122, 80, 98.6, 98, 16, NULL, 75.0, 182.0, 22.6, 'Stable', '2024-05-13 13:00:00', 'Device', 'Samsung Galaxy Watch', '2024-05-13 13:00:00'),
(10, 'user-p10', 74, 130, 85, 98.9, 97, 17, NULL, 62.0, 158.0, 24.8, 'Slightly elevated BP', '2024-05-25 09:30:00', 'Manual', NULL, '2024-05-25 09:30:00');
SET IDENTITY_INSERT VitalSigns OFF;

-- 16. INVOICES (10 invoices)
SET IDENTITY_INSERT Invoices ON;
INSERT INTO Invoices (InvoiceID, AppointmentId, PatientID, amount, issueDate, status, invoiceNumber, consultationFee, medicineFee, deliveryFee, discount, tax, dueDate, paidAt, notes) VALUES
(1, 1, 'user-p01', 175.00, '2024-05-10 09:30:00', 'Paid', 'INV-2024-0001', 150.00, 25.00, 0, 0, 0, '2024-05-17', '2024-05-10 09:35:00', 'Paid online'),
(2, 2, 'user-p02', 155.00, '2024-05-11 10:20:00', 'Paid', 'INV-2024-0002', 120.00, 35.00, 0, 0, 0, '2024-05-18', '2024-05-11 10:25:00', 'Paid via PayPal'),
(3, 3, 'user-p03', 320.00, '2024-05-12 10:15:00', 'Paid', 'INV-2024-0003', 250.00, 70.00, 0, 0, 0, '2024-05-19', '2024-05-12 10:20:00', 'Includes lab test fees'),
(4, 4, 'user-p04', 180.00, '2024-05-15 08:30:00', 'Pending', 'INV-2024-0004', 180.00, 0, 0, 0, 0, '2024-05-22', NULL, 'Awaiting payment'),
(5, 5, 'user-p05', 165.00, '2024-05-16 14:30:00', 'Paid', 'INV-2024-0005', 140.00, 25.00, 0, 0, 0, '2024-05-23', '2024-05-16 14:35:00', 'Paid'),
(6, 6, 'user-p06', 110.00, '2024-05-18 09:00:00', 'Pending', 'INV-2024-0006', 110.00, 0, 0, 0, 0, '2024-05-25', NULL, 'Pending consultation'),
(7, 7, 'user-p07', 220.00, '2024-05-20 15:00:00', 'Pending', 'INV-2024-0007', 220.00, 0, 0, 0, 0, '2024-05-27', NULL, '50% deposit paid'),
(8, 8, 'user-p08', 160.00, '2024-05-22 08:30:00', 'Pending', 'INV-2024-0008', 160.00, 0, 0, 0, 0, '2024-05-29', NULL, 'Not yet paid'),
(9, 9, 'user-p09', 0, '2024-05-13 14:00:00', 'Cancelled', 'INV-2024-0009', 100.00, 0, 0, 100.00, 0, '2024-05-20', NULL, 'Refunded due to cancellation'),
(10, 10, 'user-p10', 90.00, '2024-05-25 10:00:00', 'Pending', 'INV-2024-0010', 90.00, 0, 0, 0, 0, '2024-06-01', NULL, 'Pending consultation');
SET IDENTITY_INSERT Invoices OFF;

-- 17. PAYMENTS (10 payments)
SET IDENTITY_INSERT Payments ON;
INSERT INTO Payments (PaymentID, InvoiceID, amount, paymentMethod, paymentGateway, transactionId, status, paidAt, failureReason, refundedAmount, refundedAt, refundReason, metadata, CreatedAt) VALUES
(1, 1, 175.00, 'Card', 'Stripe', 'STR20240510001', 'Completed', '2024-05-10 09:35:00', NULL, NULL, NULL, NULL, '{"cardLast4":"4242","cardBrand":"Visa"}', '2024-05-10 09:35:00'),
(2, 2, 155.00, 'EWallet', 'PayPal', 'PP20240511001', 'Completed', '2024-05-11 10:25:00', NULL, NULL, NULL, NULL, '{"payerId":"PAYPAL123"}', '2024-05-11 10:25:00'),
(3, 3, 320.00, 'Card', 'Stripe', 'STR20240512001', 'Completed', '2024-05-12 10:20:00', NULL, NULL, NULL, NULL, '{"cardLast4":"1234","cardBrand":"Mastercard"}', '2024-05-12 10:20:00'),
(4, 4, 90.00, 'Cash', NULL, NULL, 'Completed', '2024-05-15 08:00:00', NULL, NULL, NULL, NULL, NULL, '2024-05-15 08:00:00'),
(5, 5, 165.00, 'Card', 'Stripe', 'STR20240516001', 'Completed', '2024-05-16 14:35:00', NULL, NULL, NULL, NULL, '{"cardLast4":"5678","cardBrand":"Amex"}', '2024-05-16 14:35:00'),
(6, 6, 110.00, 'EWallet', 'Apple Pay', 'AP20240518001', 'Pending', NULL, NULL, NULL, NULL, NULL, '{"deviceId":"iPhone15"}', '2024-05-18 09:00:00'),
(7, 7, 110.00, 'Card', 'Stripe', 'STR20240519001', 'Completed', '2024-05-19 11:00:00', NULL, NULL, NULL, NULL, '{"cardLast4":"9012","cardBrand":"Visa"}', '2024-05-19 11:00:00'),
(8, 8, 160.00, 'Card', NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-22 08:30:00'),
(9, 9, 100.00, 'EWallet', 'PayPal', 'PP20240512002', 'Refunded', '2024-05-12 20:00:00', NULL, 100.00, '2024-05-13 09:00:00', 'Patient cancelled appointment', '{"refundId":"RF001"}', '2024-05-12 20:00:00'),
(10, 10, 90.00, 'Cash', NULL, NULL, 'Pending', NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-25 10:00:00');
SET IDENTITY_INSERT Payments OFF;

-- 18. PRESCRIPTION_HEADERS (10 prescriptions)
SET IDENTITY_INSERT PrescriptionHeaders ON;
INSERT INTO PrescriptionHeaders (PrescriptionHeaderID, AppointmentId, PatientID, DoctorID, issueDate, diagnosis, notes, validUntil, status, totalAmount) VALUES
(1, 1, 'user-p01', 'user-d01', '2024-05-10', 'Mild anxiety disorder', 'Take medication regularly, follow up in 2 weeks', '2024-06-10', 'Active', 45.00),
(2, 2, 'user-p02', 'user-d02', '2024-05-11', 'Upper respiratory infection', 'Ensure child drinks plenty of fluids', '2024-05-18', 'Active', 35.00),
(3, 3, 'user-p03', 'user-d03', '2024-05-12', 'Suspected angina', 'Continue BP medication, return with test results', '2024-06-12', 'Active', 75.00),
(4, 4, 'user-p04', 'user-d04', '2024-05-15', 'Post-operative care', 'Pain management after surgery', '2024-05-22', 'Active', 40.00),
(5, 5, 'user-p05', 'user-d05', '2024-05-16', 'Normal pregnancy', 'Prenatal vitamin supplementation', '2024-07-16', 'Active', 55.00),
(6, 1, 'user-p01', 'user-d01', '2024-04-10', 'Common cold', 'Previous prescription', '2024-04-17', 'Expired', 25.00),
(7, 2, 'user-p02', 'user-d02', '2024-03-15', 'Gastritis', 'Regular gastric medication', '2024-04-15', 'Completed', 50.00),
(8, 3, 'user-p03', 'user-d03', '2024-04-01', 'Type 2 diabetes', 'Monthly diabetes medication', '2024-05-01', 'Completed', 65.00),
(9, 5, 'user-p05', 'user-d05', '2024-04-16', 'Hypertension', 'April BP medication', '2024-05-16', 'Completed', 60.00),
(10, 7, 'user-p07', 'user-d07', '2024-04-20', 'Acute gout', 'Acute episode treatment', '2024-05-20', 'Active', 48.00);
SET IDENTITY_INSERT PrescriptionHeaders OFF;

-- 19. PRESCRIPTION_ITEMS (10 items)
SET IDENTITY_INSERT PrescriptionItems ON;
INSERT INTO PrescriptionItems (PrescriptionItemID, PrescriptionHeaderID, medicationName, dosage, instructions, totalSupplyDays, MedicineID, quantity, unit, frequency, timing, route, unitPrice, totalPrice, notes) VALUES
(1, 1, 'Paracetamol 500mg', '500mg', 'Take when headache occurs, max 3 tablets per day', 7, 1, 21, 'Tablet', '3 times daily', 'As needed', 'Oral', 0.30, 6.30, NULL),
(2, 1, 'Vitamin C 1000mg', '1000mg', 'Take 1 tablet in morning after breakfast', 14, 7, 14, 'Tablet', 'Once daily', 'Morning', 'Oral', 0.93, 13.02, 'Immune support'),
(3, 2, 'Paracetamol 500mg', '250mg', 'Take when fever exceeds 100.4F', 5, 1, 10, 'Tablet', 'As needed', 'When fever', 'Oral', 0.30, 3.00, 'Half tablet for child'),
(4, 2, 'Cetirizine 10mg', '5mg', 'Take once before bedtime', 7, 6, 7, 'Tablet', 'Once daily', 'Night', 'Oral', 0.71, 4.97, 'Half tablet'),
(5, 3, 'Amlodipine 5mg', '5mg', 'Take 1 tablet every morning', 30, 5, 30, 'Tablet', 'Once daily', 'Morning', 'Oral', 0.63, 18.90, 'Maintain blood pressure'),
(6, 4, 'Ibuprofen 400mg', '400mg', 'Take after meals when in pain', 5, 8, 15, 'Tablet', '3 times daily', 'After meals', 'Oral', 0.53, 7.95, 'Do not take on empty stomach'),
(7, 5, 'Prenatal Multivitamin', '1 tablet', 'Take 1 tablet daily after breakfast', 30, NULL, 30, 'Tablet', 'Once daily', 'Morning', 'Oral', 1.83, 54.90, 'Prenatal vitamin'),
(8, 8, 'Metformin 500mg', '500mg', 'Take after breakfast and dinner', 30, 4, 60, 'Tablet', 'Twice daily', 'Morning, evening', 'Oral', 0.30, 18.00, NULL),
(9, 9, 'Amlodipine 5mg', '5mg', 'Take every morning', 30, 5, 30, 'Tablet', 'Once daily', 'Morning', 'Oral', 0.63, 18.90, NULL),
(10, 10, 'Allopurinol 300mg', '300mg', 'Take after breakfast', 30, 10, 30, 'Tablet', 'Once daily', 'Morning', 'Oral', 0.50, 15.00, 'Drink plenty of water');
SET IDENTITY_INSERT PrescriptionItems OFF;

-- 20. PHARMACY_ORDERS (10 orders)
SET IDENTITY_INSERT PharmacyOrders ON;
INSERT INTO PharmacyOrders (OrderID, orderNumber, PrescriptionHeaderId, PharmacyId, PatientId, status, deliveryType, deliveryAddress, deliveryLatitude, deliveryLongitude, deliveryFee, medicineAmount, totalAmount, paymentStatus, paymentMethod, notes, pharmacistNotes, estimatedDeliveryTime, actualDeliveryTime, confirmedAt, preparingAt, shippedAt, deliveredAt, cancelledAt, cancelReason, cancelledBy, createdAt) VALUES
(1, 'ORD-2024-0001', 1, 'user-ph01', 'user-p01', 'Delivered', 'Delivery', '45 Oak Street, Apt 3B, New York, NY', 40.7128, -74.0060, 5.99, 45.00, 50.99, 'Paid', 'COD', 'Deliver during office hours', 'Prescription verified', '2024-05-10 14:00:00', '2024-05-10 13:45:00', '2024-05-10 10:00:00', '2024-05-10 10:30:00', '2024-05-10 11:00:00', '2024-05-10 13:45:00', NULL, NULL, NULL, '2024-05-10 09:40:00'),
(2, 'ORD-2024-0002', 2, 'user-ph02', 'user-p02', 'Delivered', 'Delivery', '123 Maple Avenue, Los Angeles, CA', 34.0522, -118.2437, 6.99, 35.00, 41.99, 'Paid', 'Card', 'Urgent for child', 'Priority delivery', '2024-05-11 15:00:00', '2024-05-11 14:30:00', '2024-05-11 11:00:00', '2024-05-11 11:30:00', '2024-05-11 12:00:00', '2024-05-11 14:30:00', NULL, NULL, NULL, '2024-05-11 10:30:00'),
(3, 'ORD-2024-0003', 3, 'user-ph04', 'user-p03', 'Shipped', 'Delivery', '78 Pine Road, Chicago, IL', 41.8781, -87.6298, 7.99, 75.00, 82.99, 'Paid', 'EWallet', NULL, 'In transit', '2024-05-12 16:00:00', NULL, '2024-05-12 11:00:00', '2024-05-12 11:30:00', '2024-05-12 14:00:00', NULL, NULL, NULL, NULL, '2024-05-12 10:30:00'),
(4, 'ORD-2024-0004', 4, 'user-ph06', 'user-p04', 'Preparing', 'Pickup', NULL, NULL, NULL, 0, 40.00, 40.00, 'Pending', 'Cash', 'Will pick up in person', 'Preparing order', NULL, NULL, '2024-05-15 09:00:00', '2024-05-15 09:30:00', NULL, NULL, NULL, NULL, NULL, '2024-05-15 08:35:00'),
(5, 'ORD-2024-0005', 5, 'user-ph02', 'user-p05', 'Confirmed', 'Delivery', '234 Elm Street, San Francisco, CA', 37.7749, -122.4194, 6.99, 55.00, 61.99, 'Paid', 'Card', NULL, NULL, '2024-05-16 18:00:00', NULL, '2024-05-16 15:00:00', NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-16 14:40:00'),
(6, 'ORD-2024-0006', 6, 'user-ph05', 'user-p01', 'Cancelled', 'Delivery', '45 Oak Street, New York', 40.7128, -74.0060, 5.49, 25.00, 30.49, 'Refunded', 'EWallet', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-04-11 08:00:00', 'Prescription expired', 'System', '2024-04-10 16:00:00'),
(7, 'ORD-2024-0007', 7, 'user-ph02', 'user-p02', 'Delivered', 'Delivery', '123 Maple Avenue, Los Angeles', 34.0522, -118.2437, 6.99, 50.00, 56.99, 'Paid', 'COD', NULL, 'OK', '2024-03-16 12:00:00', '2024-03-16 11:30:00', '2024-03-15 16:00:00', '2024-03-15 16:30:00', '2024-03-16 09:00:00', '2024-03-16 11:30:00', NULL, NULL, NULL, '2024-03-15 15:30:00'),
(8, 'ORD-2024-0008', 8, 'user-ph04', 'user-p03', 'Delivered', 'Pickup', NULL, NULL, NULL, 0, 65.00, 65.00, 'Paid', 'Cash', 'Store pickup', 'Completed', NULL, '2024-04-02 10:00:00', '2024-04-01 14:00:00', '2024-04-01 14:30:00', NULL, '2024-04-02 10:00:00', NULL, NULL, NULL, '2024-04-01 13:00:00'),
(9, 'ORD-2024-0009', 9, 'user-ph01', 'user-p05', 'Delivered', 'Delivery', '234 Elm Street, San Francisco', 37.7749, -122.4194, 5.99, 60.00, 65.99, 'Paid', 'Card', NULL, 'Delivered successfully', '2024-04-17 15:00:00', '2024-04-17 14:30:00', '2024-04-16 17:00:00', '2024-04-16 17:30:00', '2024-04-17 09:00:00', '2024-04-17 14:30:00', NULL, NULL, NULL, '2024-04-16 16:30:00'),
(10, 'ORD-2024-0010', 10, 'user-ph07', 'user-p07', 'Pending', 'Delivery', '12 Walnut Drive, Miami, FL', 25.7617, -80.1918, 5.99, 48.00, 53.99, 'Pending', 'COD', 'Afternoon delivery', NULL, '2024-05-21 17:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-05-20 15:30:00');
SET IDENTITY_INSERT PharmacyOrders OFF;

-- 21. CHAT_ROOMS (10 chat rooms)
INSERT INTO ChatRooms (ChatRoomId, user1Id, user2Id, user1DisplayName, user1PhotoURL, user2DisplayName, user2PhotoURL, lastMessage, lastMessageAt, AppointmentId) VALUES
('chat-001', 'user-p01', 'user-d01', 'Michael Anderson', '/avatars/patient01.jpg', 'Dr. John Smith', '/avatars/doctor01.jpg', 'Thank you, doctor!', '2024-05-10 09:35:00', 1),
('chat-002', 'user-p02', 'user-d02', 'Emma Thompson', '/avatars/patient02.jpg', 'Dr. Sarah Johnson', '/avatars/doctor02.jpg', 'The fever has gone down', '2024-05-12 08:00:00', 2),
('chat-003', 'user-p03', 'user-d03', 'William Brown', '/avatars/patient03.jpg', 'Dr. Michael Chen', '/avatars/doctor03.jpg', 'I will get the tests done right away', '2024-05-12 10:20:00', 3),
('chat-004', 'user-p04', 'user-d04', 'Sophia Garcia', '/avatars/patient04.jpg', 'Dr. Emily Davis', '/avatars/doctor04.jpg', 'Yes, I understand', '2024-05-15 08:35:00', 4),
('chat-005', 'user-p05', 'user-d05', 'James Wilson', '/avatars/patient05.jpg', 'Dr. Jessica Williams', '/avatars/doctor05.jpg', 'Great news about the baby!', '2024-05-16 14:40:00', 5),
('chat-006', 'user-p06', 'user-d06', 'Olivia Davis', '/avatars/patient06.jpg', 'Dr. Robert Brown', '/avatars/doctor06.jpg', 'Hello doctor', '2024-05-17 16:00:00', 6),
('chat-007', 'user-p07', 'user-d07', 'Daniel Miller', '/avatars/patient07.jpg', 'Dr. David Wilson', '/avatars/doctor07.jpg', 'I am waiting for the appointment', '2024-05-19 11:05:00', 7),
('chat-008', 'user-p08', 'user-d08', 'Isabella Moore', '/avatars/patient08.jpg', 'Dr. Amanda Lee', '/avatars/doctor08.jpg', NULL, NULL, 8),
('chat-009', 'user-p09', 'user-d09', 'Alexander Johnson', '/avatars/patient09.jpg', 'Dr. James Taylor', '/avatars/doctor09.jpg', 'Sorry I have to cancel', '2024-05-13 08:05:00', 9),
('chat-010', 'user-p10', 'user-d10', 'Charlotte Taylor', '/avatars/patient10.jpg', 'Dr. Jennifer Martinez', '/avatars/doctor10.jpg', NULL, NULL, 10);

-- 22. MESSAGES (10 messages)
SET IDENTITY_INSERT ChatMessages ON;
INSERT INTO ChatMessages (MessageID, ChatRoomId, SenderId, ReceiverId, content, photoURL, imageUrl, IsRead, SentAt) VALUES
(1, 'chat-001', 'user-d01', 'user-p01', 'Hi Michael, can you describe your headache symptoms?', '/avatars/doctor01.jpg', NULL, 1, '2024-05-10 09:02:00'),
(2, 'chat-001', 'user-p01', 'user-d01', 'I have been having a dull pain on the right side of my head for 3 days', '/avatars/patient01.jpg', NULL, 1, '2024-05-10 09:05:00'),
(3, 'chat-001', 'user-d01', 'user-p01', 'Are you getting enough sleep? Any work-related stress?', '/avatars/doctor01.jpg', NULL, 1, '2024-05-10 09:08:00'),
(4, 'chat-001', 'user-p01', 'user-d01', 'Actually, I have been working a lot lately and not sleeping well', '/avatars/patient01.jpg', NULL, 1, '2024-05-10 09:10:00'),
(5, 'chat-001', 'user-p01', 'user-d01', 'Thank you, doctor!', '/avatars/patient01.jpg', NULL, 1, '2024-05-10 09:35:00'),
(6, 'chat-002', 'user-d02', 'user-p02', 'How high is the fever and when did it start?', '/avatars/doctor02.jpg', NULL, 1, '2024-05-11 10:02:00'),
(7, 'chat-002', 'user-p02', 'user-d02', 'The fever was 101.3F since last night, with dry cough', '/avatars/patient02.jpg', NULL, 1, '2024-05-11 10:05:00'),
(8, 'chat-002', 'user-p02', 'user-d02', 'The fever has gone down', '/avatars/patient02.jpg', NULL, 1, '2024-05-12 08:00:00'),
(9, 'chat-003', 'user-d03', 'user-p03', 'You need to get an ECG and cardiac enzyme test as soon as possible', '/avatars/doctor03.jpg', NULL, 1, '2024-05-12 10:15:00'),
(10, 'chat-003', 'user-p03', 'user-d03', 'I will get the tests done right away', '/avatars/patient03.jpg', NULL, 1, '2024-05-12 10:20:00');
SET IDENTITY_INSERT ChatMessages OFF;

-- 23. NOTIFICATIONS (10 notifications)
SET IDENTITY_INSERT Notifications ON;
INSERT INTO Notifications (NotificationID, UserId, type, message, relatedId, IsRead, CreatedAt, appointmentId, title, imageUrl, actionUrl, priority, expiresAt, sentVia) VALUES
(1, 'user-p01', 'AppointmentReminder', 'You have an appointment with Dr. John Smith tomorrow at 9:00 AM', 1, 1, '2024-05-09 18:00:00', 1, 'Appointment Reminder', '/icons/calendar.png', '/appointments/1', 'High', '2024-05-10 09:00:00', 'Push'),
(2, 'user-d01', 'NewAppointment', 'New appointment booked by Michael Anderson', 1, 1, '2024-05-09 15:00:00', 1, 'New Appointment', '/icons/appointment.png', '/doctor/appointments/1', 'Normal', NULL, 'Push'),
(3, 'user-p02', 'PrescriptionReady', 'Your prescription is ready for pickup or delivery', 2, 1, '2024-05-11 10:25:00', 2, 'Prescription Ready', '/icons/prescription.png', '/prescriptions/2', 'Normal', NULL, 'Email'),
(4, 'user-p03', 'AppointmentConfirmed', 'Your appointment has been confirmed', 3, 1, '2024-05-11 14:05:00', 3, 'Appointment Confirmed', '/icons/check.png', '/appointments/3', 'Normal', NULL, 'Push'),
(5, 'user-ph01', 'NewOrder', 'New order received from Michael Anderson', 1, 1, '2024-05-10 09:40:00', NULL, 'New Order', '/icons/order.png', '/pharmacy/orders/1', 'High', NULL, 'Push'),
(6, 'user-p01', 'OrderDelivered', 'Your medication order has been delivered successfully', 1, 1, '2024-05-10 13:50:00', NULL, 'Order Delivered', '/icons/delivered.png', '/orders/1', 'Normal', NULL, 'Push'),
(7, 'user-d02', 'ReviewReceived', 'You received a 5-star review from a patient', 1, 0, '2024-05-12 09:00:00', 2, 'New Review', '/icons/star.png', '/doctor/reviews', 'Low', NULL, 'Email'),
(8, 'user-p06', 'AppointmentReminder', 'Your appointment is scheduled for 9:00 AM on May 18th', 6, 0, '2024-05-17 18:00:00', 6, 'Appointment Reminder', '/icons/calendar.png', '/appointments/6', 'High', '2024-05-18 09:00:00', 'Push'),
(9, 'user-p09', 'AppointmentCancelled', 'Your appointment has been cancelled', 9, 1, '2024-05-13 08:05:00', 9, 'Appointment Cancelled', '/icons/cancel.png', '/appointments/9', 'Normal', NULL, 'Push'),
(10, 'user-p07', 'AppointmentConfirmed', 'Your appointment on May 20th has been confirmed', 7, 1, '2024-05-19 11:00:00', 7, 'Appointment Confirmed', '/icons/check.png', '/appointments/7', 'Normal', NULL, 'Push');
SET IDENTITY_INSERT Notifications OFF;

-- 24. REVIEWS (10 reviews)
SET IDENTITY_INSERT Reviews ON;
INSERT INTO Reviews (ReviewID, PatientID, DoctorID, rating, comment, reviewDate, AppointmentId, Anonymous, doctorReply, doctorReplyDate, Visible, HelpfulCount) VALUES
(1, 'user-p01', 'user-d01', 5, 'Dr. Smith was very attentive and thorough. He explained my condition clearly.', '2024-05-10 10:00:00', 1, 0, 'Thank you for your trust. Wishing you good health!', '2024-05-10 12:00:00', 1, 12),
(2, 'user-p02', 'user-d02', 5, 'Dr. Johnson is excellent with children. My daughter felt comfortable. Highly recommend!', '2024-05-12 08:30:00', 2, 0, 'Thank you! Wishing your daughter a speedy recovery!', '2024-05-12 10:00:00', 1, 25),
(3, 'user-p03', 'user-d03', 5, 'Dr. Chen is very knowledgeable and analyzed my condition thoroughly. Very reassuring.', '2024-05-12 11:00:00', 3, 0, NULL, NULL, 1, 8),
(4, 'user-p04', 'user-d04', 4, 'Quick and accurate consultation. Waiting time was a bit long though.', '2024-05-15 09:00:00', 4, 0, 'Thank you for the feedback. We will work on reducing wait times.', '2024-05-15 14:00:00', 1, 5),
(5, 'user-p05', 'user-d05', 5, 'Dr. Williams is gentle and professional. Great prenatal care experience.', '2024-05-16 15:00:00', 5, 0, 'Wishing you and the baby good health!', '2024-05-16 17:00:00', 1, 18),
(6, 'user-p01', 'user-d01', 4, 'Previous visit was also good.', '2024-04-10 10:00:00', 1, 0, NULL, NULL, 1, 3),
(7, 'user-p02', 'user-d02', 5, 'Great doctor, very helpful.', '2024-03-15 11:00:00', 2, 1, NULL, NULL, 1, 7),
(8, 'user-p03', 'user-d03', 5, 'Excellent diabetes management and monitoring. Very satisfied.', '2024-04-01 10:00:00', 3, 0, 'Thank you! Remember to schedule regular checkups!', '2024-04-01 15:00:00', 1, 10),
(9, 'user-p05', 'user-d05', 5, 'Very happy with the service.', '2024-04-16 15:00:00', 5, 0, NULL, NULL, 1, 6),
(10, 'user-p07', 'user-d07', 4, 'Wait time was long but the consultation was very thorough.', '2024-04-20 16:00:00', 7, 0, NULL, NULL, 1, 4);
SET IDENTITY_INSERT Reviews OFF;

-- 25. HEALTH_RECORD_SHARES (10 shares)
SET IDENTITY_INSERT HealthRecordShares ON;
INSERT INTO HealthRecordShares (ShareID, HealthRecordID, sharedDocumentIds, SharedWithDoctorId, SharedByPatientId, PermissionLevel, ConsentGivenAt, ExpiryDate, Revoked, RevokedAt, RevokeReason) VALUES
(1, 1, '1', 'user-d01', 'user-p01', 'View', '2024-05-10 08:30:00', '2024-06-10', 0, NULL, NULL),
(2, 2, '2', 'user-d02', 'user-p02', 'View', '2024-05-11 09:30:00', '2024-06-11', 0, NULL, NULL),
(3, 3, '3', 'user-d03', 'user-p03', 'ViewDownload', '2024-05-12 09:00:00', '2024-07-12', 0, NULL, NULL),
(4, 4, '4', 'user-d04', 'user-p04', 'View', '2024-05-15 07:30:00', '2024-05-22', 0, NULL, NULL),
(5, 5, '5', 'user-d05', 'user-p05', 'View', '2024-05-16 13:30:00', '2024-08-16', 0, NULL, NULL),
(6, 6, '6', 'user-d06', 'user-p06', 'View', '2024-05-17 15:00:00', '2024-06-17', 0, NULL, NULL),
(7, 7, '7', 'user-d07', 'user-p07', 'ViewDownload', '2024-05-19 10:00:00', '2024-06-19', 0, NULL, NULL),
(8, 3, '3', 'user-d01', 'user-p03', 'View', '2024-04-01 09:00:00', '2024-05-01', 1, '2024-05-02 10:00:00', 'Expired'),
(9, 5, '5', 'user-d03', 'user-p05', 'View', '2024-04-15 10:00:00', '2024-05-15', 0, NULL, NULL),
(10, 10, '10', 'user-d07', 'user-p10', 'View', '2024-05-20 09:00:00', '2024-06-20', 0, NULL, NULL);
SET IDENTITY_INSERT HealthRecordShares OFF;

-- 26. REFRESH_TOKENS (10 tokens)
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

-- =====================================================
-- END SEED DATA
-- Total: 26 tables, ~10 records each
-- =====================================================
PRINT 'Seed data completed successfully!';
