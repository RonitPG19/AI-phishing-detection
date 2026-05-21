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
    String scannedAt,
    String extractionSource,
    String provider,
    String messageId,
    java.util.List<AttachmentScanResponse> attachments
) {
    public CachedScanPayload(
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
        this(subject, sender, urlCount, sections, headerInspectionResult, overallRiskScore, reportId, aiAnalysis,
            scannedAt, null, null, null, null);
    }

    public CachedScanPayload(
        String subject,
        String sender,
        int urlCount,
        ScanSectionsResponse sections,
        HeaderInspectionResult headerInspectionResult,
        int overallRiskScore,
        String reportId,
        GeminiEmailAnalyzer.GeminiAnalysisResult aiAnalysis,
        String scannedAt,
        java.util.List<AttachmentScanResponse> attachments
    ) {
        this(subject, sender, urlCount, sections, headerInspectionResult, overallRiskScore, reportId, aiAnalysis,
            scannedAt, null, null, null, attachments);
    }

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
            historyId,
            extractionSource,
            provider,
            messageId,
            attachments
        );
    }
}
