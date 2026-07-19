package com.HealthLink.service.ai;

public interface OcrWorkerClient {
    OcrLabReportResponse extract(OcrLabReportRequest request);
}
