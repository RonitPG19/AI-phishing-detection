package com.phishing.scanner_app.dto;

public record HistoryRequestSummary(
    String sender,
    String subjectSnippet,
    int urlCount,
    String extractionSource,
    String provider,
    String messageId
) {
    public HistoryRequestSummary(String sender, String subjectSnippet, int urlCount) {
        this(sender, subjectSnippet, urlCount, null, null, null);
    }
}
