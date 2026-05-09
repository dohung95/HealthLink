package com.HealthLink.service.impl;

import com.HealthLink.dto.auth.LoginRequest;
import com.HealthLink.dto.auth.LoginResponse;
import com.HealthLink.dto.auth.RefreshTokenRequest;
import com.HealthLink.dto.auth.RegisterRequest;
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
import com.HealthLink.repository.RefreshTokenRepository;
import com.HealthLink.repository.RoleRepository;
import com.HealthLink.repository.UserRepository;
import com.HealthLink.repository.PatientRepository;
import com.HealthLink.repository.DoctorRepository;
import com.HealthLink.repository.PharmacyRepository;
import com.HealthLink.security.JwtTokenProvider;
import com.HealthLink.service.impl.UserDetailsServiceImpl;
import com.HealthLink.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager   authenticationManager;
    private final JwtTokenProvider        jwtTokenProvider;
    private final UserDetailsServiceImpl  userDetailsService;
    private final UserRepository          userRepository;
    private final RoleRepository          roleRepository;
    private final PatientRepository       patientRepository;
    private final DoctorRepository        doctorRepository;
    private final PharmacyRepository      pharmacyRepository;
    private final RefreshTokenRepository  refreshTokenRepository;
    private final PasswordEncoder         passwordEncoder;

    // =========================================================================
    // Đăng nhập
    // =========================================================================
    @Override
    @Transactional
    public LoginResponse login(LoginRequest request) {
        // Xác thực email + password
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        UserDetails userDetails = (UserDetails) auth.getPrincipal();

        // Lấy thông tin User từ DB sau khi xác thực thành công
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", request.getEmail()));

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
