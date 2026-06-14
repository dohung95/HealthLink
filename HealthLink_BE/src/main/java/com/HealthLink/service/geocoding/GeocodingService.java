package com.HealthLink.service.geocoding;

import com.HealthLink.dto.geocoding.GeocodeResponse;

public interface GeocodingService {
    GeocodeResponse geocode(String address);

    GeocodeResponse reverseGeocode(Double latitude, Double longitude);
}
