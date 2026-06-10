package com.HealthLink.config;

import com.HealthLink.entity.Role;
import com.HealthLink.entity.User;
import com.HealthLink.repository.auth.RoleRepository;
import com.HealthLink.repository.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Initializes the AI System User on application startup.
 * This user is used for audit logging when AI performs automatic actions
 * (e.g., auto-rejection of registrations).
 */
@Component
@Order(1) // Run early in startup
@RequiredArgsConstructor
@Slf4j
public class SystemUserInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    // System user constants - used by other services
    public static final String SYSTEM_USER_ID = "SYSTEM_AI";
    public static final String SYSTEM_USER_EMAIL = "ai-system@healthlink.internal";
    public static final String SYSTEM_USER_NAME = "AI System";

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        initializeSystemUser();
    }

    private void initializeSystemUser() {
        // Check if system user already exists
        if (userRepository.findById(SYSTEM_USER_ID).isPresent()) {
            log.debug("AI System user already exists");
            return;
        }

        // Find Admin role (system user needs a role)
        Role adminRole = roleRepository.findByName("Admin").orElse(null);
        if (adminRole == null) {
            log.warn("Admin role not found. AI System user will be created when Admin role is available.");
            return;
        }

        // Create AI System user
        User systemUser = User.builder()
                .id(SYSTEM_USER_ID)
                .email(SYSTEM_USER_EMAIL)
                .username(SYSTEM_USER_NAME)
                .password("$SYSTEM_NO_LOGIN$") // Not a valid hash - prevents login
                .phoneNumber("0000000000")
                .emailConfirmed(true)
                .status("Active")
                .role(adminRole)
                .createdDate(LocalDateTime.now())
                .accessFailedCount(0)
                .build();

        userRepository.save(systemUser);
        log.info("AI System user created successfully (ID: {})", SYSTEM_USER_ID);
    }
}
