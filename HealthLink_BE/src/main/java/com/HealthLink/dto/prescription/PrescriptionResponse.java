package com.HealthLink.dto.prescription;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PrescriptionResponse {
    private Integer prescriptionHeaderId;
    private Integer appointmentId;
    private Integer pharmacyRequestId;
    private String patientId;
    private String patientName;
    private String doctorId;
    private String doctorName;
    private String specialty;
    private String pharmacyId;
    private String pharmacyName;
    private LocalDateTime issueDate;
    private String diagnosis;
    private String notes;
    private LocalDateTime validUntil;
    private String status;
    private Integer sourceAppointmentId;
    private Integer sourcePrescriptionHeaderId;
    private BigDecimal totalAmount;

    // --- Extended Consultation Report Fields ---
    
    // 1. Patient Info
    private Integer patientAge;
    private String patientGender;
    private String patientPhone;
    private String patientAddress;
    private Double patientWeight;
    private Double patientHeight;
    private String medicalHistory;

    // 2. Consultation Info & Doctor's Instructions
    private String symptoms;
    private String treatment; 
    private LocalDateTime followUpDate;
    private String followUpNotes;

    // 3. Vitals (from VitalSign)
    private Double bmi;
    private Integer bloodPressureSystolic;
    private Integer bloodPressureDiastolic;
    private Integer heartRate;
    private Double temperature;
    private Integer respiratoryRate;
    private Integer spO2;

    // 4. Attachments & Payment
    private List<String> attachments;
    private String paymentStatus;
    private String paymentMethod;
    private BigDecimal consultationFee;
    // ------------------------------------------
    private List<PrescriptionItemResponse> items;
}
