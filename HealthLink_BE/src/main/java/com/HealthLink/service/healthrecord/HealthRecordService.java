package com.HealthLink.service.healthrecord;

import com.HealthLink.dto.request.healthrecord.HealthRecordRequest;
import com.HealthLink.dto.request.healthrecord.RevokeShareRequest;
import com.HealthLink.dto.request.healthrecord.ShareHealthRecordRequest;
import com.HealthLink.dto.response.healthrecord.HealthRecordResponse;
import com.HealthLink.dto.response.healthrecord.HealthRecordShareResponse;
import com.HealthLink.dto.response.healthrecord.MedicalDocumentResponse;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;
import com.HealthLink.dto.response.PagedResponse;
import java.util.List;

public interface HealthRecordService {

    // Patient operations
    HealthRecordResponse createRecord(String patientId, HealthRecordRequest request);

    PagedResponse<HealthRecordResponse> getMyRecords(String patientId, int page, int size);

    HealthRecordResponse getRecordById(Integer recordId, String patientId);

    MedicalDocumentResponse uploadDocument(Integer recordId, String patientId, MultipartFile file, String category, String description);

    MedicalDocumentResponse uploadDocumentAutoRecord(
            String patientId,
            MultipartFile file,
            String category,
            String description,
            LocalDate documentDate
    );

    void deleteDocument(Integer documentId, String patientId);

    // Share operations
    HealthRecordShareResponse shareRecord(Integer recordId, String patientId, ShareHealthRecordRequest request);

    PagedResponse<HealthRecordShareResponse> getMyShares(
            String patientId,
            int page,
            int size
    );

    HealthRecordShareResponse revokeShare(Integer shareId, String patientId, RevokeShareRequest request);

    // Doctor operations
    List<HealthRecordShareResponse> getSharedWithMe(String doctorId);

    HealthRecordShareResponse getShareDetail(Integer shareId, String doctorId);
}
