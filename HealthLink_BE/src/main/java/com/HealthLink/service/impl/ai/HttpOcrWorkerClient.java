package com.HealthLink.service.impl.ai;

import com.HealthLink.entity.ai.AiJobFailureKind;
import com.HealthLink.service.ai.OcrLabReportRequest;
import com.HealthLink.service.ai.OcrLabReportResponse;
import com.HealthLink.service.ai.OcrWorkerClient;
import com.HealthLink.service.ai.OcrWorkerException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

@Service
public class HttpOcrWorkerClient implements OcrWorkerClient {
    private final RestTemplate restTemplate = new RestTemplate();
    private final String endpoint;
    private final String workerKey;

    public HttpOcrWorkerClient(@Value("${ai.ocr.worker.base-url:http://localhost:8001}") String baseUrl,
                               @Value("${ai.service.key:}") String workerKey) {
        this.endpoint = baseUrl + "/internal/v1/ocr/lab-reports";
        this.workerKey = workerKey;
    }

    @Override
    public OcrLabReportResponse extract(OcrLabReportRequest request) {
        if (workerKey.isBlank()) {
            throw new OcrWorkerException("WORKER_CONFIGURATION", AiJobFailureKind.INVALID_PAYLOAD);
        }
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-HealthLink-Worker-Key", workerKey);
        headers.set("X-Correlation-ID", request.correlationId().toString());
        try {
            ResponseEntity<OcrLabReportResponse> response = restTemplate.exchange(endpoint, HttpMethod.POST,
                    new HttpEntity<>(request, headers), OcrLabReportResponse.class);
            if (response.getBody() == null) {
                throw new OcrWorkerException("WORKER_EMPTY_RESPONSE", AiJobFailureKind.INVALID_PAYLOAD);
            }
            return response.getBody();
        } catch (OcrWorkerException exception) {
            throw exception;
        } catch (ResourceAccessException exception) {
            throw new OcrWorkerException("WORKER_CONNECTION", AiJobFailureKind.CONNECTION);
        } catch (HttpStatusCodeException exception) {
            throw new OcrWorkerException(exception.getStatusCode().is5xxServerError()
                    ? "WORKER_UNAVAILABLE" : "WORKER_INVALID_RESPONSE", exception.getStatusCode().is5xxServerError()
                    ? AiJobFailureKind.SERVICE_UNAVAILABLE : AiJobFailureKind.INVALID_PAYLOAD);
        }
    }
}
