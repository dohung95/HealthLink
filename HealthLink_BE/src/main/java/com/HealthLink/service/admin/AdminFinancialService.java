package com.HealthLink.service.admin;

import com.HealthLink.dto.admin.financial.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Transactional
public class AdminFinancialService {

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Get financial overview statistics
     */
    public FinancialOverviewDto getFinancialOverview() {
        LocalDate today = LocalDate.now();
        LocalDate startOfWeek = today.minusDays(today.getDayOfWeek().getValue() - 1);
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate startOfLastMonth = startOfMonth.minusMonths(1);

        // Total revenue from completed appointments
        String totalRevenueSql = "SELECT COALESCE(SUM(Fee), 0) FROM Appointments WHERE LOWER(Status) = 'completed'";
        BigDecimal totalRevenue = getBigDecimalResult(totalRevenueSql);

        // Platform fees (assuming 10% commission rate if not stored)
        String platformFeesSql = "SELECT COALESCE(SUM(i.PlatformFee), 0) FROM Invoices i WHERE i.Status = 'PAID'";
        BigDecimal platformFees = getBigDecimalResult(platformFeesSql);
        if (platformFees.compareTo(BigDecimal.ZERO) == 0) {
            // Estimate platform fees as 10% of total revenue
            platformFees = totalRevenue.multiply(new BigDecimal("0.10"));
        }

        // Doctor earnings
        BigDecimal doctorEarnings = totalRevenue.subtract(platformFees);

        // Today's revenue
        String todayRevenueSql = "SELECT COALESCE(SUM(Fee), 0) FROM Appointments " +
                "WHERE LOWER(Status) = 'completed' AND CAST(AppointmentTime AS DATE) = :today";
        Query todayQuery = entityManager.createNativeQuery(todayRevenueSql);
        todayQuery.setParameter("today", today);
        BigDecimal todayRevenue = new BigDecimal(todayQuery.getSingleResult().toString());

        // This week's revenue
        String weekRevenueSql = "SELECT COALESCE(SUM(Fee), 0) FROM Appointments " +
                "WHERE LOWER(Status) = 'completed' AND CAST(AppointmentTime AS DATE) >= :startOfWeek";
        Query weekQuery = entityManager.createNativeQuery(weekRevenueSql);
        weekQuery.setParameter("startOfWeek", startOfWeek);
        BigDecimal thisWeekRevenue = new BigDecimal(weekQuery.getSingleResult().toString());

        // This month's revenue
        String monthRevenueSql = "SELECT COALESCE(SUM(Fee), 0) FROM Appointments " +
                "WHERE LOWER(Status) = 'completed' AND CAST(AppointmentTime AS DATE) >= :startOfMonth";
        Query monthQuery = entityManager.createNativeQuery(monthRevenueSql);
        monthQuery.setParameter("startOfMonth", startOfMonth);
        BigDecimal thisMonthRevenue = new BigDecimal(monthQuery.getSingleResult().toString());

        // Last month's revenue (for growth calculation)
        String lastMonthRevenueSql = "SELECT COALESCE(SUM(Fee), 0) FROM Appointments " +
                "WHERE LOWER(Status) = 'completed' " +
                "AND CAST(AppointmentTime AS DATE) >= :startOfLastMonth " +
                "AND CAST(AppointmentTime AS DATE) < :startOfMonth";
        Query lastMonthQuery = entityManager.createNativeQuery(lastMonthRevenueSql);
        lastMonthQuery.setParameter("startOfLastMonth", startOfLastMonth);
        lastMonthQuery.setParameter("startOfMonth", startOfMonth);
        BigDecimal lastMonthRevenue = new BigDecimal(lastMonthQuery.getSingleResult().toString());

        // Transaction counts
        String totalTransSql = "SELECT COUNT(*) FROM Appointments WHERE Fee IS NOT NULL AND Fee > 0";
        long totalTransactions = getLongResult(totalTransSql);

        String completedTransSql = "SELECT COUNT(*) FROM Appointments WHERE LOWER(Status) = 'completed'";
        long completedTransactions = getLongResult(completedTransSql);

        String pendingTransSql = "SELECT COUNT(*) FROM Appointments WHERE LOWER(Status) IN ('scheduled', 'pending', 'in progress')";
        long pendingTransactions = getLongResult(pendingTransSql);

        String failedTransSql = "SELECT COUNT(*) FROM Appointments WHERE LOWER(Status) = 'cancelled'";
        long failedTransactions = getLongResult(failedTransSql);

        // Average transaction value
        BigDecimal averageTransactionValue = BigDecimal.ZERO;
        if (completedTransactions > 0) {
            averageTransactionValue = totalRevenue.divide(new BigDecimal(completedTransactions), 2, RoundingMode.HALF_UP);
        }

        // Growth calculations
        Double revenueGrowthPercent = null;
        if (lastMonthRevenue.compareTo(BigDecimal.ZERO) > 0) {
            revenueGrowthPercent = thisMonthRevenue.subtract(lastMonthRevenue)
                    .divide(lastMonthRevenue, 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    .doubleValue();
        }

        return FinancialOverviewDto.builder()
                .totalRevenue(totalRevenue)
                .platformFees(platformFees)
                .doctorEarnings(doctorEarnings)
                .pharmacyEarnings(BigDecimal.ZERO) // TODO: Implement pharmacy earnings
                .todayRevenue(todayRevenue)
                .thisWeekRevenue(thisWeekRevenue)
                .thisMonthRevenue(thisMonthRevenue)
                .totalTransactions(totalTransactions)
                .completedTransactions(completedTransactions)
                .pendingTransactions(pendingTransactions)
                .failedTransactions(failedTransactions)
                .averageTransactionValue(averageTransactionValue)
                .revenueGrowthPercent(revenueGrowthPercent)
                .build();
    }

    /**
     * Get transactions with pagination and filters
     */
    public FinancialTransactionPageDto getTransactions(
            int pageNumber, int pageSize,
            String status, String transactionType,
            LocalDate fromDate, LocalDate toDate,
            String searchTerm) {

        StringBuilder countSql = new StringBuilder();
        StringBuilder dataSql = new StringBuilder();

        String baseSelect = "SELECT a.AppointmentID, a.Fee, a.Status, a.AppointmentTime, " +
                "p.FullName as PatientName, p.PatientID, " +
                "d.FullName as DoctorName, d.DoctorID, " +
                "i.PlatformFee, i.DoctorEarning, i.CommissionRate, i.PaidAt, " +
                "pay.PaymentMethod, pay.PaymentGateway, pay.TransactionId as ExternalTransactionId ";

        String baseFrom = "FROM Appointments a " +
                "LEFT JOIN Patients p ON a.PatientID = p.PatientID " +
                "LEFT JOIN Doctors d ON a.DoctorID = d.DoctorID " +
                "LEFT JOIN Invoices i ON a.AppointmentID = i.AppointmentId " +
                "LEFT JOIN Payments pay ON i.InvoiceID = pay.InvoiceID ";

        countSql.append("SELECT COUNT(*) ").append(baseFrom);
        dataSql.append(baseSelect).append(baseFrom);

        StringBuilder whereClause = new StringBuilder("WHERE a.Fee IS NOT NULL AND a.Fee > 0 ");

        if (status != null && !status.isEmpty()) {
            whereClause.append("AND LOWER(a.Status) = LOWER(:status) ");
        }

        if (fromDate != null) {
            whereClause.append("AND CAST(a.AppointmentTime AS DATE) >= :fromDate ");
        }

        if (toDate != null) {
            whereClause.append("AND CAST(a.AppointmentTime AS DATE) <= :toDate ");
        }

        if (searchTerm != null && !searchTerm.isEmpty()) {
            whereClause.append("AND (p.FullName LIKE :searchTerm OR d.FullName LIKE :searchTerm " +
                    "OR CAST(a.AppointmentID AS VARCHAR) LIKE :searchTerm) ");
        }

        countSql.append(whereClause);
        dataSql.append(whereClause).append("ORDER BY a.AppointmentTime DESC ");

        // Count query
        Query countQuery = entityManager.createNativeQuery(countSql.toString());
        setQueryParameters(countQuery, status, fromDate, toDate, searchTerm);
        long totalCount = ((Number) countQuery.getSingleResult()).longValue();

        // Data query with pagination
        Query dataQuery = entityManager.createNativeQuery(dataSql.toString());
        setQueryParameters(dataQuery, status, fromDate, toDate, searchTerm);
        dataQuery.setFirstResult((pageNumber - 1) * pageSize);
        dataQuery.setMaxResults(pageSize);

        @SuppressWarnings("unchecked")
        List<Object[]> results = dataQuery.getResultList();

        List<FinancialTransactionDto> transactions = new ArrayList<>();
        for (Object[] row : results) {
            BigDecimal fee = row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
            BigDecimal platformFee = row[8] != null ? new BigDecimal(row[8].toString()) : fee.multiply(new BigDecimal("0.10"));
            BigDecimal doctorEarning = row[9] != null ? new BigDecimal(row[9].toString()) : fee.subtract(platformFee);
            BigDecimal commissionRate = row[10] != null ? new BigDecimal(row[10].toString()) : new BigDecimal("0.10");

            transactions.add(FinancialTransactionDto.builder()
                    .transactionId((Integer) row[0])
                    .transactionType("APPOINTMENT")
                    .referenceId(row[0] != null ? row[0].toString() : null)
                    .amount(fee)
                    .status(row[2] != null ? row[2].toString() : null)
                    .createdAt(row[3] != null ? ((java.sql.Timestamp) row[3]).toLocalDateTime() : null)
                    .patientName(row[4] != null ? row[4].toString() : null)
                    .patientId(row[5] != null ? row[5].toString() : null)
                    .providerName(row[6] != null ? row[6].toString() : null)
                    .providerId(row[7] != null ? row[7].toString() : null)
                    .providerType("DOCTOR")
                    .platformFee(platformFee)
                    .providerEarning(doctorEarning)
                    .commissionRate(commissionRate)
                    .paidAt(row[11] != null ? ((java.sql.Timestamp) row[11]).toLocalDateTime() : null)
                    .paymentMethod(row[12] != null ? row[12].toString() : null)
                    .paymentGateway(row[13] != null ? row[13].toString() : null)
                    .externalTransactionId(row[14] != null ? row[14].toString() : null)
                    .description("Consultation fee")
                    .build());
        }

        int totalPages = (int) Math.ceil((double) totalCount / pageSize);

        return FinancialTransactionPageDto.builder()
                .transactions(transactions)
                .pageNumber(pageNumber)
                .pageSize(pageSize)
                .totalCount(totalCount)
                .totalPages(totalPages)
                .build();
    }

    /**
     * Get revenue by day for a specific month
     */
    public RevenueByDayDto getRevenueByDay(int year, int month) {
        if (year == 0) {
            year = LocalDate.now().getYear();
        }
        if (month == 0) {
            month = LocalDate.now().getMonthValue();
        }

        LocalDate firstOfMonth = LocalDate.of(year, month, 1);
        int daysInMonth = firstOfMonth.lengthOfMonth();

        String sql = "SELECT DAY(AppointmentTime) as day, " +
                "COALESCE(SUM(Fee), 0) as revenue, " +
                "COUNT(*) as transactionCount " +
                "FROM Appointments " +
                "WHERE YEAR(AppointmentTime) = :year " +
                "AND MONTH(AppointmentTime) = :month " +
                "AND LOWER(Status) = 'completed' " +
                "GROUP BY DAY(AppointmentTime) " +
                "ORDER BY DAY(AppointmentTime)";

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("year", year);
        query.setParameter("month", month);

        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();

        // Initialize all days with zero
        Map<Integer, BigDecimal> dayRevenue = new LinkedHashMap<>();
        Map<Integer, Long> dayTransactions = new LinkedHashMap<>();
        for (int i = 1; i <= daysInMonth; i++) {
            dayRevenue.put(i, BigDecimal.ZERO);
            dayTransactions.put(i, 0L);
        }

        // Fill in actual values
        for (Object[] row : results) {
            int day = ((Number) row[0]).intValue();
            BigDecimal revenue = new BigDecimal(row[1].toString());
            long count = ((Number) row[2]).longValue();
            dayRevenue.put(day, revenue);
            dayTransactions.put(day, count);
        }

        // Convert to DTO
        List<RevenueByDayDto.DailyRevenueData> data = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd");

        for (int i = 1; i <= daysInMonth; i++) {
            LocalDate date = LocalDate.of(year, month, i);
            data.add(RevenueByDayDto.DailyRevenueData.builder()
                    .date(date.format(formatter))
                    .revenue(dayRevenue.get(i))
                    .transactionCount(dayTransactions.get(i))
                    .build());
        }

        return RevenueByDayDto.builder()
                .year(year)
                .month(month)
                .data(data)
                .build();
    }

    // Helper methods
    private BigDecimal getBigDecimalResult(String sql) {
        Query query = entityManager.createNativeQuery(sql);
        Object result = query.getSingleResult();
        return result != null ? new BigDecimal(result.toString()) : BigDecimal.ZERO;
    }

    private long getLongResult(String sql) {
        Query query = entityManager.createNativeQuery(sql);
        Object result = query.getSingleResult();
        return result != null ? ((Number) result).longValue() : 0L;
    }

    private void setQueryParameters(Query query, String status, LocalDate fromDate,
                                    LocalDate toDate, String searchTerm) {
        if (status != null && !status.isEmpty()) {
            query.setParameter("status", status);
        }
        if (fromDate != null) {
            query.setParameter("fromDate", fromDate);
        }
        if (toDate != null) {
            query.setParameter("toDate", toDate);
        }
        if (searchTerm != null && !searchTerm.isEmpty()) {
            query.setParameter("searchTerm", "%" + searchTerm + "%");
        }
    }
}
