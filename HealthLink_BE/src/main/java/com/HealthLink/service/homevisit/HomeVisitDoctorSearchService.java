package com.HealthLink.service.homevisit;

import com.HealthLink.dto.request.HomeVisitDoctorSearchRequest;
import com.HealthLink.dto.response.HomeVisitDoctorOptionResponse;
import com.HealthLink.dto.response.HomeVisitEstimateResponse;
import com.HealthLink.entity.Doctor;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.utility.DoctorServiceHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class HomeVisitDoctorSearchService {

    private final DoctorRepository doctorRepository;
    private final HomeVisitLocationService homeVisitLocationService;
    private final HomeVisitSessionService homeVisitSessionService;

    @Transactional(readOnly = true)
    public List<HomeVisitDoctorOptionResponse> search(HomeVisitDoctorSearchRequest request) {
        if (request.getVisitLatitude() == null || request.getVisitLongitude() == null) {
            throw new IllegalArgumentException("Visit location is required");
        }

        return doctorRepository.findAll()
                .stream()
                .filter(doctor -> DoctorServiceHelper.isConsultationTypeSupported(doctor, "HomeVisit"))
                .filter(doctor -> doctor.getLatitude() != null && doctor.getLongitude() != null)
                .filter(doctor -> request.getSpecialtyName() == null
                || request.getSpecialtyName().isBlank()
                || request.getSpecialtyName().equalsIgnoreCase(resolveSpecialtyName(doctor)))
                .map(doctor -> buildOptionOrNull(doctor, request))
                .filter(option -> option != null)
                .toList();
    }

    private HomeVisitDoctorOptionResponse buildOptionOrNull(
            Doctor doctor,
            HomeVisitDoctorSearchRequest request
    ) {
        HomeVisitEstimateResponse estimate = homeVisitLocationService.estimate(
                doctor.getDoctorId(),
                request.getVisitLatitude(),
                request.getVisitLongitude()
        );

        if (!Boolean.TRUE.equals(estimate.getServiceable())) {
            return null;
        }

        if (homeVisitSessionService.getAvailableSessions(doctor.getDoctorId()).isEmpty()) {
            return null;
        }

        BigDecimal consultationFee = doctor.getConsultationFee() != null
                ? doctor.getConsultationFee().setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        BigDecimal homeVisitConsultationFee = consultationFee
                .multiply(BigDecimal.valueOf(1.5))
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal homeVisitTotal = estimate.getTotalFee() != null
                ? estimate.getTotalFee().setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        return HomeVisitDoctorOptionResponse.builder()
                .doctorId(doctor.getDoctorId())
                .fullName(doctor.getFullName())
                .specialtyName(resolveSpecialtyName(doctor))
                .avatarUrl(doctor.getAvatarUrl())
                // Fee thực tế cho online
                .consultationFee(consultationFee)
                // Fee thực tế của HomeVisit = consultationFee x 1.5.
                .homeVisitConsultationFee(homeVisitConsultationFee)
                .distanceKm(estimate.getDistanceKm())
                .estimatedTravelMinutes(estimate.getEstimatedTravelMinutes())
                .homeVisitFee(estimate.getHomeVisitFee())
                .travelFee(estimate.getTravelFee())
                .homeVisitTotal(homeVisitTotal)
                // Tổng tạm tính = phí khám HomeVisit + phí di chuyển/HomeVisit.
                .temporaryTotal(
                        homeVisitConsultationFee
                                .add(homeVisitTotal)
                                .setScale(2, RoundingMode.HALF_UP)
                )
                .build();
    }

    private String resolveSpecialtyName(Doctor doctor) {
        return doctor.getSpecialtyEntity() != null
                ? doctor.getSpecialtyEntity().getName()
                : doctor.getSpecialty();
    }
}
