package com.HealthLink.dto.registration;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegistrationPageResponse {
    private List<RegistrationRequestResponse> requests;
    private int pageNumber;
    private int pageSize;
    private long totalCount;
    private int totalPages;
}
