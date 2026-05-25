package com.phishing.scanner_app.service;

import com.phishing.scanner_app.dto.AttachmentScanResponse;
import com.phishing.scanner_app.dto.EmailRequest;
import com.phishing.scanner_app.model.EmailScanReport;
import com.phishing.scanner_app.model.HeaderInspectionResult;
import com.phishing.scanner_app.model.RiskFinding;
import com.phishing.scanner_app.model.RiskScoreResult;
import com.phishing.scanner_app.model.Severity;
import com.phishing.scanner_app.util.RedirectChainResolver;
import com.phishing.scanner_app.util.WhitelistManager;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;

class PhishingScannerServiceRiskScoreTest {

    @Test
    void aiTargetFindingsRaiseOverallRiskForHighConfidencePhishingReport() throws Exception {
        List<RiskFinding> findings = List.of(
            new RiskFinding("[AI] Brand Impersonation",
                "The sender uses a generic 'Security Team' signature without identifying the specific company.",
                Severity.MEDIUM),
            new RiskFinding("[AI] Urgency Language",
                "The email uses high-pressure tactics like 'URGENT', 'immediately', and 'act now'.",
                Severity.HIGH),
            new RiskFinding("[AI] Suspicious Call-to-Action",
                "The email threatens account suspension to coerce the user into clicking a verification link.",
                Severity.HIGH),
            new RiskFinding("[AI] Mismatched Sender",
                "The email originates from a personal Gmail address rather than an official corporate domain.",
                Severity.HIGH),
            new RiskFinding("https://pay-cashapp.com/",
                "URL found in threat intelligence blacklist",
                Severity.HIGH),
            new RiskFinding("https://pay-cashapp.com/",
                "Domain does not resolve (unresolvable host)",
                Severity.LOW)
        );

        RiskScoreResult result = calculateRiskScore(findings);

        assertEquals(70, result.overallScore());
        assertEquals(40, result.scoreBreakdown().get("ai"));
        assertEquals(25, result.scoreBreakdown().get("blacklist"));
        assertEquals(5, result.scoreBreakdown().get("ssl"));
    }

    @Test
    void maliciousAttachmentIsExposedOutsideLinkFindings() {
        PhishingScannerService service = new PhishingScannerService(
            mock(RedirectChainResolver.class),
            mock(GeminiEmailAnalyzer.class),
            mock(ThreatIntelService.class),
            mock(WhitelistManager.class)
        );
        AttachmentScanResponse attachment = new AttachmentScanResponse(
            "invoice.pdf",
            "application/pdf",
            "application/x-msdownload",
            "Malicious",
            "",
            "Extension/MIME Mismatch Detected",
            List.of()
        );

        EmailScanReport report = service.scanEmail(new EmailRequest(), null, List.of(attachment));

        assertEquals(100, report.overallRiskScore());
        assertEquals(1, report.attachments().size());
        assertEquals(0, report.sections().links().findings().size());
        assertFalse(report.sections().links().scoreBreakdown().containsKey("maliciousAttachment"));
    }

    private RiskScoreResult calculateRiskScore(List<RiskFinding> findings) throws Exception {
        Method method = PhishingScannerService.class.getDeclaredMethod(
            "calculateRiskScore",
            List.class,
            HeaderInspectionResult.class,
            boolean.class
        );
        method.setAccessible(true);
        return (RiskScoreResult) method.invoke(null, findings, new HeaderInspectionResult(), false);
    }
}
