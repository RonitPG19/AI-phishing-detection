package com.phishing.scanner_app.model;

import com.phishing.scanner_app.service.GeminiEmailAnalyzer;

public record EmailScanReport(
    String subject,
    String sender,
    int urlCount,
    CategorizedFindings sections,
    HeaderInspectionResult headerInspectionResult,
    int overallRiskScore,
    String reportId,
    GeminiEmailAnalyzer.GeminiAnalysisResult aiAnalysis
) {
}
