package com.HealthLink.repository.auth;

import com.HealthLink.entity.EmailVerificationToken;
import com.HealthLink.entity.TokenType;
import com.HealthLink.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {
    
    Optional<EmailVerificationToken> findByToken(String token);
    
    Optional<EmailVerificationToken> findByUserAndUsedFalse(User user);
    
    void deleteByExpiryDateBefore(LocalDateTime dateTime);

    Optional<EmailVerificationToken> findByUserAndType(User user, TokenType type);

    Optional<EmailVerificationToken> findByTokenAndUserAndType(String token, User user, TokenType type);
}
