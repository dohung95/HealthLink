package com.HealthLink.service.ai;

import com.HealthLink.entity.ai.AiJobFailureKind;

public class OcrWorkerException extends RuntimeException {
    private final String errorCode;
    private final AiJobFailureKind failureKind;

    public OcrWorkerException(String errorCode, AiJobFailureKind failureKind) {
        this.errorCode = errorCode;
        this.failureKind = failureKind;
    }

    public String errorCode() {
        return errorCode;
    }

    public AiJobFailureKind failureKind() {
        return failureKind;
    }
}
