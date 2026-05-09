package com.HealthLink.repository.admin;

import com.HealthLink.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AdminAnalyticsRepository extends JpaRepository<Appointment, Integer> {

    // Count appointments by month for a specific year
    @Query("SELECT MONTH(a.appointmentTime) as month, COUNT(a) as count " +
           "FROM Appointment a " +
           "WHERE YEAR(a.appointmentTime) = :year " +
           "GROUP BY MONTH(a.appointmentTime) " +
           "ORDER BY MONTH(a.appointmentTime)")
    List<Object[]> countAppointmentsByMonth(@Param("year") int year);

    // Count appointments by week for a specific year and month
    @Query("SELECT FUNCTION('WEEK', a.appointmentTime) as week, COUNT(a) as count " +
           "FROM Appointment a " +
           "WHERE YEAR(a.appointmentTime) = :year " +
           "AND (:month = 0 OR MONTH(a.appointmentTime) = :month) " +
           "GROUP BY FUNCTION('WEEK', a.appointmentTime) " +
           "ORDER BY FUNCTION('WEEK', a.appointmentTime)")
    List<Object[]> countAppointmentsByWeek(@Param("year") int year, @Param("month") int month);
}
