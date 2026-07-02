package com.HealthLink.dto.medicine;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MedicineResponse {
    private Integer medicineId;
    private String name;
    private String genericName;
    private String brandName;
    private String category;
    private Integer categoryId;
    private String categoryCode;
    private String categoryName;
    private String categoryPath;
    private String dosageForm;
    private String strength;
    private String unit;
    private String manufacturer;
    private String countryOfOrigin;
    private String description;
    private String activeIngredients;
    private String indications;
    private String contraindications;
    private String sideEffects;
    private String precautions;
    private String interactions;
    private String storageConditions;
    private boolean prescriptionRequired;
    private BigDecimal price;
    private boolean active;
    private String imageUrl;
}
