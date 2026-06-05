package com.HealthLink.service.impl.moderation;

import com.HealthLink.dto.response.moderation.ImageModerationResponse;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.service.moderation.ImageModerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ImageModerationServiceImpl implements ImageModerationService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${moderation.enabled:true}")
    private boolean moderationEnabled;

    @Value("${moderation.service-url:http://127.0.0.1:8097/moderate-image}")
    private String moderationServiceUrl;

    @Value("${moderation.fail-open:false}")
    private boolean failOpen;

    @Override
    public void validateFileIsSafe(MultipartFile file) {
        if (!moderationEnabled) {
            return;
        }

        if (file == null || file.isEmpty()) {
            return;
        }

        String contentType = file.getContentType();

        if (contentType == null || !contentType.startsWith("image/")) {
            return;
        }

        try {
            ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", fileResource);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity =
                    new HttpEntity<>(body, headers);

            ResponseEntity<ImageModerationResponse> response = restTemplate.postForEntity(
                    moderationServiceUrl,
                    requestEntity,
                    ImageModerationResponse.class
            );

            ImageModerationResponse moderation = response.getBody();

            if (moderation == null) {
                throw new BusinessException("Image moderation failed. Please try again.");
            }

            if (!moderation.isSafe()) {
                throw new BusinessException(
                        moderation.getReason() != null
                                ? moderation.getReason()
                                : "This image may contain explicit sensitive content and cannot be uploaded."
                );
            }

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            if (failOpen) {
                return;
            }

            throw new BusinessException("Unable to scan image safety. Please try again later.");
        }
    }
}