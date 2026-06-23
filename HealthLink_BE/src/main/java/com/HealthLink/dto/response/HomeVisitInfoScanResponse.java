package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class HomeVisitInfoScanResponse {

    private boolean success;

    private String receiverName;
    private Integer receiverAge;
    private String receiverGender;
    private String receiverPhone;
    private String receiverRelationship;

    private String visitAddress;
    private String visitCity;

    private Double confidence;

    private List<String> warnings;

    private String errorMessage;
}