package com.HealthLink.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

public final class AuditLogger {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private final Logger logger;
    private final String domain;

    private AuditLogger(String name, String domain) {
        this.logger = LoggerFactory.getLogger(name);
        this.domain = domain;
    }

    public static AuditLogger doctor() {
        return new AuditLogger("audit.doctor", "doctor");
    }

    public static AuditLogger pharmacy() {
        return new AuditLogger("audit.pharmacy", "pharmacy");
    }

    public static AuditLogger notification() {
        return new AuditLogger("audit.notification", "notification");
    }

    public void log(String action, String entityId, String actor, Map<String, Object> meta) {
        Map<String, Object> record = buildRecord(action, entityId, actor, meta);
        logJson(record);
    }

    public void log(String action, String entityId, String actor) {
        log(action, entityId, actor, null);
    }

    public void log(String action, String entityId) {
        log(action, entityId, null, null);
    }

    private Map<String, Object> buildRecord(String action, String entityId, String actor, Map<String, Object> meta) {
        Map<String, Object> record = new LinkedHashMap<>();
        record.put("@timestamp", LocalDateTime.now().toString());
        record.put("type", "audit." + domain);
        record.put("action", action);
        record.put("entityId", entityId);
        if (actor != null) {
            record.put("actor", actor);
        }
        String traceId = MDC.get("traceId");
        if (traceId != null) {
            record.put("traceId", traceId);
        }
        if (meta != null && !meta.isEmpty()) {
            record.put("meta", meta);
        }
        return record;
    }

    private void logJson(Map<String, Object> record) {
        try {
            String json = MAPPER.writeValueAsString(record);
            logger.info(json);
        } catch (JsonProcessingException e) {
            logger.warn("Failed to serialize audit record, fallback to KV format: domain={}", domain, e);
            logger.info("action={} entityId={} actor={} domain={}",
                    record.get("action"), record.get("entityId"), record.get("actor"), domain);
        }
    }
}
