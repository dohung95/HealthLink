package com.HealthLink.service.impl.auth;

import com.HealthLink.entity.User;
import com.HealthLink.repository.auth.UserRepository;
import java.util.Collection;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Load UserDetails từ database bằng email để Spring Security xác thực.
 */
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException(
                        /* Không tìm thấy người dùng với email này */
                        "User not found with email: " + email));

        // Chuyển Role thành GrantedAuthority
        Collection<GrantedAuthority> authorities = (user.getRole() == null)
                ? new java.util.ArrayList<>()
                : java.util.List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().getName()));

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities(authorities)
                .accountExpired(false)
                .accountLocked("Locked".equalsIgnoreCase(user.getStatus()))
                .credentialsExpired(false)
                .disabled("Inactive".equalsIgnoreCase(user.getStatus()))
                .build();
    }
}
