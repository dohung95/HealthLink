package com.HealthLink.repository;

import com.HealthLink.entity.RegistrationDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RegistrationDocumentRepository extends JpaRepository<RegistrationDocument, Long> {
    List<RegistrationDocument> findByRegistrationRequest_RequestId(Long requestId);
    void deleteByRegistrationRequest_RequestId(Long requestId);
}
