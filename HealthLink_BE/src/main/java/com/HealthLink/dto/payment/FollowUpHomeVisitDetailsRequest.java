package com.HealthLink.dto.payment;

import lombok.Data;

import java.util.List;

@Data
public class FollowUpHomeVisitDetailsRequest {
    private String visitAddress;
    private String visitCity;
    private String contactPhone;
    private String reasonForHomeVisit;
    private String specialNotes;
    private Boolean isForSelf;
    private String receiverName;
    private Integer receiverAge;
    private String receiverGender;
    private String receiverRelationship;
    private String receiverPhone;
    private Double visitLatitude;
    private Double visitLongitude;
    private List<Integer> homeVisitServiceIds;
}
