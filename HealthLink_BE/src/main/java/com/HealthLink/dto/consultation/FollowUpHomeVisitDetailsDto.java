package com.HealthLink.dto.consultation;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FollowUpHomeVisitDetailsDto {
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
}
