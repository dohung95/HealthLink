package com.HealthLink.service.admin;

import com.HealthLink.dto.admin.AdminAnalyticsDataPointDto;
import com.HealthLink.dto.admin.AdminAnalyticsResponseDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.*;

@Service
@Transactional
public class AdminAnalyticsService {

    @PersistenceContext
    private EntityManager entityManager;

    private static final String[] MONTH_NAMES = {
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    };

    public AdminAnalyticsResponseDto getPatientRegistrations(int year) {
        if (year == 0) {
            year = LocalDate.now().getYear();
        }

        // Query to count patients registered each month
        String sql = "SELECT MONTH(u.CreatedDate) as month, COUNT(p.PatientID) as count " +
                     "FROM Patients p " +
                     "JOIN Users u ON p.PatientID = u.Id " +
                     "WHERE YEAR(u.CreatedDate) = :year " +
                     "GROUP BY MONTH(u.CreatedDate) " +
                     "ORDER BY MONTH(u.CreatedDate)";

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("year", year);

        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();

        // Create map with all months initialized to 0
        Map<Integer, Long> monthCounts = new LinkedHashMap<>();
        for (int i = 1; i <= 12; i++) {
            monthCounts.put(i, 0L);
        }

        // Fill in actual counts
        for (Object[] row : results) {
            int month = ((Number) row[0]).intValue();
            long count = ((Number) row[1]).longValue();
            monthCounts.put(month, count);
        }

        // Convert to DTO list
        List<AdminAnalyticsDataPointDto> data = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            data.add(AdminAnalyticsDataPointDto.builder()
                .month(MONTH_NAMES[i - 1])
                .count(monthCounts.get(i))
                .build());
        }

        return AdminAnalyticsResponseDto.builder()
            .year(year)
            .data(data)
            .build();
    }

    public AdminAnalyticsResponseDto getAppointmentsByMonth(int year) {
        if (year == 0) {
            year = LocalDate.now().getYear();
        }

        String sql = "SELECT MONTH(AppointmentTime) as month, COUNT(*) as count " +
                     "FROM Appointments " +
                     "WHERE YEAR(AppointmentTime) = :year " +
                     "GROUP BY MONTH(AppointmentTime) " +
                     "ORDER BY MONTH(AppointmentTime)";

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("year", year);

        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();

        // Create map with all months initialized to 0
        Map<Integer, Long> monthCounts = new LinkedHashMap<>();
        for (int i = 1; i <= 12; i++) {
            monthCounts.put(i, 0L);
        }

        // Fill in actual counts
        for (Object[] row : results) {
            int month = ((Number) row[0]).intValue();
            long count = ((Number) row[1]).longValue();
            monthCounts.put(month, count);
        }

        // Convert to DTO list
        List<AdminAnalyticsDataPointDto> data = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            data.add(AdminAnalyticsDataPointDto.builder()
                .month(MONTH_NAMES[i - 1])
                .count(monthCounts.get(i))
                .build());
        }

        return AdminAnalyticsResponseDto.builder()
            .year(year)
            .data(data)
            .build();
    }

    public AdminAnalyticsResponseDto getAppointmentsByWeek(int year, int month) {
        if (year == 0) {
            year = LocalDate.now().getYear();
        }
        if (month == 0) {
            month = LocalDate.now().getMonthValue();
        }

        // Get the number of weeks in the month
        LocalDate firstOfMonth = LocalDate.of(year, month, 1);
        LocalDate lastOfMonth = firstOfMonth.withDayOfMonth(firstOfMonth.lengthOfMonth());

        String sql;
        if (month > 0) {
            sql = "SELECT " +
                  "CEILING(DAY(AppointmentTime) / 7.0) as week, " +
                  "COUNT(*) as count " +
                  "FROM Appointments " +
                  "WHERE YEAR(AppointmentTime) = :year " +
                  "AND MONTH(AppointmentTime) = :month " +
                  "GROUP BY CEILING(DAY(AppointmentTime) / 7.0) " +
                  "ORDER BY week";
        } else {
            sql = "SELECT " +
                  "CEILING(DAY(AppointmentTime) / 7.0) as week, " +
                  "COUNT(*) as count " +
                  "FROM Appointments " +
                  "WHERE YEAR(AppointmentTime) = :year " +
                  "GROUP BY CEILING(DAY(AppointmentTime) / 7.0) " +
                  "ORDER BY week";
        }

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("year", year);
        if (month > 0) {
            query.setParameter("month", month);
        }

        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();

        // Initialize weeks 1-5 with 0
        Map<Integer, Long> weekCounts = new LinkedHashMap<>();
        for (int i = 1; i <= 5; i++) {
            weekCounts.put(i, 0L);
        }

        // Fill in actual counts
        for (Object[] row : results) {
            int week = ((Number) row[0]).intValue();
            long count = ((Number) row[1]).longValue();
            if (week >= 1 && week <= 5) {
                weekCounts.put(week, count);
            }
        }

        // Convert to DTO list
        List<AdminAnalyticsDataPointDto> data = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            data.add(AdminAnalyticsDataPointDto.builder()
                .week("Week " + i)
                .count(weekCounts.get(i))
                .build());
        }

        return AdminAnalyticsResponseDto.builder()
            .year(year)
            .month(month)
            .data(data)
            .build();
    }

    public AdminAnalyticsResponseDto getRevenueByMonth(int year) {
        if (year == 0) {
            year = LocalDate.now().getYear();
        }

        String sql = "SELECT MONTH(a.AppointmentTime) as month, COALESCE(SUM(a.Fee), 0) as total " +
                     "FROM Appointments a " +
                     "WHERE YEAR(a.AppointmentTime) = :year " +
                     "AND LOWER(a.Status) = 'completed' " +
                     "GROUP BY MONTH(a.AppointmentTime) " +
                     "ORDER BY MONTH(a.AppointmentTime)";

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("year", year);

        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();

        // Create map with all months initialized to 0
        Map<Integer, Long> monthRevenue = new LinkedHashMap<>();
        for (int i = 1; i <= 12; i++) {
            monthRevenue.put(i, 0L);
        }

        // Fill in actual revenue
        for (Object[] row : results) {
            int month = ((Number) row[0]).intValue();
            long revenue = ((Number) row[1]).longValue();
            monthRevenue.put(month, revenue);
        }

        // Convert to DTO list
        List<AdminAnalyticsDataPointDto> data = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            data.add(AdminAnalyticsDataPointDto.builder()
                .month(MONTH_NAMES[i - 1])
                .count(monthRevenue.get(i))
                .build());
        }

        return AdminAnalyticsResponseDto.builder()
            .year(year)
            .data(data)
            .build();
    }
}
