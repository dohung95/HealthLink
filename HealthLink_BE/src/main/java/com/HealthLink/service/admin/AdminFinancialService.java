package com.HealthLink.service.admin;

import com.HealthLink.dto.admin.financial.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.transaction.annotation.Transactional;
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
     * Get financial overview statistics.
     * Gộp cả doanh thu Doctor (Appointments) và Pharmacy (PharmacyOrders):
     * Total Revenue / Platform Fees / Transactions = tổng 2 nguồn; Doctor Earnings
     * và Pharmacy Earnings tách riêng theo từng nguồn.
     *
     * @param year  0 = all-time (mặc định, không lọc); &gt;0 = chỉ lấy năm đó
     * @param month 0 = cả năm (khi year&gt;0); 1-12 = chỉ lấy đúng tháng đó trong năm
     */
    public FinancialOverviewDto getFinancialOverview(int year, int month) {
        LocalDate today = LocalDate.now();
        LocalDate startOfWeek = today.minusDays(today.getDayOfWeek().getValue() - 1);
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate startOfLastMonth = startOfMonth.minusMonths(1);

        BigDecimal totalRevenue;
        BigDecimal platformFees;
        BigDecimal doctorEarnings;
        BigDecimal pharmacyEarnings;
        long completedTransactions;

        if (year > 0) {
            // Filtered mode — reuse the same range-scoped computation as the "Today/This Month"
            // mini-chart breakdown, so Total Revenue/Platform Fees/Doctor+Pharmacy Earnings stay
            // internally consistent whichever period is selected.
            LocalDate from = month > 0 ? LocalDate.of(year, month, 1) : LocalDate.of(year, 1, 1);
            LocalDate to = month > 0 ? from.plusMonths(1) : from.plusYears(1);
            PeriodFinancials period = computePeriodFinancials(from, to);
            totalRevenue = period.totalRevenue;
            platformFees = period.platformFees;
            doctorEarnings = period.doctorEarnings;
            pharmacyEarnings = period.pharmacyEarnings;
            completedTransactions = countCompletedTransactionsInRange(from, to);
        } else {
            // All-time (default / unfiltered) — same totals as before this method took year/month.
            // ── Doctor (Appointments) ───────────────────────────────────────────
            BigDecimal doctorRevenue = getBigDecimalResult(
                    "SELECT COALESCE(SUM(Fee), 0) FROM Appointments WHERE LOWER(Status) = 'completed'");

            // Join to Appointments and require completed status so this is scoped to the exact
            // same set of appointments as doctorRevenue above — previously this counted PlatformFee
            // from ANY paid invoice regardless of its appointment's status, which could disagree
            // with doctorRevenue (e.g. a paid-in-advance appointment that was later cancelled).
            BigDecimal doctorPlatformFee = getBigDecimalResult(
                    "SELECT COALESCE(SUM(i.PlatformFee), 0) FROM Invoices i " +
                            "JOIN Appointments a ON i.AppointmentId = a.AppointmentID " +
                            "WHERE UPPER(i.Status) = 'PAID' AND LOWER(a.Status) = 'completed'");
            if (doctorPlatformFee.compareTo(BigDecimal.ZERO) == 0) {
                // Chưa có Invoice nào khớp (dữ liệu thưa) -> ước tính 10% doanh thu doctor
                doctorPlatformFee = doctorRevenue.multiply(new BigDecimal("0.10"));
            }
            doctorEarnings = doctorRevenue.subtract(doctorPlatformFee);

            // ── Pharmacy (PharmacyOrders) ───────────────────────────────────────
            BigDecimal pharmacyRevenue = getBigDecimalResult(
                    "SELECT COALESCE(SUM(totalAmount), 0) FROM PharmacyOrders WHERE UPPER(paymentStatus) = 'PAID'");

            // platformFee/pharmacyEarning của PharmacyOrders được FeeCalculatorService tính và
            // lưu ngay tại thời điểm capture PayPal, không phụ thuộc Invoice có tồn tại hay không.
            BigDecimal pharmacyPlatformFee = getBigDecimalResult(
                    "SELECT COALESCE(SUM(platformFee), 0) FROM PharmacyOrders WHERE UPPER(paymentStatus) = 'PAID'");
            pharmacyEarnings = getBigDecimalResult(
                    "SELECT COALESCE(SUM(pharmacyEarning), 0) FROM PharmacyOrders WHERE UPPER(paymentStatus) = 'PAID'");

            // ── Tổng hợp Doctor + Pharmacy ──────────────────────────────────────
            totalRevenue = doctorRevenue.add(pharmacyRevenue);
            platformFees = doctorPlatformFee.add(pharmacyPlatformFee);

            completedTransactions = getLongResult(
                    "SELECT COUNT(*) FROM Appointments WHERE LOWER(Status) = 'completed'")
                    + getLongResult(
                    "SELECT COUNT(*) FROM PharmacyOrders WHERE UPPER(paymentStatus) = 'PAID'");
        }

        // Today's revenue (doctor + pharmacy)
        BigDecimal todayRevenue = getDateFilteredSum(
                "SELECT COALESCE(SUM(Fee), 0) FROM Appointments " +
                        "WHERE LOWER(Status) = 'completed' AND CAST(AppointmentTime AS DATE) = :d", today)
                .add(getDateFilteredSum(
                        "SELECT COALESCE(SUM(totalAmount), 0) FROM PharmacyOrders " +
                                "WHERE UPPER(paymentStatus) = 'PAID' AND CAST(createdAt AS DATE) = :d", today));

        // This week's revenue
        BigDecimal thisWeekRevenue = getDateFilteredSum(
                "SELECT COALESCE(SUM(Fee), 0) FROM Appointments " +
                        "WHERE LOWER(Status) = 'completed' AND CAST(AppointmentTime AS DATE) >= :d", startOfWeek)
                .add(getDateFilteredSum(
                        "SELECT COALESCE(SUM(totalAmount), 0) FROM PharmacyOrders " +
                                "WHERE UPPER(paymentStatus) = 'PAID' AND CAST(createdAt AS DATE) >= :d", startOfWeek));

        // This month's revenue
        BigDecimal thisMonthRevenue = getDateFilteredSum(
                "SELECT COALESCE(SUM(Fee), 0) FROM Appointments " +
                        "WHERE LOWER(Status) = 'completed' AND CAST(AppointmentTime AS DATE) >= :d", startOfMonth)
                .add(getDateFilteredSum(
                        "SELECT COALESCE(SUM(totalAmount), 0) FROM PharmacyOrders " +
                                "WHERE UPPER(paymentStatus) = 'PAID' AND CAST(createdAt AS DATE) >= :d", startOfMonth));

        // Breakdown theo kỳ (Today / This Month) — dùng cho mini chart "Cụm A"
        PeriodFinancials todayFinancials = computePeriodFinancials(today, today.plusDays(1));
        PeriodFinancials thisMonthFinancials = computePeriodFinancials(startOfMonth, startOfMonth.plusMonths(1));

        // Last month's revenue (for growth calculation)
        Query lastMonthApptQuery = entityManager.createNativeQuery(
                "SELECT COALESCE(SUM(Fee), 0) FROM Appointments " +
                        "WHERE LOWER(Status) = 'completed' " +
                        "AND CAST(AppointmentTime AS DATE) >= :startOfLastMonth " +
                        "AND CAST(AppointmentTime AS DATE) < :startOfMonth");
        lastMonthApptQuery.setParameter("startOfLastMonth", startOfLastMonth);
        lastMonthApptQuery.setParameter("startOfMonth", startOfMonth);
        Query lastMonthPharmacyQuery = entityManager.createNativeQuery(
                "SELECT COALESCE(SUM(totalAmount), 0) FROM PharmacyOrders " +
                        "WHERE UPPER(paymentStatus) = 'PAID' " +
                        "AND CAST(createdAt AS DATE) >= :startOfLastMonth " +
                        "AND CAST(createdAt AS DATE) < :startOfMonth");
        lastMonthPharmacyQuery.setParameter("startOfLastMonth", startOfLastMonth);
        lastMonthPharmacyQuery.setParameter("startOfMonth", startOfMonth);
        BigDecimal lastMonthRevenue = new BigDecimal(lastMonthApptQuery.getSingleResult().toString())
                .add(new BigDecimal(lastMonthPharmacyQuery.getSingleResult().toString()));

        // Transaction counts (doctor + pharmacy)
        long totalTransactions = getLongResult(
                "SELECT COUNT(*) FROM Appointments WHERE Fee IS NOT NULL AND Fee > 0")
                + getLongResult(
                "SELECT COUNT(*) FROM PharmacyOrders WHERE totalAmount IS NOT NULL AND totalAmount > 0");

        long pendingTransactions = getLongResult(
                "SELECT COUNT(*) FROM Appointments WHERE LOWER(Status) IN ('scheduled', 'pending', 'in progress')")
                + getLongResult(
                "SELECT COUNT(*) FROM PharmacyOrders WHERE UPPER(paymentStatus) = 'PENDING'");

        long failedTransactions = getLongResult(
                "SELECT COUNT(*) FROM Appointments WHERE LOWER(Status) = 'cancelled'")
                + getLongResult(
                "SELECT COUNT(*) FROM PharmacyOrders WHERE UPPER(paymentStatus) IN ('REFUNDED', 'CANCELLED')");

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
                .pharmacyEarnings(pharmacyEarnings)
                .todayRevenue(todayRevenue)
                .thisWeekRevenue(thisWeekRevenue)
                .thisMonthRevenue(thisMonthRevenue)
                .todayPlatformFees(todayFinancials.platformFees)
                .todayDoctorEarnings(todayFinancials.doctorEarnings)
                .todayPharmacyEarnings(todayFinancials.pharmacyEarnings)
                .thisMonthPlatformFees(thisMonthFinancials.platformFees)
                .thisMonthDoctorEarnings(thisMonthFinancials.doctorEarnings)
                .thisMonthPharmacyEarnings(thisMonthFinancials.pharmacyEarnings)
                .totalTransactions(totalTransactions)
                .completedTransactions(completedTransactions)
                .pendingTransactions(pendingTransactions)
                .failedTransactions(failedTransactions)
                .averageTransactionValue(averageTransactionValue)
                .revenueGrowthPercent(revenueGrowthPercent)
                .build();
    }

    private BigDecimal getDateFilteredSum(String sql, LocalDate date) {
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("d", date);
        Object result = query.getSingleResult();
        return result != null ? new BigDecimal(result.toString()) : BigDecimal.ZERO;
    }

    private BigDecimal getRangeSum(String sql, LocalDate fromInclusive, LocalDate toExclusive) {
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("from", fromInclusive);
        query.setParameter("to", toExclusive);
        Object result = query.getSingleResult();
        return result != null ? new BigDecimal(result.toString()) : BigDecimal.ZERO;
    }

    private long getRangeLongResult(String sql, LocalDate fromInclusive, LocalDate toExclusive) {
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("from", fromInclusive);
        query.setParameter("to", toExclusive);
        Object result = query.getSingleResult();
        return result != null ? ((Number) result).longValue() : 0L;
    }

    private long countCompletedTransactionsInRange(LocalDate fromInclusive, LocalDate toExclusive) {
        return getRangeLongResult(
                "SELECT COUNT(*) FROM Appointments WHERE LOWER(Status) = 'completed' " +
                        "AND CAST(AppointmentTime AS DATE) >= :from AND CAST(AppointmentTime AS DATE) < :to",
                fromInclusive, toExclusive)
                + getRangeLongResult(
                "SELECT COUNT(*) FROM PharmacyOrders WHERE UPPER(paymentStatus) = 'PAID' " +
                        "AND CAST(createdAt AS DATE) >= :from AND CAST(createdAt AS DATE) < :to",
                fromInclusive, toExclusive);
    }

    /**
     * Gộp Doctor + Pharmacy trong khoảng [fromInclusive, toExclusive) — dùng cho
     * breakdown Today/This Month của mini chart "Cụm A".
     */
    private PeriodFinancials computePeriodFinancials(LocalDate fromInclusive, LocalDate toExclusive) {
        BigDecimal doctorRevenue = getRangeSum(
                "SELECT COALESCE(SUM(Fee), 0) FROM Appointments WHERE LOWER(Status) = 'completed' " +
                        "AND CAST(AppointmentTime AS DATE) >= :from AND CAST(AppointmentTime AS DATE) < :to",
                fromInclusive, toExclusive);

        BigDecimal doctorPlatformFee = getRangeSum(
                "SELECT COALESCE(SUM(i.PlatformFee), 0) FROM Invoices i " +
                        "JOIN Appointments a ON i.AppointmentId = a.AppointmentID " +
                        "WHERE UPPER(i.Status) = 'PAID' AND LOWER(a.Status) = 'completed' " +
                        "AND CAST(a.AppointmentTime AS DATE) >= :from AND CAST(a.AppointmentTime AS DATE) < :to",
                fromInclusive, toExclusive);
        if (doctorPlatformFee.compareTo(BigDecimal.ZERO) == 0 && doctorRevenue.compareTo(BigDecimal.ZERO) > 0) {
            doctorPlatformFee = doctorRevenue.multiply(new BigDecimal("0.10"));
        }
        BigDecimal doctorEarnings = doctorRevenue.subtract(doctorPlatformFee);

        BigDecimal pharmacyRevenue = getRangeSum(
                "SELECT COALESCE(SUM(totalAmount), 0) FROM PharmacyOrders WHERE UPPER(paymentStatus) = 'PAID' " +
                        "AND CAST(createdAt AS DATE) >= :from AND CAST(createdAt AS DATE) < :to",
                fromInclusive, toExclusive);
        BigDecimal pharmacyPlatformFee = getRangeSum(
                "SELECT COALESCE(SUM(platformFee), 0) FROM PharmacyOrders WHERE UPPER(paymentStatus) = 'PAID' " +
                        "AND CAST(createdAt AS DATE) >= :from AND CAST(createdAt AS DATE) < :to",
                fromInclusive, toExclusive);
        BigDecimal pharmacyEarnings = getRangeSum(
                "SELECT COALESCE(SUM(pharmacyEarning), 0) FROM PharmacyOrders WHERE UPPER(paymentStatus) = 'PAID' " +
                        "AND CAST(createdAt AS DATE) >= :from AND CAST(createdAt AS DATE) < :to",
                fromInclusive, toExclusive);

        BigDecimal totalRevenue = doctorRevenue.add(pharmacyRevenue);
        BigDecimal platformFees = doctorPlatformFee.add(pharmacyPlatformFee);

        return new PeriodFinancials(totalRevenue, platformFees, doctorEarnings, pharmacyEarnings);
    }

    private static class PeriodFinancials {
        final BigDecimal totalRevenue;
        final BigDecimal platformFees;
        final BigDecimal doctorEarnings;
        final BigDecimal pharmacyEarnings;

        PeriodFinancials(BigDecimal totalRevenue, BigDecimal platformFees,
                          BigDecimal doctorEarnings, BigDecimal pharmacyEarnings) {
            this.totalRevenue = totalRevenue;
            this.platformFees = platformFees;
            this.doctorEarnings = doctorEarnings;
            this.pharmacyEarnings = pharmacyEarnings;
        }
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

    /**
     * Get revenue by week for a specific month (week 1-5, chia theo CEILING(day/7))
     */
    public RevenueByWeekDto getRevenueByWeek(int year, int month) {
        if (year == 0) {
            year = LocalDate.now().getYear();
        }
        if (month == 0) {
            month = LocalDate.now().getMonthValue();
        }

        String sql = "SELECT CEILING(DAY(AppointmentTime) / 7.0) as week, " +
                "COALESCE(SUM(Fee), 0) as revenue, " +
                "COUNT(*) as transactionCount " +
                "FROM Appointments " +
                "WHERE YEAR(AppointmentTime) = :year " +
                "AND MONTH(AppointmentTime) = :month " +
                "AND LOWER(Status) = 'completed' " +
                "GROUP BY CEILING(DAY(AppointmentTime) / 7.0) " +
                "ORDER BY week";

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("year", year);
        query.setParameter("month", month);

        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();

        Map<Integer, BigDecimal> weekRevenue = new LinkedHashMap<>();
        Map<Integer, Long> weekTransactions = new LinkedHashMap<>();
        for (int i = 1; i <= 5; i++) {
            weekRevenue.put(i, BigDecimal.ZERO);
            weekTransactions.put(i, 0L);
        }

        for (Object[] row : results) {
            int week = ((Number) row[0]).intValue();
            BigDecimal revenue = new BigDecimal(row[1].toString());
            long count = ((Number) row[2]).longValue();
            if (week >= 1 && week <= 5) {
                weekRevenue.put(week, revenue);
                weekTransactions.put(week, count);
            }
        }

        List<RevenueByWeekDto.WeeklyRevenueData> data = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            data.add(RevenueByWeekDto.WeeklyRevenueData.builder()
                    .week("Week " + i)
                    .revenue(weekRevenue.get(i))
                    .transactionCount(weekTransactions.get(i))
                    .build());
        }

        return RevenueByWeekDto.builder()
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

    private void setQueryParameters(Query query, String status,
                                    LocalDate fromDate, LocalDate toDate, String searchTerm) {
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
