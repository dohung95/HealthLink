package com.HealthLink.service.analytics;

import com.HealthLink.dto.analytics.PharmacyDemandAnalyticsResponse;

public interface PharmacyAnalyticsService {
    PharmacyDemandAnalyticsResponse getDemandAnalytics(String pharmacyId, String period, String lang);
}
