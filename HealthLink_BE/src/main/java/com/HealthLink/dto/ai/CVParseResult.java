package com.HealthLink.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Result of CV/Resume parsing by AI
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CVParseResult {
    /**
     * Whether parsing was successful
     */
    private boolean success;

    /**
     * Error message if parsing failed
     */
    private String errorMessage;

    // Doctor fields
    private String fullName;
    private String email;
    private String phoneNumber;
    private String qualifications;
    private String specialty;
    private Integer yearsOfExperience;
    private String languageSpoken;
    private String location;
    private String bio;
    private String clinicName;
    private String clinicAddress;

    // Pharmacy fields
    private String pharmacyName;
    private String licenseNumber;
    private String address;
    private String city;
    private String district;
    private String ward;
    private String description;

    /**
     * Confidence scores for each field (0.0 - 1.0)
     */
    private Map<String, Double> confidenceScores;

    /**
     * Overall confidence score
     */
    private double overallConfidence;
}
