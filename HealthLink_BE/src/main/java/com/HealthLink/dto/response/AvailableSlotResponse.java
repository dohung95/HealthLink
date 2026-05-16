/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AvailableSlotResponse {
    private String startTime;
    private String endTime;
    private String status;      // AVAILABLE, BOOKED, HELD
    private boolean selectable;
}
