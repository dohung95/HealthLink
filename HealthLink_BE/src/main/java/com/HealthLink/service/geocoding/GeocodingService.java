package com.HealthLink.service.geocoding;

import com.HealthLink.dto.geocoding.GeocodeResponse;
import java.util.List;

public interface GeocodingService {
    GeocodeResponse geocode(String address);

    List<GeocodeResponse> search(String address, int limit);

    GeocodeResponse reverseGeocode(Double latitude, Double longitude);
}
