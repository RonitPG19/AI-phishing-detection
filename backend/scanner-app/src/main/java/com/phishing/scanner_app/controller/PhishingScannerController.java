package com.phishing.scanner_app.controller;

import com.phishing.scanner_app.dto.EmailRequest;
import com.phishing.scanner_app.dto.ScanResponse;
import com.phishing.scanner_app.service.FirestoreReportService;
import com.phishing.scanner_app.service.ScanOrchestrationService;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/phishing")
public class PhishingScannerController {

    private final ScanOrchestrationService scanOrchestrationService;
    private final FirestoreReportService firestoreReportService;

    public PhishingScannerController(ScanOrchestrationService scanOrchestrationService, FirestoreReportService firestoreReportService) {
        this.scanOrchestrationService = scanOrchestrationService;
        this.firestoreReportService = firestoreReportService;
    }

    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @PostMapping("/scan")
    public ResponseEntity<ScanResponse> scanEmail(
        Authentication authentication,
        @Valid @RequestBody EmailRequest request,
        @RequestParam(defaultValue = "false") boolean forceRefresh
    ) {
        System.out.println(
            "Scan email request: provider=" + request.getProvider()
            + ", messageId=" + request.getMessageId()
            + ", hasBody=" + request.hasBodyContent()
            + ", hasLinks=" + request.hasLinks()
        );
        System.out.println("request: " + request);
        return ResponseEntity.ok(scanOrchestrationService.scanEmail(authentication.getName(), request, forceRefresh));
    }

    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @GetMapping("/reports/{id}")
    public ResponseEntity<Map<String, Object>> getReport(@PathVariable String id) {
        Map<String, Object> report = firestoreReportService.getReport(id);
        if (report == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(report);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/reports")
    public ResponseEntity<List<Map<String, Object>>> listReports(
        @RequestParam(defaultValue = "20") int limit
    ) {
        int effectiveLimit = Math.clamp(limit, 1, 100);
        List<Map<String, Object>> reports = firestoreReportService.listReports(effectiveLimit);
        return ResponseEntity.ok(reports);
    }
}
