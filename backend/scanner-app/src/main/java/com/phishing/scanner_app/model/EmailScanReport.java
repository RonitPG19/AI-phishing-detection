package com.phishing.scanner_app.model;

import com.phishing.scanner_app.service.GeminiEmailAnalyzer;
import com.phishing.scanner_app.dto.AttachmentScanResponse;

public record EmailScanReport(
    String subject,
    String sender,
    int urlCount,
    CategorizedFindings sections,
    HeaderInspectionResult headerInspectionResult,
    int overallRiskScore,
    String reportId,
    GeminiEmailAnalyzer.GeminiAnalysisResult aiAnalysis,
    java.util.List<AttachmentScanResponse> attachments
) {
}
