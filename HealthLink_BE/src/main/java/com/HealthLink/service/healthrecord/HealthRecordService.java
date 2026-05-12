package com.HealthLink.service.healthrecord;

import com.HealthLink.dto.request.healthrecord.HealthRecordRequest;
import com.HealthLink.dto.request.healthrecord.RevokeShareRequest;
import com.HealthLink.dto.request.healthrecord.ShareHealthRecordRequest;
import com.HealthLink.dto.response.healthrecord.HealthRecordResponse;
import com.HealthLink.dto.response.healthrecord.HealthRecordShareResponse;
import com.HealthLink.dto.response.healthrecord.MedicalDocumentResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface HealthRecordService {
    // Patient operations
    HealthRecordResponse createRecord(String patientId, HealthRecordRequest request);
    List<HealthRecordResponse> getMyRecords(String patientId);
    HealthRecordResponse getRecordById(Integer recordId, String patientId);
    
    MedicalDocumentResponse uploadDocument(Integer recordId, String patientId, MultipartFile file, String category, String description);
    void deleteDocument(Integer documentId, String patientId);

    // Share operations
    HealthRecordShareResponse shareRecord(Integer recordId, String patientId, ShareHealthRecordRequest request);
    List<HealthRecordShareResponse> getMyShares(String patientId);
    HealthRecordShareResponse revokeShare(Integer shareId, String patientId, RevokeShareRequest request);

    // Doctor operations
    List<HealthRecordShareResponse> getSharedWithMe(String doctorId);
    HealthRecordShareResponse getShareDetail(Integer shareId, String doctorId);
}
