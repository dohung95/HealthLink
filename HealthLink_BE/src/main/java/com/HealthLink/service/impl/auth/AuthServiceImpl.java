package com.HealthLink.service.impl.auth;

import com.HealthLink.dto.auth.ForgotPasswordRequest;
import com.HealthLink.dto.auth.LoginRequest;
import com.HealthLink.dto.auth.LoginResponse;
import com.HealthLink.dto.auth.RefreshTokenRequest;
import com.HealthLink.dto.auth.RegisterRequest;
import com.HealthLink.dto.auth.ResetPasswordRequest;
import com.HealthLink.entity.PasswordResetToken;
import com.HealthLink.entity.RefreshToken;
import com.HealthLink.entity.Role;
import com.HealthLink.entity.User;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.DuplicateResourceException;
import com.HealthLink.exception.InvalidTokenException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.repository.auth.PasswordResetTokenRepository;
import com.HealthLink.repository.auth.RefreshTokenRepository;
import com.HealthLink.repository.auth.RoleRepository;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.security.JwtTokenProvider;
import com.HealthLink.security.TokenBlacklistService;
import com.HealthLink.service.impl.auth.UserDetailsServiceImpl;
import com.HealthLink.service.auth.AuthService;
import com.HealthLink.service.email.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager        authenticationManager;
    private final JwtTokenProvider             jwtTokenProvider;
    private final UserDetailsServiceImpl       userDetailsService;
    private final UserRepository               userRepository;
    private final RoleRepository               roleRepository;
    private final PatientRepository            patientRepository;
    private final DoctorRepository             doctorRepository;
    private final PharmacyRepository           pharmacyRepository;
    private final RefreshTokenRepository       refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder              passwordEncoder;
    private final EmailService                 emailService;
    private final TokenBlacklistService        tokenBlacklistService;

    // =========================================================================
    // Đăng nhập
    // =========================================================================
    @Override
    @Transactional(noRollbackFor = org.springframework.security.core.AuthenticationException.class)
    public LoginResponse login(LoginRequest request) {
        // Lấy user trước để có thể tăng count khi đăng nhập sai
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);

        // Xác thực email + password
        Authentication auth;
        try {
            auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        } catch (org.springframework.security.authentication.BadCredentialsException ex) {
            // Tăng số lần đăng nhập sai nếu user tồn tại
            if (user != null) {
                user.setAccessFailedCount(user.getAccessFailedCount() + 1);
                if (user.getAccessFailedCount() >= 5) {
                    user.setStatus("Locked");
                    userRepository.save(user);
                    throw new LockedException("Account has been locked due to too many failed attempts");
                }
                userRepository.save(user);
            }
            throw ex; // Ném lại để GlobalExceptionHandler xử lý và trả về 401
        }

        UserDetails userDetails = (UserDetails) auth.getPrincipal();

        // Lấy lại user từ DB (trường hợp user == null do email không tồn tại sẽ được xử lý ở đây)
        if (user == null) {
            user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "email", request.getEmail()));
        }

        // Reset số lần đăng nhập sai sau khi đăng nhập thành công
        user.setAccessFailedCount(0);
        // Cập nhật LastLoginAt
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        // Tạo tokens
        String accessToken  = jwtTokenProvider.generateAccessToken(userDetails);
        String refreshTokenStr = jwtTokenProvider.generateRefreshToken(userDetails);

        // Lưu refresh token vào DB
        saveRefreshToken(user, refreshTokenStr);

        return buildLoginResponse(user, accessToken, refreshTokenStr);
    }

    // =========================================================================
    // Đăng ký
    // =========================================================================
    @Override
    @Transactional
    public LoginResponse register(RegisterRequest request) {
        // Kiểm tra trùng email — ném DuplicateResourceException nếu đã tồn tại
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        }

        String requestedRole = request.getRole() == null || request.getRole().isBlank()
                ? "Patient"
                : request.getRole();

        Role role = roleRepository.findByName(requestedRole)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "name", requestedRole));

        // Tạo User mới
        User user = User.builder()
                .id(UUID.randomUUID().toString())
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber())
                .emailConfirmed(false)
                .status("Active")
                .createdDate(LocalDateTime.now())
                .lastLoginAt(LocalDateTime.now())
                .accessFailedCount(0)
                .role(role)
                .build();

        user = userRepository.save(user);

        // Tạo entity tương ứng với role
        if ("patient".equalsIgnoreCase(requestedRole)) {
            Patient patient = Patient.builder()
                    // .patientId(user.getId())
                    .user(user)  
                    .fullName(request.getUsername())
                    .build();
            patientRepository.save(patient);
        } else if ("doctor".equalsIgnoreCase(requestedRole)) {
            Doctor doctor = Doctor.builder()
                    // .doctorId(user.getId())
                    .user(user)  
                    .fullName(request.getUsername())
                    .qualifications("")
                    .specialty("General")
                    .languageSpoken("English")
                    .location("")
                    .build();
            doctorRepository.save(doctor);
        } else if ("pharmacy".equalsIgnoreCase(requestedRole)) {
            Pharmacy pharmacy = Pharmacy.builder()
                    // .pharmacyId(user.getId())
                    .user(user)  
                    .name(request.getUsername())
                    .licenseNumber("")
                    .address("")
                    .build();
            pharmacyRepository.save(pharmacy);
        }

        // Load lại để có roles (có thể rỗng nếu chưa assign)
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());

        String accessToken    = jwtTokenProvider.generateAccessToken(userDetails);
        String refreshTokenStr = jwtTokenProvider.generateRefreshToken(userDetails);

        saveRefreshToken(user, refreshTokenStr);

        return buildLoginResponse(user, accessToken, refreshTokenStr);
    }

    // =========================================================================
    // Refresh token
    // =========================================================================
    @Override
    @Transactional
    public LoginResponse refreshToken(RefreshTokenRequest request) {
        String tokenStr = request.getRefreshToken();

        // Tìm refresh token trong DB — ném InvalidTokenException nếu không tồn tại
        RefreshToken storedToken = refreshTokenRepository.findByToken(tokenStr)
                .orElseThrow(() -> new InvalidTokenException("Refresh token is invalid or has been revoked"));

        // Kiểm tra token đã bị thu hồi thủ công chưa
        if (storedToken.isRevoked()) {
            throw new InvalidTokenException("Refresh token has been revoked");
        }

        // Kiểm tra token có hết hạn không — tự động thu hồi nếu hết hạn
        if (jwtTokenProvider.isTokenExpired(tokenStr)) {
            storedToken.setRevoked(true);
            refreshTokenRepository.save(storedToken);
            throw new InvalidTokenException("Refresh token has expired. Please log in again");
        }

        User user = storedToken.getUser();
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());

        // Tạo access token mới
        String newAccessToken    = jwtTokenProvider.generateAccessToken(userDetails);
        // Tạo refresh token mới (rotation)
        String newRefreshTokenStr = jwtTokenProvider.generateRefreshToken(userDetails);

        // Thu hồi token cũ
        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        // Lưu token mới
        saveRefreshToken(user, newRefreshTokenStr);

        return buildLoginResponse(user, newAccessToken, newRefreshTokenStr);
    }

    // =========================================================================
    // Quên mật khẩu
    // =========================================================================
    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        // Tìm user theo email — không throw lỗi để tránh lộ thông tin email có tồn tại không
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user == null) {
            // Trả về thành công giả để không tiết lộ email có tồn tại hay không
            return;
        }

        // Xóa tất cả token cũ của user trước khi tạo mới
        passwordResetTokenRepository.deleteAllByUserId(user.getId());

        // Tạo token ngẫu nhiên (UUID), hết hạn sau 15 phút
        String tokenStr = UUID.randomUUID().toString();
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token(tokenStr)
                .user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(15))
                .used(false)
                .build();
        passwordResetTokenRepository.save(resetToken);

        // Gửi email chứa link reset
        emailService.sendPasswordResetEmail(user.getEmail(), user.getUsername(), tokenStr);
    }

    // =========================================================================
    // Đặt lại mật khẩu
    // =========================================================================
    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = passwordResetTokenRepository
                .findByToken(request.getToken())
                .orElseThrow(() -> new BadRequestException("Invalid or expired password reset token"));

        if (resetToken.isUsed()) {
            throw new BadRequestException("This reset link has already been used");
        }
        if (resetToken.isExpired()) {
            throw new BadRequestException("Reset link has expired. Please request a new one");
        }

        // Cập nhật mật khẩu mới và mở khóa tài khoản
        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setStatus("Active"); // Mở khóa tài khoản (nếu bị khóa)
        user.setAccessFailedCount(0); // Reset số lần đăng nhập sai
        userRepository.save(user);

        // Đánh dấu token đã sử dụng
        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
    }

    // =========================================================================
    // Logout
    // =========================================================================
    @Override
    @Transactional
    public void logout(String accessToken) {
        // 1. Đưa access token vào blacklist đến khi nó tự hết hạn
        try {
            java.time.Instant expiry = jwtTokenProvider.getExpirationFromToken(accessToken);
            tokenBlacklistService.blacklist(accessToken, expiry);
        } catch (Exception e) {
            // Token đã hết hạn hoặc không hợp lệ — vẫn tiếp tục revoke refresh token
            log.warn("Could not parse access token during logout: {}", e.getMessage());
        }

        // 2. Revoke toàn bộ refresh token của user trong DB
        try {
            String email = jwtTokenProvider.getEmailFromToken(accessToken);
            User user = userRepository.findByEmail(email)
                    .orElse(null);
            if (user != null) {
                refreshTokenRepository.deleteAllByUserId(user.getId());
                log.info("All refresh tokens revoked for userId: {}", user.getId());
            }
        } catch (Exception e) {
            log.warn("Could not revoke refresh tokens during logout: {}", e.getMessage());
        }
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private void saveRefreshToken(User user, String tokenStr) {
        RefreshToken rt = RefreshToken.builder()
                .user(user)
                .token(tokenStr)
                .expiryDate(LocalDateTime.now().plusDays(7))
                .revoked(false)
                .build();
        refreshTokenRepository.save(rt);
    }

    private LoginResponse buildLoginResponse(User user, String accessToken, String refreshToken) {
        String roleName = user.getRole() == null ? null : user.getRole().getName();

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .role(roleName)
                .build();
    }
}
