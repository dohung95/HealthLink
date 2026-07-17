SET XACT_ABORT ON;
BEGIN TRANSACTION;

UPDATE dbo.Medicines SET imageUrl = '/uploads/medicinces/Paracetamol.webp'    WHERE MedicineID = 1 AND (imageUrl IS NULL OR imageUrl = '' OR imageUrl = '/medicines/paracetamol.jpg');
UPDATE dbo.Medicines SET imageUrl = '/uploads/medicinces/Amoxicillin.jpg'    WHERE MedicineID = 2 AND (imageUrl IS NULL OR imageUrl = '' OR imageUrl = '/medicines/amoxicillin.jpg');
UPDATE dbo.Medicines SET imageUrl = '/uploads/medicinces/Omeprazole.jpg'     WHERE MedicineID = 3 AND (imageUrl IS NULL OR imageUrl = '' OR imageUrl = '/medicines/omeprazole.jpg');
UPDATE dbo.Medicines SET imageUrl = '/uploads/medicinces/Metformin.webp'     WHERE MedicineID = 4 AND (imageUrl IS NULL OR imageUrl = '' OR imageUrl = '/medicines/metformin.jpg');
UPDATE dbo.Medicines SET imageUrl = '/uploads/medicinces/Amlodipine.webp'    WHERE MedicineID = 5 AND (imageUrl IS NULL OR imageUrl = '' OR imageUrl = '/medicines/amlodipine.jpg');
UPDATE dbo.Medicines SET imageUrl = '/uploads/medicinces/Cetirizine.webp'    WHERE MedicineID = 6 AND (imageUrl IS NULL OR imageUrl = '' OR imageUrl = '/medicines/cetirizine.jpg');
UPDATE dbo.Medicines SET imageUrl = '/uploads/medicinces/Ascorbic Acid.jpg'  WHERE MedicineID = 7 AND (imageUrl IS NULL OR imageUrl = '' OR imageUrl = '/medicines/vitaminc.jpg');
UPDATE dbo.Medicines SET imageUrl = '/uploads/medicinces/Ibuprofen.webp'     WHERE MedicineID = 8 AND (imageUrl IS NULL OR imageUrl = '' OR imageUrl = '/medicines/ibuprofen.jpg');
UPDATE dbo.Medicines SET imageUrl = '/uploads/medicinces/Salbutamol.webp'    WHERE MedicineID = 9 AND (imageUrl IS NULL OR imageUrl = '' OR imageUrl = '/medicines/salbutamol.jpg');
UPDATE dbo.Medicines SET imageUrl = '/uploads/medicinces/Allopurinol.webp'   WHERE MedicineID = 10 AND (imageUrl IS NULL OR imageUrl = '' OR imageUrl = '/medicines/allopurinol.jpg');

COMMIT TRANSACTION;
