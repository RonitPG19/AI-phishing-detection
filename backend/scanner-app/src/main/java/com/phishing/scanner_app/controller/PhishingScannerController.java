package com.phishing.scanner_app.controller;

import com.phishing.scanner_app.dto.EmailRequest;
import com.phishing.scanner_app.model.EmailScanReport;
import com.phishing.scanner_app.service.FirestoreReportService;
import com.phishing.scanner_app.service.PhishingScannerService;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/phishing")
public class PhishingScannerController {

    private final PhishingScannerService scannerService;
    private final FirestoreReportService firestoreReportService;

    @Value("${GSB_API_KEY:#{null}}")
    private String safeBrowsingApiKey;

    public PhishingScannerController(PhishingScannerService scannerService, FirestoreReportService firestoreReportService) {
        this.scannerService = scannerService;
        this.firestoreReportService = firestoreReportService;
    }

    @PostMapping("/scan")
    public ResponseEntity<EmailScanReport> scanEmail(@Valid @RequestBody EmailRequest request) {
        EmailScanReport report = scannerService.scanEmail(request, safeBrowsingApiKey);

        String reportId = firestoreReportService.savePhishingReport(request, report);

        EmailScanReport responseReport = new EmailScanReport(
            report.subject(),
            report.sender(),
            report.urlCount(),
            report.sections(),
            report.headerInspectionResult(),
            report.overallRiskScore(),
            reportId,
            report.aiAnalysis()
        );

        return ResponseEntity.ok(responseReport);
    }

    @GetMapping("/reports/{id}")
    public ResponseEntity<Map<String, Object>> getReport(@PathVariable String id) {
        Map<String, Object> report = firestoreReportService.getReport(id);
        if (report == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(report);
    }

    @GetMapping("/reports")
    public ResponseEntity<List<Map<String, Object>>> listReports(
        @RequestParam(defaultValue = "20") int limit
    ) {
        int effectiveLimit = Math.clamp(limit, 1, 100);
        List<Map<String, Object>> reports = firestoreReportService.listReports(effectiveLimit);
        return ResponseEntity.ok(reports);
    }
}
