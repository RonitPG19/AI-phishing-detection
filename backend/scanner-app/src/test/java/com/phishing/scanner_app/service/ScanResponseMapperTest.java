package com.phishing.scanner_app.service;

import com.phishing.scanner_app.dto.CachedScanPayload;
import com.phishing.scanner_app.dto.HistoryRequestSummary;
import com.phishing.scanner_app.dto.ScanCategoryResponse;
import com.phishing.scanner_app.dto.ScanSectionsResponse;
import com.phishing.scanner_app.model.CategorizedFindings;
import com.phishing.scanner_app.model.EmailScanReport;
import com.phishing.scanner_app.model.HeaderInspectionResult;
import com.phishing.scanner_app.model.RiskFinding;
import com.phishing.scanner_app.model.Severity;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class ScanResponseMapperTest {

    private final ScanResponseMapper mapper = new ScanResponseMapper();

    // ── toCachedPayload maps all fields correctly ──

    @Test
    void toCachedPayloadMapsAllFields() {
        CategorizedFindings sections = new CategorizedFindings();
        sections.header().findings().add(new RiskFinding("spf", "SPF check failed", Severity.HIGH));
        sections.header().scoreBreakdown().put("spf", 25);

        EmailScanReport report = new EmailScanReport(
            "Test Subject", "sender@example.com", 3, sections,
            new HeaderInspectionResult(), 42, null, null
        );

        CachedScanPayload payload = mapper.toCachedPayload(report, "report-123", "2026-04-19T12:00:00Z");

        assertEquals("Test Subject", payload.subject());
        assertEquals("sender@example.com", payload.sender());
        assertEquals(3, payload.urlCount());
        assertEquals(42, payload.overallRiskScore());
        assertEquals("report-123", payload.reportId());
        assertEquals("2026-04-19T12:00:00Z", payload.scannedAt());
        assertNotNull(payload.sections());
        assertEquals(1, payload.sections().header().findings().size());
        assertEquals("header-1", payload.sections().header().findings().getFirst().id());
        assertEquals("spf", payload.sections().header().findings().getFirst().target());
    }

    @Test
    void toCachedPayloadPreservesScoreBreakdown() {
        CategorizedFindings sections = new CategorizedFindings();
        sections.links().scoreBreakdown().put("threatIntel", 10);
        sections.links().scoreBreakdown().put("domainAge", 5);

        EmailScanReport report = new EmailScanReport(
            "Sub", "s@e.com", 0, sections, new HeaderInspectionResult(), 15, null, null);

        CachedScanPayload payload = mapper.toCachedPayload(report, "r1", "now");

        assertEquals(10, payload.sections().links().scoreBreakdown().get("threatIntel"));
        assertEquals(5, payload.sections().links().scoreBreakdown().get("domainAge"));
    }

    // ── toRequestSummary ──

    @Test
    void toRequestSummaryShortSubject() {
        CachedScanPayload payload = minimalPayload("Short Subject", "sender@x.com", 2);
        HistoryRequestSummary summary = mapper.toRequestSummary(payload);

        assertEquals("Short Subject", summary.subjectSnippet());
        assertEquals("sender@x.com", summary.sender());
        assertEquals(2, summary.urlCount());
    }

    @Test
    void toRequestSummaryTruncatesLongSubject() {
        String longSubject = "A".repeat(200);
        CachedScanPayload payload = minimalPayload(longSubject, "s@e.com", 0);

        HistoryRequestSummary summary = mapper.toRequestSummary(payload);

        assertEquals(120, summary.subjectSnippet().length());
        assertEquals("A".repeat(120), summary.subjectSnippet());
    }

    @Test
    void toRequestSummaryNullSubjectBecomesEmpty() {
        CachedScanPayload payload = minimalPayload(null, "s@e.com", 0);

        HistoryRequestSummary summary = mapper.toRequestSummary(payload);

        assertEquals("", summary.subjectSnippet());
    }

    // ── findingId format ──

    @Test
    void findingIdFormatIsCorrect() {
        assertEquals("header-1", ScanResponseMapper.findingId("header", 0));
        assertEquals("links-3", ScanResponseMapper.findingId("links", 2));
        assertEquals("body-10", ScanResponseMapper.findingId("body", 9));
        assertEquals("subject-1", ScanResponseMapper.findingId("subject", 0));
    }

    // ── toSectionsResponse maps all four categories ──

    @Test
    void toSectionsResponseMapsAllCategories() {
        CategorizedFindings sections = new CategorizedFindings();
        sections.header().findings().add(new RiskFinding("t1", "d1", Severity.LOW));
        sections.subject().findings().add(new RiskFinding("t2", "d2", Severity.MEDIUM));
        sections.body().findings().add(new RiskFinding("t3", "d3", Severity.HIGH));
        sections.links().findings().add(new RiskFinding("t4", "d4", Severity.MEDIUM));

        EmailScanReport report = new EmailScanReport(
            "S", "s@e.com", 1, sections, new HeaderInspectionResult(), 50, null, null);

        ScanSectionsResponse result = mapper.toSectionsResponse(report);

        assertEquals(1, result.header().findings().size());
        assertEquals(1, result.subject().findings().size());
        assertEquals(1, result.body().findings().size());
        assertEquals(1, result.links().findings().size());
        assertEquals("header-1", result.header().findings().getFirst().id());
        assertEquals("subject-1", result.subject().findings().getFirst().id());
        assertEquals("body-1", result.body().findings().getFirst().id());
        assertEquals("links-1", result.links().findings().getFirst().id());
    }

    private CachedScanPayload minimalPayload(String subject, String sender, int urlCount) {
        ScanCategoryResponse empty = new ScanCategoryResponse(List.of(), Map.of());
        ScanSectionsResponse sections = new ScanSectionsResponse(empty, empty, empty, empty);
        return new CachedScanPayload(subject, sender, urlCount, sections, new HeaderInspectionResult(), 0, "r-1", null, "now");
    }
}
