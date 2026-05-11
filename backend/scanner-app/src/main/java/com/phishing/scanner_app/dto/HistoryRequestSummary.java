package com.phishing.scanner_app.dto;

public record HistoryRequestSummary(
    String sender,
    String subjectSnippet,
    int urlCount
) {
}
