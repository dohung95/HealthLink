package com.HealthLink.dto.compliance;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ExemptDoctorRequest {

    @NotBlank(message = "Compliance month is required")
    @Pattern(regexp = "\\d{4}-\\d{2}", message = "Month format must be YYYY-MM")
    private String complianceMonth;

    @NotBlank(message = "Exemption reason is required")
    @Size(min = 10, max = 500, message = "Reason must be between 10 and 500 characters")
    private String reason;
}
