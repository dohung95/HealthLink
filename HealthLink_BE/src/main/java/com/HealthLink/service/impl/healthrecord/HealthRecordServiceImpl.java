package com.HealthLink.service.impl.healthrecord;

import com.HealthLink.dto.request.healthrecord.HealthRecordRequest;
import com.HealthLink.dto.request.healthrecord.RevokeShareRequest;
import com.HealthLink.dto.request.healthrecord.ShareHealthRecordRequest;
import com.HealthLink.dto.response.healthrecord.HealthRecordResponse;
import com.HealthLink.dto.response.healthrecord.HealthRecordShareResponse;
import com.HealthLink.dto.response.healthrecord.MedicalDocumentResponse;
import com.HealthLink.entity.*;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.healthrecord.HealthRecordRepository;
import com.HealthLink.repository.healthrecord.HealthRecordShareRepository;
import com.HealthLink.repository.healthrecord.MedicalDocumentRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.service.healthrecord.FileStorageService;
import com.HealthLink.service.healthrecord.HealthRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import com.HealthLink.dto.response.PagedResponse;
import java.util.Arrays;
import java.util.LinkedHashSet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@Service
@RequiredArgsConstructor
public class HealthRecordServiceImpl implements HealthRecordService {

    private final HealthRecordRepository healthRecordRepository;
    private final MedicalDocumentRepository medicalDocumentRepository;
    private final HealthRecordShareRepository healthRecordShareRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final FileStorageService fileStorageService;

    @Override
    @Transactional
    public HealthRecordResponse createRecord(String patientId, HealthRecordRequest request) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        HealthRecord record = HealthRecord.builder()
                .patient(patient)
                .title(request.getTitle())
                .description(request.getDescription())
                .recordType(request.getRecordType())
                .recordDate(request.getRecordDate() != null ? request.getRecordDate() : LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .lastUpdated(LocalDateTime.now())
                .build();

        return toRecordResponse(healthRecordRepository.save(record));
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<HealthRecordResponse> getMyRecords(
            String patientId,
            int page,
            int size,
            LocalDate fromDate,
            LocalDate toDate,
            String sort
    ) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 30);

        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new BusinessException("From date cannot be after to date");
        }

        LocalDateTime fromDateTime = fromDate != null
                ? fromDate.atStartOfDay()
                : null;

        LocalDateTime toDateTime = toDate != null
                ? toDate.plusDays(1).atStartOfDay().minusSeconds(1)
                : null;

        Sort.Direction direction
                = "oldest".equalsIgnoreCase(sort)
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;

        PageRequest pageRequest = PageRequest.of(
                safePage - 1,
                safeSize,
                Sort.by(direction, "recordDate")
        );

        Page<HealthRecord> recordPage
                = healthRecordRepository.findMyRecordsByDateRange(
                        patientId,
                        fromDateTime,
                        toDateTime,
                        pageRequest
                );

        return PagedResponse.<HealthRecordResponse>builder()
                .items(
                        recordPage.getContent()
                                .stream()
                                .map(this::toRecordResponse)
                                .collect(Collectors.toList())
                )
                .page(safePage)
                .pageSize(safeSize)
                .totalItems(recordPage.getTotalElements())
                .totalPages(recordPage.getTotalPages())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public HealthRecordResponse getRecordById(Integer recordId, String patientId) {
        HealthRecord record = healthRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Health Record not found: " + recordId));

        if (!record.getPatient().getPatientId().equals(patientId)) {
            throw new BusinessException("You do not have permission to access this record");
        }

        return toRecordResponse(record);
    }

    @Override
    @Transactional
    public MedicalDocumentResponse uploadDocument(Integer recordId, String patientId, MultipartFile file, String category, String description) {
        HealthRecord record = healthRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Health Record not found: " + recordId));

        if (!record.getPatient().getPatientId().equals(patientId)) {
            throw new BusinessException("You do not have permission to access this record");
        }

        String fileLocation = fileStorageService.storeFile(file);

        MedicalDocument document = MedicalDocument.builder()
                .healthRecord(record)
                .documentName(file.getOriginalFilename())
                .documentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                .fileLocation(fileLocation)
                .category(category)
                .description(description)
                .uploadedAt(LocalDateTime.now())
                .fileSize(file.getSize())
                .mimeType(file.getContentType())
                .build();

        document = medicalDocumentRepository.save(document);

        record.setLastUpdated(LocalDateTime.now());
        healthRecordRepository.save(record);

        return toDocumentResponse(document);
    }

    @Override
    @Transactional
    public MedicalDocumentResponse uploadDocumentAutoRecord(
            String patientId,
            MultipartFile file,
            String category,
            String description,
            LocalDate documentDate
    ) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found: " + patientId));

        if (documentDate != null && documentDate.isAfter(LocalDate.now())) {
            throw new BusinessException("Date performed cannot be in the future");
        }

        LocalDate uploadDate = LocalDate.now();
        LocalDate performedDate = documentDate != null ? documentDate : uploadDate;

        LocalDateTime uploadDayStart = uploadDate.atStartOfDay();
        LocalDateTime uploadDayEnd = uploadDate.plusDays(1).atStartOfDay().minusSeconds(1);

        LocalDateTime performedDayStart = performedDate.atStartOfDay();

        List<HealthRecord> recordsOfUploadDay
                = healthRecordRepository.findByPatient_PatientIdAndRecordDateBetweenOrderByCreatedAtDesc(
                        patientId,
                        uploadDayStart,
                        uploadDayEnd
                );

        HealthRecord record;

        if (recordsOfUploadDay.isEmpty()) {
            record = HealthRecord.builder()
                    .patient(patient)
                    .title("Health Record - " + uploadDate)
                    .description("Auto-created record for documents uploaded on " + uploadDate)
                    .recordType(category != null && !category.isBlank() ? category : "General")
                    .recordDate(uploadDayStart)
                    .createdAt(LocalDateTime.now())
                    .lastUpdated(LocalDateTime.now())
                    .build();

            record = healthRecordRepository.save(record);
        } else {
            record = recordsOfUploadDay.get(0);
        }

        String fileLocation = fileStorageService.storeFile(file);

        MedicalDocument document = MedicalDocument.builder()
                .healthRecord(record)
                .documentName(file.getOriginalFilename())
                .documentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                .fileLocation(fileLocation)
                .category(category)
                .description(description)
                .documentDate(performedDayStart)
                .uploadedAt(LocalDateTime.now())
                .fileSize(file.getSize())
                .mimeType(file.getContentType())
                .build();

        document = medicalDocumentRepository.save(document);

        record.setLastUpdated(LocalDateTime.now());
        healthRecordRepository.save(record);

        return toDocumentResponse(document);
    }

    @Override
    @Transactional
    public void deleteDocument(Integer documentId, String patientId) {
        MedicalDocument document = medicalDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));

        HealthRecord record = document.getHealthRecord();
        if (!record.getPatient().getPatientId().equals(patientId)) {
            throw new BusinessException("You do not have permission to delete this document");
        }

        fileStorageService.deleteFile(document.getFileLocation());
        medicalDocumentRepository.delete(document);

        record.setLastUpdated(LocalDateTime.now());
        healthRecordRepository.save(record);
    }

    @Override
    @Transactional
    public HealthRecordShareResponse shareRecord(Integer recordId, String patientId, ShareHealthRecordRequest request) {
        HealthRecord record = healthRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Health Record not found: " + recordId));

        if (!record.getPatient().getPatientId().equals(patientId)) {
            throw new BusinessException("You do not have permission to share this record");
        }

        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found: " + request.getDoctorId()));

        var existingShareOpt
                = healthRecordShareRepository.findBySharedByPatient_PatientIdAndHealthRecord_HealthRecordIdAndSharedWithDoctor_DoctorIdAndRevokedFalse(
                        patientId,
                        recordId,
                        request.getDoctorId()
                );

        if (existingShareOpt.isPresent()) {
            HealthRecordShare existingShare = existingShareOpt.get();

            boolean allowMerge = Boolean.TRUE.equals(request.getAllowMerge());

            if (!allowMerge) {
                throw new BusinessException(
                        "This record is already shared with this doctor. Please revoke the existing share before sharing again."
                );
            }

            String mergedDocumentIds = mergeDocumentIds(
                    existingShare.getSharedDocumentIds(),
                    request.getSharedDocumentIds()
            );

            if (existingShare.getSharedDocumentIds() != null
                    && existingShare.getSharedDocumentIds().equals(mergedDocumentIds)) {
                throw new BusinessException("These documents are already shared with this doctor.");
            }

            existingShare.setSharedDocumentIds(mergedDocumentIds);

            if (request.getPermissionLevel() != null && !request.getPermissionLevel().isBlank()) {
                existingShare.setPermissionLevel(request.getPermissionLevel());
            }

            if (request.getExpiryDate() != null) {
                existingShare.setExpiryDate(request.getExpiryDate());
            }

            return toShareResponse(healthRecordShareRepository.save(existingShare));
        }

        String docIds = null;
        if (request.getSharedDocumentIds() != null && !request.getSharedDocumentIds().isEmpty()) {
            docIds = request.getSharedDocumentIds().stream().map(String::valueOf).collect(Collectors.joining(","));
        }

        HealthRecordShare share = HealthRecordShare.builder()
                .healthRecord(record)
                .sharedWithDoctor(doctor)
                .sharedByPatient(record.getPatient())
                .permissionLevel(request.getPermissionLevel() != null ? request.getPermissionLevel() : "View")
                .consentGivenAt(LocalDateTime.now())
                .expiryDate(request.getExpiryDate())
                .sharedDocumentIds(docIds)
                .revoked(false)
                .build();

        return toShareResponse(healthRecordShareRepository.save(share));
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<HealthRecordShareResponse> getMyShares(
            String patientId,
            int page,
            int size
    ) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 30);

        Page<HealthRecordShare> sharePage
                = healthRecordShareRepository
                        .findActiveSharesByPatientId(
                                patientId,
                                LocalDateTime.now(),
                                PageRequest.of(safePage - 1, safeSize)
                        );

        return PagedResponse.<HealthRecordShareResponse>builder()
                .items(
                        sharePage.getContent()
                                .stream()
                                .map(this::toShareResponse)
                                .collect(Collectors.toList())
                )
                .page(safePage)
                .pageSize(safeSize)
                .totalItems(sharePage.getTotalElements())
                .totalPages(sharePage.getTotalPages())
                .build();
    }

    @Override
    @Transactional
    public HealthRecordShareResponse revokeShare(Integer shareId, String patientId, RevokeShareRequest request) {
        HealthRecordShare share = healthRecordShareRepository.findByShareIdAndSharedByPatient_PatientId(shareId, patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Share record not found or no permission: " + shareId));

        if (share.isRevoked()) {
            throw new BusinessException("This share is already revoked");
        }

        share.setRevoked(true);
        share.setRevokedAt(LocalDateTime.now());
        share.setRevokeReason(request.getRevokeReason());

        return toShareResponse(healthRecordShareRepository.save(share));
    }

    @Override
    @Transactional(readOnly = true)
    public List<HealthRecordShareResponse> getSharedWithMe(String doctorId) {
        return healthRecordShareRepository.findBySharedWithDoctor_DoctorIdAndRevokedFalseOrderByConsentGivenAtDesc(doctorId)
                .stream()
                .filter(share -> share.getExpiryDate() == null || share.getExpiryDate().isAfter(LocalDateTime.now()))
                .map(this::toShareResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public HealthRecordShareResponse getShareDetail(Integer shareId, String doctorId) {
        HealthRecordShare share = healthRecordShareRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Share not found: " + shareId));

        if (!share.getSharedWithDoctor().getDoctorId().equals(doctorId)) {
            throw new BusinessException("You do not have permission to view this share");
        }

        if (share.isRevoked() || (share.getExpiryDate() != null && share.getExpiryDate().isBefore(LocalDateTime.now()))) {
            throw new BusinessException("This share has been revoked or expired");
        }

        return toShareResponse(share);
    }

    // Mappers
    private HealthRecordResponse toRecordResponse(HealthRecord record) {
        List<MedicalDocumentResponse> docs = null;
        if (record.getMedicalDocuments() != null) {
            docs = record.getMedicalDocuments().stream().map(this::toDocumentResponse).collect(Collectors.toList());
        }

        return HealthRecordResponse.builder()
                .healthRecordId(record.getHealthRecordId())
                .patientId(record.getPatient().getPatientId())
                .patientName(record.getPatient().getFullName())
                .title(record.getTitle())
                .description(record.getDescription())
                .recordType(record.getRecordType())
                .recordDate(record.getRecordDate())
                .lastUpdated(record.getLastUpdated())
                .createdAt(record.getCreatedAt())
                .documents(docs)
                .build();
    }

    private MedicalDocumentResponse toDocumentResponse(MedicalDocument doc) {
        return MedicalDocumentResponse.builder()
                .documentId(doc.getDocumentId())
                .healthRecordId(doc.getHealthRecord().getHealthRecordId())
                .documentName(doc.getDocumentName())
                .documentType(doc.getDocumentType())
                .fileLocation(doc.getFileLocation())
                .category(doc.getCategory())
                .description(doc.getDescription())
                .testResults(doc.getTestResults())
                .referenceRange(doc.getReferenceRange())
                .testStatus(doc.getTestStatus())
                .documentDate(doc.getDocumentDate())
                .uploadedAt(doc.getUploadedAt())
                .fileSize(doc.getFileSize())
                .mimeType(doc.getMimeType())
                .thumbnailUrl(doc.getThumbnailUrl())
                .build();
    }

    private HealthRecordShareResponse toShareResponse(HealthRecordShare share) {
        List<MedicalDocumentResponse> docs = null;
        if (share.getHealthRecord().getMedicalDocuments() != null) {
            docs = share.getHealthRecord().getMedicalDocuments().stream().filter(d -> {
                if (share.getSharedDocumentIds() == null || share.getSharedDocumentIds().isEmpty()) {
                    return true;
                }
                String[] ids = share.getSharedDocumentIds().split(",");
                for (String id : ids) {
                    if (id.trim().equals(d.getDocumentId().toString())) {
                        return true;
                    }
                }
                return false;
            }).map(this::toDocumentResponse).collect(Collectors.toList());
        }

        return HealthRecordShareResponse.builder()
                .shareId(share.getShareId())
                .healthRecordId(share.getHealthRecord().getHealthRecordId())
                .recordTitle(share.getHealthRecord().getTitle())
                .patientId(share.getSharedByPatient().getPatientId())
                .patientName(share.getSharedByPatient().getFullName())
                .doctorId(share.getSharedWithDoctor().getDoctorId())
                .doctorName(share.getSharedWithDoctor().getFullName())
                .permissionLevel(share.getPermissionLevel())
                .consentGivenAt(share.getConsentGivenAt())
                .expiryDate(share.getExpiryDate())
                .revoked(share.isRevoked())
                .revokedAt(share.getRevokedAt())
                .revokeReason(share.getRevokeReason())
                .sharedDocumentIds(share.getSharedDocumentIds())
                .documents(docs)
                .build();
    }

    //Helper
    private String mergeDocumentIds(String currentIds, List<Integer> newIds) {
        LinkedHashSet<String> mergedIds = new LinkedHashSet<>();

        if (currentIds != null && !currentIds.isBlank()) {
            Arrays.stream(currentIds.split(","))
                    .map(String::trim)
                    .filter(id -> !id.isBlank())
                    .forEach(mergedIds::add);
        }

        if (newIds != null) {
            newIds.stream()
                    .filter(id -> id != null)
                    .map(String::valueOf)
                    .forEach(mergedIds::add);
        }

        return mergedIds.isEmpty() ? null : String.join(",", mergedIds);
    }
}
