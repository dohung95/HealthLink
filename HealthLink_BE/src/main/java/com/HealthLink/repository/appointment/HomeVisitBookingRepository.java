package com.HealthLink.repository.appointment;

import com.HealthLink.entity.HomeVisitBooking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HomeVisitBookingRepository extends JpaRepository<HomeVisitBooking, Integer> {

    boolean existsByDoctorIdAndScheduleIdAndBookingDate(String doctorId, Integer scheduleId, LocalDate bookingDate);

    List<HomeVisitBooking> findByDoctorIdAndBookingDate(String doctorId, LocalDate bookingDate);

    Optional<HomeVisitBooking> findByAppointmentId(Integer appointmentId);

    void deleteByAppointmentId(Integer appointmentId);

    Optional<HomeVisitBooking> findByScheduleIdAndBookingDate(Integer scheduleId, LocalDate bookingDate);
}
