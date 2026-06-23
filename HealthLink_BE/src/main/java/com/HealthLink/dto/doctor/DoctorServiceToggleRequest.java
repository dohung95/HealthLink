package com.HealthLink.dto.doctor;

import lombok.Data;

@Data
public class DoctorServiceToggleRequest {
    private Boolean online;
    private Boolean homeVisit;

    public boolean isAllDisabled() {
        return Boolean.FALSE.equals(online) && Boolean.FALSE.equals(homeVisit);
    }
}
