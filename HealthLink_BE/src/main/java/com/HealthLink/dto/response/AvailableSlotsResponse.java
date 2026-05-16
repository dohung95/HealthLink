/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.HealthLink.dto.response;

import java.time.LocalDate;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AvailableSlotsResponse {
    private String doctorId;
    private LocalDate date;
    private Integer bookingWindowDays;
    private List<AvailableSlotResponse> slots;
}
