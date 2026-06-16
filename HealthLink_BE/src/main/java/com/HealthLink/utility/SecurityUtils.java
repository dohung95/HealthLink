package com.HealthLink.utility;

import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.User;
import com.HealthLink.exception.UnauthorizedAccessException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SecurityUtils {

    private final UserRepository userRepository;
    private final PharmacyRepository pharmacyRepository;

    public User resolveUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new UnauthorizedAccessException("User not found"));
    }

    public Pharmacy verifyPharmacyOwnership(UserDetails userDetails, String pharmacyId) {
        User user = resolveUser(userDetails);
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new UnauthorizedAccessException("Pharmacy not found"));
        boolean isAdmin = user.getRole() != null
                && "Admin".equalsIgnoreCase(user.getRole().getName());
        if (!pharmacy.getUser().getId().equals(user.getId()) && !isAdmin) {
            throw new UnauthorizedAccessException("Access denied: you do not own this pharmacy");
        }
        return pharmacy;
    }

    public Pharmacy verifyPharmacyOwnershipByUser(UserDetails userDetails) {
        User user = resolveUser(userDetails);
        return pharmacyRepository.findById(user.getId())
                .orElseThrow(() -> new UnauthorizedAccessException("You do not have a pharmacy profile"));
    }
}
