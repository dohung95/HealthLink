package com.HealthLink.repository.registration;

import com.HealthLink.entity.RegistrationDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RegistrationDocumentRepository extends JpaRepository<RegistrationDocument, Long> {
    List<RegistrationDocument> findByRegistrationRequest_RequestId(Long requestId);
    void deleteByRegistrationRequest_RequestId(Long requestId);

    // Find avatar (Profile Photo) for registration request
    Optional<RegistrationDocument> findByRegistrationRequest_RequestIdAndDocumentType(Long requestId, String documentType);
}
