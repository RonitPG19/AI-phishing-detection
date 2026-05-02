package com.phishing.scanner_app.service;

import com.phishing.scanner_app.dto.CachedScanPayload;
import com.phishing.scanner_app.dto.HistoryRequestSummary;
import com.phishing.scanner_app.dto.ScanCategoryResponse;
import com.phishing.scanner_app.dto.ScanFindingResponse;
import com.phishing.scanner_app.dto.ScanSectionsResponse;
import com.phishing.scanner_app.model.CategoryResult;
import com.phishing.scanner_app.model.EmailScanReport;
import com.phishing.scanner_app.model.RiskFinding;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class ScanResponseMapper {

    public CachedScanPayload toCachedPayload(EmailScanReport report, String reportId, String scannedAt) {
        return new CachedScanPayload(
            report.subject(),
            report.sender(),
            report.urlCount(),
            toSectionsResponse(report),
            report.headerInspectionResult(),
            report.overallRiskScore(),
            reportId,
            report.aiAnalysis(),
            scannedAt
        );
    }

    public ScanSectionsResponse toSectionsResponse(EmailScanReport report) {
        return new ScanSectionsResponse(
            toCategoryResponse("header", report.sections().header()),
            toCategoryResponse("subject", report.sections().subject()),
            toCategoryResponse("body", report.sections().body()),
            toCategoryResponse("links", report.sections().links())
        );
    }

    public HistoryRequestSummary toRequestSummary(CachedScanPayload payload) {
        String subject = payload.subject() == null ? "" : payload.subject();
        String subjectSnippet = subject.length() <= 120 ? subject : subject.substring(0, 120);
        return new HistoryRequestSummary(payload.sender(), subjectSnippet, payload.urlCount());
    }

    public static String findingId(String category, int index) {
        return category + "-" + (index + 1);
    }

    private ScanCategoryResponse toCategoryResponse(String categoryName, CategoryResult category) {
        List<ScanFindingResponse> findings = mapFindings(categoryName, category.findings());
        Map<String, Integer> scoreBreakdown = new LinkedHashMap<>(category.scoreBreakdown());
        return new ScanCategoryResponse(findings, scoreBreakdown);
    }

    private List<ScanFindingResponse> mapFindings(String categoryName, List<RiskFinding> findings) {
        return java.util.stream.IntStream.range(0, findings.size())
            .mapToObj(index -> {
                RiskFinding finding = findings.get(index);
                return new ScanFindingResponse(
                    findingId(categoryName, index),
                    finding.target(),
                    finding.description(),
                    finding.severity(),
                    finding.scoreContribution()
                );
            })
            .toList();
    }
}
