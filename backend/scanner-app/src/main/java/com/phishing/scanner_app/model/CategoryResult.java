package com.phishing.scanner_app.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class CategoryResult {
    private final List<RiskFinding> findings = new ArrayList<>();
    private final Map<String, Integer> scoreBreakdown = new LinkedHashMap<>();

    @JsonProperty("findings")
    public List<RiskFinding> findings() { return findings; }

    @JsonProperty("scoreBreakdown")
    public Map<String, Integer> scoreBreakdown() { return scoreBreakdown; }
}
