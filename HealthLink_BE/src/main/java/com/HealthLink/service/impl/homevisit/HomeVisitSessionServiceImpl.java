package com.HealthLink.service.impl.homevisit;

import com.HealthLink.dto.response.AvailableSessionResponse;
import com.HealthLink.dto.response.HomeVisitEstimateResponse;
import com.HealthLink.dto.response.HomeVisitSlotResponse;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.entity.DoctorScheduleException;
import com.HealthLink.entity.HomeVisitBooking;
import com.HealthLink.entity.HomeVisitService;
import com.HealthLink.entity.enums.ScheduleExceptionType;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.repository.admin.DoctorScheduleExceptionRepository;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.appointment.HomeVisitBookingRepository;
import com.HealthLink.repository.appointment.HomeVisitServiceRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.service.homevisit.HomeVisitLocationService;
import com.HealthLink.service.homevisit.HomeVisitSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;

@Service
@RequiredArgsConstructor
@Slf4j
public class HomeVisitSessionServiceImpl implements HomeVisitSessionService {

    private static final int MAX_DAYS_AHEAD = 30;

    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final DoctorScheduleExceptionRepository exceptionRepository;
    private final HomeVisitBookingRepository bookingRepository;

    private final AppointmentRepository appointmentRepository;
    private final HomeVisitLocationService homeVisitLocationService;
    private final HomeVisitServiceRepository homeVisitServiceRepository;

    @Value("${home-visit.default-visit-duration-minutes:45}")
    private int defaultVisitDurationMinutes;

    @Value("${home-visit.travel-buffer-minutes:10}")
    private int travelBufferMinutes;

    @Value("${home-visit.slot-step-minutes:30}")
    private int slotStepMinutes;

    @Value("${home-visit.slot-days-ahead:30}")
    private int slotDaysAhead;

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

    private int calculateServicesDuration(List<Integer> serviceIds) {
        if (serviceIds == null || serviceIds.isEmpty()) {
            return 0;
        }

        return homeVisitServiceRepository.findAllById(serviceIds)
                .stream()
                .filter(service -> Boolean.TRUE.equals(service.getActive()))
                .map(HomeVisitService::getDurationMinutes)
                .filter(duration -> duration != null)
                .mapToInt(Integer::intValue)
                .sum();
    }

    private boolean isDoctorDayOff(String doctorId, LocalDate date) {
        Optional<DoctorScheduleException> exception
                = exceptionRepository.findByDoctor_DoctorIdAndExceptionDate(doctorId, date);

        return exception.isPresent()
                && exception.get().getExceptionType() == ScheduleExceptionType.DAY_OFF;
    }

    @Override
    public List<HomeVisitSlotResponse> getAvailableSlots(
            String doctorId,
            Double visitLatitude,
            Double visitLongitude,
            List<Integer> homeVisitServiceIds
    ) {
        Doctor doctor = doctorRepository.findById(doctorId).orElse(null);
        if (doctor == null || !Boolean.TRUE.equals(doctor.getAvailableForHomeVisit())) {
            return List.of();
        }

        HomeVisitEstimateResponse estimate = homeVisitLocationService.estimate(
                doctorId,
                visitLatitude,
                visitLongitude
        );

        if (!Boolean.TRUE.equals(estimate.getServiceable())) {
            return List.of();
        }

        int estimatedTravelMinutes = estimate.getEstimatedTravelMinutes() != null
                ? estimate.getEstimatedTravelMinutes()
                : 0;

        int servicesDurationMinutes = calculateServicesDuration(homeVisitServiceIds);

        int totalBlockMinutes
                = defaultVisitDurationMinutes
                + servicesDurationMinutes
                + estimatedTravelMinutes * 2
                + travelBufferMinutes;

        List<DoctorSchedule> schedules
                = scheduleRepository.findByDoctor_DoctorIdAndScheduleStatus(
                        doctorId,
                        com.HealthLink.entity.enums.DoctorScheduleStatus.APPROVED
                );

        List<HomeVisitSlotResponse> result = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (DoctorSchedule schedule : schedules) {

            if (!schedule.isAvailable()) {
                continue;
            }

            if (!"HomeVisit".equalsIgnoreCase(schedule.getConsultationType())) {
                continue;
            }

            for (int i = 0; i < slotDaysAhead; i++) {
                LocalDate candidateDate = today.plusDays(i);

                if (candidateDate.getDayOfWeek().getValue() % 7 != schedule.getDayOfWeek()) {
                    continue;
                }

                if (isDoctorDayOff(doctorId, candidateDate)) {
                    continue;
                }

                LocalTime candidateStart = schedule.getStartTime();

                while (!candidateStart.plusMinutes(totalBlockMinutes).isAfter(schedule.getEndTime())) {
                    LocalTime candidateEnd = candidateStart.plusMinutes(totalBlockMinutes);

                    if (isSlotAvailable(
                            doctorId,
                            schedule.getScheduleId(),
                            candidateDate,
                            candidateStart,
                            candidateEnd
                    )) {
                        result.add(HomeVisitSlotResponse.builder()
                                .scheduleId(schedule.getScheduleId())
                                .bookingDate(candidateDate)
                                .sessionType(determineSessionType(candidateStart))
                                .startTime(candidateStart)
                                .endTime(candidateEnd)
                                .estimatedTravelMinutes(estimatedTravelMinutes)
                                .visitDurationMinutes(defaultVisitDurationMinutes)
                                .servicesDurationMinutes(servicesDurationMinutes)
                                .bufferMinutes(travelBufferMinutes)
                                .totalBlockMinutes(totalBlockMinutes)
                                .build());
                    }

                    candidateStart = candidateStart.plusMinutes(slotStepMinutes);
                }
            }
        }

        result.sort(
                Comparator.comparing(HomeVisitSlotResponse::getBookingDate)
                        .thenComparing(HomeVisitSlotResponse::getStartTime)
        );

        return result;
    }

    @Override
    public boolean isSlotAvailable(
            String doctorId,
            Integer scheduleId,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime
    ) {
        if (doctorId == null || scheduleId == null || date == null || startTime == null || endTime == null) {
            return false;
        }

        if (!endTime.isAfter(startTime)) {
            return false;
        }

        if (date.isBefore(LocalDate.now())) {
            return false;
        }

        if (isDoctorDayOff(doctorId, date)) {
            return false;
        }

        boolean hasHomeVisitBooking = bookingRepository.existsOverlappingBooking(
                doctorId,
                date,
                startTime,
                endTime
        );

        if (hasHomeVisitBooking) {
            return false;
        }

        LocalDateTime slotStart = LocalDateTime.of(date, startTime);
        LocalDateTime slotEnd = LocalDateTime.of(date, endTime);

        return !appointmentRepository.existsDoctorAppointmentOverlap(
                doctorId,
                "Cancelled",
                slotStart,
                slotEnd
        );
    }
}
