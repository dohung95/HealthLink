package com.HealthLink.utility;

import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.User;
import com.HealthLink.exception.UnauthorizedAccessException;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DoctorSecurityUtils {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;

    public User resolveUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
            .orElseThrow(() -> new UnauthorizedAccessException("User not found"));
    }

    public Doctor resolveDoctor(UserDetails userDetails) {
        User user = resolveUser(userDetails);
        return doctorRepository.findByUser_Id(user.getId())
            .orElseThrow(() -> new UnauthorizedAccessException("Doctor profile not found"));
    }

    public Doctor verifyDoctorAccess(UserDetails userDetails, String doctorId) {
        User user = resolveUser(userDetails);
        boolean isAdmin = user.getRole() != null
                && "Admin".equalsIgnoreCase(user.getRole().getName());
        if (isAdmin) {
            return doctorRepository.findById(doctorId)
                .orElseThrow(() -> new UnauthorizedAccessException("Doctor not found"));
        }
        Doctor doctor = doctorRepository.findByUser_Id(user.getId())
            .orElseThrow(() -> new UnauthorizedAccessException("Doctor profile not found"));
        if (!doctor.getDoctorId().equals(doctorId)) {
            throw new UnauthorizedAccessException("Access denied: you are not this doctor");
        }
        return doctor;
    }
}
