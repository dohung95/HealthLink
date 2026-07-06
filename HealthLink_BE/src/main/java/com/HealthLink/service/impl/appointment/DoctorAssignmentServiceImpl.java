package com.HealthLink.service.impl.appointment;

import com.HealthLink.dto.appointment.RecommendedDoctorRequest;
import com.HealthLink.dto.appointment.RecommendedDoctorResponse;
import com.HealthLink.entity.Doctor;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.repository.admin.commission.AdminCommissionTransactionRepository;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.service.appointment.DoctorAssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DoctorAssignmentServiceImpl implements DoctorAssignmentService {

    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final AdminCommissionTransactionRepository commissionTransactionRepository;

    @Value("${booking.manual-doctor-selection-fee:10.00}")
    private BigDecimal manualSelectionFee;

    @Override
    @Transactional(readOnly = true)
    public RecommendedDoctorResponse recommendDoctor(RecommendedDoctorRequest request) {
        LocalDateTime appointmentTime = request.getAppointmentTime();
        LocalDateTime referenceTime = appointmentTime != null
                ? appointmentTime
                : LocalDateTime.now();

        LocalDateTime startOfMonth = referenceTime.withDayOfMonth(1).toLocalDate().atStartOfDay();
        LocalDateTime nextMonth = startOfMonth.plusMonths(1);

        String specialty = request.getSpecialty() == null
                ? null
                : request.getSpecialty().trim();

        String consultationType = request.getConsultationType() == null
                ? "Online"
                : request.getConsultationType().trim();

        List<Doctor> candidates = doctorRepository.findAutoAssignableDoctorsBySpecialty(
                specialty,
                consultationType
        );

        if (candidates.isEmpty()) {
            throw new BusinessException("No doctor found for specialty: " + specialty);
        }

        Doctor bestDoctor = candidates.stream()
                .filter(doctor -> appointmentTime == null || isDoctorAvailable(doctor, appointmentTime))
                .min(Comparator.comparing(doctor -> calculateDoctorScore(
                doctor,
                startOfMonth,
                nextMonth
        )))
                .orElseThrow(() -> new BusinessException("No available doctor found for this specialty and time"));

        return RecommendedDoctorResponse.builder()
                .doctorId(bestDoctor.getDoctorId())
                .doctorName(bestDoctor.getFullName())
                .specialty(
                        bestDoctor.getSpecialtyEntity() != null
                        ? bestDoctor.getSpecialtyEntity().getName()
                        : bestDoctor.getSpecialty()
                )
                .avatarUrl(bestDoctor.getAvatarUrl())
                .consultationFee(bestDoctor.getConsultationFee())
                .manualSelectionFee(manualSelectionFee)
                .selectionMode("AUTO_ASSIGNED")
                .reason("Selected by income balance and workload")
                .build();
    }

    private boolean isDoctorAvailable(Doctor doctor, LocalDateTime appointmentTime) {
        LocalDateTime endTime = appointmentTime.plusMinutes(30);

        boolean hasConflict = appointmentRepository.existsDoctorAppointmentOverlap(
                doctor.getDoctorId(),
                "CANCELLED",
                appointmentTime,
                endTime
        );

        return !hasConflict;
    }

    private BigDecimal calculateDoctorScore(
            Doctor doctor,
            LocalDateTime from,
            LocalDateTime to
    ) {
        BigDecimal income = commissionTransactionRepository.sumDoctorNetAmount(
                doctor.getDoctorId(), from, to
        );
        income = (income != null) ? income : BigDecimal.ZERO;

        long appointmentCount = appointmentRepository.countDoctorAppointmentsInRange(
                doctor.getDoctorId(),
                from,
                to
        );

        BigDecimal workloadScore = BigDecimal.valueOf(appointmentCount)
                .multiply(BigDecimal.valueOf(5));

        return income.add(workloadScore);
    }
}
