package com.phishing.scanner_app.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record RiskFinding(String target, String description, Severity severity, int scoreContribution) {
    public RiskFinding(String target, String description, Severity severity) {
        this(target, description, severity, severity.score());
    }

    @Override
    @JsonProperty("target")
    public String target() {
        return target;
    }

    @Override
    @JsonProperty("description")
    public String description() {
        return description;
    }

    @Override
    @JsonProperty("severity")
    public Severity severity() {
        return severity;
    }

    @Override
    @JsonProperty("scoreContribution")
    public int scoreContribution() {
        return scoreContribution;
    }
}
