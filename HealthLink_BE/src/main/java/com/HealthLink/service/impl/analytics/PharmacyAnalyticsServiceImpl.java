package com.HealthLink.service.impl.analytics;

import com.HealthLink.dto.analytics.PharmacyDemandAnalyticsResponse;
import com.HealthLink.dto.analytics.PharmacyDemandAnalyticsResponse.DemandTrendPoint;
import com.HealthLink.dto.analytics.PharmacyDemandAnalyticsResponse.MedicineDemandItem;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.pharmacy.PharmacyOrderRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.service.analytics.PharmacyAnalyticsService;
import com.HealthLink.service.ai.AiInsightService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PharmacyAnalyticsServiceImpl implements PharmacyAnalyticsService {

    private final PharmacyOrderRepository pharmacyOrderRepository;
    private final PharmacyRepository pharmacyRepository;
    private final AiInsightService aiInsightService;

    @Override
    public PharmacyDemandAnalyticsResponse getDemandAnalytics(String pharmacyId, String period, String lang) {
        if (!pharmacyRepository.existsById(pharmacyId)) {
            throw new ResourceNotFoundException("Pharmacy", "id", pharmacyId);
        }

        int days = parsePeriod(period);
        LocalDateTime since = LocalDate.now().minusDays(days).atStartOfDay();

        List<Object[]> rawItems = pharmacyOrderRepository.findDemandByPharmacySince(pharmacyId, since);
        List<Object[]> rawTrend = pharmacyOrderRepository.findDailyTrendByPharmacySince(pharmacyId, since);

        List<MedicineDemandItem> topMedicines = buildTopMedicines(rawItems);
        List<DemandTrendPoint> trend = buildTrend(rawTrend);

        int totalOrders = trend.stream().mapToInt(DemandTrendPoint::getOrderCount).sum();
        BigDecimal totalRevenue = trend.stream()
                .map(DemandTrendPoint::getRevenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String aiSummary = aiInsightService.generateInsights(topMedicines, trend, totalOrders, totalRevenue, days, lang);

        return PharmacyDemandAnalyticsResponse.builder()
                .topMedicines(topMedicines)
                .trend(trend)
                .aiSummary(aiSummary)
                .totalOrders(totalOrders)
                .totalRevenue(totalRevenue)
                .build();
    }

    private int parsePeriod(String period) {
        if (period == null) return 30;
        return switch (period.toLowerCase()) {
            case "7d" -> 7;
            case "90d" -> 90;
            default -> 30;
        };
    }

    private List<MedicineDemandItem> buildTopMedicines(List<Object[]> raw) {
        Map<String, MedicineDemandItem> map = new LinkedHashMap<>();
        for (Object[] row : raw) {
            String name = (String) row[0];
            Long qty = (Long) row[1];
            Long orders = (Long) row[2];
            BigDecimal rev = (BigDecimal) row[3];
            map.put(name, MedicineDemandItem.builder()
                    .medicineName(name)
                    .soldQuantity(qty.intValue())
                    .orderCount(orders.intValue())
                    .revenue(rev)
                    .build());
        }
        List<MedicineDemandItem> sorted = new ArrayList<>(map.values());
        sorted.sort((a, b) -> Integer.compare(b.getSoldQuantity(), a.getSoldQuantity()));
        return sorted;
    }

    private List<DemandTrendPoint> buildTrend(List<Object[]> raw) {
        List<DemandTrendPoint> points = new ArrayList<>();
        for (Object[] row : raw) {
            LocalDate date = ((java.sql.Date) row[0]).toLocalDate();
            Long orders = (Long) row[1];
            BigDecimal rev = (BigDecimal) row[2];
            points.add(DemandTrendPoint.builder()
                    .date(date)
                    .orderCount(orders.intValue())
                    .revenue(rev)
                    .build());
        }
        points.sort(Comparator.comparing(DemandTrendPoint::getDate));
        return points;
    }
}
