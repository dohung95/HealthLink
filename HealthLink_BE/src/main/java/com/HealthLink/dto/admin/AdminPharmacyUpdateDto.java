package com.HealthLink.dto.admin;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminPharmacyUpdateDto {
    @JsonProperty("Name")
    private String name;

    @JsonProperty("LicenseNumber")
    private String licenseNumber;

    @JsonProperty("Address")
    private String address;

    @JsonProperty("City")
    private String city;

    @JsonProperty("District")
    private String district;

    @JsonProperty("Ward")
    private String ward;

    @JsonProperty("PhoneNumber")
    private String phoneNumber;

    @JsonProperty("Email")
    private String email;

    @JsonProperty("Description")
    private String description;

    @JsonProperty("AvatarUrl")
    private String avatarUrl;

    @JsonProperty("OpenTime")
    private LocalTime openTime;

    @JsonProperty("CloseTime")
    private LocalTime closeTime;

    @JsonProperty("Open24Hours")
    private Boolean open24Hours;

    @JsonProperty("WorkingDays")
    private String workingDays;

    @JsonProperty("Verified")
    private Boolean verified;

    @JsonProperty("Active")
    private Boolean active;

    @JsonProperty("DeliveryAvailable")
    private Boolean deliveryAvailable;

    @JsonProperty("DeliveryRadius")
    private Double deliveryRadius;

    @JsonProperty("DeliveryFee")
    private BigDecimal deliveryFee;

    @JsonProperty("BankAccount")
    private String bankAccount;

    @JsonProperty("BankName")
    private String bankName;

    @JsonProperty("PaypalEmail")
    private String paypalEmail;

    @JsonProperty("Status")
    private String status;
}
