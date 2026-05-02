package com.phishing.scanner_app.dto;

import com.phishing.scanner_app.service.GeminiEmailAnalyzer;
import com.phishing.scanner_app.model.HeaderInspectionResult;

public record CachedScanPayload(
    String subject,
    String sender,
    int urlCount,
    ScanSectionsResponse sections,
    HeaderInspectionResult headerInspectionResult,
    int overallRiskScore,
    String reportId,
    GeminiEmailAnalyzer.GeminiAnalysisResult aiAnalysis,
    String scannedAt
) {
    public ScanResponse toScanResponse(boolean cacheHit, String cacheExpiresAt, String historyId) {
        return new ScanResponse(
            subject,
            sender,
            urlCount,
            sections,
            headerInspectionResult,
            overallRiskScore,
            reportId,
            aiAnalysis,
            cacheHit,
            scannedAt,
            cacheExpiresAt,
            historyId
        );
    }
}
