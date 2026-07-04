package com.HealthLink.service.admin;

import com.HealthLink.dto.admin.AdminAnalyticsDataPointDto;
import com.HealthLink.dto.admin.AdminAnalyticsResponseDto;
import com.HealthLink.dto.admin.AdminAnalyticsSplitDataPointDto;
import com.HealthLink.dto.admin.AdminAnalyticsSplitResponseDto;
import com.HealthLink.dto.admin.AdminOverviewStatsDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.time.YearMonth;
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

    /**
     * Builds "Week N (start-end)" labels for a given year/month. Week 5 is a short
     * remainder (e.g. days 29-31) rather than a full 7-day week for most months,
     * so the day range is spelled out to avoid implying every "week" has 7 days.
     */
    private String[] buildWeekLabels(int year, int month) {
        int daysInMonth = YearMonth.of(year, month).lengthOfMonth();
        String[] labels = new String[5];
        for (int i = 1; i <= 5; i++) {
            int startDay = (i - 1) * 7 + 1;
            int endDay = Math.min(i * 7, daysInMonth);
            labels[i - 1] = "Week " + i + " (" + startDay + "-" + endDay + ")";
        }
        return labels;
    }

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

    /**
     * Appointments per month split by ConsultationType: HomeVisit vs everything else (Online).
     */
    public AdminAnalyticsSplitResponseDto getAppointmentsByMonthSplit(int year) {
        if (year == 0) {
            year = LocalDate.now().getYear();
        }

        String sql = "SELECT MONTH(AppointmentTime) as month, " +
                     "SUM(CASE WHEN LOWER(ConsultationType) = 'homevisit' THEN 0 ELSE 1 END) as onlineCount, " +
                     "SUM(CASE WHEN LOWER(ConsultationType) = 'homevisit' THEN 1 ELSE 0 END) as homeVisitCount " +
                     "FROM Appointments " +
                     "WHERE YEAR(AppointmentTime) = :year " +
                     "GROUP BY MONTH(AppointmentTime) " +
                     "ORDER BY MONTH(AppointmentTime)";

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("year", year);

        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();

        Map<Integer, long[]> monthCounts = new LinkedHashMap<>();
        for (int i = 1; i <= 12; i++) {
            monthCounts.put(i, new long[]{0L, 0L});
        }

        for (Object[] row : results) {
            int month = ((Number) row[0]).intValue();
            long online = ((Number) row[1]).longValue();
            long homeVisit = ((Number) row[2]).longValue();
            monthCounts.put(month, new long[]{online, homeVisit});
        }

        List<AdminAnalyticsSplitDataPointDto> data = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            long[] counts = monthCounts.get(i);
            data.add(AdminAnalyticsSplitDataPointDto.builder()
                .month(MONTH_NAMES[i - 1])
                .valueA(counts[0])
                .valueB(counts[1])
                .build());
        }

        return AdminAnalyticsSplitResponseDto.builder()
            .year(year)
            .labelA("Online")
            .labelB("Home Visit")
            .data(data)
            .build();
    }

    /**
     * Revenue per month (completed appointments only) split by ConsultationType: HomeVisit vs Online.
     */
    public AdminAnalyticsSplitResponseDto getRevenueByMonthSplit(int year) {
        if (year == 0) {
            year = LocalDate.now().getYear();
        }

        String sql = "SELECT MONTH(a.AppointmentTime) as month, " +
                     "COALESCE(SUM(CASE WHEN LOWER(a.ConsultationType) = 'homevisit' THEN 0 ELSE a.Fee END), 0) as onlineRevenue, " +
                     "COALESCE(SUM(CASE WHEN LOWER(a.ConsultationType) = 'homevisit' THEN a.Fee ELSE 0 END), 0) as homeVisitRevenue " +
                     "FROM Appointments a " +
                     "WHERE YEAR(a.AppointmentTime) = :year " +
                     "AND LOWER(a.Status) = 'completed' " +
                     "GROUP BY MONTH(a.AppointmentTime) " +
                     "ORDER BY MONTH(a.AppointmentTime)";

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("year", year);

        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();

        Map<Integer, long[]> monthRevenue = new LinkedHashMap<>();
        for (int i = 1; i <= 12; i++) {
            monthRevenue.put(i, new long[]{0L, 0L});
        }

        for (Object[] row : results) {
            int month = ((Number) row[0]).intValue();
            long online = ((Number) row[1]).longValue();
            long homeVisit = ((Number) row[2]).longValue();
            monthRevenue.put(month, new long[]{online, homeVisit});
        }

        List<AdminAnalyticsSplitDataPointDto> data = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            long[] revenue = monthRevenue.get(i);
            data.add(AdminAnalyticsSplitDataPointDto.builder()
                .month(MONTH_NAMES[i - 1])
                .valueA(revenue[0])
                .valueB(revenue[1])
                .build());
        }

        return AdminAnalyticsSplitResponseDto.builder()
            .year(year)
            .labelA("Online Revenue")
            .labelB("Home Visit Revenue")
            .data(data)
            .build();
    }

    /**
     * New registrations per month split by role: Doctor vs Pharmacy.
     */
    public AdminAnalyticsSplitResponseDto getRegistrationsByRole(int year) {
        if (year == 0) {
            year = LocalDate.now().getYear();
        }

        String doctorSql = "SELECT MONTH(u.CreatedDate) as month, COUNT(d.DoctorID) as count " +
                     "FROM Doctors d " +
                     "JOIN Users u ON d.DoctorID = u.Id " +
                     "WHERE YEAR(u.CreatedDate) = :year " +
                     "GROUP BY MONTH(u.CreatedDate) " +
                     "ORDER BY MONTH(u.CreatedDate)";

        String pharmacySql = "SELECT MONTH(u.CreatedDate) as month, COUNT(p.PharmacyID) as count " +
                     "FROM Pharmacies p " +
                     "JOIN Users u ON p.PharmacyID = u.Id " +
                     "WHERE YEAR(u.CreatedDate) = :year " +
                     "GROUP BY MONTH(u.CreatedDate) " +
                     "ORDER BY MONTH(u.CreatedDate)";

        Map<Integer, Long> doctorCounts = new LinkedHashMap<>();
        Map<Integer, Long> pharmacyCounts = new LinkedHashMap<>();
        for (int i = 1; i <= 12; i++) {
            doctorCounts.put(i, 0L);
            pharmacyCounts.put(i, 0L);
        }

        Query doctorQuery = entityManager.createNativeQuery(doctorSql);
        doctorQuery.setParameter("year", year);
        @SuppressWarnings("unchecked")
        List<Object[]> doctorResults = doctorQuery.getResultList();
        for (Object[] row : doctorResults) {
            doctorCounts.put(((Number) row[0]).intValue(), ((Number) row[1]).longValue());
        }

        Query pharmacyQuery = entityManager.createNativeQuery(pharmacySql);
        pharmacyQuery.setParameter("year", year);
        @SuppressWarnings("unchecked")
        List<Object[]> pharmacyResults = pharmacyQuery.getResultList();
        for (Object[] row : pharmacyResults) {
            pharmacyCounts.put(((Number) row[0]).intValue(), ((Number) row[1]).longValue());
        }

        List<AdminAnalyticsSplitDataPointDto> data = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            data.add(AdminAnalyticsSplitDataPointDto.builder()
                .month(MONTH_NAMES[i - 1])
                .valueA(doctorCounts.get(i))
                .valueB(pharmacyCounts.get(i))
                .build());
        }

        return AdminAnalyticsSplitResponseDto.builder()
            .year(year)
            .labelA("Doctors")
            .labelB("Pharmacies")
            .data(data)
            .build();
    }

    /**
     * Patient registrations by week within a single month (drill-down from the monthly chart).
     */
    public AdminAnalyticsResponseDto getPatientRegistrationsByWeek(int year, int month) {
        if (year == 0) {
            year = LocalDate.now().getYear();
        }
        if (month == 0) {
            month = LocalDate.now().getMonthValue();
        }

        String sql = "SELECT CEILING(DAY(u.CreatedDate) / 7.0) as week, COUNT(p.PatientID) as count " +
                     "FROM Patients p " +
                     "JOIN Users u ON p.PatientID = u.Id " +
                     "WHERE YEAR(u.CreatedDate) = :year AND MONTH(u.CreatedDate) = :month " +
                     "GROUP BY CEILING(DAY(u.CreatedDate) / 7.0) " +
                     "ORDER BY week";

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("year", year);
        query.setParameter("month", month);

        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();

        Map<Integer, Long> weekCounts = new LinkedHashMap<>();
        for (int i = 1; i <= 5; i++) {
            weekCounts.put(i, 0L);
        }

        for (Object[] row : results) {
            int week = ((Number) row[0]).intValue();
            long count = ((Number) row[1]).longValue();
            if (week >= 1 && week <= 5) {
                weekCounts.put(week, count);
            }
        }

        String[] weekLabels = buildWeekLabels(year, month);
        List<AdminAnalyticsDataPointDto> data = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            data.add(AdminAnalyticsDataPointDto.builder()
                .month(weekLabels[i - 1])
                .count(weekCounts.get(i))
                .build());
        }

        return AdminAnalyticsResponseDto.builder()
            .year(year)
            .month(month)
            .data(data)
            .build();
    }

    /**
     * Appointments by week within a single month, split by ConsultationType: HomeVisit vs Online.
     */
    public AdminAnalyticsSplitResponseDto getAppointmentsByWeekSplit(int year, int month) {
        if (year == 0) {
            year = LocalDate.now().getYear();
        }
        if (month == 0) {
            month = LocalDate.now().getMonthValue();
        }

        String sql = "SELECT CEILING(DAY(AppointmentTime) / 7.0) as week, " +
                     "SUM(CASE WHEN LOWER(ConsultationType) = 'homevisit' THEN 0 ELSE 1 END) as onlineCount, " +
                     "SUM(CASE WHEN LOWER(ConsultationType) = 'homevisit' THEN 1 ELSE 0 END) as homeVisitCount " +
                     "FROM Appointments " +
                     "WHERE YEAR(AppointmentTime) = :year AND MONTH(AppointmentTime) = :month " +
                     "GROUP BY CEILING(DAY(AppointmentTime) / 7.0) " +
                     "ORDER BY week";

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("year", year);
        query.setParameter("month", month);

        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();

        Map<Integer, long[]> weekCounts = new LinkedHashMap<>();
        for (int i = 1; i <= 5; i++) {
            weekCounts.put(i, new long[]{0L, 0L});
        }

        for (Object[] row : results) {
            int week = ((Number) row[0]).intValue();
            long online = ((Number) row[1]).longValue();
            long homeVisit = ((Number) row[2]).longValue();
            if (week >= 1 && week <= 5) {
                weekCounts.put(week, new long[]{online, homeVisit});
            }
        }

        String[] weekLabels = buildWeekLabels(year, month);
        List<AdminAnalyticsSplitDataPointDto> data = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            long[] counts = weekCounts.get(i);
            data.add(AdminAnalyticsSplitDataPointDto.builder()
                .month(weekLabels[i - 1])
                .valueA(counts[0])
                .valueB(counts[1])
                .build());
        }

        return AdminAnalyticsSplitResponseDto.builder()
            .year(year)
            .labelA("Online")
            .labelB("Home Visit")
            .data(data)
            .build();
    }

    /**
     * Revenue by week within a single month (completed appointments only), split Online vs Home Visit.
     */
    public AdminAnalyticsSplitResponseDto getRevenueByWeekSplit(int year, int month) {
        if (year == 0) {
            year = LocalDate.now().getYear();
        }
        if (month == 0) {
            month = LocalDate.now().getMonthValue();
        }

        String sql = "SELECT CEILING(DAY(a.AppointmentTime) / 7.0) as week, " +
                     "COALESCE(SUM(CASE WHEN LOWER(a.ConsultationType) = 'homevisit' THEN 0 ELSE a.Fee END), 0) as onlineRevenue, " +
                     "COALESCE(SUM(CASE WHEN LOWER(a.ConsultationType) = 'homevisit' THEN a.Fee ELSE 0 END), 0) as homeVisitRevenue " +
                     "FROM Appointments a " +
                     "WHERE YEAR(a.AppointmentTime) = :year AND MONTH(a.AppointmentTime) = :month " +
                     "AND LOWER(a.Status) = 'completed' " +
                     "GROUP BY CEILING(DAY(a.AppointmentTime) / 7.0) " +
                     "ORDER BY week";

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("year", year);
        query.setParameter("month", month);

        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();

        Map<Integer, long[]> weekRevenue = new LinkedHashMap<>();
        for (int i = 1; i <= 5; i++) {
            weekRevenue.put(i, new long[]{0L, 0L});
        }

        for (Object[] row : results) {
            int week = ((Number) row[0]).intValue();
            long online = ((Number) row[1]).longValue();
            long homeVisit = ((Number) row[2]).longValue();
            if (week >= 1 && week <= 5) {
                weekRevenue.put(week, new long[]{online, homeVisit});
            }
        }

        String[] weekLabels = buildWeekLabels(year, month);
        List<AdminAnalyticsSplitDataPointDto> data = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            long[] revenue = weekRevenue.get(i);
            data.add(AdminAnalyticsSplitDataPointDto.builder()
                .month(weekLabels[i - 1])
                .valueA(revenue[0])
                .valueB(revenue[1])
                .build());
        }

        return AdminAnalyticsSplitResponseDto.builder()
            .year(year)
            .labelA("Online Revenue")
            .labelB("Home Visit Revenue")
            .data(data)
            .build();
    }

    /**
     * New registrations by week within a single month, split by role: Doctor vs Pharmacy.
     */
    public AdminAnalyticsSplitResponseDto getRegistrationsByWeekRole(int year, int month) {
        if (year == 0) {
            year = LocalDate.now().getYear();
        }
        if (month == 0) {
            month = LocalDate.now().getMonthValue();
        }

        String doctorSql = "SELECT CEILING(DAY(u.CreatedDate) / 7.0) as week, COUNT(d.DoctorID) as count " +
                     "FROM Doctors d " +
                     "JOIN Users u ON d.DoctorID = u.Id " +
                     "WHERE YEAR(u.CreatedDate) = :year AND MONTH(u.CreatedDate) = :month " +
                     "GROUP BY CEILING(DAY(u.CreatedDate) / 7.0) " +
                     "ORDER BY week";

        String pharmacySql = "SELECT CEILING(DAY(u.CreatedDate) / 7.0) as week, COUNT(p.PharmacyID) as count " +
                     "FROM Pharmacies p " +
                     "JOIN Users u ON p.PharmacyID = u.Id " +
                     "WHERE YEAR(u.CreatedDate) = :year AND MONTH(u.CreatedDate) = :month " +
                     "GROUP BY CEILING(DAY(u.CreatedDate) / 7.0) " +
                     "ORDER BY week";

        Map<Integer, Long> doctorCounts = new LinkedHashMap<>();
        Map<Integer, Long> pharmacyCounts = new LinkedHashMap<>();
        for (int i = 1; i <= 5; i++) {
            doctorCounts.put(i, 0L);
            pharmacyCounts.put(i, 0L);
        }

        Query doctorQuery = entityManager.createNativeQuery(doctorSql);
        doctorQuery.setParameter("year", year);
        doctorQuery.setParameter("month", month);
        @SuppressWarnings("unchecked")
        List<Object[]> doctorResults = doctorQuery.getResultList();
        for (Object[] row : doctorResults) {
            int week = ((Number) row[0]).intValue();
            if (week >= 1 && week <= 5) {
                doctorCounts.put(week, ((Number) row[1]).longValue());
            }
        }

        Query pharmacyQuery = entityManager.createNativeQuery(pharmacySql);
        pharmacyQuery.setParameter("year", year);
        pharmacyQuery.setParameter("month", month);
        @SuppressWarnings("unchecked")
        List<Object[]> pharmacyResults = pharmacyQuery.getResultList();
        for (Object[] row : pharmacyResults) {
            int week = ((Number) row[0]).intValue();
            if (week >= 1 && week <= 5) {
                pharmacyCounts.put(week, ((Number) row[1]).longValue());
            }
        }

        String[] weekLabels = buildWeekLabels(year, month);
        List<AdminAnalyticsSplitDataPointDto> data = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            data.add(AdminAnalyticsSplitDataPointDto.builder()
                .month(weekLabels[i - 1])
                .valueA(doctorCounts.get(i))
                .valueB(pharmacyCounts.get(i))
                .build());
        }

        return AdminAnalyticsSplitResponseDto.builder()
            .year(year)
            .labelA("Doctors")
            .labelB("Pharmacies")
            .data(data)
            .build();
    }

    /**
     * Appointments by hour of day the patient booked, split by ConsultationType: HomeVisit vs Online.
     * month = 0 covers the whole year; otherwise restricted to that single month.
     */
    public AdminAnalyticsSplitResponseDto getAppointmentsByHourSplit(int year, int month) {
        if (year == 0) {
            year = LocalDate.now().getYear();
        }

        String sql = "SELECT DATEPART(HOUR, AppointmentTime) as hour, " +
                     "SUM(CASE WHEN LOWER(ConsultationType) = 'homevisit' THEN 0 ELSE 1 END) as onlineCount, " +
                     "SUM(CASE WHEN LOWER(ConsultationType) = 'homevisit' THEN 1 ELSE 0 END) as homeVisitCount " +
                     "FROM Appointments " +
                     "WHERE YEAR(AppointmentTime) = :year " +
                     (month != 0 ? "AND MONTH(AppointmentTime) = :month " : "") +
                     "GROUP BY DATEPART(HOUR, AppointmentTime) " +
                     "ORDER BY hour";

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("year", year);
        if (month != 0) {
            query.setParameter("month", month);
        }

        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();

        Map<Integer, long[]> hourCounts = new LinkedHashMap<>();
        for (int i = 0; i < 24; i++) {
            hourCounts.put(i, new long[]{0L, 0L});
        }

        for (Object[] row : results) {
            int hour = ((Number) row[0]).intValue();
            long online = ((Number) row[1]).longValue();
            long homeVisit = ((Number) row[2]).longValue();
            if (hour >= 0 && hour < 24) {
                hourCounts.put(hour, new long[]{online, homeVisit});
            }
        }

        List<AdminAnalyticsSplitDataPointDto> data = new ArrayList<>();
        for (int i = 0; i < 24; i++) {
            long[] counts = hourCounts.get(i);
            data.add(AdminAnalyticsSplitDataPointDto.builder()
                .month(String.format("%02d:00", i))
                .valueA(counts[0])
                .valueB(counts[1])
                .build());
        }

        return AdminAnalyticsSplitResponseDto.builder()
            .year(year)
            .labelA("Online")
            .labelB("Home Visit")
            .data(data)
            .build();
    }

    /**
     * All-time system totals (not filtered by year/month): appointments, revenue,
     * patients, doctors, pharmacies. Used by the reserved dashboard panel.
     */
    public AdminOverviewStatsDto getOverviewStats() {
        long totalAppointments = ((Number) entityManager
            .createNativeQuery("SELECT COUNT(*) FROM Appointments")
            .getSingleResult()).longValue();

        long totalPatients = ((Number) entityManager
            .createNativeQuery("SELECT COUNT(*) FROM Patients")
            .getSingleResult()).longValue();

        long totalDoctors = ((Number) entityManager
            .createNativeQuery("SELECT COUNT(*) FROM Doctors")
            .getSingleResult()).longValue();

        long totalPharmacies = ((Number) entityManager
            .createNativeQuery("SELECT COUNT(*) FROM Pharmacies")
            .getSingleResult()).longValue();

        Number revenueResult = (Number) entityManager
            .createNativeQuery("SELECT COALESCE(SUM(Fee), 0) FROM Appointments WHERE LOWER(Status) = 'completed'")
            .getSingleResult();
        BigDecimal totalRevenue = revenueResult != null
            ? new BigDecimal(revenueResult.toString())
            : BigDecimal.ZERO;

        return AdminOverviewStatsDto.builder()
            .totalAppointments(totalAppointments)
            .totalRevenue(totalRevenue)
            .totalPatients(totalPatients)
            .totalDoctors(totalDoctors)
            .totalPharmacies(totalPharmacies)
            .build();
    }
}
