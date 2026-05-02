package com.phishing.scanner_app.controller;

import com.phishing.scanner_app.dto.CursorPageResponse;
import com.phishing.scanner_app.dto.HistoryItemResponse;
import com.phishing.scanner_app.service.FirestoreScanHistoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/phishing/history")
public class PhishingHistoryController {

    private final FirestoreScanHistoryService historyService;

    public PhishingHistoryController(FirestoreScanHistoryService historyService) {
        this.historyService = historyService;
    }

    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @GetMapping
    public ResponseEntity<CursorPageResponse<HistoryItemResponse>> listHistory(
        Authentication authentication,
        @RequestParam(defaultValue = "20") int limit,
        @RequestParam(required = false) String cursor
    ) {
        return ResponseEntity.ok(historyService.listHistory(authentication.getName(), limit, cursor));
    }

    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @GetMapping("/{historyId}")
    public ResponseEntity<HistoryItemResponse> getHistory(Authentication authentication, @PathVariable String historyId) {
        return ResponseEntity.ok(historyService.getHistory(authentication.getName(), historyId));
    }

    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @DeleteMapping("/{historyId}")
    public ResponseEntity<Void> deleteHistory(Authentication authentication, @PathVariable String historyId) {
        historyService.softDelete(authentication.getName(), historyId);
        return ResponseEntity.noContent().build();
    }
}
