package com.phishing.scanner_app;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/phishing")
public class PhishingScannerController {

    private final PhishingScannerService scannerService;

    @Value("${GSB_API_KEY:#{null}}")
    private String safeBrowsingApiKey;

    public PhishingScannerController(PhishingScannerService scannerService) {
        this.scannerService = scannerService;
    }

    @PostMapping("/scan")
    public ResponseEntity<PhishingScannerService.EmailScanReport> scanEmail(@RequestBody EmailRequest request) {
        PhishingScannerService.EmailScanReport report = scannerService.scanEmail(request, safeBrowsingApiKey);
        return ResponseEntity.ok(report);
    }
}