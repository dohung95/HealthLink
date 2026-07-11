package com.HealthLink.repository.appointment;

import com.HealthLink.entity.HomeVisitBooking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HomeVisitBookingRepository extends JpaRepository<HomeVisitBooking, Integer> {

    boolean existsByDoctorIdAndScheduleIdAndBookingDate(String doctorId, Integer scheduleId, LocalDate bookingDate);

    List<HomeVisitBooking> findByDoctorIdAndBookingDate(String doctorId, LocalDate bookingDate);

    Optional<HomeVisitBooking> findByAppointmentId(Integer appointmentId);

    void deleteByAppointmentId(Integer appointmentId);

    Optional<HomeVisitBooking> findByScheduleIdAndBookingDate(Integer scheduleId, LocalDate bookingDate);

    @Query(value = """
    SELECT CAST(
        CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END
        AS bit
    )
    FROM HomeVisitBookings b
    WHERE b.DoctorId = :doctorId
      AND b.BookingDate = :bookingDate
      AND b.StartTime < CAST(:endTime AS time)
      AND b.EndTime > CAST(:startTime AS time)
""", nativeQuery = true)
    boolean existsOverlappingBooking(
            @Param("doctorId") String doctorId,
            @Param("bookingDate") LocalDate bookingDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime
    );

    @Query(value = """
    SELECT CAST(
        CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END
        AS bit
    )
    FROM HomeVisitBookings b
    WHERE b.DoctorId = :doctorId
      AND b.BookingDate = :bookingDate
      AND b.AppointmentId <> :excludeAppointmentId
      AND b.StartTime < CAST(:endTime AS time)
      AND b.EndTime > CAST(:startTime AS time)
    """, nativeQuery = true)
    boolean existsOverlappingBookingExcludingAppointment(
            @Param("doctorId") String doctorId,
            @Param("bookingDate") LocalDate bookingDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeAppointmentId") Integer excludeAppointmentId
    );
}
