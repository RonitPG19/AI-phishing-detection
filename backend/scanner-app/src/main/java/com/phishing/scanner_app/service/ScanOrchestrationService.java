package com.phishing.scanner_app.service;

import com.phishing.scanner_app.dto.CachedScanPayload;
import com.phishing.scanner_app.dto.EmailRequest;
import com.phishing.scanner_app.dto.ScanResponse;
import com.phishing.scanner_app.model.EmailScanReport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Service
public class ScanOrchestrationService {

    private final PhishingScannerService scannerService;
    private final FirestoreReportService firestoreReportService;
    private final FirestoreScanCacheService cacheService;
    private final FirestoreScanHistoryService historyService;
    private final ScanFingerprintService fingerprintService;
    private final ScanResponseMapper responseMapper;
    private final boolean cacheEnabled;
    private final Duration cacheTtl;
    private final String safeBrowsingApiKey;

    public ScanOrchestrationService(
        PhishingScannerService scannerService,
        FirestoreReportService firestoreReportService,
        FirestoreScanCacheService cacheService,
        FirestoreScanHistoryService historyService,
        ScanFingerprintService fingerprintService,
        ScanResponseMapper responseMapper,
        @Value("${scanning.cache.enabled:true}") boolean cacheEnabled,
        @Value("${scanning.cache.ttl:PT24H}") String cacheTtl,
        @Value("${GSB_API_KEY:#{null}}") String safeBrowsingApiKey
    ) {
        this.scannerService = scannerService;
        this.firestoreReportService = firestoreReportService;
        this.cacheService = cacheService;
        this.historyService = historyService;
        this.fingerprintService = fingerprintService;
        this.responseMapper = responseMapper;
        this.cacheEnabled = cacheEnabled;
        this.cacheTtl = Duration.parse(cacheTtl);
        this.safeBrowsingApiKey = safeBrowsingApiKey;
    }

    public ScanResponse scanEmail(String userId, EmailRequest request, boolean forceRefresh) {
        Instant now = Instant.now();
        String canonicalPayload = fingerprintService.canonicalPayload(request);
        String cacheKey = fingerprintService.cacheKeyFromCanonicalPayload(canonicalPayload);
        String sourceType = request.hasBodyContent() ? "full_email" : "link_only";

        if (cacheEnabled && !forceRefresh) {
            Optional<FirestoreScanCacheService.ScanCacheEntry> cachedEntry = cacheService.get(cacheKey);
            if (cachedEntry.isPresent()) {
                FirestoreScanCacheService.ScanCacheEntry entry = cachedEntry.get();
                cacheService.recordCacheHit(cacheKey);
                String historyId = historyService.saveHistory(
                    userId,
                    entry.payload().reportId(),
                    cacheKey,
                    "cache_hit",
                    entry.payload(),
                    now
                );
                return entry.payload().toScanResponse(true, entry.expiresAt(), historyId);
            }
        }

        EmailScanReport freshReport = scannerService.scanEmail(request, safeBrowsingApiKey);
        String reportId = firestoreReportService.savePhishingReport(request, freshReport);
        CachedScanPayload payload = responseMapper.toCachedPayload(freshReport, reportId, now.toString());

        String cacheExpiresAt = null;
        if (cacheEnabled) {
            cacheExpiresAt = now.plus(cacheTtl).toString();
            cacheService.save(
                cacheKey,
                canonicalPayload,
                fingerprintService.cacheVersion(),
                sourceType,
                payload,
                reportId,
                cacheExpiresAt
            );
        }

        String historyId = historyService.saveHistory(userId, reportId, cacheKey, "fresh_scan", payload, now);
        return payload.toScanResponse(false, cacheExpiresAt, historyId);
    }
}
