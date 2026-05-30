package com.HealthLink.dto.review;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewReplyDto {
    @NotBlank(message = "Reply is required")
    @Size(min = 5, max = 1000, message = "Reply must be between 5 and 1000 characters")
    private String reply;
}
