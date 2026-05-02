package com.phishing.scanner_app.dto;

public record FlagResponse(
    String flagId,
    String reportId,
    String flagType,
    String findingId,
    String reasonCode,
    String comment,
    String createdAt,
    String status
) {
}
