-- Migration: Remove NEED_MORE_INFO status from consultation requests
-- Converts all existing NEED_MORE_INFO requests to IN_REVIEW

UPDATE PharmacyConsultationRequests
SET status = 'IN_REVIEW'
WHERE status = 'NEED_MORE_INFO';
