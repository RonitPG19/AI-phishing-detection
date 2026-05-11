package com.phishing.scanner_app.controller;

import com.phishing.scanner_app.dto.CreateFlagRequest;
import com.phishing.scanner_app.dto.CursorPageResponse;
import com.phishing.scanner_app.dto.FlagResponse;
import com.phishing.scanner_app.service.FirestoreScanFlagService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/phishing")
public class PhishingFlagController {

    private final FirestoreScanFlagService flagService;

    public PhishingFlagController(FirestoreScanFlagService flagService) {
        this.flagService = flagService;
    }

    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @PostMapping("/reports/{reportId}/flags")
    public ResponseEntity<FlagResponse> createReportFlag(
        Authentication authentication,
        @PathVariable String reportId,
        @Valid @RequestBody CreateFlagRequest request
    ) {
        return ResponseEntity.ok(flagService.createReportFlag(authentication.getName(), reportId, request));
    }

    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @PostMapping("/reports/{reportId}/findings/{findingId}/flags")
    public ResponseEntity<FlagResponse> createFindingFlag(
        Authentication authentication,
        @PathVariable String reportId,
        @PathVariable String findingId,
        @Valid @RequestBody CreateFlagRequest request
    ) {
        return ResponseEntity.ok(flagService.createFindingFlag(authentication.getName(), reportId, findingId, request));
    }

    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @GetMapping("/flags/mine")
    public ResponseEntity<CursorPageResponse<FlagResponse>> listMyFlags(
        Authentication authentication,
        @RequestParam(defaultValue = "20") int limit,
        @RequestParam(required = false) String cursor
    ) {
        return ResponseEntity.ok(flagService.listMine(authentication.getName(), limit, cursor));
    }
}
