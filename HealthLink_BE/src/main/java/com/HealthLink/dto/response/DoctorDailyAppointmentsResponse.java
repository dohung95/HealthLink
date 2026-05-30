package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class DoctorDailyAppointmentsResponse {

    private String doctorId;
    private LocalDate date;
    private List<AppointmentResponse> appointments;
    private Counts counts;

    @Data
    @Builder
    public static class Counts {
        private long all;
        private long scheduled;
        private long inprogress;
        private long completed;
        private long cancelled;
    }
}
