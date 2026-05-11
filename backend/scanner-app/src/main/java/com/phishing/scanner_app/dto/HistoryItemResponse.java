package com.phishing.scanner_app.dto;

public record HistoryItemResponse(
    String historyId,
    String reportId,
    String cacheKey,
    String responseSource,
    String requestedAt,
    HistoryRequestSummary requestSummary,
    int overallRiskScore,
    String sender,
    String subject,
    int urlCount
) {
}
