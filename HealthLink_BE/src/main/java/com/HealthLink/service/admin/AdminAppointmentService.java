package com.HealthLink.service.admin;

import com.HealthLink.dto.admin.*;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Patient;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.admin.AdminAppointmentRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class AdminAppointmentService {

    private final AdminAppointmentRepository appointmentRepository;

    public AdminAppointmentService(AdminAppointmentRepository appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    public AdminAppointmentStatsDto getStats() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);

        return AdminAppointmentStatsDto.builder()
            .todayAppointments(appointmentRepository.countTodayAppointments(startOfDay, endOfDay))
            .pendingApproval(appointmentRepository.countPendingAppointments())
            .completed(appointmentRepository.countCompletedAppointments())
            .cancelled(appointmentRepository.countCancelledAppointments())
            .build();
    }

    public AdminAppointmentPageResponse getAppointments(int pageNumber, int pageSize, String searchTerm,
                                                         String date, String status, String department) {
        Pageable pageable = PageRequest.of(Math.max(pageNumber - 1, 0), Math.max(pageSize, 1),
            Sort.by(Sort.Direction.DESC, "appointmentTime"));
        Specification<Appointment> specification = buildSpecification(searchTerm, date, status, department);
        Page<Appointment> page = appointmentRepository.findAll(specification, pageable);

        List<AdminAppointmentDto> appointments = page.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());

        return new AdminAppointmentPageResponse(
            appointments,
            page.getNumber() + 1,
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
    }

    public AdminAppointmentDto getAppointmentById(Integer appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", appointmentId));
        return mapToDto(appointment);
    }

    public AdminAppointmentDto updateAppointment(Integer appointmentId, AdminAppointmentUpdateDto updateDto) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", appointmentId));

        // Update appointment fields
        if (updateDto.getAppointmentTime() != null) {
            appointment.setAppointmentTime(updateDto.getAppointmentTime());
        }
        if (StringUtils.hasText(updateDto.getConsultationType())) {
            appointment.setConsultationType(updateDto.getConsultationType());
        }
        if (StringUtils.hasText(updateDto.getStatus())) {
            appointment.setStatus(updateDto.getStatus());
        }
        if (StringUtils.hasText(updateDto.getNotes())) {
            appointment.setNotes(updateDto.getNotes());
        }

        // Update related consultation if exists
        Consultation consultation = appointment.getConsultation();
        if (consultation != null) {
            if (updateDto.getFollowUpDate() != null) {
                consultation.setFollowUpDate(updateDto.getFollowUpDate());
            }
            if (StringUtils.hasText(updateDto.getDoctorNotes())) {
                consultation.setDoctorNotes(updateDto.getDoctorNotes());
            }
            if (StringUtils.hasText(updateDto.getDiagnosis())) {
                consultation.setDiagnosis(updateDto.getDiagnosis());
            }
        }

        Appointment savedAppointment = appointmentRepository.save(appointment);
        return mapToDto(savedAppointment);
    }

    private Specification<Appointment> buildSpecification(String searchTerm, String date, String status, String department) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            var patientJoin = root.join("patient", jakarta.persistence.criteria.JoinType.LEFT);
            var doctorJoin = root.join("doctor", jakarta.persistence.criteria.JoinType.LEFT);

            if (StringUtils.hasText(searchTerm)) {
                String term = "%" + searchTerm.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(patientJoin.get("fullName")), term),
                    cb.like(cb.lower(doctorJoin.get("fullName")), term),
                    cb.like(cb.toString(root.get("appointmentId")), "%" + searchTerm.trim() + "%")
                ));
            }

            if (StringUtils.hasText(date)) {
                try {
                    LocalDate filterDate = LocalDate.parse(date);
                    LocalDateTime startOfDay = filterDate.atStartOfDay();
                    LocalDateTime endOfDay = filterDate.atTime(LocalTime.MAX);
                    predicates.add(cb.between(root.get("appointmentTime"), startOfDay, endOfDay));
                } catch (Exception e) {
                    // Invalid date format, ignore filter
                }
            }

            if (StringUtils.hasText(status)) {
                predicates.add(cb.equal(cb.lower(root.get("status")), status.trim().toLowerCase()));
            }

            if (StringUtils.hasText(department)) {
                predicates.add(cb.equal(cb.lower(doctorJoin.get("specialty")), department.trim().toLowerCase()));
            }

            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }

    private AdminAppointmentDto mapToDto(Appointment appointment) {
        Patient patient = appointment.getPatient();
        Doctor doctor = appointment.getDoctor();
        Consultation consultation = appointment.getConsultation();

        // Format date and time for display
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("MMM dd, yyyy");
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("hh:mm a");
        // Raw formats for HTML input elements
        DateTimeFormatter rawDateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter rawTimeFormatter = DateTimeFormatter.ofPattern("HH:mm");

        String formattedDate = appointment.getAppointmentTime() != null
            ? appointment.getAppointmentTime().format(dateFormatter)
            : null;
        String formattedTime = appointment.getAppointmentTime() != null
            ? appointment.getAppointmentTime().format(timeFormatter)
            : null;
        String rawDate = appointment.getAppointmentTime() != null
            ? appointment.getAppointmentTime().format(rawDateFormatter)
            : null;
        String rawTime = appointment.getAppointmentTime() != null
            ? appointment.getAppointmentTime().format(rawTimeFormatter)
            : null;

        return AdminAppointmentDto.builder()
            .appointmentID(appointment.getAppointmentId())
            .date(formattedDate)
            .time(formattedTime)
            .rawDate(rawDate)
            .rawTime(rawTime)
            .appointmentTime(appointment.getAppointmentTime())
            .consultationType(appointment.getConsultationType())
            .status(appointment.getStatus())
            .symptoms(appointment.getSymptoms())
            .notes(appointment.getNotes())
            .fee(appointment.getFee())
            // Patient info
            .patientId(patient != null ? patient.getPatientId() : null)
            .patientName(patient != null ? patient.getFullName() : null)
            .patientEmail(patient != null && patient.getUser() != null ? patient.getUser().getEmail() : null)
            .patientPhone(patient != null && patient.getUser() != null ? patient.getUser().getPhoneNumber() : null)
            // Doctor info
            .doctorId(doctor != null ? doctor.getDoctorId() : null)
            .doctorName(doctor != null ? doctor.getFullName() : null)
            .doctorEmail(doctor != null && doctor.getUser() != null ? doctor.getUser().getEmail() : null)
            .department(doctor != null ? doctor.getSpecialty() : null)
            // Consultation info
            .consultationId(consultation != null ? consultation.getConsultationId() : null)
            .diagnosis(consultation != null ? consultation.getDiagnosis() : null)
            .doctorNotes(consultation != null ? consultation.getDoctorNotes() : null)
            .followUpDate(consultation != null ? consultation.getFollowUpDate() : null)
            .followUpAppointmentId(consultation != null ? consultation.getFollowUpAppointmentId() : null)
            .treatmentPlan(consultation != null ? consultation.getTreatmentPlan() : null)
            // Additional info
            .cancelReason(appointment.getCancelReason())
            .cancelledBy(appointment.getCancelledBy())
            .cancelledAt(appointment.getCancelledAt())
            .confirmedAt(appointment.getConfirmedAt())
            .createdAt(appointment.getAppointmentTime()) // Using appointmentTime as createdAt
            .build();
    }
}
