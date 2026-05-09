package com.HealthLink.repository.registration;

import com.HealthLink.entity.RegistrationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RegistrationRequestRepository extends JpaRepository<RegistrationRequest, Long>, JpaSpecificationExecutor<RegistrationRequest> {

    Optional<RegistrationRequest> findByEmail(String email);

    boolean existsByEmailAndStatusIn(String email, java.util.List<String> statuses);
}
