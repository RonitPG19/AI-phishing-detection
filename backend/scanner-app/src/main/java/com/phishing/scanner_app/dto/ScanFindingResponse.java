package com.phishing.scanner_app.dto;

import com.phishing.scanner_app.model.Severity;

public record ScanFindingResponse(
    String id,
    String target,
    String description,
    Severity severity,
    int scoreContribution
) {
}
