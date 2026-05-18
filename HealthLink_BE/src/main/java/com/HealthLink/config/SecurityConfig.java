package com.HealthLink.config;

import com.HealthLink.security.JwtAuthenticationFilter;
import com.HealthLink.service.impl.auth.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Cấu hình Spring Security: stateless JWT, CORS, public routes.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsServiceImpl userDetailsService;

    // -------------------------------------------------------------------------
    // PasswordEncoder (BCrypt)
    // -------------------------------------------------------------------------
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // -------------------------------------------------------------------------
    // DaoAuthenticationProvider
    // -------------------------------------------------------------------------
    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService); // đúng cách
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    // -------------------------------------------------------------------------
    // AuthenticationManager
    // -------------------------------------------------------------------------
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    // -------------------------------------------------------------------------
    // Security Filter Chain
    // -------------------------------------------------------------------------
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Tắt CSRF (không cần với stateless JWT)
                .csrf(AbstractHttpConfigurer::disable)

                // Session stateless — không dùng HttpSession
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Phân quyền các endpoint
                .authorizeHttpRequests(auth -> auth
                        // Public: đăng ký / đăng nhập / refresh token
                        .requestMatchers("/api/auth/**").permitAll()
                        // Public: đăng ký Doctor/Pharmacy (chưa có tài khoản)
                        .requestMatchers("/api/registration/**").permitAll()
                        // Public: xem ảnh upload (avatar, v.v.) — không cần xác thực
                        .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                        // Public: xem danh sách bác sĩ (cho bệnh nhân)
                        .requestMatchers(HttpMethod.GET, "/api/account/doctors").permitAll()
                        // Public: tạo kết nối websocket với backend
                        .requestMatchers("/ws/**").permitAll()
                        // Tất cả còn lại yêu cầu xác thực
                        .anyRequest().authenticated())

                // Dùng DaoAuthenticationProvider vừa tạo
                .authenticationProvider(authenticationProvider())

                // Thêm JWT filter trước UsernamePasswordAuthenticationFilter
                .addFilterBefore(jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
