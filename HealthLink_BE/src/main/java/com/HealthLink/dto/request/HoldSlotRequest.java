/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.HealthLink.dto.request;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class HoldSlotRequest {
    private String doctorId;
    private String patientId;
    private LocalDateTime appointmentTime;
    private String consultationType;
}
