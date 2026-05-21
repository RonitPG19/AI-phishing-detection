package com.phishing.scanner_app.dto;

import com.phishing.scanner_app.model.HeaderInspectionResult;
import com.phishing.scanner_app.service.GeminiEmailAnalyzer;

public record ScanResponse(
    String subject,
    String sender,
    int urlCount,
    ScanSectionsResponse sections,
    HeaderInspectionResult headerInspectionResult,
    int overallRiskScore,
    String reportId,
    GeminiEmailAnalyzer.GeminiAnalysisResult aiAnalysis,
    boolean cacheHit,
    String scannedAt,
    String cacheExpiresAt,
    String historyId,
    String extractionSource,
    String provider,
    String messageId,
    java.util.List<AttachmentScanResponse> attachments
) {
    public ScanResponse(
        String subject,
        String sender,
        int urlCount,
        ScanSectionsResponse sections,
        HeaderInspectionResult headerInspectionResult,
        int overallRiskScore,
        String reportId,
        GeminiEmailAnalyzer.GeminiAnalysisResult aiAnalysis,
        boolean cacheHit,
        String scannedAt,
        String cacheExpiresAt,
        String historyId
    ) {
        this(subject, sender, urlCount, sections, headerInspectionResult, overallRiskScore, reportId,
            aiAnalysis, cacheHit, scannedAt, cacheExpiresAt, historyId, null, null, null, null);
    }
}
