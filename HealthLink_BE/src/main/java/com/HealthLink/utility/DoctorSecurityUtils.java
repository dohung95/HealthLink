package com.HealthLink.utility;

import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.User;
import com.HealthLink.exception.UnauthorizedAccessException;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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

    /**
     * Requires the authenticated actor to be either the patient who owns the
     * appointment or the doctor assigned to it.  The appointment is the
     * authorization boundary; caller-supplied patient identifiers are never
     * treated as proof of identity.
     */
    public void requireAppointmentAccess(Appointment appointment) {
        if (appointment == null || appointment.getPatient() == null || appointment.getDoctor() == null) {
            throw new UnauthorizedAccessException("Access denied");
        }

        User authenticatedUser = resolveAuthenticatedUser();
        String roleName = authenticatedUser.getRole() == null ? null : authenticatedUser.getRole().getName();
        if ("Doctor".equalsIgnoreCase(roleName)) {
            requireAssignedDoctor(authenticatedUser, appointment);
            return;
        }
        if ("Patient".equalsIgnoreCase(roleName)
                && ownsPatient(authenticatedUser, appointment.getPatient().getPatientId())) {
            return;
        }
        throw new UnauthorizedAccessException("Access denied");
    }

    /**
     * Limits the legacy patient-wide vital-sign read to the authenticated
     * patient's own profile. Doctor access must use an appointment-scoped
     * route so assignment can be checked.
     */
    public void requirePatientAccess(String patientId) {
        User authenticatedUser = resolveAuthenticatedUser();
        String roleName = authenticatedUser.getRole() == null ? null : authenticatedUser.getRole().getName();
        if (!"Patient".equalsIgnoreCase(roleName) || !ownsPatient(authenticatedUser, patientId)) {
            throw new UnauthorizedAccessException("Access denied");
        }
    }

    /**
     * Requires a Doctor actor to be the doctor assigned to the appointment.
     */
    public void requireAssignedDoctor(Appointment appointment) {
        requireAssignedDoctor(resolveAuthenticatedUser(), appointment);
    }

    private void requireAssignedDoctor(User authenticatedUser, Appointment appointment) {
        String roleName = authenticatedUser.getRole() == null ? null : authenticatedUser.getRole().getName();
        if (!"Doctor".equalsIgnoreCase(roleName)
                || appointment == null
                || appointment.getDoctor() == null) {
            throw new UnauthorizedAccessException("Access denied");
        }
        Doctor authenticatedDoctor = doctorRepository.findByUser_Id(authenticatedUser.getId())
                .orElseThrow(() -> new UnauthorizedAccessException("Doctor profile not found"));
        if (!authenticatedDoctor.getDoctorId().equals(appointment.getDoctor().getDoctorId())) {
            throw new UnauthorizedAccessException("Access denied");
        }
    }

    private User resolveAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof UserDetails userDetails)) {
            throw new UnauthorizedAccessException("Authentication required");
        }
        return resolveUser(userDetails);
    }

    private boolean ownsPatient(User authenticatedUser, String patientId) {
        return authenticatedUser.getPatient() != null
                && authenticatedUser.getPatient().getPatientId().equals(patientId);
    }
}
