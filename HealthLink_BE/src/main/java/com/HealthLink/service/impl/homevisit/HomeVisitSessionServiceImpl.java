package com.HealthLink.service.impl.homevisit;

import com.HealthLink.dto.response.AvailableSessionResponse;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.entity.DoctorScheduleException;
import com.HealthLink.entity.HomeVisitBooking;
import com.HealthLink.entity.enums.ScheduleExceptionType;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.repository.admin.DoctorScheduleExceptionRepository;
import com.HealthLink.repository.appointment.HomeVisitBookingRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.service.homevisit.HomeVisitSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HomeVisitSessionServiceImpl implements HomeVisitSessionService {

    private static final int MAX_DAYS_AHEAD = 30;

    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final DoctorScheduleExceptionRepository exceptionRepository;
    private final HomeVisitBookingRepository bookingRepository;

    @Override
    public List<AvailableSessionResponse> getAvailableSessions(String doctorId) {
        Doctor doctor = doctorRepository.findById(doctorId).orElse(null);
        if (doctor == null || !Boolean.TRUE.equals(doctor.getAvailableForHomeVisit())) {
            return List.of();
        }

        List<DoctorSchedule> schedules = scheduleRepository
                .findByDoctor_DoctorIdAndAvailableTrue(doctorId);

        List<AvailableSessionResponse> result = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (DoctorSchedule schedule : schedules) {
            if (!"HomeVisit".equalsIgnoreCase(schedule.getConsultationType())) {
                continue;
            }

            int dayOfWeek = schedule.getDayOfWeek();
            List<LocalDate> availableDates = generateAvailableDates(doctorId, schedule, dayOfWeek, today);

            if (!availableDates.isEmpty()) {
                result.add(AvailableSessionResponse.builder()
                        .scheduleId(schedule.getScheduleId())
                        .sessionType(determineSessionType(schedule.getStartTime()))
                        .startTime(schedule.getStartTime())
                        .endTime(schedule.getEndTime())
                        .availableDates(availableDates)
                        .build());
            }
        }

        result.sort(Comparator.comparing(AvailableSessionResponse::getStartTime));
        return result;
    }

    @Override
    public boolean isSessionAvailable(String doctorId, Integer scheduleId, LocalDate date) {
        if (date.isBefore(LocalDate.now())) {
            return false;
        }

        Optional<DoctorScheduleException> exception = exceptionRepository
                .findByDoctor_DoctorIdAndExceptionDate(doctorId, date);
        if (exception.isPresent() && exception.get().getExceptionType() == ScheduleExceptionType.DAY_OFF) {
            return false;
        }

        return !bookingRepository.existsByDoctorIdAndScheduleIdAndBookingDate(doctorId, scheduleId, date);
    }

    @Override
    @Transactional
    public HomeVisitBooking lockSession(String doctorId, Integer scheduleId, LocalDate date, Integer appointmentId) {
        if (!isSessionAvailable(doctorId, scheduleId, date)) {
            throw new BusinessException("Session is no longer available");
        }

        HomeVisitBooking booking = HomeVisitBooking.builder()
                .doctorId(doctorId)
                .scheduleId(scheduleId)
                .bookingDate(date)
                .appointmentId(appointmentId)
                .build();

        return bookingRepository.save(booking);
    }

    @Override
    @Transactional
    public void releaseSession(Integer scheduleId, LocalDate date) {
        bookingRepository.findByScheduleIdAndBookingDate(scheduleId, date)
                .ifPresent(bookingRepository::delete);
    }

    private List<LocalDate> generateAvailableDates(String doctorId, DoctorSchedule schedule, int dayOfWeek, LocalDate today) {
        List<LocalDate> dates = new ArrayList<>();

        for (int i = 0; i < MAX_DAYS_AHEAD; i++) {
            LocalDate candidate = today.plusDays(i);
            if (candidate.getDayOfWeek().getValue() % 7 == dayOfWeek) {
                if (isSessionAvailable(doctorId, schedule.getScheduleId(), candidate)) {
                    dates.add(candidate);
                }
            }
        }

        return dates;
    }

    private String determineSessionType(LocalTime startTime) {
        if (startTime.isBefore(LocalTime.NOON)) {
            return "MORNING";
        }
        return "AFTERNOON";
    }
}
