package com.phishing.scanner_app.model;

import java.util.Map;

public record RiskScoreResult(
    int overallScore,
    Map<String, Integer> scoreBreakdown
) {}
