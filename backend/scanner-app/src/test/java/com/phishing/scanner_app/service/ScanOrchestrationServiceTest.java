package com.phishing.scanner_app.service;

import com.phishing.scanner_app.dto.CachedScanPayload;
import com.phishing.scanner_app.dto.EmailRequest;
import com.phishing.scanner_app.dto.ScanCategoryResponse;
import com.phishing.scanner_app.dto.ScanFindingResponse;
import com.phishing.scanner_app.dto.ScanResponse;
import com.phishing.scanner_app.dto.ScanSectionsResponse;
import com.phishing.scanner_app.model.CategorizedFindings;
import com.phishing.scanner_app.model.EmailScanReport;
import com.phishing.scanner_app.model.HeaderInspectionResult;
import com.phishing.scanner_app.model.Severity;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ScanOrchestrationServiceTest {

    // ── Cache hit returns cached payload and skips fresh scan ──

    @Test
    void cacheHitReturnsCachedPayloadAndSkipsFreshScan() {
        PhishingScannerService scannerService = mock(PhishingScannerService.class);
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        FirestoreScanCacheService cacheService = mock(FirestoreScanCacheService.class);
        FirestoreScanHistoryService historyService = mock(FirestoreScanHistoryService.class);
        ScanFingerprintService fingerprintService = mock(ScanFingerprintService.class);
        ScanResponseMapper responseMapper = new ScanResponseMapper();

        CachedScanPayload payload = cachedPayload("report-1", "2026-04-19T12:00:00Z");
        when(fingerprintService.canonicalPayload(any())).thenReturn("{\"a\":1}");
        when(fingerprintService.cacheKeyFromCanonicalPayload(anyString())).thenReturn("cache-1");
        when(cacheService.get("cache-1")).thenReturn(Optional.of(
            new FirestoreScanCacheService.ScanCacheEntry("cache-1", payload, "report-1", "2026-04-20T12:00:00Z")
        ));
        when(historyService.saveHistory(anyString(), anyString(), anyString(), anyString(), any(), any()))
            .thenReturn("history-1");

        ScanOrchestrationService service = orchestrationService(
            scannerService, reportService, cacheService, historyService, fingerprintService, responseMapper, true);

        ScanResponse response = service.scanEmail("user-1", request(), false);

        assertTrue(response.cacheHit());
        assertEquals("history-1", response.historyId());
        verify(scannerService, never()).scanEmail(any(), any());
        verify(cacheService).recordCacheHit("cache-1");
    }

    // ── forceRefresh bypasses cache and persists fresh scan ──

    @Test
    void forceRefreshBypassesCacheAndPersistsFreshScan() {
        PhishingScannerService scannerService = mock(PhishingScannerService.class);
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        FirestoreScanCacheService cacheService = mock(FirestoreScanCacheService.class);
        FirestoreScanHistoryService historyService = mock(FirestoreScanHistoryService.class);
        ScanFingerprintService fingerprintService = mock(ScanFingerprintService.class);
        ScanResponseMapper responseMapper = new ScanResponseMapper();

        when(fingerprintService.canonicalPayload(any())).thenReturn("{\"a\":1}");
        when(fingerprintService.cacheKeyFromCanonicalPayload(anyString())).thenReturn("cache-1");
        when(fingerprintService.cacheVersion()).thenReturn("v1");
        when(scannerService.scanEmail(any(), any())).thenReturn(freshReport());
        when(reportService.savePhishingReport(any(), any())).thenReturn("report-1");
        when(historyService.saveHistory(anyString(), anyString(), anyString(), anyString(), any(), any()))
            .thenReturn("history-1");

        ScanOrchestrationService service = orchestrationService(
            scannerService, reportService, cacheService, historyService, fingerprintService, responseMapper, true);

        ScanResponse response = service.scanEmail("user-1", request(), true);

        assertFalse(response.cacheHit());
        assertEquals("report-1", response.reportId());
        verify(cacheService, never()).get(anyString());

        ArgumentCaptor<CachedScanPayload> payloadCaptor = ArgumentCaptor.forClass(CachedScanPayload.class);
        verify(cacheService).save(anyString(), anyString(), anyString(), anyString(), payloadCaptor.capture(), anyString(), anyString());
        assertEquals("report-1", payloadCaptor.getValue().reportId());
    }

    // ── Cache miss triggers fresh scan and cache write ──

    @Test
    void cacheMissTriggersFreshScanAndCacheWrite() {
        PhishingScannerService scannerService = mock(PhishingScannerService.class);
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        FirestoreScanCacheService cacheService = mock(FirestoreScanCacheService.class);
        FirestoreScanHistoryService historyService = mock(FirestoreScanHistoryService.class);
        ScanFingerprintService fingerprintService = mock(ScanFingerprintService.class);
        ScanResponseMapper responseMapper = new ScanResponseMapper();

        when(fingerprintService.canonicalPayload(any())).thenReturn("{\"a\":1}");
        when(fingerprintService.cacheKeyFromCanonicalPayload(anyString())).thenReturn("cache-1");
        when(fingerprintService.cacheVersion()).thenReturn("v1");
        when(cacheService.get("cache-1")).thenReturn(Optional.empty());
        when(scannerService.scanEmail(any(), any())).thenReturn(freshReport());
        when(reportService.savePhishingReport(any(), any())).thenReturn("report-2");
        when(historyService.saveHistory(anyString(), anyString(), anyString(), anyString(), any(), any()))
            .thenReturn("history-2");

        ScanOrchestrationService service = orchestrationService(
            scannerService, reportService, cacheService, historyService, fingerprintService, responseMapper, true);

        ScanResponse response = service.scanEmail("user-1", request(), false);

        assertFalse(response.cacheHit());
        assertEquals("report-2", response.reportId());
        verify(cacheService).get("cache-1");
        verify(scannerService).scanEmail(any(), any());
        verify(cacheService).save(eq("cache-1"), anyString(), anyString(), anyString(), any(), eq("report-2"), anyString());
    }

    // ── Cache disabled skips cache entirely ──

    @Test
    void cacheDisabledSkipsCacheEntirely() {
        PhishingScannerService scannerService = mock(PhishingScannerService.class);
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        FirestoreScanCacheService cacheService = mock(FirestoreScanCacheService.class);
        FirestoreScanHistoryService historyService = mock(FirestoreScanHistoryService.class);
        ScanFingerprintService fingerprintService = mock(ScanFingerprintService.class);
        ScanResponseMapper responseMapper = new ScanResponseMapper();

        when(fingerprintService.canonicalPayload(any())).thenReturn("{\"a\":1}");
        when(fingerprintService.cacheKeyFromCanonicalPayload(anyString())).thenReturn("cache-1");
        when(scannerService.scanEmail(any(), any())).thenReturn(freshReport());
        when(reportService.savePhishingReport(any(), any())).thenReturn("report-3");
        when(historyService.saveHistory(anyString(), anyString(), anyString(), anyString(), any(), any()))
            .thenReturn("history-3");

        ScanOrchestrationService service = new ScanOrchestrationService(
            scannerService, reportService, cacheService, historyService, fingerprintService,
            responseMapper, false, "PT24H", null);

        ScanResponse response = service.scanEmail("user-1", request(), false);

        assertFalse(response.cacheHit());
        verify(cacheService, never()).get(anyString());
        verify(cacheService, never()).save(anyString(), anyString(), anyString(), anyString(), any(), anyString(), anyString());
        verify(scannerService).scanEmail(any(), any());
    }

    // ── History rows are written on both cache hit and fresh scan ──

    @Test
    void historyWrittenWithCacheHitSource() {
        PhishingScannerService scannerService = mock(PhishingScannerService.class);
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        FirestoreScanCacheService cacheService = mock(FirestoreScanCacheService.class);
        FirestoreScanHistoryService historyService = mock(FirestoreScanHistoryService.class);
        ScanFingerprintService fingerprintService = mock(ScanFingerprintService.class);
        ScanResponseMapper responseMapper = new ScanResponseMapper();

        CachedScanPayload payload = cachedPayload("report-1", "2026-04-19T12:00:00Z");
        when(fingerprintService.canonicalPayload(any())).thenReturn("{\"a\":1}");
        when(fingerprintService.cacheKeyFromCanonicalPayload(anyString())).thenReturn("cache-1");
        when(cacheService.get("cache-1")).thenReturn(Optional.of(
            new FirestoreScanCacheService.ScanCacheEntry("cache-1", payload, "report-1", "2026-04-20T12:00:00Z")
        ));
        when(historyService.saveHistory(anyString(), anyString(), anyString(), anyString(), any(), any()))
            .thenReturn("history-1");

        ScanOrchestrationService service = orchestrationService(
            scannerService, reportService, cacheService, historyService, fingerprintService, responseMapper, true);

        service.scanEmail("user-1", request(), false);

        ArgumentCaptor<String> sourceCaptor = ArgumentCaptor.forClass(String.class);
        verify(historyService).saveHistory(eq("user-1"), eq("report-1"), eq("cache-1"),
            sourceCaptor.capture(), any(), any());
        assertEquals("cache_hit", sourceCaptor.getValue());
    }

    @Test
    void historyWrittenWithFreshScanSource() {
        PhishingScannerService scannerService = mock(PhishingScannerService.class);
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        FirestoreScanCacheService cacheService = mock(FirestoreScanCacheService.class);
        FirestoreScanHistoryService historyService = mock(FirestoreScanHistoryService.class);
        ScanFingerprintService fingerprintService = mock(ScanFingerprintService.class);
        ScanResponseMapper responseMapper = new ScanResponseMapper();

        when(fingerprintService.canonicalPayload(any())).thenReturn("{\"a\":1}");
        when(fingerprintService.cacheKeyFromCanonicalPayload(anyString())).thenReturn("cache-1");
        when(fingerprintService.cacheVersion()).thenReturn("v1");
        when(cacheService.get("cache-1")).thenReturn(Optional.empty());
        when(scannerService.scanEmail(any(), any())).thenReturn(freshReport());
        when(reportService.savePhishingReport(any(), any())).thenReturn("report-1");
        when(historyService.saveHistory(anyString(), anyString(), anyString(), anyString(), any(), any()))
            .thenReturn("history-1");

        ScanOrchestrationService service = orchestrationService(
            scannerService, reportService, cacheService, historyService, fingerprintService, responseMapper, true);

        service.scanEmail("user-1", request(), false);

        ArgumentCaptor<String> sourceCaptor = ArgumentCaptor.forClass(String.class);
        verify(historyService).saveHistory(eq("user-1"), eq("report-1"), eq("cache-1"),
            sourceCaptor.capture(), any(), any());
        assertEquals("fresh_scan", sourceCaptor.getValue());
    }

    // ── Response contains expected metadata fields ──

    @Test
    void freshScanResponseContainsCacheExpiresAt() {
        PhishingScannerService scannerService = mock(PhishingScannerService.class);
        FirestoreReportService reportService = mock(FirestoreReportService.class);
        FirestoreScanCacheService cacheService = mock(FirestoreScanCacheService.class);
        FirestoreScanHistoryService historyService = mock(FirestoreScanHistoryService.class);
        ScanFingerprintService fingerprintService = mock(ScanFingerprintService.class);
        ScanResponseMapper responseMapper = new ScanResponseMapper();

        when(fingerprintService.canonicalPayload(any())).thenReturn("{\"a\":1}");
        when(fingerprintService.cacheKeyFromCanonicalPayload(anyString())).thenReturn("cache-1");
        when(fingerprintService.cacheVersion()).thenReturn("v1");
        when(cacheService.get("cache-1")).thenReturn(Optional.empty());
        when(scannerService.scanEmail(any(), any())).thenReturn(freshReport());
        when(reportService.savePhishingReport(any(), any())).thenReturn("report-1");
        when(historyService.saveHistory(anyString(), anyString(), anyString(), anyString(), any(), any()))
            .thenReturn("history-1");

        ScanOrchestrationService service = orchestrationService(
            scannerService, reportService, cacheService, historyService, fingerprintService, responseMapper, true);

        ScanResponse response = service.scanEmail("user-1", request(), false);

        assertNotNull(response.reportId());
        assertNotNull(response.historyId());
        assertNotNull(response.scannedAt());
        assertNotNull(response.cacheExpiresAt());
    }

    // ── Helpers ──

    private ScanOrchestrationService orchestrationService(
        PhishingScannerService scannerService,
        FirestoreReportService reportService,
        FirestoreScanCacheService cacheService,
        FirestoreScanHistoryService historyService,
        ScanFingerprintService fingerprintService,
        ScanResponseMapper responseMapper,
        boolean cacheEnabled
    ) {
        return new ScanOrchestrationService(
            scannerService, reportService, cacheService, historyService, fingerprintService,
            responseMapper, cacheEnabled, "PT24H", null);
    }

    private EmailScanReport freshReport() {
        return new EmailScanReport(
            "Subject", "sender@example.com", 1,
            new CategorizedFindings(), new HeaderInspectionResult(),
            10, null, null
        );
    }

    private CachedScanPayload cachedPayload(String reportId, String scannedAt) {
        ScanFindingResponse finding = new ScanFindingResponse("links-1", "https://example.com", "Suspicious", Severity.MEDIUM, 5);
        ScanCategoryResponse empty = new ScanCategoryResponse(List.of(), Map.of());
        ScanCategoryResponse links = new ScanCategoryResponse(List.of(finding), Map.of("threatIntel", 5));
        ScanSectionsResponse sections = new ScanSectionsResponse(empty, empty, empty, links);
        return new CachedScanPayload("Subject", "sender@example.com", 1, sections, new HeaderInspectionResult(), 5, reportId, null, scannedAt);
    }

    private EmailRequest request() {
        EmailRequest request = new EmailRequest();
        request.setSubject("Subject");
        request.setFrom("sender@example.com");
        request.setBodyText("body");
        return request;
    }
}
