package com.HealthLink.integration.ai;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/** Internal-only local RAG boundary; accepts a de-identified query, never a snapshot. */
@Component
public class RagWorkerClient {
    private final RestTemplate restTemplate;
    private final String endpoint;
    private final String workerKey;

    @Autowired
    public RagWorkerClient(@Value("${ai.cds.worker.base-url:http://127.0.0.1:8097}") String baseUrl,
                           @Value("${ai.service.key:}") String workerKey) {
        this(new RestTemplate(), baseUrl, workerKey);
    }

    RagWorkerClient(RestTemplate restTemplate, String baseUrl, String workerKey) {
        this.restTemplate = restTemplate;
        this.endpoint = baseUrl + "/internal/v1/rag/retrieve";
        this.workerKey = workerKey;
    }

    @SuppressWarnings("unchecked")
    public List<CdsWorkerClient.EvidenceChunk> retrieve(String query, String corpusVersion) {
        if (workerKey == null || workerKey.isBlank() || query == null || query.isBlank()) return List.of();
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-HealthLink-Worker-Key", workerKey);
        try {
            ResponseEntity<Map> response = restTemplate.exchange(endpoint, HttpMethod.POST,
                    new HttpEntity<>(Map.of("query", query, "corpusVersion", corpusVersion, "topK", 5), headers), Map.class);
            Map<String, Object> body = response.getBody();
            if (body == null || Boolean.TRUE.equals(body.get("insufficientEvidence"))) return List.of();
            return ((List<Map<String, Object>>) body.getOrDefault("chunks", List.of())).stream().map(chunk ->
                    new CdsWorkerClient.EvidenceChunk(String.valueOf(chunk.get("chunkId")), String.valueOf(chunk.get("documentId")),
                            String.valueOf(chunk.get("title")), String.valueOf(chunk.get("issuer")), String.valueOf(chunk.get("version")),
                            String.valueOf(chunk.get("effectiveDate")), String.valueOf(chunk.get("sectionPath")), ((Number) chunk.get("page")).intValue(),
                            String.valueOf(chunk.get("text")), String.valueOf(chunk.get("checksum")), String.valueOf(chunk.get("licenseClass")),
                            String.valueOf(chunk.get("corpusVersion")))).toList();
        } catch (ResourceAccessException exception) {
            return List.of();
        }
    }
}
