package com.phishing.scanner_app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.phishing.scanner_app.model.RiskFinding;

import java.util.List;
import java.util.Map;

/**
 * Response DTO for link-only scanning.
 * Returns a focused report with only link-related findings and scores.
 */
public record LinkScanReport(

    @JsonProperty("urlCount")
    int urlCount,

    @JsonProperty("urls")
    List<String> urls,

    @JsonProperty("overallRiskScore")
    int overallRiskScore,

    @JsonProperty("verdict")
    String verdict,

    @JsonProperty("findings")
    List<RiskFinding> findings,

    @JsonProperty("scoreBreakdown")
    Map<String, Integer> scoreBreakdown,

    @JsonProperty("reportId")
    String reportId
) {

    /**
     * Derive a human-readable verdict from the numeric risk score.
     */
    public static String verdictFromScore(int score) {
        if (score >= 70) return "HIGH_RISK";
        if (score >= 40) return "SUSPICIOUS";
        if (score >= 15) return "LOW_RISK";
        return "SAFE";
    }
}
